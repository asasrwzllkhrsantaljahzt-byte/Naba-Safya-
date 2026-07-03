import { Router } from "express";
import { db } from "@workspace/db";
import { purchaseReturnsTable, productsTable, inventoryTable, inventoryTransactionsTable, treasuryTransactionsTable, accountsTable, suppliersTable, purchasesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createJournalEntry } from "../lib/journalHelper";

const router = Router();

function formatReturn(p: typeof purchaseReturnsTable.$inferSelect) {
  return {
    ...p,
    totalAmount: parseFloat(p.totalAmount),
    vatAmount: parseFloat(p.vatAmount),
    grandTotal: parseFloat(p.grandTotal),
    createdAt: p.createdAt.toISOString(),
    items: (p.items as Array<{
      productId: number; productName: string; quantity: number;
      unitPrice: number; vatRate: number; vatEnabled?: boolean; subtotal: number;
    }>).map((item) => ({
      ...item,
      unitPrice: parseFloat(String(item.unitPrice)),
      vatRate: parseFloat(String(item.vatRate)),
      vatEnabled: item.vatEnabled ?? true,
      subtotal: parseFloat(String(item.subtotal)),
    })),
  };
}

function buildProcessedItems(items: Array<any>, products: Array<any>) {
  let totalAmount = 0;
  let vatAmount = 0;
  const processedItems = (Array.isArray(items) ? items : []).map((item: { productId: number; quantity: number; unitPrice: number; vatRate?: number; vatEnabled?: boolean }) => {
    const product = products.find((p: any) => p.id === item.productId);
    const vatRate = item.vatRate ?? parseFloat(product?.vatRate ?? "15");
    const vatEnabled = item.vatEnabled !== false;
    const subtotal = item.quantity * item.unitPrice;
    const itemVat = vatEnabled ? subtotal * (vatRate / 100) : 0;
    totalAmount += subtotal;
    vatAmount += itemVat;
    return {
      productId: item.productId,
      productName: product?.name ?? `منتج #${item.productId}`,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate,
      vatEnabled,
      subtotal,
    };
  });
  const grandTotal = totalAmount + vatAmount;
  return { processedItems, totalAmount, vatAmount, grandTotal };
}

async function findHelperAccounts() {
  const allAccounts = await db.select().from(accountsTable);
  const purchasesAcc = allAccounts.find(a => a.name.includes("مردودات المشتريات"))
    ?? allAccounts.find(a => a.name.includes("مشتريات"));
  const vatInputAcc = allAccounts.find(a =>
    (a.name.includes("ضريبة") && a.name.includes("مدين")) ||
    a.name.includes("القيمة المضافة المدينة")
  );
  return { purchasesAcc, vatInputAcc, allAccounts };
}

// قيد المرتجع: عكس قيد الشراء تماماً
async function createPurchaseReturnJournalEntry(ret: {
  id: number; date: string; returnNumber: string | null;
  totalAmount: number; vatAmount: number; grandTotal: number;
  paymentMethod: string; supplierId: number | null; accountId: number | null;
}) {
  const { purchasesAcc, vatInputAcc, allAccounts } = await findHelperAccounts();
  if (!purchasesAcc) {
    console.error("لا يوجد حساب مشتريات — تم تجاهل القيد");
    return;
  }

  const lines = [];

  // دائن: المشتريات (عكس المدين الأصلي)
  lines.push({
    accountId: purchasesAcc.id,
    accountName: purchasesAcc.name,
    accountCode: purchasesAcc.code,
    debit: "0",
    credit: String(ret.totalAmount.toFixed(2)),
  });

  // دائن: ضريبة القيمة المضافة
  if (ret.vatAmount > 0 && vatInputAcc) {
    lines.push({
      accountId: vatInputAcc.id,
      accountName: vatInputAcc.name,
      accountCode: vatInputAcc.code,
      debit: "0",
      credit: String(ret.vatAmount.toFixed(2)),
    });
  }

  // مدين: المورد (آجل) أو الخزينة/البنك (نقدي/شبكة) — عكس الأصلي
  if (ret.paymentMethod === "credit") {
    if (!ret.supplierId) return;
    const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, ret.supplierId));
    if (!supplier?.accountId) return;
    const supplierAccount = allAccounts.find(a => a.id === supplier.accountId);
    if (!supplierAccount) return;
    lines.push({
      accountId: supplierAccount.id,
      accountName: supplierAccount.name,
      accountCode: supplierAccount.code,
      debit: String(ret.grandTotal.toFixed(2)),
      credit: "0",
    });
  } else {
    if (!ret.accountId) return;
    const cashBankAccount = allAccounts.find(a => a.id === ret.accountId);
    if (!cashBankAccount) return;
    lines.push({
      accountId: cashBankAccount.id,
      accountName: cashBankAccount.name,
      accountCode: cashBankAccount.code,
      debit: String(ret.grandTotal.toFixed(2)),
      credit: "0",
    });
  }

  await createJournalEntry({
    date: ret.date,
    description: `مرتجع فاتورة مشتريات ${ret.returnNumber ?? `#${ret.id}`}`,
    reference: ret.returnNumber,
    source: "purchase_return",
    referenceId: ret.id,
    lines,
  });
}

