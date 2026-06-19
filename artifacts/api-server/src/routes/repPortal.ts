import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, salesTable, inventoryTransactionsTable, repsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyToken } from "./auth";

const router = Router();

// Auth middleware for rep portal
function repAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "غير مصرح" });
  const payload = verifyToken(auth.slice(7));
  if (!payload) return res.status(401).json({ error: "جلسة منتهية" });
  req.repId = payload.repId;
  next();
}

// Rep's customers
router.get("/rep-portal/customers", repAuth, async (req: any, res) => {
  try {
    const customers = await db.select().from(customersTable).where(eq(customersTable.repId, req.repId));
    res.json(customers.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب العملاء" });
  }
});

// Add customer (rep portal)
router.post("/rep-portal/customers", repAuth, async (req: any, res) => {
  try {
    const { name, phone, area, bottleBalance, lastVisitDate, notes } = req.body;
    const [rep] = await db.select().from(repsTable).where(eq(repsTable.id, req.repId));
    const [customer] = await db.insert(customersTable).values({
      name, phone, area, notes,
      repId: req.repId,
      repName: rep?.name,
      bottleBalance: bottleBalance ?? 0,
      lastVisitDate: lastVisitDate ?? null,
    }).returning();
    res.status(201).json({ ...customer, createdAt: customer.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في إضافة العميل" });
  }
});

// Update customer bottle balance & last visit (rep portal)
router.patch("/rep-portal/customers/:id", repAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { bottleBalance, lastVisitDate, name, phone, area, notes } = req.body;
    const updates: Record<string, unknown> = {};
    if (bottleBalance !== undefined) updates.bottleBalance = bottleBalance;
    if (lastVisitDate !== undefined) updates.lastVisitDate = lastVisitDate;
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (area !== undefined) updates.area = area;
    if (notes !== undefined) updates.notes = notes;
    const [customer] = await db.update(customersTable).set(updates).where(eq(customersTable.id, id)).returning();
    res.json({ ...customer, createdAt: customer.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في تحديث العميل" });
  }
});

// Rep's sales
router.get("/rep-portal/sales", repAuth, async (req: any, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    let sales = await db.select().from(salesTable).where(eq(salesTable.repId, req.repId));
    if (from) sales = sales.filter((s) => s.date >= from);
    if (to) sales = sales.filter((s) => s.date <= to);
    res.json(sales.map((s) => ({
      ...s,
      totalAmount: parseFloat(s.totalAmount),
      vatAmount: parseFloat(s.vatAmount),
      grandTotal: parseFloat(s.grandTotal),
      createdAt: s.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب المبيعات" });
  }
});

// Settlement / تسوية التسليم
router.get("/rep-portal/settlement", repAuth, async (req: any, res) => {
  try {
    const { date } = req.query as { date?: string };
    const today = date || new Date().toISOString().split("T")[0];

    const sales = await db.select().from(salesTable).where(eq(salesTable.repId, req.repId));
    const daySales = sales.filter((s) => s.date === today);

    // Inventory transactions for this rep on this date
    const txns = await db.select().from(inventoryTransactionsTable);
    const dayTxns = txns.filter((t) => t.date === today);

    // Bottles delivered (out) and returned (in) for this rep's sales
    const saleTxns = dayTxns.filter((t) => t.referenceType === "sale");
    const bottlesDelivered = saleTxns.filter((t) => t.type === "out").reduce((s, t) => s + t.quantity, 0);
    const bottlesSold = daySales.reduce((s, sale) => s + (sale.items as any[]).reduce((a: number, i: any) => a + i.quantity, 0), 0);

    // Payment breakdown
    const byPayment = {
      cash: 0, network: 0, transfer: 0, coupon: 0, credit: 0,
    };
    for (const s of daySales) {
      byPayment[s.paymentMethod as keyof typeof byPayment] =
        (byPayment[s.paymentMethod as keyof typeof byPayment] ?? 0) + parseFloat(s.grandTotal);
    }

    const totalSales = daySales.reduce((s, sale) => s + parseFloat(sale.grandTotal), 0);
    const totalCash = byPayment.cash + byPayment.network + byPayment.transfer;

    // Bottles returned (explicit returns stored in sales.bottlesReturned)
    const bottlesReturned = daySales.reduce((s, sale) => s + (sale.bottlesReturned ?? 0), 0);
    const deficit = bottlesDelivered - bottlesSold - bottlesReturned;

    res.json({
      date: today,
      repId: req.repId,
      ordersCount: daySales.length,
      bottlesDelivered,
      bottlesSold,
      bottlesReturned,
      deficit,
      totalSales,
      byPayment,
      totalCash,
      sales: daySales.map((s) => ({
        id: s.id,
        orderNumber: s.orderNumber,
        customerName: s.customerName,
        grandTotal: parseFloat(s.grandTotal),
        paymentMethod: s.paymentMethod,
        items: s.items,
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب بيانات التسليم" });
  }
});

export default router;
