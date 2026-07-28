import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { supabaseConfigured } from "@/lib/supabase";
import { createClient, authConfigured } from "@/lib/supabase/server";

function SetupNotice({ vars }: { vars: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#F7F8FA" }}>
      <div style={{ maxWidth: 460, textAlign: "center", padding: 40, border: "1px dashed #D8DCE4", borderRadius: 14, background: "#FFFFFF" }}>
        <div style={{ fontFamily: "var(--font-inter-tight), 'Inter Tight', sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: "-0.04em" }}>
          <span style={{ color: "#FF5A1F" }}>&lt;</span>cierge<span style={{ color: "#FF5A1F" }}>&gt;</span>
        </div>
        <p style={{ fontSize: 15, color: "#667085", margin: "8px 0 24px" }}>Your AI Customer Success Agent</p>
        <div style={{ textAlign: "left", background: "#F7F8FA", borderRadius: 10, padding: "16px 20px", fontSize: 13, color: "#444B57", lineHeight: 1.7 }}>
          Missing environment {vars}. Set them (in <code style={{ background: "#E7E9EE", padding: "1px 6px", borderRadius: 4 }}>.env.local</code> locally, or the Vercel project settings) and redeploy.
        </div>
      </div>
    </div>
  );
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigured()) return <SetupNotice vars="SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" />;
  // Auth needs the public keys (inlined at build time). Degrade gracefully
  // instead of throwing a 500 if a deploy landed before they were configured.
  if (!authConfigured()) return <SetupNotice vars="NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY" />;

  // Defense in depth: middleware already gates, but never render the dashboard
  // shell without a verified user.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar userEmail={user.email} />
      <main style={{ marginLeft: 196, flex: 1, overflow: "auto", background: "#F7F8FA" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 32px" }}>{children}</div>
      </main>
    </div>
  );
}
