import { getFollowUps } from "@/lib/queries";
import { PageHeader, Panel, ErrorBanner, EmptyState, relativeTime, Dash } from "@/components/ui";
import { MarkDoneButton } from "@/components/FollowUpActions";

export const dynamic = "force-dynamic";

const COLS = "1.3fr 0.8fr 0.9fr 1.6fr 0.7fr 0.8fr 0.9fr";

const CHANNEL: Record<string, { bg: string; color: string; label: string }> = {
  email:    { bg: "#EEF1FF", color: "#3538CD", label: "Email" },
  whatsapp: { bg: "#E7F8EE", color: "#15803D", label: "WhatsApp" },
  task:     { bg: "#FFF1EB", color: "#C2410C", label: "Human task" },
};

function ChannelPill({ channel }: { channel: string }) {
  const c = CHANNEL[channel] ?? { bg: "#F0F1F4", color: "#475467", label: channel };
  return <span style={{ fontSize: 11, fontWeight: 500, background: c.bg, color: c.color, borderRadius: 9999, padding: "3px 9px" }}>{c.label}</span>;
}

/**
 * A retry is safe to dial — we have evidence nobody answered. A review is not:
 * a human took part and we could not classify the result, so someone must read
 * the transcript before any re-contact.
 */
const KIND: Record<string, { bg: string; color: string; label: string; title: string }> = {
  retry:  { bg: "#EEF1FF", color: "#3538CD", label: "Safe to retry", title: "Nobody was reached — re-dialling is safe" },
  review: { bg: "#FFF1EB", color: "#C2410C", label: "Read first", title: "A person took part but the result was unusable — read the transcript before calling again" },
  action: { bg: "#F0F1F4", color: "#475467", label: "Action", title: "Recorded outcome" },
};

function KindPill({ kind }: { kind?: string | null }) {
  const k = KIND[kind ?? "action"] ?? KIND.action;
  return (
    <span title={k.title} style={{ fontSize: 11, fontWeight: 500, background: k.bg, color: k.color, borderRadius: 9999, padding: "3px 9px", whiteSpace: "nowrap" }}>
      {k.label}
    </span>
  );
}

export default async function Tasks() {
  const { data: followUps, error } = await getFollowUps(200);
  const pending = followUps.filter(f => f.status === "pending").length;

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle={pending > 0 ? `${pending} follow-up${pending === 1 ? "" : "s"} waiting on action.` : "Follow-ups Cierge flagged from its calls."}
      />
      {error && <ErrorBanner message={error} />}

      <Panel>
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "10px 16px", background: "#F7F8FA", fontSize: 12, color: "#667085", fontWeight: 500, borderBottom: "1px solid #E7E9EE" }}>
          <div>Customer</div><div>Channel</div><div>Type</div><div>Reason</div><div>Created</div><div>Status</div><div>Action</div>
        </div>

        {followUps.length === 0 && !error && (
          <EmptyState title="No follow-ups yet." hint="Cierge creates a task whenever a call flags a follow-up or an unhappy customer." />
        )}

        {followUps.map((f, i) => (
          <div key={f.id} style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid #EFF1F4", fontSize: 13, alignItems: "center", opacity: f.status === "sent" ? 0.6 : 1 }}>
            <div>
              <div style={{ fontWeight: 500 }}>{f.customers?.name ?? f.customers?.phone ?? "Unknown"}</div>
              <div style={{ fontSize: 12, color: "#A2A9B5", marginTop: 1 }}>{f.customers?.business_name ?? <Dash />}</div>
            </div>
            <div><ChannelPill channel={f.channel} /></div>
            <div><KindPill kind={f.kind} /></div>
            <div style={{ color: "#667085" }}>{f.reason ?? <Dash />}</div>
            <div style={{ color: "#667085" }}>{relativeTime(f.created_at)}</div>
            <div style={{ color: "#667085", textTransform: "capitalize" }}>{f.status}</div>
            <div><MarkDoneButton id={f.id} status={f.status} /></div>
          </div>
        ))}
      </Panel>
    </>
  );
}
