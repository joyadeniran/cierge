"use client";
import { Logo } from "./Logo";

const NAV = [
  { label: "Overview", active: true, icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/>
      <rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>
    </svg>
  )},
  { label: "Conversations", active: false, icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12a7 7 0 0 1-7 7H8l-4 3v-4.5A7 7 0 0 1 8 5h5a7 7 0 0 1 7 7z"/>
    </svg>
  )},
  { label: "Customers", active: false, icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="8" r="3.4"/><path d="M5.5 19.5c1.1-3.1 3.6-4.6 6.5-4.6s5.4 1.5 6.5 4.6"/>
    </svg>
  )},
  { label: "Tasks", active: false, icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="9"/><path d="M8 12.2l2.6 2.6L16 9.4"/>
    </svg>
  )},
  { label: "Analytics", active: false, icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19h16"/><path d="M6 15l4-5 3.5 3L19 6"/>
    </svg>
  )},
];

export function Sidebar() {
  return (
    <aside
      style={{
        width: 196,
        minWidth: 196,
        background: "#111111",
        display: "flex",
        flexDirection: "column",
        padding: "22px 16px",
        gap: 22,
        height: "100%",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
      }}
    >
      <Logo size="md" dark />

      <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {NAV.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 11px",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: item.active ? 500 : 400,
              cursor: "pointer",
              background: item.active ? "rgba(255,90,31,0.14)" : "transparent",
              color: item.active ? "#FF5A1F" : "rgba(255,255,255,0.62)",
              transition: "background 120ms ease, color 120ms ease",
            }}
          >
            {item.icon}
            {item.label}
          </div>
        ))}
      </nav>

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: 14,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 9999,
            background: "#FF5A1F",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            color: "#FFFFFF",
            flexShrink: 0,
          }}
        >
          S
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#FFFFFF", fontWeight: 500 }}>Supplya</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Admin</div>
        </div>
      </div>
    </aside>
  );
}
