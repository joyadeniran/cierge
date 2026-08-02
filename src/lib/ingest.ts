import { supabaseAdmin } from "./supabase";
import { maybeFollowUp, recordUnreachedFollowUp, recordReviewFollowUp, suppressCustomer } from "./followups";
import { assessReachability, normalizeTurns } from "./reachability";
import type { OnboardingInsight } from "./flows/onboarding";

/** Minimal structural view of a terminal CALL-E call snapshot. */
export interface CallSnapshot {
  id: string;
  status: string;
  summary: string | null;
  task_completed: boolean | null;
  completion_confidence: { score: number; label: string } | null;
  structured_result: Record<string, unknown> | null;
  recipients?: Array<{
    structured_result: Record<string, unknown> | null;
    summary: string | null;
    attempts?: Array<{ transcript_turns?: unknown[] }>;
  }>;
  metadata?: Record<string, unknown>;
  failure_code?: string | null;
  completed_at?: string | null;
}

function pickResult(snap: CallSnapshot): OnboardingInsight | null {
  const recipient = snap.recipients?.[0]?.structured_result;
  const result = (recipient ?? snap.structured_result) as OnboardingInsight | null;
  return result && Object.keys(result).length > 0 ? result : null;
}

function collectTranscript(snap: CallSnapshot): unknown[] {
  return (snap.recipients ?? []).flatMap((r) =>
    (r.attempts ?? []).flatMap((a) => a.transcript_turns ?? [])
  );
}

/**
 * Persist a terminal CALL-E call snapshot: update the call row, store the
 * extracted insight, and trigger any follow-up. Idempotent per call row.
 */
export async function ingestCallSnapshot(snap: CallSnapshot): Promise<void> {
  const sb = supabaseAdmin();
  const ciergeCallId = snap.metadata?.cierge_call_id as string | undefined;

  const query = sb.from("calls").select("id,customer_id");
  const { data: call } = ciergeCallId
    ? await query.eq("id", ciergeCallId).maybeSingle()
    : await query.eq("calle_call_id", snap.id).maybeSingle();

  if (!call) {
    console.warn(`ingest: no matching call row for CALL-E call ${snap.id}`);
    return;
  }

  await sb
    .from("calls")
    .update({
      calle_call_id: snap.id,
      status: snap.status,
      summary: snap.summary ?? snap.recipients?.[0]?.summary ?? null,
      task_completed: snap.task_completed,
      completion_confidence: snap.completion_confidence?.score ?? null,
      transcript: collectTranscript(snap),
      failure_code: snap.failure_code ?? null,
      completed_at: snap.completed_at ?? new Date().toISOString(),
    })
    .eq("id", call.id);

  const result = snap.status === "completed" ? pickResult(snap) : null;

  // Reachability is judged from the transcript, never from whether a result
  // exists. Extraction can fail, and a customer who refuses often hangs up
  // before the model emits anything — treating that as "not reached" would
  // queue a retry and put a call back in front of someone who just refused.
  const { reachability, refusalEvidence } = assessReachability(
    normalizeTurns(collectTranscript(snap))
  );
  const summary = snap.summary ?? snap.recipients?.[0]?.summary ?? null;

  // A refusal outranks everything, including a missing result.
  if (refusalEvidence) {
    await suppressCustomer({
      customerId: call.customer_id,
      callId: call.id,
      evidence: refusalEvidence,
    });
    return;
  }

  if (!result) {
    if (reachability === "no-human") {
      // Positive evidence nobody took part: safe to retry.
      await recordUnreachedFollowUp({
        customerId: call.customer_id,
        callId: call.id,
        status: snap.status,
        failureCode: snap.failure_code ?? null,
        summary,
      });
    } else {
      // A human took part, or we cannot tell. Either way this must not be
      // re-dialled on our say-so — a person reads the transcript first.
      await recordReviewFollowUp({
        customerId: call.customer_id,
        callId: call.id,
        reason:
          reachability === "human"
            ? "Call reached the customer but produced no usable result — review before any re-contact"
            : "Could not determine whether anyone was reached — review before any re-contact",
        summary,
      });
    }
    return;
  }

  const { data: insight } = await sb
    .from("insights")
    .insert({
      call_id: call.id,
      customer_id: call.customer_id,
      business_type: result.business_type ?? null,
      goal: result.goal ?? null,
      pain_points: result.pain_points ?? null,
      sentiment: result.sentiment ?? null,
      activation_status: result.activation_status ?? null,
      follow_up_required: result.follow_up_required ?? false,
      wants_human_contact: result.wants_human_contact ?? false,
      raw: result,
    })
    .select("id")
    .single();

  // Reflect activation into the customer's status/health.
  await sb
    .from("customers")
    .update({
      status: result.activation_status === "Activated" ? "active" : "onboarding",
      business_name: result.business_name ?? undefined,
    })
    .eq("id", call.customer_id);

  await maybeFollowUp({
    customerId: call.customer_id,
    callId: call.id,
    insightId: insight?.id,
    result,
  });
}
