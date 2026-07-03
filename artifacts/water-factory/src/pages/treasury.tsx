import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowUpRight, ArrowDownRight, Edit, Trash2, AlertCircle, Search, Printer, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Transaction = {
  id: number;
  date: string;
  type: "in" | "out";
  amount: string;
  description: string;
  source: string;
  relatedPartyName?: string;
  relatedAccountId?: number;
  accountId?: number;
  invoiceNumber?: string;
  vatAmount?: string;
  notes?: string;
  repId?: number;
  repName?: string;
  account?: "cash" | "bank";
};

type Account = {
  id: number;
  code: string;
  name: string;
  type: string;
  parentId: number | null;
  level: number;
  openingBalance?: number;
};

type Employee = {
  id: number;
  name: string;
  jobTitle: string;
};

type FormState = {
  date: string;
  accountId: string;
  type: "in" | "out";
  amount: string;
  description: string;
  relatedAccountId: number | null;
  relatedPartyName: string;
  invoiceNumber: string;
  notes: string;
  repId: string;
  withVat: boolean;
};

const emptyForm: FormState = {
  date: new Date().toISOString().split("T")[0],
  accountId: "",
  type: "in",
  amount: "",
  description: "",
  relatedAccountId: null,
  relatedPartyName: "",
  invoiceNumber: "",
  notes: "",
  repId: "none",
  withVat: false,
};

function getAllDescendantIds(accounts: Account[], rootId: number): Set<number> {
  const result = new Set<number>();
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.add(current);
    accounts.filter(a => a.parentId === current).forEach(a => queue.push(a.id));
  }
  return result;
}

function getLeafAccounts(allAccounts: Account[], ids: Set<number>): Account[] {
  const inSet = allAccounts.filter(a => ids.has(a.id));
  const leaves = inSet.filter(a => !allAccounts.some(b => b.parentId === a.id));
  return leaves.length > 0 ? leaves : inSet;
}

function getCashAndBankAccounts(allAccounts: Account[]) {
  const root = allAccounts.find(a =>
    a.name.includes("البنوك والنقدية") || a.name.includes("النقدية والبنوك") || a.code === "1.1.1"
  );
  if (!root) return { cashAccounts: [], bankAccounts: [] };
  const children = allAccounts.filter(a => a.parentId === root.id);
  const cashRoot = children.find(a => a.name.includes("خزينة") || a.name.includes("نقد"));
  const bankRoot = children.find(a => a.name.includes("بنك") || a.name.includes("مصرف"));
  const cashIds = cashRoot ? getAllDescendantIds(allAccounts, cashRoot.id) : new Set<number>();
  const bankIds = bankRoot ? getAllDescendantIds(allAccounts, bankRoot.id) : new Set<number>();
  return {
    cashAccounts: getLeafAccounts(allAccounts, cashIds),
    bankAccounts: getLeafAccounts(allAccounts, bankIds),
  };
}

function getLeafAccountsAll(allAccounts: Account[]): Account[] {
  return allAccounts.filter(a => !allAccounts.some(b => b.parentId === a.id));
}

