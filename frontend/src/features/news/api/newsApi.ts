import { pb } from "../../../lib/pocketbase"
import type { AdminNewsResponse, NewsLocale } from "../types"

export async function getNews(locale: NewsLocale) {
  const response = await pb.send<{ items: import("../types").NewsPost[] }>(`/api/bvhub/news?locale=${locale}`, { method: "GET" })
  return response.items
}

export function getAdminNews() { return pb.send<AdminNewsResponse>("/api/bvhub/admin/news", { method: "GET" }) }
export function refreshNews() { return pb.send<AdminNewsResponse>("/api/bvhub/admin/news/refresh", { method: "POST", body: {} }) }
export function saveNews(input: Record<NewsLocale, Array<{ position: number; slug: string }>>) {
  return pb.send<AdminNewsResponse>("/api/bvhub/admin/news", { method: "PUT", body: input })
}
