import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Search, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const emptyForm = { name: "", jobTitle: "", phone: "", idNumber: "", hireDate: "", basicSalary: 0, housingAllowance: 0, transportAllowance: 0, notes: "", isActive: "true" };

// تم نقل المكون إلى هنا (خارج الدالة الرئيسية)
const EmployeeForm = ({ data, setData, onSubmit, pending, title }: any) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2 col-span-2"><label className="text-sm font-medium">الاسم الكامل</label><Input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} required /></div>
      <div className="space-y-2"><label className="text-sm font-medium">المسمى الوظيفي</label><Input value={data.jobTitle || ""} onChange={e => setData({ ...data, jobTitle: e.target.value })} /></div>
      <div className="space-y-2"><label className="text-sm font-medium">رقم الجوال</label><Input value={data.phone || ""} onChange={e => setData({ ...data, phone: e.target.value })} /></div>
      <div className="space-y-2"><label className="text-sm font-medium">رقم الهوية</label><Input value={data.idNumber || ""} onChange={e => setData({ ...data, idNumber: e.target.value })} /></div>
      <div className="space-y-2"><label className="text-sm font-medium">تاريخ التعيين</label><Input type="date" value={data.hireDate || ""} onChange={e => setData({ ...data, hireDate: e.target.value })} /></div>
      <div className="space-y-2"><label className="text-sm font-medium">الراتب الأساسي</label><Input type="number" min="0" value={data.basicSalary} onChange={e => setData({ ...data, basicSalary: Number(e.target.value) })} required /></div>
      <div className="space-y-2"><label className="text-sm font-medium">بدل السكن</label><Input type="number" min="0" value={data.housingAllowance} onChange={e => setData({ ...data, housingAllowance: Number(e.target.value) })} /></div>
      <div className="space-y-2"><label className="text-sm font-medium">بدل النقل</label><Input type="number" min="0" value={data.transportAllowance} onChange={e => setData({ ...data, transportAllowance: Number(e.target.value) })} /></div>
      {title === "edit" && (
        <div className="space-y-2"><label className="text-sm font-medium">الحالة</label>
          <Select value={data.isActive || "true"} onValueChange={v => setData({ ...data, isActive: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">نشط</SelectItem>
              <SelectItem value="false">غير نشط</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2 col-span-2"><label className="text-sm font-medium">ملاحظات</label><Input value={data.notes || ""} onChange={e => setData({ ...data, notes: e.target.value })} /></div>
    </div>
    <Button type="submit" className="w-full" disabled={pending}>حفظ</Button>
  </form>
);

export default function Employees() {
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => fetch(`${BASE}/api/employees`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => fetch(`${BASE}/api/employees`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); setIsOpen(false); setForm(emptyForm); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      fetch(`${BASE}/api/employees/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); setEditItem(null); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/api/employees/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const filtered = employees.filter((e: any) => !search || e.name.includes(search));
  const totalSalaries = employees.reduce((s: number, e: any) => s + (Number(e.basicSalary) + Number(e.housingAllowance) + Number(e.transportAllowance)), 0);

  return (
    <div className="space-y-5">
      {/* باقي الكود الخاص بالعرض كما هو تماماً */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">قائمة الموظفين</h1>
          <p className="text-sm text-muted-foreground mt-1">إجمالي الرواتب الشهرية: <span className="font-bold text-foreground">{totalSalaries.toLocaleString()} ر.س</span></p>
        </div>
        {can("edit") && (
          <Button onClick={() => { setForm(emptyForm); setIsOpen(true); }}>
            <Plus className="ml-2 w-4 h-4" /> إضافة موظف
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 max-w-xs">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث بالاسم..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>المسمى الوظيفي</TableHead>
              <TableHead>الجوال</TableHead>
              <TableHead>الراتب الأساسي</TableHead>
              <TableHead>بدل السكن</TableHead>
              <TableHead>بدل النقل</TableHead>
              <TableHead>الإجمالي</TableHead>
              <TableHead>الحالة</TableHead>
              {can("edit") && <TableHead>إجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">لا يوجد موظفين</TableCell></TableRow>
            ) : filtered.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell>{e.jobTitle || "-"}</TableCell>
                <TableCell>{e.phone || "-"}</TableCell>
                <TableCell>{Number(e.basicSalary)?.toLocaleString()} ر.س</TableCell>
                <TableCell>{Number(e.housingAllowance)?.toLocaleString()} ر.س</TableCell>
                <TableCell>{Number(e.transportAllowance)?.toLocaleString()} ر.س</TableCell>
                <TableCell className="font-bold text-primary">{(Number(e.basicSalary) + Number(e.housingAllowance) + Number(e.transportAllowance)).toLocaleString()} ر.س</TableCell>
                <TableCell><Badge variant={e.isActive !== "false" ? "default" : "secondary"}>{e.isActive !== "false" ? "نشط" : "غير نشط"}</Badge></TableCell>
                {can("edit") && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditItem({ ...e, basicSalary: Number(e.basicSalary), housingAllowance: Number(e.housingAllowance), transportAllowance: Number(e.transportAllowance) })}>
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      {can("delete") && (
                        <Button variant="ghost" size="icon" onClick={() => confirm("حذف الموظف؟") && remove.mutate(e.id)}>
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>إضافة موظف جديد</DialogTitle></DialogHeader>
          <EmployeeForm data={form} setData={setForm} onSubmit={(e: any) => { e.preventDefault(); create.mutate(form); }} pending={create.isPending} title="create" />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل بيانات الموظف</DialogTitle></DialogHeader>
          {editItem && (
            <EmployeeForm data={editItem} setData={setEditItem} onSubmit={(e: any) => { e.preventDefault(); update.mutate({ id: editItem.id, data: editItem }); }} pending={update.isPending} title="edit" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}