import { Router } from "express";
import { db } from "@workspace/db";
import { expensesTable, treasuryTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const EXPENSE_CATEGORIES = [
  "إيجار المصنع",
  "رواتب الموظفين",
  "مواد خام",
  "مياه صالحة للشرب",
  "كيماويات",
  "صرف صحي",
  "كهرباء",
  "وقود",
  "صيانة",
  "أقساط",
  "إيجار سكن",
  "مصروفات أخرى",
];

const router = Router();

router.get("/expense-categories", async (req, res) => {
  return res.json(EXPENSE_CATEGORIES);
});

router.get("/expenses", async (req, res) => {
  try {
    const { from, to, category } = req.query as { from?: string; to?: string; category?: string };
    let expenses = await db.select().from(expensesTable).orderBy(expensesTable.date);
    if (from) expenses = expenses.filter((e) => e.date >= from);
    if (to) expenses = expenses.filter((e) => e.date <= to);
    if (category) expenses = expenses.filter((e) => e.category === category);
    return res.json(expenses.map((e) => ({ ...e, amount: parseFloat(e.amount), createdAt: e.createdAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في جلب المصروفات" });
  }
});

router.post("/expenses", async (req, res) => {
  try {
    const { date, category, description, amount, notes } = req.body;
    const [expense] = await db.insert(expensesTable).values({
      date, category, description, amount: String(amount), notes,
    }).returning();

    // Auto-deduct from treasury
    await db.insert(treasuryTransactionsTable).values({
      date,
      type: "out",
      amount: String(amount),
      description: `مصروف: ${description} (${category})`,
      source: "expense",
      reference: `EXP-${expense.id}`,
    });

    return res.status(201).json({ ...expense, amount: parseFloat(expense.amount), createdAt: expense.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في إضافة المصروف" });
  }
});

router.get("/expenses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [expense] = await db.select().from(expensesTable).where(eq(expensesTable.id, id));
    if (!expense) return res.status(404).json({ error: "المصروف غير موجود" });
    // تم تصحيح الكلمة هنا من e إلى expense
    return res.json({ ...expense, amount: parseFloat(expense.amount), createdAt: expense.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في جلب المصروف" });
  }
});

router.patch("/expenses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { date, category, description, amount, notes } = req.body;
    const updates: Record<string, unknown> = {};
    if (date !== undefined) updates.date = date;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (amount !== undefined) updates.amount = String(amount);
    if (notes !== undefined) updates.notes = notes;
    const [expense] = await db.update(expensesTable).set(updates).where(eq(expensesTable.id, id)).returning();
    if (!expense) return res.status(404).json({ error: "المصروف غير موجود" });
    return res.json({ ...expense, amount: parseFloat(expense.amount), createdAt: expense.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في تحديث المصروف" });
  }
});

router.delete("/expenses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(expensesTable).where(eq(expensesTable.id, id));
    return res.status(204).end();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في حذف المصروف" });
  }
});

export default router;