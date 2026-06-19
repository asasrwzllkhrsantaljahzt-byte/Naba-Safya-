import { useState } from "react";
import { useListSales, useCreateSale, useDeleteSale, useListProducts, useListCustomers, useListReps, getListSalesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { queryClient } from "@/lib/utils";
import { format } from "date-fns";

const PAY_LABELS: Record<string, string> = {
  cash: "نقدي", network: "شبكة", transfer: "تحويل", coupon: "كوبون", credit: "آجل",
};

const PAY_COLORS: Record<string, string> = {
  cash: "bg-green-100 text-green-800",
  network: "bg-blue-100 text-blue-800",
  transfer: "bg-purple-100 text-purple-800",
  coupon: "bg-orange-100 text-orange-800",
  credit: "bg-red-100 text-red-800",
};

export default function Sales() {
  const { data: sales = [], isLoading } = useListSales();
  const { data: allProducts = [] } = useListProducts();
  const { data: customers = [] } = useListCustomers();
  const { data: reps = [] } = useListReps();

  // Show only blue products
  const products = allProducts.filter((p: any) => p.color === "blue" || !p.color);

  const createSale = useCreateSale();
  const deleteSale = useDeleteSale();
  const [isOpen, setIsOpen] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    customerId: "",
    repId: "",
    paymentMethod: "cash",
    bottlesReturned: "0",
    notes: "",
  });

  const [items, setItems] = useState<{ productId: number; quantity: number; unitPrice: number }[]>([]);
  const [filterRep, setFilterRep] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const handleAddItem = (productId: number) => {
    if (!items.find(i => i.productId === productId)) {
      const product = products.find((p: any) => p.id === productId);
      setItems([...items, { productId, quantity: 1, unitPrice: product?.unitPrice || 0 }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return alert("الرجاء إضافة منتج واحد على الأقل");
    if (!formData.customerId) return alert("الرجاء اختيار العميل");
    if (!formData.repId) return alert("الرجاء اختيار المندوب");
    await createSale.mutateAsync({
      data: {
        ...formData,
        customerId: Number(formData.customerId),
        repId: Number(formData.repId),
        bottlesReturned: parseInt(formData.bottlesReturned) || 0,
        items: items as any,
      } as any
    });
    setIsOpen(false);
    setItems([]);
    setFormData({ date: formData.date, customerId: "", repId: "", paymentMethod: "cash", bottlesReturned: "0", notes: "" });
    queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
  };

  const handleDelete = async (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      await deleteSale.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
    }
  };

  const filtered = sales.filter((s: any) => {
    if (filterRep && String(s.repId) !== filterRep) return false;
    if (filterFrom && s.date < filterFrom) return false;
    if (filterTo && s.date > filterTo) return false;
    return true;
  });

  const total = filtered.reduce((sum: number, s: any) => sum + (s.grandTotal || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">طلبيات البيع</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 w-4 h-4" /> إضافة طلبية</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>إضافة طلبية بيع جديدة</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-sm">التاريخ</label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">العميل</label>
                  <Select value={formData.customerId} onValueChange={v => setFormData({ ...formData, customerId: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">المندوب</label>
                  <Select value={formData.repId} onValueChange={v => setFormData({ ...formData, repId: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر المندوب" /></SelectTrigger>
                    <SelectContent>
                      {reps.map((r: any) => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">طريقة الدفع</label>
                  <Select value={formData.paymentMethod} onValueChange={v => setFormData({ ...formData, paymentMethod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="network">شبكة</SelectItem>
                      <SelectItem value="transfer">تحويل</SelectItem>
                      <SelectItem value="coupon">كوبون</SelectItem>
                      <SelectItem value="credit">آجل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">قوارير راجعة</label>
                  <Input type="number" min="0" value={formData.bottlesReturned} onChange={e => setFormData({ ...formData, bottlesReturned: e.target.value })} />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm">القوارير الزرقاء</h3>
                <div className="flex gap-2 flex-wrap">
                  {products.map((p: any) => (
                    <Button key={p.id} type="button" variant="outline" size="sm" onClick={() => handleAddItem(p.id)}>
                      + {p.name}
                    </Button>
                  ))}
                </div>
                {items.length > 0 && (
                  <div className="border rounded-lg p-4 space-y-3">
                    {items.map(item => {
                      const product = products.find((p: any) => p.id === item.productId);
                      const subtotal = item.quantity * item.unitPrice;
                      return (
                        <div key={item.productId} className="flex gap-3 items-end">
                          <div className="flex-1">
                            <label className="text-xs text-muted-foreground">{product?.name}</label>
                            <div className="text-sm font-medium bg-muted px-3 py-2 rounded">{product?.name}</div>
                          </div>
                          <div className="w-20">
                            <label className="text-xs text-muted-foreground">الكمية</label>
                            <Input type="number" min="1" value={item.quantity} onChange={e => setItems(items.map(i => i.productId === item.productId ? { ...i, quantity: Number(e.target.value) } : i))} />
                          </div>
                          <div className="w-28">
                            <label className="text-xs text-muted-foreground">السعر</label>
                            <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => setItems(items.map(i => i.productId === item.productId ? { ...i, unitPrice: Number(e.target.value) } : i))} />
                          </div>
                          <div className="w-24 text-left text-sm font-semibold text-muted-foreground pb-2">{subtotal.toFixed(2)} ر.س</div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter(i => i.productId !== item.productId))}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                    <div className="border-t pt-2 text-left font-semibold text-sm">
                      المجموع (قبل الضريبة): {items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toFixed(2)} ر.س
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm">ملاحظات</label>
                <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={createSale.isPending}>حفظ الطلبية</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterRep || "_all"} onValueChange={v => setFilterRep(v === "_all" ? "" : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="كل المناديب" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">كل المناديب</SelectItem>
            {reps.map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="w-36" placeholder="من" />
        <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="w-36" placeholder="إلى" />
        {(filterRep || filterFrom || filterTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterRep(""); setFilterFrom(""); setFilterTo(""); }}>
            مسح الفلاتر
          </Button>
        )}
        <span className="text-sm text-muted-foreground mr-auto">
          الإجمالي: <strong>{total.toFixed(2)} ر.س</strong> ({filtered.length} طلبية)
        </span>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الطلبية</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>المندوب</TableHead>
              <TableHead>الدفع</TableHead>
              <TableHead>الراجع</TableHead>
              <TableHead>المبلغ الإجمالي</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">لا يوجد طلبيات بيع</TableCell></TableRow>
            ) : filtered.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="text-xs text-muted-foreground">{s.orderNumber}</TableCell>
                <TableCell>{s.date}</TableCell>
                <TableCell className="font-medium">{s.customerName}</TableCell>
                <TableCell>{s.repName}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-full ${PAY_COLORS[s.paymentMethod] || "bg-gray-100"}`}>
                    {PAY_LABELS[s.paymentMethod] || s.paymentMethod}
                  </span>
                </TableCell>
                <TableCell>{s.bottlesReturned ? <Badge variant="outline">{s.bottlesReturned}</Badge> : "-"}</TableCell>
                <TableCell className="font-bold">{Number(s.grandTotal).toFixed(2)} ر.س</TableCell>
                <TableCell className="text-left">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
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
