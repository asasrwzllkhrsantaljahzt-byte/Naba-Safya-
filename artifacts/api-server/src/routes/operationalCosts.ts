import { Router } from "express";
import { db } from "@workspace/db";
import { operationalCostsTable, salesTable, inventoryTransactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

const CATEGORY_LABELS: Record<string, string> = {
  chemicals: "كيميكال",
  water_returns: "ردود مياه",
  rent: "إيجار",
  electricity: "كهرباء",
  salaries: "رواتب",
  maintenance: "صيانة",
  fuel: "وقود",
  packaging: "تغليف وعبوات",
  other: "أخرى",
};

router.get("/operational-costs", async (req, res) => {
  try {
    const { month } = req.query as { month?: string };
    let costs = await db.select().from(operationalCostsTable).orderBy(desc(operationalCostsTable.createdAt));
    if (month) costs = costs.filter((c) => c.month === month);
    res.json(costs.map((c) => ({ ...c, amount: parseFloat(c.amount), createdAt: c.createdAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب التكاليف" });
  }
});

router.post("/operational-costs", async (req, res) => {
  try {
    const { date, month, category, description, amount, notes } = req.body;
    const [cost] = await db.insert(operationalCostsTable).values({
      date, month: month || date.slice(0, 7), category, description,
      amount: String(amount), notes,
    }).returning();
    res.status(201).json({ ...cost, amount: parseFloat(cost.amount), createdAt: cost.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في إضافة التكلفة" });
  }
});

router.delete("/operational-costs/:id", async (req, res) => {
  try {
    await db.delete(operationalCostsTable).where(eq(operationalCostsTable.id, parseInt(req.params.id)));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في حذف التكلفة" });
  }
});

// Per-bottle cost analysis
router.get("/operational-costs/analysis", async (req, res) => {
  try {
    const { month } = req.query as { month?: string };

    let costs = await db.select().from(operationalCostsTable);
    if (month) costs = costs.filter((c) => c.month === month);

    const totalCost = costs.reduce((s, c) => s + parseFloat(c.amount), 0);

    // By category
    const byCategory: Record<string, number> = {};
    for (const c of costs) {
      byCategory[c.category] = (byCategory[c.category] ?? 0) + parseFloat(c.amount);
    }

    // Bottles produced this month (inventory IN from purchases)
    let txns = await db.select().from(inventoryTransactionsTable);
    if (month) txns = txns.filter((t) => t.date.startsWith(month));
    const bottlesProduced = txns.filter((t) => t.type === "in" && t.referenceType === "purchase").reduce((s, t) => s + t.quantity, 0);
    const bottlesSold = txns.filter((t) => t.type === "out" && t.referenceType === "sale").reduce((s, t) => s + t.quantity, 0);

    // Revenue
    let sales = await db.select().from(salesTable);
    if (month) sales = sales.filter((s) => s.date.startsWith(month));
    const revenue = sales.reduce((s, sale) => s + parseFloat(sale.grandTotal), 0);
    const avgPrice = bottlesSold > 0 ? revenue / bottlesSold : 0;
    const costPerBottle = bottlesProduced > 0 ? totalCost / bottlesProduced : 0;
    const profitPerBottle = avgPrice - costPerBottle;
    const grossProfit = revenue - totalCost;

    res.json({
      totalCost,
      byCategory: Object.entries(byCategory).map(([cat, amt]) => ({
        category: cat,
        label: CATEGORY_LABELS[cat] ?? cat,
        amount: amt,
        percentage: totalCost > 0 ? ((amt / totalCost) * 100).toFixed(1) : "0",
      })),
      bottlesProduced,
      bottlesSold,
      revenue,
      avgPrice: parseFloat(avgPrice.toFixed(2)),
      costPerBottle: parseFloat(costPerBottle.toFixed(2)),
      profitPerBottle: parseFloat(profitPerBottle.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2)),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب تحليل التكاليف" });
  }
});

export default router;
