import { useState } from "react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { MEMBERS, Member, initials, groupConfig } from "./shared/MemberTypes";
import { MemberDetailPopup } from "./shared/MemberDetailPopup";

function Icon({ d, size = 18, className = "" }: { d: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

const ic = {
  chevronLeft:  "M15 18l-6-6 6-6",
  chevronDown:  "M6 9l6 6 6-6",
  chevronUp:    "M18 15l-6-6-6 6",
  check:        "M20 6 9 17l-5-5",
  calendar:     "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  clock:        "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2",
  save:         "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
  euro:         "M4 10h12M4 14h12M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 20.1 7.7 7.7 0 0 0 13.8 22c2 0 3.9-.8 5.2-2",
  users:        "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
};

// ─── Data ─────────────────────────────────────────────────────────────────────

interface EventParticipant {
  memberId: string;
  paid: boolean;
}

interface AdminEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  price: number;
  participants: EventParticipant[];
}

const ADMIN_EVENTS: AdminEvent[] = [
  {
    id: 1,
    title: "Tuesday Evening Training",
    date: "Sep 2, 2026",
    time: "7:00 PM – 9:00 PM",
    price: 5,
    participants: [
      { memberId: "BWC-ER-0312",  paid: false },
      { memberId: "BWC-ER-0198",  paid: true  },
      { memberId: "BWC-NUE-0087", paid: false },
      { memberId: "BWC-ER-0407",  paid: true  },
      { memberId: "BWC-NUE-0134", paid: true  },
    ],
  },
  {
    id: 2,
    title: "Club Singles Championship",
    date: "Sep 6, 2026",
    time: "9:00 AM – 6:00 PM",
    price: 15,
    participants: [
      { memberId: "BWC-ER-0312",  paid: false },
      { memberId: "BWC-GS-0541",  paid: false },
      { memberId: "BWC-NUE-0087", paid: true  },
      { memberId: "BWC-GS-0312",  paid: false },
      { memberId: "BWC-ER-0198",  paid: true  },
      { memberId: "BWC-ER-0407",  paid: false },
    ],
  },
  {
    id: 3,
    title: "End-of-Season Social Night",
    date: "Sep 14, 2026",
    time: "6:30 PM – 10:00 PM",
    price: 10,
    participants: [
      { memberId: "BWC-ER-0312",  paid: true  },
      { memberId: "BWC-ER-0198",  paid: true  },
      { memberId: "BWC-NUE-0134", paid: true  },
      { memberId: "BWC-ADM-001",  paid: true  },
    ],
  },
];

function getMember(id: string): Member | undefined {
  return MEMBERS.find((m) => m.id === id);
}

// ─── Payment toggle pill ──────────────────────────────────────────────────────

function PaidToggle({ paid, onChange }: { paid: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!paid)}
      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600 transition-all duration-150 active:scale-95 border"
      style={
        paid
          ? { background: "#dcfce7", borderColor: "#15803d", color: "#15803d" }
          : { background: "#fee2e2", borderColor: "#dc2626", color: "#dc2626" }
      }
    >
      <Icon d={paid ? ic.check : "M18 6 6 18M6 6l12 12"} size={11} />
      {paid ? "Bezahlt" : "Offen"}
    </button>
  );
}

// ─── Event payment card ───────────────────────────────────────────────────────

