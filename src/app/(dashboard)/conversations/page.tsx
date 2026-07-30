import Link from "next/link";
import { getCalls } from "@/lib/queries";
import { SentimentBadge, OutcomeBadge } from "@/components/Badge";
import { PageHeader, Panel, ErrorBanner, EmptyState, relativeTime, Dash } from "@/components/ui";

export const dynamic = "force-dynamic";

const COLS = "1.6fr 0.8fr 1fr 0.8fr 1fr 1.4fr";

export default async function Conversations() {
  const { data: calls, error } = await getCalls(200);

  return (
    <>
      <PageHeader title="Conversations" subtitle="Every call Cierge has placed. Select one to see the transcript." />
      {error && <ErrorBanner message={error} />}

      <Panel>
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "10px 16px", background: "#F7F8FA", fontSize: 12, color: "#667085", fontWeight: 500, borderBottom: "1px solid #E7E9EE" }}>
          <div>Customer</div><div>Type</div><div>Status</div><div>Sentiment</div><div>When</div><div>Summary</div>
        </div>

        {calls.length === 0 && !error && (
          <EmptyState title="No conversations yet." hint="Calls appear here as soon as Cierge starts dialling." />
        )}

        {calls.map((c, i) => (
          <Link
            key={c.id}
            href={`/conversations/${c.id}`}
            style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid #EFF1F4", fontSize: 13, alignItems: "center", textDecoration: "none", color: "inherit" }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>{c.customers?.name ?? c.customers?.phone ?? "Unknown"}</div>
              <div style={{ fontSize: 12, color: "#A2A9B5", marginTop: 1 }}>{c.customers?.business_name ?? c.customers?.phone ?? ""}</div>
            </div>
            <div style={{ color: "#667085", textTransform: "capitalize" }}>{c.type}</div>
            <div><OutcomeBadge status={c.status} hasInsight={Boolean(c.insights?.length)} /></div>
            <div><SentimentBadge value={c.insights?.[0]?.sentiment ?? null} /></div>
            <div style={{ color: "#667085" }}>{relativeTime(c.created_at)}</div>
            <div style={{ color: "#667085", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.summary ?? ""}>
              {c.summary ?? <Dash />}
            </div>
          </Link>
        ))}
      </Panel>
    </>
  );
}
