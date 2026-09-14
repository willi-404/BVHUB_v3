import { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthProvider";
import { useI18n } from "./i18n";
import { queryClient } from "./lib/queryClient";
import { router } from "./router";
function LoadingFallback() {
  const { t } = useI18n();
  return <div>{t("common.loading")}</div>;
}
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Suspense fallback={<LoadingFallback />}>
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
    </QueryClientProvider>
  );
}
