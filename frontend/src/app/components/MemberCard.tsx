import { useEffect, useRef, useState, type ReactNode } from "react"
import logoSrc from "../../imports/logo1-high-resolution.png"
import { formatLocaleDate, useI18n } from "../../i18n"
import type { Role } from "../../features/auth/policy"
import { Avatar } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { memberCardGroupLabels } from "./memberCardTheme"

interface MemberCardProps {
  name: string
  memberId: string
  accountSince: string
  group: string | readonly string[]
  role?: Role
  active?: boolean
  qr?: ReactNode
}

const roleKeys: Record<Role, "roles.guest" | "roles.member" | "roles.admin" | "roles.superAdmin"> =
  {
    GUEST: "roles.guest",
    MEMBER: "roles.member",
    ADMIN: "roles.admin",
    SUPER_ADMIN: "roles.superAdmin",
  }

export interface MemberCardFlipProps {
  name: string
  memberId: string
  created: string
  group: string | readonly string[]
  role?: Role
  active?: boolean
  qr: ReactNode
}

export function MemberCardFlip({
  name,
  memberId,
  created,
  group,
  role,
  active,
  qr,
}: MemberCardFlipProps) {
  const { t, locale } = useI18n()
  const [flipped, setFlipped] = useState(false)
  const frontButton = useRef<HTMLButtonElement>(null)
  const backButton = useRef<HTMLButtonElement>(null)
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
  const roleLabel = role ? t(roleKeys[role]) : t("profile.role")
  const groups = memberCardGroupLabels(group).map((label) =>
    label === "Member ER"
      ? t("groups.memberER")
      : label === "Member NUE"
        ? t("groups.memberNUE")
        : t("groups.guest"),
  )
  const accountSince = created
    ? formatLocaleDate(created.length <= 10 ? `${created}T12:00:00Z` : created, locale) || "-"
    : "-"
  const theme = role === "MEMBER" ? "member" : role === "GUEST" ? "guest" : "neutral"

  useEffect(() => {
    const button = flipped ? backButton.current : frontButton.current
    if (!button) return
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 420
    const timer = window.setTimeout(() => button.focus({ preventScroll: true }), delay)
    return () => window.clearTimeout(timer)
  }, [flipped])

  return (
    <article
      data-testid="member-card-flip"
      data-flipped={flipped}
      className={`member-card-flip member-card-flip--${theme} mx-auto w-full max-w-sm overflow-hidden rounded-2xl border text-card-foreground shadow-sm`}
    >
      <div
        aria-hidden={flipped}
        inert={flipped ? true : undefined}
        className="member-card-face member-card-face--front"
      >
        <div className="member-card-face-inner p-5">
          <header className="flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <img
                src={logoSrc}
                alt={t("brand.logoAlt")}
                className="size-9 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold uppercase tracking-[0.08em]">
                  {t("memberCard.brandName")}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {t("memberCard.brandSubtitle")}
                </p>
              </div>
            </div>
            <Badge
              variant={active === undefined ? "outline" : active ? "success" : "destructive"}
              className="shrink-0"
            >
              {active === undefined
                ? t("profile.status")
                : active
                  ? t("profile.active")
                  : t("profile.inactive")}
            </Badge>
          </header>

          <section className="flex flex-col items-center px-1 pt-8 text-center">
            <Avatar
              fallback={initials || "?"}
              alt={name}
              className="size-20 border-2 border-background shadow-sm ring-1 ring-border"
            />
            <h2 className="mt-3 max-w-full break-words text-xl font-semibold leading-tight">
              {name}
            </h2>
            <Badge variant="outline" className="mt-2">
              {roleLabel}
            </Badge>
            <p className="mt-2 max-w-full break-words text-xs font-medium text-muted-foreground">
              {[roleLabel, ...groups].join(" · ")}
            </p>
          </section>

          <dl className="mt-auto grid grid-cols-2 gap-4 border-t border-border pt-5">
            <div className="min-w-0">
              <dt className="text-[10px] font-medium text-muted-foreground">
                {t("memberCard.memberId")}
              </dt>
              <dd className="mt-1 break-all font-mono text-xs font-semibold">
                {memberId}
              </dd>
            </div>
            <div className="min-w-0 text-right">
              <dt className="text-[10px] font-medium text-muted-foreground">
                {t("memberCard.accountSince")}
              </dt>
              <dd className="mt-1 break-words text-xs font-semibold">
                {accountSince}
              </dd>
            </div>
          </dl>

          <button
            ref={frontButton}
            type="button"
            data-slot="button"
            onClick={() => setFlipped(true)}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t("memberCard.viewQr")}
          </button>
        </div>
      </div>

      <div
        aria-hidden={!flipped}
        inert={!flipped ? true : undefined}
        className="member-card-face member-card-face--back"
      >
        <div className="member-card-face-inner items-center p-5 text-center">
          <header className="w-full text-left">
            <p className="text-sm font-bold uppercase tracking-[0.08em]">
              {t("memberCard.brandName")}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t("memberCard.brandSubtitle")}
            </p>
          </header>
          <div className="flex min-h-[17rem] flex-1 flex-col items-center justify-center gap-4 py-5">
            {qr}
            <p className="max-w-[15rem] text-xs font-medium text-muted-foreground">
              {t("memberCard.scanInstruction")}
            </p>
          </div>
          <p className="w-full border-t border-border pt-4 text-xs text-muted-foreground">
            <span className="font-medium">{t("memberCard.memberId")}:</span>{" "}
            <span className="font-mono font-semibold text-foreground">{memberId}</span>
          </p>
          <button
            ref={backButton}
            type="button"
            data-slot="button"
            onClick={() => setFlipped(false)}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t("memberCard.backToCard")}
          </button>
        </div>
      </div>
    </article>
  )
}

