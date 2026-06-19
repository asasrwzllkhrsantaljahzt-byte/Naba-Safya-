import { useState } from "react";
import { useGetTreasury, useListTreasuryTransactions, useCreateTreasuryTransaction, getListTreasuryTransactionsQueryKey, getGetTreasuryQueryKey, TreasuryTransactionInputType } from "@workspace/api-client-react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowUpRight, ArrowDownRight, Wallet, Edit, Trash2 } from "lucide-react";
import { queryClient } from "@/lib/utils";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const sourceLabels: Record<string, string> = { sale: "بيع", purchase: "شراء", expense: "مصروفات", payroll: "رواتب", obligation: "التزامات", manual: "يدوي" };

export default function Treasury() {
  const { can } = useAuth();
  const { data: treasury } = useGetTreasury();
  const { data: transactions = [], isLoading: isLoadingTransactions } = useListTreasuryTransactions();
  const createTransaction = useCreateTreasuryTransaction();

  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], type: "in" as TreasuryTransactionInputType, amount: 0, description: "", notes: "" });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      fetch(`${BASE}/api/treasury/transactions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListTreasuryTransactionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTreasuryQueryKey() });
      setEditItem(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/api/treasury/transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListTreasuryTransactionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTreasuryQueryKey() });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTransaction.mutateAsync({ data: { ...formData, amount: Number(formData.amount) } });
    setIsOpen(false);
    setFormData({ date: new Date().toISOString().split('T')[0], type: "in", amount: 0, description: "", notes: "" });
    queryClient.invalidateQueries({ queryKey: getListTreasuryTransactionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTreasuryQueryKey() });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">الخزينة</h1>
        {can("edit") && (
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="ml-2 w-4 h-4" /> حركة مالية يدوية
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">الرصيد الحالي</CardTitle>
            <Wallet className="w-4 h-4 opacity-90" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{treasury?.balance ?? 0} ر.س</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الوارد</CardTitle>
            <ArrowDownRight className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{treasury?.totalIn ?? 0} ر.س</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الصادر</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{treasury?.totalOut ?? 0} ر.س</div></CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">حركة الخزينة</h2>
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>البيان</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>المصدر</TableHead>
                {can("edit") && <TableHead>إجراءات</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTransactions ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
              ) : transactions.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد حركات</TableCell></TableRow>
              ) : transactions.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>{format(new Date(t.date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>
                    {t.type === 'in' ? (
                      <span className="flex items-center text-green-600"><ArrowDownRight className="w-4 h-4 mr-1" /> إيداع</span>
                    ) : (
                      <span className="flex items-center text-red-600"><ArrowUpRight className="w-4 h-4 mr-1" /> سحب</span>
                    )}
                  </TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell className="font-bold" dir="ltr">{t.type === 'in' ? '+' : '-'}{t.amount} ر.س</TableCell>
                  <TableCell>{sourceLabels[t.source] || t.source}</TableCell>
                  {can("edit") && (
                    <TableCell>
                      <div className="flex gap-1">
                        {t.source === "manual" && (
                          <Button variant="ghost" size="icon" onClick={() => setEditItem({ ...t })}>
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                        )}
                        {can("delete") && t.source === "manual" && (
                          <Button variant="ghost" size="icon" onClick={() => confirm("حذف هذه الحركة؟") && remove.mutate(t.id)}>
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
      </div>

      {/* Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة حركة مالية</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><label>التاريخ</label><Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required /></div>
            <div className="space-y-2"><label>نوع الحركة</label>
              <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v as TreasuryTransactionInputType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">إيداع / وارد</SelectItem>
                  <SelectItem value="out">سحب / صادر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><label>المبلغ</label><Input type="number" min="0" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} required /></div>
            <div className="space-y-2"><label>البيان</label><Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required /></div>
            <Button type="submit" className="w-full">حفظ الحركة</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل الحركة المالية</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={e => { e.preventDefault(); update.mutate({ id: editItem.id, data: { date: editItem.date, type: editItem.type, amount: Number(editItem.amount), description: editItem.description } }); }} className="space-y-4">
              <div className="space-y-2"><label>التاريخ</label><Input type="date" value={editItem.date} onChange={e => setEditItem({ ...editItem, date: e.target.value })} required /></div>
              <div className="space-y-2"><label>نوع الحركة</label>
                <Select value={editItem.type} onValueChange={v => setEditItem({ ...editItem, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">إيداع / وارد</SelectItem>
                    <SelectItem value="out">سحب / صادر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><label>المبلغ</label><Input type="number" min="0" step="0.01" value={editItem.amount} onChange={e => setEditItem({ ...editItem, amount: Number(e.target.value) })} required /></div>
              <div className="space-y-2"><label>البيان</label><Input value={editItem.description} onChange={e => setEditItem({ ...editItem, description: e.target.value })} required /></div>
              <Button type="submit" className="w-full" disabled={update.isPending}>حفظ التغييرات</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
