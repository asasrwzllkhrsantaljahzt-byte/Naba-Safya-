import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Search, Printer, UserPlus, PackagePlus, ChevronDown, Edit, X } from "lucide-react";
import { queryClient } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const COMPANY_NAME = "مصنع نبع صافيا لتعبئة المياه";
const VAT_NUMBER = "314668535600003";

const paymentLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  cash: { label: "نقدي", variant: "default" },
  network: { label: "شبكة", variant: "secondary" },
  transfer: { label: "تحويل", variant: "secondary" },
  coupon: { label: "كوبون", variant: "outline" },
  credit: { label: "آجل", variant: "outline" },
};

// ── توليد QR Code بصيغة TLV (المرحلة الأولى من ZATCA) ──
function generateZATCAQR(sellerName: string, vatNumber: string, invoiceDate: string, totalWithVat: number, vatAmount: number): string {
  function tlv(tag: number, value: string): Uint8Array {
    const enc = new TextEncoder();
    const v = enc.encode(value);
    const buf = new Uint8Array(2 + v.length);
    buf[0] = tag; buf[1] = v.length;
    buf.set(v, 2);
    return buf;
  }
  const parts = [
    tlv(1, sellerName),
    tlv(2, vatNumber),
    tlv(3, invoiceDate + "T00:00:00Z"),
    tlv(4, totalWithVat.toFixed(2)),
    tlv(5, vatAmount.toFixed(2)),
  ];
  const total = parts.reduce((s, p) => s + p.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  parts.forEach(p => { merged.set(p, offset); offset += p.length; });
  return btoa(String.fromCharCode(...merged));
}

// ── طباعة فاتورة ضريبية مبسطة (تنسيق متوافق مع المتطلبات الأساسية) ──
function printSaleInvoice(sale: any, settings?: any) {

  const w = window.open("", "_blank", "width=800,height=700");
  if (!w) return;
  const s = settings || {};
  const companyName = s.companyName || COMPANY_NAME;
  const vatNumber = s.vatNumber || VAT_NUMBER;
  const address = [s.address, s.city].filter(Boolean).join("، ") || "المملكة العربية السعودية";
  const commercialReg = s.commercialReg || "";
  const items = Array.isArray(sale.items) ? sale.items : [];
  const itemsHtml = items.map((item: any) => {
    const sub = Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0);
    const vat = item.vatEnabled !== false ? sub * (Number(item.vatRate ?? 15) / 100) : 0;
    const vatLabel = item.vatEnabled !== false ? Number(item.vatRate ?? 15).toFixed(0) + "%" : "معفى";
    return "<tr>" +
      "<td>" + (item.productName ?? "") + "</td>" +
      "<td style='text-align:center'>" + (item.quantity ?? 0) + "</td>" +
      "<td style='text-align:center'>" + Number(item.unitPrice ?? 0).toFixed(2) + "</td>" +
      "<td style='text-align:center'>" + vatLabel + "</td>" +
      "<td style='text-align:center'>" + vat.toFixed(2) + "</td>" +
      "<td style='text-align:left'>" + (sub + vat).toFixed(2) + "</td>" +
      "</tr>";
  }).join("");
  const grandTotal = Number(sale.grandTotal ?? 0);
  const totalAmount = Number(sale.totalAmount ?? 0);
  const vatAmount = Number(sale.vatAmount ?? 0);
  const payLabel = paymentLabels[sale.paymentMethod]?.label ?? "نقدي";
  const qrData = generateZATCAQR(companyName, vatNumber, sale.date ?? "", grandTotal, vatAmount);
  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
    <title>فاتورة ضريبية ${sale.orderNumber ?? ""}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;direction:rtl;padding:20px;color:#111;font-size:12.5px;max-width:800px;margin:auto}
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px double #1d4ed8;padding-bottom:12px;margin-bottom:12px}
      .company h1{font-size:17px;color:#1d4ed8;font-weight:bold;margin-bottom:3px}
      .company p{font-size:11px;color:#555;margin:1px 0}
      .invoice-title{text-align:center}
      .invoice-title .type{background:#1d4ed8;color:#fff;padding:5px 16px;border-radius:5px;font-size:13px;font-weight:bold;display:block;margin-bottom:6px}
      .invoice-title .num{font-size:11.5px;color:#444}
      .qr-wrap{margin-top:6px}
      .parties{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
      .party{border:1px solid #e2e8f0;border-radius:6px;padding:9px}
      .party h4{font-size:11px;color:#1d4ed8;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:6px;font-weight:bold}
      .party-row{display:flex;justify-content:space-between;font-size:11px;margin:2px 0}
      .party-row span:first-child{color:#777}
      table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11.5px}
      th{background:#1d4ed8;color:#fff;padding:7px 8px;text-align:center}
      th:first-child{text-align:right}
      td{padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:center}
      td:first-child{text-align:right}
      .totals-wrap{display:flex;justify-content:flex-start;gap:20px;align-items:flex-start}
      .totals{border:1px solid #e2e8f0;border-radius:6px;padding:12px;background:#f8fafc;min-width:260px}
      .total-row{display:flex;justify-content:space-between;padding:3px 0;font-size:12px}
      .total-row.grand{border-top:2px solid #1d4ed8;margin-top:6px;padding-top:8px;font-size:15px;color:#1d4ed8;font-weight:bold}
      .sig{display:flex;justify-content:space-between;margin-top:40px;padding-top:10px}
      .sig-box{width:200px;text-align:center}
      .sig-line{border-bottom:1px solid #000;margin-bottom:5px;height:30px}
      .sig-label{font-size:11px;color:#555}
      .footer{margin-top:20px;border-top:1px solid #e2e8f0;padding-top:8px;text-align:center;color:#777;font-size:10px}
      @media print{body{padding:10px}}
    </style></head><body>
    <div class="header">
      <div class="company">
        <h1>${companyName}</h1>
        <p>الرقم الضريبي: <b>${vatNumber}</b></p>
        ${commercialReg ? "<p>السجل التجاري: <b>" + commercialReg + "</b></p>" : ""}
        <p>${address}</p>
      </div>
      <div class="invoice-title">
        <span class="type">فاتورة ضريبية مبسطة</span>
        <div class="num">رقم: <b>${sale.orderNumber ?? "#" + sale.id}</b></div>
        <div class="num">التاريخ: <b>${sale.date}</b></div>
        <div class="qr-wrap" id="qrcode"></div>
      </div>
    </div>
    <div class="parties">
      <div class="party">
        <h4>بيانات البائع</h4>
        <div class="party-row"><span>الاسم</span><span>${companyName}</span></div>
        <div class="party-row"><span>الرقم الضريبي</span><span>${vatNumber}</span></div>
        <div class="party-row"><span>العنوان</span><span>${address}</span></div>
      </div>
      <div class="party">
        <h4>بيانات المشتري</h4>
        <div class="party-row"><span>الاسم</span><span>${sale.customerName ?? "-"}</span></div>
        <div class="party-row"><span>المندوب</span><span>${sale.repName ?? "-"}</span></div>
        <div class="party-row"><span>طريقة الدفع</span><span>${payLabel}</span></div>
      </div>
    </div>
    <table>
      <thead><tr><th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>نسبة الضريبة</th><th>قيمة الضريبة</th><th>الإجمالي</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="totals-wrap">
      <div class="totals">
        <div class="total-row"><span>الإجمالي قبل الضريبة</span><span>${totalAmount.toFixed(2)} ر.س</span></div>
        <div class="total-row"><span>ضريبة القيمة المضافة</span><span>${vatAmount.toFixed(2)} ر.س</span></div>
        <div class="total-row grand"><span>الإجمالي شامل الضريبة</span><span>${grandTotal.toFixed(2)} ر.س</span></div>
      </div>
    </div>
    <div class="sig">
      <div class="sig-box"><div class="sig-line"></div><div class="sig-label">توقيع البائع</div></div>
      <div class="sig-box"><div class="sig-line"></div><div class="sig-label">توقيع المستلم</div></div>
    </div>
    <div class="footer">
      هذه فاتورة ضريبية مبسطة صادرة إلكترونياً عن ${companyName} وفقاً لأنظمة هيئة الزكاة والضريبة والجمارك (ZATCA)
      ${s.invoiceNotes ? "<br/>" + s.invoiceNotes : ""}
    </div>
    <script>
      window.onload = function() {
        try {
          new QRCode(document.getElementById("qrcode"), {
            text: "${qrData}", width: 80, height: 80,
            colorDark: "#000", colorLight: "#fff", correctLevel: QRCode.CorrectLevel.M
          });
        } catch(e) {}
        setTimeout(function() { window.print(); }, 600);
      };
    <\/script>
    </body></html>`);
  w.document.close();
}

// ── Customer Combobox ──────────────────────────────────────────────────
function CustomerCombobox({ value, onChange, customers }: { value: string; onChange: (id: string, name: string) => void; customers: any[]; }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedLabel = customers.find(c => String(c.id) === value)?.name ?? "";
  const filtered = customers.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 10);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => { setOpen(true); setSearch(""); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full flex items-center justify-between border rounded-md px-3 py-2 text-sm bg-background hover:bg-muted transition-colors">
        <span className={selectedLabel ? "text-foreground" : "text-muted-foreground"}>{selectedLabel || "ابحث أو اختر عميلاً..."}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b">
            <div className="flex items-center gap-2 px-2">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input ref={inputRef} className="flex-1 bg-transparent outline-none text-sm" placeholder="بحث عن عميل..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">لا يوجد عملاء</div>}
            {filtered.map((c: any) => (
              <button key={c.id} type="button" onClick={() => { onChange(String(c.id), c.name); setOpen(false); setSearch(""); }}
                className={`w-full text-right px-4 py-2.5 text-sm hover:bg-muted flex flex-col ${String(c.id) === value ? "bg-primary/5 text-primary font-medium" : ""}`}>
                <span>{c.name}</span>
                {c.phone && <span className="text-xs text-muted-foreground">📞 {c.phone}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Product Combobox ────────────────────────────────────────────────────
function ProductCombobox({ products, onAdd, onCreate }: { products: any[]; onAdd: (id: number) => void; onCreate: (name: string) => void; }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => { setOpen(true); setSearch(""); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 border rounded-md px-3 py-2 text-sm bg-background hover:bg-muted transition-colors">
        <PackagePlus className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">إضافة منتج...</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-72 bg-card border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b">
            <div className="flex items-center gap-2 px-2">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input ref={inputRef} className="flex-1 bg-transparent outline-none text-sm" placeholder="بحث عن منتج..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && !search && <div className="py-4 text-center text-sm text-muted-foreground">لا توجد منتجات</div>}
            {filtered.map(p => (
              <button key={p.id} type="button" onClick={() => { onAdd(p.id); setSearch(""); }}
                className="w-full text-right px-4 py-2.5 text-sm flex items-center justify-between hover:bg-muted transition-colors">
                <span>{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.unitPrice?.toFixed(2)} ر.س</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type ItemRow = { rowId: string; productId: number; quantity: number; unitPrice: number; vatEnabled: boolean; vatRate: number };

const emptyFormData = {
  date: new Date().toISOString().split('T')[0],
  customerId: "", repId: "", orderNumber: "", paymentMethod: "cash", notes: "", bottlesDelivered: "0", bottlesReturned: "0",
};

export default function Sales() {
  const { toast } = useToast();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterPayment, setFilterPayment] = useState("");

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => fetch(`${BASE}/api/sales`).then(r => r.json()),
  });
  const { data: productsResponse, refetch: refetchProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetch(`${BASE}/api/products`).then(r => r.json()),
  });
  const products = Array.isArray(productsResponse) ? productsResponse : Array.isArray((productsResponse as any)?.data) ? (productsResponse as any).data : [];

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetch(`${BASE}/api/customers`).then(r => r.json()),
  });
 const { data: employeesData = [] } = useQuery({
  queryKey: ["employees"],
  queryFn: () => fetch(`${BASE}/api/employees`).then(r => r.json()),
});
const reps = (employeesData as any[]).filter(e =>
  e.jobTitle?.includes("مندوب") || e.jobTitle?.includes("مبيعات")
);
  

  const createSale = useMutation({
    mutationFn: (body: any) => fetch(`${BASE}/api/sales`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }).then(async r => { if (!r.ok) throw new Error(); return r.json(); }),
  });
  const deleteSale = useMutation({
    mutationFn: (vars: { id: number }) => fetch(`${BASE}/api/sales/${vars.id}`, { method: "DELETE" }),
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState(emptyFormData);
  const [items, setItems] = useState<ItemRow[]>([]);

  const handleAddItem = (productId: number) => {
    const p = (products as any[]).find(p => p.id === productId);
    setItems(prev => [...prev, {
      rowId: `${productId}-${Date.now()}-${Math.random()}`,
      productId, quantity: 1, unitPrice: p?.unitPrice || 0,
      vatEnabled: true, vatRate: parseFloat(p?.vatRate ?? "15"),
    }]);
  };
  const updateItem = (rowId: string, field: keyof ItemRow, value: any) => {
    setItems(prev => prev.map(i => i.rowId === rowId ? { ...i, [field]: value } : i));
  };
  const removeItem = (rowId: string) => setItems(prev => prev.filter(i => i.rowId !== rowId));

  const resetForm = () => { setFormData(emptyFormData); setItems([]); setEditId(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { toast({ title: "أضف منتج واحد على الأقل", variant: "destructive" }); return; }
    if (!formData.customerId) { toast({ title: "يرجى اختيار العميل", variant: "destructive" }); return; }
    // المندوب اختياري
    if (saving) return;
    setSaving(true);

    const payload = {
      ...formData,
      customerId: Number(formData.customerId),
      repId: Number(formData.repId),
      bottlesDelivered: Number(formData.bottlesDelivered),
      bottlesReturned: Number(formData.bottlesReturned),
      items: items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, vatRate: i.vatRate, vatEnabled: i.vatEnabled })),
    };

    try {
      await createSale.mutateAsync(payload);
      toast({ title: "تمت إضافة الفاتورة بنجاح" });
      setIsOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["treasury"] });
      queryClient.invalidateQueries({ queryKey: ["journal"] });
    } catch {
      toast({ title: "فشل في حفظ الفاتورة", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف الفاتورة؟")) return;
    await deleteSale.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: ["sales"] });
  };

  const safeSales = Array.isArray(sales) ? sales : Array.isArray((sales as any)?.data) ? (sales as any).data : [];
  const filtered = safeSales.filter((s: any) => {
    if (from && s.date < from) return false;
    if (to && s.date > to) return false;
    if (filterCustomer && !s.customerName?.includes(filterCustomer)) return false;
    if (filterPayment && s.paymentMethod !== filterPayment) return false;
    return true;
  });
  const total = filtered.reduce((s: number, x: any) => s + (x.grandTotal || 0), 0);

  const subtotalBeforeVat = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalVat = items.reduce((s, i) => s + (i.vatEnabled ? i.quantity * i.unitPrice * (i.vatRate / 100) : 0), 0);
  const grandTotal = subtotalBeforeVat + totalVat;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">فواتير المبيعات</h1>
          <p className="text-sm text-muted-foreground mt-1">الإجمالي: <span className="font-bold text-foreground">{total.toLocaleString()} ر.س</span> ({filtered.length} فاتورة)</p>
        </div>
        <Dialog open={isOpen} onOpenChange={v => { setIsOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button onClick={() => resetForm()}><Plus className="ml-2 w-4 h-4" /> إضافة فاتورة بيع</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>إضافة فاتورة مبيعات جديدة</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">التاريخ</label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">رقم الطلبية</label>
                  <Input value={formData.orderNumber} onChange={e => setFormData({ ...formData, orderNumber: e.target.value })} placeholder="اختياري - يتولد تلقائياً" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">العميل <span className="text-red-500">*</span></label>
                  <CustomerCombobox value={formData.customerId} onChange={(id) => setFormData(f => ({ ...f, customerId: id }))} customers={customers as any[]} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">المندوب <span className="text-muted-foreground text-xs">(اختياري)</span></label>
                  <Select value={formData.repId} onValueChange={v => setFormData({ ...formData, repId: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر المندوب..." /></SelectTrigger>
                    <SelectContent>
                      {(reps as any[]).map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">طريقة الدفع</label>
                  <Select value={formData.paymentMethod} onValueChange={v => setFormData({ ...formData, paymentMethod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="network">شبكة</SelectItem>
                      <SelectItem value="transfer">تحويل</SelectItem>
                      <SelectItem value="coupon">كوبون</SelectItem>
                      <SelectItem value="credit">آجل (على حساب العميل)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">المنتجات</h3>
                  <ProductCombobox products={products as any[]} onAdd={handleAddItem} onCreate={() => {}} />
                </div>
                {items.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    {items.map(item => {
                      const product = (products as any[]).find(p => p.id === item.productId);
                      const subtotal = item.quantity * item.unitPrice;
                      const vat = item.vatEnabled ? subtotal * (item.vatRate / 100) : 0;
                      const itemTotal = subtotal + vat;
                      return (
                        <div key={item.rowId} className="flex flex-col gap-2 px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <div className="flex gap-3 items-center">
                            <div className="flex-1 font-medium text-sm">{product?.name}</div>
                            <div className="w-20">
                              <label className="text-xs text-muted-foreground block mb-1">الكمية</label>
                              <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.rowId, 'quantity', Number(e.target.value))} className="h-8 text-center" />
                            </div>
                            <div className="w-28">
                              <label className="text-xs text-muted-foreground block mb-1">سعر الوحدة</label>
                              <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateItem(item.rowId, 'unitPrice', Number(e.target.value))} className="h-8" />
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.rowId)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs bg-muted/30 rounded-md px-3 py-2">
                            <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                              <input type="checkbox" checked={item.vatEnabled} onChange={e => updateItem(item.rowId, 'vatEnabled', e.target.checked)} className="w-3.5 h-3.5 accent-primary cursor-pointer" />
                              <span className="text-muted-foreground">ضريبة ({item.vatRate}%)</span>
                            </label>
                            <div className="flex gap-3 text-muted-foreground">
                              <span>قبل الضريبة: <b className="text-foreground">{subtotal.toFixed(2)}</b></span>
                              <span>الضريبة: <b className="text-orange-600">{vat.toFixed(2)}</b></span>
                              <span>الإجمالي: <b className="text-foreground">{itemTotal.toFixed(2)}</b></span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="px-4 py-3 bg-muted/30 space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">المجموع قبل الضريبة</span><span className="font-medium">{subtotalBeforeVat.toFixed(2)} ر.س</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">إجمالي الضريبة</span><span className="font-medium text-orange-600">{totalVat.toFixed(2)} ر.س</span></div>
                      <div className="flex justify-between font-bold border-t pt-1"><span>الإجمالي</span><span className="text-primary">{grandTotal.toFixed(2)} ر.س</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed rounded-lg py-8 text-center text-muted-foreground text-sm">استخدم حقل البحث أعلاه لإضافة منتجات</div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">ملاحظات</label>
                <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ الفاتورة"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1"><label className="text-xs text-muted-foreground">من تاريخ</label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" /></div>
        <div className="space-y-1"><label className="text-xs text-muted-foreground">إلى تاريخ</label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" /></div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">بحث بالعميل</label>
          <div className="flex items-center gap-2"><Search className="w-4 h-4 text-muted-foreground" /><Input placeholder="اسم العميل..." value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} className="w-40" /></div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">طريقة الدفع</label>
          <Select value={filterPayment} onValueChange={v => setFilterPayment(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-32"><SelectValue placeholder="الكل" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">الكل</SelectItem>
              <SelectItem value="cash">نقدي</SelectItem>
              <SelectItem value="network">شبكة</SelectItem>
              <SelectItem value="transfer">تحويل</SelectItem>
              <SelectItem value="coupon">كوبون</SelectItem>
              <SelectItem value="credit">آجل</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الطلبية</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>المندوب</TableHead>
              <TableHead>طريقة الدفع</TableHead>
              <TableHead>الإجمالي (شامل الضريبة)</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا يوجد فواتير مبيعات</TableCell></TableRow>
            ) : filtered.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-sm">{s.orderNumber || '-'}</TableCell>
                <TableCell>{s.date}</TableCell>
                <TableCell>{s.customerName || "-"}</TableCell>
                <TableCell>{s.repName || "-"}</TableCell>
                <TableCell><Badge variant={paymentLabels[s.paymentMethod]?.variant ?? "outline"}>{paymentLabels[s.paymentMethod]?.label ?? s.paymentMethod ?? "نقدي"}</Badge></TableCell>
                <TableCell className="font-bold">{Number(s.grandTotal || 0).toLocaleString()} ر.س</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="طباعة الفاتورة" onClick={() => printSaleInvoice(s)}>
                      <Printer className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
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
