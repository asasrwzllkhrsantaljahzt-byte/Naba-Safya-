import { Router } from "express";
import { db } from "@workspace/db";
import { costCentersTable, costCenterExpensesTable, treasuryTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/cost-centers", async (req, res) => {
  try {
    const centers = await db.select().from(costCentersTable).orderBy(costCentersTable.name);
    const expenses = await db.select().from(costCenterExpensesTable);
    const result = centers.map(c => ({
      ...c,
      budget: parseFloat(c.budget ?? "0"),
      createdAt: c.createdAt.toISOString(),
      totalSpent: expenses.filter(e => e.costCenterId === c.id).reduce((s, e) => s + parseFloat(e.amount), 0),
    }));
    res.json(result);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في جلب مراكز التكلفة" }); }
});

router.post("/cost-centers", async (req, res) => {
  try {
    const { name, description, budget, notes } = req.body;
    const [center] = await db.insert(costCentersTable).values({ name, description, budget: String(budget ?? 0), notes }).returning();
    res.status(201).json({ ...center, budget: parseFloat(center.budget ?? "0"), createdAt: center.createdAt.toISOString(), totalSpent: 0 });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في إضافة مركز التكلفة" }); }
});

router.delete("/cost-centers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(costCentersTable).where(eq(costCentersTable.id, id));
    res.status(204).end();
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في حذف مركز التكلفة" }); }
});

router.get("/cost-centers/:id/expenses", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const expenses = await db.select().from(costCenterExpensesTable).where(eq(costCenterExpensesTable.costCenterId, id));
    res.json(expenses.map(e => ({ ...e, amount: parseFloat(e.amount), createdAt: e.createdAt.toISOString() })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في جلب مصروفات مركز التكلفة" }); }
});

router.post("/cost-centers/:id/expenses", async (req, res) => {
  try {
    const costCenterId = parseInt(req.params.id);
    const [center] = await db.select().from(costCentersTable).where(eq(costCentersTable.id, costCenterId));
    if (!center) return res.status(404).json({ error: "مركز التكلفة غير موجود" });
    const { date, category, description, amount, notes } = req.body;
    const [expense] = await db.insert(costCenterExpensesTable).values({
      costCenterId, costCenterName: center.name, date, category, description, amount: String(amount), notes,
    }).returning();
    // Auto deduct from treasury
    await db.insert(treasuryTransactionsTable).values({
      date, type: "out", amount: String(amount),
      description: `مصروف [${center.name}]: ${description}`,
      source: "expense", reference: `CCE-${expense.id}`,
    });
    res.status(201).json({ ...expense, amount: parseFloat(expense.amount), createdAt: expense.createdAt.toISOString() });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في إضافة المصروف" }); }
});

export default router;
