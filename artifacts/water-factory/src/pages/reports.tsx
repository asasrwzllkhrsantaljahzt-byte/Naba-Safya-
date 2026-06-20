import { useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGetIncomeStatement, useGetBalanceSheet, useGetRepSalesReport, useGetRepCollectionsReport, useGetVatReport } from "@workspace/api-client-react";
import { Printer } from "lucide-react";

const COMPANY_NAME = "مصنع نبع صافيا لتعبئة المياه";
const VAT_NUMBER = "314668535600003";

function printElement(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8"/>
      <title>طباعة</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; direction: rtl; padding: 32px; color: #111; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: right; }
        th { background: #f3f4f6; font-weight: bold; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 16px; }
        .header h1 { font-size: 20px; margin: 0 0 6px 0; }
        .header p { margin: 2px 0; color: #555; font-size: 13px; }
        .row { display: flex; justify-content: space-between; padding: 10px 4px; border-bottom: 1px solid #e5e7eb; }
        .row .label { color: #555; }
        .row .value { font-weight: bold; }
        .total-row { display: flex; justify-content: space-between; padding: 12px 8px; background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 6px; margin-top: 12px; font-size: 16px; font-weight: bold; }
        .section-title { font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; border-right: 4px solid #2563eb; padding-right: 10px; }
        .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .red { color: #dc2626; }
        .green { color: #16a34a; }
        .blue { color: #2563eb; }
        @media print { body { padding: 16px; } }
      </style>
    </head>
    <body>${el.innerHTML}</body>
    </html>
  `);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}

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
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => printElement("income-print")}>
          <Printer className="ml-2 w-4 h-4" /> طباعة قائمة الدخل
        </Button>
      </div>

      <div id="income-print">
        <div className="header" style={{ textAlign: "center", marginBottom: "16px" }}>
          <h1 style={{ fontSize: "20px", margin: "0 0 4px 0" }}>{COMPANY_NAME}</h1>
          <p style={{ color: "#555", margin: 0 }}>الرقم الضريبي: {VAT_NUMBER}</p>
          <h2 style={{ fontSize: "16px", marginTop: "8px" }}>قائمة الدخل</h2>
          <p style={{ color: "#555", fontSize: "13px" }}>الفترة من {from} إلى {to}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">قائمة الدخل</CardTitle>
            <p className="text-center text-sm text-muted-foreground">الفترة من {from} إلى {to}</p>
          </CardHeader>
          <CardContent className="space-y-4 text-lg">
            <div className="flex justify-between border-b pb-3">
              <span className="text-muted-foreground">إجمالي الإيرادات (المبيعات)</span>
              <span className="font-bold">{Number(report.totalRevenue).toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between border-b pb-3">
              <span className="text-muted-foreground">تكلفة البضاعة المباعة</span>
              <span className="font-bold text-red-600">({Number(report.totalCost).toFixed(2)}) ر.س</span>
            </div>
            <div className="flex justify-between border-b pb-3 bg-muted/50 p-3 rounded">
              <span className="font-bold">مجمل الربح</span>
              <span className="font-bold text-primary">{Number(report.grossProfit).toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between border-b pb-3">
              <span className="text-muted-foreground">إجمالي المصروفات التشغيلية</span>
              <span className="font-bold text-red-600">({Number(report.totalExpenses).toFixed(2)}) ر.س</span>
            </div>
            <div className="flex justify-between border-b-2 border-primary pb-3 bg-primary/5 p-4 rounded mt-4">
              <span className="font-bold text-xl">صافي الربح</span>
              <span className={`font-bold text-xl ${Number(report.netProfit) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {Number(report.netProfit).toFixed(2)} ر.س
              </span>
            </div>

            {report.revenueBreakdown && report.revenueBreakdown.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-bold mb-3 text-base">تفصيل الإيرادات بالمنتج</h4>
                <div className="space-y-2">
                  {report.revenueBreakdown.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm border-b pb-2">
                      <span>{item.label}</span>
                      <span className="font-medium">{Number(item.amount).toFixed(2)} ر.س</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.expenseBreakdown && report.expenseBreakdown.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-bold mb-3 text-base">تفصيل المصروفات بالفئة</h4>
                <div className="space-y-2">
                  {report.expenseBreakdown.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm border-b pb-2">
                      <span>{item.label}</span>
                      <span className="font-medium text-red-600">{Number(item.amount).toFixed(2)} ر.س</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BalanceSheetReport({ date }: { date: string }) {
  const { data: report, isLoading } = useGetBalanceSheet({ date });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">جاري تحميل التقرير...</div>;
  if (!report) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => printElement("balance-print")}>
          <Printer className="ml-2 w-4 h-4" /> طباعة الميزانية
        </Button>
      </div>

      <div id="balance-print">
        <div className="header" style={{ textAlign: "center", marginBottom: "16px" }}>
          <h1 style={{ fontSize: "20px", margin: "0 0 4px 0" }}>{COMPANY_NAME}</h1>
          <p style={{ color: "#555", margin: 0 }}>الرقم الضريبي: {VAT_NUMBER}</p>
          <h2 style={{ fontSize: "16px", marginTop: "8px" }}>الميزانية العمومية</h2>
          <p style={{ color: "#555", fontSize: "13px" }}>بتاريخ: {date}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="bg-muted/30">
              <CardTitle>الأصول (الممتلكات)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {report.assets.map((item, i) => (
                <div key={i} className="flex justify-between border-b pb-2">
                  <span>{item.label}</span>
                  <span className="font-bold">{Number(item.amount).toFixed(2)} ر.س</span>
                </div>
              ))}
              <div className="flex justify-between bg-primary/10 p-3 rounded font-bold mt-4">
                <span>إجمالي الأصول</span>
                <span>{Number(report.totalAssets).toFixed(2)} ر.س</span>
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
                    <span className="font-bold">{Number(item.amount).toFixed(2)} ر.س</span>
                  </div>
                ))}
                <div className="flex justify-between border-b pb-2 mt-4">
                  <span>حقوق الملكية (رأس المال + الأرباح)</span>
                  <span className="font-bold">{Number(report.equity).toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between bg-primary/10 p-3 rounded font-bold mt-4">
                  <span>إجمالي الالتزامات وحقوق الملكية</span>
                  <span>{(Number(report.totalLiabilities) + Number(report.equity)).toFixed(2)} ر.س</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function RepSalesReport({ from, to }: { from: string, to: string }) {
  const { data: report = [], isLoading } = useGetRepSalesReport({ from, to });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">جاري تحميل التقرير...</div>;

  const grandTotal = (report as any[]).reduce((s, r) => s + Number(r.grandTotal), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => printElement("rep-sales-print")}>
          <Printer className="ml-2 w-4 h-4" /> طباعة التقرير
        </Button>
      </div>
      <div id="rep-sales-print">
        <div className="header" style={{ textAlign: "center", marginBottom: "16px" }}>
          <h1 style={{ fontSize: "20px", margin: "0 0 4px 0" }}>{COMPANY_NAME}</h1>
          <h2 style={{ fontSize: "16px", marginTop: "8px" }}>تقرير مبيعات المندوبين</h2>
          <p style={{ color: "#555", fontSize: "13px" }}>الفترة من {from} إلى {to}</p>
        </div>
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
              {(report as any[]).map((r: any) => (
                <TableRow key={r.repId}>
                  <TableCell className="font-bold">{r.repName}</TableCell>
                  <TableCell>{r.area}</TableCell>
                  <TableCell>{r.totalOrders}</TableCell>
                  <TableCell>{Number(r.totalAmount).toFixed(2)} ر.س</TableCell>
                  <TableCell>{Number(r.totalVat).toFixed(2)} ر.س</TableCell>
                  <TableCell className="font-bold text-primary">{Number(r.grandTotal).toFixed(2)} ر.س</TableCell>
                </TableRow>
              ))}
              {(report as any[]).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8">لا توجد مبيعات في هذه الفترة</TableCell></TableRow>
              )}
              {(report as any[]).length > 0 && (
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={3}>الإجمالي</TableCell>
                  <TableCell>{(report as any[]).reduce((s, r) => s + Number(r.totalAmount), 0).toFixed(2)} ر.س</TableCell>
                  <TableCell>{(report as any[]).reduce((s, r) => s + Number(r.totalVat), 0).toFixed(2)} ر.س</TableCell>
                  <TableCell className="text-primary">{grandTotal.toFixed(2)} ر.س</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function RepCollectionsReport({ from, to }: { from: string, to: string }) {
  const { data: report = [], isLoading } = useGetRepCollectionsReport({ from, to });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">جاري تحميل التقرير...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => printElement("rep-collections-print")}>
          <Printer className="ml-2 w-4 h-4" /> طباعة التقرير
        </Button>
      </div>
      <div id="rep-collections-print">
        <div className="header" style={{ textAlign: "center", marginBottom: "16px" }}>
          <h1 style={{ fontSize: "20px", margin: "0 0 4px 0" }}>{COMPANY_NAME}</h1>
          <h2 style={{ fontSize: "16px", marginTop: "8px" }}>تقرير تحصيلات المندوبين</h2>
          <p style={{ color: "#555", fontSize: "13px" }}>الفترة من {from} إلى {to}</p>
        </div>
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
              {(report as any[]).map((r: any) => (
                <TableRow key={r.repId}>
                  <TableCell className="font-bold">{r.repName}</TableCell>
                  <TableCell>{Number(r.cashCollected).toFixed(2)} ر.س</TableCell>
                  <TableCell>{Number(r.networkCollected).toFixed(2)} ر.س</TableCell>
                  <TableCell>{Number(r.couponCollected).toFixed(2)} ر.س</TableCell>
                  <TableCell className="font-bold text-green-600">{Number(r.total).toFixed(2)} ر.س</TableCell>
                </TableRow>
              ))}
              {(report as any[]).length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8">لا توجد تحصيلات في هذه الفترة</TableCell></TableRow>
              )}
              {(report as any[]).length > 0 && (
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>الإجمالي</TableCell>
                  <TableCell>{(report as any[]).reduce((s, r) => s + Number(r.cashCollected), 0).toFixed(2)} ر.س</TableCell>
                  <TableCell>{(report as any[]).reduce((s, r) => s + Number(r.networkCollected), 0).toFixed(2)} ر.س</TableCell>
                  <TableCell>{(report as any[]).reduce((s, r) => s + Number(r.couponCollected), 0).toFixed(2)} ر.س</TableCell>
                  <TableCell className="text-green-600">{(report as any[]).reduce((s, r) => s + Number(r.total), 0).toFixed(2)} ر.س</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
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
              <p className="text-3xl font-bold text-primary">{Number(report.salesVat).toFixed(2)} ر.س</p>
            </div>
            <div className="border p-4 rounded-lg bg-muted/30">
              <h4 className="font-bold mb-2">ضريبة المشتريات (المستردة)</h4>
              <p className="text-3xl font-bold text-primary">{Number(report.purchasesVat).toFixed(2)} ر.س</p>
            </div>
          </div>

          <div className="bg-primary/10 p-6 rounded-lg text-center">
            <h4 className="text-lg font-bold mb-2">صافي الضريبة المستحقة للهيئة</h4>
            <p className="text-4xl font-bold text-primary">{Number(report.netVat).toFixed(2)} ر.س</p>
          </div>

          <div className="flex justify-center mt-8">
            <Button onClick={() => window.print()} variant="outline" className="print:hidden">
              <Printer className="ml-2 w-4 h-4" /> طباعة الإقرار
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
