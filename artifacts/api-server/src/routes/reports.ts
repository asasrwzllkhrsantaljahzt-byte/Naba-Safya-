import { Router } from "express";
import { db } from "@workspace/db";
import {
  salesTable, purchasesTable, expensesTable, treasuryTransactionsTable,
  customersTable, repsTable, inventoryTable, productsTable
} from "@workspace/db";

const router = Router();

const COMPANY_NAME = "مصنع نبع صافيا لتعبئة المياه";
const VAT_NUMBER = "314668535600003";

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

router.get("/reports/dashboard", async (req, res) => {
  try {
    const { month, year } = req.query as { month?: string; year?: string };
    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();

    const monthStr = String(targetMonth).padStart(2, "0");
    const prefix = `${targetYear}-${monthStr}`;

    const allSales = await db.select().from(salesTable);
    const allPurchases = await db.select().from(purchasesTable);
    const allExpenses = await db.select().from(expensesTable);
    const allTreasury = await db.select().from(treasuryTransactionsTable);
    const customers = await db.select().from(customersTable);
    const reps = await db.select().from(repsTable);
    const inventory = await db.select().from(inventoryTable);
    const products = await db.select().from(productsTable);

    const monthlySales = allSales.filter((s) => s.date.startsWith(prefix));
    const monthlyPurchases = allPurchases.filter((p) => p.date.startsWith(prefix));
    const monthlyExpenses = allExpenses.filter((e) => e.date.startsWith(prefix));

    const totalSalesAmount = monthlySales.reduce((sum, s) => sum + parseFloat(s.grandTotal), 0);
    const totalPurchasesAmount = monthlyPurchases.reduce((sum, p) => sum + parseFloat(p.grandTotal), 0);
    const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const netProfit = totalSalesAmount - totalPurchasesAmount - totalExpenses;

    const totalIn = allTreasury.filter((t) => t.type === "in").reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalOut = allTreasury.filter((t) => t.type === "out").reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const cashBalance = totalIn - totalOut;

    // Monthly chart for last 6 months
    const monthlyChart = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(targetYear, targetMonth - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const mStr = String(m).padStart(2, "0");
      const pref = `${y}-${mStr}`;
      const ms = allSales.filter((s) => s.date.startsWith(pref));
      const mp = allPurchases.filter((p) => p.date.startsWith(pref));
      const me = allExpenses.filter((e) => e.date.startsWith(pref));
      const sAmt = ms.reduce((sum, s) => sum + parseFloat(s.grandTotal), 0);
      const pAmt = mp.reduce((sum, p) => sum + parseFloat(p.grandTotal), 0);
      const eAmt = me.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      monthlyChart.push({ month: m, year: y, label: ARABIC_MONTHS[m - 1], salesAmount: sAmt, purchasesAmount: pAmt, expenses: eAmt, profit: sAmt - pAmt - eAmt });
    }

    // Top reps
    const repSummaries = reps.map((r) => {
      const repSales = allSales.filter((s) => s.repId === r.id);
      return {
        repId: r.id,
        repName: r.name,
        area: r.area,
        totalOrders: repSales.length,
        totalAmount: repSales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0),
        totalVat: repSales.reduce((sum, s) => sum + parseFloat(s.vatAmount), 0),
        grandTotal: repSales.reduce((sum, s) => sum + parseFloat(s.grandTotal), 0),
      };
    }).sort((a, b) => b.grandTotal - a.grandTotal).slice(0, 5);

    const inventoryItems = products.map((p) => {
      const inv = inventory.find((i) => i.productId === p.id);
      return { productId: p.id, productName: p.name, color: p.color, quantity: inv?.quantity ?? 0 };
    });

    res.json({
      totalSalesAmount,
      totalPurchasesAmount,
      totalExpenses,
      netProfit,
      cashBalance,
      totalCustomers: customers.length,
      totalReps: reps.filter((r) => r.isActive).length,
      inventoryItems,
      recentSales: allSales.slice(-5).reverse().map(formatSale),
      recentPurchases: allPurchases.slice(-5).reverse().map(formatPurchase),
      monthlySales: monthlyChart,
      topReps: repSummaries,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب بيانات لوحة المتابعة" });
  }
});

router.get("/reports/income-statement", async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };

    const allSales = await db.select().from(salesTable);
    const allPurchases = await db.select().from(purchasesTable);
    const allExpenses = await db.select().from(expensesTable);

    let sales = allSales;
    let purchases = allPurchases;
    let expenses = allExpenses;

    if (from) {
      sales = sales.filter((s) => s.date >= from);
      purchases = purchases.filter((p) => p.date >= from);
      expenses = expenses.filter((e) => e.date >= from);
    }
    if (to) {
      sales = sales.filter((s) => s.date <= to);
      purchases = purchases.filter((p) => p.date <= to);
      expenses = expenses.filter((e) => e.date <= to);
    }

    const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
    const vatCollected = sales.reduce((sum, s) => sum + parseFloat(s.vatAmount), 0);
    const totalCost = purchases.reduce((sum, p) => sum + parseFloat(p.totalAmount), 0);
    const vatPaid = purchases.reduce((sum, p) => sum + parseFloat(p.vatAmount), 0);
    const grossProfit = totalRevenue - totalCost;
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const netProfit = grossProfit - totalExpenses;

    // Revenue breakdown by product
    const revenueByProduct: Record<string, number> = {};
    for (const s of sales) {
      const items = s.items as Array<{ productName: string; subtotal: number }>;
      for (const item of items) {
        revenueByProduct[item.productName] = (revenueByProduct[item.productName] ?? 0) + parseFloat(String(item.subtotal));
      }
    }
    const revenueBreakdown = Object.entries(revenueByProduct).map(([label, amount]) => ({ label, amount }));

    // Expense breakdown by category
    const expenseByCategory: Record<string, number> = {};
    for (const e of expenses) {
      expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + parseFloat(e.amount);
    }
    const expenseBreakdown = Object.entries(expenseByCategory).map(([label, amount]) => ({ label, amount }));

    res.json({
      from: from ?? "",
      to: to ?? "",
      totalRevenue,
      totalCost,
      grossProfit,
      totalExpenses,
      netProfit,
      vatCollected,
      vatPaid,
      vatBalance: vatCollected - vatPaid,
      revenueBreakdown,
      expenseBreakdown,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب قائمة الدخل" });
  }
});

