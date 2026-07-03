import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, couponBooksTable, accountsTable } from "@workspace/db";
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

// ── مساعد: إيجاد أو إنشاء حساب فرعي تلقائي تحت "العملاء" ─────
async function createCustomerAccount(customerName: string): Promise<number | null> {
  const allAccounts = await db.select().from(accountsTable);
  const customersRoot = allAccounts.find(a => a.name.includes("العملاء"));
  if (!customersRoot) return null;

  const code = await getNextChildCode(customersRoot.id);
  const [account] = await db.insert(accountsTable).values({
    code,
    name: customerName,
    type: "asset",
    openingBalance: "0",
    parentId: customersRoot.id,
    level: customersRoot.level + 1,
  }).returning();

  return account.id;
}

function formatCustomer(c: any, books: any[]): any {
  const cBooks = books.filter((b) => b.customerId === c.id);
  return {
    ...c,
    createdAt: c.createdAt?.toISOString?.() ?? (typeof c.createdAt === 'string' ? c.createdAt : null),
    totalCouponBooks: cBooks.length,
    remainingCoupons: cBooks.reduce(
      (sum, b) => sum + Number(b.remainingValue || 0),
      0
    ),
  };
}

router.get("/customers", async (req, res): Promise<any> => {
  try {
    const { search, repId } = req.query as { search?: string; repId?: string };
    let customers = await db.select().from(customersTable);
    const books = await db.select().from(couponBooksTable);
    if (search) {
      const searchLower = search.toLowerCase();
      customers = customers.filter((c: any) =>
        c.name?.toLowerCase().includes(searchLower) || c.phone?.includes(search)
      );
    }
    if (repId) {
      customers = customers.filter((c: any) => c.repId === parseInt(repId));
    }
    return res.json(customers.map((c: any) => formatCustomer(c, books)));
  } catch (err) {
    console.error("خطأ في جلب العملاء:", err);
    return res.status(500).json({ error: "فشل تحميل العملاء" });
  }
});

// ✅ ينشئ حساب فرعي تلقائي في دليل الحسابات
router.post("/customers", async (req, res): Promise<any> => {
  try {
    const { name, phone, area, notes, repId, repName, bottleBalance, lastVisitDate } = req.body;

    const accountId = await createCustomerAccount(name);

    const [customer] = await db.insert(customersTable).values({
      name, phone, area, notes,
      repId: repId ?? null,
      repName: repName ?? null,
      bottleBalance: bottleBalance ?? 0,
      lastVisitDate: lastVisitDate ?? null,
      accountId: accountId ?? null,
    }).returning();
    return res.status(201).json({
      ...customer,
      createdAt: customer.createdAt?.toISOString?.() ?? null,
      totalCouponBooks: 0,
      remainingCoupons: 0,
    });
  } catch (err) {
    console.error("خطأ في إضافة عميل:", err);
    return res.status(500).json({ error: "فشل إضافة العميل" });
  }
});

router.get("/customers/:id", async (req, res): Promise<any> => {
  try {
    const id = parseInt(req.params.id);
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
    if (!customer) return res.status(404).json({ error: "العميل غير موجود" });
    const books = await db.select().from(couponBooksTable);
    return res.json(formatCustomer(customer, books));
  } catch (err) {
    console.error("خطأ في جلب العميل:", err);
    return res.status(500).json({ error: "فشل جلب العميل" });
  }
});

// ✅ يحدّث اسم الحساب المرتبط أيضاً
router.patch("/customers/:id", async (req, res): Promise<any> => {
  try {
    const id = parseInt(req.params.id);
    const updates: Record<string, unknown> = {};
    const fields = ["name", "phone", "area", "notes", "repId", "repName", "bottleBalance", "lastVisitDate"];
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    const [customer] = await db.update(customersTable).set(updates).where(eq(customersTable.id, id)).returning();
    if (!customer) return res.status(404).json({ error: "العميل غير موجود" });

    if (updates.name && customer.accountId) {
      await db.update(accountsTable)
        .set({ name: updates.name as string })
        .where(eq(accountsTable.id, customer.accountId));
    }

    return res.json(customer);
  } catch (err) {
    console.error("خطأ في تعديل العميل:", err);
    return res.status(500).json({ error: "فشل تعديل العميل" });
  }
});

// ✅ يحذف الحساب المرتبط لو ما لوش حركات
router.delete("/customers/:id", async (req, res): Promise<any> => {
  try {
    const id = parseInt(req.params.id);
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));

    await db.delete(customersTable).where(eq(customersTable.id, id));

    if (customer?.accountId) {
      const hasChildren = await db.select().from(accountsTable).where(eq(accountsTable.parentId, customer.accountId));
      if (hasChildren.length === 0) {
        await db.delete(accountsTable).where(eq(accountsTable.id, customer.accountId)).catch(() => {});
      }
    }

    return res.status(204).end();
  } catch (err) {
    console.error("خطأ في حذف العميل:", err);
    return res.status(500).json({ error: "فشل حذف العميل" });
  }
});

export default router;