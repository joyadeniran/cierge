import { getAnalytics } from "@/lib/queries";
import { StatCard } from "@/components/StatCard";
import { PageHeader, Panel, ErrorBanner, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const SENTIMENT_COLOR: Record<string, string> = {
  Positive: "#22C55E", Neutral: "#667085", Confused: "#F59E0B", Frustrated: "#FB923C", Angry: "#EF4444",
};
const ACTIVATION_COLOR: Record<string, string> = {
  Activated: "#22C55E", Interested: "#3538CD", NotInterested: "#667085", NeedsHumanFollowUp: "#FB923C",
};

function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ color: "#444B57" }}>{label}</span>
        <span style={{ color: "#667085", fontFamily: "var(--font-mono), monospace", fontSize: 12 }}>{count} · {pct}%</span>
      </div>
      <div style={{ height: 8, background: "#F0F1F4", borderRadius: 9999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 9999, transition: "width 300ms ease" }} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel padded>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 18 }}>{title}</div>
      {children}
    </Panel>
  );
}

export default async function Analytics() {
  const { data, error } = await getAnalytics();

  const sentimentEntries = Object.entries(data.sentiment).sort((a, b) => b[1] - a[1]);
  const sentimentTotal = sentimentEntries.reduce((s, [, n]) => s + n, 0);
  const activationEntries = Object.entries(data.activation).sort((a, b) => b[1] - a[1]);
  const activationTotal = activationEntries.reduce((s, [, n]) => s + n, 0);
  const maxDay = Math.max(1, ...data.callsByDay.map(d => d.count));
  const maxPain = Math.max(1, ...data.topPainPoints.map(p => p.count));

  const completionRate = data.totalCalls > 0 ? Math.round((data.completed / data.totalCalls) * 100) : 0;
  const followUpRate = data.followUpsTotal > 0 ? Math.round((data.followUpsPending / data.followUpsTotal) * 100) : 0;

  const noData = data.totalCalls === 0;

  return (
    <>
      <PageHeader title="Analytics" subtitle="Sentiment, activation, and what customers keep asking for." />
      {error && <ErrorBanner message={error} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total calls" value={data.totalCalls.toLocaleString()} />
        <StatCard label="Completion rate" value={`${completionRate}%`} />
        <StatCard label="Failed calls" value={data.failed.toLocaleString()} up={data.failed === 0} />
        <StatCard label="Open follow-ups" value={`${data.followUpsPending} / ${data.followUpsTotal}`} up={followUpRate === 0} />
      </div>

      {noData && !error ? (
        <Panel>
          <EmptyState title="No analytics yet." hint="Charts populate automatically as Cierge completes calls." />
        </Panel>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
            <Section title="Sentiment distribution">
              {sentimentEntries.length === 0 ? <Muted /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {sentimentEntries.map(([label, count]) => (
                    <BarRow key={label} label={label} count={count} total={sentimentTotal} color={SENTIMENT_COLOR[label] ?? "#667085"} />
                  ))}
                </div>
              )}
            </Section>

            <Section title="Activation funnel">
              {activationEntries.length === 0 ? <Muted /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {activationEntries.map(([label, count]) => (
                    <BarRow key={label} label={label.replace(/([A-Z])/g, " $1").trim()} count={count} total={activationTotal} color={ACTIVATION_COLOR[label] ?? "#667085"} />
                  ))}
                </div>
              )}
            </Section>
          </div>

          <Section title="Top pain points">
            {data.topPainPoints.length === 0 ? <Muted text="No pain points captured yet." /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {data.topPainPoints.map((p) => (
                  <BarRow key={p.label} label={p.label} count={p.count} total={maxPain} color="#FF5A1F" />
                ))}
              </div>
            )}
          </Section>

          <Section title="Calls over time">
            {data.callsByDay.length === 0 ? <Muted /> : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140, paddingTop: 8 }}>
                {data.callsByDay.map((d) => (
                  <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#667085" }}>{d.count}</div>
                    <div style={{ width: "100%", maxWidth: 40, height: `${(d.count / maxDay) * 100}%`, minHeight: 4, background: "#FF5A1F", borderRadius: "4px 4px 0 0" }} />
                    <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#A2A9B5", whiteSpace: "nowrap" }}>{d.day.slice(5)}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </>
  );
}

function Muted({ text = "Not enough data yet." }: { text?: string }) {
  return <div style={{ fontSize: 13, color: "#A2A9B5", padding: "8px 0" }}>{text}</div>;
}
