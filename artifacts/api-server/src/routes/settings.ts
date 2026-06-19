import { Router } from "express";
import { db } from "@workspace/db";
import { factorySettingsTable } from "@workspace/db";
import {
  salesTable, purchasesTable, expensesTable, treasuryTransactionsTable,
  customersTable, repsTable, inventoryTable, productsTable,
  suppliersTable, employeesTable, attendanceTable, payrollTable,
  costCentersTable, repCustodyTable, obligationsTable, operationalCostsTable,
  couponBooksTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function getOrCreateSettings() {
  const rows = await db.select().from(factorySettingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [created] = await db.insert(factorySettingsTable).values({}).returning();
  return created;
}

router.get("/settings", async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب الإعدادات" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const {
      companyName, vatNumber, phone, address, city,
      commercialReg, bankAccount, bankName, currency, invoiceNotes, logoUrl,
    } = req.body;

    const [updated] = await db
      .update(factorySettingsTable)
      .set({
        ...(companyName !== undefined && { companyName }),
        ...(vatNumber !== undefined && { vatNumber }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(commercialReg !== undefined && { commercialReg }),
        ...(bankAccount !== undefined && { bankAccount }),
        ...(bankName !== undefined && { bankName }),
        ...(currency !== undefined && { currency }),
        ...(invoiceNotes !== undefined && { invoiceNotes }),
        ...(logoUrl !== undefined && { logoUrl }),
      })
      .where(eq(factorySettingsTable.id, settings.id))
      .returning();

    res.json(updated ?? settings);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في حفظ الإعدادات" });
  }
});

router.get("/backup", async (req, res) => {
  try {
    const [
      settings, products, customers, reps, suppliers, purchases, sales,
      inventory, expenses, treasury, employees, attendance, payroll,
      costCenters, repCustody, obligations, operationalCosts, couponBooks,
    ] = await Promise.all([
      db.select().from(factorySettingsTable),
      db.select().from(productsTable),
      db.select().from(customersTable),
      db.select().from(repsTable),
      db.select().from(suppliersTable),
      db.select().from(purchasesTable),
      db.select().from(salesTable),
      db.select().from(inventoryTable),
      db.select().from(expensesTable),
      db.select().from(treasuryTransactionsTable),
      db.select().from(employeesTable),
      db.select().from(attendanceTable),
      db.select().from(payrollTable),
      db.select().from(costCentersTable),
      db.select().from(repCustodyTable),
      db.select().from(obligationsTable),
      db.select().from(operationalCostsTable),
      db.select().from(couponBooksTable),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      data: {
        settings, products, customers, reps, suppliers,
        purchases, sales, inventory, expenses, treasury,
        employees, attendance, payroll, costCenters,
        repCustody, obligations, operationalCosts, couponBooks,
      },
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="backup-${new Date().toISOString().split("T")[0]}.json"`
    );
    res.json(backup);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في إنشاء النسخة الاحتياطية" });
  }
});

export default router;
