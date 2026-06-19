import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function InventoryVouchers() {
  const [isOpen, setIsOpen] = useState(false);
  const emptyForm = { date: new Date().toISOString().split("T")[0], type: "in", productId: "", quantity: 1, reference: "", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: inventory } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => fetch(`${BASE}/api/inventory`).then(r => r.json()),
  });

  const { data: vouchers = [], isLoading, refetch } = useQuery({
    queryKey: ["inventory-vouchers"],
    queryFn: () => fetch(`${BASE}/api/inventory/transactions?refType=voucher`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (data: any) => fetch(`${BASE}/api/inventory/vouchers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, productId: parseInt(data.productId) }) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); queryClient.invalidateQueries({ queryKey: ["inventory-vouchers"] }); setIsOpen(false); setForm(emptyForm); },
  });

  const products = inventory?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">سندات المخزن</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="ml-2 w-4 h-4" /> إضافة سند</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة سند مخزن</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">نوع السند</label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">سند استلام (وارد)</SelectItem>
                    <SelectItem value="out">سند صرف (صادر)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">التاريخ</label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
              <div className="space-y-2">
                <label className="text-sm font-medium">المنتج</label>
                <Select value={form.productId} onValueChange={v => setForm({ ...form, productId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر منتجاً" /></SelectTrigger>
                  <SelectContent>{products.map((p: any) => <SelectItem key={p.productId} value={String(p.productId)}>{p.productName} (الرصيد: {p.quantity})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">الكمية</label><Input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">رقم المرجع</label><Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="رقم السند..." /></div>
              <div className="space-y-2"><label className="text-sm font-medium">ملاحظات</label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={create.isPending}>حفظ السند</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {products.map((p: any) => (
          <div key={p.productId} className="border rounded-lg p-4 bg-card flex items-center justify-between">
            <div>
              <div className="font-semibold">{p.productName}</div>
              <div className="text-sm text-muted-foreground mt-1">الرصيد الحالي</div>
            </div>
            <div className="text-3xl font-bold text-primary">{p.quantity} <span className="text-sm font-normal text-muted-foreground">عبوة</span></div>
          </div>
        ))}
      </div>

      <div className="border rounded-lg bg-card">
        <div className="p-4 border-b font-semibold text-muted-foreground text-sm">سجل السندات اليدوية</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>المنتج</TableHead>
              <TableHead>الكمية</TableHead>
              <TableHead>المرجع</TableHead>
              <TableHead>ملاحظات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : vouchers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد سندات</TableCell></TableRow>
            ) : vouchers.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell>{v.date}</TableCell>
                <TableCell>
                  {v.type === "in"
                    ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><ArrowDownLeft className="w-3 h-3 ml-1" /> استلام</Badge>
                    : <Badge variant="destructive"><ArrowUpRight className="w-3 h-3 ml-1" /> صرف</Badge>}
                </TableCell>
                <TableCell>{v.productName}</TableCell>
                <TableCell className="font-bold" dir="ltr">{v.type === "in" ? "+" : "-"}{v.quantity}</TableCell>
                <TableCell>{v.reference}</TableCell>
                <TableCell>{v.notes || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
