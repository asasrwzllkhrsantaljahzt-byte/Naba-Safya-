import { Router } from "express";
import { db } from "@workspace/db";
import { salesTable, productsTable, customersTable, repsTable, inventoryTable, inventoryTransactionsTable, couponBooksTable, treasuryTransactionsTable, accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createJournalEntry } from "../lib/journalHelper";

const router = Router();

function formatSale(s: typeof salesTable.$inferSelect) {
  return {
    ...s,
    totalAmount: parseFloat(s.totalAmount),
    vatAmount: parseFloat(s.vatAmount),
    grandTotal: parseFloat(s.grandTotal),
    createdAt: s.createdAt.toISOString(),
    items: (s.items as Array<{
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

// ── مساعد: إنشاء القيد المحاسبي لفاتورة البيع ─────────────────
async function createSaleJournalEntry(sale: {
  id: number; date: string; orderNumber: string | null;
  totalAmount: number; vatAmount: number; grandTotal: number;
  paymentMethod: string; customerId: number; accountId: number | null;
}) {
  const allAccounts = await db.select().from(accountsTable);

  // حساب المبيعات
  const salesAcc = allAccounts.find(a => a.name.includes("إيرادات المبيعات") || a.name.includes("المبيعات"));
  // حساب ضريبة القيمة المضافة الدائنة
  const vatOutputAcc = allAccounts.find(a =>
    (a.name.includes("ضريبة") && a.name.includes("دائن")) ||
    a.name.includes("القيمة المضافة الدائنة")
  );

  if (!salesAcc) {
    console.error("لا يوجد حساب 'المبيعات' في دليل الحسابات — تم تجاهل القيد");
    return;
  }

  const lines = [];

  // دائن: المبيعات (قبل الضريبة)
  lines.push({
    accountId: salesAcc.id,
    accountName: salesAcc.name,
    accountCode: salesAcc.code,
    debit: "0",
    credit: String(sale.totalAmount.toFixed(2)),
  });

  // دائن: ضريبة القيمة المضافة (لو موجودة)
  if (sale.vatAmount > 0 && vatOutputAcc) {
    lines.push({
      accountId: vatOutputAcc.id,
      accountName: vatOutputAcc.name,
      accountCode: vatOutputAcc.code,
      debit: "0",
      credit: String(sale.vatAmount.toFixed(2)),
    });
  }

  // مدين: حساب العميل (آجل) أو الخزينة/البنك (نقدي/شبكة/تحويل/كوبون)
  if (sale.paymentMethod === "credit") {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, sale.customerId));
    if (!customer?.accountId) {
      console.error("العميل ليس له حساب مرتبط — تم تجاهل القيد");
      return;
    }
    const customerAccount = allAccounts.find(a => a.id === customer.accountId);
    if (!customerAccount) return;
    lines.push({
      accountId: customerAccount.id,
      accountName: customerAccount.name,
      accountCode: customerAccount.code,
      debit: String(sale.grandTotal.toFixed(2)),
      credit: "0",
    });
  } else {
    if (!sale.accountId) {
      console.error("فاتورة بيع بدون حساب خزينة/بنك — تم تجاهل القيد");
      return;
    }
    const cashBankAccount = allAccounts.find(a => a.id === sale.accountId);
    if (!cashBankAccount) return;
    lines.push({
      accountId: cashBankAccount.id,
      accountName: cashBankAccount.name,
      accountCode: cashBankAccount.code,
      debit: String(sale.grandTotal.toFixed(2)),
      credit: "0",
    });
  }

  await createJournalEntry({
    date: sale.date,
    description: `فاتورة مبيعات ${sale.orderNumber ?? `#${sale.id}`}`,
    reference: sale.orderNumber,
    source: "sale",
    referenceId: sale.id,
    lines,
  });
}

router.get("/sales", async (req, res) => {
  try {
    const { from, to, repId, customerId } = req.query as {
      from?: string; to?: string; repId?: string; customerId?: string;
    };
    let sales = await db.select().from(salesTable).orderBy(salesTable.date);
    if (from) sales = sales.filter((s) => s.date >= from);
    if (to) sales = sales.filter((s) => s.date <= to);
    if (repId) sales = sales.filter((s) => s.repId === parseInt(repId));
    if (customerId) sales = sales.filter((s) => s.customerId === parseInt(customerId));
    return res.json(sales.map(formatSale));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في جلب فواتير البيع" });
  }
});

router.post("/sales", async (req, res) => {
  try {
    const {
      orderNumber, date, customerId, repId, paymentMethod,
      couponBookId, notes, items, bottlesDelivered, bottlesReturned, accountId
    } = req.body;

    const products = await db.select().from(productsTable);
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId));
    if (!customer) return res.status(400).json({ error: "العميل غير موجود" });

    // المندوب اختياري
    let repName: string | null = null;
    if (repId) {
      const [rep] = await db.select().from(repsTable).where(eq(repsTable.id, repId));
      repName = rep?.name ?? null;
    }

    let totalAmount = 0;
    let vatAmount = 0;
    const processedItems = items.map((item: {
      productId: number; quantity: number; unitPrice: number;
      vatRate?: number; vatEnabled?: boolean;
    }) => {
      const product = products.find((p) => p.id === item.productId);
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

    const [sale] = await db.insert(salesTable).values({
      orderNumber: orderNumber ?? `SAL-${Date.now()}`,
      date,
      customerId,
      customerName: customer.name,
      repId: repId ?? null,
      repName,
      accountId: accountId ?? null,
      items: processedItems,
      totalAmount: String(totalAmount.toFixed(2)),
      vatAmount: String(vatAmount.toFixed(2)),
      grandTotal: String(grandTotal.toFixed(2)),
      paymentMethod,
      couponBookId: couponBookId ?? null,
      bottlesDelivered: bottlesDelivered ?? 0,
      bottlesReturned: bottlesReturned ?? 0,
      notes,
    }).returning();

    // تحديث المخزون (OUT)
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
        reference: sale.orderNumber ?? `SAL-${sale.id}`,
        referenceType: "sale",
      });
    }

    // كوبون
    if (paymentMethod === "coupon" && couponBookId) {
      const [book] = await db.select().from(couponBooksTable).where(eq(couponBooksTable.id, couponBookId));
      if (book) {
        const newRemaining = Math.max(0, parseFloat(book.remainingValue) - grandTotal);
        await db.update(couponBooksTable)
          .set({ remainingValue: String(newRemaining.toFixed(2)) })
          .where(eq(couponBooksTable.id, couponBookId));
      }
    }

    // ✅ حركة خزينة للدفع الفوري (نقدي/شبكة/تحويل)
    if (["cash", "network", "transfer"].includes(paymentMethod)) {
      const methodLabel = paymentMethod === "cash" ? "نقدي" : paymentMethod === "network" ? "شبكة" : "تحويل";
      await db.insert(treasuryTransactionsTable).values({
        date, type: "in",
        amount: String(grandTotal.toFixed(2)),
        description: `تحصيل ${methodLabel} - ${sale.orderNumber ?? sale.id} - ${customer.name}`,
        source: "sale",
        reference: sale.orderNumber ?? `SAL-${sale.id}`,
        relatedPartyName: customer.name,
        accountId: accountId ?? null,
      });
    }

    // ✅ القيد المحاسبي التلقائي
    await createSaleJournalEntry({
      id: sale.id,
      date: sale.date,
      orderNumber: sale.orderNumber,
      totalAmount,
      vatAmount,
      grandTotal,
      paymentMethod,
      customerId,
      accountId: accountId ?? null,
    });

    // تحديث آخر زيارة للعميل
    await db.update(customersTable)
      .set({ lastVisitDate: date })
      .where(eq(customersTable.id, customerId));

    return res.status(201).json(formatSale(sale));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في إضافة فاتورة البيع" });
  }
});