router.get("/reports/balance-sheet", async (req, res) => {
  try {
    const allSales = await db.select().from(salesTable);
    const allPurchases = await db.select().from(purchasesTable);
    const allExpenses = await db.select().from(expensesTable);
    const allTreasury = await db.select().from(treasuryTransactionsTable);
    const inventory = await db.select().from(inventoryTable);
    const products = await db.select().from(productsTable);

    const totalIn = allTreasury.filter((t) => t.type === "in").reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalOut = allTreasury.filter((t) => t.type === "out").reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const cashBalance = totalIn - totalOut;

    // Inventory value
    let inventoryValue = 0;
    for (const inv of inventory) {
      const product = products.find((p) => p.id === inv.productId);
      if (product) inventoryValue += inv.quantity * parseFloat(product.unitPrice);
    }

    // Accounts receivable (coupon sales not yet collected)
    const couponSales = allSales.filter((s) => s.paymentMethod === "coupon");
    const accountsReceivable = couponSales.reduce((sum, s) => sum + parseFloat(s.grandTotal), 0);

    const totalRevenue = allSales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
    const totalCost = allPurchases.reduce((sum, p) => sum + parseFloat(p.totalAmount), 0);
    const totalExpenses = allExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const netProfit = totalRevenue - totalCost - totalExpenses;

    const assets = [
      { label: "الخزينة - النقدية", amount: cashBalance },
      { label: "المخزن (قيمة البضاعة)", amount: inventoryValue },
      { label: "ذمم مدينة (كوبونات)", amount: accountsReceivable },
    ];
    const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);

    const vatCollected = allSales.reduce((sum, s) => sum + parseFloat(s.vatAmount), 0);
    const vatPaid = allPurchases.reduce((sum, p) => sum + parseFloat(p.vatAmount), 0);
    const vatDue = Math.max(0, vatCollected - vatPaid);

    const liabilities = [
      { label: "ضريبة القيمة المضافة المستحقة", amount: vatDue },
    ];
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
    const equity = totalAssets - totalLiabilities;

    res.json({
      date: new Date().toISOString().split("T")[0],
      totalAssets,
      totalLiabilities,
      equity,
      assets,
      liabilities,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب الميزانية" });
  }
});

router.get("/reports/rep-sales", async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const reps = await db.select().from(repsTable);
    let sales = await db.select().from(salesTable);
    if (from) sales = sales.filter((s) => s.date >= from);
    if (to) sales = sales.filter((s) => s.date <= to);

    const result = reps.map((r) => {
      const repSales = sales.filter((s) => s.repId === r.id);
      return {
        repId: r.id,
        repName: r.name,
        area: r.area,
        totalOrders: repSales.length,
        totalAmount: repSales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0),
        totalVat: repSales.reduce((sum, s) => sum + parseFloat(s.vatAmount), 0),
        grandTotal: repSales.reduce((sum, s) => sum + parseFloat(s.grandTotal), 0),
      };
    });
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب تقرير مبيعات المندوبين" });
  }
});

