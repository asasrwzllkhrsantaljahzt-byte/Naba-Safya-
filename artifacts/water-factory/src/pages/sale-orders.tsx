import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Eye } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SaleOrdersPage() {
  const [filterText, setFilterText] = useState("");
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sale-orders"],
    queryFn: () => fetch(`${BASE}/api/sales`).then((r) => r.json()),
  });

  const filtered = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    if (!filterText.trim()) return list;
    const q = filterText.toLowerCase();
    return list.filter((sale: any) =>
      String(sale.orderNumber ?? "").toLowerCase().includes(q) ||
      (sale.customerName ?? "").toLowerCase().includes(q)
    );
  }, [sales, filterText]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">طلبات البيع</h1>
          <p className="text-sm text-muted-foreground">عرض الطلبات الحالية المرتبطة بالفواتير</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="بحث برقم الطلب أو العميل" className="border-0 shadow-none" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الطلب</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>الإجمالي</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">جاري التحميل...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">لا توجد طلبات بيع</TableCell></TableRow>
            ) : filtered.map((sale: any) => (
              <TableRow key={sale.id}>
                <TableCell className="font-mono text-sm">{sale.orderNumber || "-"}</TableCell>
                <TableCell>{sale.customerName || "-"}</TableCell>
                <TableCell>{sale.date}</TableCell>
                <TableCell>{Number(sale.grandTotal || 0).toFixed(2)} ر.س</TableCell>
                <TableCell><Badge variant="outline">{sale.paymentMethod ?? "cash"}</Badge></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" title="عرض"><Eye className="h-4 w-4 text-primary" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
