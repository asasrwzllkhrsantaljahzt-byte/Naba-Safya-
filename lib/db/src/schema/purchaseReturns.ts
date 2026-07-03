import { pgTable, serial, text, numeric, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { suppliersTable } from "./suppliers";
import { purchasesTable } from "./purchases";

export const purchaseReturnsTable = pgTable("purchase_returns", {
  id: serial("id").primaryKey(),
  returnNumber: text("return_number"),
  date: text("date").notNull(),
  originalPurchaseId: integer("original_purchase_id").references(() => purchasesTable.id),
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  supplierName: text("supplier_name"),
  accountId: integer("account_id"),
  warehouseId: integer("warehouse_id"),
  items: jsonb("items").notNull().$type<Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    vatEnabled?: boolean;
    subtotal: number;
  }>>(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).notNull(),
  grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").default("cash"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PurchaseReturn = typeof purchaseReturnsTable.$inferSelect;
