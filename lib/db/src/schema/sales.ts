import { pgTable, serial, text, numeric, integer, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { repsTable } from "./reps";
import { couponBooksTable } from "./couponBooks";

export const paymentMethodEnum = pgEnum("payment_method", ["coupon", "cash", "network", "transfer", "credit"]);

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number"),
  date: text("date").notNull(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  customerName: text("customer_name").notNull(),
  repId: integer("rep_id").references(() => repsTable.id),
  repName: text("rep_name"),
  accountId: integer("account_id"),
  items: jsonb("items").notNull().$type<Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    vatEnabled: boolean;
    subtotal: number;
  }>>(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).notNull(),
  grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  couponBookId: integer("coupon_book_id").references(() => couponBooksTable.id),
  bottlesDelivered: integer("bottles_delivered").default(0),
  bottlesReturned: integer("bottles_returned").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, createdAt: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;