import { pgTable, serial, text, numeric, integer, timestamp, jsonb, pgEnum, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { suppliersTable } from "./suppliers";

export const purchasePaymentMethodEnum = pgEnum("purchase_payment_method", ["cash", "network", "credit"]);

// --- 1. جدول فواتير المشتريات الأساسي ---
export const purchasesTable = pgTable("purchases", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number"),
  date: text("date").notNull(),
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  supplierName: text("supplier_name"),
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
  paymentMethod: purchasePaymentMethodEnum("payment_method").default("cash"),
  accountId: integer("account_id"),
  warehouseId: integer("warehouse_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPurchaseSchema = createInsertSchema(purchasesTable).omit({ id: true, createdAt: true });
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchasesTable.$inferSelect;

// --- 2. جدول طلبات الشراء (بدون تغيير) ---
export const purchaseOrders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  orderDate: date('order_date').notNull(),
  supplierId: integer('supplier_id').references(() => suppliersTable.id),
  status: text('status').default('pending'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 3. جدول تفاصيل طلب الشراء (بدون تغيير) ---
export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  purchaseOrderId: integer('purchase_order_id').references(() => purchaseOrders.id).notNull(),
  productName: text('product_name').notNull(),
  quantity: numeric('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
});