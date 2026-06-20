import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  asset:    { label: "أصل",         color: "bg-blue-100 text-blue-800" },
  liability:{ label: "التزام",      color: "bg-red-100 text-red-800" },
  equity:   { label: "حقوق ملكية",  color: "bg-purple-100 text-purple-800" },
  revenue:  { label: "إيراد",       color: "bg-green-100 text-green-800" },
  expense:  { label: "مصروف",       color: "bg-orange-100 text-orange-800" },
};

const DEFAULT_ACCOUNTS = [
  { code: "1001", name: "الخزينة - النقدية", type: "asset" },
  { code: "1002", name: "البنك", type: "asset" },
  { code: "1003", name: "ذمم مدينة - عملاء", type: "asset" },
  { code: "1004", name: "المخزون", type: "asset" },
  { code: "2001", name: "ذمم دائنة - موردون", type: "liability" },
  { code: "2002", name: "الالتزامات المستحقة", type: "liability" },
  { code: "3001", name: "رأس المال", type: "equity" },
  { code: "4001", name: "إيرادات المبيعات", type: "revenue" },
  { code: "5001", name: "تكلفة البضاعة المباعة", type: "expense" },
  { code: "5002", name: "المصروفات التشغيلية", type: "expense" },
];

type Account = {
  id: number; code: string; name: string; type: string;
  openingBalance: number; notes?: string | null;
};

const emptyForm = { code: "", name: "", type: "asset", openingBalance: "0", notes: "" };

export default function Accounts() {
  const { toast } = useToast();
  const { can } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [seeding, setSeeding] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`${BASE}/api/accounts`)
      .then(r => r.json())
      .then(setAccounts)
      .catch(() => toast({ title: "خطأ", description: "فشل في جلب البيانات", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialog(true); };
  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({ code: a.code, name: a.name, type: a.type, openingBalance: String(a.openingBalance), notes: a.notes ?? "" });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) { toast({ title: "خطأ", description: "رمز الحساب والاسم مطلوبان", variant: "destructive" }); return; }
    const body = { code: form.code, name: form.name, type: form.type, openingBalance: parseFloat(form.openingBalance) || 0, notes: form.notes || null };
    try {
      if (editing) {
        await fetch(`${BASE}/api/accounts/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        toast({ title: "تم التعديل" });
      } else {
        await fetch(`${BASE}/api/accounts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        toast({ title: "تمت الإضافة" });
      }
      setDialog(false);
      load();
    } catch { toast({ title: "خطأ", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف هذا الحساب؟")) return;
    await fetch(`${BASE}/api/accounts/${id}`, { method: "DELETE" });
    toast({ title: "تم الحذف" });
    load();
  };

  const seedDefaults = async () => {
    setSeeding(true);
    for (const acc of DEFAULT_ACCOUNTS) {
      const exists = accounts.find(a => a.code === acc.code);
      if (!exists) {
        await fetch(`${BASE}/api/accounts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...acc, openingBalance: 0 }) });
      }
    }
    toast({ title: "تم إضافة الحسابات الافتراضية" });
    setSeeding(false);
    load();
  };

  const totalAssets = accounts.filter(a => a.type === "asset").reduce((s, a) => s + a.openingBalance, 0);
  const totalLiabilities = accounts.filter(a => a.type === "liability").reduce((s, a) => s + a.openingBalance, 0);
  const totalEquity = accounts.filter(a => a.type === "equity").reduce((s, a) => s + a.openingBalance, 0);

  const grouped = Object.keys(TYPE_LABELS).map(type => ({
    type,
    ...TYPE_LABELS[type],
    items: accounts.filter(a => a.type === type),
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">دليل الحسابات</h1>
          <p className="text-sm text-muted-foreground mt-1">الأرصدة الافتتاحية تؤثر على قوائم الخزينة والميزانية والتقارير</p>
        </div>
        <div className="flex gap-2">
          {accounts.length === 0 && (
            <Button variant="outline" onClick={seedDefaults} disabled={seeding}>
              <BookOpen className="ml-2 w-4 h-4" />
              {seeding ? "جاري الإضافة..." : "إضافة الحسابات الافتراضية"}
            </Button>
          )}
          {can("edit") && (
            <Button onClick={openAdd}><Plus className="ml-2 w-4 h-4" />إضافة حساب</Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-700">إجمالي الأصول</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-blue-800">{totalAssets.toFixed(2)} ر.س</p></CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-red-700">إجمالي الالتزامات</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-800">{totalLiabilities.toFixed(2)} ر.س</p></CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-purple-700">حقوق الملكية</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-purple-800">{totalEquity.toFixed(2)} ر.س</p></CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-bold mb-2">لا يوجد حسابات بعد</h3>
            <p className="text-muted-foreground mb-4">ابدأ بإضافة الحسابات الافتراضية أو أضف حساباً يدوياً</p>
            <Button onClick={seedDefaults} disabled={seeding}>
              <BookOpen className="ml-2 w-4 h-4" />{seeding ? "جاري..." : "إضافة الحسابات الافتراضية"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => group.items.length > 0 && (
            <Card key={group.type}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${group.color}`}>{group.label}</span>
                  <span>حسابات {group.label}</span>
                  <span className="text-muted-foreground font-normal text-sm mr-auto">
                    المجموع: {group.items.reduce((s, a) => s + a.openingBalance, 0).toFixed(2)} ر.س
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رمز الحساب</TableHead>
                      <TableHead>اسم الحساب</TableHead>
                      <TableHead>الرصيد الافتتاحي</TableHead>
                      <TableHead>ملاحظات</TableHead>
                      {can("edit") && <TableHead>إجراءات</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map(acc => (
                      <TableRow key={acc.id}>
                        <TableCell className="font-mono font-bold text-primary">{acc.code}</TableCell>
                        <TableCell className="font-medium">{acc.name}</TableCell>
                        <TableCell className="font-bold">{acc.openingBalance.toFixed(2)} ر.س</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{acc.notes ?? "-"}</TableCell>
                        {can("edit") && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(acc)}>
                                <Pencil className="w-4 h-4 text-blue-600" />
                              </Button>
                              {can("delete") && (
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(acc.id)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "تعديل الحساب" : "إضافة حساب جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">رمز الحساب</label>
                <Input placeholder="مثال: 1001" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">نوع الحساب</label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">اسم الحساب</label>
              <Input placeholder="مثال: الخزينة - النقدية" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">الرصيد الافتتاحي (ر.س)</label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ملاحظات (اختياري)</label>
              <Input placeholder="ملاحظات..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800 border border-blue-100">
              💡 الرصيد الافتتاحي سيُضاف تلقائياً إلى حساب الخزينة والتقارير المالية.
            </div>
            <Button className="w-full" onClick={handleSave}>
              {editing ? "حفظ التعديلات" : "إضافة الحساب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
