import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, CreditCard, Download, Database, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

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

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Omit<FactorySettings, "id">>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const { user, token } = useAuth();
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

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
  }, []);

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


  const handleFactoryReset = async () => {
    if (!user || user.role !== "admin") {
      setResetMessage("هذه الميزة متاحة فقط للمشرفين.");
      return;
    }
    if (!resetPassword) {
      setResetMessage("أدخل كلمة مرور المشرف قبل حذف البيانات.");
      return;
    }

    setResetLoading(true);
    setResetMessage(null);
    try {
      const res = await fetch(`${API}/api/admin/reset-factory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل في حذف البيانات");
      }
      setResetMessage("تمت إعادة ضبط المصنع وحذف البيانات بنجاح.");
      setResetPassword("");
    } catch (err) {
      setResetMessage(err instanceof Error ? err.message : "فشل في حذف البيانات");
    } finally {
      setResetLoading(false);
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
      <Tabs defaultValue="factory">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6 flex-wrap">
          <TabsTrigger
            value="reset"
            className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-6 py-3"
          >
            <Database className="w-4 h-4 ml-2" />
            حذف جميع البيانات
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

        {/* ===== RESET TAB ===== */}
        <TabsContent value="reset" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>حذف جميع البيانات</CardTitle>
              <CardDescription>تنفيذ إعادة ضبط المصنع لمسح بيانات التشغيل دون تغيير إعدادات المستخدم الأساسية.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-base font-semibold text-destructive">إعادة ضبط المصنع</p>
                <p className="text-sm text-muted-foreground mt-2">
                  سيؤدي هذا إلى حذف بيانات التشغيل الأساسية للنظام، مثل المبيعات، المشتريات، المصروفات، الحركات المخزنية، القيود المحاسبية، والالتزامات.
                  تبقى إعدادات المصنع الأساسية والمستخدمون.
                </p>

                <div className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">كلمة مرور المشرف</label>
                    <Input
                      type="password"
                      placeholder="أدخل كلمة مرور المشرف لتأكيد الحذف"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      disabled={resetLoading}
                    />
                  </div>
                  {resetMessage && (
                    <p className="text-sm text-destructive">{resetMessage}</p>
                  )}
                  <Button
                    onClick={handleFactoryReset}
                    disabled={resetLoading || !user || user.role !== "admin"}
                    className="w-full"
                    variant="destructive"
                  >
                    {resetLoading ? "جاري الحذف..." : "حذف البيانات وإعادة ضبط المصنع"}
                  </Button>
                  {!user || user.role !== "admin" ? (
                    <p className="text-sm text-muted-foreground">هذه الميزة متاحة لمستخدمي المشرف فقط.</p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
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
                    "إعدادات المصنع", "العملاء", "الموردين", "المندوبين",
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
