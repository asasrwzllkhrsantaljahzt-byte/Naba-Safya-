import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Pencil, Trash2, Droplet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Product = {
  id: number; name: string; color: string;
  unitPrice: number; vatRate: number; description?: string | null;
};

const emptyProduct = { name: "", color: "blue", unitPrice: "", vatRate: "15", description: "" };

export default function InventoryProducts() {
  const { toast } = useToast();
  const { can } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);

  const load = () => {
    setLoading(true);
    fetch(`${BASE}/api/products`)
      .then(r => r.json())
      .then(setProducts)
      .catch(() => toast({ title: "خطأ", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyProduct); setDialog(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, color: p.color, unitPrice: String(p.unitPrice), vatRate: String(p.vatRate), description: p.description ?? "" });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "خطأ", description: "اسم المنتج مطلوب", variant: "destructive" }); return; }
    const body = { name: form.name, color: form.color, unitPrice: parseFloat(form.unitPrice), vatRate: parseFloat(form.vatRate), description: form.description || null };
    try {
      if (editing) {
        await fetch(`${BASE}/api/products/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        toast({ title: "تم التعديل" });
      } else {
        await fetch(`${BASE}/api/products`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        toast({ title: "تمت الإضافة" });
      }
      setDialog(false);
      load();
    } catch { toast({ title: "خطأ", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف هذا المنتج؟")) return;
    await fetch(`${BASE}/api/products/${id}`, { method: "DELETE" });
    toast({ title: "تم الحذف" });
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>إدارة المنتجات</CardTitle>
            <CardDescription>أنواع القوارير التي تظهر في فواتير البيع والشراء</CardDescription>
          </div>
          {can("edit") && (
            <Button onClick={openAdd}><Plus className="ml-2 w-4 h-4" /> إضافة منتج</Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">لا يوجد منتجات بعد</p>
              <Button className="mt-4" onClick={openAdd}><Plus className="ml-2 w-4 h-4" />إضافة أول منتج</Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم المنتج</TableHead>
                    <TableHead>اللون</TableHead>
                    <TableHead>سعر الوحدة</TableHead>
                    <TableHead>نسبة الضريبة</TableHead>
                    <TableHead>الوصف</TableHead>
                    {can("edit") && <TableHead>إجراءات</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${p.color === "blue" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
                          <Droplet className="w-3 h-3" />
                          {p.color === "blue" ? "زرقاء" : "بيضاء"}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold">{p.unitPrice.toFixed(2)} ر.س</TableCell>
                      <TableCell>{p.vatRate}%</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.description ?? "-"}</TableCell>
                      {can("edit") && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                              <Pencil className="w-4 h-4 text-blue-600" />
                            </Button>
                            {can("delete") && (
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
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
            </div>
          )}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800">
            <strong>ملاحظة:</strong> القوارير الزرقاء تظهر في فواتير البيع، والقوارير البيضاء تُستخدم في المشتريات وحركات المخزن.
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">اسم المنتج</label>
              <Input placeholder="مثال: عبوة 18.9 لتر" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">اللون</label>
              <Select value={form.color} onValueChange={v => setForm({ ...form, color: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">🔵 زرقاء (تظهر في فواتير البيع)</SelectItem>
                  <SelectItem value="white">⚪ بيضاء (مشتريات ومخزن)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">سعر الوحدة (ر.س)</label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">نسبة الضريبة (%)</label>
                <Input type="number" min="0" max="100" placeholder="15" value={form.vatRate} onChange={e => setForm({ ...form, vatRate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">وصف (اختياري)</label>
              <Input placeholder="وصف إضافي..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <Button className="w-full" onClick={handleSave}>
              {editing ? "حفظ التعديلات" : "إضافة المنتج"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