router.get("/reports/rep-collections", async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const reps = await db.select().from(repsTable);
    let sales = await db.select().from(salesTable);
    if (from) sales = sales.filter((s) => s.date >= from);
    if (to) sales = sales.filter((s) => s.date <= to);

    const result = reps.map((r) => {
      const repSales = sales.filter((s) => s.repId === r.id);
      const cashCollected = repSales.filter((s) => s.paymentMethod === "cash").reduce((sum, s) => sum + parseFloat(s.grandTotal), 0);
      const couponCollected = repSales.filter((s) => s.paymentMethod === "coupon").reduce((sum, s) => sum + parseFloat(s.grandTotal), 0);
      const networkCollected = repSales.filter((s) => s.paymentMethod === "network").reduce((sum, s) => sum + parseFloat(s.grandTotal), 0);
      return {
        repId: r.id,
        repName: r.name,
        area: r.area,
        cashCollected,
        couponCollected,
        networkCollected,
        total: cashCollected + couponCollected + networkCollected,
      };
    });
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب تقرير تحصيلات المندوبين" });
  }
});

router.get("/reports/vat", async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    let sales = await db.select().from(salesTable);
    let purchases = await db.select().from(purchasesTable);
    if (from) {
      sales = sales.filter((s) => s.date >= from);
      purchases = purchases.filter((p) => p.date >= from);
    }
    if (to) {
      sales = sales.filter((s) => s.date <= to);
      purchases = purchases.filter((p) => p.date <= to);
    }

    const salesVat = sales.reduce((sum, s) => sum + parseFloat(s.vatAmount), 0);
    const purchasesVat = purchases.reduce((sum, p) => sum + parseFloat(p.vatAmount), 0);
    const netVat = salesVat - purchasesVat;

    const salesDetails = sales.map((s) => ({
      date: s.date,
      reference: s.orderNumber ?? `SAL-${s.id}`,
      description: `طلبية بيع - ${s.customerName}`,
      baseAmount: parseFloat(s.totalAmount),
      vatAmount: parseFloat(s.vatAmount),
      total: parseFloat(s.grandTotal),
    }));

    const purchasesDetails = purchases.map((p) => ({
      date: p.date,
      reference: p.invoiceNumber ?? `PUR-${p.id}`,
      description: `فاتورة شراء - ${p.supplierName ?? "مورد"}`,
      baseAmount: parseFloat(p.totalAmount),
      vatAmount: parseFloat(p.vatAmount),
      total: parseFloat(p.grandTotal),
    }));

    res.json({
      from: from ?? "",
      to: to ?? "",
      companyName: COMPANY_NAME,
      vatNumber: VAT_NUMBER,
      salesVat,
      purchasesVat,
      netVat,
      salesDetails,
      purchasesDetails,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب تقرير الضريبة" });
  }
});

router.get("/reports/monthly-sales", async (req, res) => {
  try {
    const { year } = req.query as { year?: string };
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const allSales = await db.select().from(salesTable);
    const allPurchases = await db.select().from(purchasesTable);
    const allExpenses = await db.select().from(expensesTable);

    const result = [];
    for (let m = 1; m <= 12; m++) {
      const mStr = String(m).padStart(2, "0");
      const prefix = `${targetYear}-${mStr}`;
      const ms = allSales.filter((s) => s.date.startsWith(prefix));
      const mp = allPurchases.filter((p) => p.date.startsWith(prefix));
      const me = allExpenses.filter((e) => e.date.startsWith(prefix));
      const sAmt = ms.reduce((sum, s) => sum + parseFloat(s.grandTotal), 0);
      const pAmt = mp.reduce((sum, p) => sum + parseFloat(p.grandTotal), 0);
      const eAmt = me.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      result.push({ month: m, year: targetYear, label: ARABIC_MONTHS[m - 1], salesAmount: sAmt, purchasesAmount: pAmt, expenses: eAmt, profit: sAmt - pAmt - eAmt });
    }
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل في جلب بيانات الرسم البياني" });
  }
});

function formatSale(s: typeof salesTable.$inferSelect) {
  return {
    ...s,
    totalAmount: parseFloat(s.totalAmount),
    vatAmount: parseFloat(s.vatAmount),
    grandTotal: parseFloat(s.grandTotal),
    createdAt: s.createdAt.toISOString(),
    items: (s.items as Array<{ productId: number; productName: string; quantity: number; unitPrice: number; vatRate: number; subtotal: number }>)
      .map((item) => ({ ...item, unitPrice: parseFloat(String(item.unitPrice)), vatRate: parseFloat(String(item.vatRate)), subtotal: parseFloat(String(item.subtotal)) })),
  };
}

function formatPurchase(p: typeof purchasesTable.$inferSelect) {
  return {
    ...p,
    totalAmount: parseFloat(p.totalAmount),
    vatAmount: parseFloat(p.vatAmount),
    grandTotal: parseFloat(p.grandTotal),
    createdAt: p.createdAt.toISOString(),
    items: (p.items as Array<{ productId: number; productName: string; quantity: number; unitPrice: number; vatRate: number; subtotal: number }>)
      .map((item) => ({ ...item, unitPrice: parseFloat(String(item.unitPrice)), vatRate: parseFloat(String(item.vatRate)), subtotal: parseFloat(String(item.subtotal)) })),
  };
}

export default router;
