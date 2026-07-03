import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const warehousesTable = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("general"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Warehouse = typeof warehousesTable.$inferSelect;
