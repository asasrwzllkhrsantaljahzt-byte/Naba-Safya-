import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowUpRight, ArrowDownRight, Wallet, Building2, Edit, Trash2, RefreshCw, AlertCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── الأنواع ──────────────────────────────────────────────────
type Transaction = {
  id: number;
  date: string;
  type: "in" | "out";
  amount: string;
  description: string;
  source: string;
  relatedPartyName?: string;
  relatedAccountId?: number;
  invoiceNumber?: string;
  notes?: string;
  reference?: string;
  account?: "cash" | "bank";
};

type Account = {
  id: number;
  code: string;
  name: string;
  type: string;
};

type FormState = {
  date: string;
  account: "cash" | "bank";
  type: "in" | "out";
  amount: string;
  description: string;
  relatedAccountId: number | null;
  relatedPartyName: string;
  invoiceNumber: string;
  notes: string;
};

const emptyForm: FormState = {
  date: new Date().toISOString().split("T")[0],
  account: "cash",
  type: "in",
  amount: "",
  description: "",
  relatedAccountId: null,
  relatedPartyName: "",
  invoiceNumber: "",
  notes: "",
};

const typeLabels: Record<string, { label: string; color: string }> = {
  "in-cash":  { label: "استلام نقدي",  color: "text-green-600"  },
  "out-cash": { label: "صرف نقدي",     color: "text-red-600"    },
  "in-bank":  { label: "استلام بنك",   color: "text-blue-600"   },
  "out-bank": { label: "صرف بنك",      color: "text-orange-600" },
};

