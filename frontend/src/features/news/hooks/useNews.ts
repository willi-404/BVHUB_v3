import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getAdminNews, getNews, refreshNews, saveNews } from "../api/newsApi"
import type { NewsLocale } from "../types"

export const newsKeys = {
  all: ["news"] as const,
  list: (locale: NewsLocale) => [...newsKeys.all, locale] as const,
  admin: () => [...newsKeys.all, "admin"] as const,
}

export function useNews(locale: NewsLocale) { return useQuery({ queryKey: newsKeys.list(locale), queryFn: () => getNews(locale), refetchOnMount: "always" }) }
export function useAdminNews() { return useQuery({ queryKey: newsKeys.admin(), queryFn: getAdminNews }) }
export function useRefreshNews() {
  const client = useQueryClient()
  return useMutation({ mutationFn: refreshNews, onSuccess: (data) => { client.setQueryData(newsKeys.admin(), data); void client.invalidateQueries({ queryKey: newsKeys.all }) } })
}
export function useSaveNews() {
  const client = useQueryClient()
  return useMutation({ mutationFn: saveNews, onSuccess: (data) => { client.setQueryData(newsKeys.admin(), data); void client.invalidateQueries({ queryKey: newsKeys.all }) } })
}