function EventPaymentCard({
  event,
  onShowMember,
}: {
  event: AdminEvent;
  onShowMember: (m: Member) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [participants, setParticipants] = useState<EventParticipant[]>(event.participants);
  const [saved, setSaved] = useState(false);

  const unpaidCount = participants.filter((p) => !p.paid).length;
  const allPaid = unpaidCount === 0;

  function togglePaid(memberId: string) {
    setSaved(false);
    setParticipants((prev) =>
      prev.map((p) => p.memberId === memberId ? { ...p, paid: !p.paid } : p)
    );
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] overflow-hidden">
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-700 text-sm text-[var(--foreground)] leading-snug">{event.title}</h3>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
                <Icon d={ic.calendar} size={11} /> {event.date}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
                <Icon d={ic.clock} size={11} /> {event.time}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-600 text-[var(--foreground)]">
                <Icon d={ic.euro} size={11} /> {event.price.toFixed(2)} / Person
              </span>
            </div>
          </div>
        </div>

        {/* Payment summary */}
        <div
          className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg"
          style={{ background: allPaid ? "#dcfce7" : "#fef3c7" }}
        >
          <div className="flex items-center gap-2">
            <Icon d={ic.users} size={13} className={allPaid ? "text-emerald-600" : "text-amber-600"} />
            <span className="text-xs font-600" style={{ color: allPaid ? "#15803d" : "#b45309" }}>
              {allPaid
                ? `Alle ${participants.length} Teilnehmer haben bezahlt`
                : `${unpaidCount} von ${participants.length} Personen noch offen`}
            </span>
          </div>
          <span className="text-xs font-700" style={{ color: allPaid ? "#15803d" : "#b45309" }}>
            €{((participants.length - unpaidCount) * event.price).toFixed(0)} / €{(participants.length * event.price).toFixed(0)}
          </span>
        </div>

        {/* Show details toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1.5 text-xs font-600 text-[var(--primary)] hover:underline"
        >
          <Icon d={expanded ? ic.chevronUp : ic.chevronDown} size={13} />
          {expanded ? "Details ausblenden" : "Details anzeigen"}
        </button>
      </div>

      {/* Expanded participant list */}
      {expanded && (
        <>
          <Separator />
          <div style={{ overflowY: "auto", maxHeight: 320 }}>
            {participants.map((p, i) => {
              const member = getMember(p.memberId);
              if (!member) return null;
              const cfg = groupConfig[member.gruppe];
              return (
                <div key={p.memberId}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Avatar — clickable */}
                    <button
                      onClick={() => onShowMember(member)}
                      className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-700 hover:opacity-80 active:scale-95 transition-all"
                      style={{ background: member.avatarColor }}
                    >
                      {initials(member)}
                    </button>

                    {/* Name — clickable */}
                    <button
                      onClick={() => onShowMember(member)}
                      className="flex-1 text-left min-w-0 hover:opacity-70 transition-opacity"
                    >
                      <p className="text-sm font-700 text-[var(--foreground)] truncate">@{member.username}</p>
                      <p className="text-xs text-[var(--muted-foreground)] truncate">{member.vorname} {member.nachname}</p>
                      <span
                        className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-700 mt-0.5"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </button>

                    {/* Toggle */}
                    <PaidToggle paid={p.paid} onChange={(v) => togglePaid(p.memberId)} />
                  </div>
                  {i < participants.length - 1 && <Separator />}
                </div>
              );
            })}
          </div>

          {/* Save button */}
          <div className="px-4 pb-4 pt-3 border-t border-[var(--border)]">
            <Button
              className="w-full gap-2"
              variant={saved ? "secondary" : "default"}
              onClick={handleSave}
            >
              {saved ? (
                <>
                  <Icon d={ic.check} size={15} />
                  Gespeichert
                </>
              ) : (
                <>
                  <Icon d={ic.save} size={15} />
                  Speichern
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function AdminPaymentsView({ onBack }: { onBack: () => void }) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      {/* Sticky header — never scrolls */}
      <div style={{ flexShrink: 0, background: "var(--card)", borderBottom: "1px solid var(--border)", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={onBack}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
        >
          <Icon d={ic.chevronLeft} size={18} />
        </button>
        <div>
          <h1 className="font-700 text-base text-[var(--foreground)]">Payments</h1>
          <p className="text-[10px] text-[var(--muted-foreground)]">{ADMIN_EVENTS.length} Veranstaltungen</p>
        </div>
      </div>

      {/* Scrollable event cards */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {ADMIN_EVENTS.map((event) => (
          <EventPaymentCard key={event.id} event={event} onShowMember={setSelectedMember} />
        ))}
        {/* bottom breathing room for mobile nav bar */}
        <div style={{ height: 32, flexShrink: 0 }} />
      </div>

      {selectedMember && (
        <MemberDetailPopup member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </div>
  );
}
