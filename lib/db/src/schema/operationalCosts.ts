import { pgTable, serial, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const costCategoryEnum = pgEnum("cost_category", [
  "chemicals",
  "water_returns",
  "rent",
  "electricity",
  "salaries",
  "maintenance",
  "fuel",
  "packaging",
  "other",
]);

export const operationalCostsTable = pgTable("operational_costs", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  month: text("month").notNull(),
  category: costCategoryEnum("category").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOperationalCostSchema = createInsertSchema(operationalCostsTable).omit({ id: true, createdAt: true });
export type InsertOperationalCost = z.infer<typeof insertOperationalCostSchema>;
export type OperationalCost = typeof operationalCostsTable.$inferSelect;
