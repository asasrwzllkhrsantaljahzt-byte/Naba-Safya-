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
import { Card, CardContent } from "@/components/ui/card";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function RepCustody() {
  const [filterRep, setFilterRep] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const emptyForm = { repId: "", date: new Date().toISOString().split("T")[0], type: "give", description: "", amount: 0, notes: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: result = { records: [], summary: [] }, isLoading } = useQuery({
    queryKey: ["rep-custody", filterRep],
    queryFn: () => fetch(`${BASE}/api/rep-custody${filterRep ? `?repId=${filterRep}` : ""}`).then(r => r.json()),
  });

  const { data: reps = [] } = useQuery({
    queryKey: ["reps"],
    queryFn: () => fetch(`${BASE}/api/reps`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (data: any) => fetch(`${BASE}/api/rep-custody`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, repId: parseInt(data.repId) }) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rep-custody"] }); queryClient.invalidateQueries({ queryKey: ["treasury"] }); setIsOpen(false); setForm(emptyForm); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/api/rep-custody/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rep-custody"] }),
  });

  const records = result.records || [];
  const summary = result.summary || [];

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">عهدة المناديب</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="ml-2 w-4 h-4" /> إضافة عهدة</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة / استلام عهدة مندوب</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">المندوب</label>
                <Select value={form.repId} onValueChange={v => setForm({ ...form, repId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر مندوباً" /></SelectTrigger>
                  <SelectContent>{reps.map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">النوع</label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="give">تسليم عهدة (يُخصم من الخزينة)</SelectItem>
                    <SelectItem value="receive">استلام عهدة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">التاريخ</label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">البيان</label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">المبلغ</label><Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">ملاحظات</label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={create.isPending}>حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {summary.map((s: any) => (
          <Card key={s.repId}>
            <CardContent className="pt-4">
              <div className="font-semibold">{s.repName}</div>
              <div className="mt-2 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">تم تسليمه:</span><span className="font-bold">{s.given?.toLocaleString()} ر.س</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">تم استلامه:</span><span className="font-bold text-green-600">{s.received?.toLocaleString()} ر.س</span></div>
                <div className="flex justify-between border-t pt-1"><span className="text-muted-foreground">الرصيد:</span><span className={`font-bold ${s.balance > 0 ? "text-orange-600" : "text-green-600"}`}>{s.balance?.toLocaleString()} ر.س</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Select value={filterRep} onValueChange={v => setFilterRep(v === "_all" ? "" : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="كل المناديب" /></SelectTrigger>
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
              <TableHead>التاريخ</TableHead>
              <TableHead>المندوب</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>البيان</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : records.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد عهد</TableCell></TableRow>
            ) : records.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.date}</TableCell>
                <TableCell className="font-medium">{r.repName}</TableCell>
                <TableCell><Badge variant={r.type === "give" ? "destructive" : "default"}>{r.type === "give" ? "تسليم" : "استلام"}</Badge></TableCell>
                <TableCell>{r.description}</TableCell>
                <TableCell className="font-bold">{r.amount?.toLocaleString()} ر.س</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => confirm("حذف العهدة؟") && remove.mutate(r.id)}>
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