// ── Combobox ─────────────────────────────────────────────────
function AccountCombobox({ accounts, value, onChange, placeholder = "ابحث في دليل الحسابات...", error }: {
  accounts: Account[];
  value: number | null;
  onChange: (id: number | null, name: string) => void;
  placeholder?: string;
  error?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = accounts.find(a => a.id === value);
  const filtered = search.trim()
    ? accounts.filter(a => a.name.includes(search) || a.code.includes(search))
    : accounts;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setShowResults(false); setSearch(""); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          className={`w-full border rounded-md px-3 py-2 pr-9 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition ${error ? "border-red-500" : ""}`}
          placeholder={placeholder}
          value={showResults ? search : (selected ? `${selected.code} - ${selected.name}` : search)}
          onChange={e => { setSearch(e.target.value); setShowResults(true); if (!e.target.value) onChange(null, ""); }}
          onFocus={() => setShowResults(true)}
        />
        {(value || search) && (
          <button type="button" onClick={() => { onChange(null, ""); setSearch(""); setShowResults(false); }}
            className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">الجهة مطلوبة</p>}
      {showResults && (
        <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-52 overflow-y-auto">
          <button type="button" onClick={() => { onChange(null, ""); setSearch(""); setShowResults(false); }}
            className="w-full text-right px-3 py-2 text-sm text-muted-foreground hover:bg-muted">— بدون جهة —</button>
          {filtered.length === 0
            ? <div className="px-3 py-4 text-sm text-center text-muted-foreground">لا يوجد نتائج</div>
            : filtered.map(a => (
              <button key={a.id} type="button"
                onClick={() => { onChange(a.id, a.name); setSearch(""); setShowResults(false); }}
                className={`w-full text-right px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2 ${value === a.id ? "bg-primary/10 text-primary font-medium" : ""}`}>
                <span className="text-muted-foreground text-xs shrink-0">{a.code}</span>
                <span className="flex-1 text-right">{a.name}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

// ── طباعة الإيصال ────────────────────────────────────────────
function printReceipt(t: Transaction, accName: string) {
  const win = window.open("", "_blank", "width=700,height=600");
  if (!win) return;
  win.document.write(`
    <html dir="rtl"><head><title>إيصال مالي</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Arial', sans-serif; direction: rtl; padding: 20px; background: #fff; color: #000; }
      .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 15px; margin-bottom: 20px; }
      .header h1 { font-size: 22px; font-weight: bold; }
      .header h2 { font-size: 16px; color: #444; margin-top: 5px; }
      .receipt-no { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13px; }
      .type-badge { display: inline-block; padding: 4px 16px; border-radius: 20px; font-weight: bold; font-size: 14px;
        background: ${t.type === "in" ? "#d1fae5" : "#fee2e2"}; color: ${t.type === "in" ? "#065f46" : "#991b1b"}; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; }
      td { padding: 10px 14px; border: 1px solid #ddd; font-size: 13px; }
      td:first-child { background: #f9fafb; font-weight: bold; width: 35%; }
      .amount-row td { font-size: 16px; font-weight: bold; color: ${t.type === "in" ? "#065f46" : "#991b1b"}; }
      .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; color: #666; }
      .signature { border-top: 1px solid #000; width: 180px; text-align: center; padding-top: 5px; margin-top: 40px; }
      @media print { body { padding: 10px; } }
    </style></head><body>
    <div class="header">
      <h1>مصنع نبع صافيا لتعبئة المياه</h1>
      <h2>${t.type === "in" ? "إيصال استلام" : "إيصال صرف"}</h2>
    </div>
    <div class="receipt-no">
      <span>رقم الإيصال: <strong>#${t.id}</strong></span>
      <span>التاريخ: <strong>${t.date}</strong></span>
    </div>
    <div style="margin-bottom:10px">
      <span class="type-badge">${t.type === "in" ? "✓ استلام" : "✗ صرف"}</span>
    </div>
    <table>
      <tr><td>الحساب</td><td>${accName}</td></tr>
      <tr class="amount-row"><td>المبلغ</td><td>${parseFloat(t.amount).toFixed(2)} ريال سعودي</td></tr>
      <tr><td>البيان</td><td>${t.description}</td></tr>
      ${t.relatedPartyName ? `<tr><td>الجهة</td><td>${t.relatedPartyName}</td></tr>` : ""}
      ${t.invoiceNumber ? `<tr><td>رقم الفاتورة</td><td>${t.invoiceNumber}</td></tr>` : ""}
      ${t.repName ? `<tr><td>المندوب</td><td>${t.repName}</td></tr>` : ""}
      ${t.notes ? `<tr><td>ملاحظات</td><td>${t.notes}</td></tr>` : ""}
    </table>
    <div style="display:flex; justify-content:space-between; margin-top:50px;">
      <div style="width:180px;">
        <div style="font-size:12px; margin-bottom:40px;">اسم المستلم: ${t.relatedPartyName || '..................'}</div>
        <div style="border-top:1px solid #000; padding-top:5px; font-size:12px; text-align:center;">توقيع المستلم</div>
      </div>
      <div style="width:180px;">
        <div style="font-size:12px; margin-bottom:40px;">&nbsp;</div>
        <div style="border-top:1px solid #000; padding-top:5px; font-size:12px; text-align:center;">توقيع المسؤول</div>
      </div>
    </div>
    <div style="margin-top:15px; font-size:11px; color:#666; text-align:center;">
      تمت الطباعة: ${new Date().toLocaleDateString('ar-SA')}
    </div>
    <script>window.onload = () => { window.print(); window.close(); }</script>
    </body></html>
  `);
  win.document.close();
}

// ── FormContent ──────────────────────────────────────────────
type FormContentProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  editItem: Transaction | null;
  cashAccounts: Account[];
  bankAccounts: Account[];
  leafAccounts: Account[];
  allReps: Employee[];
  vatRate: number;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

function FormContent({ form, setForm, editItem, cashAccounts, bankAccounts, leafAccounts, allReps, vatRate, saving, onSubmit }: FormContentProps) {
  const [showErrors, setShowErrors] = useState(false);
  const amount = parseFloat(form.amount) || 0;
  const vatAmount = form.withVat ? (amount * vatRate / 100) : 0;
  const total = amount + vatAmount;

  const handleSubmit = (e: React.FormEvent) => {
    setShowErrors(true);
    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* الصف الأول: الحساب + نوع الحركة */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">الحساب <span className="text-red-500">*</span></label>
          <Select value={form.accountId} onValueChange={v => setForm(f => ({ ...f, accountId: v }))}>
            <SelectTrigger className={showErrors && !form.accountId ? "border-red-500" : ""}>
              <SelectValue placeholder="اختر الحساب..." />
            </SelectTrigger>
            <SelectContent>
              
              {cashAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
              
              {bankAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {showErrors && !form.accountId && <p className="text-xs text-red-500">الحساب مطلوب</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">نوع الحركة</label>
          <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as "in" | "out" }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in">استلام</SelectItem>
              <SelectItem value="out">صرف</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* الصف الثاني: الجهة */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">الجهة <span className="text-red-500">*</span></label>
        <AccountCombobox
          accounts={leafAccounts}
          value={form.relatedAccountId}
          onChange={(id, name) => setForm(f => ({ ...f, relatedAccountId: id, relatedPartyName: name }))}
          error={showErrors && !form.relatedAccountId}
        />
      </div>

      {/* الصف الثالث: التاريخ + المبلغ */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">التاريخ</label>
          <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">المبلغ (ر.س) <span className="text-red-500">*</span></label>
          <Input type="number" min="0" step="0.01" placeholder="0.00"
            className={showErrors && !form.amount ? "border-red-500" : ""}
            value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          {showErrors && !form.amount && <p className="text-xs text-red-500">المبلغ مطلوب</p>}
        </div>
      </div>

      {/* الصف الرابع: البيان + رقم الفاتورة */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">البيان <span className="text-red-500">*</span></label>
          <Input placeholder="وصف الحركة..."
            className={showErrors && !form.description ? "border-red-500" : ""}
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          {showErrors && !form.description && <p className="text-xs text-red-500">البيان مطلوب</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">رقم الفاتورة <span className="text-muted-foreground font-normal text-xs">(اختياري)</span></label>
          <Input placeholder="INV-0001" value={form.invoiceNumber}
            onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} />
        </div>
      </div>

      {/* الصف الخامس: المندوب + ملاحظات */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">المندوب <span className="text-muted-foreground font-normal text-xs">(اختياري)</span></label>
          <Select value={form.repId} onValueChange={v => setForm(f => ({ ...f, repId: v }))}>
            <SelectTrigger><SelectValue placeholder="اختر المندوب..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— بدون مندوب —</SelectItem>
              {allReps.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">ملاحظات <span className="text-muted-foreground font-normal text-xs">(اختياري)</span></label>
          <Input placeholder="أي ملاحظات..." value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </div>

      {/* ضريبة القيمة المضافة */}
      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2">
          <input type="checkbox" id="withVat" checked={form.withVat}
            onChange={e => setForm(f => ({ ...f, withVat: e.target.checked }))}
            className="w-4 h-4 accent-primary cursor-pointer" />
          <label htmlFor="withVat" className="text-sm font-medium cursor-pointer">
            ضريبة القيمة المضافة ({vatRate}%)
          </label>
        </div>
        {form.withVat && amount > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">الضريبة: </span>
            <span className="font-medium text-orange-600">{vatAmount.toFixed(2)} ر.س</span>
            <span className="mx-2">|</span>
            <span className="font-bold text-primary">{total.toFixed(2)} ر.س إجمالي</span>
          </div>
        )}
      </div>

      {/* ملخص المبلغ */}
      {amount > 0 && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">المبلغ الأساسي:</span>
            <span className="font-medium">{amount.toFixed(2)} ر.س</span>
          </div>
          {form.withVat && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">ضريبة القيمة المضافة ({vatRate}%):</span>
              <span className="font-medium text-orange-600">{vatAmount.toFixed(2)} ر.س</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1 font-bold">
            <span>الإجمالي:</span>
            <span className="text-primary">{total.toFixed(2)} ر.س</span>
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "جاري الحفظ..." : editItem ? "حفظ التعديلات" : "حفظ الحركة"}
      </Button>
    </form>
  );
}

// ── كشف الحسابات ─────────────────────────────────────────────
function AccountsBreakdown({ title, accounts, transactions, open, onClose }: {
  title: string; accounts: Account[]; transactions: Transaction[]; open: boolean; onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4 p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          {accounts.length === 0
            ? <div className="text-center py-6 text-muted-foreground text-sm">لا يوجد حسابات</div>
            : accounts.map(acc => {
              const inAmt = transactions.filter(t => t.accountId === acc.id && t.type === "in").reduce((s, t) => s + parseFloat(t.amount), 0);
              const outAmt = transactions.filter(t => t.accountId === acc.id && t.type === "out").reduce((s, t) => s + parseFloat(t.amount), 0);
              const balance = inAmt - outAmt;
              return (
                <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div>
                    <div className="font-medium text-sm">{acc.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">وارد: {inAmt.toFixed(2)} | صادر: {outAmt.toFixed(2)}</div>
                  </div>
                  <div className={`font-bold text-base ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>{balance.toFixed(2)} ر.س</div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ── الصفحة الرئيسية ──────────────────────────────────────────
export default function Treasury() {
  const { can } = useAuth();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [allReps, setAllReps] = useState<Employee[]>([]);
  const [vatRate, setVatRate] = useState(15);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<Transaction | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [activeTab, setActiveTab] = useState<"all" | "cash" | "bank">("all");
  const [showCashBreakdown, setShowCashBreakdown] = useState(false);
  const [showBankBreakdown, setShowBankBreakdown] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [filterText, setFilterText] = useState("");
  const [filterAmount, setFilterAmount] = useState("");

  const { cashAccounts, bankAccounts } = getCashAndBankAccounts(allAccounts);
  const leafAccounts = getLeafAccountsAll(allAccounts);

  useEffect(() => {
    fetch(`${BASE}/api/accounts`).then(r => r.json()).then(data => setAllAccounts(Array.isArray(data) ? data : [])).catch(() => {});
    fetch(`${BASE}/api/employees`).then(r => r.json()).then((data: Employee[]) => {
      setAllReps(Array.isArray(data) ? data : []);
    }).catch(() => {});
    fetch(`${BASE}/api/settings`).then(r => r.json()).then(data => {
      if (data?.vatRate) setVatRate(parseFloat(data.vatRate));
    }).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${BASE}/api/treasury/transactions`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => setError("تعذّر الاتصال بالخادم"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const calcStats = (accounts: Account[]) => {
    const ids = new Set(accounts.map(a => a.id));
    const inAmt = transactions.filter(t => ids.has(t.accountId!) && t.type === "in").reduce((s, t) => s + parseFloat(t.amount), 0);
    const outAmt = transactions.filter(t => ids.has(t.accountId!) && t.type === "out").reduce((s, t) => s + parseFloat(t.amount), 0);
    const relatedIn = transactions.filter(t => t.relatedAccountId && ids.has(t.relatedAccountId) && t.type === "out").reduce((s, t) => s + parseFloat(t.amount), 0);
    const relatedOut = transactions.filter(t => t.relatedAccountId && ids.has(t.relatedAccountId) && t.type === "in").reduce((s, t) => s + parseFloat(t.amount), 0);
    return { inAmt: inAmt + relatedIn, outAmt: outAmt + relatedOut, balance: (inAmt + relatedIn) - (outAmt + relatedOut) };
  };

  const cashStats = calcStats(cashAccounts);
  const bankStats = calcStats(bankAccounts);

  const filtered = transactions.filter(t => {
    const cashIds = new Set(cashAccounts.map(a => a.id));
    const bankIds = new Set(bankAccounts.map(a => a.id));
    const inCash = cashIds.has(t.accountId!) || (t.relatedAccountId ? cashIds.has(t.relatedAccountId) : false);
    const inBank = bankIds.has(t.accountId!) || (t.relatedAccountId ? bankIds.has(t.relatedAccountId) : false);
    if (activeTab === "cash" && !inCash) return false;
    if (activeTab === "bank" && !inBank) return false;
    if (filterDate && t.date !== filterDate) return false;
    if (filterAmount && parseFloat(t.amount) !== parseFloat(filterAmount)) return false;
    if (filterText) {
      const q = filterText.toLowerCase();
      if (!t.description?.toLowerCase().includes(q) && !t.relatedPartyName?.toLowerCase().includes(q) &&
          !t.invoiceNumber?.toLowerCase().includes(q) && !t.repName?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.description || !form.accountId || !form.relatedAccountId) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    setSaving(true);
    const amount = parseFloat(form.amount);
    const vatAmount = form.withVat ? (amount * vatRate / 100) : 0;
    const total = amount + vatAmount;
    const repEmployee = allReps.find(r => r.id === Number(form.repId));
    const isCash = cashAccounts.some(a => a.id === Number(form.accountId));
    const selectedAccount = allAccounts.find(a => a.id === Number(form.accountId));
    const relatedAccount = allAccounts.find(a => a.id === form.relatedAccountId);

    const body = {
      date: form.date,
      type: form.type,
      amount: total,
      description: form.description,
      relatedPartyName: form.relatedPartyName || null,
      relatedAccountId: form.relatedAccountId || null,
      accountId: Number(form.accountId),
      account: isCash ? "cash" : "bank",
      invoiceNumber: form.invoiceNumber || null,
      vatAmount: vatAmount > 0 ? vatAmount : null,
      notes: form.notes || null,
      repId: form.repId && form.repId !== "none" ? Number(form.repId) : null,
      repName: repEmployee?.name || null,
      source: "manual",
    };

    try {
      if (editItem) {
        const r = await fetch(`${BASE}/api/treasury/transactions/${editItem.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error();
        toast({ title: "تم التعديل بنجاح" });
        setEditItem(null);
      } else {
        const r = await fetch(`${BASE}/api/treasury/transactions`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error();

        // ✅ قيد محاسبي تلقائي
        if (selectedAccount && relatedAccount) {
          const lines = form.type === "out" ? [
            { accountId: relatedAccount.id, accountName: relatedAccount.name, accountCode: relatedAccount.code, debit: String(amount), credit: "0", notes: null },
            ...(vatAmount > 0 ? [{ accountId: 0, accountName: "ضريبة القيمة المضافة", accountCode: "VAT", debit: String(vatAmount), credit: "0", notes: null }] : []),
            { accountId: selectedAccount.id, accountName: selectedAccount.name, accountCode: selectedAccount.code, debit: "0", credit: String(total), notes: null },
          ] : [
            { accountId: selectedAccount.id, accountName: selectedAccount.name, accountCode: selectedAccount.code, debit: String(total), credit: "0", notes: null },
            { accountId: relatedAccount.id, accountName: relatedAccount.name, accountCode: relatedAccount.code, debit: "0", credit: String(amount), notes: null },
            ...(vatAmount > 0 ? [{ accountId: 0, accountName: "ضريبة القيمة المضافة", accountCode: "VAT", debit: "0", credit: String(vatAmount), notes: null }] : []),
          ];

          await fetch(`${BASE}/api/journal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: form.date, description: form.description, reference: form.invoiceNumber || null, referenceId: null, referenceType: "treasury_transaction", source: "treasury", lines }),
          }).catch(() => {});
        }

        toast({ title: "تمت الإضافة وتم إنشاء القيد المحاسبي" });
        setIsOpen(false);
      }
      setForm(emptyForm);
      load();
    } catch {
      toast({ title: "خطأ في الحفظ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف هذه الحركة؟")) return;
    try {
      await fetch(`${BASE}/api/treasury/transactions/${id}`, { method: "DELETE" });
      toast({ title: "تم الحذف" });
      load();
    } catch {
      toast({ title: "خطأ في الحذف", variant: "destructive" });
    }
  };

  // ✅ إصلاح openEdit — كل البيانات تتعبى صح
  const openEdit = (t: Transaction) => {
    setEditItem(t);
    setForm({
      date: t.date,
      accountId: t.accountId ? String(t.accountId) : "",
      type: t.type,
      amount: t.vatAmount ? String(parseFloat(t.amount) - parseFloat(t.vatAmount)) : t.amount,
      description: t.description,
      relatedAccountId: t.relatedAccountId ?? null,
      relatedPartyName: t.relatedPartyName ?? "",
      invoiceNumber: t.invoiceNumber ?? "",
      notes: t.notes ?? "",
      repId: t.repId ? String(t.repId) : "",
      withVat: !!t.vatAmount && parseFloat(t.vatAmount) > 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">خزينة وبنوك</h1>
        {can("edit") && (
          <Button onClick={() => { setForm(emptyForm); setIsOpen(true); }}>
            <Plus className="ml-2 w-4 h-4" /> حركة مالية
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="flex-1"><p className="font-medium">{error}</p></div>
          <Button variant="outline" size="sm" onClick={load} className="border-red-300 text-red-700">إعادة المحاولة</Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowCashBreakdown(true)}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-green-700">رصيد الخزينة</CardTitle>
            <span className="text-xs text-green-500">اضغط للكشف ←</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">{cashStats.balance.toFixed(2)} ر.س</div>
            <div className="text-xs text-green-600 mt-1">وارد: {cashStats.inAmt.toFixed(2)} | صادر: {cashStats.outAmt.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowBankBreakdown(true)}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-blue-700">رصيد البنوك</CardTitle>
            <span className="text-xs text-blue-500">اضغط للكشف ←</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">{bankStats.balance.toFixed(2)} ر.س</div>
            <div className="text-xs text-blue-600 mt-1">وارد: {bankStats.inAmt.toFixed(2)} | صادر: {bankStats.outAmt.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b">
        {[{ key: "all", label: "الكل" }, { key: "cash", label: "الخزينة" }, { key: "bank", label: "البنوك" }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as "all" | "cash" | "bank")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input className="pr-9" placeholder="بيان / جهة / فاتورة / مندوب..."
            value={filterText} onChange={e => setFilterText(e.target.value)} />
        </div>
        <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        <Input type="number" placeholder="المبلغ..." value={filterAmount} onChange={e => setFilterAmount(e.target.value)} />
      </div>

      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>الحساب</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>البيان</TableHead>
              <TableHead>الجهة</TableHead>
              <TableHead>الفاتورة</TableHead>
              <TableHead>المندوب</TableHead>
              <TableHead>الملاحظات</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">{error ? "لم يتم تحميل البيانات" : "لا يوجد حركات"}</TableCell></TableRow>
            ) : filtered.map(t => {
              const accName = allAccounts.find(a => a.id === t.accountId)?.name ?? (t.account === "bank" ? "البنك" : "الخزينة");
              return (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">{t.date}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{accName}</TableCell>
                  <TableCell className={`font-medium text-sm ${t.type === "in" ? "text-green-600" : "text-red-600"}`}>
                    {t.type === "in" ? <><ArrowDownRight className="inline w-4 h-4 ml-1" />استلام</> : <><ArrowUpRight className="inline w-4 h-4 ml-1" />صرف</>}
                  </TableCell>
                  <TableCell className="text-sm">{t.description}</TableCell>
                  <TableCell className="text-sm">{t.relatedPartyName || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.invoiceNumber || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.repName || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.notes || "-"}</TableCell>
                  <TableCell className={`font-bold text-sm ${t.type === "in" ? "text-green-600" : "text-red-600"}`}>
                    {t.type === "in" ? "+" : "-"}{parseFloat(t.amount).toFixed(2)} ر.س
                    {t.vatAmount && parseFloat(t.vatAmount) > 0 && (
                      <div className="text-xs text-orange-500 font-normal">ضريبة: {parseFloat(t.vatAmount).toFixed(2)}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="طباعة" onClick={() => printReceipt(t, accName)}>
                        <Printer className="w-4 h-4 text-gray-500" />
                      </Button>
                      {t.source === "manual" && can("edit") && (
                        <Button variant="ghost" size="icon" title="تعديل" onClick={() => openEdit(t)}>
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                      )}
                      {t.source === "manual" && can("delete") && (
                        <Button variant="ghost" size="icon" title="حذف" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AccountsBreakdown title="كشف الخزائن" accounts={cashAccounts} transactions={transactions} open={showCashBreakdown} onClose={() => setShowCashBreakdown(false)} />
      <AccountsBreakdown title="كشف البنوك" accounts={bankAccounts} transactions={transactions} open={showBankBreakdown} onClose={() => setShowBankBreakdown(false)} />

      {/* ✅ نافذة كبيرة max-w-2xl */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>إضافة حركة مالية</DialogTitle></DialogHeader>
          <FormContent form={form} setForm={setForm} editItem={null}
            cashAccounts={cashAccounts} bankAccounts={bankAccounts}
            leafAccounts={leafAccounts} allReps={allReps} vatRate={vatRate} saving={saving} onSubmit={handleSave} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل الحركة المالية</DialogTitle></DialogHeader>
          <FormContent form={form} setForm={setForm} editItem={editItem}
            cashAccounts={cashAccounts} bankAccounts={bankAccounts}
            leafAccounts={leafAccounts} allReps={allReps} vatRate={vatRate} saving={saving} onSubmit={handleSave} />
        </DialogContent>
      </Dialog>
    </div>
  );
}