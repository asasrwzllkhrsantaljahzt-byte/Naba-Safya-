import { useState } from "react";
import { useListPurchases, useCreatePurchase, useDeletePurchase, useListProducts, getListPurchasesQueryKey, PurchaseItemInput } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Search, Printer } from "lucide-react";
import { queryClient } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const COMPANY_NAME = "مصنع نبع صافيا لتعبئة المياه";
const VAT_NUMBER = "314668535600003";

const paymentLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  cash: { label: "نقدي", variant: "default" },
  network: { label: "شبكة", variant: "secondary" },
  credit: { label: "آجل", variant: "outline" },
};

function printPurchaseInvoice(purchase: any) {
  const items = Array.isArray(purchase.items) ? purchase.items : [];
  const w = window.open("", "_blank", "width=800,height=700");
  if (!w) return;

  const itemsHtml = items.map((item: any) => `
    <tr>
      <td>${item.productName ?? ""}</td>
      <td style="text-align:center">${item.quantity ?? 0}</td>
      <td style="text-align:center">${Number(item.unitPrice ?? 0).toFixed(2)}</td>
      <td style="text-align:center">${Number(item.vatRate ?? 0) * 100}%</td>
      <td style="text-align:left">${Number(item.subtotal ?? 0).toFixed(2)}</td>
    </tr>
  `).join("");

  const grandTotal = Number(purchase.grandTotal ?? 0).toFixed(2);
  const totalAmount = Number(purchase.totalAmount ?? 0).toFixed(2);
  const vatAmount = Number(purchase.vatAmount ?? 0).toFixed(2);
  const payLabel = paymentLabels[purchase.paymentMethod]?.label ?? purchase.paymentMethod ?? "نقدي";

  w.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8"/>
      <title>فاتورة شراء ${purchase.invoiceNumber ?? ""}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; direction: rtl; padding: 32px; color: #111; font-size: 14px; max-width: 800px; margin: auto; }
        .header { text-align: center; border-bottom: 2px solid #16a34a; padding-bottom: 16px; margin-bottom: 20px; }
        .header h1 { font-size: 22px; margin: 0 0 4px 0; color: #16a34a; }
        .header p { margin: 2px 0; color: #555; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .info-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; }
        .info-box label { font-size: 11px; color: #888; display: block; margin-bottom: 3px; }
        .info-box span { font-weight: bold; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #16a34a; color: white; padding: 10px 12px; font-size: 13px; }
        td { padding: 9px 12px; border-bottom: 1px solid #e5e7eb; }
        tr:last-child td { border-bottom: none; }
        .totals { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #f8fafc; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
        .total-row.grand { border-top: 2px solid #16a34a; margin-top: 8px; padding-top: 12px; font-size: 18px; color: #16a34a; font-weight: bold; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; background: #dcfce7; color: #16a34a; }
        .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; color: #888; font-size: 12px; }
        @media print { body { padding: 16px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${COMPANY_NAME}</h1>
        <p>الرقم الضريبي: ${VAT_NUMBER}</p>
        <p style="font-size:18px; font-weight:bold; margin-top:10px;">فاتورة شراء</p>
        ${purchase.invoiceNumber ? `<p style="font-size:13px; color:#16a34a;">رقم الفاتورة: ${purchase.invoiceNumber}</p>` : ""}
      </div>

      <div class="info-grid">
        <div class="info-box">
          <label>المورد</label>
          <span>${purchase.supplierName ?? "-"}</span>
        </div>
        <div class="info-box">
          <label>التاريخ</label>
          <span>${purchase.date ?? ""}</span>
        </div>
        <div class="info-box">
          <label>طريقة الدفع</label>
          <span class="badge">${payLabel}</span>
        </div>
        ${purchase.notes ? `<div class="info-box">
          <label>ملاحظات</label>
          <span>${purchase.notes}</span>
        </div>` : ""}
      </div>

      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th style="text-align:center">الكمية</th>
            <th style="text-align:center">سعر الوحدة</th>
            <th style="text-align:center">نسبة الضريبة</th>
            <th style="text-align:left">الإجمالي</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div class="totals">
        <div class="total-row">
          <span>المبلغ قبل الضريبة</span>
          <span>${totalAmount} ر.س</span>
        </div>
        <div class="total-row">
          <span>ضريبة القيمة المضافة (15%)</span>
          <span>${vatAmount} ر.س</span>
        </div>
        <div class="total-row grand">
          <span>الإجمالي شامل الضريبة</span>
          <span>${grandTotal} ر.س</span>
        </div>
      </div>

      <div class="footer">
        <p>فاتورة شراء صادرة عن ${COMPANY_NAME}</p>
      </div>
    </body>
    </html>
  `);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}

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
                      {(suppliers as any[]).map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
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
                {products.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground border rounded-lg">
                    لا توجد منتجات — أضف منتجات من صفحة <strong>الإعدادات &gt; المنتجات</strong> أولاً
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {products.map(p => (
                      <Button key={p.id} type="button" variant="outline" size="sm" onClick={() => handleAddItem(p.id)}>
                        + {p.name}
                      </Button>
                    ))}
                  </div>
                )}
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
            ) : (filtered as any[]).map((p: any) => (
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
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="طباعة الفاتورة" onClick={() => printPurchaseInvoice(p)}>
                      <Printer className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
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
