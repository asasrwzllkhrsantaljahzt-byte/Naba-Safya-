import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/products", async (req, res) => {
  try {
    const products = await db.select().from(productsTable);
    const result = products.map((p) => ({
      ...p,
      unitPrice: parseFloat(p.unitPrice),
      vatRate: parseFloat(p.vatRate),
    }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب المنتجات" });
  }
});

router.post("/products", async (req, res) => {
  try {
    const { name, color, unitPrice, vatRate, description } = req.body;
    const [product] = await db
      .insert(productsTable)
      .values({ name, color, unitPrice: String(unitPrice), vatRate: String(vatRate ?? 15), description })
      .returning();
    res.status(201).json({ ...product, unitPrice: parseFloat(product.unitPrice), vatRate: parseFloat(product.vatRate) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في إضافة المنتج" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) return res.status(404).json({ error: "المنتج غير موجود" });
    res.json({ ...product, unitPrice: parseFloat(product.unitPrice), vatRate: parseFloat(product.vatRate) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب المنتج" });
  }
});

router.patch("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, unitPrice, vatRate, description } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (unitPrice !== undefined) updates.unitPrice = String(unitPrice);
    if (vatRate !== undefined) updates.vatRate = String(vatRate);
    if (description !== undefined) updates.description = description;
    const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
    if (!product) return res.status(404).json({ error: "المنتج غير موجود" });
    res.json({ ...product, unitPrice: parseFloat(product.unitPrice), vatRate: parseFloat(product.vatRate) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في تحديث المنتج" });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deleted] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "المنتج غير موجود" });
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في حذف المنتج" });
  }
});

export default router;
