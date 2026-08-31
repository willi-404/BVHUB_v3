import { useState } from "react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

function Icon({ d, size = 18, className = "" }: { d: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

const ic = {
  chevronLeft: "M15 18l-6-6 6-6",
  check:       "M20 6 9 17l-5-5",
  plus:        "M12 5v14M5 12h14",
  calendar:    "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  clock:       "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2",
  mapPin:      "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  tag:         "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01",
  trash:       "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  alertCircle: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v4M12 16h.01",
  save:        "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
};

const LOCATIONS = [
  "Sporthalle Erlangen-Bruck",
  "Sporthalle Erlangen-Büchenbach",
  "Sporthalle Erlangen-Innenstadt",
  "Sporthalle Nürnberg-Nord",
  "Sporthalle Nürnberg-Süd",
  "Sporthalle Fürth",
];

type Status = "upcoming" | "completed" | "cancelled";

interface EventForm {
  titel: string;
  ort: string;
  status: Status;
  date: string;
  start: string;
  end: string;
  memberPriorityBis: string;
  anmeldeschluss: string;
  abmeldeschluss: string;
}

const EMPTY_FORM: EventForm = {
  titel: "",
  ort: "",
  status: "upcoming",
  date: "",
  start: "",
  end: "",
  memberPriorityBis: "",
  anmeldeschluss: "",
  abmeldeschluss: "",
};

const STATUS_OPTIONS: { value: Status; label: string; color: string; bg: string }[] = [
  { value: "upcoming",  label: "Upcoming",   color: "#1d4ed8", bg: "#dbeafe" },
  { value: "completed", label: "Completed",  color: "#15803d", bg: "#dcfce7" },
  { value: "cancelled", label: "Cancelled",  color: "#dc2626", bg: "#fee2e2" },
];

// ─── Field components ─────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-600 text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">{children}</label>;
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 px-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
    />
  );
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 px-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all appearance-none"
    >
      <option value="" disabled>Bitte wählen…</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 px-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
    />
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 px-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
    />
  );
}

function DateTimeRow({ dateVal, timeVal, onDate, onTime }: { dateVal: string; timeVal: string; onDate: (v: string) => void; onTime: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <DateInput value={dateVal} onChange={onDate} />
      <TimeInput value={timeVal} onChange={onTime} />
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--border)] bg-[var(--muted)]/40">
        <Icon d={icon} size={14} className="text-[var(--primary)]" />
        <p className="text-xs font-700 text-[var(--foreground)] uppercase tracking-wide">{title}</p>
      </div>
      <div className="px-4 py-4 flex flex-col gap-4">{children}</div>
    </div>
  );
}

// ─── Status pill selector ─────────────────────────────────────────────────────

