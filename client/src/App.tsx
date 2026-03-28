import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAllowedRoles, type UserRole } from "@/_core/access/roleAccess";
import { useAuth } from "@/_core/hooks/useAuth";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense, useEffect, type ComponentType, type LazyExoticComponent } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Sales = lazy(() => import("./pages/Sales"));
const History = lazy(() => import("./pages/History"));
const PublicSales = lazy(() => import("./pages/PublicSales"));
const Pricing = lazy(() => import("./pages/Pricing"));
const PricesMargins = lazy(() => import("./pages/PricesMargins"));
const SalesReport = lazy(() => import("./pages/SalesReport"));
const Rankings = lazy(() => import("./pages/Rankings"));
const Encomendas = lazy(() => import("./pages/Encomendas"));
const Marcas = lazy(() => import("./pages/Marcas"));
const Login = lazy(() => import("./pages/Login"));
const PendingUsers = lazy(() => import("./pages/PendingUsers"));
const AuditTrail = lazy(() => import("./pages/AuditTrail"));
const ComponentShowcase = lazy(() => import("./pages/ComponentShowcase"));

type PrivateRouteConfig = {
  path: string;
  Component: LazyExoticComponent<ComponentType>;
  requiredRoles?: readonly UserRole[];
};

const privateRoutes: PrivateRouteConfig[] = [
  { path: "/", Component: Dashboard, requiredRoles: getAllowedRoles("/") },
  { path: "/produtos", Component: Products, requiredRoles: getAllowedRoles("/produtos") },
  { path: "/vendas", Component: Sales, requiredRoles: getAllowedRoles("/vendas") },
  { path: "/historico", Component: History, requiredRoles: getAllowedRoles("/historico") },
  { path: "/precos", Component: Pricing, requiredRoles: getAllowedRoles("/precos") },
  { path: "/precos-margens", Component: PricesMargins, requiredRoles: getAllowedRoles("/precos-margens") },
  { path: "/relatorio-vendas", Component: SalesReport, requiredRoles: getAllowedRoles("/relatorio-vendas") },
  { path: "/relatorio-encomendas", Component: Encomendas, requiredRoles: getAllowedRoles("/relatorio-encomendas") },
  { path: "/rankings", Component: Rankings, requiredRoles: getAllowedRoles("/rankings") },
  { path: "/marcas", Component: Marcas, requiredRoles: getAllowedRoles("/marcas") },
  { path: "/usuarios-pendentes", Component: PendingUsers, requiredRoles: getAllowedRoles("/usuarios-pendentes") },
  { path: "/auditoria", Component: AuditTrail, requiredRoles: getAllowedRoles("/auditoria") },
  { path: "/componentes", Component: ComponentShowcase, requiredRoles: getAllowedRoles("/componentes") },
];

function RoleGuard({
  requiredRoles,
  children,
}: {
  requiredRoles?: readonly UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (!requiredRoles || requiredRoles.length === 0) {
    return <>{children}</>;
  }

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando...</div>;
  }

  if (!user || !requiredRoles.includes(user.role as UserRole)) {
    return <NotFound />;
  }

  return <>{children}</>;
}

function preloadAfterIdle() {
  void Promise.all([
    import("./pages/Products"),
    import("./pages/Sales"),
    import("./pages/History"),
    import("./pages/Pricing"),
    import("./pages/Encomendas"),
  ]);
}

function Router() {
  useEffect(() => {
    const win = globalThis as unknown as Window & {
      requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof win.requestIdleCallback === "function") {
      const callbackId = win.requestIdleCallback(preloadAfterIdle, {
        timeout: 2000,
      });
      return () => win.cancelIdleCallback?.(callbackId);
    }

    const timeoutId = globalThis.setTimeout(preloadAfterIdle, 800);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-muted-foreground">Carregando...</div>}>
      <Switch>
        {/* Public route - no authentication required */}
        <Route path={"/vendedor"} component={PublicSales} />
        <Route path={"/login"} component={Login} />

        {privateRoutes.map(({ path, Component, requiredRoles }) => (
          <Route key={path} path={path}>
            <RoleGuard requiredRoles={requiredRoles}>
              <DashboardLayout>
                <Component />
              </DashboardLayout>
            </RoleGuard>
          </Route>
        ))}
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
