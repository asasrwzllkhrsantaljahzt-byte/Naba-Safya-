import { Router } from "express";
import { db } from "@workspace/db";
import { journalEntriesTable, journalLinesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// جلب كل القيود
router.get("/journal", async (req, res) => {
  try {
    const entries = await db.select().from(journalEntriesTable)
      .orderBy(journalEntriesTable.createdAt);
    const lines = await db.select().from(journalLinesTable);
    const result = entries.map(e => ({
      ...e,
      lines: lines.filter(l => l.entryId === e.id),
    }));
    return res.json(result);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في جلب القيود" });
  }
});

// جلب قيد واحد
router.get("/journal/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [entry] = await db.select().from(journalEntriesTable)
      .where(eq(journalEntriesTable.id, id));
    if (!entry) return res.status(404).json({ error: "القيد غير موجود" });
    const lines = await db.select().from(journalLinesTable)
      .where(eq(journalLinesTable.entryId, id));
    return res.json({ ...entry, lines });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في جلب القيد" });
  }
});

// إضافة قيد جديد
router.post("/journal", async (req, res) => {
  try {
    const { date, description, reference, lines } = req.body;

    if (!lines || lines.length < 2) {
      return res.status(400).json({ error: "يجب إدخال حسابين على الأقل" });
    }

    const totalDebit = lines.reduce((s: number, l: any) => s + (parseFloat(l.debit) || 0), 0);
    const totalCredit = lines.reduce((s: number, l: any) => s + (parseFloat(l.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001 || totalDebit === 0) {
      return res.status(400).json({ error: "القيد غير متزن" });
    }

    // توليد رقم القيد تلقائياً
    const allEntries = await db.select().from(journalEntriesTable);
    const entryNumber = `JV-${String(allEntries.length + 1).padStart(4, "0")}`;

    const [entry] = await db.insert(journalEntriesTable).values({
      entryNumber,
      date,
      description,
      source: "manual",
      referenceType: reference || null,
    }).returning();

    await db.insert(journalLinesTable).values(
      lines.map((l: any) => ({
        entryId: entry.id,
        accountId: parseInt(l.accountId),
        accountName: l.accountName,
        accountCode: l.accountCode,
        debit: String(parseFloat(l.debit) || 0),
        credit: String(parseFloat(l.credit) || 0),
        notes: l.notes || null,
      }))
    );

    const savedLines = await db.select().from(journalLinesTable)
      .where(eq(journalLinesTable.entryId, entry.id));

    return res.status(201).json({ ...entry, lines: savedLines });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في حفظ القيد" });
  }
});

// حذف قيد
router.delete("/journal/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(journalLinesTable).where(eq(journalLinesTable.entryId, id));
    await db.delete(journalEntriesTable).where(eq(journalEntriesTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في حذف القيد" });
  }
});

export default router;