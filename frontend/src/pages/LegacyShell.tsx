import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, Link } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Badge } from "../app/components/ui/badge";
import { Button } from "../app/components/ui/button";
import { Card, CardContent } from "../app/components/ui/card";
import { Avatar } from "../app/components/ui/avatar";
import { Progress } from "../app/components/ui/progress";
import { Separator } from "../app/components/ui/separator";
import { MemberCard } from "../app/components/MemberCard";
import LoginView from "../app/components/LoginView";
import RegisterView from "../app/components/RegisterView";
import RegisterSuccessView from "../app/components/RegisterSuccessView";
import VerifyEmailView from "../app/components/VerifyEmailView";
import AdminMembersView from "../app/components/AdminMembersView";
import AdminPaymentsView from "../app/components/AdminPaymentsView";
import AdminEventManageView from "../app/components/AdminEventsView";
import logoSrc from "../imports/logo1-high-resolution.png";
import { AuthProvider, useAuth, useAuthUser } from "../features/auth/AuthProvider";
import { isAdminRole } from "../features/auth/policy";
import { queryClient } from "../lib/queryClient";
import { formatLocaleDate, formatLocaleDateTime, LanguageSwitcher, useI18n, type MessageKey } from "../i18n";
import { AdminGuard, ProtectedRoute, PublicOnlyRoute } from "../routes/guards";
import { useMyProfile, useUpdateMyProfile } from "../features/profile/hooks/useProfile";
import { profileErrorStatus } from "../features/profile/api/profileApi";
import { profilePatchFromDto } from "../features/profile/profilePatch";
import type { ProfileDto, ProfilePatch } from "../features/profile/types";
import { primaryNavMessageKey, type PrimaryNavTab } from "./navigationLabels";
import { useEvents, useEventRealtime } from "../features/events/hooks/useEvents";
import type { EventRecord } from "../features/events/types";
import DashboardStatisticsPanel from "../features/dashboard/components/DashboardStatisticsPanel";
import MemberQr from "../features/memberCard/components/MemberQr";
import PaymentsView from "../features/payments/components/PaymentsView";
import { useMyPayments, usePaymentRealtime } from "../features/payments/hooks/usePayments";

// ─── Icons ────────────────────────────────────────────────────────────────────