router.get("/purchase-returns", async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    let returns = await db.select().from(purchaseReturnsTable).orderBy(purchaseReturnsTable.date);
    if (from) returns = returns.filter((p) => p.date >= from);
    if (to) returns = returns.filter((p) => p.date <= to);
    return res.json(returns.map(formatReturn));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في جلب مرتجعات الشراء" });
  }
});

router.post("/purchase-returns", async (req, res) => {
  try {
    const { returnNumber, date, originalPurchaseId, supplierName, supplierId, paymentMethod, accountId, warehouseId, notes, items } = req.body;
    const method = paymentMethod ?? "cash";

    const products = await db.select().from(productsTable);
    const { processedItems, totalAmount, vatAmount, grandTotal } = buildProcessedItems(items, products);

    const [ret] = await db.insert(purchaseReturnsTable).values({
      returnNumber: returnNumber ?? `PRET-${Date.now()}`,
      date,
      originalPurchaseId: originalPurchaseId ?? null,
      supplierId: supplierId ?? null,
      supplierName: supplierName ?? null,
      paymentMethod: method,
      accountId: accountId ?? null,
      warehouseId: warehouseId ?? null,
      notes,
      items: processedItems,
      totalAmount: String(totalAmount.toFixed(2)),
      vatAmount: String(vatAmount.toFixed(2)),
      grandTotal: String(grandTotal.toFixed(2)),
    }).returning();

    // تحديث المخزون (OUT - عكس الشراء)
    for (const item of processedItems) {
      const [existing] = await db.select().from(inventoryTable).where(eq(inventoryTable.productId, item.productId));
      if (existing) {
        await db.update(inventoryTable)
          .set({ quantity: Math.max(0, existing.quantity - item.quantity) })
          .where(eq(inventoryTable.productId, item.productId));
      }
      await db.insert(inventoryTransactionsTable).values({
        date, type: "out",
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        reference: ret.returnNumber ?? `PRET-${ret.id}`,
        referenceType: "purchase",
      });
    }

    // القيد المحاسبي التلقائي المعكوس
    await createPurchaseReturnJournalEntry({
      id: ret.id,
      date: ret.date,
      returnNumber: ret.returnNumber,
      totalAmount,
      vatAmount,
      grandTotal,
      paymentMethod: method,
      supplierId: supplierId ?? null,
      accountId: accountId ?? null,
    });

    // حركة خزينة عكسية (استلام) لو نقدي/بنك
    if (method === "cash" || method === "network") {
      await db.insert(treasuryTransactionsTable).values({
        date, type: "in",
        amount: String(grandTotal.toFixed(2)),
        description: `مرتجع مشتريات: ${supplierName ?? "مورد"} - ${ret.returnNumber}`,
        source: "purchase",
        reference: ret.returnNumber ?? `PRET-${ret.id}`,
        relatedPartyName: supplierName ?? null,
        accountId: accountId ?? null,
      });
    }

    return res.status(201).json(formatReturn(ret));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في إضافة مرتجع الشراء" });
  }
});

router.patch("/purchase-returns/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { date, originalPurchaseId, supplierName, supplierId, paymentMethod, accountId, warehouseId, notes, items } = req.body;
    const products = await db.select().from(productsTable);
    const { processedItems, totalAmount, vatAmount, grandTotal } = buildProcessedItems(items, products);

    const [updated] = await db.update(purchaseReturnsTable).set({
      date: date ?? undefined,
      originalPurchaseId: originalPurchaseId ?? null,
      supplierId: supplierId ?? null,
      supplierName: supplierName ?? null,
      paymentMethod: paymentMethod ?? undefined,
      accountId: accountId ?? null,
      warehouseId: warehouseId ?? null,
      notes: notes ?? null,
      items: processedItems,
      totalAmount: String(totalAmount.toFixed(2)),
      vatAmount: String(vatAmount.toFixed(2)),
      grandTotal: String(grandTotal.toFixed(2)),
    }).where(eq(purchaseReturnsTable.id, id)).returning();

    if (!updated) return res.status(404).json({ error: "المرتجع غير موجود" });
    return res.json(formatReturn(updated));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في تحديث المرتجع" });
  }
});

router.get("/purchase-returns/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [ret] = await db.select().from(purchaseReturnsTable).where(eq(purchaseReturnsTable.id, id));
    if (!ret) return res.status(404).json({ error: "المرتجع غير موجود" });
    return res.json(formatReturn(ret));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في جلب المرتجع" });
  }
});

router.delete("/purchase-returns/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(purchaseReturnsTable).where(eq(purchaseReturnsTable.id, id));
    return res.status(204).end();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في حذف المرتجع" });
  }
});

export default router;
