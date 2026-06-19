import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/utils";
import { useAuth, getAuthHeaders } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Shield, UserCog2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const roleLabels: Record<string, string> = { admin: "مشرف", manager: "مدير", viewer: "مشاهد" };
const roleBadge: Record<string, "default" | "secondary" | "outline"> = { admin: "default", manager: "secondary", viewer: "outline" };

const emptyForm = { username: "", fullName: "", password: "", role: "viewer" as const };

export default function Users() {
  const { user: me, can } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<typeof emptyForm & { id?: number }>(emptyForm);
  const [pwForm, setPwForm] = useState({ password: "" });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetch(`${BASE}/api/admin/users`, { headers: getAuthHeaders() }).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (data: typeof emptyForm) =>
      fetch(`${BASE}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); setIsOpen(false); setForm(emptyForm); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      fetch(`${BASE}/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); setEditItem(null); },
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      fetch(`${BASE}/api/admin/users/${id}`, { method: "DELETE", headers: getAuthHeaders() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  if (!can("manageUsers")) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3 text-muted-foreground">
        <Shield className="w-12 h-12 opacity-30" />
        <p className="text-lg font-medium">صلاحية مشرف مطلوبة</p>
        <p className="text-sm">فقط المشرفون يمكنهم إدارة المستخدمين</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
          <p className="text-sm text-muted-foreground mt-1">تحديد الصلاحيات ومستويات الوصول</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setIsOpen(true); }}>
          <Plus className="ml-2 w-4 h-4" /> إضافة مستخدم
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        {[
          { role: "admin", label: "مشرف", desc: "وصول كامل + إدارة المستخدمين" },
          { role: "manager", label: "مدير", desc: "إضافة وتعديل وحذف السجلات" },
          { role: "viewer", label: "مشاهد", desc: "عرض البيانات فقط بدون تعديل" },
        ].map(r => (
          <div key={r.role} className="border rounded-lg p-3 bg-card">
            <Badge variant={roleBadge[r.role]} className="mb-1">{r.label}</Badge>
            <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
          </div>
        ))}
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم الكامل</TableHead>
              <TableHead>اسم المستخدم</TableHead>
              <TableHead>الدور</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا يوجد مستخدمين</TableCell></TableRow>
            ) : users.map((u: any) => (
              <TableRow key={u.id} className={me?.id === u.id ? "bg-primary/5" : ""}>
                <TableCell className="font-medium">
                  {u.fullName}
                  {me?.id === u.id && <span className="text-xs text-muted-foreground mr-2">(أنت)</span>}
                </TableCell>
                <TableCell className="font-mono text-sm">{u.username}</TableCell>
                <TableCell><Badge variant={roleBadge[u.role]}>{roleLabels[u.role]}</Badge></TableCell>
                <TableCell>
                  <Badge variant={u.isActive === "true" ? "default" : "secondary"}>
                    {u.isActive === "true" ? "نشط" : "موقوف"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditItem(u)} title="تعديل">
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    {me?.id !== u.id && (
                      <Button variant="ghost" size="icon" onClick={() => confirm("حذف المستخدم؟") && remove.mutate(u.id)}>
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
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>إضافة مستخدم جديد</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); create.mutate(form as any); }} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">الاسم الكامل</label>
              <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">اسم المستخدم</label>
              <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">كلمة المرور</label>
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={4} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">الدور</label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مشرف — وصول كامل</SelectItem>
                  <SelectItem value="manager">مدير — تعديل وحذف</SelectItem>
                  <SelectItem value="viewer">مشاهد — عرض فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={create.isPending}>حفظ</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>تعديل المستخدم — {editItem?.fullName}</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={e => {
              e.preventDefault();
              update.mutate({ id: editItem.id, data: { fullName: editItem.fullName, role: editItem.role, isActive: editItem.isActive, ...(pwForm.password ? { password: pwForm.password } : {}) } });
            }} className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium">الاسم الكامل</label>
                <Input value={editItem.fullName} onChange={e => setEditItem({ ...editItem, fullName: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">الدور</label>
                <Select value={editItem.role} onValueChange={v => setEditItem({ ...editItem, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مشرف — وصول كامل</SelectItem>
                    <SelectItem value="manager">مدير — تعديل وحذف</SelectItem>
                    <SelectItem value="viewer">مشاهد — عرض فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">الحالة</label>
                <Select value={editItem.isActive} onValueChange={v => setEditItem({ ...editItem, isActive: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">نشط</SelectItem>
                    <SelectItem value="false">موقوف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">كلمة مرور جديدة (اتركها فارغة للإبقاء)</label>
                <Input type="password" value={pwForm.password} onChange={e => setPwForm({ password: e.target.value })} placeholder="••••••" /></div>
              <Button type="submit" className="w-full" disabled={update.isPending}>حفظ التغييرات</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