// ── Combobox دليل الحسابات ───────────────────────────────────
function AccountCombobox({
  accounts,
  value,
  onChange,
}: {
  accounts: Account[];
  value: number | null;
  onChange: (id: number | null, name: string) => void;
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
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowResults(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          className="w-full border rounded-md px-3 py-2 pr-9 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          placeholder="ابحث في دليل الحسابات بالاسم أو الكود..."
          value={showResults ? search : (selected ? `${selected.code} - ${selected.name}` : search)}
          onChange={e => {
            setSearch(e.target.value);
            setShowResults(true);
            if (!e.target.value) onChange(null, "");
          }}
          onFocus={() => setShowResults(true)}
        />
        {(value || search) && (
          <button
            type="button"
            onClick={() => { onChange(null, ""); setSearch(""); setShowResults(false); }}
            className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-center text-muted-foreground">لا يوجد نتائج</div>
          ) : filtered.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                onChange(a.id, a.name);
                setSearch("");
                setShowResults(false);
              }}
              className={`w-full text-right px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2 ${value === a.id ? "bg-primary/10 text-primary font-medium" : ""}`}
            >
              <span className="text-muted-foreground text-xs shrink-0">{a.code}</span>
              <span className="flex-1 text-right">{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── FormContent ──────────────────────────────────────────────
type FormContentProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  editItem: Transaction | null;
  accounts: Account[];
  onSubmit: (e: React.FormEvent) => void;
};

function FormContent({ form, setForm, editItem, accounts, onSubmit }: FormContentProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">

      {/* الحساب ونوع الحركة */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">الحساب</label>
          <Select value={form.account} onValueChange={v => setForm(f => ({ ...f, account: v as "cash" | "bank" }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">الخزينة (نقدي)</SelectItem>
              <SelectItem value="bank">البنك</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">نوع الحركة</label>
          <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as "in" | "out" }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in">{form.account === "bank" ? "استلام بنك" : "استلام نقدي"}</SelectItem>
              <SelectItem value="out">{form.account === "bank" ? "صرف بنك" : "صرف نقدي"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* الجهة من دليل الحسابات */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          الجهة
          <span className="text-muted-foreground font-normal mr-1 text-xs">(من دليل الحسابات)</span>
        </label>
        <AccountCombobox
          accounts={accounts}
          value={form.relatedAccountId}
          onChange={(id, name) => setForm(f => ({ ...f, relatedAccountId: id, relatedPartyName: name }))}
        />
      </div>

      {/* التاريخ والمبلغ */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">التاريخ</label>
          <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">المبلغ (ر.س)</label>
          <Input type="number" min="0" step="0.01" placeholder="0.00"
            value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
        </div>
      </div>

      {/* البيان */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">البيان</label>
        <Input placeholder="وصف الحركة..." value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>

      {/* رقم الفاتورة */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          رقم الفاتورة
          <span className="text-muted-foreground font-normal mr-1 text-xs">(اختياري)</span>
        </label>
        <Input placeholder="مثال: INV-0001" value={form.invoiceNumber}
          onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} />
      </div>

      {/* ملاحظات */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          ملاحظات
          <span className="text-muted-foreground font-normal mr-1 text-xs">(اختياري)</span>
        </label>
        <Input placeholder="أي ملاحظات إضافية..." value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>

      <Button type="submit" className="w-full">
        {editItem ? "حفظ التعديلات" : "حفظ الحركة"}
      </Button>
    </form>
  );
}

// ── الصفحة الرئيسية ──────────────────────────────────────────
export default function Treasury() {
  const { can } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<Transaction | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [activeTab, setActiveTab] = useState<"all" | "cash" | "bank">("all");

  // جلب دليل الحسابات
  useEffect(() => {
    fetch(`${BASE}/api/accounts`)
      .then(r => r.json())
      .then(data => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${BASE}/api/treasury/transactions`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => setError("تعذّر الاتصال بالخادم — تأكد أن الباك اند شغّال"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = transactions.filter(t => {
    if (activeTab === "cash") return t.account === "cash" || !t.account;
    if (activeTab === "bank") return t.account === "bank";
    return true;
  });

  const cashIn  = transactions.filter(t => t.type === "in"  && (t.account === "cash" || !t.account)).reduce((s, t) => s + parseFloat(t.amount), 0);
  const cashOut = transactions.filter(t => t.type === "out" && (t.account === "cash" || !t.account)).reduce((s, t) => s + parseFloat(t.amount), 0);
  const bankIn  = transactions.filter(t => t.type === "in"  && t.account === "bank").reduce((s, t) => s + parseFloat(t.amount), 0);
  const bankOut = transactions.filter(t => t.type === "out" && t.account === "bank").reduce((s, t) => s + parseFloat(t.amount), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.description) {
      toast({ title: "المبلغ والبيان مطلوبان", variant: "destructive" });
      return;
    }
    const body = {
      date: form.date,
      type: form.type,
      amount: parseFloat(form.amount),
      description: form.description,
      relatedPartyName: form.relatedPartyName || null,
      relatedAccountId: form.relatedAccountId || null,
      invoiceNumber: form.invoiceNumber || null,
      notes: form.notes || null,
      source: "manual",
      account: form.account,
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
        toast({ title: "تمت الإضافة بنجاح" });
        setIsOpen(false);
      }
      setForm(emptyForm);
      load();
    } catch {
      toast({ title: "خطأ في الحفظ", variant: "destructive" });
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

  const openEdit = (t: Transaction) => {
    setEditItem(t);
    setForm({
      date: t.date,
      account: t.account ?? "cash",
      type: t.type,
      amount: t.amount,
      description: t.description,
      relatedAccountId: t.relatedAccountId ?? null,
      relatedPartyName: t.relatedPartyName ?? "",
      invoiceNumber: t.invoiceNumber ?? "",
      notes: t.notes ?? "",
    });
  };

  return (
    <div className="space-y-6">

      {/* العنوان */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">خزينة وبنوك</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} title="تحديث">
            <RefreshCw className="w-4 h-4" />
          </Button>
          {can("edit") && (
            <Button onClick={() => { setForm(emptyForm); setIsOpen(true); }}>
              <Plus className="ml-2 w-4 h-4" /> حركة مالية
            </Button>
          )}
        </div>
      </div>

      {/* رسالة خطأ */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{error}</p>
            <p className="text-sm mt-0.5">تأكد أن الخادم يعمل ثم اضغط تحديث</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="border-red-300 text-red-700 hover:bg-red-100">
            <RefreshCw className="w-3.5 h-3.5 ml-1" /> إعادة المحاولة
          </Button>
        </div>
      )}

      {/* بطاقات الأرصدة */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-green-700">رصيد الخزينة</CardTitle>
            <Wallet className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">{(cashIn - cashOut).toFixed(2)} ر.س</div>
            <div className="text-xs text-green-600 mt-1">وارد: {cashIn.toFixed(2)} | صادر: {cashOut.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-blue-700">رصيد البنوك</CardTitle>
            <Building2 className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">{(bankIn - bankOut).toFixed(2)} ر.س</div>
            <div className="text-xs text-blue-600 mt-1">وارد: {bankIn.toFixed(2)} | صادر: {bankOut.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* تبويبات */}
      <div className="flex gap-2 border-b">
        {[{ key: "all", label: "الكل" }, { key: "cash", label: "الخزينة" }, { key: "bank", label: "البنك" }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as "all" | "cash" | "bank")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* جدول الحركات */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>البيان</TableHead>
              <TableHead>الجهة</TableHead>
              <TableHead>الفاتورة</TableHead>
              <TableHead>المبلغ</TableHead>
              {can("edit") && <TableHead>إجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin" /> جاري التحميل...
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {error ? "لم يتم تحميل البيانات" : "لا يوجد حركات"}
                </TableCell>
              </TableRow>
            ) : filtered.map(t => {
              const key = `${t.type}-${t.account ?? "cash"}`;
              const label = typeLabels[key] ?? { label: t.type === "in" ? "وارد" : "صادر", color: "" };
              return (
                <TableRow key={t.id}>
                  <TableCell>{t.date}</TableCell>
                  <TableCell className={`font-medium ${label.color}`}>
                    {t.type === "in"
                      ? <ArrowDownRight className="inline w-4 h-4 ml-1" />
                      : <ArrowUpRight className="inline w-4 h-4 ml-1" />}
                    {label.label}
                  </TableCell>
                  <TableCell>
                    <div>{t.description}</div>
                    {t.notes && <div className="text-xs text-muted-foreground mt-0.5">{t.notes}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.relatedPartyName || "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{t.invoiceNumber || "-"}</TableCell>
                  <TableCell className={`font-bold ${t.type === "in" ? "text-green-600" : "text-red-600"}`}>
                    {t.type === "in" ? "+" : "-"}{parseFloat(t.amount).toFixed(2)} ر.س
                  </TableCell>
                  {can("edit") && (
                    <TableCell>
                      <div className="flex gap-1">
                        {t.source === "manual" && (
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                        )}
                        {can("delete") && t.source === "manual" && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* نافذة الإضافة */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>إضافة حركة مالية</DialogTitle></DialogHeader>
          <FormContent form={form} setForm={setForm} editItem={null} accounts={accounts} onSubmit={handleSave} />
        </DialogContent>
      </Dialog>

      {/* نافذة التعديل */}
      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تعديل الحركة المالية</DialogTitle></DialogHeader>
          <FormContent form={form} setForm={setForm} editItem={editItem} accounts={accounts} onSubmit={handleSave} />
        </DialogContent>
      </Dialog>
    </div>
  );
}