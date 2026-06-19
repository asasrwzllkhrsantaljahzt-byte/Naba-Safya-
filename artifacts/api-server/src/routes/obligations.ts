import { Router } from "express";
import { db } from "@workspace/db";
import { obligationsTable, treasuryTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function fmt(o: typeof obligationsTable.$inferSelect) {
  return {
    ...o,
    amount: parseFloat(o.amount),
    paidAmount: parseFloat(o.paidAmount ?? "0"),
    remaining: parseFloat(o.amount) - parseFloat(o.paidAmount ?? "0"),
    createdAt: o.createdAt.toISOString(),
  };
}

router.get("/obligations", async (req, res) => {
  try {
    const { status, type } = req.query as { status?: string; type?: string };
    let records = await db.select().from(obligationsTable).orderBy(obligationsTable.dueDate);
    if (status) records = records.filter(r => r.status === status);
    if (type) records = records.filter(r => r.type === type);
    const total = records.reduce((s, r) => s + parseFloat(r.amount), 0);
    const paid = records.reduce((s, r) => s + parseFloat(r.paidAmount ?? "0"), 0);
    res.json({ records: records.map(fmt), total, paid, remaining: total - paid });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في جلب الالتزامات" }); }
});

router.post("/obligations", async (req, res) => {
  try {
    const { date, dueDate, type, description, partyName, amount, notes } = req.body;
    const [record] = await db.insert(obligationsTable).values({
      date, dueDate, type: type ?? "other", description, partyName,
      amount: String(amount), paidAmount: "0", status: "pending", notes,
    }).returning();
    res.status(201).json(fmt(record));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في إضافة الالتزام" }); }
});

// General edit for an obligation
router.patch("/obligations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { date, dueDate, type, description, partyName, amount, notes } = req.body;
    const updates: any = {};
    if (date !== undefined) updates.date = date;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (type !== undefined) updates.type = type;
    if (description !== undefined) updates.description = description;
    if (partyName !== undefined) updates.partyName = partyName;
    if (amount !== undefined) updates.amount = String(amount);
    if (notes !== undefined) updates.notes = notes;
    const [record] = await db.update(obligationsTable).set(updates).where(eq(obligationsTable.id, id)).returning();
    if (!record) return res.status(404).json({ error: "الالتزام غير موجود" });
    res.json(fmt(record));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في تحديث الالتزام" }); }
});

// Pay an obligation (full or partial)
router.patch("/obligations/:id/pay", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { payAmount, date } = req.body;
    const [record] = await db.select().from(obligationsTable).where(eq(obligationsTable.id, id));
    if (!record) return res.status(404).json({ error: "الالتزام غير موجود" });

    const total = parseFloat(record.amount);
    const alreadyPaid = parseFloat(record.paidAmount ?? "0");
    const paying = parseFloat(payAmount);
    const newPaid = Math.min(total, alreadyPaid + paying);
    const newStatus = newPaid >= total ? "paid" : "partial";

    const [updated] = await db.update(obligationsTable).set({
      paidAmount: String(newPaid.toFixed(2)),
      status: newStatus,
    }).where(eq(obligationsTable.id, id)).returning();

    // Deduct from treasury
    const payDate = date ?? new Date().toISOString().split("T")[0];
    await db.insert(treasuryTransactionsTable).values({
      date: payDate, type: "out", amount: String(paying.toFixed(2)),
      description: `سداد التزام: ${record.description}`,
      source: "obligation", reference: `OBL-${record.id}`,
      relatedPartyName: record.partyName ?? undefined,
    });

    res.json(fmt(updated));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في سداد الالتزام" }); }
});

router.delete("/obligations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(obligationsTable).where(eq(obligationsTable.id, id));
    res.status(204).end();
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في حذف الالتزام" }); }
});

export default router;