router.get("/sales/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, id));
    if (!sale) return res.status(404).json({ error: "فاتورة البيع غير موجودة" });
    return res.json(formatSale(sale));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في جلب فاتورة البيع" });
  }
});

router.patch("/sales/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [oldSale] = await db.select().from(salesTable).where(eq(salesTable.id, id));
    if (!oldSale) return res.status(404).json({ error: "الفاتورة غير موجودة" });

    const { date, customerId, repId, paymentMethod, accountId, notes, items, bottlesDelivered, bottlesReturned, orderNumber } = req.body;

    const products = await db.select().from(productsTable);
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId));
    if (!customer) return res.status(400).json({ error: "العميل غير موجود" });

    let repName: string | null = null;
    if (repId) {
      const [rep] = await db.select().from(repsTable).where(eq(repsTable.id, repId));
      repName = rep?.name ?? null;
    }

    // عكس المخزون القديم
    const oldItems = oldSale.items as Array<{ productId: number; quantity: number }>;
    for (const item of oldItems) {
      const [existing] = await db.select().from(inventoryTable).where(eq(inventoryTable.productId, item.productId));
      if (existing) {
        await db.update(inventoryTable)
          .set({ quantity: existing.quantity + item.quantity })
          .where(eq(inventoryTable.productId, item.productId));
      }
    }
    await db.delete(inventoryTransactionsTable).where(eq(inventoryTransactionsTable.reference, oldSale.orderNumber ?? `SAL-${oldSale.id}`));
    await db.delete(treasuryTransactionsTable).where(eq(treasuryTransactionsTable.reference, oldSale.orderNumber ?? `SAL-${oldSale.id}`));

    let totalAmount = 0;
    let vatAmount = 0;
    const processedItems = items.map((item: any) => {
      const product = products.find((p) => p.id === item.productId);
      const vatRate = item.vatRate ?? parseFloat(product?.vatRate ?? "15");
      const vatEnabled = item.vatEnabled !== false;
      const subtotal = item.quantity * item.unitPrice;
      const itemVat = vatEnabled ? subtotal * (vatRate / 100) : 0;
      totalAmount += subtotal;
      vatAmount += itemVat;
      return { productId: item.productId, productName: product?.name ?? `منتج #${item.productId}`, quantity: item.quantity, unitPrice: item.unitPrice, vatRate, vatEnabled, subtotal };
    });
    const grandTotal = totalAmount + vatAmount;

    const [sale] = await db.update(salesTable).set({
      orderNumber: orderNumber ?? oldSale.orderNumber,
      date, customerId, customerName: customer.name,
      repId: repId ?? null, repName,
      accountId: accountId ?? null,
      paymentMethod, notes,
      items: processedItems,
      totalAmount: String(totalAmount.toFixed(2)),
      vatAmount: String(vatAmount.toFixed(2)),
      grandTotal: String(grandTotal.toFixed(2)),
      bottlesDelivered: bottlesDelivered ?? 0,
      bottlesReturned: bottlesReturned ?? 0,
    }).where(eq(salesTable.id, id)).returning();

    for (const item of processedItems) {
      const [existing] = await db.select().from(inventoryTable).where(eq(inventoryTable.productId, item.productId));
      if (existing) {
        await db.update(inventoryTable)
          .set({ quantity: Math.max(0, existing.quantity - item.quantity) })
          .where(eq(inventoryTable.productId, item.productId));
      }
      await db.insert(inventoryTransactionsTable).values({
        date, type: "out", productId: item.productId, productName: item.productName,
        quantity: item.quantity, reference: sale.orderNumber ?? `SAL-${sale.id}`, referenceType: "sale",
      });
    }

    if (["cash", "network", "transfer"].includes(paymentMethod)) {
      await db.insert(treasuryTransactionsTable).values({
        date, type: "in",
        amount: String(grandTotal.toFixed(2)),
        description: `تحصيل (معدّل) - ${sale.orderNumber ?? sale.id} - ${customer.name}`,
        source: "sale",
        reference: sale.orderNumber ?? `SAL-${sale.id}`,
        relatedPartyName: customer.name,
        accountId: accountId ?? null,
      });
    }

    await createSaleJournalEntry({
      id: sale.id, date: sale.date, orderNumber: sale.orderNumber,
      totalAmount, vatAmount, grandTotal, paymentMethod, customerId, accountId: accountId ?? null,
    });

    return res.json(formatSale(sale));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في تعديل فاتورة البيع" });
  }
});

router.delete("/sales/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(salesTable).where(eq(salesTable.id, id));
    return res.status(204).end();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في حذف فاتورة البيع" });
  }
});

export default router;