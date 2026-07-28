"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkDoneButton({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const done = status === "sent";

  async function toggle() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/follow-ups/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: done ? "pending" : "sent" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        title="Reopen"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "#15803D", background: "#E7F8EE", border: "1px solid transparent", borderRadius: 8, padding: "6px 12px", cursor: busy ? "wait" : "pointer" }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12.2l2.6 2.6L16 9.4"/></svg>
        Done
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
      <button
        onClick={toggle}
        disabled={busy}
        style={{ fontSize: 12, fontWeight: 600, color: "#FFFFFF", background: busy ? "#F0A080" : "#FF5A1F", border: "1px solid transparent", borderRadius: 8, padding: "6px 12px", cursor: busy ? "wait" : "pointer", transition: "background 120ms ease" }}
      >
        {busy ? "Saving…" : "Mark done"}
      </button>
      {err && <span style={{ fontSize: 11, color: "#B42318" }}>{err}</span>}
    </div>
  );
}
