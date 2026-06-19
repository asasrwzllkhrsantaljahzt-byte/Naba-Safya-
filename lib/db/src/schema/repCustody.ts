import { pgTable, serial, text, numeric, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { repsTable } from "./reps";

export const custodyTypeEnum = pgEnum("custody_type", ["give", "receive"]);

export const repCustodyTable = pgTable("rep_custody", {
  id: serial("id").primaryKey(),
  repId: integer("rep_id").notNull().references(() => repsTable.id),
  repName: text("rep_name").notNull(),
  date: text("date").notNull(),
  type: custodyTypeEnum("type").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRepCustodySchema = createInsertSchema(repCustodyTable).omit({ id: true, createdAt: true });
export type InsertRepCustody = z.infer<typeof insertRepCustodySchema>;
export type RepCustody = typeof repCustodyTable.$inferSelect;
