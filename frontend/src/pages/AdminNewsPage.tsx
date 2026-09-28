import { Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "../app/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../app/components/ui/card"
import { Input } from "../app/components/ui/input"
import { Textarea } from "../app/components/ui/textarea"
import {
  useAdminAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useSaveAnnouncementSlots,
  useUpdateAnnouncement,
} from "../features/announcements/hooks/useAnnouncements"
import type {
  AdminAnnouncement,
  AnnouncementDraft,
  AnnouncementLocale,
  AnnouncementSlot,
} from "../features/announcements/types"
import {
  useAdminNews,
  useRefreshNews,
  useSaveNews,
} from "../features/news/hooks/useNews"
import type { NewsLocale, NewsPost, NewsSlot } from "../features/news/types"
import { useI18n } from "../i18n"

const newsLocales: Array<{ key: NewsLocale; label: string }> = [
  { key: "zh", label: "中文" },
  { key: "de", label: "Deutsch" },
]
const announcementLocales: Array<{ key: AnnouncementLocale; label: string }> = [
  { key: "zh", label: "中文" },
  { key: "de", label: "Deutsch" },
]
const emptyDraft: AnnouncementDraft = {
  zhTitle: "",
  zhContent: "",
  deTitle: "",
  deContent: "",
}

function AnnouncementEditor({
  value,
  pending,
  onChange,
  onClose,
  onSave,
}: {
  value: AnnouncementDraft
  pending: boolean
  onChange: (value: AnnouncementDraft) => void
  onClose: () => void
  onSave: () => void
}) {
  const { t } = useI18n()
  const field = (
    key: keyof AnnouncementDraft,
    label: string,
    max: number,
    multiline = false,
  ) => {
    const control = multiline ? (
      <Textarea
        maxLength={max}
        value={value[key]}
        onChange={(event) => onChange({ ...value, [key]: event.target.value })}
        className="min-h-36"
      />
    ) : (
      <Input
        maxLength={max}
        value={value[key]}
        onChange={(event) => onChange({ ...value, [key]: event.target.value })}
      />
    )
    return (
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{label}</span>
        {control}
        <span className="text-right text-xs text-muted-foreground">
          {Array.from(value[key]).length}/{max}
        </span>
      </label>
    )
  }
  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col overflow-y-auto bg-background"
      role="dialog"
      aria-modal="true"
      aria-label={t("announcements.editorTitle")}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-4 sm:px-8">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("announcements.editorLabel")}
          </p>
          <h2 className="text-lg font-semibold">
            {t("announcements.editorTitle")}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose}>
            <X className="size-4" />
            {t("common.close")}
          </Button>
          <Button onClick={onSave} disabled={pending}>
            <Save className="size-4" />
            {pending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </header>
      <form
        className="mx-auto grid w-full max-w-5xl gap-6 p-4 sm:grid-cols-2 sm:p-8"
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>中文</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {field("zhTitle", t("announcements.titleField"), 100)}
            {field("zhContent", t("announcements.contentField"), 800, true)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Deutsch</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {field("deTitle", t("announcements.titleField"), 100)}
            {field("deContent", t("announcements.contentField"), 800, true)}
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

export default function AdminNewsPage() {
  const { t } = useI18n()
  const newsQuery = useAdminNews()
  const refreshNewsMutation = useRefreshNews()
  const saveNewsMutation = useSaveNews()
  const announcementQuery = useAdminAnnouncements()
  const createAnnouncement = useCreateAnnouncement()
  const updateAnnouncement = useUpdateAnnouncement()
  const deleteAnnouncement = useDeleteAnnouncement()
  const saveAnnouncementSlots = useSaveAnnouncementSlots()
  const [newsSlots, setNewsSlots] = useState<Record<NewsLocale, NewsSlot[]>>({
    zh: [],
    de: [],
  })
  const [announcementSlots, setAnnouncementSlots] =
    useState<Record<AnnouncementLocale, AnnouncementSlot[]>>({ zh: [], de: [] })
  const [error, setError] = useState("")
  const [editor, setEditor] = useState<AdminAnnouncement | "new" | null>(null)
  const [draft, setDraft] = useState<AnnouncementDraft>(emptyDraft)
  useEffect(() => {
    if (newsQuery.data)
      setNewsSlots(
        Object.fromEntries(
          newsQuery.data.locales.map((item) => [item.locale, item.slots]),
        ) as Record<NewsLocale, NewsSlot[]>,
      )
  }, [newsQuery.data])
  useEffect(() => {
    if (announcementQuery.data)
      setAnnouncementSlots(announcementQuery.data.slots)
  }, [announcementQuery.data])
  const newsPosts = useMemo(
    () =>
      Object.fromEntries(
        (newsQuery.data?.locales ?? []).map((item) => [
          item.locale,
          item.posts,
        ]),
      ) as Partial<Record<NewsLocale, NewsPost[]>>,
    [newsQuery.data],
  )
  const announcements = announcementQuery.data?.announcements ?? []
  function updateNews(locale: NewsLocale, position: number, slug: string) {
    setNewsSlots((current) => ({
      ...current,
      [locale]: current[locale].map((slot) =>
        slot.position === position ? { ...slot, slug: slug || null } : slot,
      ),
    }))
  }
  function updateAnnouncementSlot(
    locale: AnnouncementLocale,
    position: number,
    announcementId: string,
  ) {
    setAnnouncementSlots((current) => ({
      ...current,
      [locale]: Array.from({ length: 5 }, (_, index) => index + 1).map(
        (slotPosition) => ({
          position: slotPosition,
          announcementId:
            slotPosition === position
              ? announcementId
              : (current[locale].find((slot) => slot.position === slotPosition)
                  ?.announcementId ?? ""),
        }),
      ),
    }))
  }
  async function saveNewsChanges() {
    setError("")
    const input = {
      zh: newsSlots.zh.map(({ position, slug }) => ({
        position,
        slug: slug || "",
      })),
      de: newsSlots.de.map(({ position, slug }) => ({
        position,
        slug: slug || "",
      })),
    }
    for (const locale of ["zh", "de"] as const) {
      const selected = input[locale].map((item) => item.slug).filter(Boolean)
      if (new Set(selected).size !== selected.length) {
        setError(t("news.adminDuplicate"))
        return
      }
    }
    try {
      await saveNewsMutation.mutateAsync(input)
    } catch {
      setError(t("news.adminSaveError"))
    }
  }
  async function refreshNews() {
    setError("")
    try {
      await refreshNewsMutation.mutateAsync()
    } catch {
      setError(t("news.adminRefreshError"))
    }
  }
  async function saveAnnouncementOrder() {
    setError("")
    try {
      await saveAnnouncementSlots.mutateAsync({
        zh: Array.from({ length: 5 }, (_, index) => ({
          position: index + 1,
          announcementId:
            announcementSlots.zh.find((slot) => slot.position === index + 1)
              ?.announcementId ?? "",
        })),
        de: Array.from({ length: 5 }, (_, index) => ({
          position: index + 1,
          announcementId:
            announcementSlots.de.find((slot) => slot.position === index + 1)
              ?.announcementId ?? "",
        })),
      })
    } catch {
      setError(t("announcements.saveOrderError"))
    }
  }
  function openEditor(item: AdminAnnouncement | "new") {
    setError("")
    setEditor(item)
    setDraft(
      item === "new"
        ? emptyDraft
        : {
            zhTitle: item.zhTitle,
            zhContent: item.zhContent,
            deTitle: item.deTitle,
            deContent: item.deContent,
          },
    )
  }
  async function saveAnnouncement() {
    setError("")
    const hasZh = draft.zhTitle.trim() && draft.zhContent.trim()
    const hasDe = draft.deTitle.trim() && draft.deContent.trim()
    if (!hasZh && !hasDe) {
      setError(t("announcements.validationLanguage"))
      return
    }
    if (
      Boolean(draft.zhTitle.trim()) !== Boolean(draft.zhContent.trim()) ||
      Boolean(draft.deTitle.trim()) !== Boolean(draft.deContent.trim())
    ) {
      setError(t("announcements.validationPair"))
      return
    }
    try {
      if (editor === "new") await createAnnouncement.mutateAsync(draft)
      else if (editor)
        await updateAnnouncement.mutateAsync({ id: editor.id, input: draft })
      setEditor(null)
    } catch {
      setError(t("announcements.saveError"))
    }
  }
  async function removeAnnouncement(item: AdminAnnouncement) {
    if (!window.confirm(t("announcements.deleteConfirm"))) return
    try {
      await deleteAnnouncement.mutateAsync(item.id)
    } catch {
      setError(t("announcements.deleteError"))
    }
  }
  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="page-title">{t("news.adminTitle")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("news.adminSubtitle")}
            </p>
          </div>
          <Link className="text-sm text-primary underline" to="/home">
            {t("common.back")}
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void refreshNews()}
            disabled={refreshNewsMutation.isPending}
          >
            <RefreshCw className="size-4" />
            {refreshNewsMutation.isPending
              ? t("news.refreshing")
              : t("news.refresh")}
          </Button>
          <Button
            onClick={() => void saveNewsChanges()}
            disabled={saveNewsMutation.isPending || newsQuery.isPending}
          >
            <Save className="size-4" />
            {saveNewsMutation.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {newsQuery.isPending && <p>{t("common.loading")}</p>}
        {newsQuery.isError && (
          <p role="alert" className="text-destructive">
            {t("news.loadError")}
          </p>
        )}
        {announcementQuery.isError && (
          <p role="alert" className="text-destructive">
            {t("announcements.loadError")}
          </p>
        )}
        <div className="grid gap-5 lg:grid-cols-2">
          {newsLocales.map(({ key, label }) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle>{label}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {(newsSlots[key] ?? []).map((slot) => (
                  <label
                    key={slot.position}
                    className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 text-sm"
                  >
                    <span>{slot.position}</span>
                    <select
                      value={slot.slug ?? ""}
                      onChange={(event) =>
                        updateNews(key, slot.position, event.target.value)
                      }
                      className="h-10 min-w-0 rounded-md border border-input bg-background px-3"
                    >
                      <option value="">{t("news.adminEmpty")}</option>
                      {(newsPosts[key] ?? []).map((post) => (
                        <option key={post.slug} value={post.slug}>
                          {post.title}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
        <section className="flex flex-col gap-4 border-t border-border pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">
                {t("announcements.adminTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("announcements.adminSubtitle")}
              </p>
            </div>
            <Button onClick={() => openEditor("new")}>
              <Plus className="size-4" />
              {t("announcements.create")}
            </Button>
          </div>
          <Card>
            <CardContent className="grid gap-5 p-5 lg:grid-cols-2">
              {announcementLocales.map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-2">
                  <h3 className="font-semibold">{label}</h3>
                  {Array.from({ length: 5 }, (_, index) => index + 1).map(
                    (position) => (
                      <label
                        key={position}
                        className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 text-sm"
                      >
                        <span>{position}</span>
                        <select
                          value={
                            announcementSlots[key].find(
                              (slot) => slot.position === position,
                            )?.announcementId ?? ""
                          }
                          onChange={(event) =>
                            updateAnnouncementSlot(
                              key,
                              position,
                              event.target.value,
                            )
                          }
                          className="h-10 min-w-0 rounded-md border border-input bg-background px-3"
                        >
                          <option value="">{t("news.adminEmpty")}</option>
                          {announcements.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item[key === "zh" ? "zhTitle" : "deTitle"] ||
                                item[key === "zh" ? "deTitle" : "zhTitle"]}
                            </option>
                          ))}
                        </select>
                      </label>
                    ),
                  )}
                </div>
              ))}
            </CardContent>
            <div className="border-t p-5">
              <Button
                onClick={() => void saveAnnouncementOrder()}
                disabled={saveAnnouncementSlots.isPending}
              >
                <Save className="size-4" />
                {saveAnnouncementSlots.isPending
                  ? t("common.saving")
                  : t("announcements.saveOrder")}
              </Button>
            </div>
          </Card>
          <div className="grid gap-3">
            {announcements.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold">
                      {item.zhTitle || item.deTitle}
                    </h3>
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {item.zhContent || item.deContent}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditor(item)}
                    >
                      <Pencil className="size-4" />
                      {t("common.edit")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => void removeAnnouncement(item)}
                    >
                      <Trash2 className="size-4" />
                      {t("common.delete")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!announcementQuery.isPending && !announcements.length && (
            <p className="text-sm text-muted-foreground">
              {t("announcements.emptyAdmin")}
            </p>
          )}
        </section>
      </div>
      {editor && (
        <AnnouncementEditor
          value={draft}
          pending={createAnnouncement.isPending || updateAnnouncement.isPending}
          onChange={setDraft}
          onClose={() => setEditor(null)}
          onSave={() => void saveAnnouncement()}
        />
      )}
    </main>
  )
}
