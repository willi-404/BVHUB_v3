import { Bell, Check, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "../../../app/components/ui/button"
import { Card, CardContent } from "../../../app/components/ui/card"
import { useI18n } from "../../../i18n"
import {
  useAnnouncementRealtime,
  useAnnouncements,
  useMarkAnnouncementRead,
} from "../hooks/useAnnouncements"
import type { AnnouncementLocale } from "../types"

function displayLocale(locale: string): AnnouncementLocale {
  return locale === "zh-CN" ? "zh" : "de"
}

export function NotificationButton({
  onClick,
  count = 0,
  className = "",
}: {
  onClick: () => void
  count?: number
  className?: string
}) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      aria-label={t("common.notifications")}
      onClick={onClick}
      className={`relative flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] ${className}`}
    >
      <Bell className="size-[18px]" aria-hidden="true" />
      {count > 0 && (
        <span
          aria-label={t("announcements.unreadCount", { count })}
          className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  )
}

export default function AnnouncementCenter({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t, locale } = useI18n()
  const query = useAnnouncements(displayLocale(locale))
  const markRead = useMarkAnnouncementRead(displayLocale(locale))
  useAnnouncementRealtime()
  const [autoId, setAutoId] = useState<string | null>(null)
  const seenAutoIds = useRef(new Set<string>())
  const unread = useMemo(
    () => (query.data?.items ?? []).filter((item) => item.active && !item.read),
    [query.data?.items],
  )

  useEffect(() => {
    const next = unread.find((item) => !seenAutoIds.current.has(item.id))
    if (next) {
      seenAutoIds.current.add(next.id)
      setAutoId(next.id)
    }
  }, [unread])

  useEffect(() => {
    if (!open && !autoId) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        setAutoId(null)
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [autoId, onClose, open])

  const selected = autoId
    ? (unread.find((item) => item.id === autoId) ?? unread[0])
    : undefined
  const markSelected = async () => {
    if (!selected) return
    await markRead.mutateAsync(selected.id)
    const next = unread.find((item) => item.id !== selected.id && !item.read)
    if (next) setAutoId(next.id)
    else {
      setAutoId(null)
      onClose()
    }
  }

  if (!autoId && !open) return null
  return (
    <div
      className="fixed inset-0 z-[120] overflow-y-auto bg-black/55 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={t("announcements.title")}
    >
      <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center">
        <Card className="w-full overflow-hidden bg-[var(--background)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                {t("announcements.label")}
              </p>
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                {t("announcements.title")}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setAutoId(null)
                onClose()
              }}
              aria-label={t("common.close")}
            >
              <X className="size-5" />
            </Button>
          </div>
          <CardContent className="p-5 sm:p-8">
            {query.isPending && <p>{t("common.loading")}</p>}
            {query.isError && (
              <p role="alert" className="text-destructive">
                {t("announcements.loadError")}
              </p>
            )}
            {!query.isPending &&
              !query.isError &&
              !query.data?.items.length && (
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("announcements.empty")}
                </p>
              )}
            {selected && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="break-words text-2xl font-bold text-[var(--foreground)]">
                    {selected.title}
                  </h3>
                  <p className="mt-4 whitespace-pre-wrap break-words text-base leading-7 text-[var(--muted-foreground)]">
                    {selected.content}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
                  <span className="text-sm text-[var(--muted-foreground)]">
                    {unread.length > 1
                      ? t("announcements.remaining", { count: unread.length })
                      : t("announcements.unread")}
                  </span>
                  <Button
                    onClick={() => void markSelected()}
                    disabled={markRead.isPending}
                  >
                    <Check className="size-4" />
                    {markRead.isPending
                      ? t("common.saving")
                      : t("announcements.markRead")}
                  </Button>
                </div>
              </div>
            )}
            {!autoId && open && (
              <div className="flex flex-col gap-3">
                {query.data?.items.map((item) => (
                  <article
                    key={item.id}
                    className={`rounded-lg border p-4 ${
                      item.read
                        ? "border-[var(--border)]"
                        : "border-primary/50 bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="break-words font-semibold text-[var(--foreground)]">
                        {item.title}
                      </h3>
                      {!item.read && (
                        <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                          {t("announcements.new")}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--muted-foreground)]">
                      {item.content}
                    </p>
                    {!item.read && (
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="outline"
                        onClick={() => void markRead.mutateAsync(item.id)}
                        disabled={markRead.isPending}
                      >
                        <Check className="size-4" />
                        {t("announcements.markRead")}
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
