import { useGetDashboard, useGetMonthlySalesChart } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Droplet, Wallet, TrendingUp, Receipt, Users, ShoppingCart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: dashboard, isLoading: isLoadingDashboard } = useGetDashboard();
  const { data: chartData = [], isLoading: isLoadingChart } = useGetMonthlySalesChart();

  if (isLoadingDashboard || isLoadingChart) {
    return <div className="space-y-6"><Skeleton className="h-[200px] w-full" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  return (
    <div className="space-y-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>المبيعات والمشتريات الشهرية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Legend />
                  <Bar dataKey="salesAmount" name="المبيعات" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="purchasesAmount" name="المشتريات" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
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
              {dashboard?.inventoryItems?.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Droplet className={`w-5 h-5 ${item.color === 'white' ? 'text-gray-400' : 'text-blue-500'}`} />
                    <span className="font-medium">{item.productName}</span>
                  </div>
                  <span className="font-bold text-lg">{item.quantity} عبوة</span>
                </div>
              ))}
              {(!dashboard?.inventoryItems || dashboard.inventoryItems.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">لا توجد بيانات مخزون</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>أفضل المندوبين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard?.topReps?.map((rep, i) => (
                <div key={i} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
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
              {(!dashboard?.topReps || dashboard.topReps.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">لا توجد بيانات للمندوبين</div>
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
              {dashboard?.recentSales?.slice(0, 5).map((sale, i) => (
                <div key={i} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">{sale.customerName}</div>
                      <div className="text-sm text-muted-foreground">{format(new Date(sale.date), 'yyyy-MM-dd')}</div>
                    </div>
                  </div>
                  <div className="font-bold">{sale.grandTotal} ر.س</div>
                </div>
              ))}
              {(!dashboard?.recentSales || dashboard.recentSales.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">لا توجد طلبيات حديثة</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
