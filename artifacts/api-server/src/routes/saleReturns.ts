import { Router } from "express";
import { db } from "@workspace/db";
import { saleReturnsTable, productsTable, inventoryTable, inventoryTransactionsTable, accountsTable, customersTable, salesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createJournalEntry } from "../lib/journalHelper";

const router = Router();

function fmt(p: typeof saleReturnsTable.$inferSelect) {
  return {
    ...p,
    totalAmount: parseFloat(p.totalAmount),
    vatAmount: parseFloat(p.vatAmount),
    grandTotal: parseFloat(p.grandTotal),
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/sale-returns", async (req, res) => {
  try {
    const returns = await db.select().from(saleReturnsTable).orderBy(saleReturnsTable.date);
    return res.json(returns.map(fmt));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في جلب مرتجعات المبيعات" });
  }
});

router.post("/sale-returns", async (req, res) => {
  try {
    const { returnNumber, date, originalSaleId, customerName, customerId, paymentMethod, accountId, notes, items } = req.body;
    const products = await db.select().from(productsTable);
    let totalAmount = 0, vatAmount = 0;
    const processedItems = items.map((item: any) => {
      const product = products.find((p) => p.id === item.productId);
      const vatRate = item.vatRate ?? parseFloat(product?.vatRate ?? "15");
      const vatEnabled = item.vatEnabled !== false;
      const subtotal = item.quantity * item.unitPrice;
      const itemVat = vatEnabled ? subtotal * (vatRate / 100) : 0;
      totalAmount += subtotal;
      vatAmount += itemVat;
      return { productId: item.productId, productName: product?.name ?? "", quantity: item.quantity, unitPrice: item.unitPrice, vatRate, vatEnabled, subtotal };
    });
    const grandTotal = totalAmount + vatAmount;

    const [ret] = await db.insert(saleReturnsTable).values({
      returnNumber: returnNumber ?? "SRET-" + Date.now(),
      date, originalSaleId: originalSaleId ?? null,
      customerId: customerId ?? null, customerName: customerName ?? null,
      paymentMethod: paymentMethod ?? "cash",
      accountId: accountId ?? null, notes,
      items: processedItems,
      totalAmount: String(totalAmount.toFixed(2)),
      vatAmount: String(vatAmount.toFixed(2)),
      grandTotal: String(grandTotal.toFixed(2)),
    }).returning();

    // تحديث المخزون (IN - عكس المبيعات)
    for (const item of processedItems) {
      const [existing] = await db.select().from(inventoryTable).where(eq(inventoryTable.productId, item.productId));
      if (existing) {
        await db.update(inventoryTable).set({ quantity: existing.quantity + item.quantity }).where(eq(inventoryTable.productId, item.productId));
      }
      await db.insert(inventoryTransactionsTable).values({
        date, type: "in", productId: item.productId, productName: item.productName,
        quantity: item.quantity, reference: ret.returnNumber ?? "SRET-" + ret.id, referenceType: "sale",
      });
    }

    // القيد المحاسبي (عكس قيد المبيعات)
    try {
      const allAccounts = await db.select().from(accountsTable);
      const salesAcc = allAccounts.find((a: any) => a.name.includes("مبيعات") && !a.name.includes("مرتجع"));
      const salesReturnAcc = allAccounts.find((a: any) => a.name.includes("مردودات المبيعات")) ?? salesAcc;
      const vatOutputAcc = allAccounts.find((a: any) => a.name.includes("ضريبة") && a.name.includes("مخرجات"));
      const lines = [];

      // دائن: الخزينة أو حساب العميل
      if (paymentMethod === "credit" && customerId) {
        const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId));
        const custAcc = customer?.accountId ? allAccounts.find((a: any) => a.id === customer.accountId) : null;
        if (custAcc) lines.push({ accountId: custAcc.id, accountName: custAcc.name, accountCode: custAcc.code, debit: "0", credit: String(grandTotal.toFixed(2)), notes: null });
      } else if (accountId) {
        const cashAcc = allAccounts.find((a: any) => a.id === accountId);
        if (cashAcc) lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, accountCode: cashAcc.code, debit: "0", credit: String(grandTotal.toFixed(2)), notes: null });
      }

      // مدين: مردودات المبيعات
      if (salesReturnAcc) lines.push({ accountId: salesReturnAcc.id, accountName: salesReturnAcc.name, accountCode: salesReturnAcc.code, debit: String(totalAmount.toFixed(2)), credit: "0", notes: null });

      // مدين: ضريبة القيمة المضافة
      if (vatAmount > 0 && vatOutputAcc) lines.push({ accountId: vatOutputAcc.id, accountName: vatOutputAcc.name, accountCode: vatOutputAcc.code, debit: String(vatAmount.toFixed(2)), credit: "0", notes: null });

      if (lines.length >= 2) {
        await createJournalEntry({
          date, description: "مرتجع فاتورة مبيعات " + (ret.returnNumber ?? "#" + ret.id),
          reference: ret.returnNumber, source: "sale_return", referenceId: ret.id, lines,
        });
      }
    } catch (e) { req.log.error(e); }

    return res.status(201).json(fmt(ret));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في إضافة مرتجع المبيعات" });
  }
});

router.delete("/sale-returns/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(saleReturnsTable).where(eq(saleReturnsTable.id, id));
    return res.status(204).end();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في حذف المرتجع" });
  }
});

export default router;
