import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Employees() {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const emptyForm = { name: "", jobTitle: "", phone: "", idNumber: "", hireDate: "", basicSalary: 0, housingAllowance: 0, transportAllowance: 0, notes: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => fetch(`${BASE}/api/employees`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => fetch(`${BASE}/api/employees`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); setIsOpen(false); setForm(emptyForm); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/api/employees/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const filtered = employees.filter((e: any) => !search || e.name.includes(search));

  const totalSalaries = employees.reduce((s: number, e: any) => s + (e.basicSalary + e.housingAllowance + e.transportAllowance), 0);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">قائمة الموظفين</h1>
          <p className="text-sm text-muted-foreground mt-1">إجمالي الرواتب الشهرية: <span className="font-bold text-foreground">{totalSalaries.toLocaleString()} ر.س</span></p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="ml-2 w-4 h-4" /> إضافة موظف</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>إضافة موظف جديد</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2"><label className="text-sm font-medium">الاسم الكامل</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="space-y-2"><label className="text-sm font-medium">المسمى الوظيفي</label><Input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">رقم الجوال</label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">رقم الهوية</label><Input value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">تاريخ التعيين</label><Input type="date" value={form.hireDate} onChange={e => setForm({ ...form, hireDate: e.target.value })} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">الراتب الأساسي</label><Input type="number" min="0" value={form.basicSalary} onChange={e => setForm({ ...form, basicSalary: Number(e.target.value) })} required /></div>
                <div className="space-y-2"><label className="text-sm font-medium">بدل السكن</label><Input type="number" min="0" value={form.housingAllowance} onChange={e => setForm({ ...form, housingAllowance: Number(e.target.value) })} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">بدل النقل</label><Input type="number" min="0" value={form.transportAllowance} onChange={e => setForm({ ...form, transportAllowance: Number(e.target.value) })} /></div>
                <div className="space-y-2 col-span-2"><label className="text-sm font-medium">ملاحظات</label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
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
              <TableHead>إجراءات</TableHead>
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
                <TableCell>{e.basicSalary?.toLocaleString()} ر.س</TableCell>
                <TableCell>{e.housingAllowance?.toLocaleString()} ر.س</TableCell>
                <TableCell>{e.transportAllowance?.toLocaleString()} ر.س</TableCell>
                <TableCell className="font-bold text-primary">{(e.basicSalary + e.housingAllowance + e.transportAllowance).toLocaleString()} ر.س</TableCell>
                <TableCell><Badge variant={e.isActive !== "false" ? "default" : "secondary"}>{e.isActive !== "false" ? "نشط" : "غير نشط"}</Badge></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => confirm("حذف الموظف؟") && remove.mutate(e.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
