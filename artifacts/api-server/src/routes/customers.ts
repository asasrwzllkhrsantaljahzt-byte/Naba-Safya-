import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, couponBooksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function formatCustomer(c: any, books: any[]): any {
  const cBooks = books.filter((b) => b.customerId === c.id);
  return {
    ...c,
    createdAt: c.createdAt?.toISOString?.() ?? (typeof c.createdAt === 'string' ? c.createdAt : null),
    totalCouponBooks: cBooks.length,
    remainingCoupons: cBooks.reduce(
      (sum, b) => sum + Number(b.remainingValue || 0),
      0
    ),
  };
}

router.get("/customers", async (req, res): Promise<any> => {
  try {
    const { search, repId } = req.query as { search?: string; repId?: string };
    let customers = await db.select().from(customersTable);
    const books = await db.select().from(couponBooksTable);
    if (search) {
      const searchLower = search.toLowerCase();
      customers = customers.filter((c: any) =>
        c.name?.toLowerCase().includes(searchLower) || c.phone?.includes(search)
      );
    }
    if (repId) {
      customers = customers.filter((c: any) => c.repId === parseInt(repId));
    }
    return res.json(customers.map((c: any) => formatCustomer(c, books)));
  } catch (err) {
    console.error("خطأ في جلب العملاء:", err);
    return res.status(500).json({ error: "فشل تحميل العملاء" });
  }
});

router.post("/customers", async (req, res): Promise<any> => {
  try {
    const { name, phone, area, notes, repId, repName, bottleBalance, lastVisitDate } = req.body;
    const [customer] = await db.insert(customersTable).values({
      name, phone, area, notes,
      repId: repId ?? null,
      repName: repName ?? null,
      bottleBalance: bottleBalance ?? 0,
      lastVisitDate: lastVisitDate ?? null,
    }).returning();
    return res.status(201).json({
      ...customer,
      createdAt: customer.createdAt?.toISOString?.() ?? null,
      totalCouponBooks: 0,
      remainingCoupons: 0,
    });
  } catch (err) {
    console.error("خطأ في إضافة عميل:", err);
    return res.status(500).json({ error: "فشل إضافة العميل" });
  }
});

router.get("/customers/:id", async (req, res): Promise<any> => {
  try {
    const id = parseInt(req.params.id);
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
    if (!customer) return res.status(404).json({ error: "العميل غير موجود" });
    const books = await db.select().from(couponBooksTable);
    return res.json(formatCustomer(customer, books));
  } catch (err) {
    console.error("خطأ في جلب العميل:", err);
    return res.status(500).json({ error: "فشل جلب العميل" });
  }
});

router.patch("/customers/:id", async (req, res): Promise<any> => {
  try {
    const id = parseInt(req.params.id);
    const updates: Record<string, unknown> = {};
    const fields = ["name", "phone", "area", "notes", "repId", "repName", "bottleBalance", "lastVisitDate"];
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    const [customer] = await db.update(customersTable).set(updates).where(eq(customersTable.id, id)).returning();
    if (!customer) return res.status(404).json({ error: "العميل غير موجود" });
    return res.json(customer);
  } catch (err) {
    console.error("خطأ في تعديل العميل:", err);
    return res.status(500).json({ error: "فشل تعديل العميل" });
  }
});

router.delete("/customers/:id", async (req, res): Promise<any> => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(customersTable).where(eq(customersTable.id, id));
    return res.status(204).end();
  } catch (err) {
    console.error("خطأ في حذف العميل:", err);
    return res.status(500).json({ error: "فشل حذف العميل" });
  }
});

export default router;