import { Router } from "express";
import { db } from "@workspace/db";
import { inventoryTable, inventoryTransactionsTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { desc } from "drizzle-orm";

const router = Router();

router.get("/inventory", async (req, res) => {
  try {
    const inventoryRows = await db.select().from(inventoryTable);
    const products = await db.select().from(productsTable);

    const items = products.map((p) => {
      const inv = inventoryRows.find((i) => i.productId === p.id);
      return {
        productId: p.id,
        productName: p.name,
        color: p.color,
        quantity: inv?.quantity ?? 0,
      };
    });

    res.json({ items, lastUpdated: new Date().toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب بيانات المخزن" });
  }
});

router.get("/inventory/transactions", async (req, res) => {
  try {
    const { from, to, type, refType } = req.query as { from?: string; to?: string; type?: string; refType?: string };
    let transactions = await db.select().from(inventoryTransactionsTable).orderBy(desc(inventoryTransactionsTable.createdAt));
    if (from) transactions = transactions.filter((t) => t.date >= from);
    if (to) transactions = transactions.filter((t) => t.date <= to);
    if (type) transactions = transactions.filter((t) => t.type === type);
    if (refType) transactions = transactions.filter((t) => t.referenceType === refType);
    res.json(transactions.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب حركات المخزن" });
  }
});

router.post("/inventory/vouchers", async (req, res) => {
  try {
    const { date, type, productId, quantity, reference, notes } = req.body;
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
    
    // FIX: Separated the response from the return statement
    if (!product) {
      res.status(400).json({ error: "المنتج غير موجود" });
      return;
    }

    const [existing] = await db.select().from(inventoryTable).where(eq(inventoryTable.productId, productId));
    if (type === "in") {
      if (existing) {
        await db.update(inventoryTable).set({ quantity: existing.quantity + quantity }).where(eq(inventoryTable.productId, productId));
      } else {
        await db.insert(inventoryTable).values({ productId, quantity });
      }
    } else if (type === "out") {
      if (existing) {
        await db.update(inventoryTable).set({ quantity: Math.max(0, existing.quantity - quantity) }).where(eq(inventoryTable.productId, productId));
      }
    }

    const [txn] = await db.insert(inventoryTransactionsTable).values({
      date, type, productId,
      productName: product.name,
      quantity,
      reference: reference ?? `VCH-${Date.now()}`,
      referenceType: "voucher",
      notes,
    }).returning();

    res.status(201).json({ ...txn, createdAt: txn.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في إضافة سند المخزن" });
  }
});

router.delete("/inventory/transactions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [txn] = await db.select().from(inventoryTransactionsTable).where(eq(inventoryTransactionsTable.id, id));
    
    // FIX: Separated the response from the return statement
    if (!txn) {
      res.status(404).json({ error: "السند غير موجود" });
      return;
    }

    if (txn.referenceType === "voucher") {
      const [existing] = await db.select().from(inventoryTable).where(eq(inventoryTable.productId, txn.productId));
      if (existing) {
        if (txn.type === "in") {
          await db.update(inventoryTable).set({ quantity: Math.max(0, existing.quantity - txn.quantity) }).where(eq(inventoryTable.productId, txn.productId));
        } else {
          await db.update(inventoryTable).set({ quantity: existing.quantity + txn.quantity }).where(eq(inventoryTable.productId, txn.productId));
        }
      }
    }

    await db.delete(inventoryTransactionsTable).where(eq(inventoryTransactionsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في حذف السند" });
  }
});

export default router;