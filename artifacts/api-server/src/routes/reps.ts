import { Router } from "express";
import { db } from "@workspace/db";
import { repsTable, salesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/reps", async (req, res) => {
  try {
    const reps = await db.select().from(repsTable);
    const sales = await db.select().from(salesTable);
    const result = reps.map((r) => {
      const repSales = sales.filter((s) => s.repId === r.id);
      const totalSales = repSales.reduce((sum, s) => sum + parseFloat(s.grandTotal), 0);
      const totalCollections = repSales
        .filter((s) => s.paymentMethod === "cash" || s.paymentMethod === "network")
        .reduce((sum, s) => sum + parseFloat(s.grandTotal), 0);
      return {
        ...r,
        createdAt: r.createdAt.toISOString(),
        totalSales,
        totalCollections,
      };
    });
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب المندوبين" });
  }
});

router.post("/reps", async (req, res) => {
  try {
    const { name, phone, area } = req.body;
    const [rep] = await db.insert(repsTable).values({ name, phone, area }).returning();
    res.status(201).json({ ...rep, createdAt: rep.createdAt.toISOString(), totalSales: 0, totalCollections: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في إضافة المندوب" });
  }
});

router.get("/reps/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [rep] = await db.select().from(repsTable).where(eq(repsTable.id, id));
    if (!rep) return res.status(404).json({ error: "المندوب غير موجود" });
    const sales = await db.select().from(salesTable).where(eq(salesTable.repId, id));
    const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.grandTotal), 0);
    const totalCollections = sales
      .filter((s) => s.paymentMethod === "cash" || s.paymentMethod === "network")
      .reduce((sum, s) => sum + parseFloat(s.grandTotal), 0);
    res.json({ ...rep, createdAt: rep.createdAt.toISOString(), totalSales, totalCollections });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب المندوب" });
  }
});

router.patch("/reps/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, phone, area, isActive } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (area !== undefined) updates.area = area;
    if (isActive !== undefined) updates.isActive = isActive;
    const [rep] = await db.update(repsTable).set(updates).where(eq(repsTable.id, id)).returning();
    if (!rep) return res.status(404).json({ error: "المندوب غير موجود" });
    res.json({ ...rep, createdAt: rep.createdAt.toISOString(), totalSales: 0, totalCollections: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في تحديث المندوب" });
  }
});

router.delete("/reps/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(repsTable).where(eq(repsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في حذف المندوب" });
  }
});

export default router;
