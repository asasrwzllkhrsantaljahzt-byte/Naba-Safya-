import { useState } from "react";
import { useListReps, useCreateRep, useDeleteRep, getListRepsQueryKey } from "@workspace/api-client-react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, KeyRound, ExternalLink, Edit } from "lucide-react";
import { queryClient } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Reps() {
  const { can } = useAuth();
  const { data: reps = [], isLoading } = useListReps();
  const createRep = useCreateRep();
  const deleteRep = useDeleteRep();

  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", area: "" });

  const [pwOpen, setPwOpen] = useState(false);
  const [pwRepId, setPwRepId] = useState<number | null>(null);
  const [pwRepName, setPwRepName] = useState("");
  const [password, setPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      fetch(`${BASE}/api/reps/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListRepsQueryKey() }); setEditItem(null); },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRep.mutateAsync({ data: formData });
    setIsOpen(false);
    setFormData({ name: "", phone: "", area: "" });
    queryClient.invalidateQueries({ queryKey: getListRepsQueryKey() });
  };

  const handleDelete = async (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      await deleteRep.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListRepsQueryKey() });
    }
  };

  const openPwDialog = (id: number, name: string) => {
    setPwRepId(id); setPwRepName(name); setPassword(""); setPwMsg(""); setPwOpen(true);
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwRepId) return;
    setPwLoading(true); setPwMsg("");
    try {
      const res = await fetch(`${BASE}/api/auth/rep/${pwRepId}/set-password`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
      });
      const data = await res.json();
      setPwMsg(res.ok ? "✅ تم تعيين كلمة المرور بنجاح" : `❌ ${data.error}`);
      if (res.ok) setPassword("");
    } catch { setPwMsg("❌ خطأ في الاتصال"); }
    finally { setPwLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">المندوبين</h1>
          <p className="text-sm text-muted-foreground mt-1">لتسجيل دخول المندوب استخدم رقم الجوال + كلمة المرور</p>
        </div>
        <div className="flex gap-2">
          <a href="/rep-login" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm"><ExternalLink className="ml-1 w-4 h-4" />بوابة المندوبين</Button>
          </a>
          {can("edit") && (
            <Button onClick={() => { setFormData({ name: "", phone: "", area: "" }); setIsOpen(true); }}>
              <Plus className="ml-2 w-4 h-4" /> إضافة مندوب
            </Button>
          )}
        </div>
      </div>

      {/* Password dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعيين كلمة مرور — {pwRepName}</DialogTitle></DialogHeader>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <p className="text-sm text-muted-foreground">المندوب سيستخدم رقم جواله + هذه الكلمة للدخول على بوابة المندوبين</p>
            <div className="space-y-2">
              <label className="text-sm">كلمة المرور الجديدة (4 أحرف على الأقل)</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={4} />
            </div>
            {pwMsg && <p className="text-sm">{pwMsg}</p>}
            <Button type="submit" className="w-full" disabled={pwLoading}>{pwLoading ? "جاري الحفظ..." : "تعيين كلمة المرور"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الجوال</TableHead>
              <TableHead>المنطقة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجمالي المبيعات</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : reps.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد مندوبين</TableCell></TableRow>
            ) : reps.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.phone || "-"}</TableCell>
                <TableCell>{r.area || "-"}</TableCell>
                <TableCell><Badge variant={r.isActive ? "default" : "secondary"}>{r.isActive ? "نشط" : "موقوف"}</Badge></TableCell>
                <TableCell className="font-semibold">{(r.totalSales || 0).toFixed(2)} ر.س</TableCell>
                <TableCell className="text-left">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" title="تعيين كلمة مرور" onClick={() => openPwDialog(r.id, r.name)}>
                      <KeyRound className="w-4 h-4 text-blue-600" />
                    </Button>
                    {can("edit") && (
                      <Button variant="ghost" size="icon" onClick={() => setEditItem({ ...r })}>
                        <Edit className="w-4 h-4 text-green-600" />
                      </Button>
                    )}
                    {can("delete") && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة مندوب جديد</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><label className="text-sm">اسم المندوب</label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm">رقم الجوال</label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm">المنطقة</label><Input value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">بعد الإضافة، عيّن كلمة مرور للمندوب من زر 🔑</p>
            <Button type="submit" className="w-full" disabled={createRep.isPending}>حفظ</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل بيانات المندوب</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={e => { e.preventDefault(); update.mutate({ id: editItem.id, data: { name: editItem.name, phone: editItem.phone, area: editItem.area } }); }} className="space-y-4">
              <div className="space-y-2"><label className="text-sm">اسم المندوب</label><Input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm">رقم الجوال</label><Input value={editItem.phone || ""} onChange={e => setEditItem({ ...editItem, phone: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm">المنطقة</label><Input value={editItem.area || ""} onChange={e => setEditItem({ ...editItem, area: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={update.isPending}>حفظ التغييرات</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
