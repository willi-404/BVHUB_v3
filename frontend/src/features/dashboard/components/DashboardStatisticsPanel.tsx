import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Minus,
  RefreshCw,
  TicketCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react"
import { Button } from "../../../app/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../app/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../../../app/components/ui/chart"
import { useI18n } from "../../../i18n"
import { calculateDashboardTrend, sortDashboardMonths, type DashboardTrend } from "../statistics"
import type { DashboardMonthStatistics } from "../types"
import { useDashboardStatistics } from "../hooks/useDashboardStatistics"

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(query.matches)
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  return reduced
}

function formatMonth(month: string, locale: string) {
  const [year, number] = month.split("-").map(Number)
  return new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(Date.UTC(year, number - 1, 15)))
}

function Trend({ trend }: { trend: DashboardTrend | null }) {
  const { t } = useI18n()
  if (!trend) return <span className="flex items-center gap-1 text-muted-foreground"><Minus aria-hidden="true" strokeWidth={1.5} />{t("dashboard.noComparison")}</span>
  const Icon = trend.direction === "up" ? ArrowUpRight : trend.direction === "down" ? ArrowDownRight : Minus
  const sign = trend.percentage > 0 ? "+" : ""
  const direction = trend.direction === "up" ? t("dashboard.trendUp") : trend.direction === "down" ? t("dashboard.trendDown") : t("dashboard.trendUnchanged")
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <Icon aria-hidden="true" strokeWidth={1.5} />
      <span>{sign}{trend.percentage.toFixed(1)}% · {direction}</span>
    </span>
  )
}

