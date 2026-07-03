import { Router } from "express";
import { db } from "@workspace/db";
import { purchasesTable, productsTable, inventoryTable, inventoryTransactionsTable, treasuryTransactionsTable, accountsTable, suppliersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createJournalEntry } from "../lib/journalHelper";

const router = Router();

function formatPurchase(p: typeof purchasesTable.$inferSelect) {
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

// ── مساعد: إيجاد حساب "المشتريات" و"ضريبة القيمة المضافة المدينة" ─
async function findHelperAccounts() {
  const allAccounts = await db.select().from(accountsTable);
  const purchasesAcc = allAccounts.find(a => a.name.includes("مشتريات"));
  const vatInputAcc = allAccounts.find(a =>
    (a.name.includes("ضريبة") && a.name.includes("مدين")) ||
    a.name.includes("القيمة المضافة المدينة")
  );
  return { purchasesAcc, vatInputAcc, allAccounts };
}

// ── إنشاء القيد المحاسبي لفاتورة الشراء ───────────────────────
async function createPurchaseJournalEntry(purchase: {
  id: number; date: string; invoiceNumber: string | null;
  totalAmount: number; vatAmount: number; grandTotal: number;
  paymentMethod: string; supplierId: number | null; accountId: number | null;
}) {
  const { purchasesAcc, vatInputAcc, allAccounts } = await findHelperAccounts();
  if (!purchasesAcc) {
    console.error("لا يوجد حساب 'المشتريات' في دليل الحسابات — تم تجاهل القيد");
    return;
  }

  const lines = [];

  // مدين: المشتريات
  lines.push({
    accountId: purchasesAcc.id,
    accountName: purchasesAcc.name,
    accountCode: purchasesAcc.code,
    debit: String(purchase.totalAmount.toFixed(2)),
    credit: "0",
  });

  // مدين: ضريبة القيمة المضافة (لو موجودة)
  if (purchase.vatAmount > 0 && vatInputAcc) {
    lines.push({
      accountId: vatInputAcc.id,
      accountName: vatInputAcc.name,
      accountCode: vatInputAcc.code,
      debit: String(purchase.vatAmount.toFixed(2)),
      credit: "0",
    });
  }

  // دائن: المورد (آجل) أو الخزينة/البنك (نقدي/شبكة)
  if (purchase.paymentMethod === "credit") {
    if (!purchase.supplierId) {
      console.error("فاتورة آجل بدون مورد محدد — تم تجاهل القيد");
      return;
    }
    const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, purchase.supplierId));
    if (!supplier?.accountId) {
      console.error("المورد ليس له حساب مرتبط — تم تجاهل القيد");
      return;
    }
    const supplierAccount = allAccounts.find(a => a.id === supplier.accountId);
    if (!supplierAccount) return;
    lines.push({
      accountId: supplierAccount.id,
      accountName: supplierAccount.name,
      accountCode: supplierAccount.code,
      debit: "0",
      credit: String(purchase.grandTotal.toFixed(2)),
    });
  } else {
    if (!purchase.accountId) {
      console.error("فاتورة نقدي/بنك بدون حساب محدد — تم تجاهل القيد");
      return;
    }
    const cashBankAccount = allAccounts.find(a => a.id === purchase.accountId);
    if (!cashBankAccount) return;
    lines.push({
      accountId: cashBankAccount.id,
      accountName: cashBankAccount.name,
      accountCode: cashBankAccount.code,
      debit: "0",
      credit: String(purchase.grandTotal.toFixed(2)),
    });
  }

  await createJournalEntry({
    date: purchase.date,
    description: `فاتورة مشتريات ${purchase.invoiceNumber ?? `#${purchase.id}`}`,
    reference: purchase.invoiceNumber,
    source: "purchase",
    referenceId: purchase.id,
    lines,
  });
}

router.get("/purchases", async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    let purchases = await db.select().from(purchasesTable).orderBy(purchasesTable.date);
    if (from) purchases = purchases.filter((p) => p.date >= from);
    if (to) purchases = purchases.filter((p) => p.date <= to);
    return res.json(purchases.map(formatPurchase));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في جلب فواتير الشراء" });
  }
});

