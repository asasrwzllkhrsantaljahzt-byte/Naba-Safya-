import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const emptyForm = { name: "", phone: "", area: "", notes: "", repId: "", repName: "", bottleBalance: "0", lastVisitDate: "" };

export default function Customers() {
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [filterRep, setFilterRep] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState(emptyForm);

  // ✅ useQuery مباشر بدل useListCustomers — أوضح وأثبت
  const { data, isLoading, isError } = useQuery({
    queryKey: ["customers", search],  // search جزء من الـ key عشان يعيد الجلب عند البحث
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`${BASE}/api/customers?${params}`);
      if (!res.ok) throw new Error("فشل تحميل العملاء");
      const json = await res.json();
      return Array.isArray(json) ? json : json?.data ?? json?.items ?? [];
    },
    staleTime: 30_000,           // ✅ لا يعيد الجلب إلا بعد 30 ثانية
    placeholderData: (prev) => prev,  // ✅ يحتفظ بالبيانات القديمة أثناء إعادة الجلب
    retry: 2,
  });

  // ✅ البيانات دائماً مصفوفة
  const customers: any[] = Array.isArray(data) ? data : [];

  const { data: reps = [] } = useQuery({
    queryKey: ["reps"],
    queryFn: async () => {
  const res = await fetch(`${BASE}/api/reps`);
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json) ? json : [];
},
    staleTime: 60_000,
  });

  const createCustomer = useMutation({
    mutationFn: (body: any) =>
      fetch(`${BASE}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: () => {
      // ✅ يضرب كل keys تبدأ بـ "customers" بغض النظر عن search
      queryClient.invalidateQueries({ queryKey: ["customers"], exact: false });
      setIsOpen(false);
      setFormData(emptyForm);
    },
  });

  const updateCustomer = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      fetch(`${BASE}/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"], exact: false });
      setEditItem(null);
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: (id: number) =>
      fetch(`${BASE}/api/customers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"], exact: false });
    },
  });

  const handleRepChange = (repId: string, form: any, setFn: (f: any) => void) => {
    if (repId === "_none") { setFn({ ...form, repId: "", repName: "" }); return; }
    const rep = (reps as any[]).find((r: any) => String(r.id) === repId);
    setFn({ ...form, repId, repName: rep?.name ?? "" });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCustomer.mutateAsync({
      name: formData.name,
      phone: formData.phone || undefined,
      area: formData.area || undefined,
      notes: formData.notes || undefined,
      repId: formData.repId ? parseInt(formData.repId) : undefined,
      repName: formData.repName || undefined,
      bottleBalance: parseInt(formData.bottleBalance) || 0,
      lastVisitDate: formData.lastVisitDate || undefined,
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCustomer.mutateAsync({
      id: editItem.id,
      data: {
        name: editItem.name,
        phone: editItem.phone || undefined,
        area: editItem.area || undefined,
        notes: editItem.notes || undefined,
        repId: editItem.repId ? parseInt(editItem.repId) : undefined,
        repName: editItem.repName || undefined,
        bottleBalance: parseInt(editItem.bottleBalance) || 0,
        lastVisitDate: editItem.lastVisitDate || undefined,
      },
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm("هل أنت متأكد من حذف العميل؟")) {
      await deleteCustomer.mutateAsync(id);
    }
  };

  // ✅ فلترة المندوب محلياً (البيانات موجودة من الـ API)
  const filtered = customers.filter((c: any) => !filterRep || String(c.repId) === filterRep);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">العملاء</h1>
        {can("edit") && (
          <Button onClick={() => { setFormData(emptyForm); setIsOpen(true); }}>
            <Plus className="ml-2 w-4 h-4" /> إضافة عميل
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الجوال..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-52"
          />
        </div>
        <Select value={filterRep || "_all"} onValueChange={v => setFilterRep(v === "_all" ? "" : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="كل المناديب" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">كل المناديب</SelectItem>
            {(reps as any[]).map((r: any) => (
              <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الجوال</TableHead>
              <TableHead>المنطقة</TableHead>
              <TableHead>المندوب</TableHead>
              <TableHead>رصيد القوارير</TableHead>
              <TableHead>آخر زيارة</TableHead>
              <TableHead>الكوبونات المتبقية</TableHead>
              {can("edit") && <TableHead>إجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* ✅ شاشة التحميل فقط في أول مرة — مش في كل refresh */}
            {isLoading && customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">جاري التحميل...</TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-destructive">
                  حدث خطأ في تحميل البيانات
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  لا يوجد عملاء
                </TableCell>
              </TableRow>
            ) : filtered.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.phone || "-"}</TableCell>
                <TableCell>{c.area || "-"}</TableCell>
                <TableCell>{c.repName || "-"}</TableCell>
                <TableCell>
                  <Badge variant={c.bottleBalance > 0 ? "default" : "secondary"} className="text-xs">
                    {c.bottleBalance ?? 0} قارورة
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.lastVisitDate || "-"}</TableCell>
                <TableCell className="font-medium">{(c.remainingCoupons || 0).toFixed(2)} ر.س</TableCell>
                {can("edit") && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditItem({
                          ...c,
                          repId: String(c.repId || ""),
                          bottleBalance: String(c.bottleBalance || 0),
                        })}
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      {can("delete") && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
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

      {/* Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>إضافة عميل جديد</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">اسم العميل *</label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">رقم الجوال</label>
                <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">المنطقة</label>
                <Input value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">رصيد القوارير</label>
                <Input type="number" min="0" value={formData.bottleBalance} onChange={e => setFormData({ ...formData, bottleBalance: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">تاريخ آخر زيارة</label>
                <Input type="date" value={formData.lastVisitDate} onChange={e => setFormData({ ...formData, lastVisitDate: e.target.value })} />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">المندوب المختص</label>
                <Select value={formData.repId || "_none"} onValueChange={v => handleRepChange(v, formData, setFormData)}>
                  <SelectTrigger><SelectValue placeholder="اختر مندوباً (اختياري)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">بدون مندوب</SelectItem>
                    {(reps as any[]).map((r: any) => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">ملاحظات</label>
                <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createCustomer.isPending}>حفظ</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>تعديل بيانات العميل</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">اسم العميل *</label>
                  <Input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">رقم الجوال</label>
                  <Input value={editItem.phone || ""} onChange={e => setEditItem({ ...editItem, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">المنطقة</label>
                  <Input value={editItem.area || ""} onChange={e => setEditItem({ ...editItem, area: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">رصيد القوارير</label>
                  <Input type="number" min="0" value={editItem.bottleBalance} onChange={e => setEditItem({ ...editItem, bottleBalance: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">تاريخ آخر زيارة</label>
                  <Input type="date" value={editItem.lastVisitDate || ""} onChange={e => setEditItem({ ...editItem, lastVisitDate: e.target.value })} />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">المندوب المختص</label>
                  <Select value={editItem.repId || "_none"} onValueChange={v => handleRepChange(v, editItem, setEditItem)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">بدون مندوب</SelectItem>
                      {(reps as any[]).map((r: any) => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">ملاحظات</label>
                  <Input value={editItem.notes || ""} onChange={e => setEditItem({ ...editItem, notes: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={updateCustomer.isPending}>حفظ التغييرات</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