function StatusSelector({ value, onChange }: { value: Status; onChange: (v: Status) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {STATUS_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600 border transition-all duration-150 active:scale-95"
            style={
              active
                ? { background: opt.bg, borderColor: opt.color, color: opt.color }
                : { background: "var(--card)", borderColor: "var(--border)", color: "var(--muted-foreground)" }
            }
          >
            {active && <Icon d={ic.check} size={11} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function AdminEventManageView({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EventForm, boolean>>>({});

  function set<K extends keyof EventForm>(key: K, val: EventForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: false }));
    setSaved(false);
  }

  function handleSave() {
    const required: (keyof EventForm)[] = ["titel", "ort", "date", "start", "end"];
    const newErrors: Partial<Record<keyof EventForm, boolean>> = {};
    required.forEach((k) => { if (!form[k]) newErrors[k] = true; });
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setErrors({});
    setSaved(false);
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      {/* Sticky header */}
      <div style={{ flexShrink: 0, background: "var(--card)", borderBottom: "1px solid var(--border)", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={onBack}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
        >
          <Icon d={ic.chevronLeft} size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-700 text-base text-[var(--foreground)]">Event erstellen</h1>
          <p className="text-[10px] text-[var(--muted-foreground)]">Neue Veranstaltung anlegen</p>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-red-500 font-600">
            <Icon d={ic.alertCircle} size={14} />
            {errorCount} Pflichtfeld{errorCount !== 1 ? "er" : ""} fehlen
          </div>
        )}
      </div>

      {/* Scrollable form */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Basic info */}
        <SectionCard title="Grundinformationen" icon={ic.tag}>
          <div>
            <FieldLabel>Titel *</FieldLabel>
            <div className={errors.titel ? "ring-2 ring-red-400 rounded-[var(--radius)]" : ""}>
              <TextInput value={form.titel} onChange={(v) => set("titel", v)} placeholder="z. B. Tuesday Evening Training" />
            </div>
          </div>

          <div>
            <FieldLabel>Ort *</FieldLabel>
            <div className={errors.ort ? "ring-2 ring-red-400 rounded-[var(--radius)]" : ""}>
              <SelectInput
                value={form.ort}
                onChange={(v) => set("ort", v)}
                options={LOCATIONS.map((l) => ({ value: l, label: l }))}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Status</FieldLabel>
            <StatusSelector value={form.status} onChange={(v) => set("status", v)} />
          </div>
        </SectionCard>

        {/* Date & Time */}
        <SectionCard title="Datum & Uhrzeit" icon={ic.calendar}>
          <div>
            <FieldLabel>Datum *</FieldLabel>
            <div className={errors.date ? "ring-2 ring-red-400 rounded-[var(--radius)]" : ""}>
              <DateInput value={form.date} onChange={(v) => set("date", v)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Start *</FieldLabel>
              <div className={errors.start ? "ring-2 ring-red-400 rounded-[var(--radius)]" : ""}>
                <TimeInput value={form.start} onChange={(v) => set("start", v)} />
              </div>
            </div>
            <div>
              <FieldLabel>End *</FieldLabel>
              <div className={errors.end ? "ring-2 ring-red-400 rounded-[var(--radius)]" : ""}>
                <TimeInput value={form.end} onChange={(v) => set("end", v)} />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Fristen */}
        <SectionCard title="Fristen" icon={ic.clock}>
          <div>
            <FieldLabel>Member Priority bis</FieldLabel>
            <DateTimeRow
              dateVal={form.memberPriorityBis.split("T")[0] ?? ""}
              timeVal={form.memberPriorityBis.split("T")[1] ?? ""}
              onDate={(v) => set("memberPriorityBis", v + (form.memberPriorityBis.split("T")[1] ? "T" + form.memberPriorityBis.split("T")[1] : ""))}
              onTime={(v) => set("memberPriorityBis", (form.memberPriorityBis.split("T")[0] ?? "") + "T" + v)}
            />
          </div>

          <Separator />

          <div>
            <FieldLabel>Anmeldeschluss</FieldLabel>
            <DateTimeRow
              dateVal={form.anmeldeschluss.split("T")[0] ?? ""}
              timeVal={form.anmeldeschluss.split("T")[1] ?? ""}
              onDate={(v) => set("anmeldeschluss", v + (form.anmeldeschluss.split("T")[1] ? "T" + form.anmeldeschluss.split("T")[1] : ""))}
              onTime={(v) => set("anmeldeschluss", (form.anmeldeschluss.split("T")[0] ?? "") + "T" + v)}
            />
          </div>

          <Separator />

          <div>
            <FieldLabel>Abmeldeschluss</FieldLabel>
            <DateTimeRow
              dateVal={form.abmeldeschluss.split("T")[0] ?? ""}
              timeVal={form.abmeldeschluss.split("T")[1] ?? ""}
              onDate={(v) => set("abmeldeschluss", v + (form.abmeldeschluss.split("T")[1] ? "T" + form.abmeldeschluss.split("T")[1] : ""))}
              onTime={(v) => set("abmeldeschluss", (form.abmeldeschluss.split("T")[0] ?? "") + "T" + v)}
            />
          </div>
        </SectionCard>

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleReset}>
            <Icon d={ic.trash} size={14} />
            Zurücksetzen
          </Button>
          <Button className="flex-1 gap-2" variant={saved ? "secondary" : "default"} onClick={handleSave}>
            {saved ? <><Icon d={ic.check} size={14} />Gespeichert</> : <><Icon d={ic.save} size={14} />Speichern</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
