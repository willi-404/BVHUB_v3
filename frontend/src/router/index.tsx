import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import ProtectedRoute from "../components/ProtectedRoute";
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const MembersPage = lazy(() => import("../pages/MembersPage"));
const EventsPage = lazy(() => import("../pages/EventsPage"));
const AdminPage = lazy(() => import("../pages/AdminPage"));
const RegisterPage = lazy(() => import("../app/components/RegisterView"));
const RegisterSuccessPage = lazy(() => import("../app/components/RegisterSuccessView"));
const VerifyEmailPage = lazy(() => import("../app/components/VerifyEmailView"));
const load = (element: ReactNode) => <Suspense fallback={<div className="min-h-full flex items-center justify-center">Loading…</div>}>{element}</Suspense>;
export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { element: <ProtectedRoute />, children: [
    { path: "/dashboard", element: load(<DashboardPage />) },
    { path: "/events", element: load(<EventsPage />) },
    { element: <ProtectedRoute admin />, children: [{ path: "/members", element: load(<MembersPage />) }, { path: "/admin", element: load(<AdminPage />) }] },
  ] },
  { path: "/register", element: load(<RegisterPage />) },
  { path: "/register/success", element: load(<RegisterSuccessPage />) },
  { path: "/verify-email", element: load(<VerifyEmailPage />) },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
