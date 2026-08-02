import { calle } from "./calle";
import { supabaseAdmin } from "./supabase";
import { recordUnreachedFollowUp } from "./followups";
import {
  onboardingTask,
  onboardingResultSchema,
  type OnboardingInsight,
} from "./flows/onboarding";

export interface CustomerRow {
  id: string;
  name: string | null;
  business_name: string | null;
  phone: string;
  region: string | null;
  locale: string | null;
}

/**
 * Upsert a customer (keyed on source + external_id) and return the row.
 */
const CUSTOMER_COLS = "id,name,business_name,phone,region,locale";

/**
 * Identity for a calling workflow is the phone number, not the external id.
 * Keying on (source, external_id) let the same person be created repeatedly:
 * Postgres treats NULL external_id values as distinct, so every manual call
 * minted a fresh customer and fragmented their history.
 *
 * Existing rows are updated field-by-field so a later call with sparse data
 * cannot blank out details captured earlier.
 */
export async function upsertCustomer(input: {
  externalId?: string | null;
  source?: string;
  name?: string | null;
  businessName?: string | null;
  phone: string;
  email?: string | null;
  region?: string | null;
  locale?: string | null;
}): Promise<CustomerRow> {
  const sb = supabaseAdmin();
  const source = input.source ?? "supplya";

  const { data: existing, error: findErr } = await sb
    .from("customers")
    .select(CUSTOMER_COLS)
    .eq("source", source)
    .eq("phone", input.phone)
    .maybeSingle();
  if (findErr) throw new Error(`upsertCustomer lookup: ${findErr.message}`);

  if (existing) {
    // Only overwrite with values we actually have.
    const patch: Record<string, unknown> = {};
    if (input.externalId) patch.external_id = input.externalId;
    if (input.name) patch.name = input.name;
    if (input.businessName) patch.business_name = input.businessName;
    if (input.email) patch.email = input.email;
    if (input.region) patch.region = input.region;
    if (input.locale) patch.locale = input.locale;

    if (Object.keys(patch).length === 0) return existing as CustomerRow;

    const { data, error } = await sb
      .from("customers")
      .update(patch)
      .eq("id", (existing as CustomerRow).id)
      .select(CUSTOMER_COLS)
      .single();
    if (error) throw new Error(`upsertCustomer update: ${error.message}`);
    return data as CustomerRow;
  }

  const { data, error } = await sb
    .from("customers")
    .insert({
      external_id: input.externalId ?? null,
      source,
      name: input.name ?? null,
      business_name: input.businessName ?? null,
      phone: input.phone,
      email: input.email ?? null,
      region: input.region ?? "NG",
      locale: input.locale ?? "en-NG",
      status: "onboarding",
    })
    .select(CUSTOMER_COLS)
    .single();

  if (error) {
    // Lost a race against a concurrent insert — the unique index held, so
    // re-read the winner rather than failing the request.
    if (error.code === "23505") {
      const { data: raced } = await sb
        .from("customers")
        .select(CUSTOMER_COLS)
        .eq("source", source)
        .eq("phone", input.phone)
        .maybeSingle();
      if (raced) return raced as CustomerRow;
    }
    throw new Error(`upsertCustomer insert: ${error.message}`);
  }
  return data as CustomerRow;
}

/**
 * Create a `calls` row and place the CALL-E outbound onboarding call.
 * CALL-E delivers the terminal result to APP_URL/api/webhooks/calle.
 */
/** Raised when a call cannot be started for a reason the caller should see. */
export class CallNotStartedError extends Error {
  constructor(message: string, readonly reason: "in_flight" | "provider" | "suppressed") {
    super(message);
    this.name = "CallNotStartedError";
  }
}

export async function startOnboardingCall(customer: CustomerRow) {
  const sb = supabaseAdmin();

  // A recorded refusal is terminal. Check it here rather than at the call sites
  // so no future trigger can route around it.
  const { data: suppression } = await sb
    .from("customers")
    .select("do_not_call,do_not_call_reason")
    .eq("id", customer.id)
    .maybeSingle();

  if (suppression?.do_not_call) {
    throw new CallNotStartedError(
      "This customer asked not to be contacted.",
      "suppressed"
    );
  }

  // A partial unique index enforces one non-terminal call per customer, so this
  // insert is the concurrency guard — two workers cannot both dial the same
  // person. Treat the conflict as a normal outcome, not a 500.
  const { data: call, error: callErr } = await sb
    .from("calls")
    .insert({ customer_id: customer.id, type: "onboarding", status: "queued" })
    .select("id")
    .single();

  if (callErr) {
    if (callErr.code === "23505") {
      throw new CallNotStartedError(
        "A call to this customer is already queued or in progress.",
        "in_flight"
      );
    }
    throw new Error(`create call: ${callErr.message}`);
  }

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

  let created;
  try {
    created = await calle().calls.create(
      {
        task: onboardingTask({
          name: customer.name,
          businessName: customer.business_name,
        }),
        recipient: {
          phones: [customer.phone],
          locale: customer.locale ?? "en-NG",
          region: customer.region ?? "NG",
        },
        resultSchema: onboardingResultSchema as unknown as Record<string, unknown>,
        metadata: { cierge_call_id: call.id, customer_id: customer.id },
        webhookUrl: `${appUrl}/api/webhooks/calle`,
      },
      { idempotencyKey: call.id }
    );
  } catch (err) {
    // The call row already exists. If we leave it queued it will never receive a
    // terminal webhook, so it would sit there forever: no insight, no retry, and
    // the signup silently lost. Close it out and queue the retry ourselves.
    const message = err instanceof Error ? err.message : "unknown provider error";
    await sb
      .from("calls")
      .update({
        status: "failed",
        failure_code: "provider_create_failed",
        summary: `Call could not be started: ${message}`.slice(0, 500),
        completed_at: new Date().toISOString(),
      })
      .eq("id", call.id);

    await recordUnreachedFollowUp({
      customerId: customer.id,
      callId: call.id,
      status: "failed",
      failureCode: "provider_create_failed",
      summary: `Call could not be started: ${message}`,
    }).catch(() => {
      // Never let follow-up bookkeeping mask the original provider error.
    });

    throw new CallNotStartedError(
      `Voice provider rejected the call: ${message}`,
      "provider"
    );
  }

  await sb
    .from("calls")
    .update({ calle_call_id: created.id, status: created.status })
    .eq("id", call.id);

  return { callId: call.id as string, calleCallId: created.id, status: created.status };
}

export type { OnboardingInsight };
