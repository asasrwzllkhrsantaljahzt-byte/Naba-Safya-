import { useState, useRef, useEffect } from "react";
import {
  useListSales,
  useCreateSale,
  useDeleteSale,
  useListProducts,
  useListCustomers,
  useListReps,
  getListSalesQueryKey
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Printer, Search, UserPlus, PackagePlus, ChevronDown } from "lucide-react";
import { queryClient } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const COMPANY_NAME = "مصنع نبع صافيا لتعبئة المياه";
const VAT_NUMBER = "314668535600003";

// ✅ helper مهم جدًا يحل كل المشاكل
const toArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (!data) return [];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const PAY_LABELS: Record<string, string> = {
  cash: "نقدي",
  network: "شبكة",
  transfer: "تحويل",
  coupon: "كوبون",
  credit: "آجل",
};

const PAY_COLORS: Record<string, string> = {
  cash: "bg-green-100 text-green-800",
  network: "bg-blue-100 text-blue-800",
  transfer: "bg-purple-100 text-purple-800",
  coupon: "bg-orange-100 text-orange-800",
  credit: "bg-red-100 text-red-800",
};

export default function Sales() {
  const { toast } = useToast();

  // ✅ تحويل آمن لكل الداتا
  const sales = toArray(useListSales().data);
  const allProducts = toArray(useListProducts().data);
  const customers = toArray(useListCustomers().data);
  const reps = toArray(useListReps().data);

  const isLoading = useListSales().isLoading;

  const products = allProducts.filter((p: any) => p.color === "blue" || !p.color);

  const createSale = useCreateSale();
  const deleteSale = useDeleteSale();

  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    customerId: "",
    repId: "",
    paymentMethod: "cash",
    bottlesReturned: "0",
    notes: "",
  });

  const handleAddItem = (productId: number) => {
    if (items.find(i => i.productId === productId)) return;

    const product = allProducts.find((p: any) => p.id === productId);

    setItems(prev => [
      ...prev,
      {
        productId,
        quantity: 1,
        unitPrice: product?.unitPrice || 0,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast({ title: "أضف منتج واحد على الأقل", variant: "destructive" });
      return;
    }

    await createSale.mutateAsync({
      data: {
        ...formData,
        customerId: Number(formData.customerId),
        repId: Number(formData.repId),
        bottlesReturned: Number(formData.bottlesReturned),
        items,
      } as any,
    });

    setIsOpen(false);
    setItems([]);
    queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف الطلبية؟")) return;
    await deleteSale.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
  };

  const filtered = sales;

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">المبيعات</h1>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 w-4 h-4" /> إضافة طلبية</Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة طلبية</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">

              <Input type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />

              <Select value={formData.customerId}
                onValueChange={v => setFormData({ ...formData, customerId: v })}>
                <SelectTrigger><SelectValue placeholder="العميل" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={formData.repId}
                onValueChange={v => setFormData({ ...formData, repId: v })}>
                <SelectTrigger><SelectValue placeholder="المندوب" /></SelectTrigger>
                <SelectContent>
                  {reps.map((r: any) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* products */}
              <div className="border p-3 rounded">
                <Button type="button" onClick={() => {
                  const p = products[0];
                  if (p) handleAddItem(p.id);
                }}>
                  إضافة منتج تجريبي
                </Button>
              </div>

              <Button type="submit" className="w-full">
                حفظ
              </Button>

            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العميل</TableHead>
              <TableHead>المندوب</TableHead>
              <TableHead>الإجمالي</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4}>تحميل...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>لا يوجد بيانات</TableCell>
              </TableRow>
            ) : (
              filtered.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.customerName}</TableCell>
                  <TableCell>{s.repName}</TableCell>
                  <TableCell>{Number(s.grandTotal || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm"
                      onClick={() => handleDelete(s.id)}>
                      حذف
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}