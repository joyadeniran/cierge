"use client";
import { useState, useRef, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface Props {
  open: boolean;
  onClose: () => void;
}

type State = "idle" | "loading" | "success" | "error";

export function CallNowModal({ open, onClose }: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Focus name field when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 60);
      setState("idle");
      setError(null);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const business_name = (fd.get("business_name") as string).trim();
    const phone = (fd.get("phone") as string).trim();

    if (!phone) { setError("Phone number is required."); return; }
    if (!phone.startsWith("+")) {
      setError("Phone must be in E.164 format, e.g. +15551234567");
      return;
    }

    setState("loading");
    setError(null);

    try {
      const res = await fetch("/api/calls/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name || null, business_name: business_name || null, phone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setState("success");
      setTimeout(() => {
        onClose();
        router.refresh();
      }, 1800);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(17,17,17,0.5)",
          zIndex: 40, backdropFilter: "blur(2px)",
        }}
      />
      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 50,
          background: "#FFFFFF",
          borderRadius: 14,
          padding: 32,
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 20px 60px rgba(17,17,17,0.18)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h2 id="modal-title" style={{ margin: 0, fontFamily: "var(--font-inter-tight), 'Inter Tight', sans-serif", fontWeight: 600, fontSize: 20, letterSpacing: "-0.02em" }}>
              Call a customer
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#667085" }}>
              Cierge will dial and run the onboarding conversation.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#667085" }}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>
        </div>

        {state === "success" ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: 48, height: 48, borderRadius: 9999, background: "#E7F8EE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/><path d="M8 12.2l2.6 2.6L16 9.4"/>
              </svg>
            </div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Call queued</div>
            <div style={{ fontSize: 13, color: "#667085", marginTop: 4 }}>Cierge is dialling now. The table will update when the call completes.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label="Customer name" name="name" placeholder="e.g. Sarah Adeyemi" ref={nameRef} />
              <Field label="Business name" name="business_name" placeholder="e.g. Grace Stores" />
              <Field label="Phone number *" name="phone" placeholder="+15551234567" type="tel" required />
              <div style={{ fontSize: 12, color: "#667085", background: "#F7F8FA", borderRadius: 8, padding: "10px 12px", lineHeight: 1.5 }}>
                <strong>Note:</strong> CALL-E supports US, Canada, UK, India, UAE, Singapore, Australia and more. For Nigerian numbers, use a US forwarding number (see{" "}
                <a href="/docs/telephony-demo.md" target="_blank" style={{ color: "#FF5A1F" }}>telephony guide</a>).
              </div>
              {error && (
                <div style={{ fontSize: 13, color: "#B42318", background: "#FEECEB", borderRadius: 8, padding: "10px 12px" }}>
                  {error}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  fontFamily: "var(--font-inter), Inter, sans-serif",
                  fontWeight: 600, fontSize: 14,
                  color: "#111111", background: "#FFFFFF",
                  border: "1px solid #D8DCE4", borderRadius: 8,
                  padding: "11px 20px", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={state === "loading"}
                style={{
                  flex: 2,
                  fontFamily: "var(--font-inter), Inter, sans-serif",
                  fontWeight: 600, fontSize: 14,
                  color: "#FFFFFF",
                  background: state === "loading" ? "#F0A080" : "#FF5A1F",
                  border: "1px solid transparent",
                  borderRadius: 8,
                  padding: "11px 20px",
                  cursor: state === "loading" ? "not-allowed" : "pointer",
                  transition: "background 120ms ease",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {state === "loading" ? (
                  <>
                    <Spinner />
                    Placing call…
                  </>
                ) : "Call now"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

function Field({
  label, name, placeholder, type = "text", required = false,
  ref,
}: {
  label: string; name: string; placeholder?: string; type?: string; required?: boolean;
  ref?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "#111111" }}>{label}</label>
      <input
        ref={ref}
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        style={{
          fontFamily: "var(--font-inter), Inter, sans-serif",
          fontSize: 14, color: "#111111",
          background: "#FFFFFF",
          border: "1px solid #D8DCE4",
          borderRadius: 8,
          padding: "11px 14px",
          outline: "none",
          width: "100%",
          transition: "border-color 120ms ease, box-shadow 120ms ease",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#FF5A1F";
          e.currentTarget.style.boxShadow = "0 0 0 3px #FFE3D6";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#D8DCE4";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}
