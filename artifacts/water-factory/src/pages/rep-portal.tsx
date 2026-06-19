import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LogOut, Plus, Users, ShoppingCart, ClipboardList, Droplets } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type RepInfo = { id: number; name: string; phone: string; area: string };
type Customer = { id: number; name: string; phone?: string; area?: string; bottleBalance: number; lastVisitDate?: string };
type Sale = { id: number; orderNumber?: string; customerName: string; grandTotal: number; paymentMethod: string; date: string; items: any[] };
type Settlement = {
  date: string; ordersCount: number; bottlesDelivered: number; bottlesSold: number;
  bottlesReturned: number; deficit: number; totalSales: number;
  byPayment: { cash: number; network: number; transfer: number; coupon: number; credit: number };
  totalCash: number; sales: Sale[];
};

const payMethodLabel: Record<string, string> = {
  cash: "نقدي", network: "شبكة", transfer: "تحويل", coupon: "كوبون", credit: "آجل",
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("rep_token")}`,
});

export default function RepPortal() {
  const [, navigate] = useLocation();
  const [repInfo, setRepInfo] = useState<RepInfo | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);

  // Customer form
  const [custOpen, setCustOpen] = useState(false);
  const [custForm, setCustForm] = useState({ name: "", phone: "", area: "", bottleBalance: "0", lastVisitDate: "" });

  // Products for orders (blue only)
  const [products, setProducts] = useState<{ id: number; name: string; unitPrice: number }[]>([]);

  // Order form
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customerId: "", paymentMethod: "cash", date: new Date().toISOString().split("T")[0],
    bottlesReturned: "0", notes: "",
  });
  const [orderItems, setOrderItems] = useState<{ productId: number; quantity: number; unitPrice: number }[]>([]);

  const logout = () => {
    localStorage.removeItem("rep_token");
    localStorage.removeItem("rep_info");
    navigate("/rep-login");
  };

  const loadData = useCallback(async () => {
    try {
      const [custRes, salesRes, settleRes, prodRes] = await Promise.all([
        fetch(`${BASE}/api/rep-portal/customers`, { headers: authHeaders() }),
        fetch(`${BASE}/api/rep-portal/sales`, { headers: authHeaders() }),
        fetch(`${BASE}/api/rep-portal/settlement?date=${settlementDate}`, { headers: authHeaders() }),
        fetch(`${BASE}/api/products`, { headers: authHeaders() }),
      ]);

      if (custRes.status === 401) { logout(); return; }
      if (custRes.ok) setCustomers(await custRes.json());
      if (salesRes.ok) setSales(await salesRes.json());
      if (settleRes.ok) setSettlement(await settleRes.json());
      if (prodRes.ok) {
        const prods = await prodRes.json();
        setProducts(prods.filter((p: any) => p.color === "blue"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [settlementDate]);

  useEffect(() => {
    const stored = localStorage.getItem("rep_info");
    if (!stored) { navigate("/rep-login"); return; }
    setRepInfo(JSON.parse(stored));
    loadData();
  }, [loadData, navigate]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${BASE}/api/rep-portal/customers`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ...custForm, bottleBalance: parseInt(custForm.bottleBalance) }),
    });
    if (res.ok) {
      setCustOpen(false);
      setCustForm({ name: "", phone: "", area: "", bottleBalance: "0", lastVisitDate: "" });
      loadData();
    }
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.customerId) return alert("اختر العميل");
    if (orderItems.length === 0) return alert("أضف منتجاً واحداً على الأقل");
    const res = await fetch(`${BASE}/api/sales`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        date: orderForm.date,
        customerId: parseInt(orderForm.customerId),
        repId: repInfo!.id,
        paymentMethod: orderForm.paymentMethod,
        bottlesReturned: parseInt(orderForm.bottlesReturned),
        notes: orderForm.notes,
        items: orderItems,
      }),
    });
    if (res.ok) {
      setOrderOpen(false);
      setOrderItems([]);
      setOrderForm({ customerId: "", paymentMethod: "cash", date: new Date().toISOString().split("T")[0], bottlesReturned: "0", notes: "" });
      loadData();
    } else {
      const d = await res.json();
      alert(d.error || "فشل في إضافة الطلبية");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Droplets className="w-12 h-12 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Droplets className="w-7 h-7" />
          <div>
            <div className="font-bold text-lg">مصنع نبع صافيا</div>
            <div className="text-blue-200 text-sm">{repInfo?.name} — {repInfo?.area}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-white hover:bg-blue-600" onClick={logout}>
          <LogOut className="w-4 h-4 ml-1" /> خروج
        </Button>
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        <Tabs defaultValue="settlement">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="settlement"><ClipboardList className="w-4 h-4 ml-1" />تصفية اليوم</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingCart className="w-4 h-4 ml-1" />الطلبيات</TabsTrigger>
            <TabsTrigger value="customers"><Users className="w-4 h-4 ml-1" />العملاء</TabsTrigger>
          </TabsList>

          {/* Settlement Tab */}
          <TabsContent value="settlement" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <CardTitle>تصفية التسليم</CardTitle>
                  <Input type="date" value={settlementDate} onChange={e => setSettlementDate(e.target.value)} className="w-auto" onBlur={() => loadData()} />
                </div>
              </CardHeader>
              <CardContent>
                {settlement ? (
                  <div className="space-y-4">
                    {/* Bottles summary */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-3 text-center">
                          <div className="text-2xl font-bold text-blue-700">{settlement.bottlesDelivered}</div>
                          <div className="text-xs text-blue-600 mt-1">قوارير مُسلَّمة</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-3 text-center">
                          <div className="text-2xl font-bold text-green-700">{settlement.bottlesSold}</div>
                          <div className="text-xs text-green-600 mt-1">قوارير مباعة</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-yellow-50 border-yellow-200">
                        <CardContent className="p-3 text-center">
                          <div className="text-2xl font-bold text-yellow-700">{settlement.bottlesReturned}</div>
                          <div className="text-xs text-yellow-600 mt-1">قوارير راجعة</div>
                        </CardContent>
                      </Card>
                      <Card className={settlement.deficit > 0 ? "bg-red-50 border-red-200" : settlement.deficit < 0 ? "bg-purple-50 border-purple-200" : "bg-gray-50"}>
                        <CardContent className="p-3 text-center">
                          <div className={`text-2xl font-bold ${settlement.deficit > 0 ? "text-red-700" : settlement.deficit < 0 ? "text-purple-700" : "text-gray-600"}`}>
                            {Math.abs(settlement.deficit)}
                          </div>
                          <div className={`text-xs mt-1 ${settlement.deficit > 0 ? "text-red-600" : settlement.deficit < 0 ? "text-purple-600" : "text-gray-500"}`}>
                            {settlement.deficit > 0 ? "⚠️ عجز" : settlement.deficit < 0 ? "زيادة" : "مطابق"}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Payment breakdown */}
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-base">تفاصيل التحصيل</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        {[
                          { key: "cash", label: "نقدي", color: "text-green-700 bg-green-50" },
                          { key: "network", label: "شبكة", color: "text-blue-700 bg-blue-50" },
                          { key: "transfer", label: "تحويل", color: "text-purple-700 bg-purple-50" },
                          { key: "coupon", label: "كوبون", color: "text-orange-700 bg-orange-50" },
                          { key: "credit", label: "آجل", color: "text-red-700 bg-red-50" },
                        ].map(({ key, label, color }) => {
                          const amount = settlement.byPayment[key as keyof typeof settlement.byPayment];
                          if (!amount) return null;
                          return (
                            <div key={key} className={`flex justify-between items-center rounded-lg px-4 py-2 ${color}`}>
                              <span className="font-medium">{label}</span>
                              <span className="font-bold">{amount.toFixed(2)} ر.س</span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between items-center rounded-lg px-4 py-3 bg-gray-900 text-white">
                          <span className="font-bold">إجمالي المبيعات</span>
                          <span className="font-bold text-lg">{settlement.totalSales.toFixed(2)} ر.س</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Orders count */}
                    <div className="text-sm text-muted-foreground text-center">
                      عدد الطلبيات: <strong>{settlement.ordersCount}</strong>
                    </div>

                    {/* Orders list */}
                    {settlement.sales.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>العميل</TableHead>
                              <TableHead>الدفع</TableHead>
                              <TableHead>المبلغ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {settlement.sales.map(s => (
                              <TableRow key={s.id}>
                                <TableCell>{s.customerName}</TableCell>
                                <TableCell><Badge variant="outline">{payMethodLabel[s.paymentMethod]}</Badge></TableCell>
                                <TableCell className="font-semibold">{s.grandTotal.toFixed(2)} ر.س</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">لا توجد بيانات لهذا اليوم</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">طلبيات المبيعات</h2>
              <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="ml-1 w-4 h-4" />طلبية جديدة</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
                  <DialogHeader><DialogTitle>إضافة طلبية جديدة</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddOrder} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm">التاريخ</label>
                      <Input type="date" value={orderForm.date} onChange={e => setOrderForm({ ...orderForm, date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm">العميل</label>
                      <Select value={orderForm.customerId} onValueChange={v => setOrderForm({ ...orderForm, customerId: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                        <SelectContent>
                          {customers.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm">طريقة الدفع</label>
                      <Select value={orderForm.paymentMethod} onValueChange={v => setOrderForm({ ...orderForm, paymentMethod: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">نقدي</SelectItem>
                          <SelectItem value="network">شبكة</SelectItem>
                          <SelectItem value="transfer">تحويل</SelectItem>
                          <SelectItem value="coupon">كوبون</SelectItem>
                          <SelectItem value="credit">آجل</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm">المنتجات</label>
                      <div className="flex flex-wrap gap-2">
                        {products.map(p => (
                          <Button key={p.id} type="button" variant="outline" size="sm"
                            onClick={() => !orderItems.find(i => i.productId === p.id) && setOrderItems([...orderItems, { productId: p.id, quantity: 1, unitPrice: p.unitPrice }])}>
                            + {p.name}
                          </Button>
                        ))}
                      </div>
                      {orderItems.map(item => {
                        const p = products.find(pr => pr.id === item.productId);
                        return (
                          <div key={item.productId} className="flex gap-2 items-center border rounded p-2">
                            <span className="text-sm flex-1">{p?.name}</span>
                            <Input type="number" min="1" value={item.quantity} className="w-20"
                              onChange={e => setOrderItems(orderItems.map(i => i.productId === item.productId ? { ...i, quantity: Number(e.target.value) } : i))} />
                            <Button type="button" variant="ghost" size="sm" className="text-red-500"
                              onClick={() => setOrderItems(orderItems.filter(i => i.productId !== item.productId))}>✕</Button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm">قوارير راجعة</label>
                        <Input type="number" min="0" value={orderForm.bottlesReturned} onChange={e => setOrderForm({ ...orderForm, bottlesReturned: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm">ملاحظات</label>
                        <Input value={orderForm.notes} onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })} />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">حفظ الطلبية</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="border rounded-lg overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>الدفع</TableHead>
                    <TableHead>المبلغ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">لا توجد طلبيات</TableCell></TableRow>
                  ) : sales.slice().reverse().map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{s.date}</TableCell>
                      <TableCell>{s.customerName}</TableCell>
                      <TableCell><Badge variant="outline">{payMethodLabel[s.paymentMethod]}</Badge></TableCell>
                      <TableCell className="font-semibold">{s.grandTotal.toFixed(2)} ر.س</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">عملائي ({customers.length})</h2>
              <Dialog open={custOpen} onOpenChange={setCustOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="ml-1 w-4 h-4" />عميل جديد</Button>
                </DialogTrigger>
                <DialogContent dir="rtl">
                  <DialogHeader><DialogTitle>إضافة عميل جديد</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddCustomer} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm">اسم العميل *</label>
                      <Input value={custForm.name} onChange={e => setCustForm({ ...custForm, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm">رقم الجوال</label>
                      <Input type="tel" value={custForm.phone} onChange={e => setCustForm({ ...custForm, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm">المنطقة</label>
                      <Input value={custForm.area} onChange={e => setCustForm({ ...custForm, area: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm">رصيد القوارير</label>
                        <Input type="number" min="0" value={custForm.bottleBalance} onChange={e => setCustForm({ ...custForm, bottleBalance: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm">آخر زيارة</label>
                        <Input type="date" value={custForm.lastVisitDate} onChange={e => setCustForm({ ...custForm, lastVisitDate: e.target.value })} />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">حفظ</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {customers.length === 0 ? (
                <Card><CardContent className="text-center py-8 text-muted-foreground">لا يوجد عملاء مسجلون بعد</CardContent></Card>
              ) : customers.map(c => (
                <Card key={c.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{c.name}</div>
                        {c.phone && <div className="text-sm text-muted-foreground">{c.phone}</div>}
                        {c.area && <div className="text-sm text-muted-foreground">{c.area}</div>}
                      </div>
                      <div className="text-left space-y-1">
                        <Badge className="bg-blue-100 text-blue-800">
                          {c.bottleBalance} قارورة
                        </Badge>
                        {c.lastVisitDate && (
                          <div className="text-xs text-muted-foreground">آخر زيارة: {c.lastVisitDate}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
