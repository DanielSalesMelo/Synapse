import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ViewAsProvider } from "./contexts/ViewAsContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Trial from "./pages/Trial";
import { useAuth } from "@/_core/hooks/useAuth";

const DashboardRoutes = lazy(() => import("./DashboardRoutes"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/trial" component={Trial} />
      <Route path="/404" component={NotFound} />
      <Route component={ProtectedDashboardRoutes} />
    </Switch>
  );
}

function ProtectedDashboardRoutes() {
  const { loading, isAuthenticated } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/login",
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Redirecionando para login...</div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      }
    >
      <DashboardRoutes />
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <ViewAsProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ViewAsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
