import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Droplets, LayoutDashboard, ShoppingCart, Truck, Package,
  Receipt, Wallet, BarChart3, ChevronDown, ChevronLeft,
  UserCog, UsersRound, Calculator, Settings
} from "lucide-react";

type SubItem = { name: string; href: string };
type NavItem = { name: string; icon: React.ElementType; href?: string; sub?: SubItem[] };

const nav: NavItem[] = [
  { name: "لوحة المتابعة", icon: LayoutDashboard, href: "/" },
  {
    name: "المشتريات", icon: ShoppingCart,
    sub: [
      { name: "فواتير المشتريات", href: "/purchases" },
      { name: "الموردين", href: "/suppliers" },
    ]
  },
  {
    name: "المبيعات", icon: Truck,
    sub: [
      { name: "فواتير المبيعات", href: "/sales" },
      { name: "العملاء", href: "/customers" },
    ]
  },
  {
    name: "المخزن", icon: Package,
    sub: [
      { name: "رصيد المخزن", href: "/inventory" },
      { name: "سند استلام / صرف", href: "/inventory/vouchers" },
      { name: "حركة المخزن", href: "/inventory/transactions" },
    ]
  },
  {
    name: "الموظفين", icon: UserCog,
    sub: [
      { name: "قائمة الموظفين", href: "/employees" },
      { name: "الحضور والغياب", href: "/attendance" },
      { name: "الرواتب والعمولات", href: "/payroll" },
    ]
  },
  {
    name: "المندوبين", icon: UsersRound,
    sub: [
      { name: "قائمة المندوبين", href: "/reps" },
      { name: "عهدة المناديب", href: "/rep-custody" },
    ]
  },
  {
    name: "المصروفات", icon: Receipt,
    sub: [
      { name: "المصروفات العامة", href: "/expenses" },
      { name: "مراكز التكلفة", href: "/cost-centers" },
    ]
  },
  {
    name: "التكاليف والأرباح", icon: Calculator,
    sub: [
      { name: "التكاليف التشغيلية", href: "/operational-costs" },
    ]
  },
  {
    name: "الخزينة", icon: Wallet,
    sub: [
      { name: "الخزينة", href: "/treasury" },
      { name: "الالتزامات", href: "/obligations" },
    ]
  },
  { name: "التقارير", icon: BarChart3, href: "/reports" },
  { name: "الإعدادات", icon: Settings, href: "/settings" },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

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
    return "النظام";
  };

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
        </nav>
        <div className="p-2 border-t">
          <a href="/rep-login" target="_blank" rel="noopener noreferrer">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-blue-600 hover:bg-blue-50 cursor-pointer">
              <UsersRound className="w-4 h-4 shrink-0" />
              <span>بوابة المندوبين</span>
            </div>
          </a>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="h-14 border-b bg-card flex items-center px-6 justify-between shrink-0">
          <h2 className="font-semibold">{currentPageName()}</h2>
          <span className="text-xs text-muted-foreground">314668535600003 :الرقم الضريبي</span>
        </header>
        <div className="flex-1 overflow-auto p-5">{children}</div>
      </main>
    </div>
  );
}
