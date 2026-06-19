import { Router } from "express";
import { db } from "@workspace/db";
import { repCustodyTable, repsTable, treasuryTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function fmt(r: typeof repCustodyTable.$inferSelect) {
  return { ...r, amount: parseFloat(r.amount), createdAt: r.createdAt.toISOString() };
}

router.get("/rep-custody", async (req, res) => {
  try {
    const { repId } = req.query as { repId?: string };
    let records = await db.select().from(repCustodyTable).orderBy(repCustodyTable.date);
    if (repId) records = records.filter(r => r.repId === parseInt(repId));

    const reps = await db.select().from(repsTable);
    const summary = reps.map(rep => {
      const repRecords = records.filter(r => r.repId === rep.id);
      const given = repRecords.filter(r => r.type === "give").reduce((s, r) => s + parseFloat(r.amount), 0);
      const received = repRecords.filter(r => r.type === "receive").reduce((s, r) => s + parseFloat(r.amount), 0);
      return { repId: rep.id, repName: rep.name, given, received, balance: given - received };
    });

    res.json({ records: records.map(fmt), summary });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في جلب العهد" }); }
});

router.post("/rep-custody", async (req, res) => {
  try {
    const { repId, date, type, description, amount, notes } = req.body;
    const [rep] = await db.select().from(repsTable).where(eq(repsTable.id, repId));
    if (!rep) return res.status(400).json({ error: "المندوب غير موجود" });
    const [record] = await db.insert(repCustodyTable).values({
      repId, repName: rep.name, date, type, description, amount: String(amount), notes,
    }).returning();
    // If giving custody, deduct from treasury
    if (type === "give") {
      await db.insert(treasuryTransactionsTable).values({
        date, type: "out", amount: String(amount),
        description: `عهدة مندوب: ${rep.name} - ${description}`,
        source: "manual", reference: `CUS-${record.id}`,
        relatedPartyName: rep.name,
      });
    }
    res.status(201).json(fmt(record));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في إضافة العهدة" }); }
});

router.delete("/rep-custody/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(repCustodyTable).where(eq(repCustodyTable.id, id));
    res.status(204).end();
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في حذف العهدة" }); }
});

export default router;
