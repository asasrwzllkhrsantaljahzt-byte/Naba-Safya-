import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Warehouse = { id: number; name: string; type: string; description?: string; isActive: boolean; };

const typeLabels: Record<string, string> = {
  raw: "مخزن خامات",
  finished: "مخزن إنتاج تام",
  consumable: "مخزن استهلاكي",
  general: "مخزن عام",
};

const emptyForm = { name: "", type: "general", description: "" };

export default function Warehouses() {
  const { can } = useAuth();
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<Warehouse | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    fetch(`${BASE}/api/warehouses`)
      .then(r => r.json())
      .then(data => setWarehouses(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: "اسم المخزن مطلوب", variant: "destructive" }); return; }
    try {
      if (editItem) {
        await fetch(`${BASE}/api/warehouses/${editItem.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
        });
        toast({ title: "تم التعديل" });
        setEditItem(null);
      } else {
        await fetch(`${BASE}/api/warehouses`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
        });
        toast({ title: "تمت الإضافة" });
        setIsOpen(false);
      }
      setForm(emptyForm);
      load();
    } catch { toast({ title: "خطأ في الحفظ", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف هذا المخزن؟")) return;
    await fetch(`${BASE}/api/warehouses/${id}`, { method: "DELETE" });
    toast({ title: "تم الحذف" });
    load();
  };

  const openEdit = (w: Warehouse) => {
    setEditItem(w);
    setForm({ name: w.name, type: w.type, description: w.description ?? "" });
  };

  const FormContent = () => (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">اسم المخزن</label>
        <Input placeholder="مثال: مخزن الخامات" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">نوع المخزن</label>
        <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">الوصف <span className="text-muted-foreground font-normal text-xs">(اختياري)</span></label>
        <Input placeholder="وصف المخزن..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <Button type="submit" className="w-full">{editItem ? "حفظ التعديلات" : "إضافة المخزن"}</Button>
    </form>
  );

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">إدارة المخازن</h1>
        {can("edit") && (
          <Button onClick={() => { setForm(emptyForm); setIsOpen(true); }}>
            <Plus className="ml-2 w-4 h-4" /> إضافة مخزن
          </Button>
        )}
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم المخزن</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الوصف</TableHead>
              <TableHead>الحالة</TableHead>
              {can("edit") && <TableHead>إجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">لا يوجد مخازن — اضغط إضافة مخزن للبدء</TableCell></TableRow>
            ) : warehouses.map(w => (
              <TableRow key={w.id}>
                <TableCell className="font-medium">{w.name}</TableCell>
                <TableCell className="text-muted-foreground">{typeLabels[w.type] ?? w.type}</TableCell>
                <TableCell className="text-muted-foreground">{w.description || "-"}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-full ${w.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {w.isActive ? "نشط" : "موقوف"}
                  </span>
                </TableCell>
                {can("edit") && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(w)}>
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(w.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>إضافة مخزن جديد</DialogTitle></DialogHeader>
          <FormContent />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تعديل المخزن</DialogTitle></DialogHeader>
          <FormContent />
        </DialogContent>
      </Dialog>
    </div>
  );
}
