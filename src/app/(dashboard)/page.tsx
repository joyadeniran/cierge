import Link from "next/link";
import { getCalls } from "@/lib/queries";
import { StatCard } from "@/components/StatCard";
import { SentimentBadge, ActivationBadge, FollowUpBadge, OutcomeBadge } from "@/components/Badge";
import { DashboardActions } from "@/components/DashboardActions";
import { PageHeader, Panel, ErrorBanner, EmptyState, relativeTime, Dash } from "@/components/ui";

export const dynamic = "force-dynamic";

const COLS = "1.4fr 0.7fr 1fr 1fr 1fr 1.2fr";

export default async function Overview() {
  const { data: calls, error } = await getCalls(100);

  // "Reached" = the call actually produced a conversation. A call can be
  // status=completed and still never have reached a human.
  const reached = calls.filter(c => c.insights?.length).length;
  const activated = calls.filter(c => c.insights?.[0]?.activation_status === "Activated").length;
  const followUps = calls.filter(c => c.insights?.[0]?.follow_up_required).length;
  const activationRate = reached > 0 ? Math.round((activated / reached) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Voice of Customer"
        subtitle="Every onboarding call, its sentiment, and the next action."
        action={<DashboardActions />}
      />

      {error && <ErrorBanner message={error} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Calls placed" value={calls.length.toLocaleString()} />
        <StatCard label="Reached" value={reached.toLocaleString()} />
        <StatCard label="Activation rate" value={`${activationRate}%`} />
        <StatCard label="Follow-ups needed" value={followUps.toLocaleString()} />
      </div>

      <Panel>
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "10px 16px", background: "#F7F8FA", fontSize: 12, color: "#667085", fontWeight: 500, borderBottom: "1px solid #E7E9EE" }}>
          <div>Customer</div><div>Status</div><div>Sentiment</div><div>Activation</div><div>Follow-up</div><div>Summary</div>
        </div>

        {calls.length === 0 && !error && (
          <EmptyState title="No calls placed yet." hint={<>Click <strong style={{ color: "#FF5A1F" }}>Call a customer</strong> to start an onboarding call.</>} />
        )}

        {calls.map((c, i) => {
          const insight = c.insights?.[0] ?? null;
          return (
            <Link
              key={c.id}
              href={`/conversations/${c.id}`}
              style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid #EFF1F4", fontSize: 13, alignItems: "center", textDecoration: "none", color: "inherit" }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>{c.customers?.name ?? c.customers?.phone ?? "Unknown"}</div>
                <div style={{ fontSize: 12, color: "#A2A9B5", marginTop: 1 }}>{c.customers?.business_name ?? relativeTime(c.created_at)}</div>
              </div>
              <div><OutcomeBadge status={c.status} hasInsight={Boolean(insight)} /></div>
              <div><SentimentBadge value={insight?.sentiment ?? null} /></div>
              <div><ActivationBadge value={insight?.activation_status ?? null} /></div>
              <div><FollowUpBadge needed={insight?.follow_up_required ?? null} /></div>
              <div style={{ color: "#667085", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.summary ?? insight?.goal ?? ""}>
                {c.summary ?? insight?.goal ?? <Dash />}
              </div>
            </Link>
          );
        })}
      </Panel>
    </>
  );
}
