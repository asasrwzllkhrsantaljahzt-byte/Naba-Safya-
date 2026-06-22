import { Router } from "express";
import { db } from "@workspace/db";
import { suppliersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET all suppliers
router.get("/suppliers", async (req, res): Promise<any> => {
  try {
    const suppliers = await db
      .select()
      .from(suppliersTable)
      .orderBy(suppliersTable.name);

    // تم تعديل الـ map وإضافة return صريحة لتفادي خطأ ts(7030)
    const result = suppliers.map((s) => {
      return {
        ...s,
        createdAt: s.createdAt?.toISOString?.() ?? null,
      };
    });

    return res.json(result);
  } catch (err) {
    req.log.error(err);
    // تم استبدال المصفوفة الفارغة برسالة خطأ صريحة لحماية الفرونت إند من الشاشة البيضاء
    return res.status(500).json({ error: "فشل في جلب قائمة الموردين" });
  }
});

// CREATE supplier
router.post("/suppliers", async (req, res): Promise<any> => {
  try {
    const { name, phone, area, notes } = req.body;

    const [supplier] = await db
      .insert(suppliersTable)
      .values({ name, phone, area, notes })
      .returning();

    return res.status(201).json({
      ...supplier,
      createdAt: supplier.createdAt?.toISOString?.() ?? null,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في إضافة المورد" });
  }
});

// UPDATE supplier
router.patch("/suppliers/:id", async (req, res): Promise<any> => {
  try {
    const id = parseInt(req.params.id);
    const { name, phone, area, notes } = req.body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (area !== undefined) updates.area = area;
    if (notes !== undefined) updates.notes = notes;

    const [supplier] = await db
      .update(suppliersTable)
      .set(updates)
      .where(eq(suppliersTable.id, id))
      .returning();

    if (!supplier) {
      return res.status(404).json({ error: "المورد غير موجود" });
    }

    return res.json({
      ...supplier,
      createdAt: supplier.createdAt?.toISOString?.() ?? null,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في تحديث المورد" });
  }
});

// DELETE supplier
router.delete("/suppliers/:id", async (req, res): Promise<any> => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
    return res.status(204).end();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في حذف المورد" });
  }
});

export default router;