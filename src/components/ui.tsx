import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: "var(--font-inter-tight), 'Inter Tight', sans-serif", fontWeight: 600, fontSize: 22, letterSpacing: "-0.02em" }}>
          {title}
        </h1>
        {subtitle && <p style={{ margin: "3px 0 0", fontSize: 13, color: "#667085" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, padded = false }: { children: ReactNode; padded?: boolean }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E7E9EE", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 2px rgba(17,17,17,.04)", padding: padded ? 24 : 0 }}>
      {children}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ marginBottom: 20, borderRadius: 8, border: "1px solid #FEECEB", background: "#FEECEB", padding: "12px 16px", fontSize: 13, color: "#B42318" }}>
      <strong>Database error:</strong> {message}
      <br />
      <span style={{ opacity: 0.8 }}>
        Verify <code style={{ background: "rgba(0,0,0,0.06)", padding: "0 4px", borderRadius: 3 }}>SUPABASE_SERVICE_ROLE_KEY</code> is the key for project{" "}
        <code style={{ background: "rgba(0,0,0,0.06)", padding: "0 4px", borderRadius: 3 }}>xovsiklkiqxmpmvioscc</code>.
      </span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div style={{ padding: "48px 16px", textAlign: "center", color: "#667085", fontSize: 14 }}>
      <div style={{ marginBottom: 6 }}>{title}</div>
      {hint && <div style={{ fontSize: 13, color: "#A2A9B5" }}>{hint}</div>}
    </div>
  );
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "—";
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function Dash() {
  return <span style={{ color: "#C9CED8" }}>—</span>;
}
