import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const typeLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  present: { label: "حاضر", variant: "default" },
  absent: { label: "غائب", variant: "destructive" },
  half_day: { label: "نصف يوم", variant: "secondary" },
  holiday: { label: "إجازة", variant: "outline" },
};

export default function Attendance() {
  const today = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(today);
  const [filterEmp, setFilterEmp] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const emptyForm = { employeeId: "", date: new Date().toISOString().split("T")[0], type: "present", overtime: 0, notes: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["attendance", month, filterEmp],
    queryFn: () => fetch(`${BASE}/api/attendance?month=${month}${filterEmp ? `&employeeId=${filterEmp}` : ""}`).then(r => r.json()),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => fetch(`${BASE}/api/employees`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (data: any) => fetch(`${BASE}/api/attendance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, employeeId: parseInt(data.employeeId) }) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance"] }); setIsOpen(false); setForm(emptyForm); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/api/attendance/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  });

  const summary = employees.map((e: any) => {
    const empRecords = records.filter((r: any) => r.employeeId === e.id);
    return {
      ...e,
      present: empRecords.filter((r: any) => r.type === "present").length,
      absent: empRecords.filter((r: any) => r.type === "absent").length,
      overtime: empRecords.reduce((s: number, r: any) => s + (r.overtime || 0), 0),
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">الحضور والغياب</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="ml-2 w-4 h-4" /> تسجيل حضور</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>تسجيل حضور / غياب</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الموظف</label>
                <Select value={form.employeeId} onValueChange={v => setForm({ ...form, employeeId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر موظفاً" /></SelectTrigger>
                  <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">التاريخ</label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
              <div className="space-y-2">
                <label className="text-sm font-medium">الحالة</label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">حاضر</SelectItem>
                    <SelectItem value="absent">غائب</SelectItem>
                    <SelectItem value="half_day">نصف يوم</SelectItem>
                    <SelectItem value="holiday">إجازة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">ساعات إضافية</label><Input type="number" min="0" step="0.5" value={form.overtime} onChange={e => setForm({ ...form, overtime: Number(e.target.value) })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">ملاحظات</label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={create.isPending}>حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="space-y-1"><label className="text-xs text-muted-foreground">الشهر</label><Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-40" /></div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">الموظف</label>
          <Select value={filterEmp} onValueChange={v => setFilterEmp(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="الكل" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">الكل</SelectItem>
              {employees.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summary.map((e: any) => (
          <div key={e.id} className="border rounded-lg p-4 bg-card">
            <div className="font-medium text-sm">{e.name}</div>
            <div className="mt-2 flex gap-3 text-xs">
              <span className="text-green-600">حاضر: {e.present}</span>
              <span className="text-red-600">غائب: {e.absent}</span>
              <span className="text-orange-600">إضافي: {e.overtime}س</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>الموظف</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>ساعات إضافية</TableHead>
              <TableHead>ملاحظات</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : records.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد سجلات لهذا الشهر</TableCell></TableRow>
            ) : records.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.date}</TableCell>
                <TableCell className="font-medium">{r.employeeName}</TableCell>
                <TableCell><Badge variant={typeLabels[r.type]?.variant ?? "secondary"}>{typeLabels[r.type]?.label ?? r.type}</Badge></TableCell>
                <TableCell>{r.overtime > 0 ? `${r.overtime} ساعة` : "-"}</TableCell>
                <TableCell>{r.notes || "-"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)}>
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
