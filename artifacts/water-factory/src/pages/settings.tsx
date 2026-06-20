import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, CreditCard, Download, Database, CheckCircle, Package, Plus, Pencil, Trash2, Droplet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type FactorySettings = {
  id: number;
  companyName: string;
  vatNumber: string;
  phone: string;
  address: string;
  city: string;
  commercialReg: string;
  bankAccount: string;
  bankName: string;
  currency: string;
  invoiceNotes: string;
  logoUrl: string;
};

type Product = {
  id: number;
  name: string;
  color: string;
  unitPrice: number;
  vatRate: number;
  description?: string | null;
};

const defaultSettings: Omit<FactorySettings, "id"> = {
  companyName: "",
  vatNumber: "",
  phone: "",
  address: "",
  city: "",
  commercialReg: "",
  bankAccount: "",
  bankName: "",
  currency: "ر.س",
  invoiceNotes: "",
  logoUrl: "",
};

const emptyProduct = { name: "", color: "blue", unitPrice: "", vatRate: "15", description: "" };

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Omit<FactorySettings, "id">>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productDialog, setProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState(emptyProduct);

  useEffect(() => {
    fetch(`${API}/api/settings`)
      .then((r) => r.json())
      .then((data) => {
        setSettings({
          companyName: data.companyName ?? "",
          vatNumber: data.vatNumber ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          city: data.city ?? "",
          commercialReg: data.commercialReg ?? "",
          bankAccount: data.bankAccount ?? "",
          bankName: data.bankName ?? "",
          currency: data.currency ?? "ر.س",
          invoiceNotes: data.invoiceNotes ?? "",
          logoUrl: data.logoUrl ?? "",
        });
      })
      .catch(() => toast({ title: "خطأ", description: "فشل في جلب الإعدادات", variant: "destructive" }))
      .finally(() => setIsLoading(false));

    loadProducts();
  }, []);

  const loadProducts = () => {
    setProductsLoading(true);
    fetch(`${API}/api/products`)
      .then(r => r.json())
      .then(setProducts)
      .catch(() => toast({ title: "خطأ", description: "فشل في جلب المنتجات", variant: "destructive" }))
      .finally(() => setProductsLoading(false));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      toast({ title: "تم الحفظ", description: "تم حفظ إعدادات المصنع بنجاح" });
    } catch {
      toast({ title: "خطأ", description: "فشل في حفظ الإعدادات", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch(`${API}/api/backup`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "تم التنزيل", description: "تم إنشاء النسخة الاحتياطية بنجاح" });
    } catch {
      toast({ title: "خطأ", description: "فشل في إنشاء النسخة الاحتياطية", variant: "destructive" });
    } finally {
      setIsBackingUp(false);
    }
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProduct);
    setProductDialog(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({ name: p.name, color: p.color, unitPrice: String(p.unitPrice), vatRate: String(p.vatRate), description: p.description ?? "" });
    setProductDialog(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) return toast({ title: "خطأ", description: "اسم المنتج مطلوب", variant: "destructive" });
    if (!productForm.unitPrice) return toast({ title: "خطأ", description: "السعر مطلوب", variant: "destructive" });

    const body = {
      name: productForm.name,
      color: productForm.color,
      unitPrice: parseFloat(productForm.unitPrice),
      vatRate: parseFloat(productForm.vatRate),
      description: productForm.description || null,
    };

    try {
      if (editingProduct) {
        const res = await fetch(`${API}/api/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        toast({ title: "تم التعديل", description: "تم تعديل المنتج بنجاح" });
      } else {
        const res = await fetch(`${API}/api/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        toast({ title: "تمت الإضافة", description: "تم إضافة المنتج بنجاح" });
      }
      setProductDialog(false);
      loadProducts();
    } catch {
      toast({ title: "خطأ", description: "فشل في حفظ المنتج", variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    try {
      const res = await fetch(`${API}/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "تم الحذف", description: "تم حذف المنتج بنجاح" });
      loadProducts();
    } catch {
      toast({ title: "خطأ", description: "فشل في حذف المنتج", variant: "destructive" });
    }
  };

  const field = (label: string, key: keyof typeof defaultSettings, placeholder = "", type = "text") => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <Input
        type={type}
        placeholder={placeholder}
        value={settings[key]}
        onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
        disabled={isLoading}
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Tabs defaultValue="products">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6 flex-wrap">
          <TabsTrigger
            value="products"
            className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-6 py-3"
          >
            <Package className="w-4 h-4 ml-2" />
            المنتجات
          </TabsTrigger>
          <TabsTrigger
            value="factory"
            className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-6 py-3"
          >
            <Building2 className="w-4 h-4 ml-2" />
            بيانات المصنع
          </TabsTrigger>
          <TabsTrigger
            value="financial"
            className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-6 py-3"
          >
            <CreditCard className="w-4 h-4 ml-2" />
            البيانات المالية
          </TabsTrigger>
          <TabsTrigger
            value="backup"
            className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-6 py-3"
          >
            <Database className="w-4 h-4 ml-2" />
            النسخ الاحتياطي
          </TabsTrigger>
        </TabsList>

        {/* ===== PRODUCTS TAB ===== */}
        <TabsContent value="products" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>إدارة المنتجات</CardTitle>
                <CardDescription>أنواع القوارير التي تظهر في فواتير البيع والشراء</CardDescription>
              </div>
              <Button onClick={openAddProduct}>
                <Plus className="ml-2 w-4 h-4" /> إضافة منتج
              </Button>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">لا يوجد منتجات بعد</p>
                  <p className="text-sm mt-1">أضف أنواع القوارير لتظهر في فواتير البيع والشراء</p>
                  <Button className="mt-4" onClick={openAddProduct}><Plus className="ml-2 w-4 h-4" />إضافة أول منتج</Button>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>اسم المنتج</TableHead>
                        <TableHead>اللون</TableHead>
                        <TableHead>سعر الوحدة</TableHead>
                        <TableHead>نسبة الضريبة</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${p.color === "blue" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
                              <Droplet className="w-3 h-3" />
                              {p.color === "blue" ? "زرقاء" : "بيضاء"}
                            </span>
                          </TableCell>
                          <TableCell className="font-bold">{p.unitPrice.toFixed(2)} ر.س</TableCell>
                          <TableCell>{p.vatRate}%</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{p.description ?? "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditProduct(p)}>
                                <Pencil className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(p.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800">
                <strong>ملاحظة:</strong> القوارير الزرقاء تظهر في فواتير البيع، والقوارير البيضاء تستخدم في المشتريات وحركات المخزن.
              </div>
            </CardContent>
          </Card>

          {/* Product Dialog */}
          <Dialog open={productDialog} onOpenChange={setProductDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">اسم المنتج</label>
                  <Input
                    placeholder="مثال: عبوة 18.9 لتر"
                    value={productForm.name}
                    onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">اللون</label>
                  <Select value={productForm.color} onValueChange={v => setProductForm({ ...productForm, color: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue">🔵 زرقاء (تظهر في فواتير البيع)</SelectItem>
                      <SelectItem value="white">⚪ بيضاء (مشتريات ومخزن)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">سعر الوحدة (ر.س)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={productForm.unitPrice}
                      onChange={e => setProductForm({ ...productForm, unitPrice: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">نسبة الضريبة (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="15"
                      value={productForm.vatRate}
                      onChange={e => setProductForm({ ...productForm, vatRate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">وصف (اختياري)</label>
                  <Input
                    placeholder="وصف إضافي..."
                    value={productForm.description}
                    onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                  />
                </div>
                <Button className="w-full" onClick={handleSaveProduct}>
                  {editingProduct ? "حفظ التعديلات" : "إضافة المنتج"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ===== FACTORY TAB ===== */}
        <TabsContent value="factory" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>بيانات المصنع</CardTitle>
              <CardDescription>المعلومات الأساسية التي تظهر في الفواتير والتقارير</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {field("اسم الشركة / المصنع", "companyName", "مصنع نبع صافيا لتعبئة المياه")}
              {field("رقم السجل التجاري", "commercialReg", "1010000000")}
              {field("الهاتف", "phone", "0500000000", "tel")}
              {field("المدينة", "city", "الرياض")}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">العنوان</label>
                <Textarea
                  placeholder="حي، شارع، مبنى..."
                  value={settings.address}
                  onChange={(e) => setSettings((s) => ({ ...s, address: e.target.value }))}
                  disabled={isLoading}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">ملاحظات الفاتورة</label>
                <Textarea
                  placeholder="نص يظهر أسفل الفواتير..."
                  value={settings.invoiceNotes}
                  onChange={(e) => setSettings((s) => ({ ...s, invoiceNotes: e.target.value }))}
                  disabled={isLoading}
                  rows={3}
                />
              </div>
              <div className="pt-2">
                <Button onClick={handleSave} disabled={isSaving || isLoading} className="w-full">
                  {isSaving ? "جاري الحفظ..." : (
                    <><CheckCircle className="w-4 h-4 ml-2" />حفظ الإعدادات</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== FINANCIAL TAB ===== */}
        <TabsContent value="financial" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>البيانات المالية والضريبية</CardTitle>
              <CardDescription>بيانات الضريبة والحساب البنكي</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {field("الرقم الضريبي (VAT)", "vatNumber", "314668535600003")}
              {field("العملة", "currency", "ر.س")}
              {field("اسم البنك", "bankName", "بنك الراجحي")}
              {field("رقم الحساب البنكي / IBAN", "bankAccount", "SA0000000000000000000000")}
              <div className="pt-2">
                <Button onClick={handleSave} disabled={isSaving || isLoading} className="w-full">
                  {isSaving ? "جاري الحفظ..." : (
                    <><CheckCircle className="w-4 h-4 ml-2" />حفظ الإعدادات</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== BACKUP TAB ===== */}
        <TabsContent value="backup" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>النسخ الاحتياطي</CardTitle>
              <CardDescription>تنزيل نسخة احتياطية كاملة من جميع بيانات النظام</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium">ماذا تشمل النسخة الاحتياطية؟</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {[
                    "إعدادات المصنع", "المنتجات", "العملاء", "الموردين", "المندوبين",
                    "فواتير المبيعات والمشتريات", "المخزن وحركاته",
                    "المصروفات والخزينة", "الموظفين والرواتب",
                    "التكاليف التشغيلية والالتزامات",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  💡 يُنصح بأخذ نسخة احتياطية بشكل دوري (أسبوعياً أو شهرياً) وحفظها في مكان آمن.
                </p>
              </div>

              <Button
                onClick={handleBackup}
                disabled={isBackingUp}
                size="lg"
                className="w-full"
              >
                {isBackingUp ? "جاري إنشاء النسخة..." : (
                  <><Download className="w-4 h-4 ml-2" />تنزيل نسخة احتياطية</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
