import { Router } from "express";
import { db } from "@workspace/db";
import { employeesTable, obligationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function fmt(e: typeof employeesTable.$inferSelect) {
  return {
    ...e,
    basicSalary: parseFloat(e.basicSalary ?? "0"),
    housingAllowance: parseFloat(e.housingAllowance ?? "0"),
    transportAllowance: parseFloat(e.transportAllowance ?? "0"),
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/employees", async (req, res) => {
  try {
    const employees = await db.select().from(employeesTable).orderBy(employeesTable.name);
    return res.json(employees.map(fmt));
  } catch (err) { 
    req.log.error(err); 
    return res.status(500).json({ error: "فشل في جلب الموظفين" }); 
  }
});

router.post("/employees", async (req, res) => {
  try {
    const { name, jobTitle, phone, idNumber, hireDate, basicSalary, housingAllowance, transportAllowance, notes } = req.body;
    const [emp] = await db.insert(employeesTable).values({
      name, jobTitle, phone, idNumber, hireDate,
      basicSalary: String(basicSalary ?? 0),
      housingAllowance: String(housingAllowance ?? 0),
      transportAllowance: String(transportAllowance ?? 0),
      notes,
    }).returning();
    return res.status(201).json(fmt(emp));
  } catch (err) { 
    req.log.error(err); 
    return res.status(500).json({ error: "فشل في إضافة الموظف" }); 
  }
});

router.patch("/employees/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, jobTitle, phone, idNumber, hireDate, basicSalary, housingAllowance, transportAllowance, notes, isActive } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (jobTitle !== undefined) updates.jobTitle = jobTitle;
    if (phone !== undefined) updates.phone = phone;
    if (idNumber !== undefined) updates.idNumber = idNumber;
    if (hireDate !== undefined) updates.hireDate = hireDate;
    if (basicSalary !== undefined) updates.basicSalary = String(basicSalary);
    if (housingAllowance !== undefined) updates.housingAllowance = String(housingAllowance);
    if (transportAllowance !== undefined) updates.transportAllowance = String(transportAllowance);
    if (notes !== undefined) updates.notes = notes;
    if (isActive !== undefined) updates.isActive = String(isActive);
    const [emp] = await db.update(employeesTable).set(updates).where(eq(employeesTable.id, id)).returning();
    if (!emp) return res.status(404).json({ error: "الموظف غير موجود" });
    return res.json(fmt(emp));
  } catch (err) { 
    req.log.error(err); 
    return res.status(500).json({ error: "فشل في تحديث الموظف" }); 
  }
});

router.delete("/employees/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(employeesTable).where(eq(employeesTable.id, id));
    return res.status(204).end();
  } catch (err) { 
    req.log.error(err); 
    return res.status(500).json({ error: "فشل في حذف الموظف" }); 
  }
});

// Generate monthly salary obligation for all active employees
router.post("/employees/generate-salary-obligations", async (req, res) => {
  try {
    const { month } = req.body; // YYYY-MM
    const employees = await db.select().from(employeesTable);
    const active = employees.filter(e => e.isActive !== "false");
    const created = [];
    for (const emp of active) {
      const basic = parseFloat(emp.basicSalary ?? "0");
      const housing = parseFloat(emp.housingAllowance ?? "0");
      const transport = parseFloat(emp.transportAllowance ?? "0");
      const net = basic + housing + transport;
      const [obl] = await db.insert(obligationsTable).values({
        date: `${month}-01`,
        dueDate: `${month}-30`,
        type: "salary",
        description: `راتب شهر ${month}`,
        partyName: emp.name,
        amount: String(net.toFixed(2)),
        paidAmount: "0",
        status: "pending",
        referenceType: "employee",
        referenceId: emp.id,
      }).returning();
      created.push(obl);
    }
    return res.status(201).json({ created: created.length, obligations: created });
  } catch (err) { 
    req.log.error(err); 
    return res.status(500).json({ error: "فشل في توليد التزامات الرواتب" }); 
  }
});

export default router;