import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const costCentersTable = pgTable("cost_centers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  budget: numeric("budget", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const costCenterExpensesTable = pgTable("cost_center_expenses", {
  id: serial("id").primaryKey(),
  costCenterId: integer("cost_center_id").notNull().references(() => costCentersTable.id),
  costCenterName: text("cost_center_name").notNull(),
  date: text("date").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCostCenterSchema = createInsertSchema(costCentersTable).omit({ id: true, createdAt: true });
export const insertCostCenterExpenseSchema = createInsertSchema(costCenterExpensesTable).omit({ id: true, createdAt: true });
export type InsertCostCenter = z.infer<typeof insertCostCenterSchema>;
export type InsertCostCenterExpense = z.infer<typeof insertCostCenterExpenseSchema>;
export type CostCenter = typeof costCentersTable.$inferSelect;
export type CostCenterExpense = typeof costCenterExpensesTable.$inferSelect;