function Icon({ d, size = 18, className }: { d: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

const icons = {
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  usersAdmin: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  listCheck: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  clipboardList: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M12 12h4M12 16h4M8 12h.01M8 16h.01",
  shieldAdmin: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  chevronRight: "M9 18l6-6-6-6",
  chevronLeft: "M15 18l-6-6 6-6",
  check: "M20 6 9 17l-5-5",
  clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2",
  mapPin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z",
  settings: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  qrCode: "M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 15h2v2h-2zM17 17h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z",
  creditCard: "M1 4h22v16H1zM1 10h22",
  euro: "M13 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM5 9h8M5 15h8",
  camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  pencil: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  x: "M18 6 6 18M6 6l12 12",
  menu: "M4 6h16M4 12h16M4 18h16",
};

// ─── Data ─────────────────────────────────────────────────────────────────────

type NavTab = PrimaryNavTab;

interface Event {
  id: number;
  title: string;
  type: "training" | "tournament" | "social" | "workshop";
  date: string;
  time: string;
  location: string;
  capacity: number;
  registered: number;
  isRegistered: boolean;
  level: string;
}

const EVENTS: Event[] = [
  {
    id: 1,
    title: "Tuesday Evening Training",
    type: "training",
    date: "Sep 2, 2026",
    time: "7:00 PM – 9:00 PM",
    location: "Court 1 & 2",
    capacity: 16,
    registered: 12,
    isRegistered: true,
    level: "Intermediate",
  },
  {
    id: 2,
    title: "Club Singles Championship",
    type: "tournament",
    date: "Sep 6, 2026",
    time: "9:00 AM – 6:00 PM",
    location: "All Courts",
    capacity: 32,
    registered: 28,
    isRegistered: false,
    level: "Open",
  },
  {
    id: 3,
    title: "Beginners Coaching Session",
    type: "workshop",
    date: "Sep 9, 2026",
    time: "10:00 AM – 12:00 PM",
    location: "Court 3",
    capacity: 10,
    registered: 4,
    isRegistered: false,
    level: "Beginner",
  },
  {
    id: 4,
    title: "End-of-Season Social Night",
    type: "social",
    date: "Sep 14, 2026",
    time: "6:30 PM – 10:00 PM",
    location: "Club Hall",
    capacity: 60,
    registered: 41,
    isRegistered: true,
    level: "All",
  },
];

const NEWS = [
  {
    id: 1,
    title: "New training schedule for autumn season",
    excerpt: "Starting October 1st, Tuesday sessions move to 6:30 PM. Thursdays remain unchanged.",
    date: "Aug 28, 2026",
    tag: "Announcement",
    tagColor: "success" as const,
  },
];

const ACTIVITIES = [
  { id: 1, text: "You registered for Tuesday Evening Training", time: "2h ago", icon: "check" as const },
  { id: 2, text: "Monthly membership renewed automatically", time: "Aug 28", icon: "shield" as const },
  { id: 3, text: "New tournament posted: Club Singles Championship", time: "Aug 27", icon: "trophy" as const },
];

const typeColors: Record<Event["type"], string> = {
  training: "success",
  tournament: "warning",
  social: "secondary",
  workshop: "outline",
};
const typeLabelKeys: Record<Event["type"], "events.training" | "events.tournament" | "events.social" | "events.workshop"> = {
  training: "events.training",
  tournament: "events.tournament",
  social: "events.social",
  workshop: "events.workshop",
};
const eventTitleKeys: Record<string, "demo.event.tuesday" | "demo.event.championship" | "demo.event.beginner" | "demo.event.social"> = {
  "Tuesday Evening Training": "demo.event.tuesday",
  "Club Singles Championship": "demo.event.championship",
  "Beginners Coaching Session": "demo.event.beginner",
  "End-of-Season Social Night": "demo.event.social",
};
const levelKeys: Record<string, "demo.level.intermediate" | "demo.level.open" | "demo.level.beginner" | "demo.level.all"> = {
  Intermediate: "demo.level.intermediate", Open: "demo.level.open", Beginner: "demo.level.beginner", All: "demo.level.all",
};
const locationKeys: Record<string, "demo.location.court12" | "demo.location.allCourts" | "demo.location.court3" | "demo.location.clubHall"> = {
  "Court 1 & 2": "demo.location.court12", "All Courts": "demo.location.allCourts", "Court 3": "demo.location.court3", "Club Hall": "demo.location.clubHall",
};

// ─── Full-screen Member Card overlay ──────────────────────────────────────────

function MemberCardOverlay({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { data: profile } = useMyProfile();
  const displayName = profile?.user.displayName || t("profile.title");
  const memberId = profile?.user.id || "-";
  const group = profile?.groups.map((item) => item.name) ?? ["-"];
  const activeSince = profile?.user.created ? profile.user.created.slice(0, 10) : "-";
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto"
      style={{ background: "linear-gradient(160deg, #0f2d1a 0%, #14532d 45%, #1a6b38 100%)" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-2 shrink-0">
        <button
          onClick={onClose}
          aria-label={t("common.close")}
          className="h-9 w-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Icon d={icons.chevronLeft} size={20} />
        </button>
        <span className="text-white/60 text-sm font-medium">{t("profile.memberCard")}</span>
        <div className="w-9" />
      </div>

      {/* Club logo */}
      <div className="flex flex-col items-center pt-5 pb-6 shrink-0">
        <div className="h-20 w-20 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-3 backdrop-blur-sm overflow-hidden p-1">
          <img src={logoSrc} alt={t("brand.logoAlt")} className="h-full w-full object-contain" />
        </div>
        <p className="text-white font-bold text-base leading-tight text-center">{t("brand.name")}</p>
        <p className="text-white/50 text-xs mt-0.5">{t("brand.established")}</p>
      </div>

      {/* Card */}
      <div className="flex justify-center px-6 shrink-0">
        <div style={{ width: "100%", maxWidth: "380px" }}>
          <MemberCard name={displayName} memberId={memberId} activeSince={activeSince} group={group} />
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center mt-8 px-6 pb-12 shrink-0">
        <MemberQr />
        <p className="text-white/35 text-[10px] mt-4 text-center">{memberId}</p>
      </div>
    </div>
  );
}

// ─── Edit Profile overlay ──────────────────────────────────────────────────────

function EditProfileOverlay({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { data, isLoading } = useMyProfile();
  const mutation = useUpdateMyProfile();
  const [values, setValues] = useState<ProfilePatch>({});
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!data || initialized) return;
    setValues(profilePatchFromDto(data));
    setInitialized(true);
  }, [data, initialized]);

  function close() {
    if (mutation.isPending || saved || Object.keys(values).length === 0 || window.confirm(t("profile.discardChanges"))) onClose();
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try { await mutation.mutateAsync(values); setSaved(true); setTimeout(onClose, 500); }
    catch (cause) {
      const status = profileErrorStatus(cause);
      setError(status === 409 ? t("profile.displayNameTaken") : status === 401 ? t("auth.sessionExpired") : status === 403 ? t("profile.updateForbidden") : status === 400 ? t("errors.invalid_request") : t("errors.network"));
    }
  }
  const field = (key: keyof ProfilePatch, label: string, type = "text") => (
    <label className="flex flex-col gap-1.5" key={key}>
      <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">{label}</span>
      <input type={type} value={String(values[key] ?? "")} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} className="w-full h-11 min-w-0 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-base text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-[border-color,box-shadow] md:text-sm" />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--background)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)] bg-[var(--card)]">
        <button onClick={close} className="h-9 w-9 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)]" aria-label={t("common.close")}>
          <Icon d={icons.x} size={18} />
        </button>
        <span className="text-sm font-semibold">{t("profile.edit")}</span>
        <button
          onClick={save}
          disabled={mutation.isPending || isLoading || !initialized}
          className="text-sm font-semibold text-[var(--primary)] px-2 py-1 rounded hover:bg-[var(--secondary)] transition-colors"
        >
          {mutation.isPending ? t("common.saving") : saved ? t("common.saved") : t("common.save")}
        </button>
      </div>

      <form onSubmit={save} className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6">
        {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>}
        {saved && <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">{t("profile.saved")}</p>}
        {!data && !isLoading && <p className="text-sm text-[var(--muted-foreground)]">{t("profile.incomplete")}</p>}
        {data && <>
          <div className="flex flex-col gap-4">
            {field("displayName", t("profile.displayName"))}
            <div className="grid md:grid-cols-2 gap-4">{field("firstName", t("profile.firstName"))}{field("lastName", t("profile.lastName"))}</div>
            <div className="grid md:grid-cols-2 gap-4">{field("street", t("profile.street"))}{field("houseNumber", t("profile.houseNumber"))}{field("postalCode", t("profile.postalCode"))}{field("city", t("profile.city"))}</div>
            <div className="grid md:grid-cols-2 gap-4">{field("birthDate", t("profile.birthDate"), "date")}{field("phone", t("profile.phone"))}</div>
            {field("contactInfo", t("profile.contactInfo"))}
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)] divide-y divide-[var(--border)]">
            {[
              { label: t("profile.userId"), value: data.user.id },
              { label: t("auth.email"), value: data.user.email },
              { label: t("profile.role"), value: data.user.role },
              { label: t("profile.verified"), value: data.user.verified ? t("common.yes") : t("common.no") },
            ].map(({ label, value }) => (
              <div key={label} className="flex min-w-0 flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
                <span className="min-w-0 break-words text-xs font-medium text-[var(--foreground)]">{value}</span>
              </div>
            ))}
          </div>
        </>}
      </form>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function QuickActions() {
  const { t, locale } = useI18n();
  const websiteLocale = locale === "zh-CN" ? "zh" : "de";
  const actions = [
    { label: t("dashboard.joinTraining"), icon: icons.calendar, color: "hsl(217,91%,60%)", bg: "hsl(217,91%,95%)", href: "/events" },
    { label: t("dashboard.viewRules"), icon: icons.shield, color: "hsl(271,81%,56%)", bg: "hsl(271,81%,95%)", href: `https://bv-erlangen2025.de/${websiteLocale}/dokumente/` },
    { label: t("dashboard.contactUs"), icon: icons.bell, color: "hsl(38,92%,50%)", bg: "hsl(38,92%,94%)", href: `https://bv-erlangen2025.de/${websiteLocale}/kontakt/` },
  ];
  return (
    <div data-responsive-grid="quick-actions" className="grid grid-cols-1 gap-2 md:grid-cols-3">
      {actions.map((a) => {
        const content = (
          <div className="h-11 w-11 rounded-full flex items-center justify-center" style={{ background: a.bg, color: a.color }}>
            <Icon d={a.icon} size={20} />
          </div>
        );
        const label = <span className="text-[11px] font-medium text-[var(--foreground)] text-center leading-tight">{a.label}</span>;
        const className = "flex flex-col items-center gap-2 p-3 rounded-lg bg-[var(--card)] border border-[var(--border)] active:scale-95 transition-all duration-150 cursor-pointer hover:border-[var(--primary)] hover:shadow-sm";
        return a.href === "/events" ? (
          <Link key={a.label} to={a.href} className={className}>
            {content}
            {label}
          </Link>
        ) : (
          <a key={a.label} href={a.href} className={className}>
            {content}
            {label}
          </a>
        );
      })}
    </div>
  );
}

