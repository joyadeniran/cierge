import { calle, calleConfigured } from "./calle";
import { supabaseAdmin } from "./supabase";
import { ingestCallSnapshot, type CallSnapshot } from "./ingest";
import { recordUnreachedFollowUp, recordReviewFollowUp } from "./followups";

/**
 * A call is only ever closed by CALL-E's terminal webhook. If that webhook is
 * lost — a deploy mid-flight, a signature change, an outage — the row stays
 * `queued`/`in_progress` forever: no insight, no retry, signup silently lost.
 *
 * Reconciliation is the backstop. It asks the provider directly for anything
 * stuck past the grace period and closes it out.
 */

/** Calls younger than this are still legitimately in progress. */
export const STALE_AFTER_MINUTES = 15;

/** Past this, stop believing the provider and close the call out. */
export const ABANDON_AFTER_MINUTES = 60;

export interface ReconcileResult {
  checked: number;
  resolved: number;
  abandoned: number;
  stillPending: number;
  errors: { callId: string; error: string }[];
}

export async function reconcileStaleCalls(limit = 25): Promise<ReconcileResult> {
  const sb = supabaseAdmin();
  const out: ReconcileResult = {
    checked: 0, resolved: 0, abandoned: 0, stillPending: 0, errors: [],
  };

  const staleBefore = new Date(Date.now() - STALE_AFTER_MINUTES * 60_000).toISOString();

  const { data: stale, error } = await sb
    .from("calls")
    .select("id,calle_call_id,customer_id,created_at")
    .in("status", ["queued", "in_progress"])
    .lt("created_at", staleBefore)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`reconcile query: ${error.message}`);
  if (!stale?.length) return out;

  for (const row of stale) {
    out.checked++;
    const ageMinutes = (Date.now() - new Date(row.created_at).getTime()) / 60_000;

    try {
      // No provider id means create() never returned us one. That does NOT prove
      // the provider never placed the call — it may have created it and failed
      // to respond. Unknown, so a human decides; never an automatic redial.
      if (!row.calle_call_id) {
        await abandon(row.id, row.customer_id, "no_provider_id",
          "Call was never registered with the voice provider, so its outcome is unknown.",
          "review");
        out.abandoned++;
        continue;
      }

      if (!calleConfigured()) {
        out.errors.push({ callId: row.id, error: "CALLE_API_KEY not configured" });
        continue;
      }

      const snap = (await calle().calls.get(row.calle_call_id)) as unknown as CallSnapshot;

      if (["completed", "failed", "canceled"].includes(snap.status)) {
        // Terminal at the provider but we never got the webhook. Run it through
        // the same ingest path so classification and follow-ups are identical.
        await ingestCallSnapshot(snap);
        out.resolved++;
        continue;
      }

      if (ageMinutes >= ABANDON_AFTER_MINUTES) {
        // The provider still says the call is live. It may well have connected
        // and been refused — that is unknown, not evidence nobody answered.
        await abandon(row.id, row.customer_id, "abandoned_stale",
          `Provider still reported "${snap.status}" after ${Math.round(ageMinutes)} minutes; outcome unknown.`,
          "review");
        out.abandoned++;
        continue;
      }

      out.stillPending++;
    } catch (e) {
      const message = e instanceof Error ? e.message : "unknown error";
      // A provider lookup failure must not stall the rest of the batch.
      if (ageMinutes >= ABANDON_AFTER_MINUTES) {
        // An unreachable provider tells us nothing about the customer.
        await abandon(row.id, row.customer_id, "abandoned_unreachable",
          `Could not reconcile with the provider: ${message}. Outcome unknown.`,
          "review").catch(() => {});
        out.abandoned++;
      } else {
        out.errors.push({ callId: row.id, error: message });
      }
    }
  }

  return out;
}

/**
 * Close out an attempt we can no longer resolve.
 *
 * `disposition` decides whether the signup may be dialled again. Only pass
 * `"retry"` when there is positive evidence no call reached anyone. Provider
 * unreachable, provider unsure, or no provider record at all are all *unknown* —
 * they release the attempt slot but must never authorise a redial, because the
 * call may have connected and been refused.
 */
async function abandon(
  callId: string,
  customerId: string,
  failureCode: string,
  summary: string,
  disposition: "retry" | "review"
): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from("calls")
    .update({
      status: "failed",
      failure_code: failureCode,
      summary: summary.slice(0, 500),
      completed_at: new Date().toISOString(),
    })
    .eq("id", callId)
    .in("status", ["queued", "in_progress"]); // don't clobber a late webhook

  const queue =
    disposition === "retry"
      ? recordUnreachedFollowUp({ customerId, callId, status: "failed", failureCode, summary })
      : recordReviewFollowUp({
          customerId,
          callId,
          reason: `Attempt could not be reconciled (${failureCode}) — read the record before any re-contact`,
          summary,
        });

  await queue.catch(() => {
    // Bookkeeping must not fail the reconciliation pass.
  });
}
