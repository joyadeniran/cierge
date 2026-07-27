import { calle } from "./calle";
import { supabaseAdmin } from "./supabase";
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
  const { data, error } = await sb
    .from("customers")
    .upsert(
      {
        external_id: input.externalId ?? null,
        source: input.source ?? "supplya",
        name: input.name ?? null,
        business_name: input.businessName ?? null,
        phone: input.phone,
        email: input.email ?? null,
        region: input.region ?? "NG",
        locale: input.locale ?? "en-NG",
        status: "onboarding",
      },
      { onConflict: "source,external_id" }
    )
    .select("id,name,business_name,phone,region,locale")
    .single();
  if (error) throw new Error(`upsertCustomer: ${error.message}`);
  return data as CustomerRow;
}

/**
 * Create a `calls` row and place the CALL-E outbound onboarding call.
 * CALL-E delivers the terminal result to APP_URL/api/webhooks/calle.
 */
export async function startOnboardingCall(customer: CustomerRow) {
  const sb = supabaseAdmin();

  const { data: call, error: callErr } = await sb
    .from("calls")
    .insert({ customer_id: customer.id, type: "onboarding", status: "queued" })
    .select("id")
    .single();
  if (callErr) throw new Error(`create call: ${callErr.message}`);

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const created = await calle().calls.create(
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

  await sb
    .from("calls")
    .update({ calle_call_id: created.id, status: created.status })
    .eq("id", call.id);

  return { callId: call.id as string, calleCallId: created.id, status: created.status };
}

export type { OnboardingInsight };
