import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const couponBooksTable = pgTable("coupon_books", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  bookNumber: text("book_number").notNull(),
  totalValue: numeric("total_value", { precision: 12, scale: 2 }).notNull(),
  remainingValue: numeric("remaining_value", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
});

export const insertCouponBookSchema = createInsertSchema(couponBooksTable).omit({ id: true, issuedAt: true });
export type InsertCouponBook = z.infer<typeof insertCouponBookSchema>;
export type CouponBook = typeof couponBooksTable.$inferSelect;
