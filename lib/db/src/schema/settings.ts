import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const factorySettingsTable = pgTable("factory_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("مصنع نبع صافيا لتعبئة المياه"),
  vatNumber: text("vat_number").notNull().default("314668535600003"),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  commercialReg: text("commercial_reg").notNull().default(""),
  bankAccount: text("bank_account").notNull().default(""),
  bankName: text("bank_name").notNull().default(""),
  currency: text("currency").notNull().default("ر.س"),
  invoiceNotes: text("invoice_notes").notNull().default(""),
  logoUrl: text("logo_url").notNull().default(""),
});

export const insertFactorySettingsSchema = createInsertSchema(factorySettingsTable).omit({ id: true });
export type InsertFactorySettings = z.infer<typeof insertFactorySettingsSchema>;
export type FactorySettings = typeof factorySettingsTable.$inferSelect;
