import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Search, Printer, Edit } from "lucide-react";
import { queryClient } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const paymentLabels: Record<string, string> = {
  cash: "نقدي", network: "شبكة", transfer: "تحويل", credit: "آجل",
};

type ItemRow = { rowId: string; productId: number; productName: string; quantity: number; unitPrice: number; vatEnabled: boolean; vatRate: number; originalQty: number; };

const emptyForm = { date: new Date().toISOString().split("T")[0], orderNumber: "", notes: "", reasonForReturn: "" };

export default function SaleReturns() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [locked, setLocked] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [originalSaleId, setOriginalSaleId] = useState<number | null>(null);
  const [originalSale, setOriginalSale] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editId, setEditId] = useState<number | null>(null);

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ["sale-returns"],
    queryFn: () => fetch(`${BASE}/api/sale-returns`).then(r => r.json()),
  });

  const createReturn = useMutation({
    mutationFn: (body: any) => fetch(`${BASE}/api/sale-returns`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }).then(async r => { if (!r.ok) throw new Error(); return r.json(); }),
  });

  const updateReturn = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => fetch(`${BASE}/api/sale-returns/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }).then(async r => { if (!r.ok) throw new Error(); return r.json(); }),
  });

  const deleteReturn = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/api/sale-returns/${id}`, { method: "DELETE" }),
  });

  const resetForm = () => {
    setForm(emptyForm); setItems([]); setLocked(false);
    setOriginalSaleId(null); setOriginalSale(null); setEditId(null);
  };

  // جلب بيانات فاتورة المبيعات برقم الطلبية
  const lookupSale = async () => {
    const num = form.orderNumber.trim();
    if (!num) return;
    setLookupLoading(true);
    try {
      const list = await fetch(`${BASE}/api/sales`).then(r => r.json());
      const all = Array.isArray(list) ? list : [];
      const match = all.find((s: any) => String(s.orderNumber) === num);
      if (!match) { toast({ title: "لم يتم العثور على فاتورة بهذا الرقم", variant: "destructive" }); return; }
      setOriginalSaleId(match.id);
      setOriginalSale(match);
      setForm(f => ({ ...f, date: match.date }));
      setItems((match.items ?? []).map((it: any, idx: number) => ({
        rowId: `${it.productId}-${idx}`,
        productId: it.productId,
        productName: it.productName ?? "",
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        vatEnabled: it.vatEnabled !== false,
        vatRate: it.vatRate ?? 15,
        originalQty: it.quantity,
      })));
      setLocked(true);
      toast({ title: "تم جلب بيانات الفاتورة — عدّل الكمية فقط" });
    } catch { toast({ title: "خطأ في جلب الفاتورة", variant: "destructive" }); }
    finally { setLookupLoading(false); }
  };

  const activeItems = items.filter(i => i.quantity > 0);
  const subtotal = activeItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalVat = activeItems.reduce((s, i) => s + (i.vatEnabled ? i.quantity * i.unitPrice * (i.vatRate / 100) : 0), 0);
  const grandTotal = subtotal + totalVat;

  const openEdit = (returnItem: any) => {
    setEditId(returnItem.id);
    setForm({
      date: returnItem.date,
      orderNumber: returnItem.orderNumber ?? "",
      notes: returnItem.notes ?? "",
      reasonForReturn: returnItem.notes?.replace(/^سبب المرتجع:\s*/i, "") ?? "",
    });
    setOriginalSaleId(returnItem.originalSaleId ?? null);
    setOriginalSale({ customerName: returnItem.customerName, paymentMethod: returnItem.paymentMethod, grandTotal: returnItem.grandTotal, customerId: returnItem.customerId, accountId: returnItem.accountId });
    setItems((returnItem.items ?? []).map((it: any, idx: number) => ({
      rowId: `${it.productId}-${idx}`,
      productId: it.productId,
      productName: it.productName ?? "",
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      vatEnabled: it.vatEnabled !== false,
      vatRate: it.vatRate ?? 15,
      originalQty: it.quantity,
    })));
    setLocked(true);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeItems.length === 0) { toast({ title: "يجب إدخال كمية أكبر من صفر لمنتج واحد على الأقل", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        originalSaleId,
        customerId: originalSale?.customerId ?? null,
        customerName: originalSale?.customerName ?? null,
        paymentMethod: originalSale?.paymentMethod ?? "cash",
        accountId: originalSale?.accountId ?? null,
        notes: form.reasonForReturn ? "سبب المرتجع: " + form.reasonForReturn + (form.notes ? " - " + form.notes : "") : form.notes,
        items: activeItems.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, vatRate: i.vatRate, vatEnabled: i.vatEnabled })),
      };
      if (editId) {
        await updateReturn.mutateAsync({ id: editId, body: payload });
        toast({ title: "تم تعديل المرتجع" });
      } else {
        await createReturn.mutateAsync(payload);
        toast({ title: "تم حفظ المرتجع وإنشاء القيد المحاسبي" });
      }
      setIsOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["sale-returns"] });
    } catch { toast({ title: "فشل في حفظ المرتجع", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف هذا المرتجع؟")) return;
    await deleteReturn.mutateAsync(id);
    queryClient.invalidateQueries({ queryKey: ["sale-returns"] });
    toast({ title: "تم الحذف" });
  };

  const safeReturns = Array.isArray(returns) ? returns : [];
  const filtered = safeReturns.filter((r: any) => {
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    if (filterText && !r.customerName?.includes(filterText) && !r.returnNumber?.includes(filterText)) return false;
    return true;
  });
  const total = filtered.reduce((s: number, r: any) => s + (r.grandTotal || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">مرتجعات المبيعات</h1>
          <p className="text-sm text-muted-foreground mt-1">الإجمالي: <span className="font-bold text-foreground">{total.toLocaleString()} ر.س</span> ({filtered.length} مرتجع)</p>
        </div>
        <Dialog open={isOpen} onOpenChange={v => { setIsOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button onClick={resetForm}><Plus className="ml-2 w-4 h-4" /> إضافة مرتجع</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>مرتجع فاتورة مبيعات</DialogTitle></DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">

              {/* رقم الفاتورة */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">رقم الفاتورة <span className="text-xs text-muted-foreground">(اكتب واضغط Enter)</span></label>
                  <Input placeholder="رقم طلبية المبيعات..." value={form.orderNumber} disabled={locked || lookupLoading}
                    onChange={e => setForm(f => ({ ...f, orderNumber: e.target.value }))}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); lookupSale(); } }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">التاريخ</label>
                  <Input type="date" value={form.date} disabled={locked} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>

              {/* سبب المرتجع */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">سبب المرتجع</label>
                <Input placeholder="مثال: عيب في المنتج، كمية زائدة..." value={form.reasonForReturn}
                  onChange={e => setForm(f => ({ ...f, reasonForReturn: e.target.value }))} />
              </div>

              {/* بيانات الفاتورة الأصلية */}
              {locked && originalSale && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">العميل:</span><span className="font-medium">{originalSale.customerName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">طريقة الدفع:</span><span className="font-medium">{paymentLabels[originalSale.paymentMethod] ?? originalSale.paymentMethod}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">إجمالي الفاتورة الأصلية:</span><span className="font-bold">{Number(originalSale.grandTotal).toFixed(2)} ر.س</span></div>
                </div>
              )}

              {/* المنتجات */}
              {items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground font-medium">
                    المنتجات {locked && "(الكمية فقط قابلة للتعديل — اجعل الكمية 0 لاستبعاد الصنف)"}
                  </div>
                  {items.map(item => {
                    const sub = item.quantity * item.unitPrice;
                    const vat = item.vatEnabled ? sub * (item.vatRate / 100) : 0;
                    return (
                      <div key={item.rowId} className="flex flex-col gap-2 px-4 py-3 border-b last:border-0">
                        <div className="flex gap-3 items-center">
                          <div className="flex-1 font-medium text-sm">{item.productName}</div>
                          <div className="w-20">
                            <label className="text-xs text-muted-foreground block mb-1">الكمية (من {item.originalQty})</label>
                            <Input type="number" min="0" max={item.originalQty} value={item.quantity}
                              onChange={e => setItems(prev => prev.map(i => i.rowId === item.rowId ? { ...i, quantity: Math.min(Number(e.target.value), i.originalQty) } : i))}
                              className="h-8 text-center" />
                          </div>
                          <div className="w-24 text-sm text-muted-foreground">
                            <div className="text-xs mb-1">سعر الوحدة</div>
                            <div className="font-medium">{item.unitPrice.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 text-xs text-muted-foreground bg-muted/20 rounded px-3 py-1.5">
                          <span>قبل الضريبة: <b className="text-foreground">{sub.toFixed(2)}</b></span>
                          <span>الضريبة: <b className="text-orange-600">{vat.toFixed(2)}</b></span>
                          <span>الإجمالي: <b className="text-foreground">{(sub + vat).toFixed(2)}</b></span>
                        </div>
                      </div>
                    );
                  })}
                  {items.length > 0 && (
                    <div className="px-4 py-3 bg-muted/30 space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">المجموع قبل الضريبة</span><span>{subtotal.toFixed(2)} ر.س</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">إجمالي الضريبة</span><span className="text-orange-600">{totalVat.toFixed(2)} ر.س</span></div>
                      <div className="flex justify-between font-bold border-t pt-1"><span>إجمالي المرتجع</span><span className="text-primary">{grandTotal.toFixed(2)} ر.س</span></div>
                    </div>
                  )}
                </div>
              )}

              {!locked && (
                <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                  اكتب رقم الفاتورة واضغط Enter لجلب البيانات
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">ملاحظات <span className="text-xs text-muted-foreground">(اختياري)</span></label>
                <Input placeholder="أي ملاحظات إضافية..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              <Button type="submit" className="w-full" disabled={saving || !locked}>
                {saving ? "جاري الحفظ..." : "حفظ المرتجع"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* فلاتر */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1"><label className="text-xs text-muted-foreground">من تاريخ</label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" /></div>
        <div className="space-y-1"><label className="text-xs text-muted-foreground">إلى تاريخ</label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" /></div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">بحث</label>
          <div className="flex items-center gap-2"><Search className="w-4 h-4 text-muted-foreground" /><Input placeholder="العميل أو رقم المرتجع..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-48" /></div>
        </div>
      </div>

      {/* الجدول */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم المرتجع</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>طريقة الدفع</TableHead>
              <TableHead>الإجمالي</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد مرتجعات</TableCell></TableRow>
            ) : filtered.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.returnNumber || "-"}</TableCell>
                <TableCell>{r.date}</TableCell>
                <TableCell>{r.customerName || "-"}</TableCell>
                <TableCell><Badge variant="outline">{paymentLabels[r.paymentMethod] ?? r.paymentMethod}</Badge></TableCell>
                <TableCell className="font-bold text-red-600">-{Number(r.grandTotal || 0).toFixed(2)} ر.س</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="تعديل" onClick={() => openEdit(r)}>
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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
