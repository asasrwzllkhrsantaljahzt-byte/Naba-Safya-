import { useState } from "react";
import { useListExpenses, useCreateExpense, useDeleteExpense, useUpdateExpense, getListExpensesQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit } from "lucide-react";
import { queryClient } from "@/lib/utils";
import { format } from "date-fns";

const emptyForm = { date: new Date().toISOString().split('T')[0], category: "", description: "", amount: 0 };

export default function Expenses() {
  const { can } = useAuth();
  const { data: expenses = [], isLoading } = useListExpenses();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState(emptyForm);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createExpense.mutateAsync({ data: { ...formData, amount: Number(formData.amount) } });
    setIsOpen(false);
    setFormData(emptyForm);
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateExpense.mutateAsync({ id: editItem.id, data: { date: editItem.date, category: editItem.category, description: editItem.description, amount: Number(editItem.amount) } });
    setEditItem(null);
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
  };

  const handleDelete = async (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      await deleteExpense.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">المصروفات</h1>
        {can("edit") && (
          <Button onClick={() => { setFormData(emptyForm); setIsOpen(true); }}>
            <Plus className="ml-2 w-4 h-4" /> إضافة مصروف
          </Button>
        )}
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>التصنيف</TableHead>
              <TableHead>البيان</TableHead>
              <TableHead>المبلغ</TableHead>
              {can("edit") && <TableHead>إجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : expenses.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا يوجد مصروفات</TableCell></TableRow>
            ) : expenses.map(e => (
              <TableRow key={e.id}>
                <TableCell>{format(new Date(e.date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{e.category}</TableCell>
                <TableCell>{e.description}</TableCell>
                <TableCell className="font-bold">{e.amount} ر.س</TableCell>
                {can("edit") && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditItem({ ...e })}>
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      {can("delete") && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
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

      {/* Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة مصروف جديد</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><label>التاريخ</label><Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required /></div>
            <div className="space-y-2"><label>التصنيف</label><Input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} required /></div>
            <div className="space-y-2"><label>البيان</label><Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required /></div>
            <div className="space-y-2"><label>المبلغ</label><Input type="number" min="0" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} required /></div>
            <Button type="submit" className="w-full" disabled={createExpense.isPending}>حفظ</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل المصروف</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2"><label>التاريخ</label><Input type="date" value={editItem.date} onChange={e => setEditItem({ ...editItem, date: e.target.value })} required /></div>
              <div className="space-y-2"><label>التصنيف</label><Input value={editItem.category} onChange={e => setEditItem({ ...editItem, category: e.target.value })} required /></div>
              <div className="space-y-2"><label>البيان</label><Input value={editItem.description} onChange={e => setEditItem({ ...editItem, description: e.target.value })} required /></div>
              <div className="space-y-2"><label>المبلغ</label><Input type="number" min="0" step="0.01" value={editItem.amount} onChange={e => setEditItem({ ...editItem, amount: Number(e.target.value) })} required /></div>
              <Button type="submit" className="w-full" disabled={updateExpense.isPending}>حفظ التغييرات</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
