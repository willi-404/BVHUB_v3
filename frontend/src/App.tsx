import { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthProvider";
import { I18nProvider, useI18n } from "./i18n";
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
        <I18nProvider>
          <Suspense fallback={<LoadingFallback />}>
            <RouterProvider router={router} />
          </Suspense>
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
