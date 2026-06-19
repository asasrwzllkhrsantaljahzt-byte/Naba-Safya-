import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, couponBooksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const formatCustomer = async (c: typeof customersTable.$inferSelect) => {
  const books = await db.select().from(couponBooksTable).where(eq(couponBooksTable.customerId, c.id));
  return {
    ...c,
    createdAt: c.createdAt.toISOString(),
    totalCouponBooks: books.length,
    remainingCoupons: books.reduce((sum, b) => sum + parseFloat(b.remainingValue), 0),
  };
};

router.get("/customers", async (req, res) => {
  try {
    const { search, repId } = req.query as { search?: string; repId?: string };
    let customers = await db.select().from(customersTable);
    if (search) {
      customers = customers.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search))
      );
    }
    if (repId) customers = customers.filter((c) => c.repId === parseInt(repId));

    const books = await db.select().from(couponBooksTable);
    const result = customers.map((c) => {
      const cBooks = books.filter((b) => b.customerId === c.id);
      return {
        ...c,
        createdAt: c.createdAt.toISOString(),
        totalCouponBooks: cBooks.length,
        remainingCoupons: cBooks.reduce((sum, b) => sum + parseFloat(b.remainingValue), 0),
      };
    });
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب العملاء" });
  }
});

router.post("/customers", async (req, res) => {
  try {
    const { name, phone, area, notes, repId, repName, bottleBalance, lastVisitDate } = req.body;
    const [customer] = await db.insert(customersTable).values({
      name, phone, area, notes,
      repId: repId ?? null,
      repName: repName ?? null,
      bottleBalance: bottleBalance ?? 0,
      lastVisitDate: lastVisitDate ?? null,
    }).returning();
    res.status(201).json({ ...customer, createdAt: customer.createdAt.toISOString(), totalCouponBooks: 0, remainingCoupons: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في إضافة العميل" });
  }
});

router.get("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
    if (!customer) return res.status(404).json({ error: "العميل غير موجود" });
    res.json(await formatCustomer(customer));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب العميل" });
  }
});

router.patch("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, phone, area, notes, repId, repName, bottleBalance, lastVisitDate } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (area !== undefined) updates.area = area;
    if (notes !== undefined) updates.notes = notes;
    if (repId !== undefined) updates.repId = repId;
    if (repName !== undefined) updates.repName = repName;
    if (bottleBalance !== undefined) updates.bottleBalance = bottleBalance;
    if (lastVisitDate !== undefined) updates.lastVisitDate = lastVisitDate;
    const [customer] = await db.update(customersTable).set(updates).where(eq(customersTable.id, id)).returning();
    if (!customer) return res.status(404).json({ error: "العميل غير موجود" });
    res.json(await formatCustomer(customer));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في تحديث العميل" });
  }
});

router.delete("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(customersTable).where(eq(customersTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في حذف العميل" });
  }
});

router.get("/customers/:id/coupon-books", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const books = await db.select().from(couponBooksTable).where(eq(couponBooksTable.customerId, id));
    res.json(books.map((b) => ({
      ...b,
      totalValue: parseFloat(b.totalValue),
      remainingValue: parseFloat(b.remainingValue),
      issuedAt: b.issuedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب دفاتر الكوبونات" });
  }
});

router.post("/customers/:id/coupon-books", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const { bookNumber, totalValue, notes } = req.body;
    const [book] = await db.insert(couponBooksTable).values({
      customerId, bookNumber,
      totalValue: String(totalValue),
      remainingValue: String(totalValue),
      notes,
    }).returning();
    res.status(201).json({
      ...book,
      totalValue: parseFloat(book.totalValue),
      remainingValue: parseFloat(book.remainingValue),
      issuedAt: book.issuedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في إضافة دفتر الكوبونات" });
  }
});

export default router;
