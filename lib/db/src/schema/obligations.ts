import { pgTable, serial, text, numeric, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const obligationTypeEnum = pgEnum("obligation_type", ["salary", "supplier", "rent", "loan", "other"]);
export const obligationStatusEnum = pgEnum("obligation_status", ["pending", "paid", "partial"]);

export const obligationsTable = pgTable("obligations", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  dueDate: text("due_date"),
  type: obligationTypeEnum("type").notNull().default("other"),
  description: text("description").notNull(),
  partyName: text("party_name"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).default("0"),
  status: obligationStatusEnum("status").notNull().default("pending"),
  referenceId: integer("reference_id"),
  referenceType: text("reference_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertObligationSchema = createInsertSchema(obligationsTable).omit({ id: true, createdAt: true });
export type InsertObligation = z.infer<typeof insertObligationSchema>;
export type Obligation = typeof obligationsTable.$inferSelect;
