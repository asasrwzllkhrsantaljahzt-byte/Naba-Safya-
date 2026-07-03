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

const paymentLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  cash: { label: "نقدي", variant: "default" },
  network: { label: "بنك", variant: "secondary" },
  credit: { label: "آجل", variant: "outline" },
};

// ✅ تنسيق التاريخ يوم/شهر/سنة من اليمين لليسار
function formatDateRTL(dateStr: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

// ✅ طباعة الفاتورة — بدون رقم ضريبي، نسبة ضريبة صحيحة، تاريخ rtl
function printPurchaseReturnInvoice(purchase: any) {
  const items = Array.isArray(purchase.items) ? purchase.items : [];
  const w = window.open("", "_blank", "width=800,height=700");
  if (!w) return;
  const itemsHtml = items.map((item: any) => `
    <tr>
      <td>${item.productName ?? ""}</td>
      <td style="text-align:center">${item.quantity ?? 0}</td>
      <td style="text-align:center">${Number(item.unitPrice ?? 0).toFixed(2)}</td>
      <td style="text-align:center">${item.vatEnabled !== false ? Number(item.vatRate ?? 0).toFixed(0) + "%" : "بدون"}</td>
      <td style="text-align:left">${Number(item.subtotal ?? 0).toFixed(2)}</td>
    </tr>`).join("");
  const grandTotal = Number(purchase.grandTotal ?? 0).toFixed(2);
  const totalAmount = Number(purchase.totalAmount ?? 0).toFixed(2);
  const vatAmount = Number(purchase.vatAmount ?? 0).toFixed(2);
  const payLabel = paymentLabels[purchase.paymentMethod]?.label ?? purchase.paymentMethod ?? "نقدي";
  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
    <title>مرتجع فاتورة شراء ${purchase.invoiceNumber ?? ""}</title>
    <style>body{font-family:'Segoe UI',Arial,sans-serif;direction:rtl;padding:32px;color:#111;font-size:14px;max-width:800px;margin:auto}.header{text-align:center;border-bottom:2px solid #16a34a;padding-bottom:16px;margin-bottom:20px}.header h1{font-size:22px;margin:0 0 4px 0;color:#16a34a}.header p{margin:2px 0;color:#555}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}.info-box{border:1px solid #e5e7eb;border-radius:6px;padding:12px}.info-box label{font-size:11px;color:#888;display:block;margin-bottom:3px}.info-box span{font-weight:bold;font-size:14px}table{width:100%;border-collapse:collapse;margin-bottom:16px}th{background:#16a34a;color:white;padding:10px 12px;font-size:13px}td{padding:9px 12px;border-bottom:1px solid #e5e7eb}.totals{border:1px solid #e5e7eb;border-radius:8px;padding:16px;background:#f8fafc}.total-row{display:flex;justify-content:space-between;padding:6px 0}.total-row.grand{border-top:2px solid #16a34a;margin-top:8px;padding-top:12px;font-size:18px;color:#16a34a;font-weight:bold}.badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;background:#dcfce7;color:#16a34a}.footer{margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;color:#888;font-size:12px}@media print{body{padding:16px}}</style>
    </head><body>
    <div class="header"><h1>${COMPANY_NAME}</h1>
    <p style="font-size:18px;font-weight:bold;margin-top:10px;">مرتجع فاتورة شراء</p>
    ${purchase.invoiceNumber ? `<p style="font-size:13px;color:#16a34a;">رقم الفاتورة: ${purchase.invoiceNumber}</p>` : ""}</div>
    <div class="info-grid">
      <div class="info-box"><label>المورد</label><span>${purchase.supplierName ?? "-"}</span></div>
      <div class="info-box"><label>التاريخ</label><span>${formatDateRTL(purchase.date)}</span></div>
      <div class="info-box"><label>طريقة الدفع</label><span class="badge">${payLabel}</span></div>
      ${purchase.notes ? `<div class="info-box"><label>ملاحظات</label><span>${purchase.notes}</span></div>` : ""}
    </div>
    <table><thead><tr><th>المنتج</th><th style="text-align:center">الكمية</th><th style="text-align:center">سعر الوحدة</th><th style="text-align:center">نسبة الضريبة</th><th style="text-align:left">الإجمالي</th></tr></thead>
    <tbody>${itemsHtml}</tbody></table>
    <div class="totals">
      <div class="total-row"><span>المبلغ قبل الضريبة</span><span>${totalAmount} ر.س</span></div>
      <div class="total-row"><span>ضريبة القيمة المضافة</span><span>${vatAmount} ر.س</span></div>
      <div class="total-row grand"><span>الإجمالي شامل الضريبة</span><span>${grandTotal} ر.س</span></div>
    </div>
    <div class="footer"><p>مرتجع فاتورة شراء صادرة عن ${COMPANY_NAME}</p></div>
    </body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}

// ── مساعد شجرة الحسابات (نفس منطق صفحة الخزينة) ────────────
function getAllDescendantIds(accounts: any[], rootId: number): Set<number> {
  const result = new Set<number>();
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.add(current);
    accounts.filter(a => a.parentId === current).forEach(a => queue.push(a.id));
  }
  return result;
}
function getLeafAccounts(allAccounts: any[], ids: Set<number>): any[] {
  const inSet = allAccounts.filter(a => ids.has(a.id));
  const leaves = inSet.filter(a => !allAccounts.some(b => b.parentId === a.id));
  return leaves.length > 0 ? leaves : inSet;
}
function getCashAndBankAccounts(allAccounts: any[]) {
  const root = allAccounts.find(a =>
    a.name.includes("البنوك والنقدية") || a.name.includes("النقدية والبنوك") || a.code === "1.1.1"
  );
  if (!root) return { cashAccounts: [], bankAccounts: [] };
  const children = allAccounts.filter(a => a.parentId === root.id);
  const cashRoot = children.find(a => a.name.includes("خزينة") || a.name.includes("نقد"));
  const bankRoot = children.find(a => a.name.includes("بنك") || a.name.includes("مصرف"));
  const cashIds = cashRoot ? getAllDescendantIds(allAccounts, cashRoot.id) : new Set<number>();
  const bankIds = bankRoot ? getAllDescendantIds(allAccounts, bankRoot.id) : new Set<number>();
  return {
    cashAccounts: getLeafAccounts(allAccounts, cashIds),
    bankAccounts: getLeafAccounts(allAccounts, bankIds),
  };
}

// ── Supplier Autocomplete ──────────────────────────────────────────────
function SupplierCombobox({
  value, onChange, suppliers, onCreateNew,
}: {
  value: string; onChange: (id: string, name: string) => void;
  suppliers: any[]; onCreateNew: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = suppliers.find(s => String(s.id) === value)?.name ?? "";
  const filtered = suppliers.filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone && s.phone.includes(search))
  ).slice(0, 10);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpen = () => { setOpen(true); setSearch(""); setTimeout(() => inputRef.current?.focus(), 50); };
  const handleSelect = (s: any) => { onChange(String(s.id), s.name); setOpen(false); setSearch(""); };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={handleOpen}
        className="w-full flex items-center justify-between border rounded-md px-3 py-2 text-sm bg-background hover:bg-muted transition-colors">
        <span className={selectedLabel ? "text-foreground" : "text-muted-foreground"}>{selectedLabel || "ابحث أو اختر مورداً..."}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b">
            <div className="flex items-center gap-2 px-2">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input ref={inputRef} className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                placeholder="بحث عن مورد..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && !search && (
              <div className="py-6 text-center text-sm text-muted-foreground">لا يوجد موردون مسجلون</div>
            )}
            {filtered.map((s: any) => (
              <button key={s.id} type="button" onClick={() => handleSelect(s)}
                className={`w-full text-right px-4 py-2.5 text-sm hover:bg-muted transition-colors flex flex-col ${String(s.id) === value ? "bg-primary/5 text-primary font-medium" : ""}`}>
                <span>{s.name}</span>
                {s.phone && <span className="text-xs text-muted-foreground">📞 {s.phone}</span>}
              </button>
            ))}
            {search.trim() && !suppliers.find((s: any) => s.name === search.trim()) && (
              <button type="button" onClick={() => { onCreateNew(search.trim()); setOpen(false); setSearch(""); }}
                className="w-full text-right px-4 py-2.5 text-sm text-primary hover:bg-primary/5 transition-colors flex items-center gap-2 border-t">
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>إضافة مورد جديد «{search.trim()}»</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Product Combobox — ✅ يسمح بإضافة نفس المنتج أكتر من مرة ─
function ProductCombobox({
  products, onAdd, onCreate,
}: {
  products: any[]; onAdd: (id: number) => void; onCreate: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpen = () => { setOpen(true); setSearch(""); setTimeout(() => inputRef.current?.focus(), 50); };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={handleOpen}
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
              <input ref={inputRef} className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                placeholder="بحث عن منتج..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && !search && (
              <div className="py-4 text-center text-sm text-muted-foreground">لا توجد منتجات</div>
            )}
            {filtered.map(p => (
              <button key={p.id} type="button" onClick={() => { onAdd(p.id); setSearch(""); }}
                className="w-full text-right px-4 py-2.5 text-sm flex items-center justify-between transition-colors hover:bg-muted">
                <span>{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.unitPrice?.toFixed(2)} ر.س</span>
              </button>
            ))}
            {search.trim() && !products.find(p => p.name === search.trim()) && (
              <button type="button" onClick={() => { onCreate(search.trim()); setOpen(false); setSearch(""); }}
                className="w-full text-right px-4 py-2.5 text-sm text-primary hover:bg-primary/5 transition-colors flex items-center gap-2 border-t">
                <PackagePlus className="w-4 h-4 shrink-0" />
                <span>إضافة منتج جديد «{search.trim()}»</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create Supplier Dialog ─────────────────────────────────────────────
function CreateSupplierDialog({ open, defaultName, onClose, onCreated }: {
  open: boolean; defaultName: string; onClose: () => void; onCreated: (s: any) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: defaultName, phone: "", area: "", notes: "" });
  useEffect(() => { if (open) setForm(f => ({ ...f, name: defaultName })); }, [open, defaultName]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      const res = await fetch(`${BASE}/api/suppliers`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const supplier = await res.json();
      toast({ title: "تم إضافة المورد" });
      onCreated(supplier);
      onClose();
    } catch { toast({ title: "خطأ في إضافة المورد", variant: "destructive" }); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" />إضافة مورد جديد</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1.5"><label className="text-sm font-medium">الاسم *</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اسم المورد" /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">الهاتف</label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="05xxxxxxxx" /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">المنطقة</label><Input value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} /></div>
          <Button className="w-full" onClick={handleSave}>إضافة المورد</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Product Dialog ──────────────────────────────────────────────
function CreateProductDialog({ open, defaultName, onClose, onCreated }: {
  open: boolean; defaultName: string; onClose: () => void; onCreated: (p: any) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: defaultName, color: "white", unitPrice: "", vatRate: "15" });
  useEffect(() => { if (open) setForm(f => ({ ...f, name: defaultName })); }, [open, defaultName]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      const res = await fetch(`${BASE}/api/products`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, color: form.color, unitPrice: parseFloat(form.unitPrice) || 0, vatRate: parseFloat(form.vatRate) || 15 }),
      });
      const product = await res.json();
      toast({ title: "تم إضافة المنتج" });
      onCreated(product);
      onClose();
    } catch { toast({ title: "خطأ في إضافة المنتج", variant: "destructive" }); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><PackagePlus className="w-5 h-5" />إضافة منتج جديد</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1.5"><label className="text-sm font-medium">اسم المنتج *</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">اللون</label>
              <Select value={form.color} onValueChange={v => setForm({ ...form, color: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="white">⚪ بيضاء</SelectItem><SelectItem value="blue">🔵 زرقاء</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><label className="text-sm font-medium">سعر الوحدة</label><Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} /></div>
          </div>
          <Button className="w-full" onClick={handleSave}>إضافة المنتج</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main PurchaseReturns Page ────────────────────────────────────────────────
type ItemRow = { rowId: string; productId: number; quantity: number; unitPrice: number; vatEnabled: boolean; vatRate: number };

const emptyFormData = {
  date: new Date().toISOString().split('T')[0],
  supplierName: "", supplierId: "", invoiceNumber: "", paymentMethod: "cash", accountId: "", warehouseId: "", notes: "", reasonForReturn: "",
};

export default function PurchaseReturns() {
  const { toast } = useToast();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterPayment, setFilterPayment] = useState("");

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchase-returns"],
    queryFn: () => fetch(`${BASE}/api/purchase-returns`).then(r => r.json()),
  });
  const { data: productsResponse, refetch: refetchProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetch(`${BASE}/api/products`).then(r => r.json()),
  });
  const products = Array.isArray(productsResponse) ? productsResponse : Array.isArray((productsResponse as any)?.data) ? (productsResponse as any).data : [];

  const createPurchase = useMutation({
    mutationFn: (body: any) => fetch(`${BASE}/api/purchase-returns`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body.data),
    }).then(r => r.json()),
  });
  const deletePurchase = useMutation({
    mutationFn: (vars: { id: number }) => fetch(`${BASE}/api/purchase-returns/${vars.id}`, { method: "DELETE" }),
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
  const [createSupplierName, setCreateSupplierName] = useState("");
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createProductName, setCreateProductName] = useState("");

  const { data: suppliers = [], refetch: refetchSuppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => fetch(`${BASE}/api/suppliers`).then(r => r.json()),
  });

  const { data: allAccounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetch(`${BASE}/api/accounts`).then(r => r.json()),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => fetch(`${BASE}/api/warehouses`).then(r => r.json()),
  });

  const { cashAccounts, bankAccounts } = getCashAndBankAccounts(allAccounts as any[]);

  const [formData, setFormData] = useState(emptyFormData);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [locked, setLocked] = useState(false);
  const [editingReturnId, setEditingReturnId] = useState<number | null>(null);
  const [originalPurchaseId, setOriginalPurchaseId] = useState<number | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // ✅ جلب بيانات الفاتورة الأصلية برقم الفاتورة وقفل كل الحقول إلا الكمية
  const lookupInvoice = async () => {
    const num = formData.invoiceNumber.trim();
    if (!num) return;
    setLookupLoading(true);
    try {
      const res = await fetch(`${BASE}/api/purchases`);
      const list = await res.json();
      const all = Array.isArray(list) ? list : Array.isArray(list?.data) ? list.data : [];
      const match = all.find((p: any) => String(p.invoiceNumber) === num);
      if (!match) {
        toast({ title: "لم يتم العثور على فاتورة بهذا الرقم", variant: "destructive" });
        return;
      }
      setOriginalPurchaseId(match.id);
      setFormData(f => ({
        ...f,
        date: match.date,
        supplierName: match.supplierName ?? "",
        supplierId: match.supplierId ? String(match.supplierId) : "",
        paymentMethod: match.paymentMethod ?? "cash",
        accountId: match.accountId ? String(match.accountId) : "",
        warehouseId: match.warehouseId ? String(match.warehouseId) : "",
      }));
      setItems((match.items ?? []).map((it: any, idx: number) => ({
        rowId: `${it.productId}-orig-${idx}`,
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        vatEnabled: it.vatEnabled !== false,
        vatRate: it.vatRate ?? 15,
      })));
      setLocked(true);
      toast({ title: "تم جلب بيانات الفاتورة — يمكنك تعديل الكمية فقط" });
    } catch {
      toast({ title: "خطأ في جلب بيانات الفاتورة", variant: "destructive" });
    } finally {
      setLookupLoading(false);
    }
  };

  // ✅ السماح بإضافة نفس المنتج أكتر من مرة — rowId فريد بدل productId
  const handleAddItem = (productId: number) => {
    const p = (products as any[]).find(p => p.id === productId);
    setItems(prev => [...prev, {
      rowId: `${productId}-${Date.now()}-${Math.random()}`,
      productId,
      quantity: 1,
      unitPrice: p?.unitPrice || 0,
      vatEnabled: true,
      vatRate: parseFloat(p?.vatRate ?? "15"),
    }]);
  };
  const updateItem = (rowId: string, field: keyof ItemRow, value: any) => {
    setItems(prev => prev.map(i => i.rowId === rowId ? { ...i, [field]: value } : i));
  };
  const removeItem = (rowId: string) => setItems(prev => prev.filter(i => i.rowId !== rowId));

  const handleSupplierSelect = (id: string, name: string) => setFormData(f => ({ ...f, supplierId: id, supplierName: name }));
  const handleCreateSupplier = (name: string) => { setCreateSupplierName(name); setCreateSupplierOpen(true); };
  const handleSupplierCreated = (s: any) => {
    refetchSuppliers();
    setFormData(f => ({ ...f, supplierId: String(s.id), supplierName: s.name }));
  };

  const handleCreateProduct = (name: string) => { setCreateProductName(name); setCreateProductOpen(true); };
  const handleProductCreated = (p: any) => { refetchProducts(); handleAddItem(p.id); };

  const resetForm = () => {
    setFormData(emptyFormData);
    setItems([]);
    setEditId(null);
    setEditingReturnId(null);
    setLocked(false);
    setOriginalPurchaseId(null);
  };

  // ✅ فتح فاتورة موجودة للتعديل
  const openEdit = (p: any) => {
    setEditId(p.id);
    setEditingReturnId(p.id);
    setFormData({
      date: p.date,
      supplierName: p.supplierName ?? "",
      supplierId: p.supplierId ? String(p.supplierId) : "",
      invoiceNumber: p.invoiceNumber ?? "",
      paymentMethod: p.paymentMethod ?? "cash",
      accountId: p.accountId ? String(p.accountId) : "",
      warehouseId: p.warehouseId ? String(p.warehouseId) : "",
      notes: p.notes ?? "",
      reasonForReturn: p.reasonForReturn ?? "",
    });
    setItems((p.items ?? []).map((it: any, idx: number) => ({
      rowId: `${it.productId}-edit-${idx}`,
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      vatEnabled: it.vatEnabled !== false,
      vatRate: it.vatRate ?? 15,
    })));
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeItemsForSubmit = items.filter(i => i.quantity > 0);
    if (activeItemsForSubmit.length === 0) { toast({ title: "الرجاء إضافة منتج واحد على الأقل بكمية أكبر من صفر", variant: "destructive" }); return; }
    if (formData.paymentMethod !== "credit" && !formData.accountId) {
      toast({ title: "يرجى اختيار الحساب (خزينة أو بنك)", variant: "destructive" }); return;
    }
    if (formData.paymentMethod === "credit" && !formData.supplierId) {
      toast({ title: "الشراء الآجل يتطلب اختيار مورد مسجل", variant: "destructive" }); return;
    }
    if (saving) return;
    setSaving(true);

    const payload = {
      ...formData,
      originalPurchaseId,
      supplierId: formData.supplierId ? parseInt(formData.supplierId) : undefined,
      accountId: formData.accountId ? parseInt(formData.accountId) : null,
      warehouseId: formData.warehouseId ? parseInt(formData.warehouseId) : null,
      notes: formData.reasonForReturn ? `${formData.notes ? formData.notes + " - " : ""}سبب المرتجع: ${formData.reasonForReturn}` : formData.notes,
      items: activeItemsForSubmit.map(i => ({
        productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice,
        vatRate: i.vatRate, vatEnabled: i.vatEnabled,
      })),
    };

    try {
      if (editId) {
        const r = await fetch(`${BASE}/api/purchase-returns/${editId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error();
        toast({ title: "تم تعديل الفاتورة بنجاح" });
      } else {
        await createPurchase.mutateAsync({ data: payload as any });
        toast({ title: "تمت إضافة الفاتورة بنجاح" });
      }
      setIsOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
      queryClient.invalidateQueries({ queryKey: ["treasury"] });
      queryClient.invalidateQueries({ queryKey: ["journal"] });
    } catch {
      toast({ title: "فشل في حفظ المرتجع", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      await deletePurchase.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
    }
  };

  const safePurchaseReturns = Array.isArray(purchases) ? purchases : Array.isArray((purchases as any)?.data) ? (purchases as any).data : [];

  const filtered = safePurchaseReturns.filter((p: any) => {
    if (from && p.date < from) return false;
    if (to && p.date > to) return false;
    if (filterSupplier && !p.supplierName?.includes(filterSupplier)) return false;
    if (filterPayment && p.paymentMethod !== filterPayment) return false;
    return true;
  });
  const total = filtered.reduce((s: number, p: any) => s + (p.grandTotal || 0), 0);

  const activeItems = items.filter(i => i.quantity > 0);
  const subtotalBeforeVat = activeItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalVat = activeItems.reduce((s, i) => s + (i.vatEnabled ? i.quantity * i.unitPrice * (i.vatRate / 100) : 0), 0);
  const grandTotal = subtotalBeforeVat + totalVat;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">مرتجعات المشتريات</h1>
          <p className="text-sm text-muted-foreground mt-1">الإجمالي: <span className="font-bold text-foreground">{total.toLocaleString()} ر.س</span> ({filtered.length} فاتورة)</p>
        </div>
        <Dialog open={isOpen} onOpenChange={v => { setIsOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button onClick={() => resetForm()}><Plus className="ml-2 w-4 h-4" /> إضافة مرتجع</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "تعديل مرتجع فاتورة شراء" : "مرتجع فاتورة مشتريات"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">التاريخ</label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">رقم الفاتورة <span className="text-xs text-muted-foreground font-normal">(اكتب الرقم واضغط Enter لجلب البيانات)</span></label>
                  <Input
                    value={formData.invoiceNumber}
                    onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); lookupInvoice(); } }}
                    disabled={locked || lookupLoading}
                    placeholder="رقم الفاتورة الأصلية..."
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">سبب المرتجع</label>
                  <Input value={formData.reasonForReturn} onChange={e => setFormData({ ...formData, reasonForReturn: e.target.value })} placeholder="مثال: عيب في المنتج، كمية زائدة..." />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">المورد</label>
                  {locked ? (
                    <Input value={formData.supplierName} disabled className="bg-muted" />
                  ) : (
                    <SupplierCombobox value={formData.supplierId} onChange={handleSupplierSelect} suppliers={suppliers as any[]} onCreateNew={handleCreateSupplier} />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">طريقة الدفع</label>
                  <Select disabled={locked} value={formData.paymentMethod} onValueChange={v => setFormData({ ...formData, paymentMethod: v, accountId: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي (خزينة)</SelectItem>
                      <SelectItem value="network">بنك</SelectItem>
                      <SelectItem value="credit">آجل (على حساب المورد)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* ✅ اختيار الحساب — يظهر بس لو نقدي أو بنك */}
                {formData.paymentMethod !== "credit" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">الحساب <span className="text-red-500">*</span></label>
                    {locked ? (
                      <Input
                        value={(formData.paymentMethod === "cash" ? cashAccounts : bankAccounts).find((a: any) => String(a.id) === formData.accountId)?.name ?? "..."}
                        disabled
                        className="bg-muted"
                      />
                    ) : (
                      <Select value={formData.accountId} onValueChange={v => setFormData({ ...formData, accountId: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر الحساب..." /></SelectTrigger>
                        <SelectContent>
                          {formData.paymentMethod === "cash" ? (
                            cashAccounts.length > 0 ? cashAccounts.map((a: any) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)
                              : <div className="px-3 py-2 text-xs text-muted-foreground">أضف خزينة في دليل الحسابات</div>
                          ) : (
                            bankAccounts.length > 0 ? bankAccounts.map((a: any) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)
                              : <div className="px-3 py-2 text-xs text-muted-foreground">أضف بنك في دليل الحسابات</div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* ✅ اختيار المخزن */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">المخزن</label>
                  <Select disabled={locked} value={formData.warehouseId} onValueChange={v => setFormData({ ...formData, warehouseId: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر المخزن..." /></SelectTrigger>
                    <SelectContent>
                      {(warehouses as any[]).map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Products */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">المنتجات {locked && <span className="text-xs text-muted-foreground font-normal">(الكمية فقط قابلة للتعديل)</span>}</h3>
                  {!locked && <ProductCombobox products={products as any[]} onAdd={handleAddItem} onCreate={handleCreateProduct} />}
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
                              <Input type="number" min="0" value={item.quantity} onChange={e => updateItem(item.rowId, 'quantity', Number(e.target.value))} className="h-8 text-center" />
                            </div>
                            <div className="w-28">
                              <label className="text-xs text-muted-foreground block mb-1">سعر الوحدة</label>
                              <Input type="number" min="0" step="0.01" value={item.unitPrice} disabled={locked} onChange={e => updateItem(item.rowId, 'unitPrice', Number(e.target.value))} className="h-8" />
                            </div>
                            {!locked && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.rowId)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs bg-muted/30 rounded-md px-3 py-2">
                            <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                              <input type="checkbox" checked={item.vatEnabled} disabled={locked}
                                onChange={e => updateItem(item.rowId, 'vatEnabled', e.target.checked)}
                                className="w-3.5 h-3.5 accent-primary cursor-pointer" />
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
                  <div className="border border-dashed rounded-lg py-8 text-center text-muted-foreground text-sm">
                    استخدم حقل البحث أعلاه لإضافة منتجات
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">ملاحظات</label>
                <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "جاري الحفظ..." : editId ? "حفظ التعديلات" : "حفظ المرتجع"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1"><label className="text-xs text-muted-foreground">من تاريخ</label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" /></div>
        <div className="space-y-1"><label className="text-xs text-muted-foreground">إلى تاريخ</label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" /></div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">بحث بالمورد</label>
          <div className="flex items-center gap-2"><Search className="w-4 h-4 text-muted-foreground" /><Input placeholder="اسم المورد..." value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} className="w-40" /></div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">طريقة الدفع</label>
          <Select value={filterPayment} onValueChange={v => setFilterPayment(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-32"><SelectValue placeholder="الكل" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">الكل</SelectItem>
              <SelectItem value="cash">نقدي</SelectItem>
              <SelectItem value="network">بنك</SelectItem>
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
                <TableCell>{formatDateRTL(p.date)}</TableCell>
                <TableCell>{p.supplierName || "-"}</TableCell>
                <TableCell>
                  <Badge variant={paymentLabels[p.paymentMethod]?.variant ?? "outline"}>
                    {paymentLabels[p.paymentMethod]?.label ?? p.paymentMethod ?? "نقدي"}
                  </Badge>
                </TableCell>
                <TableCell className="font-bold">{p.grandTotal?.toLocaleString()} ر.س</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="طباعة الفاتورة" onClick={() => printPurchaseReturnInvoice(p)}>
                      <Printer className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="icon" title="تعديل" onClick={() => openEdit(p)}>
                      <Edit className="w-4 h-4 text-blue-600" />
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

      <CreateSupplierDialog open={createSupplierOpen} defaultName={createSupplierName} onClose={() => setCreateSupplierOpen(false)} onCreated={handleSupplierCreated} />
      <CreateProductDialog open={createProductOpen} defaultName={createProductName} onClose={() => setCreateProductOpen(false)} onCreated={handleProductCreated} />
    </div>
  );
}