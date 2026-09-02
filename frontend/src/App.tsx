import { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthProvider";
import { I18nProvider } from "./i18n";
import { queryClient } from "./lib/queryClient";
import { router } from "./router";
export default function App() {
  return <AuthProvider><QueryClientProvider client={queryClient}><I18nProvider><Suspense fallback={<div>Loading…</div>}><RouterProvider router={router} /></Suspense></I18nProvider></QueryClientProvider></AuthProvider>;
}
