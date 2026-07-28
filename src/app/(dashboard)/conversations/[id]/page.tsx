import Link from "next/link";
import { notFound } from "next/navigation";
import { getCall } from "@/lib/queries";
import { SentimentBadge, StatusBadge, ActivationBadge } from "@/components/Badge";
import { Panel, ErrorBanner, relativeTime, Dash } from "@/components/ui";

export const dynamic = "force-dynamic";

type Turn = { offset_seconds: number | null; speaker: string; text: string };

function normalizeTranscript(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
    .map((t) => ({
      offset_seconds: typeof t.offset_seconds === "number" ? t.offset_seconds : null,
      speaker: typeof t.speaker === "string" ? t.speaker : "unknown",
      text: typeof t.text === "string" ? t.text : String(t.content ?? ""),
    }))
    .filter((t) => t.text.trim().length > 0);
}

function fmtOffset(s: number | null): string {
  if (s == null) return "";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#667085" }}>{label}</div>
      <div style={{ fontSize: 14 }}>{children}</div>
    </div>
  );
}

export default async function CallDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: call, error } = await getCall(id);

  if (error) {
    return (
      <>
        <BackLink />
        <ErrorBanner message={error} />
      </>
    );
  }
  if (!call) notFound();

  const insight = call.insights?.[0] ?? null;
  const turns = normalizeTranscript(call.transcript);
  const painPoints = Array.isArray(insight?.pain_points) ? (insight!.pain_points as unknown[]).map(String) : [];

  return (
    <>
      <BackLink />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-inter-tight), 'Inter Tight', sans-serif", fontWeight: 600, fontSize: 22, letterSpacing: "-0.02em" }}>
            {call.customers?.name ?? call.customers?.phone ?? "Unknown customer"}
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "#667085" }}>
            {call.customers?.business_name ? `${call.customers.business_name} · ` : ""}
            {call.customers?.phone} · {relativeTime(call.created_at)}
          </p>
        </div>
        <StatusBadge value={call.status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20, alignItems: "start" }}>
        {/* Transcript */}
        <Panel padded>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Transcript</div>
          {turns.length === 0 ? (
            <div style={{ fontSize: 13, color: "#A2A9B5", padding: "12px 0" }}>
              {call.status === "completed" ? "No transcript captured for this call." : "Transcript will appear once the call completes."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {turns.map((t, i) => {
                const isBot = t.speaker === "bot";
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isBot ? "flex-start" : "flex-end" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#A2A9B5", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {isBot ? "Cierge" : t.speaker === "user" ? "Customer" : "—"}
                      </span>
                      {t.offset_seconds != null && <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#C9CED8" }}>{fmtOffset(t.offset_seconds)}</span>}
                    </div>
                    <div style={{ maxWidth: "85%", fontSize: 14, lineHeight: 1.5, padding: "10px 14px", borderRadius: 12, background: isBot ? "#FFF1EB" : "#F0F1F4", color: isBot ? "#7A2E0E" : "#111111", borderTopLeftRadius: isBot ? 2 : 12, borderTopRightRadius: isBot ? 12 : 2 }}>
                      {t.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Insight sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Panel padded>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Summary</div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#444B57" }}>
              {call.summary ?? <span style={{ color: "#A2A9B5" }}>No summary yet.</span>}
            </p>
            {call.failure_code && (
              <div style={{ marginTop: 12, fontSize: 12, color: "#B42318", background: "#FEECEB", borderRadius: 8, padding: "8px 12px" }}>
                Failure: {call.failure_code}
              </div>
            )}
          </Panel>

          <Panel padded>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Extracted insight</div>
            {insight ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Sentiment"><SentimentBadge value={insight.sentiment} /></Field>
                  <Field label="Activation"><ActivationBadge value={insight.activation_status} /></Field>
                </div>
                <Field label="Business type">{insight.business_type ?? <Dash />}</Field>
                <Field label="Goal">{insight.goal ?? <Dash />}</Field>
                <Field label="Pain points">
                  {painPoints.length ? (
                    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                      {painPoints.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  ) : <Dash />}
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Follow-up">{insight.follow_up_required ? "Required" : "Not needed"}</Field>
                  <Field label="Wants human">{insight.wants_human_contact ? "Yes" : "No"}</Field>
                </div>
                {call.completion_confidence != null && (
                  <Field label="Completion confidence">{Math.round(call.completion_confidence * 100)}%</Field>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#A2A9B5" }}>
                {call.status === "completed" ? "No structured insight extracted." : "Insight is generated when the call completes."}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function BackLink() {
  return (
    <Link href="/conversations" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#667085", textDecoration: "none", marginBottom: 16 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
      All conversations
    </Link>
  );
}
