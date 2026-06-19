import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const typeLabels: Record<string, string> = { salary: "راتب", supplier: "مورد", rent: "إيجار", loan: "قرض", other: "أخرى" };
const statusBadge: Record<string, "default" | "secondary" | "destructive"> = { pending: "destructive", paid: "default", partial: "secondary" };
const statusLabels: Record<string, string> = { pending: "معلق", paid: "مدفوع", partial: "جزئي" };

export default function Obligations() {
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<any>(null);
  const [payAmount, setPayAmount] = useState(0);
  const emptyForm = { date: new Date().toISOString().split("T")[0], dueDate: "", type: "other", description: "", partyName: "", amount: 0, notes: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: result = { records: [], total: 0, paid: 0, remaining: 0 }, isLoading } = useQuery({
    queryKey: ["obligations", filterStatus, filterType],
    queryFn: () => fetch(`${BASE}/api/obligations?${filterStatus ? `status=${filterStatus}&` : ""}${filterType ? `type=${filterType}` : ""}`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => fetch(`${BASE}/api/obligations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["obligations"] }); setIsOpen(false); setForm(emptyForm); },
  });

  const pay = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) => fetch(`${BASE}/api/obligations/${id}/pay`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payAmount: amount, date: new Date().toISOString().split("T")[0] }) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["obligations"] }); queryClient.invalidateQueries({ queryKey: ["treasury"] }); setPayOpen(null); setPayAmount(0); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/api/obligations/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["obligations"] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">الالتزامات</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="ml-2 w-4 h-4" /> إضافة التزام</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة التزام جديد</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><label className="text-sm font-medium">التاريخ</label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
                <div className="space-y-2"><label className="text-sm font-medium">تاريخ الاستحقاق</label><Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">النوع</label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salary">راتب</SelectItem>
                    <SelectItem value="supplier">مورد</SelectItem>
                    <SelectItem value="rent">إيجار</SelectItem>
                    <SelectItem value="loan">قرض</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">البيان</label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">اسم الطرف (مورد / موظف)</label><Input value={form.partyName} onChange={e => setForm({ ...form, partyName: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">المبلغ</label><Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">ملاحظات</label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={create.isPending}>حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">إجمالي الالتزامات</p><p className="text-2xl font-bold text-destructive">{(result.total || 0).toLocaleString()} ر.س</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">المدفوع</p><p className="text-2xl font-bold text-green-600">{(result.paid || 0).toLocaleString()} ر.س</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">المتبقي</p><p className="text-2xl font-bold text-orange-600">{(result.remaining || 0).toLocaleString()} ر.س</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v === "_all" ? "" : v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="كل الحالات" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">كل الحالات</SelectItem>
            <SelectItem value="pending">معلق</SelectItem>
            <SelectItem value="partial">جزئي</SelectItem>
            <SelectItem value="paid">مدفوع</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={v => setFilterType(v === "_all" ? "" : v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="كل الأنواع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">كل الأنواع</SelectItem>
            <SelectItem value="salary">راتب</SelectItem>
            <SelectItem value="supplier">مورد</SelectItem>
            <SelectItem value="rent">إيجار</SelectItem>
            <SelectItem value="loan">قرض</SelectItem>
            <SelectItem value="other">أخرى</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>الاستحقاق</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>البيان</TableHead>
              <TableHead>الطرف</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>المدفوع</TableHead>
              <TableHead>المتبقي</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : (result.records || []).length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">لا توجد التزامات</TableCell></TableRow>
            ) : (result.records || []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.date}</TableCell>
                <TableCell>{r.dueDate || "-"}</TableCell>
                <TableCell><Badge variant="outline">{typeLabels[r.type] || r.type}</Badge></TableCell>
                <TableCell className="font-medium">{r.description}</TableCell>
                <TableCell>{r.partyName || "-"}</TableCell>
                <TableCell className="font-bold">{r.amount?.toLocaleString()} ر.س</TableCell>
                <TableCell className="text-green-600">{r.paidAmount?.toLocaleString()} ر.س</TableCell>
                <TableCell className="text-orange-600 font-bold">{r.remaining?.toLocaleString()} ر.س</TableCell>
                <TableCell><Badge variant={statusBadge[r.status] ?? "secondary"}>{statusLabels[r.status] ?? r.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {r.status !== "paid" && (
                      <Dialog open={payOpen?.id === r.id} onOpenChange={open => !open && setPayOpen(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => { setPayOpen(r); setPayAmount(r.remaining); }}>
                            <CreditCard className="w-3.5 h-3.5 ml-1" /> سداد
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>سداد الالتزام</DialogTitle></DialogHeader>
                          <div className="space-y-4 pt-2">
                            <p className="text-sm text-muted-foreground">{r.description} | المتبقي: {r.remaining?.toLocaleString()} ر.س</p>
                            <div className="space-y-2"><label className="text-sm font-medium">المبلغ المدفوع</label><Input type="number" min="0" max={r.remaining} step="0.01" value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} /></div>
                            <Button className="w-full" onClick={() => pay.mutate({ id: r.id, amount: payAmount })} disabled={pay.isPending}>تأكيد السداد (يُخصم من الخزينة)</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => confirm("حذف الالتزام؟") && remove.mutate(r.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
