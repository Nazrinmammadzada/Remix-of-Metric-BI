import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import UserLayout from "@/components/layout/UserLayout";
import RouteGuard from "@/components/layout/RouteGuard";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import AccessDenied from "./pages/AccessDenied";
import HomePage from "./pages/HomePage";
import KpiCardsPage from "./pages/KpiCardsPage";
import KpiHubPage from "./pages/KpiHubPage";
import KpiScoresPage from "./pages/KpiScoresPage";
import ManagerResponsibleCardsPage from "./pages/manager/ManagerResponsibleCardsPage";
import ManagerResultsPage from "./pages/manager/ManagerResultsPage";
import ManagerBonusPage from "./pages/manager/ManagerBonusPage";
import ManagerKpiTrackingPage from "./pages/manager/ManagerKpiTrackingPage";
import KpiLifecyclePage from "./pages/KpiLifecyclePage";
import CascadeMatrixPage from "./pages/CascadeMatrixPage";
import CascadingPage from "./pages/CascadingPage";
import CascadingHubPage from "./pages/CascadingHubPage";
import GoalTrackingPage from "./pages/GoalTrackingPage";

import ReportsPage from "./pages/ReportsPage";
import TeamsPage from "./pages/TeamsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import SettingsPage from "./pages/SettingsPage";
import FormulasHubPage from "./pages/FormulasHubPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import MatrixPage from "./pages/MatrixPage";
import OrganizationPage from "./pages/OrganizationPage";
import SalaryPage from "./pages/SalaryPage";
import BonusPage from "./pages/BonusPage";
import EvaluationPage from "./pages/EvaluationPage";
import WhistleblowerPage from "./pages/WhistleblowerPage";
import UserWhistleblowerPage from "./pages/user/UserWhistleblowerPage";
import UserHomePage from "./pages/user/UserHomePage";
import UserKpiCardsPage from "./pages/user/UserKpiCardsPage";
import UserApprovalsPage from "./pages/user/UserApprovalsPage";
import UserReportsPage from "./pages/user/UserReportsPage";
import UserTeamsPage from "./pages/user/UserTeamsPage";
import UserSettingsPage from "./pages/user/UserSettingsPage";
import UserEvaluationPage from "./pages/user/UserEvaluationPage";
import SuperAdminLayout from "./components/layout/SuperAdminLayout";
import SuperAdminCompaniesPage from "./pages/SuperAdminCompaniesPage";
import ManagerLayout from "./components/layout/ManagerLayout";
import ManagerHomePage from "./pages/manager/ManagerHomePage";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { bootstrapDemoReviews } from "@/lib/peerReviewStore";
import { MOCK_HR_USER_ID, MOCK_USER_ID } from "@/data/mockData";

const queryClient = new QueryClient();

const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "SUPER_ADMIN") return <Navigate to="/super-admin" replace />;
  if (user.role === "MANAGER") return <Navigate to="/manager" replace />;
  if (user.role === "USER") return <Navigate to="/user" replace />;
  return <Navigate to="/hr" replace />;
};

const LoginGuard = () => {
  const { user } = useAuth();
  if (user) {
    const dest = user.role === "SUPER_ADMIN" ? "/super-admin"
      : user.role === "HR" ? "/hr"
      : user.role === "MANAGER" ? "/manager"
      : "/user";
    return <Navigate to={dest} replace />;
  }
  return <LoginPage />;
};

