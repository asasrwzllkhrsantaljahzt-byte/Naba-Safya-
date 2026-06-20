import { Router } from "express";
import { db } from "@workspace/db";
import { accountsTable, treasuryTransactionsTable, obligationsTable, customersTable, suppliersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/accounts", async (req, res) => {
  try {
    const accounts = await db.select().from(accountsTable).orderBy(accountsTable.code);
    res.json(accounts.map(a => ({ ...a, openingBalance: parseFloat(a.openingBalance) })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب دليل الحسابات" });
  }
});

router.post("/accounts", async (req, res) => {
  try {
    const { code, name, type, openingBalance, notes } = req.body;
    const [account] = await db.insert(accountsTable).values({
      code, name, type,
      openingBalance: String(openingBalance ?? 0),
      notes,
    }).returning();
    res.status(201).json({ ...account, openingBalance: parseFloat(account.openingBalance) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في إضافة الحساب" });
  }
});

router.patch("/accounts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { code, name, type, openingBalance, notes } = req.body;
    const updates: Record<string, unknown> = {};
    if (code !== undefined) updates.code = code;
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (openingBalance !== undefined) updates.openingBalance = String(openingBalance);
    if (notes !== undefined) updates.notes = notes;
    const [account] = await db.update(accountsTable).set(updates).where(eq(accountsTable.id, id)).returning();
    if (!account) return res.status(404).json({ error: "الحساب غير موجود" });
    res.json({ ...account, openingBalance: parseFloat(account.openingBalance) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في تعديل الحساب" });
  }
});

router.delete("/accounts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deleted] = await db.delete(accountsTable).where(eq(accountsTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "الحساب غير موجود" });
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في حذف الحساب" });
  }
});

// Summary: opening balances + current balances for all major accounts
router.get("/accounts/summary", async (req, res) => {
  try {
    const accounts = await db.select().from(accountsTable).orderBy(accountsTable.code);
    const treasury = await db.select().from(treasuryTransactionsTable);
    const obligations = await db.select().from(obligationsTable);
    const customers = await db.select().from(customersTable);
    const suppliers = await db.select().from(suppliersTable);

    const cashIn = treasury.filter(t => t.type === "in").reduce((s, t) => s + parseFloat(t.amount), 0);
    const cashOut = treasury.filter(t => t.type === "out").reduce((s, t) => s + parseFloat(t.amount), 0);

    const cashAccount = accounts.find(a => a.code === "1001");
    const cashOpening = cashAccount ? parseFloat(cashAccount.openingBalance) : 0;
    const cashCurrent = cashOpening + cashIn - cashOut;

    const obligTotal = obligations.reduce((s, o) => s + parseFloat(o.totalAmount), 0);
    const obligPaid = obligations.reduce((s, o) => s + parseFloat(o.paidAmount), 0);
    const obligBalance = obligTotal - obligPaid;
    const obligAccount = accounts.find(a => a.code === "2001");
    const obligOpening = obligAccount ? parseFloat(obligAccount.openingBalance) : 0;

    const result = accounts.map(a => {
      let currentBalance = parseFloat(a.openingBalance);
      if (a.code === "1001") currentBalance = cashCurrent;
      if (a.code === "2001") currentBalance = obligOpening + obligBalance;
      return { ...a, openingBalance: parseFloat(a.openingBalance), currentBalance };
    });

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب ملخص الحسابات" });
  }
});

export default router;
