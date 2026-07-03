import { pgTable, serial, text, numeric, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const journalSourceEnum = pgEnum("journal_source", ["manual", "sale", "purchase", "expense", "treasury", "payroll", "obligation"]);

export const journalEntriesTable = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  entryNumber: text("entry_number").notNull(),
  date: text("date").notNull(),
  description: text("description").notNull(),
  source: journalSourceEnum("source").notNull().default("manual"),
  referenceId: integer("reference_id"),
  referenceType: text("reference_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const journalLinesTable = pgTable("journal_lines", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => journalEntriesTable.id),
  accountId: integer("account_id").notNull(),
  accountName: text("account_name").notNull(),
  accountCode: text("account_code").notNull(),
  debit: numeric("debit", { precision: 12, scale: 2 }).notNull().default("0"),
  credit: numeric("credit", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
});

export type JournalEntry = typeof journalEntriesTable.$inferSelect;
export type JournalLine = typeof journalLinesTable.$inferSelect;
