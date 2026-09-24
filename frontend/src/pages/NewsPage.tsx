import { ExternalLink } from "lucide-react"
import { Link } from "react-router-dom"
import { Card, CardContent } from "../app/components/ui/card"
import { formatLocaleDate, useI18n } from "../i18n"
import { useNews } from "../features/news/hooks/useNews"

export default function NewsPage() {
  const { locale, t } = useI18n()
  const query = useNews(locale === "zh-CN" ? "zh" : "de")
  return <main className="flex flex-col gap-4">
    <div className="flex items-center justify-between gap-3"><div><h1 className="page-title">{t("news.title")}</h1><p className="text-sm text-muted-foreground">{t("news.subtitle")}</p></div><Link className="text-sm text-primary underline" to="/home">{t("common.back")}</Link></div>
    {query.isPending && <p>{t("common.loading")}</p>}
    {query.isError && <p role="alert" className="text-destructive">{t("news.loadError")}</p>}
    {!query.isPending && !query.isError && !query.data?.length && <p className="text-sm text-muted-foreground">{t("news.empty")}</p>}
    <div className="flex flex-col gap-3">{query.data?.map((post) => <Card key={post.slug}><CardContent className="flex flex-col gap-2 p-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="break-words text-base font-semibold">{post.title}</h2><time className="shrink-0 text-xs text-muted-foreground">{formatLocaleDate(post.publishedAt, locale)}</time></div><p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p><a className="inline-flex items-center gap-1 text-sm font-medium text-primary underline" href={post.link} target="_blank" rel="noopener noreferrer">{t("common.readMore")}<ExternalLink className="size-3" /></a></CardContent></Card>)}</div>
  </main>
}
