import { useEffect } from "react";
import { pb } from "../lib/pocketbase";
import { queryClient } from "../lib/queryClient";

export function updateItemInArray<T extends { id: string }>(items: T[] | undefined, item: T, action: "create" | "update" | "delete" = "update"): T[] | undefined {
  if (!items) return items;
  if (action === "delete") return items.filter((entry) => entry.id !== item.id);
  const index = items.findIndex((entry) => entry.id === item.id);
  if (index < 0) return action === "create" ? [...items, item] : items;
  return items.map((entry, i) => i === index ? item : entry);
}

export function useRealtimeSubscription(collection: string) {
  useEffect(() => {
    void pb.collection(collection).subscribe("*", (event) => {
      queryClient.setQueryData([collection], (old: unknown) => updateItemInArray(old as { id: string }[] | undefined, event.record as unknown as { id: string }, event.action as "create" | "update" | "delete"));
    });
    return () => { void pb.collection(collection).unsubscribe("*"); };
  }, [collection]);
}
