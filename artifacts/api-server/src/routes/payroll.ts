import { Router } from "express";
import { db } from "@workspace/db";
import { payrollTable, employeesTable, treasuryTransactionsTable, obligationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function fmt(p: typeof payrollTable.$inferSelect) {
  return {
    ...p,
    basicSalary: parseFloat(p.basicSalary),
    housingAllowance: parseFloat(p.housingAllowance ?? "0"),
    transportAllowance: parseFloat(p.transportAllowance ?? "0"),
    overtimeAmount: parseFloat(p.overtimeAmount ?? "0"),
    commissions: parseFloat(p.commissions ?? "0"),
    deductions: parseFloat(p.deductions ?? "0"),
    absenceDeductions: parseFloat(p.absenceDeductions ?? "0"),
    netSalary: parseFloat(p.netSalary),
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/payroll", async (req, res) => {
  try {
    const { month, employeeId } = req.query as { month?: string; employeeId?: string };
    let records = await db.select().from(payrollTable).orderBy(payrollTable.month);
    if (month) records = records.filter(r => r.month === month);
    if (employeeId) records = records.filter(r => r.employeeId === parseInt(employeeId));
    res.json(records.map(fmt));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في جلب الرواتب" }); }
});

router.post("/payroll", async (req, res) => {
  try {
    const { employeeId, month, basicSalary, housingAllowance, transportAllowance, overtimeAmount, commissions, deductions, absenceDeductions, notes } = req.body;
    const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));
    if (!emp) return res.status(400).json({ error: "الموظف غير موجود" });

    const net = (parseFloat(basicSalary ?? emp.basicSalary ?? 0))
      + (parseFloat(housingAllowance ?? emp.housingAllowance ?? 0))
      + (parseFloat(transportAllowance ?? emp.transportAllowance ?? 0))
      + (parseFloat(overtimeAmount ?? 0))
      + (parseFloat(commissions ?? 0))
      - (parseFloat(deductions ?? 0))
      - (parseFloat(absenceDeductions ?? 0));

    const [record] = await db.insert(payrollTable).values({
      employeeId, employeeName: emp.name, month,
      basicSalary: String(basicSalary ?? emp.basicSalary ?? 0),
      housingAllowance: String(housingAllowance ?? emp.housingAllowance ?? 0),
      transportAllowance: String(transportAllowance ?? emp.transportAllowance ?? 0),
      overtimeAmount: String(overtimeAmount ?? 0),
      commissions: String(commissions ?? 0),
      deductions: String(deductions ?? 0),
      absenceDeductions: String(absenceDeductions ?? 0),
      netSalary: String(net.toFixed(2)),
      notes,
      isPaid: "false",
    }).returning();

    // Create obligation for this salary
    await db.insert(obligationsTable).values({
      date: `${month}-01`,
      dueDate: `${month}-30`,
      type: "salary",
      description: `راتب ${emp.name} - ${month}`,
      partyName: emp.name,
      amount: String(net.toFixed(2)),
      paidAmount: "0",
      status: "pending",
      referenceType: "payroll",
      referenceId: record.id,
    });

    res.status(201).json(fmt(record));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في إضافة راتب" }); }
});

// Mark payroll as paid - deduct from treasury
router.patch("/payroll/:id/pay", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [record] = await db.select().from(payrollTable).where(eq(payrollTable.id, id));
    if (!record) return res.status(404).json({ error: "السجل غير موجود" });
    if (record.isPaid === "true") return res.status(400).json({ error: "الراتب مدفوع مسبقاً" });

    const paidDate = new Date().toISOString().split("T")[0];
    const [updated] = await db.update(payrollTable).set({ isPaid: "true", paidDate }).where(eq(payrollTable.id, id)).returning();

    // Deduct from treasury
    await db.insert(treasuryTransactionsTable).values({
      date: paidDate,
      type: "out",
      amount: record.netSalary,
      description: `راتب ${record.employeeName} - شهر ${record.month}`,
      source: "payroll",
      reference: `PAY-${record.id}`,
      relatedPartyName: record.employeeName,
    });

    // Update obligation if exists
    const obligations = await db.select().from(obligationsTable);
    const obl = obligations.find(o => o.referenceType === "payroll" && o.referenceId === id);
    if (obl) {
      await db.update(obligationsTable).set({ status: "paid", paidAmount: record.netSalary }).where(eq(obligationsTable.id, obl.id));
    }

    res.json(fmt(updated));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في صرف الراتب" }); }
});

router.delete("/payroll/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(payrollTable).where(eq(payrollTable.id, id));
    res.status(204).end();
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في حذف الراتب" }); }
});

export default router;
