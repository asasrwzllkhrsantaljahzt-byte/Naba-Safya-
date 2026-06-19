import { useState } from "react";
import { useListCustomers, useCreateCustomer, useDeleteCustomer, useUpdateCustomer, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { queryClient } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const emptyForm = { name: "", phone: "", area: "", notes: "", repId: "", repName: "", bottleBalance: "0", lastVisitDate: "" };

export default function Customers() {
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [filterRep, setFilterRep] = useState("");
  const { data: customers = [], isLoading } = useListCustomers({ search });
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState(emptyForm);

  const { data: reps = [] } = useQuery({
    queryKey: ["reps"],
    queryFn: () => fetch(`${BASE}/api/reps`).then(r => r.json()),
  });

  const handleRepChange = (repId: string, form: typeof emptyForm, setFn: (f: any) => void) => {
    if (repId === "_none") { setFn({ ...form, repId: "", repName: "" }); return; }
    const rep = reps.find((r: any) => String(r.id) === repId);
    setFn({ ...form, repId, repName: rep?.name ?? "" });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCustomer.mutateAsync({ data: {
      name: formData.name, phone: formData.phone || undefined, area: formData.area || undefined,
      notes: formData.notes || undefined, repId: formData.repId ? parseInt(formData.repId) : undefined,
      repName: formData.repName || undefined, bottleBalance: parseInt(formData.bottleBalance) || 0,
      lastVisitDate: formData.lastVisitDate || undefined,
    } as any });
    setIsOpen(false);
    setFormData(emptyForm);
    queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCustomer.mutateAsync({ id: editItem.id, data: {
      name: editItem.name, phone: editItem.phone || undefined, area: editItem.area || undefined,
      notes: editItem.notes || undefined, repId: editItem.repId ? parseInt(editItem.repId) : undefined,
      repName: editItem.repName || undefined, bottleBalance: parseInt(editItem.bottleBalance) || 0,
      lastVisitDate: editItem.lastVisitDate || undefined,
    } as any });
    setEditItem(null);
    queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
  };

  const handleDelete = async (id: number) => {
    if (confirm("هل أنت متأكد من حذف العميل؟")) {
      await deleteCustomer.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
    }
  };

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
          <Input placeholder="بحث بالاسم أو الجوال..." value={search} onChange={e => setSearch(e.target.value)} className="w-52" />
        </div>
        <Select value={filterRep || "_all"} onValueChange={v => setFilterRep(v === "_all" ? "" : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="كل المناديب" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">كل المناديب</SelectItem>
            {reps.map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
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
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">لا يوجد عملاء</TableCell></TableRow>
            ) : filtered.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.phone || "-"}</TableCell>
                <TableCell>{c.area || "-"}</TableCell>
                <TableCell>{c.repName || "-"}</TableCell>
                <TableCell><Badge variant={c.bottleBalance > 0 ? "default" : "secondary"} className="text-xs">{c.bottleBalance ?? 0} قارورة</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.lastVisitDate || "-"}</TableCell>
                <TableCell className="font-medium">{(c.remainingCoupons || 0).toFixed(2)} ر.س</TableCell>
                {can("edit") && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditItem({ ...c, repId: String(c.repId || ""), bottleBalance: String(c.bottleBalance || 0) })}>
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
              <div className="space-y-2 col-span-2"><label className="text-sm font-medium">اسم العميل *</label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">رقم الجوال</label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">المنطقة</label><Input value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">رصيد القوارير</label><Input type="number" min="0" value={formData.bottleBalance} onChange={e => setFormData({ ...formData, bottleBalance: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">تاريخ آخر زيارة</label><Input type="date" value={formData.lastVisitDate} onChange={e => setFormData({ ...formData, lastVisitDate: e.target.value })} /></div>
              <div className="space-y-2 col-span-2"><label className="text-sm font-medium">المندوب المختص</label>
                <Select value={formData.repId || "_none"} onValueChange={v => handleRepChange(v, formData, setFormData)}>
                  <SelectTrigger><SelectValue placeholder="اختر مندوباً (اختياري)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">بدون مندوب</SelectItem>
                    {reps.map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2"><label className="text-sm font-medium">ملاحظات</label><Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} /></div>
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
                <div className="space-y-2 col-span-2"><label className="text-sm font-medium">اسم العميل *</label><Input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} required /></div>
                <div className="space-y-2"><label className="text-sm font-medium">رقم الجوال</label><Input value={editItem.phone || ""} onChange={e => setEditItem({ ...editItem, phone: e.target.value })} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">المنطقة</label><Input value={editItem.area || ""} onChange={e => setEditItem({ ...editItem, area: e.target.value })} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">رصيد القوارير</label><Input type="number" min="0" value={editItem.bottleBalance} onChange={e => setEditItem({ ...editItem, bottleBalance: e.target.value })} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">تاريخ آخر زيارة</label><Input type="date" value={editItem.lastVisitDate || ""} onChange={e => setEditItem({ ...editItem, lastVisitDate: e.target.value })} /></div>
                <div className="space-y-2 col-span-2"><label className="text-sm font-medium">المندوب المختص</label>
                  <Select value={editItem.repId || "_none"} onValueChange={v => handleRepChange(v, editItem, setEditItem)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">بدون مندوب</SelectItem>
                      {reps.map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2"><label className="text-sm font-medium">ملاحظات</label><Input value={editItem.notes || ""} onChange={e => setEditItem({ ...editItem, notes: e.target.value })} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={updateCustomer.isPending}>حفظ التغييرات</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
