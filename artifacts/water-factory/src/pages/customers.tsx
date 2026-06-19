import { useState } from "react";
import { useListCustomers, useCreateCustomer } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { queryClient } from "@/lib/utils";
import { getListCustomersQueryKey } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Customers() {
  const [search, setSearch] = useState("");
  const [filterRep, setFilterRep] = useState("");
  const { data: customers = [], isLoading } = useListCustomers({ search });
  const createCustomer = useCreateCustomer();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "", phone: "", area: "", notes: "",
    repId: "", repName: "",
    bottleBalance: "0", lastVisitDate: "",
  });

  const { data: reps = [] } = useQuery({
    queryKey: ["reps"],
    queryFn: () => fetch(`${BASE}/api/reps`).then(r => r.json()),
  });

  const handleRepChange = (repId: string) => {
    if (repId === "_none") {
      setFormData({ ...formData, repId: "", repName: "" });
      return;
    }
    const rep = reps.find((r: any) => String(r.id) === repId);
    setFormData({ ...formData, repId, repName: rep?.name ?? "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCustomer.mutateAsync({
      data: {
        name: formData.name,
        phone: formData.phone || undefined,
        area: formData.area || undefined,
        notes: formData.notes || undefined,
        repId: formData.repId ? parseInt(formData.repId) : undefined,
        repName: formData.repName || undefined,
        bottleBalance: parseInt(formData.bottleBalance) || 0,
        lastVisitDate: formData.lastVisitDate || undefined,
      } as any
    });
    setIsOpen(false);
    setFormData({ name: "", phone: "", area: "", notes: "", repId: "", repName: "", bottleBalance: "0", lastVisitDate: "" });
    queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
  };

  const filtered = customers.filter((c: any) => {
    if (filterRep && String(c.repId) !== filterRep) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">العملاء</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 w-4 h-4" /> إضافة عميل</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>إضافة عميل جديد</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">اسم العميل *</label>
                  <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">رقم الجوال</label>
                  <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">المنطقة</label>
                  <Input value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">رصيد القوارير</label>
                  <Input type="number" min="0" value={formData.bottleBalance} onChange={e => setFormData({ ...formData, bottleBalance: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">تاريخ آخر زيارة</label>
                  <Input type="date" value={formData.lastVisitDate} onChange={e => setFormData({ ...formData, lastVisitDate: e.target.value })} />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">المندوب المختص</label>
                  <Select value={formData.repId || "_none"} onValueChange={handleRepChange}>
                    <SelectTrigger><SelectValue placeholder="اختر مندوباً (اختياري)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">بدون مندوب</SelectItem>
                      {reps.map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">ملاحظات</label>
                  <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createCustomer.isPending}>حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو الجوال..." value={search} onChange={e => setSearch(e.target.value)} className="w-52" />
        </div>
        <Select value={filterRep || "_all"} onValueChange={v => setFilterRep(v === "_all" ? "" : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="كل المناديب" /></SelectTrigger>
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
              <TableHead>الاسم</TableHead>
              <TableHead>الجوال</TableHead>
              <TableHead>المنطقة</TableHead>
              <TableHead>المندوب</TableHead>
              <TableHead>رصيد القوارير</TableHead>
              <TableHead>آخر زيارة</TableHead>
              <TableHead>الكوبونات المتبقية</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا يوجد عملاء</TableCell></TableRow>
            ) : filtered.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.phone || "-"}</TableCell>
                <TableCell>{c.area || "-"}</TableCell>
                <TableCell>{c.repName || "-"}</TableCell>
                <TableCell>
                  <Badge variant={c.bottleBalance > 0 ? "default" : "secondary"} className="text-xs">
                    {c.bottleBalance ?? 0} قارورة
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.lastVisitDate || "-"}</TableCell>
                <TableCell className="font-medium">{(c.remainingCoupons || 0).toFixed(2)} ر.س</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
