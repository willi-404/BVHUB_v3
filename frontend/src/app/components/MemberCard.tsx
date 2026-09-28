import type { ReactNode } from "react"
import logoSrc from "../../imports/logo1-high-resolution.png"
import { useI18n } from "../../i18n"
import type { Role } from "../../features/auth/policy"
import { Avatar } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { memberCardGroupLabels } from "./memberCardTheme"

interface MemberCardProps {
  name: string
  memberId: string
  activeSince: string
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

export function MemberCard({
  name,
  memberId,
  activeSince,
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
            {t("memberCard.activeSince")}
          </p>
          <p className="mt-1 break-words text-xs font-semibold">
            {activeSince}
          </p>
        </div>
      </footer>
    </article>
  )
}
