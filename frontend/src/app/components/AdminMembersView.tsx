import { useState, useMemo } from "react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { MEMBERS, Member, Group, groupConfig, initials } from "./shared/MemberTypes";
import { MemberDetailPopup } from "./shared/MemberDetailPopup";

function Icon({ d, size = 18, className = "" }: { d: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

const ic = {
  search:      "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  filter:      "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  x:           "M18 6 6 18M6 6l12 12",
  chevronLeft: "M15 18l-6-6 6-6",
  chevronRight:"M9 18l6-6-6-6",
  check:       "M20 6 9 17l-5-5",
  user:        "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
};

const ALL_GROUPS: Group[] = ["MemberER", "MemberNUE", "guest", "Admin"];

// ─── Filter Sheet ─────────────────────────────────────────────────────────────

function FilterSheet({ selected, onApply, onClose }: { selected: Group[]; onApply: (g: Group[]) => void; onClose: () => void }) {
  const [local, setLocal] = useState<Group[]>(selected);
  function toggle(g: Group) {
    setLocal((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  }
  return (
    <>
      <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[111] bg-[var(--card)] rounded-t-2xl border-t border-[var(--border)] pb-8 max-w-2xl mx-auto" style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-[var(--border)]" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <p className="font-700 text-sm">Filter nach Gruppe</p>
          <button onClick={() => setLocal([])} className="text-xs text-[var(--primary)] font-500">Alle entfernen</button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-2">
          {ALL_GROUPS.map((g) => {
            const cfg = groupConfig[g];
            const on = local.includes(g);
            return (
              <button key={g} onClick={() => toggle(g)}
                className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius)] border transition-all duration-150 w-full text-left"
                style={{ background: on ? cfg.bg : "var(--card)", borderColor: on ? cfg.color : "var(--border)" }}>
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-700" style={{ background: cfg.bg, color: cfg.color }}>{g[0]}</div>
                <span className="flex-1 text-sm font-500" style={{ color: on ? cfg.color : "var(--foreground)" }}>{cfg.label}</span>
                {on && <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ background: cfg.color }}><Icon d={ic.check} size={11} className="text-white" /></div>}
              </button>
            );
          })}
        </div>
        <div className="px-5">
          <Button className="w-full" onClick={() => { onApply(local); onClose(); }}>
            Anwenden ({local.length === 0 ? "Alle" : `${local.length} Gruppe${local.length !== 1 ? "n" : ""}`})
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function AdminMembersView({ onBack }: { onBack: () => void }) {
  const [search, setSearch] = useState("");
  const [filterGroups, setFilterGroups] = useState<Group[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Member | null>(null);

  const filtered = useMemo(() => MEMBERS.filter((m) => {
    const matchGroup = filterGroups.length === 0 || filterGroups.includes(m.gruppe);
    const q = search.toLowerCase();
    return matchGroup && (!q || [m.vorname, m.nachname, m.username, m.id, m.email].some((s) => s.toLowerCase().includes(q)));
  }), [search, filterGroups]);

  const hasFilter = filterGroups.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      {/* Sticky header */}
      <div style={{ flexShrink: 0 }} className="bg-[var(--card)] border-b border-[var(--border)]">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button onClick={onBack} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors shrink-0">
            <Icon d={ic.chevronLeft} size={18} />
          </button>
          <div className="flex-1">
            <h1 className="font-700 text-base text-[var(--foreground)]">Members</h1>
            <p className="text-[10px] text-[var(--muted-foreground)]">{filtered.length} von {MEMBERS.length} Mitglieder</p>
          </div>
          <button onClick={() => setFilterOpen(true)}
            className={`relative h-9 w-9 rounded-full flex items-center justify-center transition-colors ${hasFilter ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
            <Icon d={ic.filter} size={16} />
            {hasFilter && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-500 text-white text-[9px] font-700 flex items-center justify-center border-2 border-[var(--card)]">
                {filterGroups.length}
              </span>
            )}
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"><Icon d={ic.search} size={15} /></span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, ID, E-Mail suchen…"
              className="w-full h-10 pl-9 pr-9 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><Icon d={ic.x} size={14} /></button>}
          </div>
          {hasFilter && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {filterGroups.map((g) => {
                const cfg = groupConfig[g];
                return (
                  <button key={g} onClick={() => setFilterGroups((prev) => prev.filter((x) => x !== g))}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-600" style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.label}<Icon d={ic.x} size={9} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto" }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-[var(--muted-foreground)]">
            <Icon d={ic.user} size={32} />
            <p className="text-sm mt-3 font-500">Keine Mitglieder gefunden</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                    {["Avatar", "Member ID", "Username", "Vorname", "Nachname", "E-Mail", "Gruppe", "Member seit"].map((h) => (
                      <th key={h} className="text-left text-[10px] font-700 text-[var(--muted-foreground)] uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => {
                    const cfg = groupConfig[m.gruppe];
                    return (
                      <tr key={m.id} className={`border-b border-[var(--border)] hover:bg-[var(--muted)]/40 transition-colors ${i % 2 === 0 ? "" : "bg-[var(--background)]"}`}>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelected(m)} className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-700 hover:scale-110 transition-transform" style={{ background: m.avatarColor }}>
                            {initials(m)}
                          </button>
                        </td>
                        <td className="px-4 py-3"><button onClick={() => setSelected(m)} className="font-mono text-xs text-[var(--primary)] hover:underline font-600">{m.id}</button></td>
                        <td className="px-4 py-3"><button onClick={() => setSelected(m)} className="text-sm font-500 hover:text-[var(--primary)] hover:underline transition-colors">@{m.username}</button></td>
                        <td className="px-4 py-3 text-sm">{m.vorname}</td>
                        <td className="px-4 py-3 text-sm">{m.nachname}</td>
                        <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{m.email}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-600" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{m.memberSince}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="lg:hidden flex flex-col divide-y divide-[var(--border)]">
              {filtered.map((m) => {
                const cfg = groupConfig[m.gruppe];
                return (
                  <button key={m.id} onClick={() => setSelected(m)}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--muted)]/40 transition-colors text-left w-full active:bg-[var(--muted)]">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-700 shrink-0" style={{ background: m.avatarColor }}>
                      {initials(m)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-600 truncate">{m.vorname} {m.nachname}</p>
                        <span className="shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-700" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <p className="text-[11px] text-[var(--muted-foreground)] truncate">@{m.username} · {m.id}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)] truncate">{m.email}</p>
                    </div>
                    <Icon d={ic.chevronRight} size={12} className="text-[var(--muted-foreground)] shrink-0" />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {filterOpen && <FilterSheet selected={filterGroups} onApply={setFilterGroups} onClose={() => setFilterOpen(false)} />}
      {selected && <MemberDetailPopup member={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
