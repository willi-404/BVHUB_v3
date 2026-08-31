import { useState } from "react";
import { Member, groupConfig, initials } from "./MemberTypes";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

function Icon({ d, size = 18, className = "" }: { d: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

const ic = {
  x:         "M18 6 6 18M6 6l12 12",
  shield:    "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  user:      "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  mail:      "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  phone:     "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  mapPin:    "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  calendar:  "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  clock:     "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2",
  instagram: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z",
  copy:      "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M8 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2M8 4h8",
  checkCircle: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button
      onClick={handleCopy}
      title="E-Mail kopieren"
      className="shrink-0 h-6 w-6 flex items-center justify-center rounded-md hover:bg-[var(--muted)] transition-colors"
      style={{ color: copied ? "#15803d" : "var(--muted-foreground)" }}
    >
      <Icon d={copied ? ic.checkCircle : ic.copy} size={13} />
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-700 text-[var(--muted-foreground)] uppercase tracking-widest mb-2">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Row({ icon, label, value, mono = false, action }: { icon: string; label: string; value: string; mono?: boolean; action?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-[var(--muted-foreground)] mt-0.5 shrink-0"><Icon d={icon} size={13} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-[var(--muted-foreground)]">{label}</p>
        <div className="flex items-center gap-1.5">
          <p className={`text-xs font-500 text-[var(--foreground)] break-all flex-1 ${mono ? "font-mono" : ""}`}>{value}</p>
          {action}
        </div>
      </div>
    </div>
  );
}

export function MemberDetailPopup({ member, onClose }: { member: Member; onClose: () => void }) {
  const cfg = groupConfig[member.gruppe];
  return (
    <>
      <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[111] bg-[var(--card)] rounded-2xl shadow-2xl overflow-hidden max-w-md mx-auto max-h-[90vh] flex flex-col">
        {/* Header band */}
        <div className="relative h-20 shrink-0" style={{ background: `linear-gradient(135deg, ${cfg.color}dd, ${cfg.color}88)` }}>
          <button onClick={onClose} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
            <Icon d={ic.x} size={15} />
          </button>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center -mt-9 px-5 shrink-0">
          <div
            className="h-18 w-18 rounded-full border-4 border-[var(--card)] flex items-center justify-center text-white text-xl font-700 shadow-lg"
            style={{ background: member.avatarColor, height: 72, width: 72 }}
          >
            {initials(member)}
          </div>
          <div className="mt-2 text-center">
            <p className="font-700 text-base">{member.vorname} {member.nachname}</p>
            <p className="text-xs text-[var(--muted-foreground)]">@{member.username}</p>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-600 mt-1.5"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              {cfg.label}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <div className="flex flex-col gap-4">
            <Section title="Identität">
              <Row icon={ic.shield}   label="Member ID"   value={member.id} mono />
              <Row icon={ic.user}     label="Username"    value={`@${member.username}`} />
              <Row icon={ic.calendar} label="Member seit" value={member.memberSince} />
              <Row icon={ic.calendar} label="Geburtstag"  value={member.geburtstag} />
            </Section>
            <Separator />
            <Section title="Kontakt">
              <Row icon={ic.mail}   label="E-Mail"   value={member.email} action={<CopyButton text={member.email} />} />
              <Row icon={ic.phone}  label="Telefon"  value={member.phone} />
              <Row icon={ic.mapPin} label="Adresse"  value={member.adresse} />
              {member.instagram && <Row icon={ic.instagram} label="Instagram" value={member.instagram} />}
            </Section>
            <Separator />
            <Section title="Account">
              <Row icon={ic.clock} label="Erstellt am"       value={member.accountCreated} />
              <Row icon={ic.clock} label="Zuletzt geändert"  value={member.accountUpdated} />
            </Section>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] shrink-0">
          <Button variant="outline" className="w-full" onClick={onClose}>Schließen</Button>
        </div>
      </div>
    </>
  );
}
