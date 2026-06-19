import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const repsTable = pgTable("reps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  area: text("area"),
  password: text("password"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRepSchema = createInsertSchema(repsTable).omit({ id: true, createdAt: true, isActive: true, password: true });
export type InsertRep = z.infer<typeof insertRepSchema>;
export type Rep = typeof repsTable.$inferSelect;