function NewsSection() {
  const { t, locale } = useI18n();
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">{t("dashboard.news")}</h2>
        <button className="text-xs text-[var(--primary)] font-medium flex items-center gap-0.5">
          {t("common.seeAll")} <Icon d={icons.chevronRight} size={12} />
        </button>
      </div>
      {NEWS.slice(0, 1).map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={item.tagColor}>{t("demo.news.tag")}</Badge>
              <span className="text-[10px] text-[var(--muted-foreground)]">{formatLocaleDate(item.date, locale)}</span>
            </div>
            <h3 className="font-semibold text-sm text-[var(--foreground)] leading-snug mb-1">{t("demo.news.title")}</h3>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{t("demo.news.excerpt")}</p>
            <button className="mt-2 text-xs text-[var(--primary)] font-medium flex items-center gap-0.5">
              {t("common.readMore")} <Icon d={icons.chevronRight} size={11} />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function EventCard({ event, onToggle }: { event: Event; onToggle: (id: number) => void }) {
  const { t, locale } = useI18n();
  const spotsLeft = event.capacity - event.registered;
  const isFull = spotsLeft === 0;
  return (
    <Card className="overflow-hidden">
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant={typeColors[event.type] as Parameters<typeof Badge>[0]["variant"]}>{t(typeLabelKeys[event.type])}</Badge>
          <Badge variant="outline">{t(levelKeys[event.level])}</Badge>
          {event.isRegistered && <Badge variant="success">{t("events.registered")}</Badge>}
        </div>
        <h3 className="font-semibold text-sm text-[var(--foreground)] leading-tight mb-2">{t(eventTitleKeys[event.title] ?? "demo.event.social")}</h3>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <Icon d={icons.calendar} size={12} />
            <span>{formatLocaleDate(event.date, locale)}</span>
            <span className="mx-1 opacity-30">·</span>
            <Icon d={icons.clock} size={12} />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <Icon d={icons.mapPin} size={12} />
            <span>{t(locationKeys[event.location])}</span>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
              <Icon d={icons.users} size={12} />
              <span>{t("events.participantCount", { registered: event.registered, capacity: event.capacity })}</span>
            </div>
            <span className={`text-xs font-medium ${isFull ? "text-red-500" : spotsLeft <= 4 ? "text-amber-600" : "text-[var(--muted-foreground)]"}`}>
              {isFull ? t("events.full") : t("events.spotsLeft", { count: spotsLeft })}
            </span>
          </div>
          <Progress value={event.registered} max={event.capacity} color={isFull ? "hsl(0,84%,60%)" : spotsLeft <= 4 ? "hsl(38,92%,50%)" : undefined} />
        </div>
        <div className="mt-3">
          {event.isRegistered ? (
            <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={() => onToggle(event.id)}>
              {t("events.cancelRegistration")}
            </Button>
          ) : (
            <Button size="sm" className="w-full" disabled={isFull} onClick={() => onToggle(event.id)}>
              {isFull ? t("events.joinWaitlist") : t("events.registerNow")}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function ActivityFeed() {
  const { t } = useI18n();
  const iconMap: Record<string, string> = { check: icons.check, shield: icons.shield, trophy: icons.trophy };
  const activityText: Record<number, "demo.activity.registered" | "demo.activity.renewed" | "demo.activity.tournament"> = { 1: "demo.activity.registered", 2: "demo.activity.renewed", 3: "demo.activity.tournament" };
  const activityTime: Record<number, "demo.activity.twoHours" | "demo.activity.aug28" | "demo.activity.aug27"> = { 1: "demo.activity.twoHours", 2: "demo.activity.aug28", 3: "demo.activity.aug27" };
  return (
    <div className="flex flex-col">
      {ACTIVITIES.map((a, i) => (
        <div key={a.id}>
          <div className="flex items-start gap-3 py-3">
            <div className="h-7 w-7 rounded-full bg-[var(--secondary)] flex items-center justify-center text-[var(--primary)] shrink-0 mt-0.5">
              <Icon d={iconMap[a.icon]} size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--foreground)] leading-snug">{t(activityText[a.id])}</p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{t(activityTime[a.id])}</p>
            </div>
          </div>
          {i < ACTIVITIES.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}

// ─── Page views ────────────────────────────────────────────────────────────────

function DashboardView({ events, liveEvents, onToggle, onOpenCard, profile }: { events: Event[]; liveEvents: EventRecord[]; onToggle: (id: number) => void; onOpenCard: () => void; profile: ProfileDto | null }) {
  const { t } = useI18n();
  const displayName = profile?.user.displayName || t("profile.title");
  const memberId = profile?.user.id || "-";
  const group = profile?.groups.map((item) => item.name) ?? ["-"];
  const activeSince = profile?.user.created ? profile.user.created.slice(0, 10) : "-";
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs text-[var(--muted-foreground)]">{t("dashboard.welcome")}</p>
          <h1 id="view-title-dashboard" tabIndex={-1} className="page-title text-[var(--foreground)]">{displayName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button aria-label={t("common.notifications")} className="relative flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]">
            <Icon d={icons.bell} size={18} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-[var(--background)]" />
          </button>
          <Avatar fallback={displayName.slice(0, 2).toUpperCase()} size="md" />
        </div>
      </div>

      {/* Tappable card */}
      <button onClick={onOpenCard} className="text-left w-full active:scale-[0.98] transition-transform duration-150 cursor-pointer" aria-label={t("profile.openMemberCard")}>
        <MemberCard name={displayName} memberId={memberId} activeSince={activeSince} group={group} />
        <p className="text-[10px] text-[var(--muted-foreground)] text-center mt-2 flex items-center justify-center gap-1">
          <Icon d={icons.qrCode} size={10} /> {t("profile.openMemberCardHint")}
        </p>
      </button>

      <DashboardStatisticsPanel />

      <div>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">{t("dashboard.quickActions")}</h2>
        <QuickActions />
      </div>

      <NewsSection />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{t("dashboard.upcomingEvents")}</h2>
          <button className="text-xs text-[var(--primary)] font-medium flex items-center gap-0.5">
            {t("common.seeAll")} <Icon d={icons.chevronRight} size={12} />
          </button>
        </div>
        <LiveEventCards events={liveEvents.slice(0, 3)} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1">{t("dashboard.recentActivity")}</h2>
        <Card>
          <CardContent className="pt-0 px-4 pb-2">
            <ActivityFeed />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EventsView({ events, loading, error }: { events: EventRecord[]; loading: boolean; error: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 id="view-title-events" tabIndex={-1} className="page-title text-[var(--foreground)]">{t("events.title")}</h1>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{t("events.subtitle")}</p>
      </div>
      {loading && <p className="text-sm text-[var(--muted-foreground)]">{t("common.loading")}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{t("events.loadError")}</p>}
      {!loading && !error && <LiveEventCards events={events} />}
    </div>
  );
}

function LiveEventCards({ events }: { events: EventRecord[] }) {
  const { t, locale } = useI18n();
  if (!events.length) return <p className="text-sm text-[var(--muted-foreground)]">{t("events.empty")}</p>;
  return <div className="flex max-h-[min(62vh,44rem)] flex-col gap-3 overflow-y-auto pr-1">{events.map((event) => <Card key={event.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-bold text-[var(--foreground)]">{event.title}</h3><p className="mt-1 break-words text-xs text-[var(--muted-foreground)]">{event.venue.name}</p></div><Badge variant={event.status === "CANCELLED" || event.status === "COMPLETED" ? "destructive" : "success"}>{t(`events.status.${event.status}` as MessageKey)}</Badge></div><div className="mt-3 grid gap-1 text-xs text-[var(--muted-foreground)] md:grid-cols-2"><span>{formatLocaleDateTime(event.start, locale)} - {formatLocaleDateTime(event.end, locale)}</span><span>{t("events.capacity")}: {event.registeredCount}/{event.capacity} ({event.spotsLeft} {t("events.spotsLeftLabel")})</span></div><Link className="mt-3 inline-flex text-xs font-semibold text-[var(--primary)] underline" to={`/events/${encodeURIComponent(event.id)}`}>{t("events.details")}</Link></Card>)}</div>;
}

function AdminDrawer({ onClose, onAdminMembers, onAdminPayments, onAdminEvents, onAdminScanner }: { onClose: () => void; onAdminMembers: () => void; onAdminPayments: () => void; onAdminEvents: () => void; onAdminScanner: () => void }) {
  const { t } = useI18n();
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[91] bg-[var(--card)] rounded-t-2xl border-t border-[var(--border)] pb-8 lg:hidden"
        style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 px-5 pb-3 pt-1 border-b border-[var(--border)]">
          <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
            <Icon d={icons.shieldAdmin} size={14} />
          </div>
          <span className="text-sm font-bold text-[var(--foreground)]">{t("admin.area")}</span>
          <button onClick={onClose} aria-label={t("common.close")} className="ml-auto text-[var(--muted-foreground)] hover:text-[var(--foreground)] h-8 w-8 flex items-center justify-center rounded-full hover:bg-[var(--muted)]">
            <Icon d={icons.x} size={16} />
          </button>
        </div>

        {/* Admin buttons */}
        <div className="px-4 pt-3 flex flex-col gap-2">
          {ADMIN_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => { onClose(); if (item.label === "Members") onAdminMembers(); else if (item.label === "Payments") onAdminPayments(); else if (item.label === "Event Manage") onAdminEvents(); else onAdminScanner(); }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 font-medium text-sm hover:bg-amber-100 active:scale-[0.98] transition-all w-full"
            >
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <Icon d={item.icon} size={17} />
              </div>
              {t(item.label === "Members" ? "admin.members.title" : item.label === "Payments" ? "admin.payments.title" : item.label === "Event Manage" ? "admin.events.title" : "admin.scanMemberCard")}
              <Icon d={icons.chevronRight} size={14} className="ml-auto text-amber-500" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function ProfileView({ profile, onEditProfile, onLogout, onAdminMembers, onAdminPayments, onAdminEvents, onAdminScanner, canAccessAdmin }: { profile: ProfileDto | null; onEditProfile: () => void; onLogout: () => void; onAdminMembers: () => void; onAdminPayments: () => void; onAdminEvents: () => void; onAdminScanner: () => void; canAccessAdmin: boolean }) {
  const { t, locale } = useI18n();
  const [adminOpen, setAdminOpen] = useState(false);

  if (!profile) return <div className="flex flex-col gap-4"><Card><CardContent className="p-5"><h1 id="view-title-profile" tabIndex={-1} className="page-title">{t("profile.title")}</h1><p className="text-sm text-[var(--muted-foreground)] mt-2">{t("profile.incompleteDetails")}</p><Button className="mt-4" onClick={onEditProfile}>{t("profile.edit")}</Button></CardContent></Card><Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-2" onClick={onLogout}><Icon d={icons.logout} size={15} /> {t("auth.signOut")}</Button></div>;
  const initials = `${profile.user.firstName[0] || ""}${profile.user.lastName[0] || ""}`.toUpperCase() || "?";
  const address = profile.profile ? `${profile.profile.street} ${profile.profile.houseNumber}, ${profile.profile.postalCode} ${profile.profile.city}` : t("profile.incomplete");
  const localizedBirthDate = profile.profile?.birthDate ? formatLocaleDate(`${profile.profile.birthDate}T12:00:00Z`, locale) : "-";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center pt-4 pb-2">
        <Avatar fallback={initials} size="lg" className="h-16 w-16 text-lg mb-3" />
        <h1 id="view-title-profile" tabIndex={-1} className="page-title max-w-full break-words text-center">{profile.user.displayName}</h1>
        <p className="max-w-full break-words text-center text-xs text-[var(--muted-foreground)]">{profile.user.email}</p>
        <Badge variant={profile.user.active ? "success" : "outline"} className="mt-2">{profile.user.role === "SUPER_ADMIN" ? t("roles.superAdmin") : profile.user.role === "ADMIN" ? t("roles.admin") : profile.user.role === "MEMBER" ? t("roles.member") : t("roles.guest")}</Badge>
      </div>

      <Card><CardContent className="flex min-w-0 flex-col gap-2 break-words p-4 text-sm"><div><span className="text-[var(--muted-foreground)]">{t("profile.name")}: </span>{profile.user.firstName} {profile.user.lastName}</div><div><span className="text-[var(--muted-foreground)]">{t("profile.address")}: </span>{address}</div><div><span className="text-[var(--muted-foreground)]">{t("profile.birthDate")}: </span>{localizedBirthDate}</div><div><span className="text-[var(--muted-foreground)]">{t("profile.phone")}: </span>{profile.profile?.phone || "-"}</div><div><span className="text-[var(--muted-foreground)]">{t("profile.contactInfo")}: </span>{profile.profile?.contactInfo || "-"}</div><div><span className="text-[var(--muted-foreground)]">{t("profile.groups")}: </span>{profile.groups.length ? profile.groups.map((group) => group.name).join(", ") : "-"}</div><div><span className="text-[var(--muted-foreground)]">{t("profile.userId")}: </span>{profile.user.id}</div><div><span className="text-[var(--muted-foreground)]">{t("profile.status")}: </span>{profile.user.active ? t("profile.active") : t("profile.inactive")} / {profile.user.verified ? t("profile.verified") : t("profile.unverified")}</div><div><span className="text-[var(--muted-foreground)]">{t("profile.createdAt")}: </span>{profile.user.created}</div><div><span className="text-[var(--muted-foreground)]">{t("profile.updatedAt")}: </span>{profile.user.updated}</div></CardContent></Card>

      <Card>
        <CardContent className="p-0">
          {[
            { label: t("profile.edit"), icon: icons.pencil, action: onEditProfile },
            { label: t("common.notifications"), icon: icons.bell, action: () => {} },
          ].map((item, i, arr) => (
            <div key={item.label}>
              <button onClick={item.action} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--muted)] text-left transition-colors">
                <span className="text-[var(--muted-foreground)]"><Icon d={item.icon} size={16} /></span>
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                <span className="text-[var(--muted-foreground)]"><Icon d={icons.chevronRight} size={14} /></span>
              </button>
              {i < arr.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Enter Admin View — mobile only */}
      {canAccessAdmin && (
        <Button
          className="lg:hidden gap-2 bg-amber-500 hover:bg-amber-600 text-white"
          onClick={() => setAdminOpen(true)}
        >
          <Icon d={icons.shieldAdmin} size={15} />
          {t("admin.enterView")}
        </Button>
      )}

      <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-2" onClick={onLogout}>
        <Icon d={icons.logout} size={15} /> {t("auth.signOut")}
      </Button>

      {adminOpen && <AdminDrawer onClose={() => setAdminOpen(false)} onAdminMembers={() => { setAdminOpen(false); onAdminMembers(); }} onAdminPayments={() => { setAdminOpen(false); onAdminPayments(); }} onAdminEvents={() => { setAdminOpen(false); onAdminEvents(); }} onAdminScanner={() => { setAdminOpen(false); onAdminScanner(); }} />}
    </div>
  );
}

// ─── Navigation ────────────────────────────────────────────────────────────────

const ADMIN_ITEMS = [
  { label: "Members", icon: icons.usersAdmin },
  { label: "Payments", icon: icons.creditCard },
  { label: "Event Manage", icon: icons.clipboardList },
  { label: "Scan Member Card", icon: icons.qrCode },
];

const NAV_ITEMS: Array<{ key: NavTab; label: string; icon: string }> = [
  { key: "dashboard", label: "Home", icon: icons.home },
  { key: "events", label: "Events", icon: icons.calendar },
  { key: "payments", label: "Payments", icon: icons.creditCard },
  { key: "profile", label: "Profile", icon: icons.user },
];

function BottomNav({
  active,
  onChange,
  unpaidCount,
}: {
  active: NavTab;
  onChange: (t: NavTab) => void;
  unpaidCount: number;
}) {
  const { t } = useI18n();
  return (
    <nav aria-label={t("navigation.primary")} className="fixed bottom-0 left-0 right-0 z-50 hidden border-t border-[var(--border)] bg-[var(--card)] md:flex lg:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.key;
        const showDot = item.key === "payments" && unpaidCount > 0;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative ${isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}
          >
            <div className="relative">
              <Icon d={item.icon} size={20} />
              {showDot && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-[var(--card)] text-[8px] text-white font-bold flex items-center justify-center">
                  {unpaidCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{t(primaryNavMessageKey(item.key))}</span>
          </button>
        );
      })}
    </nav>
  );
}

const FOCUSABLE_DRAWER_ELEMENTS = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function MobileNavigationDrawer({
  open,
  onOpenChange,
  active,
  onSelect,
  unpaidCount,
  canAccessAdmin,
  onAdminMembers,
  onAdminPayments,
  onAdminEvents,
  onAdminScanner,
  onLogout,
  triggerRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: NavTab;
  onSelect: (tab: NavTab) => void;
  unpaidCount: number;
  canAccessAdmin: boolean;
  onAdminMembers: () => void;
  onAdminPayments: () => void;
  onAdminEvents: () => void;
  onAdminScanner: () => void;
  onLogout: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const { t } = useI18n();
  const drawerRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) triggerRef.current?.focus();
      wasOpen.current = false;
      return;
    }

    wasOpen.current = true;
    const scrollY = window.scrollY;
    const previous = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const frame = window.requestAnimationFrame(() => {
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_DRAWER_ELEMENTS);
      focusable?.[0]?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_DRAWER_ELEMENTS) ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previous.overflow;
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      window.scrollTo({ top: scrollY, behavior: "instant" });
    };
  }, [onOpenChange, open, triggerRef]);

  const runAdminAction = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <div className="md:hidden">
      <div
        aria-hidden="true"
        className="mobile-drawer-backdrop fixed inset-0 z-[70] bg-black/45"
        data-open={open}
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={drawerRef}
        id="mobile-navigation-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-navigation-title"
        aria-hidden={!open}
        inert={!open}
        data-open={open}
        className="mobile-drawer-panel fixed inset-y-0 right-0 z-[71] flex w-[min(88vw,22rem)] max-w-full flex-col overscroll-contain border-l border-[var(--border)] bg-[var(--card)] shadow-2xl"
      >
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-[var(--border)] px-4">
          <h2 id="mobile-navigation-title" className="text-base font-bold text-[var(--foreground)]">
            {t("navigation.menu")}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={t("common.close")}
            className="flex size-11 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            <Icon d={icons.x} size={20} />
          </button>
        </div>

        <nav aria-label={t("navigation.primary")} className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.key;
            const showCount = item.key === "payments" && unpaidCount > 0;
            return (
              <button
                key={item.key}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSelect(item.key)}
                className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${isActive ? "bg-[var(--secondary)] text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"}`}
              >
                <Icon d={item.icon} size={18} />
                <span className="min-w-0 flex-1 break-words">{t(primaryNavMessageKey(item.key))}</span>
                {showCount && (
                  <span className="flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {unpaidCount}
                  </span>
                )}
              </button>
            );
          })}

          {canAccessAdmin && (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                {t("admin.management")}
              </p>
              {ADMIN_ITEMS.map((item) => {
                const action = item.label === "Members" ? onAdminMembers : item.label === "Payments" ? onAdminPayments : item.label === "Event Manage" ? onAdminEvents : onAdminScanner;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => runAdminAction(action)}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-amber-50 hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                  >
                    <Icon d={item.icon} size={18} />
                    <span className="min-w-0 flex-1 break-words">
                      {t(item.label === "Members" ? "admin.members.title" : item.label === "Payments" ? "admin.payments.title" : item.label === "Event Manage" ? "admin.events.title" : "admin.scanMemberCard")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        <div className="border-t border-[var(--border)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => runAdminAction(onLogout)}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            <Icon d={icons.logout} size={18} />
            {t("auth.signOut")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  active,
  onChange,
  unpaidCount,
  onLogout,
  onAdminMembers,
  onAdminPayments,
  onAdminEvents,
  onAdminScanner,
  canAccessAdmin,
  profile,
}: {
  active: NavTab;
  onChange: (t: NavTab) => void;
  unpaidCount: number;
  onLogout: () => void;
  onAdminMembers: () => void;
  onAdminPayments: () => void;
  onAdminEvents: () => void;
  onAdminScanner: () => void;
  canAccessAdmin: boolean;
  profile: ProfileDto | null;
}) {
  const { t } = useI18n();
  const displayName = profile?.user.displayName || t("profile.title");
  const groups = profile?.groups.map((item) => item.name) ?? [];
  const role = profile?.user.role === "SUPER_ADMIN" ? t("roles.superAdmin") : profile?.user.role === "ADMIN" ? t("roles.admin") : profile?.user.role === "MEMBER" ? t("roles.member") : t("roles.guest");
  return (
    <aside className="hidden lg:flex flex-col w-[var(--sidebar-width)] shrink-0 bg-[var(--card)] border-r border-[var(--border)] h-full">
      {/* Logo */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl overflow-hidden bg-[var(--secondary)] shrink-0 flex items-center justify-center">
          <img src={logoSrc} alt={t("brand.logoAlt")} className="h-full w-full object-contain p-0.5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs leading-tight truncate">{t("brand.name")}</p>
            <p className="text-[10px] text-[var(--muted-foreground)] truncate">{t("brand.legalSuffix")}</p>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Avatar fallback={displayName.slice(0, 2).toUpperCase()} size="md" />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">{role}</p>
            <div className="text-[10px] text-[var(--muted-foreground)]/75 leading-tight">{groups.length ? groups.map((group) => <p key={group} className="truncate">{group}</p>) : <p>-</p>}</div>
          </div>
          <button aria-label={t("common.notifications")} className="ml-auto text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <Icon d={icons.bell} size={16} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          const showDot = item.key === "payments" && unpaidCount > 0;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 w-full ${isActive ? "bg-[var(--secondary)] text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"}`}
            >
              <div className="relative">
                <Icon d={item.icon} size={17} />
                {showDot && (
                  <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {unpaidCount}
                  </span>
                )}
              </div>
              {t(primaryNavMessageKey(item.key))}
              {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />}
            </button>
          );
        })}
      </nav>

      {/* Admin section — desktop only */}
      {canAccessAdmin && <div className="px-3 pb-2 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 px-3 mb-2">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">{t("admin.title")}</span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        {ADMIN_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={item.label === "Members" ? onAdminMembers : item.label === "Payments" ? onAdminPayments : item.label === "Event Manage" ? onAdminEvents : onAdminScanner}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-[var(--muted-foreground)] hover:bg-amber-50 hover:text-amber-700 transition-all duration-150"
          >
            <Icon d={item.icon} size={17} />
            {t(item.label === "Members" ? "admin.members.title" : item.label === "Payments" ? "admin.payments.title" : item.label === "Event Manage" ? "admin.events.title" : "admin.scanMemberCard")}
          </button>
        ))}
      </div>}

      {/* Bottom */}
      <div className="p-3 border-t border-[var(--border)] flex flex-col gap-1">
        <button onClick={onLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors w-full">
          <Icon d={icons.logout} size={17} />
          {t("auth.signOut")}
        </button>
      </div>
    </aside>
  );
}

// ─── AppShell (dashboard without login gate, used by FramePreview) ────────────

export function AppShell({ initialTab = "dashboard", onLogout }: { initialTab?: NavTab; onLogout?: () => void }) {
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();
  const { data: user } = useAuthUser();
  const { t } = useI18n();
  const liveEvents = useEvents();
  useEventRealtime();
  usePaymentRealtime();
  const myPayments = useMyPayments();
  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useMyProfile();
  const canAccessAdmin = isAdminRole(user?.role);
  const [tab, setTab] = useState<NavTab>(initialTab);
  const [events, setEvents] = useState<Event[]>(EVENTS);
  const [cardOpen, setCardOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [adminView, setAdminView] = useState<"members" | "payments" | "events" | null>(null);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const mobileNavigationTrigger = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const unpaidCount = myPayments.data?.filter((payment) => payment.status === "UNPAID").length ?? 0;

  function toggleRegistration(id: number) {
    setEvents((prev) =>
      prev.map((e) => e.id === id ? { ...e, isRegistered: !e.isRegistered, registered: e.isRegistered ? e.registered - 1 : e.registered + 1 } : e)
    );
  }

  const tabLabel: Record<NavTab, string> = {
    dashboard: t(primaryNavMessageKey("dashboard")),
    events: t(primaryNavMessageKey("events")),
    payments: t(primaryNavMessageKey("payments")),
    profile: t(primaryNavMessageKey("profile")),
  };

  const logout = onLogout ?? authLogout;

  function selectFromMobileNavigation(nextTab: NavTab) {
    setTab(nextTab);
    setMobileNavigationOpen(false);
    window.requestAnimationFrame(() => {
      const target = document.getElementById(`app-view-${nextTab}`);
      const heading = document.getElementById(`view-title-${nextTab}`);
      (heading ?? target)?.focus({ preventScroll: true });
      target?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
  }

  function renderView() {
    switch (tab) {
      case "dashboard":
        return <DashboardView events={events} liveEvents={liveEvents.data ?? []} onToggle={toggleRegistration} onOpenCard={() => setCardOpen(true)} profile={profile || null} />;
      case "events":
        return <EventsView events={liveEvents.data ?? []} loading={liveEvents.isPending} error={liveEvents.isError} />;
      case "payments":
        return <PaymentsView />;
      case "profile":
        if (profileLoading) return <div><h1 id="view-title-profile" tabIndex={-1} className="page-title">{t("profile.title")}</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">{t("profile.loading")}</p></div>;
        if (profileError) return <Card><CardContent className="p-5"><h1 id="view-title-profile" tabIndex={-1} className="page-title">{t("profile.title")}</h1><p role="alert" className="mt-2 text-sm text-red-600">{t("profile.loadError")}</p><Button className="mt-4" onClick={() => void refetchProfile()}>{t("common.retry")}</Button></CardContent></Card>;
        return <ProfileView profile={profile || null} onEditProfile={() => setEditProfileOpen(true)} onLogout={logout} onAdminMembers={() => setAdminView("members")} onAdminPayments={() => setAdminView("payments")} onAdminEvents={() => setAdminView("events")} onAdminScanner={() => navigate("/admin/member-card-scanner")} canAccessAdmin={canAccessAdmin} />;
    }
  }

  return (
    <div className="relative h-full bg-[var(--background)]" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="app-shell-background flex h-full" data-drawer-open={mobileNavigationOpen} inert={mobileNavigationOpen ? true : undefined}>
        <Sidebar active={tab} onChange={setTab} unpaidCount={unpaidCount} onLogout={logout} onAdminMembers={() => setAdminView("members")} onAdminPayments={() => setAdminView("payments")} onAdminEvents={() => setAdminView("events")} onAdminScanner={() => navigate("/admin/member-card-scanner")} canAccessAdmin={canAccessAdmin} profile={profile || null} />

        <main ref={mainRef} id="app-main-content" className="min-w-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto">
        <div className="hidden lg:flex items-center justify-between px-8 py-5 border-b border-[var(--border)] bg-[var(--card)] sticky top-0 z-10">
          <span className="text-base font-semibold text-[var(--foreground)]">{tabLabel[tab]}</span>
          <div className="flex items-center gap-3">
            <LanguageSwitcher className="text-[var(--foreground)]" />
            <button aria-label={t("common.notifications")} className="relative h-10 w-10 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">
              <Icon d={icons.bell} size={18} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-[var(--card)]" />
            </button>
            <Avatar fallback={(profile?.user.displayName || "?").slice(0, 2).toUpperCase()} size="md" />
          </div>
        </div>

        <div className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 md:hidden">
          <span className="text-sm font-semibold text-[var(--foreground)]">{tabLabel[tab]}</span>
          <div className="flex shrink-0 items-center gap-1">
            <LanguageSwitcher className="text-[var(--foreground)]" />
            <button
              ref={mobileNavigationTrigger}
              type="button"
              aria-label={t("navigation.openMenu")}
              aria-expanded={mobileNavigationOpen}
              aria-controls="mobile-navigation-drawer"
              onClick={() => setMobileNavigationOpen(true)}
              className="flex size-11 items-center justify-center rounded-lg text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              <Icon d={icons.menu} size={22} />
            </button>
          </div>
        </div>
        <div className="sticky top-0 z-10 hidden items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 md:flex lg:hidden">
          <span className="text-sm font-semibold text-[var(--foreground)]">{tabLabel[tab]}</span>
          <LanguageSwitcher className="text-[var(--foreground)]" />
        </div>
        <div className="min-w-0 w-full max-w-2xl px-4 py-5 pb-24 lg:max-w-none lg:px-8 lg:py-7 lg:pb-8">
          <section id={`app-view-${tab}`} tabIndex={-1} aria-label={tabLabel[tab]} className="min-w-0 scroll-mt-20">
            {renderView()}
          </section>
        </div>
        </main>

        <BottomNav active={tab} onChange={setTab} unpaidCount={unpaidCount} />

        {cardOpen && <MemberCardOverlay onClose={() => setCardOpen(false)} />}
        {editProfileOpen && <EditProfileOverlay onClose={() => setEditProfileOpen(false)} />}

      {/* Admin overlays */}
      {canAccessAdmin && adminView === "members" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--background)", display: "flex", flexDirection: "column" }}>
          <AdminMembersView onBack={() => setAdminView(null)} />
        </div>
      )}
      {canAccessAdmin && adminView === "payments" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--background)", display: "flex", flexDirection: "column" }}>
          <AdminPaymentsView onBack={() => setAdminView(null)} />
        </div>
      )}
        {canAccessAdmin && adminView === "events" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--background)", display: "flex", flexDirection: "column" }}>
          <AdminEventManageView onBack={() => setAdminView(null)} />
        </div>
      )}
      </div>

      <MobileNavigationDrawer
        open={mobileNavigationOpen}
        onOpenChange={setMobileNavigationOpen}
        active={tab}
        onSelect={selectFromMobileNavigation}
        unpaidCount={unpaidCount}
        canAccessAdmin={canAccessAdmin}
        onAdminMembers={() => setAdminView("members")}
        onAdminPayments={() => setAdminView("payments")}
        onAdminEvents={() => setAdminView("events")}
        onAdminScanner={() => navigate("/admin/member-card-scanner")}
        onLogout={logout}
        triggerRef={mobileNavigationTrigger}
      />
    </div>
  );
}

