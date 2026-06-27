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

router.patch("/operational-costs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { date, month, category, description, amount, notes } = req.body;
    const updates: any = {};
    if (date !== undefined) updates.date = date;
    if (month !== undefined) updates.month = month;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (amount !== undefined) updates.amount = String(amount);
    if (notes !== undefined) updates.notes = notes;
    const [cost] = await db.update(operationalCostsTable).set(updates).where(eq(operationalCostsTable.id, id)).returning();
    
    // التعديل هنا لحل مشكلة ts(7030)
    if (!cost) {
      res.status(404).json({ error: "التكلفة غير موجودة" });
      return;
    }
    
    res.json({ ...cost, amount: parseFloat(cost.amount), createdAt: cost.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في تحديث التكلفة" });
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

router.get("/operational-costs/analysis", async (req, res) => {
  try {
    const { month } = req.query as { month?: string };
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const costs = await db.select().from(operationalCostsTable);
    const monthlyCosts = costs.filter((c) => c.month === targetMonth);
    const totalCost = monthlyCosts.reduce((s, c) => s + parseFloat(c.amount), 0);

    const sales = await db.select().from(salesTable);
    const monthlySales = sales.filter((s) => s.date.startsWith(targetMonth));
    const totalRevenue = monthlySales.reduce((s, sale) => s + parseFloat(sale.grandTotal), 0);
    const totalBottles = monthlySales.reduce((s, sale) => {
      const items = sale.items as Array<{ quantity: number }>;
      return s + items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);

    const transactions = await db.select().from(inventoryTransactionsTable);
    const monthlyIn = transactions.filter((t) => t.type === "in" && t.date.startsWith(targetMonth));
    const bottlesProduced = monthlyIn.reduce((s, t) => s + t.quantity, 0);

    const costPerBottle = bottlesProduced > 0 ? totalCost / bottlesProduced : 0;
    const revenuePerBottle = totalBottles > 0 ? totalRevenue / totalBottles : 0;
    const profitPerBottle = revenuePerBottle - costPerBottle;
    const grossProfit = totalRevenue - totalCost;

    const byCategory = Object.entries(
      monthlyCosts.reduce((acc, c) => {
        const key = c.category;
        acc[key] = (acc[key] || 0) + parseFloat(c.amount);
        return acc;
      }, {} as Record<string, number>)
    ).map(([category, amount]) => ({
      category,
      label: CATEGORY_LABELS[category] || category,
      amount,
      pct: totalCost > 0 ? Math.round((amount / totalCost) * 100) : 0,
    }));

    res.json({
      month: targetMonth,
      totalCost,
      totalRevenue,
      grossProfit,
      bottlesProduced,
      totalBottlesSold: totalBottles,
      costPerBottle: parseFloat(costPerBottle.toFixed(4)),
      revenuePerBottle: parseFloat(revenuePerBottle.toFixed(4)),
      profitPerBottle: parseFloat(profitPerBottle.toFixed(4)),
      byCategory,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب تحليل التكاليف" });
  }
});

export default router;