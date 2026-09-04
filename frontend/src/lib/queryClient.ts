import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ClientResponseError } from "pocketbase";
import { softLogout } from "../features/auth/authService";

function handleAuthError(error: unknown) {
  const status = error instanceof ClientResponseError ? error.status : (error as { status?: number })?.status;
  if (status === 401) {
    softLogout(queryClient);
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleAuthError }),
  mutationCache: new MutationCache({ onError: handleAuthError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: false,
    },
    mutations: { retry: false },
  },
});
