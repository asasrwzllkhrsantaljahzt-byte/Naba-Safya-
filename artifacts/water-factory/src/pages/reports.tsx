import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGetIncomeStatement, useGetBalanceSheet, useGetRepSalesReport, useGetRepCollectionsReport, useGetVatReport } from "@workspace/api-client-react";

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">التقارير</h1>
        <div className="flex items-end gap-4 bg-card p-4 rounded-lg border">
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">من تاريخ</label>
            <Input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">إلى تاريخ</label>
            <Input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} />
          </div>
        </div>
      </div>

      <Tabs defaultValue="income" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
          <TabsTrigger value="income" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-6 py-3">قائمة الدخل</TabsTrigger>
          <TabsTrigger value="balance" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-6 py-3">الميزانية</TabsTrigger>
          <TabsTrigger value="reps-sales" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-6 py-3">مبيعات المندوبين</TabsTrigger>
          <TabsTrigger value="reps-collections" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-6 py-3">تحصيلات المندوبين</TabsTrigger>
          <TabsTrigger value="vat" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-6 py-3">تقرير الضريبة</TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="mt-0">
          <IncomeStatementReport from={dateRange.from} to={dateRange.to} />
        </TabsContent>
        <TabsContent value="balance" className="mt-0">
          <BalanceSheetReport date={dateRange.to} />
        </TabsContent>
        <TabsContent value="reps-sales" className="mt-0">
          <RepSalesReport from={dateRange.from} to={dateRange.to} />
        </TabsContent>
        <TabsContent value="reps-collections" className="mt-0">
          <RepCollectionsReport from={dateRange.from} to={dateRange.to} />
        </TabsContent>
        <TabsContent value="vat" className="mt-0">
          <VatReport from={dateRange.from} to={dateRange.to} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IncomeStatementReport({ from, to }: { from: string, to: string }) {
  const { data: report, isLoading } = useGetIncomeStatement({ from, to });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">جاري تحميل التقرير...</div>;
  if (!report) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-xl">قائمة الدخل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-lg">
          <div className="flex justify-between border-b pb-2">
            <span>إجمالي الإيرادات (المبيعات)</span>
            <span className="font-bold">{report.totalRevenue} ر.س</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span>تكلفة البضاعة المباعة</span>
            <span className="font-bold text-red-600">({report.totalCost}) ر.س</span>
          </div>
          <div className="flex justify-between border-b pb-2 bg-muted/50 p-2 rounded">
            <span className="font-bold">مجمل الربح</span>
            <span className="font-bold text-primary">{report.grossProfit} ر.س</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span>إجمالي المصروفات التشغيلية</span>
            <span className="font-bold text-red-600">({report.totalExpenses}) ر.س</span>
          </div>
          <div className="flex justify-between border-b-2 border-primary pb-2 bg-primary/5 p-4 rounded mt-4">
            <span className="font-bold text-xl">صافي الربح</span>
            <span className="font-bold text-xl text-green-600">{report.netProfit} ر.س</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BalanceSheetReport({ date }: { date: string }) {
  const { data: report, isLoading } = useGetBalanceSheet({ date });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">جاري تحميل التقرير...</div>;
  if (!report) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="bg-muted/30">
          <CardTitle>الأصول (الممتلكات)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {report.assets.map((item, i) => (
            <div key={i} className="flex justify-between border-b pb-2">
              <span>{item.label}</span>
              <span className="font-bold">{item.amount} ر.س</span>
            </div>
          ))}
          <div className="flex justify-between bg-primary/10 p-3 rounded font-bold mt-4">
            <span>إجمالي الأصول</span>
            <span>{report.totalAssets} ر.س</span>
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-6">
        <Card>
          <CardHeader className="bg-muted/30">
            <CardTitle>الالتزامات وحقوق الملكية</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {report.liabilities.map((item, i) => (
              <div key={i} className="flex justify-between border-b pb-2">
                <span>{item.label}</span>
                <span className="font-bold">{item.amount} ر.س</span>
              </div>
            ))}
            <div className="flex justify-between border-b pb-2 mt-4">
              <span>حقوق الملكية (رأس المال + الأرباح)</span>
              <span className="font-bold">{report.equity} ر.س</span>
            </div>
            <div className="flex justify-between bg-primary/10 p-3 rounded font-bold mt-4">
              <span>إجمالي الالتزامات وحقوق الملكية</span>
              <span>{report.totalLiabilities + report.equity} ر.س</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RepSalesReport({ from, to }: { from: string, to: string }) {
  const { data: report = [], isLoading } = useGetRepSalesReport({ from, to });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">جاري تحميل التقرير...</div>;

  return (
    <div className="border rounded-lg bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المندوب</TableHead>
            <TableHead>المنطقة</TableHead>
            <TableHead>عدد الطلبيات</TableHead>
            <TableHead>قيمة المبيعات</TableHead>
            <TableHead>الضريبة</TableHead>
            <TableHead>الإجمالي</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.map(r => (
            <TableRow key={r.repId}>
              <TableCell className="font-bold">{r.repName}</TableCell>
              <TableCell>{r.area}</TableCell>
              <TableCell>{r.totalOrders}</TableCell>
              <TableCell>{r.totalAmount} ر.س</TableCell>
              <TableCell>{r.totalVat} ر.س</TableCell>
              <TableCell className="font-bold text-primary">{r.grandTotal} ر.س</TableCell>
            </TableRow>
          ))}
          {report.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8">لا توجد مبيعات في هذه الفترة</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

function RepCollectionsReport({ from, to }: { from: string, to: string }) {
  const { data: report = [], isLoading } = useGetRepCollectionsReport({ from, to });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">جاري تحميل التقرير...</div>;

  return (
    <div className="border rounded-lg bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المندوب</TableHead>
            <TableHead>نقدي</TableHead>
            <TableHead>شبكة</TableHead>
            <TableHead>كوبونات</TableHead>
            <TableHead>الإجمالي</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.map(r => (
            <TableRow key={r.repId}>
              <TableCell className="font-bold">{r.repName}</TableCell>
              <TableCell>{r.cashCollected} ر.س</TableCell>
              <TableCell>{r.networkCollected} ر.س</TableCell>
              <TableCell>{r.couponCollected} ر.س</TableCell>
              <TableCell className="font-bold text-green-600">{r.total} ر.س</TableCell>
            </TableRow>
          ))}
          {report.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8">لا توجد تحصيلات في هذه الفترة</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

function VatReport({ from, to }: { from: string, to: string }) {
  const { data: report, isLoading } = useGetVatReport({ from, to });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">جاري تحميل التقرير...</div>;
  if (!report) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="text-center border-b pb-6">
          <CardTitle className="text-2xl mb-2">{report.companyName}</CardTitle>
          <p className="text-muted-foreground">الرقم الضريبي: {report.vatNumber}</p>
          <h3 className="text-xl font-bold mt-4">الإقرار الضريبي</h3>
          <p className="text-sm">عن الفترة من {from} إلى {to}</p>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="border p-4 rounded-lg bg-muted/30">
              <h4 className="font-bold mb-2">ضريبة المبيعات (المستحقة)</h4>
              <p className="text-3xl font-bold text-primary">{report.salesVat} ر.س</p>
            </div>
            <div className="border p-4 rounded-lg bg-muted/30">
              <h4 className="font-bold mb-2">ضريبة المشتريات (المستردة)</h4>
              <p className="text-3xl font-bold text-primary">{report.purchasesVat} ر.س</p>
            </div>
          </div>
          
          <div className="bg-primary/10 p-6 rounded-lg text-center">
            <h4 className="text-lg font-bold mb-2">صافي الضريبة المستحقة للهيئة</h4>
            <p className="text-4xl font-bold text-primary">{report.netVat} ر.س</p>
          </div>

          <div className="flex justify-center mt-8">
            <Button onClick={() => window.print()} variant="outline" className="print:hidden">
              طباعة الإقرار
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
