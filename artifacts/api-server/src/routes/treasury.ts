import { Router } from "express";
import { db } from "@workspace/db";
import { treasuryTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/treasury", async (req, res) => {
  try {
    const transactions = await db.select().from(treasuryTransactionsTable);
    let totalIn = 0;
    let totalOut = 0;
    for (const t of transactions) {
      if (t.type === "in") totalIn += parseFloat(t.amount);
      else totalOut += parseFloat(t.amount);
    }
    res.json({ balance: totalIn - totalOut, totalIn, totalOut });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب بيانات الخزينة" });
  }
});

router.get("/treasury/transactions", async (req, res) => {
  try {
    const { from, to, type } = req.query as { from?: string; to?: string; type?: string };
    let transactions = await db.select().from(treasuryTransactionsTable).orderBy(treasuryTransactionsTable.date);
    if (from) transactions = transactions.filter((t) => t.date >= from);
    if (to) transactions = transactions.filter((t) => t.date <= to);
    if (type) transactions = transactions.filter((t) => t.type === type);
    res.json(transactions.map((t) => ({ ...t, amount: parseFloat(t.amount), createdAt: t.createdAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب حركات الخزينة" });
  }
});

router.post("/treasury/transactions", async (req, res) => {
  try {
    const { date, type, amount, description, notes } = req.body;
    const [transaction] = await db.insert(treasuryTransactionsTable).values({
      date, type, amount: String(amount), description, source: "manual", reference: notes,
    }).returning();
    res.status(201).json({ ...transaction, amount: parseFloat(transaction.amount), createdAt: transaction.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في إضافة الحركة" });
  }
});

export default router;
