import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const EXPENSE_CATS = ["إيجار", "رواتب", "مواد خام", "كهرباء", "وقود", "صيانة", "مواصلات", "أخرى"];

export default function CostCenters() {
  const { can } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [expOpen, setExpOpen] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const emptyForm = { name: "", description: "", budget: 0, notes: "" };
  const [form, setForm] = useState(emptyForm);
  const emptyExpForm = { date: new Date().toISOString().split("T")[0], category: "", description: "", amount: 0, notes: "" };
  const [expForm, setExpForm] = useState(emptyExpForm);

  const { data: centers = [], isLoading } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: () => fetch(`${BASE}/api/cost-centers`).then(r => r.json()),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["cost-center-expenses", expanded],
    queryFn: () => expanded ? fetch(`${BASE}/api/cost-centers/${expanded}/expenses`).then(r => r.json()) : Promise.resolve([]),
    enabled: !!expanded,
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => fetch(`${BASE}/api/cost-centers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cost-centers"] }); setIsOpen(false); setForm(emptyForm); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      fetch(`${BASE}/api/cost-centers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cost-centers"] }); setEditItem(null); },
  });

  const addExpense = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof expForm }) => fetch(`${BASE}/api/cost-centers/${id}/expenses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cost-center-expenses", expanded] }); queryClient.invalidateQueries({ queryKey: ["cost-centers"] }); setExpOpen(null); setExpForm(emptyExpForm); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/api/cost-centers/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cost-centers"] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">مراكز التكلفة</h1>
        {can("edit") && (
          <Button onClick={() => { setForm(emptyForm); setIsOpen(true); }}>
            <Plus className="ml-2 w-4 h-4" /> إضافة مركز
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
        ) : centers.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">لا توجد مراكز تكلفة</p>
        ) : centers.map((c: any) => (
          <Card key={c.id} className="overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
              <div>
                <div className="font-semibold">{c.name}</div>
                {c.description && <div className="text-sm text-muted-foreground">{c.description}</div>}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-sm">
                  <div className="text-muted-foreground">الإنفاق / الميزانية</div>
                  <div className="font-bold">{c.totalSpent?.toLocaleString()} / {c.budget?.toLocaleString()} ر.س</div>
                </div>
                <div className="flex gap-1">
                  {can("edit") && (
                    <>
                      <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setExpOpen(c.id); }}>
                        <Plus className="w-3.5 h-3.5 ml-1" /> إضافة مصروف
                      </Button>
                      <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setEditItem({ ...c }); }}>
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                    </>
                  )}
                  {can("delete") && (
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); confirm("حذف المركز وجميع مصروفاته؟") && remove.mutate(c.id); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                  <ChevronDown className={`w-5 h-5 transition-transform ${expanded === c.id ? "rotate-180" : ""}`} />
                </div>
              </div>
            </div>
            {expanded === c.id && (
              <CardContent className="border-t p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>التاريخ</TableHead><TableHead>التصنيف</TableHead><TableHead>البيان</TableHead><TableHead>المبلغ</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {expenses.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">لا توجد مصروفات</TableCell></TableRow>
                    ) : expenses.map((ex: any) => (
                      <TableRow key={ex.id}>
                        <TableCell>{ex.date}</TableCell>
                        <TableCell>{ex.category}</TableCell>
                        <TableCell>{ex.description}</TableCell>
                        <TableCell className="font-bold">{ex.amount?.toLocaleString()} ر.س</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة مركز تكلفة</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">اسم المركز</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">الوصف</label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">الميزانية</label><Input type="number" min="0" step="0.01" value={form.budget} onChange={e => setForm({ ...form, budget: Number(e.target.value) })} /></div>
            <Button type="submit" className="w-full" disabled={create.isPending}>حفظ</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل مركز التكلفة</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={e => { e.preventDefault(); update.mutate({ id: editItem.id, data: { name: editItem.name, description: editItem.description, budget: editItem.budget, notes: editItem.notes } }); }} className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium">اسم المركز</label><Input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">الوصف</label><Input value={editItem.description || ""} onChange={e => setEditItem({ ...editItem, description: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">الميزانية</label><Input type="number" min="0" step="0.01" value={editItem.budget} onChange={e => setEditItem({ ...editItem, budget: Number(e.target.value) })} /></div>
              <Button type="submit" className="w-full" disabled={update.isPending}>حفظ التغييرات</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog */}
      <Dialog open={!!expOpen} onOpenChange={open => !open && setExpOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة مصروف لمركز التكلفة</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); if (expOpen) addExpense.mutate({ id: expOpen, data: expForm }); }} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">التاريخ</label><Input type="date" value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })} required /></div>
            <div className="space-y-2">
              <label className="text-sm font-medium">التصنيف</label>
              <Select value={expForm.category} onValueChange={v => setExpForm({ ...expForm, category: v })}>
                <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                <SelectContent>{EXPENSE_CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">البيان</label><Input value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">المبلغ</label><Input type="number" min="0" step="0.01" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: Number(e.target.value) })} required /></div>
            <Button type="submit" className="w-full" disabled={addExpense.isPending}>حفظ (يُخصم من الخزينة)</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