export function MemberCard({
  name,
  memberId,
  accountSince,
  group,
  role,
  active,
  qr,
}: MemberCardProps) {
  const { t } = useI18n()
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
  const groups = memberCardGroupLabels(group).map((label) =>
    label === "Member ER"
      ? t("groups.memberER")
      : label === "Member NUE"
        ? t("groups.memberNUE")
        : t("groups.guest"),
  )

  return (
    <article className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="h-1 bg-primary" />
      <header className="flex min-w-0 items-center justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src={logoSrc}
            alt={t("brand.logoAlt")}
            className="size-9 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold leading-tight">
              {t("brand.name")}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {t("brand.legalSuffix")}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            active === undefined
              ? "border-border text-muted-foreground"
              : active
                ? "border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-destructive/25 bg-destructive/10 text-destructive"
          }
        >
          {active === undefined
            ? t("profile.status")
            : active
              ? t("profile.active")
              : t("profile.inactive")}
        </Badge>
      </header>

      <section className="flex flex-col items-center px-5 pt-7 text-center">
        <Avatar
          fallback={initials || "?"}
          alt={name}
          className="size-20 border-2 border-background shadow-sm ring-1 ring-border"
        />
        <h2 className="mt-3 max-w-full break-words text-xl font-semibold leading-tight">
          {name}
        </h2>
        <p className="mt-1 max-w-full break-words text-xs font-medium text-muted-foreground">
          {[role ? t(roleKeys[role]) : null, ...groups]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </section>

      {qr && <div className="flex justify-center px-4 pt-5">{qr}</div>}

      <footer className="mt-5 grid grid-cols-2 gap-4 border-t border-border px-5 py-4">
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-muted-foreground">
            {t("memberCard.memberId")}
          </p>
          <p className="mt-1 break-all font-mono text-xs font-semibold">
            {memberId}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[10px] font-medium text-muted-foreground">
            {t("memberCard.accountSince")}
          </p>
          <p className="mt-1 break-words text-xs font-semibold">
            {accountSince}
          </p>
        </div>
      </footer>
    </article>
  )
}
