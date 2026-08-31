import { useState } from "react";
import LoginView from "./LoginView";
import { AppShell } from "../App";

const FRAMES = [
  { id: "login", label: "Login" },
  { id: "dashboard", label: "Dashboard" },
  { id: "events", label: "Events" },
  { id: "payments", label: "Payments" },
  { id: "profile", label: "Profile" },
  { id: "card", label: "Member Card" },
];

export default function FramePreview() {
  const [selected, setSelected] = useState<string[]>(["login", "dashboard"]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a1a2e",
        fontFamily: "'Outfit', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          background: "#0f0f1a",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "13px", fontWeight: 600, marginRight: 4 }}>
          Frame Preview
        </span>
        {FRAMES.map((f) => {
          const active = selected.includes(f.id);
          return (
            <button
              key={f.id}
              onClick={() => toggle(f.id)}
              style={{
                padding: "4px 12px",
                borderRadius: "999px",
                border: `1px solid ${active ? "#15803d" : "rgba(255,255,255,0.15)"}`,
                background: active ? "#15803d" : "transparent",
                color: active ? "#fff" : "rgba(255,255,255,0.5)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {f.label}
            </button>
          );
        })}
        <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.25)", fontSize: "11px" }}>
          390 × 844 px · iPhone 14
        </span>
      </div>

      {/* Frames */}
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: "32px",
          padding: "40px 40px 60px",
          overflowX: "auto",
          alignItems: "flex-start",
        }}
      >
        {selected.map((id) => (
          <div key={id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", flexShrink: 0 }}>
            {/* Frame label */}
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", fontWeight: 500, letterSpacing: "0.04em" }}>
              {FRAMES.find((f) => f.id === id)?.label}
            </span>
            {/* Device shell */}
            <div
              style={{
                width: 390,
                height: 844,
                borderRadius: 44,
                border: "2px solid rgba(255,255,255,0.12)",
                background: "#000",
                overflow: "hidden",
                boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
                position: "relative",
                flexShrink: 0,
              }}
            >
              {/* Status bar notch */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 44, background: "rgba(0,0,0,0.35)", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ width: 120, height: 34, borderRadius: "0 0 20px 20px", background: "#000", marginTop: -10 }} />
              </div>
              <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                <FrameContent id={id} />
              </div>
            </div>
            {/* Frame size label */}
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "11px" }}>390 × 844</span>
          </div>
        ))}

        {selected.length === 0 && (
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "14px", margin: "auto" }}>
            Select frames above to preview them
          </div>
        )}
      </div>
    </div>
  );
}

function FrameContent({ id }: { id: string }) {
  if (id === "login") {
    return (
      <div style={{ width: "100%", height: "100%" }}>
        <LoginView onLogin={() => {}} />
      </div>
    );
  }
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <AppShell initialTab={id as "dashboard" | "events" | "payments" | "profile"} />
    </div>
  );
}
