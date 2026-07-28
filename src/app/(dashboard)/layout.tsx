import { Sidebar } from "@/components/Sidebar";
import { supabaseConfigured } from "@/lib/supabase";

function SetupNotice() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#F7F8FA" }}>
      <div style={{ maxWidth: 460, textAlign: "center", padding: 40, border: "1px dashed #D8DCE4", borderRadius: 14, background: "#FFFFFF" }}>
        <div style={{ fontFamily: "var(--font-inter-tight), 'Inter Tight', sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: "-0.04em" }}>
          <span style={{ color: "#FF5A1F" }}>&lt;</span>cierge<span style={{ color: "#FF5A1F" }}>&gt;</span>
        </div>
        <p style={{ fontSize: 15, color: "#667085", margin: "8px 0 24px" }}>Your AI Customer Success Agent</p>
        <div style={{ textAlign: "left", background: "#F7F8FA", borderRadius: 10, padding: "16px 20px", fontSize: 13, color: "#444B57", lineHeight: 1.7 }}>
          Set <code style={{ background: "#E7E9EE", padding: "1px 6px", borderRadius: 4 }}>SUPABASE_URL</code> and{" "}
          <code style={{ background: "#E7E9EE", padding: "1px 6px", borderRadius: 4 }}>SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
          <code style={{ background: "#E7E9EE", padding: "1px 6px", borderRadius: 4 }}>.env.local</code>, then run{" "}
          <code style={{ background: "#E7E9EE", padding: "1px 6px", borderRadius: 4 }}>supabase/schema.sql</code>.
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigured()) return <SetupNotice />;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main style={{ marginLeft: 196, flex: 1, overflow: "auto", background: "#F7F8FA" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 32px" }}>{children}</div>
      </main>
    </div>
  );
}
