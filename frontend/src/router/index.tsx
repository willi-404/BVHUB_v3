import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import ProtectedRoute from "../components/ProtectedRoute";
import { useI18n } from "../i18n";
import MemberVerifyPage from "../pages/MemberVerifyPage";
import { routes } from "../routes/paths";
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const MembersPage = lazy(() => import("../pages/MembersPage"));
const MemberAppLayout = lazy(() => import("../pages/MemberAppLayout"));
const EventListPage = lazy(() => import("../pages/EventListPage"));
const PaymentsPage = lazy(() => import("../pages/PaymentsPage"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));
const EventDetailPage = lazy(() => import("../pages/EventDetailPage"));
const EventCheckoutPage = lazy(() => import("../pages/EventCheckoutPage"));
const AdminEventDetailPage = lazy(() => import("../pages/AdminEventDetailPage"));
const AdminEventsPage = lazy(() => import("../pages/AdminEventsPage"));
const MemberCardScannerPage = lazy(() => import("../pages/MemberCardScannerPage"));
const PaymentDetailPage = lazy(() => import("../pages/PaymentDetailPage"));
const NewsPage = lazy(() => import("../pages/NewsPage"));
const AdminNewsPage = lazy(() => import("../pages/AdminNewsPage"));
const AdminPaymentsPage = lazy(() => import("../pages/AdminPaymentsPage"));
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
  { path: "/member/verify", element: <MemberVerifyPage /> },
  { element: <ProtectedRoute />, children: [
    { element: load(<MemberAppLayout />), children: [
      { path: routes.home, element: load(<DashboardPage />) },
      { path: routes.events, element: load(<EventListPage />) },
      { path: routes.payments, element: load(<PaymentsPage />) },
      { path: routes.profile, element: load(<ProfilePage />) },
      { path: routes.news, element: load(<NewsPage />) },
    ] },
    { path: "/events/:eventId", element: load(<EventDetailPage />) },
    { path: "/events/:eventId/checkout", element: load(<EventCheckoutPage />) },
    { path: "/payments/:paymentId", element: load(<PaymentDetailPage />) },
    { element: <ProtectedRoute admin />, children: [{ path: "/admin/events/new", element: load(<AdminEventsPage />) }, { path: "/admin/events/:eventId", element: load(<AdminEventDetailPage />) }] },
    { element: <ProtectedRoute admin />, children: [{ path: routes.adminMembers, element: load(<MembersPage />) }, { path: routes.adminEvents, element: load(<AdminEventsPage />) }, { path: routes.adminPayments, element: load(<AdminPaymentsPage />) }, { path: routes.adminMemberCardScanner, element: load(<MemberCardScannerPage />) }, { path: routes.adminNews, element: load(<AdminNewsPage />) }] },
    { path: "/dashboard", element: <Navigate to={routes.home} replace /> },
    { path: "/members", element: <Navigate to={routes.adminMembers} replace /> },
    { path: "/admin", element: <Navigate to={routes.adminMembers} replace /> },
  ] },
  { path: "/register", element: load(<RegisterPage />) },
  { path: "/register/success", element: load(<RegisterSuccessPage />) },
  { path: "/verify-email", element: load(<VerifyEmailPage />) },
  { path: "*", element: <Navigate to={routes.home} replace /> },
]);
