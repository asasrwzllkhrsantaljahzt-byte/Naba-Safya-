import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Search, Edit } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const emptyForm = { name: "", phone: "", area: "", notes: "" };

export default function Suppliers() {
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => fetch(`${BASE}/api/suppliers`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => fetch(`${BASE}/api/suppliers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); setIsOpen(false); setForm(emptyForm); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      fetch(`${BASE}/api/suppliers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); setEditItem(null); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/api/suppliers/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const filtered = suppliers.filter((s: any) =>
    !search || s.name.includes(search) || (s.phone && s.phone.includes(search))
  );

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">الموردين</h1>
        {can("edit") && (
          <Button onClick={() => { setForm(emptyForm); setIsOpen(true); }}>
            <Plus className="ml-2 w-4 h-4" /> إضافة مورد
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 max-w-xs">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم المورد</TableHead>
              <TableHead>الجوال</TableHead>
              <TableHead>المنطقة</TableHead>
              <TableHead>ملاحظات</TableHead>
              {can("edit") && <TableHead>إجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا يوجد موردين</TableCell></TableRow>
            ) : filtered.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.phone || "-"}</TableCell>
                <TableCell>{s.area || "-"}</TableCell>
                <TableCell>{s.notes || "-"}</TableCell>
                {can("edit") && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditItem({ ...s })}>
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      {can("delete") && (
                        <Button variant="ghost" size="icon" onClick={() => confirm("حذف المورد؟") && remove.mutate(s.id)}>
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
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة مورد جديد</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">اسم المورد</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">رقم الجوال</label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">المنطقة</label><Input value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">ملاحظات</label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={create.isPending}>حفظ</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل بيانات المورد</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={e => { e.preventDefault(); update.mutate({ id: editItem.id, data: { name: editItem.name, phone: editItem.phone, area: editItem.area, notes: editItem.notes } }); }} className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium">اسم المورد</label><Input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">رقم الجوال</label><Input value={editItem.phone || ""} onChange={e => setEditItem({ ...editItem, phone: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">المنطقة</label><Input value={editItem.area || ""} onChange={e => setEditItem({ ...editItem, area: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">ملاحظات</label><Input value={editItem.notes || ""} onChange={e => setEditItem({ ...editItem, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={update.isPending}>حفظ التغييرات</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
