import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Droplets, LayoutDashboard, ShoppingCart, Truck, Package,
  Wallet, BarChart3, ChevronDown, ChevronLeft,
  UserCog, UsersRound, Settings, ShieldCheck, LogIn, LogOut,
  Bell, BookOpen, X, Building2, FileText
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type SubItem = { name: string; href: string };
type NavItem = { name: string; icon: React.ElementType; href?: string; sub?: SubItem[] };

const nav: NavItem[] = [
  { name: "لوحة المتابعة", icon: LayoutDashboard, href: "/" },
  {
    name: "المالية", icon: Wallet,
    sub: [
      { name: "خزينة وبنوك", href: "/treasury" },
      { name: "القيود المحاسبية", href: "/journal" },
      { name: "دليل الحسابات", href: "/accounts" },
    ]
  },
  {
    name: "المشتريات", icon: ShoppingCart,
    sub: [
      { name: "طلبات الشراء", href: "/purchase-orders" },
      { name: "فواتير المشتريات", href: "/purchases" },
      { name: "مرتجع مشتريات", href: "/purchase-returns" },
      { name: "الموردين", href: "/suppliers" },
    ]
  },
  {
    name: "المبيعات", icon: Truck,
    sub: [
      { name: "طلبات البيع", href: "/sale-orders" },
      { name: "فواتير المبيعات", href: "/sales" },
      { name: "مرتجع مبيعات", href: "/sale-returns" },
      { name: "العملاء", href: "/customers" },
    ]
  },
  {
    name: "المخازن", icon: Package,
    sub: [
      { name: "إدارة المخازن", href: "/warehouses" },
      { name: "المنتجات", href: "/inventory/products" },
      { name: "الحركات", href: "/inventory/transactions" },
      { name: "تسوية مخزن", href: "/inventory/vouchers" },
    ]
  },
  {
    name: "الموظفين", icon: UserCog,
    sub: [
      { name: "بيانات الموظفين", href: "/employees" },
      { name: "الرواتب", href: "/payroll" },
      { name: "الحضور والغياب", href: "/attendance" },
    ]
  },
  { name: "التقارير", icon: BarChart3, href: "/reports" },
  { name: "الإعدادات", icon: Settings, href: "/settings" },
];

const roleLabelMap: Record<string, string> = { admin: "مشرف", manager: "مدير", viewer: "مشاهد" };

