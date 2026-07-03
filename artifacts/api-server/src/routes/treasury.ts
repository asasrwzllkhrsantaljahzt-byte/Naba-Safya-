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
    res.json(transactions.map((t) => ({
      ...t,
      amount: parseFloat(t.amount),
      vatAmount: t.vatAmount ? parseFloat(t.vatAmount) : null,
      createdAt: t.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب حركات الخزينة" });
  }
});

router.post("/treasury/transactions", async (req, res) => {
  try {
    const {
      date, type, amount, description,
      accountId, relatedPartyName, relatedAccountId,
      invoiceNumber, vatAmount, notes,
      repId, repName, receiverName, source,
    } = req.body;

    const [transaction] = await db.insert(treasuryTransactionsTable).values({
      date,
      type,
      amount: String(amount),
      description,
      source: source ?? "manual",
      reference: invoiceNumber ?? null,
      accountId: accountId ?? null,
      relatedPartyName: relatedPartyName ?? null,
      relatedAccountId: relatedAccountId ?? null,
      invoiceNumber: invoiceNumber ?? null,
      vatAmount: vatAmount ? String(vatAmount) : null,
      notes: notes ?? null,
      repName: repName ?? null,
      receiverName: receiverName ?? null,
    }).returning();

    res.status(201).json({
      ...transaction,
      amount: parseFloat(transaction.amount),
      vatAmount: transaction.vatAmount ? parseFloat(transaction.vatAmount) : null,
      createdAt: transaction.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في إضافة الحركة" });
  }
});

router.patch("/treasury/transactions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      date, type, amount, description,
      accountId, relatedPartyName, relatedAccountId,
      invoiceNumber, vatAmount, notes,
      repName, receiverName,
    } = req.body;

    const updates: any = {};
    if (date !== undefined) updates.date = date;
    if (type !== undefined) updates.type = type;
    if (amount !== undefined) updates.amount = String(amount);
    if (description !== undefined) updates.description = description;
    if (accountId !== undefined) updates.accountId = accountId;
    if (relatedPartyName !== undefined) updates.relatedPartyName = relatedPartyName;
    if (relatedAccountId !== undefined) updates.relatedAccountId = relatedAccountId;
    if (invoiceNumber !== undefined) updates.invoiceNumber = invoiceNumber;
    if (vatAmount !== undefined) updates.vatAmount = vatAmount ? String(vatAmount) : null;
    if (notes !== undefined) updates.notes = notes;
    if (repName !== undefined) updates.repName = repName;
    if (receiverName !== undefined) updates.receiverName = receiverName;

    const [transaction] = await db.update(treasuryTransactionsTable)
      .set(updates)
      .where(eq(treasuryTransactionsTable.id, id))
      .returning();

    if (!transaction) return res.status(404).json({ error: "الحركة غير موجودة" });

    try {
      const { journalEntriesTable, journalLinesTable, accountsTable } = await import("@workspace/db");
      const allEntries = await db.select().from(journalEntriesTable);
      const related = allEntries.filter((e: any) => e.referenceId === id && e.referenceType === "treasury_transaction");
      for (const entry of related) {
        await db.delete(journalLinesTable).where(eq(journalLinesTable.entryId, entry.id));
        await db.delete(journalEntriesTable).where(eq(journalEntriesTable.id, entry.id));
      }
      const accId = transaction.accountId;
      const relAccId = transaction.relatedAccountId;
      if (accId && relAccId) {
        const accs = await db.select().from(accountsTable);
        const mainAcc = accs.find((a: any) => a.id === accId);
        const relAcc = accs.find((a: any) => a.id === relAccId);
        if (mainAcc && relAcc) {
          const amt = parseFloat(transaction.amount);
          const freshEntries = await db.select().from(journalEntriesTable);
          const entryNumber = "JV-" + String(freshEntries.length + 1).padStart(4, "0");
          const lines = transaction.type === "out" ? [
            { accountId: relAccId, accountName: relAcc.name, accountCode: relAcc.code, debit: String(amt), credit: "0", notes: null },
            { accountId: accId, accountName: mainAcc.name, accountCode: mainAcc.code, debit: "0", credit: String(amt), notes: null },
          ] : [
            { accountId: accId, accountName: mainAcc.name, accountCode: mainAcc.code, debit: String(amt), credit: "0", notes: null },
            { accountId: relAccId, accountName: relAcc.name, accountCode: relAcc.code, debit: "0", credit: String(amt), notes: null },
          ];
          const [newEntry] = await db.insert(journalEntriesTable).values({
            entryNumber, date: transaction.date, description: transaction.description,
            source: "treasury", referenceId: transaction.id, referenceType: "treasury_transaction",
          }).returning();
          await db.insert(journalLinesTable).values(lines.map((l: any) => ({ ...l, entryId: newEntry.id })));
        }
      }
    } catch(e) { req.log.error(e); }

    if (!transaction) return res.status(404).json({ error: "الحركة غير موجودة" });

    res.json({
      ...transaction,
      amount: parseFloat(transaction.amount),
      vatAmount: transaction.vatAmount ? parseFloat(transaction.vatAmount) : null,
      createdAt: transaction.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في تحديث الحركة" });
  }
});

router.delete("/treasury/transactions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // حذف القيد المرتبط
    try {
      const { journalEntriesTable, journalLinesTable } = await import("@workspace/db");
      const entries = await db.select().from(journalEntriesTable);
      const related = entries.filter((e: any) => e.referenceId === id && e.referenceType === "treasury_transaction");
      for (const entry of related) {
        await db.delete(journalLinesTable).where(eq(journalLinesTable.entryId, entry.id));
        await db.delete(journalEntriesTable).where(eq(journalEntriesTable.id, entry.id));
      }
    } catch(e) { req.log.error(e); }
    await db.delete(treasuryTransactionsTable).where(eq(treasuryTransactionsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في حذف الحركة" });
  }
});

export default router;