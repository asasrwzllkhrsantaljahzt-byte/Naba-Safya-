import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";

export const payrollTable = pgTable("payroll", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id),
  employeeName: text("employee_name").notNull(),
  month: text("month").notNull(),
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull(),
  housingAllowance: numeric("housing_allowance", { precision: 12, scale: 2 }).default("0"),
  transportAllowance: numeric("transport_allowance", { precision: 12, scale: 2 }).default("0"),
  overtimeAmount: numeric("overtime_amount", { precision: 12, scale: 2 }).default("0"),
  commissions: numeric("commissions", { precision: 12, scale: 2 }).default("0"),
  deductions: numeric("deductions", { precision: 12, scale: 2 }).default("0"),
  absenceDeductions: numeric("absence_deductions", { precision: 12, scale: 2 }).default("0"),
  netSalary: numeric("net_salary", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  isPaid: text("is_paid").default("false"),
  paidDate: text("paid_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPayrollSchema = createInsertSchema(payrollTable).omit({ id: true, createdAt: true });
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;
export type Payroll = typeof payrollTable.$inferSelect;
