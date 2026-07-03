import { Router } from "express";
import { db } from "@workspace/db";
import { warehousesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/warehouses", async (req, res) => {
  try {
    const warehouses = await db.select().from(warehousesTable).orderBy(warehousesTable.id);
    return res.json(warehouses);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في جلب المخازن" });
  }
});

router.post("/warehouses", async (req, res) => {
  try {
    const { name, type, description } = req.body;
    const [warehouse] = await db.insert(warehousesTable).values({ name, type: type ?? "general", description }).returning();
    return res.status(201).json(warehouse);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في إضافة المخزن" });
  }
});

router.patch("/warehouses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, type, description, isActive } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.isActive = isActive;
    const [warehouse] = await db.update(warehousesTable).set(updates).where(eq(warehousesTable.id, id)).returning();
    if (!warehouse) return res.status(404).json({ error: "المخزن غير موجود" });
    return res.json(warehouse);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في تعديل المخزن" });
  }
});

router.delete("/warehouses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(warehousesTable).where(eq(warehousesTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في حذف المخزن" });
  }
});

export default router;
