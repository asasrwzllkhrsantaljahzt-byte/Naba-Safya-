import { useState } from "react";
import { useListPurchases, useCreatePurchase, useDeletePurchase, useListProducts, getListPurchasesQueryKey, PurchaseItemInput } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Search } from "lucide-react";
import { queryClient } from "@/lib/utils";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const paymentLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  cash: { label: "نقدي", variant: "default" },
  network: { label: "شبكة", variant: "secondary" },
  credit: { label: "آجل", variant: "outline" },
};

export default function Purchases() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterPayment, setFilterPayment] = useState("");

  const { data: purchases = [], isLoading } = useListPurchases();
  const { data: products = [] } = useListProducts();
  const createPurchase = useCreatePurchase();
  const deletePurchase = useDeletePurchase();
  const [isOpen, setIsOpen] = useState(false);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => fetch(`${BASE}/api/suppliers`).then(r => r.json()),
  });

  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], supplierName: "", supplierId: "", invoiceNumber: "", paymentMethod: "cash", notes: "" });
  const [items, setItems] = useState<{productId: number, quantity: number, unitPrice: number}[]>([]);

  const handleAddItem = (productId: number) => {
    if (!items.find(i => i.productId === productId)) setItems([...items, { productId, quantity: 1, unitPrice: 0 }]);
  };

  const updateItem = (productId: number, field: string, value: number) => {
    setItems(items.map(i => i.productId === productId ? { ...i, [field]: value } : i));
  };

  const handleSupplierChange = (supplierId: string) => {
    const sup = suppliers.find((s: any) => String(s.id) === supplierId);
    setFormData({ ...formData, supplierId, supplierName: sup?.name ?? "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return alert("الرجاء إضافة منتج واحد على الأقل");
    await createPurchase.mutateAsync({
      data: {
        ...formData,
        supplierId: formData.supplierId ? parseInt(formData.supplierId) : undefined,
        items: items as PurchaseItemInput[]
      } as any
    });
    setIsOpen(false);
    setItems([]);
    setFormData({ date: new Date().toISOString().split('T')[0], supplierName: "", supplierId: "", invoiceNumber: "", paymentMethod: "cash", notes: "" });
    queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey() });
    queryClient.invalidateQueries({ queryKey: ["obligations"] });
    queryClient.invalidateQueries({ queryKey: ["treasury"] });
  };

  const handleDelete = async (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      await deletePurchase.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey() });
    }
  };

  const filtered = purchases.filter((p: any) => {
    if (from && p.date < from) return false;
    if (to && p.date > to) return false;
    if (filterSupplier && !p.supplierName?.includes(filterSupplier)) return false;
    if (filterPayment && p.paymentMethod !== filterPayment) return false;
    return true;
  });

  const total = filtered.reduce((s: number, p: any) => s + (p.grandTotal || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">فواتير المشتريات</h1>
          <p className="text-sm text-muted-foreground mt-1">الإجمالي: <span className="font-bold text-foreground">{total.toLocaleString()} ر.س</span> ({filtered.length} فاتورة)</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="ml-2 w-4 h-4" /> إضافة فاتورة</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>إضافة فاتورة شراء جديدة</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">التاريخ</label><Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required /></div>
                <div className="space-y-2"><label className="text-sm font-medium">رقم الفاتورة</label><Input value={formData.invoiceNumber} onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })} /></div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">المورد (من السجل)</label>
                  <Select value={formData.supplierId} onValueChange={handleSupplierChange}>
                    <SelectTrigger><SelectValue placeholder="اختر مورداً" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">بدون تحديد</SelectItem>
                      {suppliers.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><label className="text-sm font-medium">أو اسم المورد يدوياً</label><Input value={formData.supplierName} onChange={e => setFormData({ ...formData, supplierName: e.target.value })} placeholder="اسم المورد..." /></div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">طريقة الدفع</label>
                  <Select value={formData.paymentMethod} onValueChange={v => setFormData({ ...formData, paymentMethod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي (يُخصم من الخزينة فوراً)</SelectItem>
                      <SelectItem value="network">شبكة (يُخصم من الخزينة فوراً)</SelectItem>
                      <SelectItem value="credit">آجل (يضاف للالتزامات)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">المنتجات</h3>
                <div className="flex gap-2">
                  {products.map(p => (
                    <Button key={p.id} type="button" variant="outline" size="sm" onClick={() => handleAddItem(p.id)}>
                      + {p.name}
                    </Button>
                  ))}
                </div>
                {items.length > 0 && (
                  <div className="border rounded-lg p-4 space-y-3">
                    {items.map(item => {
                      const product = products.find(p => p.id === item.productId);
                      const subtotal = item.quantity * item.unitPrice;
                      return (
                        <div key={item.productId} className="grid grid-cols-4 gap-3 items-end">
                          <div><label className="text-xs text-muted-foreground">المنتج</label><Input disabled value={product?.name} className="bg-muted" /></div>
                          <div><label className="text-xs text-muted-foreground">الكمية</label><Input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.productId, 'quantity', Number(e.target.value))} /></div>
                          <div><label className="text-xs text-muted-foreground">سعر الوحدة</label><Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateItem(item.productId, 'unitPrice', Number(e.target.value))} /></div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1"><label className="text-xs text-muted-foreground">الإجمالي</label><Input disabled value={`${subtotal.toFixed(2)} ر.س`} className="bg-muted" /></div>
                            <Button type="button" variant="destructive" size="icon" onClick={() => setItems(items.filter(i => i.productId !== item.productId))}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="text-left font-bold pt-2 border-t">
                      الإجمالي (قبل ضريبة): {items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toFixed(2)} ر.س
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2"><label className="text-sm font-medium">ملاحظات</label><Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={createPurchase.isPending}>حفظ الفاتورة</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1"><label className="text-xs text-muted-foreground">من تاريخ</label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" /></div>
        <div className="space-y-1"><label className="text-xs text-muted-foreground">إلى تاريخ</label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" /></div>
        <div className="space-y-1"><label className="text-xs text-muted-foreground">بحث بالمورد</label><div className="flex items-center gap-2"><Search className="w-4 h-4 text-muted-foreground" /><Input placeholder="اسم المورد..." value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} className="w-40" /></div></div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">طريقة الدفع</label>
          <Select value={filterPayment} onValueChange={v => setFilterPayment(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-32"><SelectValue placeholder="الكل" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">الكل</SelectItem>
              <SelectItem value="cash">نقدي</SelectItem>
              <SelectItem value="network">شبكة</SelectItem>
              <SelectItem value="credit">آجل</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الفاتورة</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>المورد</TableHead>
              <TableHead>طريقة الدفع</TableHead>
              <TableHead>الإجمالي (شامل الضريبة)</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد فواتير شراء</TableCell></TableRow>
            ) : filtered.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm">{p.invoiceNumber || '-'}</TableCell>
                <TableCell>{p.date}</TableCell>
                <TableCell>{p.supplierName || "-"}</TableCell>
                <TableCell>
                  <Badge variant={paymentLabels[p.paymentMethod]?.variant ?? "outline"}>
                    {paymentLabels[p.paymentMethod]?.label ?? p.paymentMethod ?? "نقدي"}
                  </Badge>
                </TableCell>
                <TableCell className="font-bold">{p.grandTotal?.toLocaleString()} ر.س</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
