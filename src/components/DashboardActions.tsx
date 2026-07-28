"use client";
import { useState } from "react";
import { CallNowModal } from "./CallNowModal";

export function DashboardActions() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          fontFamily: "var(--font-inter), Inter, sans-serif",
          fontWeight: 600,
          fontSize: 13,
          color: "#FFFFFF",
          background: "#FF5A1F",
          border: "1px solid transparent",
          borderRadius: 8,
          padding: "10px 16px",
          cursor: "pointer",
          transition: "background 120ms ease",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#E04A11")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#FF5A1F")}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5z"/>
        </svg>
        Call a customer
      </button>

      <CallNowModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
