import { Component, ErrorInfo, ReactNode } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Purchases from "@/pages/purchases";
import Sales from "@/pages/sales";
import Customers from "@/pages/customers";
import Reps from "@/pages/reps";
import Inventory from "@/pages/inventory";
import InventoryVouchers from "@/pages/inventory-vouchers";
import InventoryTransactions from "@/pages/inventory-transactions";
import Expenses from "@/pages/expenses";
import Treasury from "@/pages/treasury";
import Reports from "@/pages/reports";
import Suppliers from "@/pages/suppliers";
import Employees from "@/pages/employees";
import Attendance from "@/pages/attendance";
import Payroll from "@/pages/payroll";
import CostCenters from "@/pages/cost-centers";
import RepCustody from "@/pages/rep-custody";
import Obligations from "@/pages/obligations";
import OperationalCosts from "@/pages/operational-costs";
import RepLogin from "@/pages/rep-login";
import RepPortal from "@/pages/rep-portal";
import Settings from "@/pages/settings";
import Accounts from "@/pages/accounts";
import Warehouses from "@/pages/warehouses";
import PurchaseReturns from "@/pages/purchase-returns";
import SaleReturns from "@/pages/sale-returns";
import InventoryProducts from "@/pages/inventory-products";
import Login from "@/pages/login";
import Users from "@/pages/users";
import Journal from "@/pages/journal";
import NotFound from "@/pages/not-found";
import { queryClient } from "@/lib/utils";

// ✅ تعريف الأنواع بشكل صريح لمنع ارتباك الـ TypeScript
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// ✅ تم إصلاح الكلاس وإضافة الأنواع الممررة بشكل صحيح
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("🔴 App Error:", error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 text-center p-8">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-xl font-bold">حدث خطأ غير متوقع</h2>
          <p className="text-muted-foreground text-sm">
            {this.state.error?.message ?? "خطأ في تحميل الصفحة"}
          </p>
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminRouter() {
  const { user, isLoading } = useAuth();

  // ✅ انتظر تحميل بيانات المستخدم لمنع الـ Flash Screens
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  // ✅ حماية المسارات: لو غير مسجل، حوّله لصفحة الدخول فوراً
  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/purchases" component={Purchases} />
        <Route path="/purchase-orders" component={Purchases} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/sales" component={Sales} />
        <Route path="/sale-orders" component={Sales} />
        <Route path="/customers" component={Customers} />
        <Route path="/reps" component={Reps} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/inventory/products" component={InventoryProducts} />
        <Route path="/inventory/vouchers" component={InventoryVouchers} />
        <Route path="/inventory/transactions" component={InventoryTransactions} />
        <Route path="/employees" component={Employees} />
        <Route path="/attendance" component={Attendance} />
        <Route path="/payroll" component={Payroll} />
        <Route path="/rep-custody" component={RepCustody} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/cost-centers" component={CostCenters} />
        <Route path="/operational-costs" component={OperationalCosts} />
        <Route path="/treasury" component={Treasury} />
        <Route path="/obligations" component={Obligations} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route path="/accounts" component={Accounts} />
        <Route path="/warehouses" component={Warehouses} />
        <Route path="/purchase-returns" component={PurchaseReturns} />
        <Route path="/sale-returns" component={SaleReturns} />
        <Route path="/users" component={Users} />
        <Route path="/journal" component={Journal} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  // تأمين جلب الـ Base URL لتجنب أي أخطاء قراءة من المترجم
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={baseUrl}>
              <Switch>
                <Route path="/rep-login" component={RepLogin} />
                <Route path="/rep-portal" component={RepPortal} />
                <Route path="/login" component={Login} />
                <Route component={AdminRouter} />
              </Switch>
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
