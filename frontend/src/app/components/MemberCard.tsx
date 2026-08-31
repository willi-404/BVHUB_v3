import logoSrc from "../imports/logo1-high-resolution.png";

interface MemberCardProps {
  name: string;
  memberId: string;
  activeSince: string;
  group: "MemberER" | "MemberNUE" | "guest";
}

type GroupConfig = {
  label: string;
  gradient: string;
  shimmer: string;
  chipBg: string;
  chipText: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  shine: string;
  dot: string;
};

const GROUP: Record<MemberCardProps["group"], GroupConfig> = {
  MemberER: {
    label: "MemberER",
    gradient: "linear-gradient(135deg, #14532d 0%, #15803d 55%, #22c55e 100%)",
    shimmer: "rgba(255,255,255,0.07)",
    chipBg: "rgba(255,255,255,0.18)",
    chipText: "#d1fae5",
    textPrimary: "#ffffff",
    textSecondary: "rgba(255,255,255,0.65)",
    borderColor: "rgba(134,239,172,0.25)",
    shine: "rgba(187,247,208,0.12)",
    dot: "#4ade80",
  },
  MemberNUE: {
    label: "MemberNUE",
    gradient: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #60a5fa 100%)",
    shimmer: "rgba(255,255,255,0.07)",
    chipBg: "rgba(255,255,255,0.18)",
    chipText: "#dbeafe",
    textPrimary: "#ffffff",
    textSecondary: "rgba(255,255,255,0.65)",
    borderColor: "rgba(147,197,253,0.25)",
    shine: "rgba(191,219,254,0.12)",
    dot: "#60a5fa",
  },
  guest: {
    label: "Guest",
    gradient: "linear-gradient(135deg, #78350f 0%, #b45309 55%, #d97706 100%)",
    shimmer: "rgba(255,255,255,0.07)",
    chipBg: "rgba(255,255,255,0.18)",
    chipText: "#fef3c7",
    textPrimary: "#ffffff",
    textSecondary: "rgba(255,255,255,0.65)",
    borderColor: "rgba(253,230,138,0.25)",
    shine: "rgba(253,230,138,0.10)",
    dot: "#fbbf24",
  },
};

function ShuttlecockSVG({ opacity = 0.12 }: { opacity?: number }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      style={{ opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="40" cy="60" r="10" stroke="white" strokeWidth="2" fill="none" />
      <line x1="40" y1="50" x2="20" y2="10" stroke="white" strokeWidth="1.5" />
      <line x1="40" y1="50" x2="30" y2="8" stroke="white" strokeWidth="1.5" />
      <line x1="40" y1="50" x2="40" y2="8" stroke="white" strokeWidth="1.5" />
      <line x1="40" y1="50" x2="50" y2="8" stroke="white" strokeWidth="1.5" />
      <line x1="40" y1="50" x2="60" y2="10" stroke="white" strokeWidth="1.5" />
      <path d="M18 16 Q30 6 40 8 Q50 6 62 16" stroke="white" strokeWidth="1.5" fill="none" />
      <path d="M22 28 Q31 20 40 22 Q49 20 58 28" stroke="white" strokeWidth="1.5" fill="none" />
      <path d="M24 40 Q32 34 40 36 Q48 34 56 40" stroke="white" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function MemberCard({ name, memberId, activeSince, group }: MemberCardProps) {
  const cfg = GROUP[group];

  return (
    <div
      className="relative overflow-hidden select-none"
      style={{
        background: cfg.gradient,
        borderRadius: "16px",
        border: `1px solid ${cfg.borderColor}`,
        width: "100%",
        maxWidth: "360px",
        aspectRatio: "1.586 / 1",
        padding: "20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Decorative orbs */}
      <div
        style={{
          position: "absolute",
          top: "-40px",
          right: "-40px",
          width: "140px",
          height: "140px",
          borderRadius: "50%",
          background: cfg.shine,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-50px",
          left: "-30px",
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          background: cfg.shimmer,
          pointerEvents: "none",
        }}
      />

      {/* Shuttlecock watermark */}
      <div
        style={{
          position: "absolute",
          bottom: "-4px",
          right: "8px",
          width: "88px",
          height: "88px",
          pointerEvents: "none",
        }}
      >
        <ShuttlecockSVG opacity={0.14} />
      </div>

      {/* Top row: club name + group chip */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img
            src={logoSrc}
            alt="BV Erlangen Logo"
            style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "6px", background: "rgba(255,255,255,0.12)", padding: "2px" }}
          />
          <div>
            <p style={{ fontSize: "10px", fontWeight: 600, color: cfg.textSecondary, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
              BV Erlangen
            </p>
            <p style={{ fontSize: "11px", fontWeight: 700, color: cfg.textPrimary, margin: "1px 0 0", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
              Badminton Verein Erlangen n.e.V.
            </p>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: cfg.chipBg,
            border: `1px solid ${cfg.borderColor}`,
            borderRadius: "999px",
            padding: "3px 10px 3px 6px",
            backdropFilter: "blur(8px)",
          }}
        >
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: cfg.dot, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: "11px", fontWeight: 600, color: cfg.chipText }}>{cfg.label}</span>
        </div>
      </div>

      {/* Bottom rows: member info */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Name */}
        <div>
          <p style={{ fontSize: "10px", fontWeight: 500, color: cfg.textSecondary, letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>
            Member Name
          </p>
          <p style={{ fontSize: "16px", fontWeight: 700, color: cfg.textPrimary, margin: "2px 0 0", letterSpacing: "-0.01em" }}>
            {name}
          </p>
        </div>

        {/* Member ID + Active Since */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 500, color: cfg.textSecondary, letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>
              Member ID
            </p>
            <p style={{ fontSize: "13px", fontWeight: 600, color: cfg.textPrimary, margin: "2px 0 0", letterSpacing: "0.06em", fontFamily: "monospace" }}>
              {memberId}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "10px", fontWeight: 500, color: cfg.textSecondary, letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>
              Active Since
            </p>
            <p style={{ fontSize: "13px", fontWeight: 600, color: cfg.textPrimary, margin: "2px 0 0" }}>
              {activeSince}
            </p>
          </div>
        </div>

        {/* Thin separator line */}
        <div style={{ height: "1px", background: cfg.borderColor }} />

        {/* Membership label */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: "10px", fontWeight: 500, color: cfg.textSecondary, margin: 0, letterSpacing: "0.04em" }}>
            Membership · {cfg.label}
          </p>
          <div style={{ display: "flex", gap: "3px" }}>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                style={{ width: "20px", height: "12px", borderRadius: "3px", background: i < 2 ? cfg.chipBg : "transparent", border: `1px solid ${cfg.borderColor}` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