function MetricCard({ icon: Icon, label, value, description, delay }: {
  icon: typeof CalendarDays
  label: string
  value: number
  description: string
  delay: number
}) {
  return (
    <Card
      tabIndex={0}
      className="dashboard-stat-enter dashboard-stat-interactive"
      style={{ "--dashboard-enter-delay": `${delay}ms` } as CSSProperties}
    >
      <CardHeader className="flex-row items-start justify-between gap-3 p-4 pb-2">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="text-sm">{label}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        <span className="dashboard-stat-icon flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon aria-hidden="true" strokeWidth={2} />
        </span>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-3xl font-bold tabular-nums">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  )
}

function AccessibleSummary({ months, locale }: { months: DashboardMonthStatistics[]; locale: string }) {
  const { t } = useI18n()
  return (
    <div className="sr-only" aria-label={t("dashboard.chartSummary")}>
      <h3>{t("dashboard.chartSummary")}</h3>
      <ul>
        {months.map((item) => (
          <li key={item.month}>
            {formatMonth(item.month, locale)}: {item.registeredUsers == null
              ? t("dashboard.missingData")
              : `${t("dashboard.registeredUsers")} ${item.registeredUsers}, ${t("dashboard.formalMembers")} ${item.members}`}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function DashboardStatisticsPanel() {
  const { t, locale } = useI18n()
  const statistics = useDashboardStatistics()
  const reducedMotion = useReducedMotion()
  const months = useMemo(() => sortDashboardMonths(statistics.data?.months ?? []), [statistics.data?.months])

  if (statistics.isPending) {
    return <Card><CardContent className="p-5"><p role="status" className="text-sm text-muted-foreground">{t("dashboard.statisticsLoading")}</p></CardContent></Card>
  }
  if (statistics.isError || !statistics.data) {
    return (
      <Card>
        <CardHeader className="p-5 pb-2"><CardTitle className="text-sm">{t("dashboard.statisticsError")}</CardTitle><CardDescription>{t("dashboard.statisticsErrorDescription")}</CardDescription></CardHeader>
        <CardContent className="px-5 pb-5">
          <Button variant="outline" size="sm" onClick={() => void statistics.refetch()}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            {t("common.retry")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const current = statistics.data.current
  const previous = months.at(-2)
  const registeredTrend = calculateDashboardTrend(current.registeredUsers, previous, "registeredUsers")
  const memberTrend = calculateDashboardTrend(current.members, previous, "members")
  const availablePoints = months.filter((item) => item.registeredUsers != null || item.members != null).length
  const chartConfig = {
    registeredUsers: { label: t("dashboard.registeredUsers"), color: "var(--primary)" },
    members: { label: t("dashboard.formalMembers"), color: "var(--dashboard-member)" },
  } satisfies ChartConfig

  return (
    <div data-responsive-grid="dashboard-stats" className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      <Card
        tabIndex={0}
        className="dashboard-stat-enter dashboard-stat-interactive min-w-0 md:col-span-2 lg:col-span-2"
        style={{ "--dashboard-enter-delay": "0ms" } as CSSProperties}
      >
        <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <CardTitle>{t("dashboard.memberTrend")}</CardTitle>
              <CardDescription>{t("dashboard.lastSixMonths")}</CardDescription>
            </div>
            <span className="dashboard-stat-icon flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <UsersRound aria-hidden="true" strokeWidth={2} />
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><UsersRound aria-hidden="true" strokeWidth={1.5} />{t("dashboard.registeredUsers")}</div>
              <p className="text-3xl font-bold tabular-nums">{current.registeredUsers.toLocaleString()}</p>
              <div className="mt-1 text-xs"><Trend trend={registeredTrend} /></div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><UserRoundCheck aria-hidden="true" strokeWidth={1.5} />{t("dashboard.formalMembers")}</div>
              <p className="text-3xl font-bold tabular-nums text-[var(--dashboard-member)]">{current.members.toLocaleString()}</p>
              <div className="mt-1 text-xs"><Trend trend={memberTrend} /></div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-1 pb-4 sm:px-3">
          <ChartContainer config={chartConfig} className="h-56 w-full min-w-0 aspect-auto" aria-label={t("dashboard.memberTrend")}>
            <AreaChart accessibilityLayer data={months} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id="registered-users-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-registeredUsers)" stopOpacity={0.24} /><stop offset="95%" stopColor="var(--color-registeredUsers)" stopOpacity={0.02} /></linearGradient>
                <linearGradient id="members-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-members)" stopOpacity={0.22} /><stop offset="95%" stopColor="var(--color-members)" stopOpacity={0.02} /></linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={9} tickFormatter={(value: string) => formatMonth(value, locale)} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" labelFormatter={(_value, payload) => formatMonth(String(payload[0]?.payload?.month ?? ""), locale)} />} />
              <Area dataKey="registeredUsers" type="monotone" fill="url(#registered-users-fill)" stroke="var(--color-registeredUsers)" strokeWidth={2} connectNulls={false} dot={availablePoints === 1 ? { r: 4 } : false} activeDot={{ r: 4 }} isAnimationActive={!reducedMotion} />
              <Area dataKey="members" type="monotone" fill="url(#members-fill)" stroke="var(--color-members)" strokeWidth={2} connectNulls={false} dot={availablePoints === 1 ? { r: 4 } : false} activeDot={{ r: 4 }} isAnimationActive={!reducedMotion} />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
          {availablePoints === 1 && <p className="px-3 text-center text-xs text-muted-foreground">{t("dashboard.trackingStartsThisMonth")}</p>}
          {months.some((item) => item.registeredUsers == null || item.members == null) && <p className="px-3 pt-1 text-center text-xs text-muted-foreground">{t("dashboard.historyHasGaps")}</p>}
          <AccessibleSummary months={months} locale={locale} />
        </CardContent>
      </Card>

      <div className="grid min-w-0 grid-cols-1 gap-3 md:col-span-2 md:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
        <MetricCard icon={CalendarDays} label={t("dashboard.eventsThisMonth")} value={current.publishedEventsThisMonth} description={t("dashboard.firstPublishedThisMonth")} delay={100} />
        <MetricCard icon={TicketCheck} label={t("dashboard.validRegistrations")} value={current.myUpcomingRegistrations} description={t("dashboard.upcomingRegisteredOnly")} delay={200} />
      </div>
    </div>
  )
}