type Notification = {
  id: string;
  type: "sale" | "purchase" | "expense" | "payment";
  title: string;
  desc: string;
  time: string;
  amount?: number;
};

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const [notes, setNotes] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      fetch(`${BASE}/api/sales`).then(r => r.json()).catch(() => []),
      fetch(`${BASE}/api/purchases`).then(r => r.json()).catch(() => []),
      fetch(`${BASE}/api/expenses`).then(r => r.json()).catch(() => []),
      fetch(`${BASE}/api/obligations`).then(r => r.json()).catch(() => []),
    ]).then(([sales, purchases, expenses, obligations]) => {
      const result: Notification[] = [];
      (sales as any[]).filter(s => s.date === today).forEach(s => result.push({
        id: `sale-${s.id}`, type: "sale",
        title: `فاتورة بيع - ${s.customerName}`,
        desc: `${s.repName ?? ""} | ${s.orderNumber ?? ""}`,
        time: s.date, amount: parseFloat(s.grandTotal),
      }));
      (purchases as any[]).filter(p => p.date === today).forEach(p => result.push({
        id: `pur-${p.id}`, type: "purchase",
        title: `فاتورة شراء - ${p.supplierName ?? "مورد"}`,
        desc: p.invoiceNumber ?? "",
        time: p.date, amount: parseFloat(p.grandTotal),
      }));
      (expenses as any[]).filter(e => e.date === today).forEach(e => result.push({
        id: `exp-${e.id}`, type: "expense",
        title: `مصروف - ${e.description}`,
        desc: e.category ?? "",
        time: e.date, amount: parseFloat(e.amount),
      }));
      (Array.isArray(obligations) ? obligations : []).filter(o => o.dueDate === today && parseFloat(o.remainingAmount ?? o.totalAmount) > 0).forEach(o => result.push({
        id: `obl-${o.id}`, type: "payment",
        title: `التزام مستحق - ${o.supplierName}`,
        desc: `المتبقي: ${parseFloat(o.remainingAmount ?? o.totalAmount).toFixed(2)} ر.س`,
        time: o.dueDate,
      }));
      setNotes(result.sort((a, b) => b.id.localeCompare(a.id)));
    }).finally(() => setLoading(false));
  }, []);

  const typeColors: Record<string, string> = {
    sale: "bg-green-100 text-green-700", purchase: "bg-blue-100 text-blue-700",
    expense: "bg-red-100 text-red-700", payment: "bg-orange-100 text-orange-700",
  };
  const typeLabels: Record<string, string> = {
    sale: "بيع", purchase: "شراء", expense: "مصروف", payment: "التزام",
  };

  return (
    <div className="absolute left-0 top-12 w-80 bg-card border shadow-xl rounded-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <span className="font-bold text-sm">أحداث اليوم</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">جاري التحميل...</div>
        ) : notes.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>لا توجد أحداث اليوم</p>
          </div>
        ) : notes.map(n => (
          <div key={n.id} className="px-4 py-3 border-b last:border-0 hover:bg-muted/20 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${typeColors[n.type]}`}>{typeLabels[n.type]}</span>
                  <span className="text-sm font-medium truncate">{n.title}</span>
                </div>
                {n.desc && <p className="text-xs text-muted-foreground">{n.desc}</p>}
              </div>
              {n.amount !== undefined && (
                <span className="text-sm font-bold text-primary shrink-0">{n.amount.toFixed(2)} ر.س</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground text-center">
        {new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout, can } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [todayCount, setTodayCount] = useState(0);

  const hasActiveSub = (item: NavItem) => item.sub?.some(s => s.href === location) ?? false;

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    nav.forEach(item => { if (hasActiveSub(item)) init[item.name] = true; });
    return init;
  });

  const toggle = (name: string) => setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));

  const currentPageName = () => {
    for (const item of nav) {
      if (item.href && location === item.href) return item.name;
      if (item.sub) { const s = item.sub.find(x => x.href === location); if (s) return s.name; }
    }
    if (location === "/users") return "إدارة المستخدمين";
    return "النظام";
  };

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      fetch(`${BASE}/api/sales`).then(r => r.json()).catch(() => []),
      fetch(`${BASE}/api/purchases`).then(r => r.json()).catch(() => []),
      fetch(`${BASE}/api/expenses`).then(r => r.json()).catch(() => []),
    ]).then(([sales, purchases, expenses]) => {
      const count =
        (sales as any[]).filter(s => s.date === today).length +
        (purchases as any[]).filter(p => p.date === today).length +
        (expenses as any[]).filter(e => e.date === today).length;
      setTodayCount(count);
    }).catch(() => {});
  }, [location]);

  return (
    <div className="flex min-h-screen rtl" dir="rtl">
      <aside className="w-60 bg-card border-l flex flex-col shrink-0">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg text-primary"><Droplets className="w-5 h-5" /></div>
          <div>
            <div className="font-bold text-primary text-sm">مصنع نبع صافيا</div>
            <div className="text-xs text-muted-foreground">لتعبئة المياه</div>
          </div>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.href ? location === item.href : hasActiveSub(item);
            const isOpen = openMenus[item.name] ?? hasActiveSub(item);

            if (item.href) {
              return (
                <Link key={item.name} href={item.href}>
                  <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                </Link>
              );
            }

            return (
              <div key={item.name}>
                <button onClick={() => toggle(item.name)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium flex-1 text-right">{item.name}</span>
                  {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                </button>
                {isOpen && (
                  <div className="mr-6 mt-0.5 space-y-0.5">
                    {item.sub!.map((sub) => (
                      <Link key={sub.href} href={sub.href}>
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm ${location === sub.href ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                          <span className="w-1 h-1 rounded-full bg-current opacity-60 shrink-0" />
                          {sub.name}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {can("manageUsers") && (
            <Link href="/users">
              <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${location === "/users" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">إدارة المستخدمين</span>
              </div>
            </Link>
          )}
        </nav>

        <div className="p-2 border-t space-y-1">
          {user ? (
            <>
              <div className="px-3 py-2 text-xs text-muted-foreground">
                <div className="font-medium text-foreground truncate">{user.fullName}</div>
                <Badge variant="secondary" className="text-xs mt-0.5">{roleLabelMap[user.role] || user.role}</Badge>
              </div>
              <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 cursor-pointer">
                <LogOut className="w-4 h-4 shrink-0" />
                <span>تسجيل الخروج</span>
              </button>
            </>
          ) : (
            <Link href="/login">
              <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-blue-600 hover:bg-blue-50 cursor-pointer">
                <LogIn className="w-4 h-4 shrink-0" />
                <span>تسجيل الدخول</span>
              </div>
            </Link>
          )}
          <a href="/rep-login" target="_blank" rel="noopener noreferrer">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted cursor-pointer">
              <UsersRound className="w-4 h-4 shrink-0" />
              <span>بوابة المندوبين</span>
            </div>
          </a>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="h-14 border-b bg-card flex items-center px-6 justify-between shrink-0">
          <h2 className="font-semibold">{currentPageName()}</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setShowNotifications(v => !v)} className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Bell className="w-5 h-5" />
                {todayCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {todayCount > 99 ? "99+" : todayCount}
                  </span>
                )}
              </button>
              {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
            </div>
            <span className="text-xs text-muted-foreground">314668535600003 :الرقم الضريبي</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-5">{children}</div>
      </main>
    </div>
  );
}
