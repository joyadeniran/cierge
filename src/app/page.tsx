import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import { StatCard } from "@/components/StatCard";
import { SentimentBadge, ActivationBadge, FollowUpBadge, StatusBadge } from "@/components/Badge";
import { DashboardActions } from "@/components/DashboardActions";

export const dynamic = "force-dynamic";

/* ── Types ─────────────────────────────────────────────────────────────── */
type CallRow = {
  id: string;
  type: string;
  status: string;
  summary: string | null;
  completion_confidence: number | null;
  created_at: string;
  completed_at: string | null;
  customers: {
    id: string;
    name: string | null;
    business_name: string | null;
    phone: string;
  } | null;
  insights: {
    sentiment: string | null;
    activation_status: string | null;
    follow_up_required: boolean | null;
    goal: string | null;
  }[];
};

type Stats = {
  totalCalls: number;
  completed: number;
  activated: number;
  followUps: number;
};

/* ── Data fetching ──────────────────────────────────────────────────────── */
async function getData(): Promise<{ calls: CallRow[]; stats: Stats; error: string | null }> {
  const sb = supabaseAdmin();

  const [callsRes, statsRes] = await Promise.allSettled([
    sb
      .from("calls")
      .select(
        "id,type,status,summary,completion_confidence,created_at,completed_at," +
        "customers(id,name,business_name,phone)," +
        "insights(sentiment,activation_status,follow_up_required,goal)"
      )
      .order("created_at", { ascending: false })
      .limit(100),
    sb
      .from("insights")
      .select("activation_status,follow_up_required", { count: "exact" }),
  ]);

  if (callsRes.status === "rejected" || callsRes.value.error) {
    const msg = callsRes.status === "rejected"
      ? (callsRes.reason as Error).message
      : callsRes.value.error!.message;
    return { calls: [], stats: { totalCalls: 0, completed: 0, activated: 0, followUps: 0 }, error: msg };
  }

  const calls = (callsRes.value.data ?? []) as unknown as CallRow[];

  const insights = statsRes.status === "fulfilled" && !statsRes.value.error
    ? (statsRes.value.data ?? []) as { activation_status: string | null; follow_up_required: boolean | null }[]
    : [];

  const stats: Stats = {
    totalCalls: calls.length,
    completed: calls.filter(c => c.status === "completed").length,
    activated: insights.filter(i => i.activation_status === "Activated").length,
    followUps: insights.filter(i => i.follow_up_required).length,
  };

  return { calls, stats, error: null };
}

/* ── Setup notice ───────────────────────────────────────────────────────── */
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

/* ── Relative time ──────────────────────────────────────────────────────── */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default async function Dashboard() {
  if (!supabaseConfigured()) return <SetupNotice />;

  const { calls, stats, error } = await getData();
  const activationRate = stats.completed > 0
    ? Math.round((stats.activated / stats.completed) * 100)
    : 0;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />

      {/* Main content, offset for the 196px sidebar */}
      <main style={{ marginLeft: 196, flex: 1, overflow: "auto", background: "#F7F8FA" }}>
        <div style={{ maxWidth: 1120 - 196, margin: "0 auto", padding: "28px 32px" }}>

          {/* ── Header ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <h1 style={{ margin: 0, fontFamily: "var(--font-inter-tight), 'Inter Tight', sans-serif", fontWeight: 600, fontSize: 22, letterSpacing: "-0.02em" }}>
                Voice of Customer
              </h1>
              <p style={{ margin: "3px 0 0", fontSize: 13, color: "#667085" }}>
                Every onboarding call, its sentiment, and the next action.
              </p>
            </div>
            <DashboardActions />
          </div>

          {/* ── DB error banner ── */}
          {error && (
            <div style={{ marginBottom: 20, borderRadius: 8, border: "1px solid #FEECEB", background: "#FEECEB", padding: "12px 16px", fontSize: 13, color: "#B42318" }}>
              <strong>Database error:</strong> {error}
              <br />
              <span style={{ opacity: 0.8 }}>
                Verify <code style={{ background: "rgba(0,0,0,0.06)", padding: "0 4px", borderRadius: 3 }}>SUPABASE_SERVICE_ROLE_KEY</code> is the key for project{" "}
                <code style={{ background: "rgba(0,0,0,0.06)", padding: "0 4px", borderRadius: 3 }}>xovsiklkiqxmpmvioscc</code>.
              </span>
            </div>
          )}

          {/* ── Stat tiles ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            <StatCard label="Calls placed" value={stats.totalCalls.toLocaleString()} />
            <StatCard label="Completed" value={stats.completed.toLocaleString()} />
            <StatCard label="Activation rate" value={`${activationRate}%`} />
            <StatCard label="Follow-ups needed" value={stats.followUps.toLocaleString()} />
          </div>

          {/* ── Calls table ── */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E7E9EE", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 2px rgba(17,17,17,.04)" }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.7fr 1fr 1fr 1fr 1.2fr", gap: 12, padding: "10px 16px", background: "#F7F8FA", fontSize: 12, color: "#667085", fontWeight: 500, borderBottom: "1px solid #E7E9EE" }}>
              <div>Customer</div>
              <div>Status</div>
              <div>Sentiment</div>
              <div>Activation</div>
              <div>Follow-up</div>
              <div>Summary</div>
            </div>

            {calls.length === 0 && !error && (
              <div style={{ padding: "40px 16px", textAlign: "center", color: "#667085", fontSize: 14 }}>
                <div style={{ marginBottom: 8 }}>No calls placed yet.</div>
                <div style={{ fontSize: 13, color: "#A2A9B5" }}>Click <strong style={{ color: "#FF5A1F" }}>Call a customer</strong> to start an onboarding call.</div>
              </div>
            )}

            {calls.map((c, i) => {
              const insight = c.insights?.[0] ?? null;
              const isLast = i === calls.length - 1;
              return (
                <div
                  key={c.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 0.7fr 1fr 1fr 1fr 1.2fr",
                    gap: 12,
                    padding: "12px 16px",
                    borderTop: "1px solid #EFF1F4",
                    fontSize: 13,
                    alignItems: "center",
                    borderBottom: isLast ? "none" : undefined,
                    transition: "background 80ms ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      {c.customers?.name ?? c.customers?.phone ?? "Unknown"}
                    </div>
                    <div style={{ fontSize: 12, color: "#A2A9B5", marginTop: 1 }}>
                      {c.customers?.business_name ?? relativeTime(c.created_at)}
                    </div>
                  </div>
                  <div><StatusBadge value={c.status} /></div>
                  <div><SentimentBadge value={insight?.sentiment ?? null} /></div>
                  <div><ActivationBadge value={insight?.activation_status ?? null} /></div>
                  <div><FollowUpBadge needed={insight?.follow_up_required ?? null} /></div>
                  <div style={{ color: "#667085", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.summary ?? insight?.goal ?? ""}>
                    {c.summary ?? insight?.goal ?? <span style={{ color: "#C9CED8" }}>—</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
