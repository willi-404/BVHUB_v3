import { RefreshCw, Save } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "../app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../app/components/ui/card"
import { useAdminNews, useRefreshNews, useSaveNews } from "../features/news/hooks/useNews"
import type { NewsLocale, NewsPost, NewsSlot } from "../features/news/types"
import { useI18n } from "../i18n"

const locales: Array<{ key: NewsLocale; label: string }> = [{ key: "zh", label: "中文" }, { key: "de", label: "Deutsch" }]

export default function AdminNewsPage() {
  const { t } = useI18n(); const query = useAdminNews(); const refresh = useRefreshNews(); const save = useSaveNews()
  const [slots, setSlots] = useState<Record<NewsLocale, NewsSlot[]>>({ zh: [], de: [] }); const [error, setError] = useState("")
  useEffect(() => { if (query.data) setSlots(Object.fromEntries(query.data.locales.map((item) => [item.locale, item.slots])) as Record<NewsLocale, NewsSlot[]>) }, [query.data])
  const posts = useMemo(() => Object.fromEntries((query.data?.locales ?? []).map((item) => [item.locale, item.posts])) as Partial<Record<NewsLocale, NewsPost[]>>, [query.data])
  function update(locale: NewsLocale, position: number, slug: string) { setSlots((current) => ({ ...current, [locale]: current[locale].map((slot) => slot.position === position ? { ...slot, slug: slug || null } : slot) })) }
  async function saveChanges() {
    setError(""); const input = { zh: slots.zh.map(({ position, slug }) => ({ position, slug: slug || "" })), de: slots.de.map(({ position, slug }) => ({ position, slug: slug || "" })) }
    for (const locale of ["zh", "de"] as const) { const selected = input[locale].map((item) => item.slug).filter(Boolean); if (new Set(selected).size !== selected.length) { setError(t("news.adminDuplicate")); return } }
    try { await save.mutateAsync(input) } catch { setError(t("news.adminSaveError")) }
  }
  async function refreshNews() { setError(""); try { await refresh.mutateAsync() } catch { setError(t("news.adminRefreshError")) } }
  return <main className="min-h-screen bg-background p-4 sm:p-6"><div className="mx-auto flex max-w-4xl flex-col gap-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="page-title">{t("news.adminTitle")}</h1><p className="text-sm text-muted-foreground">{t("news.adminSubtitle")}</p></div><Link className="text-sm text-primary underline" to="/home">{t("common.back")}</Link></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void refreshNews()} disabled={refresh.isPending}><RefreshCw className="size-4" />{refresh.isPending ? t("news.refreshing") : t("news.refresh")}</Button><Button onClick={() => void saveChanges()} disabled={save.isPending || query.isPending}><Save className="size-4" />{save.isPending ? t("common.saving") : t("common.save")}</Button></div>{query.isPending && <p>{t("common.loading")}</p>}{query.isError && <p role="alert" className="text-destructive">{t("news.loadError")}</p>}{error && <p role="alert" className="text-destructive">{error}</p>}{refresh.isSuccess && !error && <p role="status" className="text-sm text-green-700">{t("news.adminRefreshed")}</p>}{save.isSuccess && !error && <p role="status" className="text-sm text-green-700">{t("news.adminSaved")}</p>}<div className="grid gap-5 lg:grid-cols-2">{locales.map(({ key, label }) => <Card key={key}><CardHeader><CardTitle>{label}</CardTitle></CardHeader><CardContent className="flex flex-col gap-2">{(slots[key] ?? []).map((slot) => <label key={slot.position} className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 text-sm"><span>{slot.position}</span><select value={slot.slug ?? ""} onChange={(event) => update(key, slot.position, event.target.value)} className="h-10 min-w-0 rounded-md border border-input bg-background px-3"><option value="">{t("news.adminEmpty")}</option>{(posts[key] ?? []).map((post) => <option key={post.slug} value={post.slug}>{post.title}</option>)}</select></label>)}</CardContent></Card>)}</div></div></main>
}