function AdminRoutePage({ kind }: { kind: "members" | "payments" | "events" }) {
  const navigate = useNavigate();
  const onBack = () => navigate("/");

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[var(--background)]">
      {kind === "members" && <AdminMembersView onBack={onBack} />}
      {kind === "payments" && <AdminPaymentsView onBack={onBack} />}
      {kind === "events" && <AdminEventManageView onBack={onBack} />}
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><LoginView /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterView /></PublicOnlyRoute>} />
      <Route path="/register/success" element={<PublicOnlyRoute><RegisterSuccessView /></PublicOnlyRoute>} />
      <Route path="/verify-email" element={<PublicOnlyRoute><VerifyEmailView /></PublicOnlyRoute>} />
      <Route element={<ProtectedRoute />}>
        <Route index element={<AppShell />} />
        <Route path="events" element={<AppShell initialTab="events" />} />
        <Route path="payments" element={<AppShell initialTab="payments" />} />
        <Route path="profile" element={<AppShell initialTab="profile" />} />
        <Route element={<AdminGuard />}>
          <Route path="admin/members" element={<AdminRoutePage kind="members" />} />
          <Route path="admin/payments" element={<AdminRoutePage kind="payments" />} />
          <Route path="admin/events" element={<AdminRoutePage kind="events" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
