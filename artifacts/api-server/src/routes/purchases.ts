import { Router } from "express";
import { db } from "@workspace/db";
import { purchasesTable, productsTable, inventoryTable, inventoryTransactionsTable, treasuryTransactionsTable, obligationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
      unitPrice: number; vatRate: number; subtotal: number;
    }>).map((item) => ({
      ...item,
      unitPrice: parseFloat(String(item.unitPrice)),
      vatRate: parseFloat(String(item.vatRate)),
      subtotal: parseFloat(String(item.subtotal)),
    })),
  };
}

router.get("/purchases", async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    let purchases = await db.select().from(purchasesTable).orderBy(purchasesTable.date);
    if (from) purchases = purchases.filter((p) => p.date >= from);
    if (to) purchases = purchases.filter((p) => p.date <= to);
    res.json(purchases.map(formatPurchase));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب فواتير الشراء" });
  }
});

router.post("/purchases", async (req, res) => {
  try {
    const { invoiceNumber, date, supplierName, supplierId, paymentMethod, notes, items } = req.body;
    const method = paymentMethod ?? "cash";

    const products = await db.select().from(productsTable);

    let totalAmount = 0;
    let vatAmount = 0;
    const processedItems = items.map((item: { productId: number; quantity: number; unitPrice: number; vatRate?: number }) => {
      const product = products.find((p) => p.id === item.productId);
      const vatRate = item.vatRate ?? parseFloat(product?.vatRate ?? "15");
      const subtotal = item.quantity * item.unitPrice;
      const itemVat = subtotal * (vatRate / 100);
      totalAmount += subtotal;
      vatAmount += itemVat;
      return {
        productId: item.productId,
        productName: product?.name ?? `منتج #${item.productId}`,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate,
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
      notes,
      items: processedItems,
      totalAmount: String(totalAmount.toFixed(2)),
      vatAmount: String(vatAmount.toFixed(2)),
      grandTotal: String(grandTotal.toFixed(2)),
    }).returning();

    // Auto-update inventory (IN)
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

    // Treasury: deduct immediately for cash/network, or create obligation for credit
    if (method === "cash" || method === "network") {
      const label = method === "cash" ? "نقدي" : "شبكة";
      await db.insert(treasuryTransactionsTable).values({
        date, type: "out",
        amount: String(grandTotal.toFixed(2)),
        description: `مشتريات ${label}: ${supplierName ?? "مورد"} - ${purchase.invoiceNumber}`,
        source: "purchase",
        reference: purchase.invoiceNumber ?? `PUR-${purchase.id}`,
        relatedPartyName: supplierName ?? null,
      });
    } else if (method === "credit") {
      await db.insert(obligationsTable).values({
        date, type: "supplier",
        description: `فاتورة مشتريات آجل: ${purchase.invoiceNumber}`,
        partyName: supplierName ?? "مورد",
        amount: String(grandTotal.toFixed(2)),
        paidAmount: "0", status: "pending",
        referenceType: "purchase", referenceId: purchase.id,
      });
    }

    res.status(201).json(formatPurchase(purchase));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في إضافة فاتورة الشراء" });
  }
});

router.get("/purchases/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [purchase] = await db.select().from(purchasesTable).where(eq(purchasesTable.id, id));
    if (!purchase) return res.status(404).json({ error: "فاتورة الشراء غير موجودة" });
    res.json(formatPurchase(purchase));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب فاتورة الشراء" });
  }
});

router.delete("/purchases/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(purchasesTable).where(eq(purchasesTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في حذف فاتورة الشراء" });
  }
});

export default router;
