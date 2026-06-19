import { useState } from "react";
import { useGetTreasury, useListTreasuryTransactions, useCreateTreasuryTransaction, getListTreasuryTransactionsQueryKey, getGetTreasuryQueryKey, TreasuryTransactionInputType } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { queryClient } from "@/lib/utils";
import { format } from "date-fns";

export default function Treasury() {
  const { data: treasury, isLoading: isLoadingTreasury } = useGetTreasury();
  const { data: transactions = [], isLoading: isLoadingTransactions } = useListTreasuryTransactions();
  const createTransaction = useCreateTreasuryTransaction();
  
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: "in" as TreasuryTransactionInputType,
    amount: 0,
    description: "",
    notes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTransaction.mutateAsync({ 
      data: { ...formData, amount: Number(formData.amount) } 
    });
    setIsOpen(false);
    setFormData({ date: new Date().toISOString().split('T')[0], type: "in", amount: 0, description: "", notes: "" });
    queryClient.invalidateQueries({ queryKey: getListTreasuryTransactionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTreasuryQueryKey() });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">الخزينة</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 w-4 h-4" /> حركة مالية يدوية</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة حركة مالية</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label>التاريخ</label>
                <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label>نوع الحركة</label>
                <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v as TreasuryTransactionInputType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">إيداع / وارد</SelectItem>
                    <SelectItem value="out">سحب / صادر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label>المبلغ</label>
                <Input type="number" min="0" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} required />
              </div>
              <div className="space-y-2">
                <label>البيان</label>
                <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full">حفظ الحركة</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">الرصيد الحالي</CardTitle>
            <Wallet className="w-4 h-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{treasury?.balance ?? 0} ر.س</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الوارد</CardTitle>
            <ArrowDownRight className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{treasury?.totalIn ?? 0} ر.س</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الصادر</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{treasury?.totalOut ?? 0} ر.س</div>
          </CardContent>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTransactions ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
              ) : transactions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا يوجد حركات</TableCell></TableRow>
              ) : (
                transactions.map(t => (
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
                    <TableCell>
                      {t.source === 'sale' ? 'بيع' : 
                       t.source === 'purchase' ? 'شراء' : 
                       t.source === 'expense' ? 'مصروفات' : 'يدوي'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
