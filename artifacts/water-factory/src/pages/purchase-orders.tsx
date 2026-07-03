import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type OrderItem = { productName: string; quantity: number; unitPrice: number };

type Order = {
  id: number;
  orderDate: string;
  supplierId?: number | null;
  status?: string;
  notes?: string | null;
  totalAmount: number;
  items: OrderItem[];
};

const emptyForm = {
  orderDate: new Date().toISOString().split("T")[0],
  supplierId: "",
  status: "pending",
  notes: "",
  items: [] as OrderItem[],
};

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => fetch(`${BASE}/api/purchase-orders`).then((r) => r.json()),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => fetch(`${BASE}/api/suppliers`).then((r) => r.json()),
  });

  const createOrder = useMutation({
    mutationFn: (body: any) => fetch(`${BASE}/api/purchase-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (r) => {
      if (!r.ok) throw new Error();
      return r.json();
    }),
  });

  const updateOrder = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => fetch(`${BASE}/api/purchase-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (r) => {
      if (!r.ok) throw new Error();
      return r.json();
    }),
  });

  const deleteOrder = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/api/purchase-orders/${id}`, { method: "DELETE" }),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openEdit = (order: Order) => {
    setEditingId(order.id);
    setForm({
      orderDate: order.orderDate,
      supplierId: order.supplierId ? String(order.supplierId) : "",
      status: order.status ?? "pending",
      notes: order.notes ?? "",
      items: order.items.map((item) => ({ ...item })),
    });
    setIsOpen(true);
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { productName: "", quantity: 1, unitPrice: 0 }] }));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => idx === index ? { ...item, [field]: field === "productName" ? value : Number(value) } : item),
    }));
  };

  const removeItem = (index: number) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== index) }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orderDate) {
      toast({ title: "يرجى اختيار تاريخ الطلب", variant: "destructive" });
      return;
    }
    try {
      const body = {
        orderDate: form.orderDate,
        supplierId: form.supplierId ? Number(form.supplierId) : null,
        status: form.status,
        notes: form.notes,
        items: form.items.filter((item) => item.productName.trim()),
      };
      if (editingId) {
        await updateOrder.mutateAsync({ id: editingId, body });
        toast({ title: "تم تحديث طلب الشراء" });
      } else {
        await createOrder.mutateAsync(body);
        toast({ title: "تم إنشاء طلب الشراء" });
      }
      setIsOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    } catch {
      toast({ title: "فشل في حفظ طلب الشراء", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف طلب الشراء؟")) return;
    try {
      await deleteOrder.mutateAsync(id);
      toast({ title: "تم الحذف" });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    } catch {
      toast({ title: "فشل في الحذف", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">طلبات الشراء</h1>
          <p className="text-sm text-muted-foreground">إدارة أوامر الشراء قبل تحويلها إلى فواتير</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(value) => { setIsOpen(value); if (!value) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 h-4 w-4" /> إضافة طلب شراء</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "تعديل طلب شراء" : "إنشاء طلب شراء"}</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={save}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">التاريخ</label>
                  <Input type="date" value={form.orderDate} onChange={(e) => setForm((prev) => ({ ...prev, orderDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">المورد</label>
                  <Select value={form.supplierId} onValueChange={(value) => setForm((prev) => ({ ...prev, supplierId: value }))}>
                    <SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                    <SelectContent>
                      {(suppliers as any[]).map((supplier) => <SelectItem key={supplier.id} value={String(supplier.id)}>{supplier.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">الحالة</label>
                <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">معلق</SelectItem>
                    <SelectItem value="approved">موافق عليه</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">الملاحظات</label>
                <Input value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">البنود</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>إضافة بند</Button>
                </div>
                {form.items.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground text-center">لا توجد بنود بعد</div>
                ) : form.items.map((item, index) => (
                  <div key={`${item.productName}-${index}`} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">اسم المنتج</label>
                      <Input value={item.productName} onChange={(e) => updateItem(index, "productName", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">الكمية</label>
                      <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">سعر الوحدة</label>
                      <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, "unitPrice", e.target.value)} />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
              <Button type="submit" className="w-full">{editingId ? "حفظ التعديلات" : "إنشاء الطلب"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="بحث عن طلب..." className="border-0 shadow-none" />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجمالي</TableHead>
              <TableHead>الملاحظات</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">جاري التحميل...</TableCell></TableRow>
            ) : orders.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">لا توجد طلبات شراء</TableCell></TableRow>
            ) : orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.orderDate}</TableCell>
                <TableCell><Badge variant="outline">{order.status ?? "pending"}</Badge></TableCell>
                <TableCell>{order.totalAmount.toFixed(2)} ر.س</TableCell>
                <TableCell>{order.notes || "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(order)}><Edit className="h-4 w-4 text-blue-600" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(order.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
