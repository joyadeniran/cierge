import { getCustomers } from "@/lib/queries";
import { SentimentBadge } from "@/components/Badge";
import { PageHeader, Panel, ErrorBanner, EmptyState, relativeTime, Dash } from "@/components/ui";
import { DashboardActions } from "@/components/DashboardActions";

export const dynamic = "force-dynamic";

const COLS = "1.5fr 1fr 1fr 0.8fr 1fr 0.9fr";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  new:        { bg: "#EEF1FF", color: "#3538CD", label: "New" },
  onboarding: { bg: "#FFF1EB", color: "#C2410C", label: "Onboarding" },
  active:     { bg: "#E7F8EE", color: "#15803D", label: "Active" },
  at_risk:    { bg: "#FEECEB", color: "#B42318", label: "At risk" },
  churned:    { bg: "#F0F1F4", color: "#475467", label: "Churned" },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: "#F0F1F4", color: "#475467", label: status };
  return <span style={{ fontSize: 11, fontWeight: 500, background: s.bg, color: s.color, borderRadius: 9999, padding: "3px 9px" }}>{s.label}</span>;
}

/** A recorded refusal has to be visible, or someone will call them anyway. */
function DoNotCallPill({ reason }: { reason?: string | null }) {
  return (
    <span
      title={reason ? `Customer said: "${reason}"` : "Customer asked not to be contacted"}
      style={{ fontSize: 11, fontWeight: 600, background: "#FEECEB", color: "#B42318", borderRadius: 9999, padding: "3px 9px", whiteSpace: "nowrap" }}
    >
      Do not call
    </span>
  );
}

export default async function Customers() {
  const { data: customers, error } = await getCustomers(200);

  return (
    <>
      <PageHeader title="Customers" subtitle="Everyone Cierge has onboarded or is tracking." action={<DashboardActions />} />
      {error && <ErrorBanner message={error} />}

      <Panel>
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "10px 16px", background: "#F7F8FA", fontSize: 12, color: "#667085", fontWeight: 500, borderBottom: "1px solid #E7E9EE" }}>
          <div>Customer</div><div>Phone</div><div>Status</div><div>Calls</div><div>Latest sentiment</div><div>Joined</div>
        </div>

        {customers.length === 0 && !error && (
          <EmptyState title="No customers yet." hint={<>New signups appear here, or add one with <strong style={{ color: "#FF5A1F" }}>Call a customer</strong>.</>} />
        )}

        {customers.map((c, i) => {
          const latestSentiment = c.insights?.[0]?.sentiment ?? null;
          return (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid #EFF1F4", fontSize: 13, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 500 }}>{c.name ?? "Unnamed"}</div>
                <div style={{ fontSize: 12, color: "#A2A9B5", marginTop: 1 }}>{c.business_name ?? <Dash />}</div>
              </div>
              <div style={{ color: "#667085", fontFamily: "var(--font-mono), monospace", fontSize: 12 }}>{c.phone}</div>
              <div>{c.do_not_call ? <DoNotCallPill reason={c.do_not_call_reason} /> : <StatusPill status={c.status} />}</div>
              <div style={{ color: "#667085" }}>{c.calls?.length ?? 0}</div>
              <div><SentimentBadge value={latestSentiment} /></div>
              <div style={{ color: "#667085" }}>{relativeTime(c.created_at)}</div>
            </div>
          );
        })}
      </Panel>
    </>
  );
}
