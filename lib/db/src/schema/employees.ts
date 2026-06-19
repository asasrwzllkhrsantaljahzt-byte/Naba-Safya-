import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  jobTitle: text("job_title"),
  phone: text("phone"),
  idNumber: text("id_number"),
  hireDate: text("hire_date"),
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  housingAllowance: numeric("housing_allowance", { precision: 12, scale: 2 }).default("0"),
  transportAllowance: numeric("transport_allowance", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
