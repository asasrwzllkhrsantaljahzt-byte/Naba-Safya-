import { db } from "@workspace/db";
import { journalEntriesTable, journalLinesTable } from "@workspace/db";

type JournalLineInput = {
  accountId: number;
  accountName: string;
  accountCode: string;
  debit: string;
  credit: string;
  notes?: string | null;
};

type CreateJournalEntryInput = {
  date: string;
  description: string;
  reference?: string | null;
  source: "manual" | "sale" | "purchase" | "purchase_return" | "sale_return" | "expense" | "treasury" | "payroll" | "obligation";
  referenceId?: number | null;
  lines: JournalLineInput[];
};

export async function createJournalEntry(input: CreateJournalEntryInput) {
  const { date, description, reference, source, referenceId, lines } = input;

  if (!lines || lines.length < 2) return null;

  const totalDebit = lines.reduce((s, l) => s + parseFloat(l.debit || "0"), 0);
  const totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit || "0"), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01 || totalDebit === 0) {
    console.error("قيد غير متزن، تم تجاهله:", { totalDebit, totalCredit, description });
    return null;
  }

  const allEntries = await db.select().from(journalEntriesTable);
  const entryNumber = `JV-${String(allEntries.length + 1).padStart(4, "0")}`;

  const [entry] = await db.insert(journalEntriesTable).values({
    entryNumber,
    date,
    description,
    source,
    referenceId: referenceId ?? null,
    referenceType: reference ?? null,
  }).returning();

  await db.insert(journalLinesTable).values(
    lines.map(l => ({
      entryId: entry.id,
      accountId: l.accountId,
      accountName: l.accountName,
      accountCode: l.accountCode,
      debit: l.debit,
      credit: l.credit,
      notes: l.notes ?? null,
    }))
  );

  return entry;
}