import { supabaseAdmin } from "./supabase";
import type { OnboardingInsight } from "./flows/onboarding";

/**
 * Decide and record a follow-up action off a call outcome.
 *
 * For now this only *records* the intended action in `follow_ups`; the actual
 * send (Supplya notification API for email/WhatsApp, or a human task) is wired
 * in a later step. Recording first keeps the dashboard honest and the pipe
 * observable end-to-end.
 */
/**
 * The customer explicitly refused. Suppress them so no later call can reach
 * them, cancel anything pending, and record the words that prove it.
 *
 * Only ever called from positive refusal evidence in the transcript — never
 * from a missing structured result.
 */
export async function suppressCustomer(args: {
  customerId: string;
  callId: string;
  evidence: string;
}): Promise<void> {
  const sb = supabaseAdmin();

  await sb
    .from("customers")
    .update({
      do_not_call: true,
      do_not_call_reason: args.evidence.slice(0, 500),
      do_not_call_at: new Date().toISOString(),
      status: "churned",
    })
    .eq("id", args.customerId);

  // A refusal must not leave a retry sitting in the queue for someone to action.
  await sb
    .from("follow_ups")
    .update({ status: "failed", reason: "Cancelled — customer asked not to be contacted" })
    .eq("customer_id", args.customerId)
    .eq("status", "pending");

  const { data: existing } = await sb
    .from("follow_ups")
    .select("id")
    .eq("call_id", args.callId)
    .eq("kind", "action")
    .maybeSingle();
  if (existing) return;

  await sb.from("follow_ups").insert({
    customer_id: args.customerId,
    call_id: args.callId,
    channel: "task",
    kind: "action",
    reason: "Customer asked not to be contacted — do not call",
    status: "sent", // nothing to action; recorded for the audit trail
    sent_at: new Date().toISOString(),
    payload: { declined: true, evidence: args.evidence },
  });
}

/**
 * A human took part, or we could not tell, but no usable result came back.
 * This must NOT be re-dialled automatically — a person reads the transcript
 * first, because the customer may have refused in words no classifier saw.
 */
export async function recordReviewFollowUp(args: {
  customerId: string;
  callId: string;
  reason: string;
  summary?: string | null;
}): Promise<void> {
  const sb = supabaseAdmin();

  const { data: existing } = await sb
    .from("follow_ups")
    .select("id")
    .eq("call_id", args.callId)
    .eq("kind", "review")
    .maybeSingle();
  if (existing) return;

  await sb.from("follow_ups").insert({
    customer_id: args.customerId,
    call_id: args.callId,
    channel: "task",
    kind: "review",
    reason: args.reason,
    status: "pending",
    payload: { needs_review: true, summary: args.summary ?? null },
  });
}

/**
 * The call reached a terminal state without a usable conversation — the customer
 * was never actually reached (no answer, carrier rejection, voicemail, failure).
 * Queue a retry task so the signup isn't silently dropped.
 */
export async function recordUnreachedFollowUp(args: {
  customerId: string;
  callId: string;
  status: string;
  failureCode?: string | null;
  summary?: string | null;
}): Promise<void> {
  const sb = supabaseAdmin();

  // Idempotency: webhook delivery is at-least-once, so don't stack duplicates.
  const { data: existing } = await sb
    .from("follow_ups")
    .select("id")
    .eq("call_id", args.callId)
    .eq("kind", "retry")
    .maybeSingle();
  if (existing) return;

  const reason =
    args.status === "failed"
      ? `Call failed${args.failureCode ? ` (${args.failureCode})` : ""} — retry`
      : "Call did not reach the customer — retry";

  await sb.from("follow_ups").insert({
    customer_id: args.customerId,
    call_id: args.callId,
    channel: "task",
    kind: "retry",
    reason,
    status: "pending",
    payload: { unreached: true, call_status: args.status, failure_code: args.failureCode ?? null, summary: args.summary ?? null },
  });
}

export async function maybeFollowUp(args: {
  customerId: string;
  callId: string;
  insightId?: string;
  result: OnboardingInsight;
}): Promise<void> {
  const { customerId, callId, result } = args;
  const needs =
    result.follow_up_required ||
    result.wants_human_contact ||
    result.sentiment === "Frustrated" ||
    result.sentiment === "Angry";
  if (!needs) return;

  const sb = supabaseAdmin();

  const channel = result.wants_human_contact ? "task" : "whatsapp";
  const reason = result.wants_human_contact
    ? "Customer asked to speak with a person"
    : `Sentiment ${result.sentiment ?? "unknown"} / follow-up flagged`;

  await sb.from("follow_ups").insert({
    customer_id: customerId,
    call_id: callId,
    channel,
    reason,
    status: "pending",
    payload: {
      activation_status: result.activation_status,
      pain_points: result.pain_points ?? [],
      notes: result.notes ?? null,
    },
  });

  // TODO(next): dispatch to Supplya's notification service (email/WhatsApp)
  // or create a human CS task, then mark status='sent' + sent_at.
}
