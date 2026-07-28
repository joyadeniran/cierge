"use client";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const pw = fd.get("password") as string;
    const confirm = fd.get("confirm") as string;

    if (pw.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (pw !== confirm) { setError("Passwords do not match."); return; }

    setBusy(true);
    setError(null);
    setOk(false);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setOk(true);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 360 }}>
        <PwField label="New password" name="password" />
        <PwField label="Confirm new password" name="confirm" />
        {ok && <div style={{ fontSize: 13, color: "#15803D", background: "#E7F8EE", borderRadius: 8, padding: "10px 12px" }}>Password updated.</div>}
        {error && <div style={{ fontSize: 13, color: "#B42318", background: "#FEECEB", borderRadius: 8, padding: "10px 12px" }}>{error}</div>}
        <button
          type="submit"
          disabled={busy}
          style={{ alignSelf: "flex-start", fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#FFFFFF", background: busy ? "#F0A080" : "#FF5A1F", border: "1px solid transparent", borderRadius: 8, padding: "10px 18px", cursor: busy ? "not-allowed" : "pointer" }}
        >
          {busy ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}

function PwField({ label, name }: { label: string; name: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "#111111" }}>{label}</label>
      <input
        type="password"
        name={name}
        autoComplete="new-password"
        required
        style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: 14, color: "#111111", background: "#FFFFFF", border: "1px solid #D8DCE4", borderRadius: 8, padding: "11px 14px", outline: "none", width: "100%" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#FF5A1F"; e.currentTarget.style.boxShadow = "0 0 0 3px #FFE3D6"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "#D8DCE4"; e.currentTarget.style.boxShadow = "none"; }}
      />
    </div>
  );
}
