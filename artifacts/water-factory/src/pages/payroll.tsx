import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Printer, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Payroll() {
  const curMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(curMonth);
  const [isOpen, setIsOpen] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const emptyForm = { employeeId: "", month: curMonth, basicSalary: 0, housingAllowance: 0, transportAllowance: 0, overtimeAmount: 0, commissions: 0, deductions: 0, absenceDeductions: 0, notes: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["payroll", month],
    queryFn: () => fetch(`${BASE}/api/payroll?month=${month}`).then(r => r.json()),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => fetch(`${BASE}/api/employees`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (data: any) => fetch(`${BASE}/api/payroll`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, employeeId: parseInt(data.employeeId) }) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payroll"] }); queryClient.invalidateQueries({ queryKey: ["obligations"] }); setIsOpen(false); setForm(emptyForm); },
  });

  const pay = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/api/payroll/${id}/pay`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payroll"] }); queryClient.invalidateQueries({ queryKey: ["treasury"] }); },
  });

  const handlePrint = (r: any) => {
    setPrintData(r);
    setTimeout(() => window.print(), 100);
  };

  const fillFromEmployee = (empId: string) => {
    const emp = employees.find((e: any) => String(e.id) === empId);
    if (emp) setForm(f => ({ ...f, employeeId: empId, basicSalary: emp.basicSalary, housingAllowance: emp.housingAllowance, transportAllowance: emp.transportAllowance }));
    else setForm(f => ({ ...f, employeeId: empId }));
  };

  const totalNet = records.reduce((s: number, r: any) => s + r.netSalary, 0);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">الرواتب والعمولات</h1>
          <p className="text-sm text-muted-foreground mt-1">إجمالي شهر {month}: <span className="font-bold text-foreground">{totalNet.toLocaleString()} ر.س</span></p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="ml-2 w-4 h-4" /> إضافة راتب</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>تسجيل راتب شهري</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الموظف</label>
                <Select value={form.employeeId} onValueChange={fillFromEmployee}>
                  <SelectTrigger><SelectValue placeholder="اختر موظفاً" /></SelectTrigger>
                  <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">الشهر</label><Input type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><label className="text-sm font-medium">الراتب الأساسي</label><Input type="number" min="0" step="0.01" value={form.basicSalary} onChange={e => setForm({ ...form, basicSalary: Number(e.target.value) })} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">بدل السكن</label><Input type="number" min="0" step="0.01" value={form.housingAllowance} onChange={e => setForm({ ...form, housingAllowance: Number(e.target.value) })} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">بدل النقل</label><Input type="number" min="0" step="0.01" value={form.transportAllowance} onChange={e => setForm({ ...form, transportAllowance: Number(e.target.value) })} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">الإضافي</label><Input type="number" min="0" step="0.01" value={form.overtimeAmount} onChange={e => setForm({ ...form, overtimeAmount: Number(e.target.value) })} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">العمولات</label><Input type="number" min="0" step="0.01" value={form.commissions} onChange={e => setForm({ ...form, commissions: Number(e.target.value) })} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">خصومات الغياب</label><Input type="number" min="0" step="0.01" value={form.absenceDeductions} onChange={e => setForm({ ...form, absenceDeductions: Number(e.target.value) })} /></div>
                <div className="space-y-2 col-span-2"><label className="text-sm font-medium">خصومات أخرى</label><Input type="number" min="0" step="0.01" value={form.deductions} onChange={e => setForm({ ...form, deductions: Number(e.target.value) })} /></div>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">ملاحظات</label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={create.isPending}>حفظ (يضاف تلقائياً للالتزامات)</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <div className="space-y-1"><label className="text-xs text-muted-foreground">الشهر</label><Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-44" /></div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الموظف</TableHead>
              <TableHead>الشهر</TableHead>
              <TableHead>الراتب</TableHead>
              <TableHead>البدلات</TableHead>
              <TableHead>العمولات/الإضافي</TableHead>
              <TableHead>الخصومات</TableHead>
              <TableHead>الصافي</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : records.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">لا يوجد رواتب لهذا الشهر</TableCell></TableRow>
            ) : records.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.employeeName}</TableCell>
                <TableCell>{r.month}</TableCell>
                <TableCell>{r.basicSalary?.toLocaleString()}</TableCell>
                <TableCell>{(r.housingAllowance + r.transportAllowance).toLocaleString()}</TableCell>
                <TableCell>{(r.commissions + r.overtimeAmount).toLocaleString()}</TableCell>
                <TableCell className="text-red-600">-{(r.deductions + r.absenceDeductions).toLocaleString()}</TableCell>
                <TableCell className="font-bold text-primary">{r.netSalary?.toLocaleString()} ر.س</TableCell>
                <TableCell><Badge variant={r.isPaid === "true" ? "default" : "secondary"}>{r.isPaid === "true" ? "مدفوع" : "قيد السداد"}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {r.isPaid !== "true" && (
                      <Button variant="outline" size="sm" onClick={() => confirm("صرف الراتب وخصمه من الخزينة؟") && pay.mutate(r.id)} disabled={pay.isPending}>
                        <DollarSign className="w-3.5 h-3.5 ml-1" /> صرف
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handlePrint(r)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Print Slip - hidden unless printing */}
      {printData && (
        <div className="hidden print:block" ref={printRef}>
          <div className="p-8 font-sans" dir="rtl">
            <div className="text-center border-b pb-4 mb-6">
              <h1 className="text-2xl font-bold">مصنع نبع صافيا لتعبئة المياه</h1>
              <p className="text-sm text-gray-500">الرقم الضريبي: 314668535600003</p>
              <h2 className="text-lg font-semibold mt-3">قسيمة راتب</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div><strong>الموظف:</strong> {printData.employeeName}</div>
              <div><strong>الشهر:</strong> {printData.month}</div>
            </div>
            <table className="w-full border-collapse">
              <thead><tr className="border-b"><th className="text-right py-2">البند</th><th className="text-left py-2">المبلغ</th></tr></thead>
              <tbody>
                <tr><td className="py-2">الراتب الأساسي</td><td className="text-left">{printData.basicSalary?.toLocaleString()} ر.س</td></tr>
                <tr><td className="py-2">بدل السكن</td><td className="text-left">{printData.housingAllowance?.toLocaleString()} ر.س</td></tr>
                <tr><td className="py-2">بدل النقل</td><td className="text-left">{printData.transportAllowance?.toLocaleString()} ر.س</td></tr>
                <tr><td className="py-2">الإضافي</td><td className="text-left">{printData.overtimeAmount?.toLocaleString()} ر.س</td></tr>
                <tr><td className="py-2">العمولات</td><td className="text-left">{printData.commissions?.toLocaleString()} ر.س</td></tr>
                <tr className="text-red-600"><td className="py-2">خصومات الغياب</td><td className="text-left">-{printData.absenceDeductions?.toLocaleString()} ر.س</td></tr>
                <tr className="text-red-600"><td className="py-2">خصومات أخرى</td><td className="text-left">-{printData.deductions?.toLocaleString()} ر.س</td></tr>
                <tr className="border-t-2 font-bold text-lg"><td className="py-3">الراتب الصافي</td><td className="text-left">{printData.netSalary?.toLocaleString()} ر.س</td></tr>
              </tbody>
            </table>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="text-center"><p>توقيع الموظف</p><div className="mt-8 border-t border-gray-400"></div></div>
              <div className="text-center"><p>توقيع المسؤول</p><div className="mt-8 border-t border-gray-400"></div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
