import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import ProtectedRoute from "../components/ProtectedRoute";
import { useI18n } from "../i18n";
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const MembersPage = lazy(() => import("../pages/MembersPage"));
const EventsPage = lazy(() => import("../pages/EventsPage"));
const EventDetailPage = lazy(() => import("../pages/EventDetailPage"));
const AdminEventsPage = lazy(() => import("../app/components/AdminEventsView"));
const AdminPage = lazy(() => import("../pages/AdminPage"));
const RegisterPage = lazy(() => import("../app/components/RegisterView"));
const RegisterSuccessPage = lazy(() => import("../app/components/RegisterSuccessView"));
const VerifyEmailPage = lazy(() => import("../app/components/VerifyEmailView"));
function LoadingFallback() {
  const { t } = useI18n();
  return <div className="min-h-full flex items-center justify-center">{t("common.loading")}</div>;
}
const load = (element: ReactNode) => <Suspense fallback={<LoadingFallback />}>{element}</Suspense>;
export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { element: <ProtectedRoute />, children: [
    { path: "/dashboard", element: load(<DashboardPage />) },
    { path: "/events", element: load(<EventsPage />) },
    { path: "/events/:eventId", element: load(<EventDetailPage />) },
    { element: <ProtectedRoute admin />, children: [{ path: "/members", element: load(<MembersPage />) }, { path: "/admin", element: load(<AdminPage />) }, { path: "/admin/events", element: load(<AdminEventsPage />) }, { path: "/admin/venues", element: load(<AdminEventsPage />) }] },
  ] },
  { path: "/register", element: load(<RegisterPage />) },
  { path: "/register/success", element: load(<RegisterSuccessPage />) },
  { path: "/verify-email", element: load(<VerifyEmailPage />) },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
