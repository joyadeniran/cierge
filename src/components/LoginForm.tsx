"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./Logo";

type Mode = "signin" | "signup";

export function LoginForm({ redirect }: { redirect: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string).trim();
    const password = fd.get("password") as string;

    if (!email || !password) { setError("Email and password are required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(redirect || "/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.push(redirect || "/");
          router.refresh();
        } else {
          setInfo("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F8FA", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 28 }}>
          <Logo size="lg" dark={false} />
          <div style={{ fontSize: 14, color: "#667085" }}>Your AI Customer Success Agent</div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E7E9EE", borderRadius: 14, padding: 32, boxShadow: "0 1px 2px rgba(17,17,17,.04)" }}>
          <h1 style={{ margin: "0 0 4px", fontFamily: "var(--font-inter-tight), 'Inter Tight', sans-serif", fontWeight: 600, fontSize: 20, letterSpacing: "-0.02em" }}>
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h1>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: "#667085" }}>
            {mode === "signin" ? "Welcome back to Cierge." : "Get started with Cierge."}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <AuthField label="Email" name="email" type="email" placeholder="you@company.com" autoComplete="email" />
              <AuthField label="Password" name="password" type="password" placeholder="••••••••" autoComplete={mode === "signin" ? "current-password" : "new-password"} />

              {info && <div style={{ fontSize: 13, color: "#15803D", background: "#E7F8EE", borderRadius: 8, padding: "10px 12px" }}>{info}</div>}
              {error && <div style={{ fontSize: 13, color: "#B42318", background: "#FEECEB", borderRadius: 8, padding: "10px 12px" }}>{error}</div>}

              <button
                type="submit"
                disabled={busy}
                style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#FFFFFF", background: busy ? "#F0A080" : "#FF5A1F", border: "1px solid transparent", borderRadius: 8, padding: "12px 20px", cursor: busy ? "not-allowed" : "pointer", transition: "background 120ms ease" }}
              >
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </div>
          </form>

          <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "#667085" }}>
            {mode === "signin" ? (
              <>Don&apos;t have an account?{" "}
                <button onClick={() => { setMode("signup"); setError(null); setInfo(null); }} style={linkBtn}>Sign up</button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button onClick={() => { setMode("signin"); setError(null); setInfo(null); }} style={linkBtn}>Sign in</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  background: "none", border: "none", padding: 0, color: "#FF5A1F", fontWeight: 600, fontSize: 13, cursor: "pointer",
};

function AuthField({ label, name, type, placeholder, autoComplete }: { label: string; name: string; type: string; placeholder?: string; autoComplete?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "#111111" }}>{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: 14, color: "#111111", background: "#FFFFFF", border: "1px solid #D8DCE4", borderRadius: 8, padding: "11px 14px", outline: "none", width: "100%" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#FF5A1F"; e.currentTarget.style.boxShadow = "0 0 0 3px #FFE3D6"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "#D8DCE4"; e.currentTarget.style.boxShadow = "none"; }}
      />
    </div>
  );
}
