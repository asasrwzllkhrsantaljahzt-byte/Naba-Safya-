import { useGetDashboard, useGetMonthlySalesChart } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Droplet, Wallet, TrendingUp, Receipt, ShoppingCart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: dashboard, isLoading: isLoadingDashboard } = useGetDashboard();
  const { data: rawChartData, isLoading: isLoadingChart } = useGetMonthlySalesChart();

const chartData = Array.isArray(rawChartData)
  ? rawChartData
  : Array.isArray((rawChartData as any)?.data)
    ? (rawChartData as any).data
    : Array.isArray((rawChartData as any)?.monthly)
      ? (rawChartData as any).monthly
      : [];

  if (isLoadingDashboard || isLoadingChart) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // ✅ SAFE ARRAYS (حل نهائي لمشكلة map)
  const inventoryItems = Array.isArray(dashboard?.inventoryItems)
    ? dashboard.inventoryItems
    : [];

  const topReps = Array.isArray(dashboard?.topReps)
    ? dashboard.topReps
    : [];

  const recentSales = Array.isArray(dashboard?.recentSales)
    ? dashboard.recentSales
    : [];

  return (
    <div className="space-y-8">

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المبيعات</CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalSalesAmount ?? 0} ر.س</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">الخزينة</CardTitle>
            <Wallet className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.cashBalance ?? 0} ر.س</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">المصروفات</CardTitle>
            <Receipt className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalExpenses ?? 0} ر.س</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">صافي الربح</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboard?.netProfit ?? 0} ر.س</div>
          </CardContent>
        </Card>
      </div>

      {/* CHART + INVENTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>المبيعات والمشتريات الشهرية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Array.isArray(chartData) ? chartData : []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="salesAmount" name="المبيعات" fill="#4f46e5" />
                  <Bar dataKey="purchasesAmount" name="المشتريات" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>مخزون العبوات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">

              {inventoryItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Droplet className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">{item.productName}</span>
                  </div>
                  <span className="font-bold text-lg">{item.quantity} عبوة</span>
                </div>
              ))}

              {inventoryItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد بيانات مخزون
                </div>
              )}

            </div>
          </CardContent>
        </Card>
      </div>

      {/* REPS + SALES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card>
          <CardHeader>
            <CardTitle>أفضل المندوبين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">

              {topReps.map((rep, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-medium">{rep.repName}</div>
                      <div className="text-sm text-muted-foreground">{rep.totalOrders} طلبية</div>
                    </div>
                  </div>
                  <div className="font-bold">{rep.grandTotal} ر.س</div>
                </div>
              ))}

              {topReps.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد بيانات للمندوبين
                </div>
              )}

            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>أحدث الطلبيات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">

              {recentSales.slice(0, 5).map((sale, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <div className="font-medium">{sale.customerName}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(sale.date), "yyyy-MM-dd")}
                    </div>
                  </div>
                  <div className="font-bold">{sale.grandTotal} ر.س</div>
                </div>
              ))}

              {recentSales.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد طلبيات حديثة
                </div>
              )}

            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}