router.post("/purchases", async (req, res) => {
  try {
    const { invoiceNumber, date, supplierName, supplierId, paymentMethod, accountId, warehouseId, notes, items } = req.body;
    const method = paymentMethod ?? "cash";

    const products = await db.select().from(productsTable);

    let totalAmount = 0;
    let vatAmount = 0;
    const processedItems = items.map((item: { productId: number; quantity: number; unitPrice: number; vatRate?: number; vatEnabled?: boolean }) => {
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

    const [purchase] = await db.insert(purchasesTable).values({
      invoiceNumber: invoiceNumber ?? `PUR-${Date.now()}`,
      date,
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

    // تحديث المخزون (IN)
    for (const item of processedItems) {
      const [existing] = await db.select().from(inventoryTable).where(eq(inventoryTable.productId, item.productId));
      if (existing) {
        await db.update(inventoryTable)
          .set({ quantity: existing.quantity + item.quantity })
          .where(eq(inventoryTable.productId, item.productId));
      } else {
        await db.insert(inventoryTable).values({ productId: item.productId, quantity: item.quantity });
      }
      await db.insert(inventoryTransactionsTable).values({
        date, type: "in",
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        reference: purchase.invoiceNumber ?? `PUR-${purchase.id}`,
        referenceType: "purchase",
      });
    }

    // ✅ القيد المحاسبي التلقائي (بديل obligations تماماً)
    await createPurchaseJournalEntry({
      id: purchase.id,
      date: purchase.date,
      invoiceNumber: purchase.invoiceNumber,
      totalAmount,
      vatAmount,
      grandTotal,
      paymentMethod: method,
      supplierId: supplierId ?? null,
      accountId: accountId ?? null,
    });

    // ✅ حركة خزينة فقط لو نقدي/بنك (للعرض في صفحة خزينة وبنوك)
    if (method === "cash" || method === "network") {
      await db.insert(treasuryTransactionsTable).values({
        date, type: "out",
        amount: String(grandTotal.toFixed(2)),
        description: `مشتريات: ${supplierName ?? "مورد"} - ${purchase.invoiceNumber}`,
        source: "purchase",
        reference: purchase.invoiceNumber ?? `PUR-${purchase.id}`,
        relatedPartyName: supplierName ?? null,
        accountId: accountId ?? null,
      });
    }

    return res.status(201).json(formatPurchase(purchase));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في إضافة فاتورة الشراء" });
  }
});

// ✅ تعديل فاتورة شراء — يعكس التأثير القديم ويطبّق الجديد
router.patch("/purchases/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [oldPurchase] = await db.select().from(purchasesTable).where(eq(purchasesTable.id, id));
    if (!oldPurchase) return res.status(404).json({ error: "الفاتورة غير موجودة" });

    const { invoiceNumber, date, supplierName, supplierId, paymentMethod, accountId, warehouseId, notes, items } = req.body;
    const method = paymentMethod ?? oldPurchase.paymentMethod ?? "cash";

    // عكس تأثير المخزون القديم
    const oldItems = oldPurchase.items as Array<{ productId: number; quantity: number }>;
    for (const item of oldItems) {
      const [existing] = await db.select().from(inventoryTable).where(eq(inventoryTable.productId, item.productId));
      if (existing) {
        await db.update(inventoryTable)
          .set({ quantity: Math.max(0, existing.quantity - item.quantity) })
          .where(eq(inventoryTable.productId, item.productId));
      }
    }
    // حذف حركات المخزون القديمة المرتبطة
    await db.delete(inventoryTransactionsTable).where(eq(inventoryTransactionsTable.reference, oldPurchase.invoiceNumber ?? `PUR-${oldPurchase.id}`));

    // حذف حركة الخزينة القديمة المرتبطة
    await db.delete(treasuryTransactionsTable).where(eq(treasuryTransactionsTable.reference, oldPurchase.invoiceNumber ?? `PUR-${oldPurchase.id}`));

    // إعادة حساب البنود الجديدة
    const products = await db.select().from(productsTable);
    let totalAmount = 0;
    let vatAmount = 0;
    const processedItems = items.map((item: { productId: number; quantity: number; unitPrice: number; vatRate?: number; vatEnabled?: boolean }) => {
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

    const [purchase] = await db.update(purchasesTable).set({
      invoiceNumber: invoiceNumber ?? oldPurchase.invoiceNumber,
      date,
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
    }).where(eq(purchasesTable.id, id)).returning();

    // تطبيق المخزون الجديد
    for (const item of processedItems) {
      const [existing] = await db.select().from(inventoryTable).where(eq(inventoryTable.productId, item.productId));
      if (existing) {
        await db.update(inventoryTable)
          .set({ quantity: existing.quantity + item.quantity })
          .where(eq(inventoryTable.productId, item.productId));
      } else {
        await db.insert(inventoryTable).values({ productId: item.productId, quantity: item.quantity });
      }
      await db.insert(inventoryTransactionsTable).values({
        date, type: "in",
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        reference: purchase.invoiceNumber ?? `PUR-${purchase.id}`,
        referenceType: "purchase",
      });
    }

    // قيد محاسبي جديد (القديم يبقى في السجل التاريخي، ده الأبسط والأكثر أماناً محاسبياً)
    await createPurchaseJournalEntry({
      id: purchase.id,
      date: purchase.date,
      invoiceNumber: purchase.invoiceNumber,
      totalAmount, vatAmount, grandTotal,
      paymentMethod: method,
      supplierId: supplierId ?? null,
      accountId: accountId ?? null,
    });

    if (method === "cash" || method === "network") {
      await db.insert(treasuryTransactionsTable).values({
        date, type: "out",
        amount: String(grandTotal.toFixed(2)),
        description: `مشتريات (معدّلة): ${supplierName ?? "مورد"} - ${purchase.invoiceNumber}`,
        source: "purchase",
        reference: purchase.invoiceNumber ?? `PUR-${purchase.id}`,
        relatedPartyName: supplierName ?? null,
        accountId: accountId ?? null,
      });
    }

    return res.json(formatPurchase(purchase));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في تعديل فاتورة الشراء" });
  }
});

router.get("/purchases/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [purchase] = await db.select().from(purchasesTable).where(eq(purchasesTable.id, id));
    if (!purchase) return res.status(404).json({ error: "فاتورة الشراء غير موجودة" });
    return res.json(formatPurchase(purchase));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في جلب فاتورة الشراء" });
  }
});

router.delete("/purchases/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(purchasesTable).where(eq(purchasesTable.id, id));
    return res.status(204).end();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في حذف فاتورة الشراء" });
  }
});

export default router;