import { pgTable, serial, text, numeric, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";

export const saleReturnsTable = pgTable("sale_returns", {
  id: serial("id").primaryKey(),
  returnNumber: text("return_number"),
  date: text("date").notNull(),
  originalSaleId: integer("original_sale_id").references(() => customersTable.id),
  customerId: integer("customer_id").references(() => customersTable.id),
  customerName: text("customer_name"),
  accountId: integer("account_id"),
  items: jsonb("items").notNull().$type<Array<{
    productId: number; productName: string; quantity: number;
    unitPrice: number; vatRate: number; vatEnabled?: boolean; subtotal: number;
  }>>(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).notNull(),
  grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").default("cash"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SaleReturn = typeof saleReturnsTable.$inferSelect;
