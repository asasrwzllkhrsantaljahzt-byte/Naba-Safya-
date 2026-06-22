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

// 🔥 حماية قوية: أي حاجة تتحول لمصفوفة
const safeArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  return [];
};

type Product = {
  id: number;
  name: string;
  color: string;
  unitPrice: number;
  vatRate: number;
  description?: string | null;
};

const emptyProduct = {
  name: "",
  color: "blue",
  unitPrice: "",
  vatRate: "15",
  description: ""
};

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
      .then((data) => {
        setProducts(safeArray(data));
      })
      .catch(() => toast({ title: "خطأ في تحميل المنتجات", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyProduct);
    setDialog(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      color: p.color,
      unitPrice: String(p.unitPrice),
      vatRate: String(p.vatRate),
      description: p.description ?? ""
    });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "اسم المنتج مطلوب", variant: "destructive" });
      return;
    }

    const body = {
      name: form.name,
      color: form.color,
      unitPrice: Number(form.unitPrice) || 0,
      vatRate: Number(form.vatRate) || 15,
      description: form.description || null
    };

    try {
      if (editing) {
        await fetch(`${BASE}/api/products/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        toast({ title: "تم التعديل" });
      } else {
        await fetch(`${BASE}/api/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        toast({ title: "تمت الإضافة" });
      }

      setDialog(false);
      load();
    } catch {
      toast({ title: "خطأ في الحفظ", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف هذا المنتج؟")) return;

    await fetch(`${BASE}/api/products/${id}`, { method: "DELETE" });
    toast({ title: "تم الحذف" });
    load();
  };

  // 🔥 ضمان أن المنتجات دائمًا Array
  const safeProducts = safeArray(products);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>إدارة المنتجات</CardTitle>
            <CardDescription>أنواع القوارير في النظام</CardDescription>
          </div>

          {can("edit") && (
            <Button onClick={openAdd}>
              <Plus className="ml-2 w-4 h-4" />
              إضافة منتج
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : safeProducts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              لا يوجد منتجات
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم المنتج</TableHead>
                  <TableHead>اللون</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>الضريبة</TableHead>
                  <TableHead>الوصف</TableHead>
                  {can("edit") && <TableHead>إجراءات</TableHead>}
                </TableRow>
              </TableHeader>

              <TableBody>
                {safeProducts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>

                    <TableCell>
                      <span className="text-xs px-2 py-1 rounded bg-muted">
                        {p.color === "blue" ? "زرقاء" : "بيضاء"}
                      </span>
                    </TableCell>

                    <TableCell>{Number(p.unitPrice).toFixed(2)}</TableCell>
                    <TableCell>{p.vatRate}%</TableCell>
                    <TableCell>{p.description || "-"}</TableCell>

                    {can("edit") && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                            <Pencil className="w-4 h-4 text-blue-600" />
                          </Button>

                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل منتج" : "إضافة منتج"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="اسم المنتج"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />

            <Input
              placeholder="السعر"
              type="number"
              value={form.unitPrice}
              onChange={e => setForm({ ...form, unitPrice: e.target.value })}
            />

            <Input
              placeholder="الضريبة"
              type="number"
              value={form.vatRate}
              onChange={e => setForm({ ...form, vatRate: e.target.value })}
            />

            <Button className="w-full" onClick={handleSave}>
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
