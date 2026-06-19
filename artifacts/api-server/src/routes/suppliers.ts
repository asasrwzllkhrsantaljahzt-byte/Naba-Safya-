import { Router } from "express";
import { db } from "@workspace/db";
import { suppliersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/suppliers", async (req, res) => {
  try {
    const suppliers = await db.select().from(suppliersTable).orderBy(suppliersTable.name);
    res.json(suppliers.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في جلب الموردين" }); }
});

router.post("/suppliers", async (req, res) => {
  try {
    const { name, phone, area, notes } = req.body;
    const [supplier] = await db.insert(suppliersTable).values({ name, phone, area, notes }).returning();
    res.status(201).json({ ...supplier, createdAt: supplier.createdAt.toISOString() });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في إضافة المورد" }); }
});

router.patch("/suppliers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, phone, area, notes } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (area !== undefined) updates.area = area;
    if (notes !== undefined) updates.notes = notes;
    const [supplier] = await db.update(suppliersTable).set(updates).where(eq(suppliersTable.id, id)).returning();
    if (!supplier) return res.status(404).json({ error: "المورد غير موجود" });
    res.json({ ...supplier, createdAt: supplier.createdAt.toISOString() });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في تحديث المورد" }); }
});

router.delete("/suppliers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
    res.status(204).end();
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في حذف المورد" }); }
});

export default router;
