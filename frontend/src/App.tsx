import { useState, useRef } from "react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Avatar } from "./components/ui/avatar";
import { Progress } from "./components/ui/progress";
import { Separator } from "./components/ui/separator";
import { MemberCard } from "./components/MemberCard";
import LoginView from "./components/LoginView";
import AdminMembersView from "./components/AdminMembersView";
import AdminPaymentsView from "./components/AdminPaymentsView";
import AdminEventManageView from "./components/AdminEventManageView";
import logoSrc from "./imports/logo1-high-resolution.png";

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
};

// ─── Data ─────────────────────────────────────────────────────────────────────

type NavTab = "dashboard" | "events" | "payments" | "profile";

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

interface Payment {
  id: number;
  eventTitle: string;
  date: string;
  time: string;
  price: number;
  paid: boolean;
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

const INITIAL_PAYMENTS: Payment[] = [
  { id: 1, eventTitle: "Tuesday Evening Training", date: "Sep 2, 2026", time: "7:00 PM – 9:00 PM", price: 5, paid: false },
  { id: 2, eventTitle: "Club Singles Championship", date: "Sep 6, 2026", time: "9:00 AM – 6:00 PM", price: 15, paid: false },
  { id: 3, eventTitle: "End-of-Season Social Night", date: "Sep 14, 2026", time: "6:30 PM – 10:00 PM", price: 10, paid: true },
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
const typeLabels: Record<Event["type"], string> = {
  training: "Training",
  tournament: "Tournament",
  social: "Social",
  workshop: "Workshop",
};

// ─── Full-screen Member Card overlay ──────────────────────────────────────────

function MemberCardOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto"
      style={{ background: "linear-gradient(160deg, #0f2d1a 0%, #14532d 45%, #1a6b38 100%)" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-2 shrink-0">
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Icon d={icons.chevronLeft} size={20} />
        </button>
        <span className="text-white/60 text-sm font-500">Mitgliedsausweis</span>
        <div className="w-9" />
      </div>

      {/* Club logo */}
      <div className="flex flex-col items-center pt-5 pb-6 shrink-0">
        <div className="h-20 w-20 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-3 backdrop-blur-sm overflow-hidden p-1">
          <img src={logoSrc} alt="BV Erlangen Logo" className="h-full w-full object-contain" />
        </div>
        <p className="text-white font-700 text-base leading-tight text-center">Badminton Verein Erlangen</p>
        <p className="text-white/50 text-xs mt-0.5">n.e.V. · Est. 2025</p>
      </div>

      {/* Card */}
      <div className="flex justify-center px-6 shrink-0">
        <div style={{ width: "100%", maxWidth: "380px" }}>
          <MemberCard name="Sarah Chen" memberId="BWC-ER-0312" activeSince="Jan 2022" group="MemberER" />
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center mt-8 px-6 pb-12 shrink-0">
        <div className="bg-white rounded-2xl p-5 flex flex-col items-center gap-3" style={{ width: "180px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(9,1fr)", gap: "2.5px", width: "110px", height: "110px" }}>
            {Array.from({ length: 81 }).map((_, i) => {
              const finderTL = [0,1,2,3,4,5,6,9,15,18,24,27,28,29,30,31,32,33,10,11,12,13,14,19,20,21,22,23].includes(i);
              const finderTR = [2,3,4,5,6,7,8,11,17,20,26,29,30,31,32,33,34,35,12,13,14,15,16,21,22,23,24,25].map(x=>x+54).includes(i);
              const finderBL = [54,55,56,57,58,59,60,63,69,72,78,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77].includes(i);
              const seed = ((i * 1664525 + 1013904223) >>> 0) % 100;
              const on = finderTL || finderTR || finderBL || seed < 55;
              return (
                <div key={i} style={{ borderRadius: "1.5px", background: on ? "#0f2d1a" : "transparent" }} />
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 font-500 text-center leading-snug">Scan zur Verifikation</p>
        </div>
        <p className="text-white/35 text-[10px] mt-4 text-center">BWC-ER-0312 · Gültig bis 31. Dez. 2026</p>
      </div>
    </div>
  );
}

// ─── Edit Profile overlay ──────────────────────────────────────────────────────

function EditProfileOverlay({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState("sarah.chen");
  const [displayName, setDisplayName] = useState("Sarah Chen");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--background)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)] bg-[var(--card)]">
        <button onClick={onClose} className="h-9 w-9 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <Icon d={icons.x} size={18} />
        </button>
        <span className="text-sm font-600">Edit Profile</span>
        <button
          onClick={onClose}
          className="text-sm font-600 text-[var(--primary)] px-2 py-1 rounded hover:bg-[var(--secondary)] transition-colors"
        >
          Save
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-24 w-24 rounded-full overflow-hidden bg-[var(--secondary)] flex items-center justify-center text-2xl font-700 text-[var(--primary)]">
              {avatarPreview
                ? <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                : <span>SC</span>
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center border-2 border-[var(--background)] hover:opacity-90 transition-opacity"
            >
              <Icon d={icons.camera} size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
          <button onClick={() => fileRef.current?.click()} className="text-xs text-[var(--primary)] font-500">
            Change photo
          </button>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-600 text-[var(--muted-foreground)] uppercase tracking-wide block mb-1.5">
              Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full h-11 px-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
              placeholder="Your display name"
            />
          </div>
          <div>
            <label className="text-xs font-600 text-[var(--muted-foreground)] uppercase tracking-wide block mb-1.5">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, "."))}
                className="w-full h-11 pl-7 pr-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                placeholder="username"
              />
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-1.5">Used to identify you in the club system</p>
          </div>

          {/* Read-only info */}
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] divide-y divide-[var(--border)]">
            {[
              { label: "Member ID", value: "BWC-ER-0312" },
              { label: "Membership", value: "MemberER" },
              { label: "Email", value: "sarah.chen@email.com" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-3 py-2.5">
                <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
                <span className="text-xs font-500 text-[var(--foreground)]">{value}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)] -mt-2">These fields are managed by the club administrator.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatBar() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "Members", value: "148", sub: "+4 this month", color: "var(--primary)" },
        { label: "Events", value: "6", sub: "this month", color: "hsl(38,92%,50%)" },
        { label: "Registered", value: "2", sub: "by you", color: "hsl(217,91%,60%)" },
      ].map((stat) => (
        <Card key={stat.label} className="text-center py-3 px-2">
          <div className="text-2xl font-700" style={{ color: stat.color }}>{stat.value}</div>
          <div className="text-xs font-600 text-[var(--foreground)] mt-0.5">{stat.label}</div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{stat.sub}</div>
        </Card>
      ))}
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: "Join Training", icon: icons.calendar, color: "hsl(217,91%,60%)", bg: "hsl(217,91%,95%)" },
    { label: "View Rules", icon: icons.shield, color: "hsl(271,81%,56%)", bg: "hsl(271,81%,95%)" },
    { label: "Contact Us", icon: icons.bell, color: "hsl(38,92%,50%)", bg: "hsl(38,92%,94%)" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {actions.map((a) => (
        <button key={a.label} className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius)] bg-[var(--card)] border border-[var(--border)] active:scale-95 transition-all duration-150 cursor-pointer hover:border-[var(--primary)] hover:shadow-sm">
          <div className="h-11 w-11 rounded-full flex items-center justify-center" style={{ background: a.bg, color: a.color }}>
            <Icon d={a.icon} size={20} />
          </div>
          <span className="text-[11px] font-500 text-[var(--foreground)] text-center leading-tight">{a.label}</span>
        </button>
      ))}
    </div>
  );
}

