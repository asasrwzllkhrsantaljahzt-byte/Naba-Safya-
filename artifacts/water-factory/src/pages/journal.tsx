import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Printer, Eye, Search, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Account = {
  id: number; code: string; name: string; type: string;
  parentId: number | null; level: number;
};

type JournalLine = {
  id?: number;
  accountId: string;
  accountName: string;
  accountCode: string;
  debit: string;
  credit: string;
  notes: string;
};

type JournalEntry = {
  id: number;
  entryNumber: string;
  date: string;
  description: string;
  source: string;
  referenceType?: string;
  createdAt: string;
  lines: JournalLine[];
};

const emptyLine = (): JournalLine => ({
  accountId: "", accountName: "", accountCode: "",
  debit: "", credit: "", notes: "",
});

// ── Combobox الحسابات ────────────────────────────────────────
function AccountCombobox({ accounts, value, onChange }: {
  accounts: Account[];
  value: string;
  onChange: (id: string, name: string, code: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = accounts.find(a => String(a.id) === value);

  const filtered = search.trim()
    ? accounts.filter(a => a.name.includes(search) || a.code.includes(search))
    : accounts;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false); setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute right-2 top-2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          className="w-full border rounded px-2 py-1.5 pr-7 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="ابحث عن حساب..."
          value={show ? search : (selected ? `${selected.code} - ${selected.name}` : "")}
          onChange={e => { setSearch(e.target.value); setShow(true); if (!e.target.value) onChange("", "", ""); }}
          onFocus={() => setShow(true)}
        />
        {value && (
          <button type="button" onClick={() => { onChange("", "", ""); setSearch(""); setShow(false); }}
            className="absolute left-2 top-2 text-muted-foreground hover:text-foreground">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {show && (
        <div className="absolute z-50 w-full mt-0.5 bg-card border rounded shadow-lg max-h-40 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-center text-muted-foreground">لا يوجد نتائج</div>
          ) : filtered.map(a => (
            <button key={a.id} type="button"
              onClick={() => { onChange(String(a.id), a.name, a.code); setSearch(""); setShow(false); }}
              className={`w-full text-right px-2 py-1.5 text-xs hover:bg-muted flex items-center justify-between gap-2 ${value === String(a.id) ? "bg-primary/10 text-primary font-medium" : ""}`}>
              <span className="text-muted-foreground shrink-0">{a.code}</span>
              <span className="flex-1 text-right">{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── طباعة القيد ──────────────────────────────────────────────
function printEntry(entry: JournalEntry) {
  const totalDebit = entry.lines.reduce((s, l) => s + parseFloat(l.debit || "0"), 0);
  const totalCredit = entry.lines.reduce((s, l) => s + parseFloat(l.credit || "0"), 0);
  const win = window.open("", "_blank", "width=700,height=600");
  if (!win) return;
  win.document.write(`
    <html dir="rtl"><head><title>قيد ${entry.entryNumber}</title>
    <style>
      body { font-family: Arial; padding: 20px; direction: rtl; font-size: 13px; }
      h2 { text-align: center; margin-bottom: 5px; }
      .info { display: flex; gap: 30px; margin-bottom: 15px; font-size: 12px; color: #555; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #ccc; padding: 6px 10px; }
      th { background: #f5f5f5; font-weight: bold; }
      .total { font-weight: bold; background: #f9f9f9; }
      .balanced { color: green; text-align: center; margin-top: 10px; font-size: 12px; }
    </style></head><body>
    <h2>قيد محاسبي — مصنع نبع صافيا</h2>
    <div class="info">
      <span>رقم القيد: <b>${entry.entryNumber}</b></span>
      <span>التاريخ: <b>${entry.date}</b></span>
      <span>البيان: <b>${entry.description}</b></span>
      ${entry.referenceType ? `<span>المرجع: <b>${entry.referenceType}</b></span>` : ""}
    </div>
    <table>
      <thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th><th>ملاحظات</th></tr></thead>
      <tbody>
        ${entry.lines.map(l => `
          <tr>
            <td>${l.accountCode} - ${l.accountName}</td>
            <td style="text-align:center">${parseFloat(l.debit || "0") > 0 ? parseFloat(l.debit).toFixed(2) : "-"}</td>
            <td style="text-align:center">${parseFloat(l.credit || "0") > 0 ? parseFloat(l.credit).toFixed(2) : "-"}</td>
            <td>${l.notes || ""}</td>
          </tr>
        `).join("")}
        <tr class="total">
          <td>الإجمالي</td>
          <td style="text-align:center">${totalDebit.toFixed(2)}</td>
          <td style="text-align:center">${totalCredit.toFixed(2)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <p class="balanced">✓ القيد متزن</p>
    <script>window.onload = () => { window.print(); window.close(); }</script>
    </body></html>
  `);
  win.document.close();
}

// ── الصفحة الرئيسية ──────────────────────────────────────────
export default function Journal() {
  const { can } = useAuth();
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);

  const [filterText, setFilterText] = useState("");

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  useEffect(() => {
    fetch(`${BASE}/api/accounts`)
      .then(r => r.json())
      .then(data => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch(`${BASE}/api/journal`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setError("تعذّر تحميل القيود"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateLine = (idx: number, field: keyof JournalLine, val: string) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      if (field === "debit" && val) return { ...l, debit: val, credit: "" };
      if (field === "credit" && val) return { ...l, credit: val, debit: "" };
      return { ...l, [field]: val };
    }));
  };

  const addLine = () => {
    if (lines.length < 10) setLines(prev => [...prev, emptyLine()]);
    else toast({ title: "الحد الأقصى 10 أسطر", variant: "destructive" });
  };

  const removeLine = (idx: number) => {
    if (lines.length > 2) setLines(prev => prev.filter((_, i) => i !== idx));
    else toast({ title: "يجب إبقاء سطرين على الأقل", variant: "destructive" });
  };

  const handleSave = async () => {
    if (!description.trim()) {
      toast({ title: "البيان مطلوب", variant: "destructive" }); return;
    }
    if (!isBalanced) {
      toast({ title: "القيد غير متزن!", variant: "destructive" }); return;
    }
    const validLines = lines.filter(l => l.accountId);
    if (validLines.length < 2) {
      toast({ title: "يجب اختيار حسابين على الأقل", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/journal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, description, reference, lines: validLines }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error);
      }
      toast({ title: "تم حفظ القيد بنجاح" });
      setIsOpen(false);
      setLines([emptyLine(), emptyLine()]);
      setDescription(""); setReference("");
      load();
    } catch (err: any) {
      toast({ title: err.message || "خطأ في الحفظ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف هذا القيد؟")) return;
    try {
      await fetch(`${BASE}/api/journal/${id}`, { method: "DELETE" });
      toast({ title: "تم الحذف" });
      load();
    } catch {
      toast({ title: "خطأ في الحذف", variant: "destructive" });
    }
  };

  const filtered = entries.filter(e =>
    !filterText ||
    e.entryNumber.includes(filterText) ||
    e.description.includes(filterText) ||
    e.date.includes(filterText)
  );

  return (
    <div className="space-y-5">

      {/* العنوان */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">القيود المحاسبية</h1>
        {can("edit") && (
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="ml-2 w-4 h-4" /> قيد جديد
          </Button>
        )}
      </div>

      {/* خطأ */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="flex-1">{error}</p>
          <Button variant="outline" size="sm" onClick={load} className="border-red-300 text-red-700">
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* بحث */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input className="pr-9" placeholder="ابحث برقم القيد أو البيان أو التاريخ..."
          value={filterText} onChange={e => setFilterText(e.target.value)} />
      </div>

      {/* جدول القيود */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم القيد</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>البيان</TableHead>
              <TableHead>المرجع</TableHead>
              <TableHead>إجمالي المدين</TableHead>
              <TableHead>عدد الأسطر</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">لا يوجد قيود</TableCell></TableRow>
            ) : filtered.map(e => {
              const total = e.lines.reduce((s, l) => s + parseFloat(l.debit || "0"), 0);
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-mono font-medium text-primary">{e.entryNumber}</TableCell>
                  <TableCell>{e.date}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{e.referenceType || "-"}</TableCell>
                  <TableCell className="font-bold">{total.toFixed(2)} ر.س</TableCell>
                  <TableCell className="text-muted-foreground">{e.lines.length} أسطر</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="عرض" onClick={() => setViewEntry(e)}>
                        <Eye className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" title="طباعة" onClick={() => printEntry(e)}>
                        <Printer className="w-4 h-4 text-gray-500" />
                      </Button>
                      {can("delete") && e.source === "manual" && (
                        <Button variant="ghost" size="icon" title="حذف" onClick={() => handleDelete(e.id)}>
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

      {/* نافذة إضافة قيد */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>إضافة قيد محاسبي جديد</DialogTitle></DialogHeader>
          <div className="space-y-4">

            {/* بيانات القيد */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">التاريخ</label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">البيان</label>
                <Input placeholder="وصف القيد..." value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  المرجع
                  <span className="text-muted-foreground font-normal mr-1 text-xs">(اختياري)</span>
                </label>
                <Input placeholder="مثال: فاتورة رقم 123" value={reference} onChange={e => setReference(e.target.value)} />
              </div>
            </div>

            {/* جدول الأسطر */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right p-2 font-medium w-[35%]">الحساب</th>
                    <th className="text-center p-2 font-medium w-[15%]">مدين</th>
                    <th className="text-center p-2 font-medium w-[15%]">دائن</th>
                    <th className="text-right p-2 font-medium w-[28%]">ملاحظات</th>
                    <th className="p-2 w-[7%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-1.5">
                        <AccountCombobox
                          accounts={accounts}
                          value={line.accountId}
                          onChange={(id, name, code) => {
                            setLines(prev => prev.map((l, i) => i === idx ? { ...l, accountId: id, accountName: name, accountCode: code } : l));
                          }}
                        />
                      </td>
                      <td className="p-1.5">
                        <Input type="number" min="0" step="0.01" placeholder="0.00"
                          className="text-center text-green-700 font-medium"
                          value={line.debit}
                          onChange={e => updateLine(idx, "debit", e.target.value)} />
                      </td>
                      <td className="p-1.5">
                        <Input type="number" min="0" step="0.01" placeholder="0.00"
                          className="text-center text-red-700 font-medium"
                          value={line.credit}
                          onChange={e => updateLine(idx, "credit", e.target.value)} />
                      </td>
                      <td className="p-1.5">
                        <Input placeholder="ملاحظات..." value={line.notes}
                          onChange={e => updateLine(idx, "notes", e.target.value)} />
                      </td>
                      <td className="p-1.5 text-center">
                        <Button variant="ghost" size="icon" className="w-7 h-7"
                          onClick={() => removeLine(idx)}>
                          <X className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-bold">
                    <td className="p-2 text-sm">الإجمالي ({lines.length}/10)</td>
                    <td className={`p-2 text-center ${isBalanced ? "text-green-600" : "text-red-600"}`}>
                      {totalDebit.toFixed(2)}
                    </td>
                    <td className={`p-2 text-center ${isBalanced ? "text-green-600" : "text-red-600"}`}>
                      {totalCredit.toFixed(2)}
                    </td>
                    <td colSpan={2} className="p-2 text-center text-xs">
                      {totalDebit > 0
                        ? isBalanced
                          ? <span className="text-green-600 font-medium">✓ القيد متزن</span>
                          : <span className="text-red-600">✗ القيد غير متزن</span>
                        : ""}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* أزرار */}
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={addLine} disabled={lines.length >= 10}>
                <Plus className="ml-1 w-4 h-4" /> إضافة سطر
              </Button>
              <Button onClick={handleSave} disabled={!isBalanced || saving}>
                {saving ? "جاري الحفظ..." : "حفظ القيد"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة عرض القيد */}
      <Dialog open={!!viewEntry} onOpenChange={v => !v && setViewEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>قيد رقم {viewEntry?.entryNumber}</DialogTitle>
          </DialogHeader>
          {viewEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground">التاريخ: </span>{viewEntry.date}</div>
                <div><span className="text-muted-foreground">البيان: </span>{viewEntry.description}</div>
                {viewEntry.referenceType && <div><span className="text-muted-foreground">المرجع: </span>{viewEntry.referenceType}</div>}
              </div>
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right p-2">الحساب</th>
                    <th className="text-center p-2">مدين</th>
                    <th className="text-center p-2">دائن</th>
                    <th className="text-right p-2">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {viewEntry.lines.map((l, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{l.accountCode} - {l.accountName}</td>
                      <td className="p-2 text-center text-green-600 font-medium">
                        {parseFloat(l.debit || "0") > 0 ? parseFloat(l.debit).toFixed(2) : "-"}
                      </td>
                      <td className="p-2 text-center text-red-600 font-medium">
                        {parseFloat(l.credit || "0") > 0 ? parseFloat(l.credit).toFixed(2) : "-"}
                      </td>
                      <td className="p-2 text-muted-foreground text-xs">{l.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-bold">
                    <td className="p-2">الإجمالي</td>
                    <td className="p-2 text-center text-green-600">
                      {viewEntry.lines.reduce((s, l) => s + parseFloat(l.debit || "0"), 0).toFixed(2)}
                    </td>
                    <td className="p-2 text-center text-red-600">
                      {viewEntry.lines.reduce((s, l) => s + parseFloat(l.credit || "0"), 0).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => printEntry(viewEntry)}>
                  <Printer className="ml-2 w-4 h-4" /> طباعة
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}