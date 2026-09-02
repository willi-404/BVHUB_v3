import type { QueryClient } from "@tanstack/react-query";

export function optimisticUpdate<T>(queryClient: QueryClient, key: readonly unknown[], updater: (current: T | undefined) => T) {
  const previous = queryClient.getQueryData<T>(key);
  queryClient.setQueryData<T>(key, updater);
  return { previous };
}

export function rollbackOptimisticUpdate<T>(queryClient: QueryClient, key: readonly unknown[], context?: { previous?: T }) {
  if (context && "previous" in context) queryClient.setQueryData(key, context.previous);
}
