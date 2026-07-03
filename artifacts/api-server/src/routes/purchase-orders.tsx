import { Router } from "express";
import { db, pool, purchaseOrders, purchaseOrderItems } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function ensurePurchaseOrderTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id SERIAL PRIMARY KEY,
      order_date DATE NOT NULL,
      supplier_id INTEGER,
      status TEXT DEFAULT 'pending',
      total_amount NUMERIC(12, 2) DEFAULT '0',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id SERIAL PRIMARY KEY,
      purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      quantity NUMERIC NOT NULL,
      unit_price NUMERIC(12, 2) NOT NULL,
      total_price NUMERIC(12, 2) NOT NULL
    );
  `);
}

function formatOrder(order: typeof purchaseOrders.$inferSelect, items: Array<any> = []) {
  return {
    id: order.id,
    orderDate: order.orderDate,
    supplierId: order.supplierId,
    status: order.status,
    notes: order.notes,
    totalAmount: Number(order.totalAmount ?? 0),
    createdAt: order.createdAt?.toISOString?.() ?? null,
    items: items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
      totalPrice: Number(item.totalPrice ?? 0),
    })),
  };
}

router.get("/purchase-orders", async (_req, res) => {
  try {
    await ensurePurchaseOrderTables();
    const orders = await db.select().from(purchaseOrders).orderBy(purchaseOrders.orderDate);
    const result = await Promise.all(orders.map(async (order) => {
      const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, order.id));
      return formatOrder(order, items);
    }));
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "فشل في جلب طلبات الشراء" });
  }
});

router.post("/purchase-orders", async (req, res) => {
  try {
    await ensurePurchaseOrderTables();
    const { orderDate, supplierId, status, notes, items = [] } = req.body;
    const [order] = await db.insert(purchaseOrders).values({
      orderDate,
      supplierId: supplierId ?? null,
      status: status ?? "pending",
      notes: notes ?? null,
      totalAmount: String((items as any[]).reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0), 0).toFixed(2)),
    }).returning();

    if (Array.isArray(items) && items.length > 0) {
      await db.insert(purchaseOrderItems).values(items.map((item: any) => ({
        purchaseOrderId: order.id,
        productName: item.productName,
        quantity: String(item.quantity ?? 0),
        unitPrice: String(item.unitPrice ?? 0),
        totalPrice: String((Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)).toFixed(2)),
      })));
    }

    const savedItems = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, order.id));
    return res.status(201).json(formatOrder(order, savedItems));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "فشل في إضافة طلب الشراء" });
  }
});

router.patch("/purchase-orders/:id", async (req, res) => {
  try {
    await ensurePurchaseOrderTables();
    const id = Number(req.params.id);
    const { orderDate, supplierId, status, notes, items = [] } = req.body;
    const [updated] = await db.update(purchaseOrders).set({
      orderDate: orderDate ?? undefined,
      supplierId: supplierId ?? null,
      status: status ?? undefined,
      notes: notes ?? null,
      totalAmount: String((items as any[]).reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0), 0).toFixed(2)),
    }).where(eq(purchaseOrders.id, id)).returning();

    if (!updated) return res.status(404).json({ error: "طلب الشراء غير موجود" });

    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
    if (Array.isArray(items) && items.length > 0) {
      await db.insert(purchaseOrderItems).values(items.map((item: any) => ({
        purchaseOrderId: id,
        productName: item.productName,
        quantity: String(item.quantity ?? 0),
        unitPrice: String(item.unitPrice ?? 0),
        totalPrice: String((Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)).toFixed(2)),
      })));
    }

    const savedItems = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
    return res.json(formatOrder(updated, savedItems));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "فشل في تحديث طلب الشراء" });
  }
});

router.delete("/purchase-orders/:id", async (req, res) => {
  try {
    await ensurePurchaseOrderTables();
    const id = Number(req.params.id);
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "فشل في حذف طلب الشراء" });
  }
});

export default router;
