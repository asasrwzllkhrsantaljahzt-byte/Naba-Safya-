import { pgTable, serial, text, numeric, pgEnum, timestamp, integer } from "drizzle-orm/pg-core";

export const treasuryTypeEnum = pgEnum("treasury_type", ["in", "out"]);
export const treasurySourceEnum = pgEnum("treasury_source", ["sale", "expense", "purchase", "manual", "payroll", "obligation"]);

export const treasuryTransactionsTable = pgTable("treasury_transactions", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  type: treasuryTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  source: treasurySourceEnum("source").notNull().default("manual"),
  reference: text("reference"),
  relatedPartyName: text("related_party_name"),
  accountId: integer("account_id"),
  repName: text("rep_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TreasuryTransaction = typeof treasuryTransactionsTable.$inferSelect;