function NewsSection() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-600 text-[var(--foreground)]">News from Club</h2>
        <button className="text-xs text-[var(--primary)] font-500 flex items-center gap-0.5">
          See all <Icon d={icons.chevronRight} size={12} />
        </button>
      </div>
      {NEWS.slice(0, 1).map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={item.tagColor}>{item.tag}</Badge>
              <span className="text-[10px] text-[var(--muted-foreground)]">{item.date}</span>
            </div>
            <h3 className="font-600 text-sm text-[var(--foreground)] leading-snug mb-1">{item.title}</h3>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{item.excerpt}</p>
            <button className="mt-2 text-xs text-[var(--primary)] font-500 flex items-center gap-0.5">
              Read more <Icon d={icons.chevronRight} size={11} />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function EventCard({ event, onToggle }: { event: Event; onToggle: (id: number) => void }) {
  const spotsLeft = event.capacity - event.registered;
  const isFull = spotsLeft === 0;
  return (
    <Card className="overflow-hidden">
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Badge variant={typeColors[event.type] as Parameters<typeof Badge>[0]["variant"]}>{typeLabels[event.type]}</Badge>
          <Badge variant="outline">{event.level}</Badge>
          {event.isRegistered && <Badge variant="success">Registered</Badge>}
        </div>
        <h3 className="font-600 text-sm text-[var(--foreground)] leading-tight mb-2">{event.title}</h3>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <Icon d={icons.calendar} size={12} />
            <span>{event.date}</span>
            <span className="mx-1 opacity-30">·</span>
            <Icon d={icons.clock} size={12} />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <Icon d={icons.mapPin} size={12} />
            <span>{event.location}</span>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
              <Icon d={icons.users} size={12} />
              <span>{event.registered}/{event.capacity} participants</span>
            </div>
            <span className={`text-xs font-500 ${isFull ? "text-red-500" : spotsLeft <= 4 ? "text-amber-600" : "text-[var(--muted-foreground)]"}`}>
              {isFull ? "Full" : `${spotsLeft} left`}
            </span>
          </div>
          <Progress value={event.registered} max={event.capacity} color={isFull ? "hsl(0,84%,60%)" : spotsLeft <= 4 ? "hsl(38,92%,50%)" : undefined} />
        </div>
        <div className="mt-3">
          {event.isRegistered ? (
            <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={() => onToggle(event.id)}>
              Cancel Registration
            </Button>
          ) : (
            <Button size="sm" className="w-full" disabled={isFull} onClick={() => onToggle(event.id)}>
              {isFull ? "Join Waitlist" : "Register Now"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function PaymentCard({ payment, onPay }: { payment: Payment; onPay: (id: number) => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={payment.paid ? "success" : "destructive"}>
            {payment.paid ? "Paid" : "Unpaid"}
          </Badge>
        </div>
        <h3 className="font-600 text-sm text-[var(--foreground)] leading-tight mb-2">{payment.eventTitle}</h3>
        <div className="flex flex-col gap-1 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <Icon d={icons.calendar} size={12} />
            <span>{payment.date}</span>
            <span className="mx-1 opacity-30">·</span>
            <Icon d={icons.clock} size={12} />
            <span>{payment.time}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide font-500">Amount</p>
            <p className="text-xl font-700 text-[var(--foreground)] mt-0.5">€{payment.price.toFixed(2)}</p>
          </div>
          {payment.paid ? (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-600">
              <Icon d={icons.check} size={16} />
              Done
            </div>
          ) : (
            <Button size="md" onClick={() => onPay(payment.id)} className="px-5">
              Pay Now
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function ActivityFeed() {
  const iconMap: Record<string, string> = { check: icons.check, shield: icons.shield, trophy: icons.trophy };
  return (
    <div className="flex flex-col">
      {ACTIVITIES.map((a, i) => (
        <div key={a.id}>
          <div className="flex items-start gap-3 py-3">
            <div className="h-7 w-7 rounded-full bg-[var(--secondary)] flex items-center justify-center text-[var(--primary)] shrink-0 mt-0.5">
              <Icon d={iconMap[a.icon]} size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--foreground)] leading-snug">{a.text}</p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{a.time}</p>
            </div>
          </div>
          {i < ACTIVITIES.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}

// ─── Page views ────────────────────────────────────────────────────────────────

function DashboardView({ events, onToggle, onOpenCard }: { events: Event[]; onToggle: (id: number) => void; onOpenCard: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--muted-foreground)]">Willkommen,</p>
          <h1 className="text-xl font-700 text-[var(--foreground)]">Sarah Chen</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative h-9 w-9 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">
            <Icon d={icons.bell} size={18} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-[var(--background)]" />
          </button>
          <Avatar fallback="SC" size="md" />
        </div>
      </div>

      {/* Tappable card */}
      <button onClick={onOpenCard} className="text-left w-full active:scale-[0.98] transition-transform duration-150 cursor-pointer" aria-label="Open member card">
        <MemberCard name="Sarah Chen" memberId="BWC-ER-0312" activeSince="Jan 2022" group="MemberER" />
        <p className="text-[10px] text-[var(--muted-foreground)] text-center mt-2 flex items-center justify-center gap-1">
          <Icon d={icons.qrCode} size={10} /> Tippen für vollständigen Ausweis & QR-Code
        </p>
      </button>

      <StatBar />

      <div>
        <h2 className="text-sm font-600 text-[var(--foreground)] mb-3">Quick Actions</h2>
        <QuickActions />
      </div>

      <NewsSection />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-600 text-[var(--foreground)]">Upcoming Events</h2>
          <button className="text-xs text-[var(--primary)] font-500 flex items-center gap-0.5">
            See all <Icon d={icons.chevronRight} size={12} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {events.slice(0, 3).map((e) => (
            <EventCard key={e.id} event={e} onToggle={onToggle} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-600 text-[var(--foreground)] mb-1">Recent Activity</h2>
        <Card>
          <CardContent className="pt-0 px-4 pb-2">
            <ActivityFeed />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EventsView({ events, onToggle }: { events: Event[]; onToggle: (id: number) => void }) {
  const [filter, setFilter] = useState<"all" | Event["type"]>("all");
  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);
  const eventFilters: Array<{ key: "all" | Event["type"]; label: string }> = [
    { key: "all", label: "All" },
    { key: "training", label: "Training" },
    { key: "tournament", label: "Tournament" },
    { key: "social", label: "Social" },
    { key: "workshop", label: "Workshop" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-700 text-[var(--foreground)]">Events</h1>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Browse and register for upcoming events</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
        {eventFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-500 transition-all duration-150 ${filter === f.key ? "bg-[var(--primary)] text-white" : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {filtered.map((e) => <EventCard key={e.id} event={e} onToggle={onToggle} />)}
      </div>
    </div>
  );
}

function PaymentsView({ payments, onPay }: { payments: Payment[]; onPay: (id: number) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-700 text-[var(--foreground)]">Payments</h1>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Outstanding and completed event fees</p>
      </div>
      {payments.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-[var(--muted-foreground)]">
          <Icon d={icons.creditCard} size={32} />
          <p className="text-sm mt-3 font-500">No payments yet</p>
          <p className="text-xs mt-1">Outstanding fees will appear here</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {payments.map((p) => <PaymentCard key={p.id} payment={p} onPay={onPay} />)}
        </div>
      )}
    </div>
  );
}

function AdminDrawer({ onClose, onAdminMembers, onAdminPayments, onAdminEvents }: { onClose: () => void; onAdminMembers: () => void; onAdminPayments: () => void; onAdminEvents: () => void }) {
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
          <span className="text-sm font-700 text-[var(--foreground)]">Admin Bereich</span>
          <button onClick={onClose} className="ml-auto text-[var(--muted-foreground)] hover:text-[var(--foreground)] h-8 w-8 flex items-center justify-center rounded-full hover:bg-[var(--muted)]">
            <Icon d={icons.x} size={16} />
          </button>
        </div>

        {/* Admin buttons */}
        <div className="px-4 pt-3 flex flex-col gap-2">
          {ADMIN_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => { onClose(); if (item.label === "Members") onAdminMembers(); else if (item.label === "Payments") onAdminPayments(); else if (item.label === "Event Manage") onAdminEvents(); }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-[var(--radius)] bg-amber-50 border border-amber-100 text-amber-800 font-500 text-sm hover:bg-amber-100 active:scale-[0.98] transition-all w-full"
            >
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <Icon d={item.icon} size={17} />
              </div>
              {item.label}
              <Icon d={icons.chevronRight} size={14} className="ml-auto text-amber-500" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function ProfileView({ onEditProfile, onLogout, onAdminMembers, onAdminPayments, onAdminEvents }: { onEditProfile: () => void; onLogout: () => void; onAdminMembers: () => void; onAdminPayments: () => void; onAdminEvents: () => void }) {
  const [adminOpen, setAdminOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center pt-4 pb-2">
        <Avatar fallback="SC" size="lg" className="h-16 w-16 text-lg mb-3" />
        <h1 className="text-lg font-700">Sarah Chen</h1>
        <p className="text-xs text-[var(--muted-foreground)]">sarah.chen@email.com</p>
        <Badge variant="success" className="mt-2">MemberER</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        {[
          { label: "Events Attended", value: "34" },
          { label: "Member Since", value: "2022" },
        ].map((s) => (
          <Card key={s.label} className="py-3 px-2">
            <div className="text-xl font-700 text-[var(--primary)]">{s.value}</div>
            <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5 leading-tight">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {[
            { label: "Edit Profile", icon: icons.pencil, action: onEditProfile },
            { label: "Notifications", icon: icons.bell, action: () => {} },
          ].map((item, i, arr) => (
            <div key={item.label}>
              <button onClick={item.action} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--muted)] text-left transition-colors">
                <span className="text-[var(--muted-foreground)]"><Icon d={item.icon} size={16} /></span>
                <span className="flex-1 text-sm font-500">{item.label}</span>
                <span className="text-[var(--muted-foreground)]"><Icon d={icons.chevronRight} size={14} /></span>
              </button>
              {i < arr.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Enter Admin View — mobile only */}
      <Button
        className="lg:hidden gap-2 bg-amber-500 hover:bg-amber-600 text-white"
        onClick={() => setAdminOpen(true)}
      >
        <Icon d={icons.shieldAdmin} size={15} />
        Enter Admin View
      </Button>

      <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-2" onClick={onLogout}>
        <Icon d={icons.logout} size={15} /> Sign Out
      </Button>

      {adminOpen && <AdminDrawer onClose={() => setAdminOpen(false)} onAdminMembers={() => { setAdminOpen(false); onAdminMembers(); }} onAdminPayments={() => { setAdminOpen(false); onAdminPayments(); }} onAdminEvents={() => { setAdminOpen(false); onAdminEvents(); }} />}
    </div>
  );
}

// ─── Navigation ────────────────────────────────────────────────────────────────

const ADMIN_ITEMS = [
  { label: "Members", icon: icons.usersAdmin },
  { label: "Payments", icon: icons.creditCard },
  { label: "Event Manage", icon: icons.clipboardList },
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
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--card)] border-t border-[var(--border)] flex lg:hidden">
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
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-[var(--card)] text-[8px] text-white font-700 flex items-center justify-center">
                  {unpaidCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-500">{item.label}</span>
          </button>
        );
      })}
    </nav>
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
}: {
  active: NavTab;
  onChange: (t: NavTab) => void;
  unpaidCount: number;
  onLogout: () => void;
  onAdminMembers: () => void;
  onAdminPayments: () => void;
  onAdminEvents: () => void;
}) {
  return (
    <aside className="hidden lg:flex flex-col w-[var(--sidebar-width)] shrink-0 bg-[var(--card)] border-r border-[var(--border)] h-full">
      {/* Logo */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl overflow-hidden bg-[var(--secondary)] shrink-0 flex items-center justify-center">
            <img src={logoSrc} alt="BV Erlangen" className="h-full w-full object-contain p-0.5" />
          </div>
          <div className="min-w-0">
            <p className="font-700 text-xs leading-tight truncate">Badminton Verein Erlangen</p>
            <p className="text-[10px] text-[var(--muted-foreground)] truncate">n.e.V.</p>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Avatar fallback="SC" size="md" />
          <div className="min-w-0">
            <p className="text-sm font-600 truncate">Sarah Chen</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">MemberER</p>
          </div>
          <button className="ml-auto text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] text-sm font-500 transition-all duration-150 w-full ${isActive ? "bg-[var(--secondary)] text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"}`}
            >
              <div className="relative">
                <Icon d={item.icon} size={17} />
                {showDot && (
                  <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[8px] font-700 flex items-center justify-center">
                    {unpaidCount}
                  </span>
                )}
              </div>
              {item.label}
              {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />}
            </button>
          );
        })}
      </nav>

      {/* Admin section — desktop only */}
      <div className="px-3 pb-2 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 px-3 mb-2">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-[10px] font-600 text-[var(--muted-foreground)] uppercase tracking-widest">Admin</span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        {ADMIN_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={item.label === "Members" ? onAdminMembers : item.label === "Payments" ? onAdminPayments : item.label === "Event Manage" ? onAdminEvents : undefined}
            className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] text-sm font-500 w-full text-[var(--muted-foreground)] hover:bg-amber-50 hover:text-amber-700 transition-all duration-150"
          >
            <Icon d={item.icon} size={17} />
            {item.label}
          </button>
        ))}
      </div>

      {/* Bottom */}
      <div className="p-3 border-t border-[var(--border)] flex flex-col gap-1">
        <button onClick={onLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] text-sm font-500 text-red-500 hover:bg-red-50 transition-colors w-full">
          <Icon d={icons.logout} size={17} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// ─── AppShell (dashboard without login gate, used by FramePreview) ────────────

export function AppShell({ initialTab = "dashboard", onLogout }: { initialTab?: NavTab; onLogout?: () => void }) {
  const [tab, setTab] = useState<NavTab>(initialTab);
  const [events, setEvents] = useState<Event[]>(EVENTS);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);
  const [cardOpen, setCardOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [adminView, setAdminView] = useState<"members" | "payments" | "events" | null>(null);

  const unpaidCount = payments.filter((p) => !p.paid).length;

  function toggleRegistration(id: number) {
    setEvents((prev) =>
      prev.map((e) => e.id === id ? { ...e, isRegistered: !e.isRegistered, registered: e.isRegistered ? e.registered - 1 : e.registered + 1 } : e)
    );
  }

  function handlePay(id: number) {
    setPayments((prev) => prev.map((p) => p.id === id ? { ...p, paid: true } : p));
  }

  const tabLabel: Record<NavTab, string> = {
    dashboard: "Dashboard",
    events: "Events",
    payments: "Payments",
    profile: "Profile",
  };

  const logout = onLogout ?? (() => {});

  function renderView() {
    switch (tab) {
      case "dashboard":
        return <DashboardView events={events} onToggle={toggleRegistration} onOpenCard={() => setCardOpen(true)} />;
      case "events":
        return <EventsView events={events} onToggle={toggleRegistration} />;
      case "payments":
        return <PaymentsView payments={payments} onPay={handlePay} />;
      case "profile":
        return <ProfileView onEditProfile={() => setEditProfileOpen(true)} onLogout={logout} onAdminMembers={() => setAdminView("members")} onAdminPayments={() => setAdminView("payments")} onAdminEvents={() => setAdminView("events")} />;
    }
  }

  return (
    <div className="h-full flex bg-[var(--background)]" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <Sidebar active={tab} onChange={setTab} unpaidCount={unpaidCount} onLogout={logout} onAdminMembers={() => setAdminView("members")} onAdminPayments={() => setAdminView("payments")} onAdminEvents={() => setAdminView("events")} />

      <main className="flex-1 overflow-y-auto">
        <div className="hidden lg:flex items-center justify-between px-8 py-5 border-b border-[var(--border)] bg-[var(--card)] sticky top-0 z-10">
          <h1 className="text-base font-600 text-[var(--foreground)]">{tabLabel[tab]}</h1>
          <div className="flex items-center gap-3">
            <button className="relative h-9 w-9 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">
              <Icon d={icons.bell} size={18} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-[var(--card)]" />
            </button>
            <Avatar fallback="SC" size="md" />
          </div>
        </div>

        <div className="px-4 py-5 lg:px-8 lg:py-7 pb-24 lg:pb-8 max-w-2xl lg:max-w-none">
          {renderView()}
        </div>
      </main>

      <BottomNav active={tab} onChange={setTab} unpaidCount={unpaidCount} />

      {cardOpen && <MemberCardOverlay onClose={() => setCardOpen(false)} />}
      {editProfileOpen && <EditProfileOverlay onClose={() => setEditProfileOpen(false)} />}

      {/* Admin overlays */}
      {adminView === "members" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--background)", display: "flex", flexDirection: "column" }}>
          <AdminMembersView onBack={() => setAdminView(null)} />
        </div>
      )}
      {adminView === "payments" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--background)", display: "flex", flexDirection: "column" }}>
          <AdminPaymentsView onBack={() => setAdminView(null)} />
        </div>
      )}
      {adminView === "events" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--background)", display: "flex", flexDirection: "column" }}>
          <AdminEventManageView onBack={() => setAdminView(null)} />
        </div>
      )}
    </div>
  );
}

// ─── App (with login gate) ────────────────────────────────────────────────────

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  if (!isLoggedIn) {
    return <LoginView onLogin={() => setIsLoggedIn(true)} />;
  }

  return <AppShell onLogout={() => setIsLoggedIn(false)} />;
}