const App = () => {
  useEffect(() => {
    bootstrapDemoReviews([MOCK_HR_USER_ID, MOCK_USER_ID]);
  }, []);
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginGuard />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/access-denied" element={<AccessDenied />} />

            {/* HR Panel — Super Admin bura giriş edə bilməz */}
            <Route element={<RouteGuard blockRoles={["SUPER_ADMIN"]}><AppLayout /></RouteGuard>}>
              <Route path="/hr" element={<HomePage />} />
              <Route path="/kpi-kartlari" element={<KpiHubPage />} />
              <Route path="/kpi-qiymetleri" element={<KpiScoresPage />} />
              
              <Route path="/hedef-tayin-izleme" element={<GoalTrackingPage />} />
              <Route path="/kpi-lifecycle" element={<KpiLifecyclePage />} />
              <Route path="/cascading" element={<CascadingHubPage />} />
              <Route path="/cascade-matrisi" element={<CascadeMatrixPage />} />

              <Route path="/sistem-tesdiq" element={<UserApprovalsPage />} />
              <Route path="/tesdiqleme-matrisi" element={<MatrixPage />} />
              <Route path="/hesabat" element={<ReportsPage />} />
              <Route path="/komandalar" element={<TeamsPage />} />
              <Route path="/hesablama-dusturlari" element={<FormulasHubPage />} />
              <Route path="/inteqrasiyalar" element={<IntegrationsPage />} />
              <Route path="/teskilati-struktur" element={<OrganizationPage />} />
              <Route path="/emekhaqqi-bazasi" element={<SalaryPage />} />
              <Route path="/bonus" element={<BonusPage />} />
              <Route path="/qiymetlendirme" element={<EvaluationPage />} />
              <Route path="/whistleblower" element={<WhistleblowerPage />} />
              <Route path="/ayarlar" element={<SettingsPage />} />

              {/* HR daxilindəki Rəhbər sub-modulları (Günel Əlizadə üçün) */}
              <Route path="/hr/rehber" element={<ManagerHomePage />} />
              <Route path="/hr/rehber/sistem-tesdiq" element={<ApprovalsPage />} />
              <Route path="/hr/rehber/mesul-kartlar" element={<ManagerResponsibleCardsPage />} />
              <Route path="/hr/rehber/komandam" element={<TeamsPage />} />
              <Route path="/hr/rehber/kpi-izleme" element={<ManagerKpiTrackingPage />} />
              <Route path="/hr/rehber/neticelerim" element={<ManagerResultsPage />} />
              <Route path="/hr/rehber/bonuslarim" element={<ManagerBonusPage />} />
            </Route>

            {/* Super Admin Panel — yalnız HR (Admin) idarəetməsi */}
            <Route element={<RouteGuard requiredRole="SUPER_ADMIN"><SuperAdminLayout /></RouteGuard>}>
              <Route path="/super-admin" element={<SuperAdminCompaniesPage />} />
            </Route>

            {/* User Panel — Super Admin bura giriş edə bilməz */}
            <Route element={<RouteGuard blockRoles={["SUPER_ADMIN"]}><UserLayout /></RouteGuard>}>
              <Route path="/user" element={<UserHomePage />} />
              <Route path="/user/kpi-kartlari" element={<RouteGuard requiredPermissions={["kpi_own", "kpi_team"]}><UserKpiCardsPage /></RouteGuard>} />
              <Route path="/user/sistem-tesdiq" element={<RouteGuard requiredPermissions={["approvals"]}><UserApprovalsPage /></RouteGuard>} />
              <Route path="/user/hesabat" element={<RouteGuard requiredPermissions={["reporting"]}><UserReportsPage /></RouteGuard>} />
              <Route path="/user/komandalar" element={<RouteGuard requiredPermissions={["teams", "teams_compare"]}><UserTeamsPage /></RouteGuard>} />
              <Route path="/user/qiymetlendirme" element={<UserEvaluationPage />} />
              <Route path="/user/whistleblower" element={<UserWhistleblowerPage />} />
              <Route path="/user/ayarlar" element={<UserSettingsPage />} />
            </Route>

            {/* Manager (Rəhbər) Panel */}
            <Route element={<RouteGuard requiredRole="MANAGER"><ManagerLayout /></RouteGuard>}>
              <Route path="/manager" element={<ManagerHomePage />} />
              <Route path="/manager/sistem-tesdiq" element={<ApprovalsPage />} />
              <Route path="/manager/mesul-kartlar" element={<ManagerResponsibleCardsPage />} />
              <Route path="/manager/komandam" element={<TeamsPage />} />
              <Route path="/manager/kpi-izleme" element={<ManagerKpiTrackingPage />} />
              <Route path="/manager/neticelerim" element={<ManagerResultsPage />} />
              <Route path="/manager/bonuslarim" element={<ManagerBonusPage />} />
              <Route path="/manager/hesabat" element={<ReportsPage />} />
              <Route path="/manager/whistleblower" element={<WhistleblowerPage />} />
              <Route path="/manager/ayarlar" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
