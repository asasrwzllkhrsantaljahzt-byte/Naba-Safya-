import { Router } from "express";
import { db } from "@workspace/db";
import { salesTable, productsTable, customersTable, repsTable, inventoryTable, inventoryTransactionsTable, couponBooksTable, treasuryTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
      unitPrice: number; vatRate: number; subtotal: number;
    }>).map((item) => ({
      ...item,
      unitPrice: parseFloat(String(item.unitPrice)),
      vatRate: parseFloat(String(item.vatRate)),
      subtotal: parseFloat(String(item.subtotal)),
    })),
  };
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
    res.json(sales.map(formatSale));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب طلبيات البيع" });
  }
});

router.post("/sales", async (req, res) => {
  try {
    const { orderNumber, date, customerId, repId, paymentMethod, couponBookId, notes, items, bottlesDelivered, bottlesReturned } = req.body;

    const products = await db.select().from(productsTable);
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId));
    const [rep] = await db.select().from(repsTable).where(eq(repsTable.id, repId));

    if (!customer) return res.status(400).json({ error: "العميل غير موجود" });
    if (!rep) return res.status(400).json({ error: "المندوب غير موجود" });

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

    const [sale] = await db.insert(salesTable).values({
      orderNumber: orderNumber ?? `SAL-${Date.now()}`,
      date,
      customerId,
      customerName: customer.name,
      repId,
      repName: rep.name,
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

    // Auto-deduct inventory (OUT)
    for (const item of processedItems) {
      const [existing] = await db.select().from(inventoryTable).where(eq(inventoryTable.productId, item.productId));
      if (existing) {
        await db.update(inventoryTable)
          .set({ quantity: Math.max(0, existing.quantity - item.quantity) })
          .where(eq(inventoryTable.productId, item.productId));
      }
      await db.insert(inventoryTransactionsTable).values({
        date,
        type: "out",
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        reference: sale.orderNumber ?? `SAL-${sale.id}`,
        referenceType: "sale",
      });
    }

    // Deduct from coupon book if coupon payment
    if (paymentMethod === "coupon" && couponBookId) {
      const [book] = await db.select().from(couponBooksTable).where(eq(couponBooksTable.id, couponBookId));
      if (book) {
        const newRemaining = Math.max(0, parseFloat(book.remainingValue) - grandTotal);
        await db.update(couponBooksTable)
          .set({ remainingValue: String(newRemaining.toFixed(2)) })
          .where(eq(couponBooksTable.id, couponBookId));
      }
    }

    // Add to treasury if cash, network, or transfer
    if (paymentMethod === "cash" || paymentMethod === "network" || paymentMethod === "transfer") {
      const methodLabel = paymentMethod === "cash" ? "نقدي" : paymentMethod === "network" ? "شبكة" : "تحويل";
      await db.insert(treasuryTransactionsTable).values({
        date,
        type: "in",
        amount: String(grandTotal.toFixed(2)),
        description: `تحصيل ${methodLabel} - طلبية ${sale.orderNumber ?? sale.id} - ${customer.name}`,
        source: "sale",
        reference: sale.orderNumber ?? `SAL-${sale.id}`,
      });
    }

    // Update customer's last visit date
    await db.update(customersTable)
      .set({ lastVisitDate: date })
      .where(eq(customersTable.id, customerId));

    res.status(201).json(formatSale(sale));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في إضافة طلبية البيع" });
  }
});

router.get("/sales/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, id));
    if (!sale) return res.status(404).json({ error: "طلبية البيع غير موجودة" });
    res.json(formatSale(sale));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب طلبية البيع" });
  }
});

router.delete("/sales/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(salesTable).where(eq(salesTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في حذف طلبية البيع" });
  }
});

export default router;
