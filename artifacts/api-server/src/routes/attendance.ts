import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceTable, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function fmt(a: typeof attendanceTable.$inferSelect) {
  return { ...a, overtime: parseFloat(a.overtime ?? "0"), createdAt: a.createdAt.toISOString() };
}

router.get("/attendance", async (req, res) => {
  try {
    const { employeeId, month } = req.query as { employeeId?: string; month?: string };
    let records = await db.select().from(attendanceTable).orderBy(attendanceTable.date);
    if (employeeId) records = records.filter(r => r.employeeId === parseInt(employeeId));
    if (month) records = records.filter(r => r.date.startsWith(month));
    res.json(records.map(fmt));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في جلب الحضور" }); }
});

router.post("/attendance", async (req, res) => {
  try {
    const { employeeId, date, type, overtime, notes } = req.body;
    const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));
    if (!emp) return res.status(400).json({ error: "الموظف غير موجود" });
    const [record] = await db.insert(attendanceTable).values({
      employeeId, employeeName: emp.name, date, type: type ?? "present",
      overtime: String(overtime ?? 0), notes,
    }).returning();
    res.status(201).json(fmt(record));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في إضافة سجل الحضور" }); }
});

router.patch("/attendance/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { type, overtime, notes } = req.body;
    const updates: Record<string, unknown> = {};
    if (type !== undefined) updates.type = type;
    if (overtime !== undefined) updates.overtime = String(overtime);
    if (notes !== undefined) updates.notes = notes;
    const [record] = await db.update(attendanceTable).set(updates).where(eq(attendanceTable.id, id)).returning();
    if (!record) return res.status(404).json({ error: "السجل غير موجود" });
    res.json(fmt(record));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في تحديث سجل الحضور" }); }
});

router.delete("/attendance/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(attendanceTable).where(eq(attendanceTable.id, id));
    res.status(204).end();
  } catch (err) { req.log.error(err); res.status(500).json({ error: "فشل في حذف سجل الحضور" }); }
});

export default router;
