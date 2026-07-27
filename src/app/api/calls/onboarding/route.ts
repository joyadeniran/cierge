import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { startOnboardingCall, upsertCustomer, type CustomerRow } from "@/lib/calls-service";

/**
 * Manual trigger — the dashboard "Call now" button and demos use this.
 * Body: either { customerId } for an existing customer, or
 * { name, business_name, phone } to create-and-call in one shot.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    let customer: CustomerRow;

    if (body.customerId) {
      const { data, error } = await supabaseAdmin()
        .from("customers")
        .select("id,name,business_name,phone,region,locale")
        .eq("id", String(body.customerId))
        .single();
      if (error || !data) {
        return NextResponse.json({ error: "customer not found" }, { status: 404 });
      }
      customer = data as CustomerRow;
    } else {
      const phone = String(body.phone ?? "").trim();
      if (!phone.startsWith("+")) {
        return NextResponse.json(
          { error: "phone must be E.164, e.g. +2348012345678" },
          { status: 400 }
        );
      }
      customer = await upsertCustomer({
        externalId: null,
        name: body.name ? String(body.name) : null,
        businessName: body.business_name ? String(body.business_name) : null,
        phone,
      });
    }

    const call = await startOnboardingCall(customer);
    return NextResponse.json({ ok: true, customerId: customer.id, ...call });
  } catch (err) {
    console.error("onboarding trigger error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "internal error" },
      { status: 500 }
    );
  }
}
