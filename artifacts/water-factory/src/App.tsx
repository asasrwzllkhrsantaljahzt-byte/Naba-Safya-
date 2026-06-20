import { Switch, Route, Router as WouterRouter } from "wouter";
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
import InventoryProducts from "@/pages/inventory-products";
import Login from "@/pages/login";
import Users from "@/pages/users";
import NotFound from "@/pages/not-found";
import { queryClient } from "@/lib/utils";

function AdminRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/purchases" component={Purchases} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/sales" component={Sales} />
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
        <Route path="/users" component={Users} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
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
  );
}

export default App;
