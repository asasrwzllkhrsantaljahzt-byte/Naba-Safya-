import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, TrendingDown, TrendingUp, Droplets, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CATEGORIES = [
  { value: "chemicals", label: "كيميكال" },
  { value: "water_returns", label: "ردود مياه" },
  { value: "rent", label: "إيجار" },
  { value: "electricity", label: "كهرباء" },
  { value: "salaries", label: "رواتب" },
  { value: "maintenance", label: "صيانة" },
  { value: "fuel", label: "وقود" },
  { value: "packaging", label: "تغليف وعبوات" },
  { value: "other", label: "أخرى" },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#94a3b8"];

type CostEntry = { id: number; date: string; month: string; category: string; description: string; amount: number; notes?: string };
type Analysis = {
  totalCost: number; bottlesProduced: number; bottlesSold: number; revenue: number;
  avgPrice: number; costPerBottle: number; profitPerBottle: number; grossProfit: number;
  byCategory: { category: string; label: string; amount: number; percentage: string }[];
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function OperationalCosts() {
  const [month, setMonth] = useState(currentMonth());
  const [costs, setCosts] = useState<CostEntry[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], category: "chemicals", description: "", amount: "", notes: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [costsRes, analysisRes] = await Promise.all([
        fetch(`${BASE}/api/operational-costs?month=${month}`),
        fetch(`${BASE}/api/operational-costs/analysis?month=${month}`),
      ]);
      if (costsRes.ok) setCosts(await costsRes.json());
      if (analysisRes.ok) setAnalysis(await analysisRes.json());
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${BASE}/api/operational-costs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    if (res.ok) {
      setIsOpen(false);
      setForm({ date: new Date().toISOString().split("T")[0], category: "chemicals", description: "", amount: "", notes: "" });
      loadData();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف هذا التكلفة؟")) return;
    await fetch(`${BASE}/api/operational-costs/${id}`, { method: "DELETE" });
    loadData();
  };

  const catLabel = (cat: string) => CATEGORIES.find(c => c.value === cat)?.label ?? cat;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-bold">التكاليف التشغيلية</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">الشهر:</label>
            <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-40" />
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="ml-2 w-4 h-4" />إضافة تكلفة</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>إضافة تكلفة تشغيلية</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm">التاريخ</label>
                  <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">الفئة</label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">الوصف</label>
                  <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required placeholder="وصف التكلفة" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">المبلغ (ر.س)</label>
                  <Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">ملاحظات</label>
                  <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">حفظ</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Analysis Cards */}
      {analysis && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-red-600">إجمالي التكاليف</span>
                  <TrendingDown className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-2xl font-bold text-red-700">{analysis.totalCost.toFixed(2)}</div>
                <div className="text-xs text-red-500">ريال سعودي</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-green-600">إجمالي الإيرادات</span>
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-2xl font-bold text-green-700">{analysis.revenue.toFixed(2)}</div>
                <div className="text-xs text-green-500">ريال سعودي</div>
              </CardContent>
            </Card>
            <Card className={analysis.grossProfit >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm ${analysis.grossProfit >= 0 ? "text-blue-600" : "text-orange-600"}`}>صافي الربح</span>
                  <BarChart3 className={`w-4 h-4 ${analysis.grossProfit >= 0 ? "text-blue-400" : "text-orange-400"}`} />
                </div>
                <div className={`text-2xl font-bold ${analysis.grossProfit >= 0 ? "text-blue-700" : "text-orange-700"}`}>{analysis.grossProfit.toFixed(2)}</div>
                <div className={`text-xs ${analysis.grossProfit >= 0 ? "text-blue-500" : "text-orange-500"}`}>ريال سعودي</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-purple-600">تكلفة القارورة</span>
                  <Droplets className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-purple-700">{analysis.costPerBottle.toFixed(2)}</div>
                <div className="text-xs text-purple-500">ريال / قارورة</div>
              </CardContent>
            </Card>
          </div>

          {/* Per-bottle breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-xl font-bold">{analysis.bottlesProduced}</div>
                <div className="text-sm text-muted-foreground">قوارير مُنتَجة</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-xl font-bold">{analysis.bottlesSold}</div>
                <div className="text-sm text-muted-foreground">قوارير مباعة</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-xl font-bold text-green-600">{analysis.avgPrice.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">متوسط سعر البيع</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`text-xl font-bold ${analysis.profitPerBottle >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {analysis.profitPerBottle.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">ربح القارورة الواحدة</div>
              </CardContent>
            </Card>
          </div>

          {/* Pie Chart */}
          {analysis.byCategory.length > 0 && (
            <Card>
              <CardHeader><CardTitle>توزيع التكاليف حسب الفئة</CardTitle></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 items-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={analysis.byCategory} dataKey="amount" nameKey="label" cx="50%" cy="50%" outerRadius={90} label={({ label, percentage }) => `${label} (${percentage}%)`}>
                        {analysis.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v.toFixed(2)} ر.س`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {analysis.byCategory.map((cat, i) => (
                      <div key={cat.category} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span>{cat.label}</span>
                        </div>
                        <div className="text-left">
                          <span className="font-semibold">{cat.amount.toFixed(2)} ر.س</span>
                          <span className="text-muted-foreground text-xs mr-2">({cat.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Costs Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>الفئة</TableHead>
              <TableHead>الوصف</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
            ) : costs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد تكاليف لهذا الشهر</TableCell></TableRow>
            ) : costs.map(c => (
              <TableRow key={c.id}>
                <TableCell>{c.date}</TableCell>
                <TableCell><span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{catLabel(c.category)}</span></TableCell>
                <TableCell>{c.description}</TableCell>
                <TableCell className="font-semibold">{c.amount.toFixed(2)} ر.س</TableCell>
                <TableCell className="text-left">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
