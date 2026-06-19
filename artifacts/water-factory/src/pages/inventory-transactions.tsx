import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const refTypeLabels: Record<string, string> = { purchase: "شراء", sale: "بيع", voucher: "سند يدوي" };

export default function InventoryTransactions() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("");
  const [refType, setRefType] = useState("");
  const [search, setSearch] = useState("");

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["inventory-transactions", from, to, type, refType],
    queryFn: () => {
      const p = new URLSearchParams();
      if (from) p.append("from", from);
      if (to) p.append("to", to);
      if (type) p.append("type", type);
      if (refType) p.append("refType", refType);
      return fetch(`${BASE}/api/inventory/transactions?${p}`).then(r => r.json());
    },
  });

  const filtered = transactions.filter((t: any) => !search || t.productName.includes(search) || t.reference.includes(search));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">حركة المخزن</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1"><label className="text-xs text-muted-foreground">من تاريخ</label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" /></div>
        <div className="space-y-1"><label className="text-xs text-muted-foreground">إلى تاريخ</label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" /></div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">الحركة</label>
          <Select value={type} onValueChange={v => setType(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-32"><SelectValue placeholder="الكل" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">الكل</SelectItem>
              <SelectItem value="in">وارد</SelectItem>
              <SelectItem value="out">صادر</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">المصدر</label>
          <Select value={refType} onValueChange={v => setRefType(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="الكل" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">الكل</SelectItem>
              <SelectItem value="purchase">شراء</SelectItem>
              <SelectItem value="sale">بيع</SelectItem>
              <SelectItem value="voucher">سند يدوي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><label className="text-xs text-muted-foreground">بحث</label><Input placeholder="اسم المنتج / المرجع..." value={search} onChange={e => setSearch(e.target.value)} className="w-44" /></div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>المنتج</TableHead>
              <TableHead>الكمية</TableHead>
              <TableHead>المصدر</TableHead>
              <TableHead>المرجع</TableHead>
              <TableHead>ملاحظات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد حركات</TableCell></TableRow>
            ) : filtered.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell>{t.date}</TableCell>
                <TableCell>
                  {t.type === "in"
                    ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><ArrowDownLeft className="w-3 h-3 ml-1" /> وارد</Badge>
                    : <Badge variant="destructive"><ArrowUpRight className="w-3 h-3 ml-1" /> صادر</Badge>}
                </TableCell>
                <TableCell className="font-medium">{t.productName}</TableCell>
                <TableCell className="font-bold" dir="ltr">{t.type === "in" ? "+" : "-"}{t.quantity}</TableCell>
                <TableCell><Badge variant="outline">{refTypeLabels[t.referenceType] ?? t.referenceType}</Badge></TableCell>
                <TableCell>{t.reference}</TableCell>
                <TableCell>{t.notes || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
