import { Router } from "express";
import { db } from "@workspace/db";
import { suppliersTable, accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// ── مساعد: حساب الكود التالي تحت أب معين ─────────────────────
async function getNextChildCode(parentId: number): Promise<string> {
  const allAccounts = await db.select().from(accountsTable);
  const parent = allAccounts.find(a => a.id === parentId);
  if (!parent) return "1";
  const siblings = allAccounts.filter(a => a.parentId === parentId);
  if (siblings.length === 0) return parent.code + ".1";
  const nums = siblings.map(c => {
    const parts = c.code.split(".");
    const last = parseInt(parts[parts.length - 1]);
    return isNaN(last) ? 0 : last;
  });
  const nextNum = Math.max(...nums) + 1;
  return parent.code + "." + nextNum;
}

// ── مساعد: إيجاد أو إنشاء حساب فرعي تلقائي تحت "الموردون" ────
async function createSupplierAccount(supplierName: string): Promise<number | null> {
  const allAccounts = await db.select().from(accountsTable);
  const suppliersRoot = allAccounts.find(a => a.name.includes("الموردون") || a.name.includes("الموردين"));
  if (!suppliersRoot) return null;

  const code = await getNextChildCode(suppliersRoot.id);
  const [account] = await db.insert(accountsTable).values({
    code,
    name: supplierName,
    type: "liability",
    openingBalance: "0",
    parentId: suppliersRoot.id,
    level: suppliersRoot.level + 1,
  }).returning();

  return account.id;
}

// GET all suppliers
router.get("/suppliers", async (req, res): Promise<any> => {
  try {
    const suppliers = await db.select().from(suppliersTable).orderBy(suppliersTable.name);
    const result = suppliers.map((s) => ({
      ...s,
      createdAt: s.createdAt?.toISOString?.() ?? null,
    }));
    return res.json(result);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في جلب قائمة الموردين" });
  }
});

// CREATE supplier — ✅ ينشئ حساب فرعي تلقائي في دليل الحسابات
router.post("/suppliers", async (req, res): Promise<any> => {
  try {
    const { name, phone, area, notes } = req.body;

    const accountId = await createSupplierAccount(name);

    const [supplier] = await db.insert(suppliersTable).values({
      name, phone, area, notes,
      accountId: accountId ?? null,
    }).returning();

    return res.status(201).json({
      ...supplier,
      createdAt: supplier.createdAt?.toISOString?.() ?? null,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في إضافة المورد" });
  }
});

// UPDATE supplier — ✅ يحدّث اسم الحساب المرتبط أيضاً
router.patch("/suppliers/:id", async (req, res): Promise<any> => {
  try {
    const id = parseInt(req.params.id);
    const { name, phone, area, notes } = req.body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (area !== undefined) updates.area = area;
    if (notes !== undefined) updates.notes = notes;

    const [supplier] = await db.update(suppliersTable)
      .set(updates)
      .where(eq(suppliersTable.id, id))
      .returning();

    if (!supplier) return res.status(404).json({ error: "المورد غير موجود" });

    // ✅ مزامنة الاسم مع الحساب المرتبط في الشجرة
    if (name !== undefined && supplier.accountId) {
      await db.update(accountsTable)
        .set({ name })
        .where(eq(accountsTable.id, supplier.accountId));
    }

    return res.json({
      ...supplier,
      createdAt: supplier.createdAt?.toISOString?.() ?? null,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في تحديث المورد" });
  }
});

// DELETE supplier — ✅ يحذف الحساب المرتبط لو ما لوش حركات
router.delete("/suppliers/:id", async (req, res): Promise<any> => {
  try {
    const id = parseInt(req.params.id);
    const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));

    await db.delete(suppliersTable).where(eq(suppliersTable.id, id));

    if (supplier?.accountId) {
      const hasChildren = await db.select().from(accountsTable).where(eq(accountsTable.parentId, supplier.accountId));
      if (hasChildren.length === 0) {
        await db.delete(accountsTable).where(eq(accountsTable.id, supplier.accountId)).catch(() => {});
      }
    }

    return res.status(204).end();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل في حذف المورد" });
  }
});

export default router;