import { NextRequest, NextResponse } from "next/server";
import { upsertCustomer, startOnboardingCall, CallNotStartedError } from "@/lib/calls-service";

/**
 * Supplya calls this when a new retailer signs up.
 * Body: { external_id, name, business_name, phone (E.164), email }
 * Auth: shared secret in the `x-cierge-secret` header.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.SUPPLYA_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-cierge-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const phone = String(body.phone ?? "").trim();
  if (!phone.startsWith("+")) {
    return NextResponse.json(
      { error: "phone must be E.164, e.g. +2348012345678" },
      { status: 400 }
    );
  }

  try {
    const customer = await upsertCustomer({
      externalId: body.external_id ? String(body.external_id) : null,
      source: "supplya",
      name: body.name ? String(body.name) : null,
      businessName: body.business_name ? String(body.business_name) : null,
      phone,
      email: body.email ? String(body.email) : null,
    });

    const call = await startOnboardingCall(customer);
    return NextResponse.json({ ok: true, customerId: customer.id, ...call });
  } catch (err) {
    if (err instanceof CallNotStartedError) {
      // 409 for an already-in-flight call so a retrying sender doesn't treat it
      // as a transient fault and pile on more calls; 502 when the provider
      // refused, which is upstream rather than a bad request.
      const status =
        err.reason === "suppressed" ? 403 : err.reason === "in_flight" ? 409 : 502;
      console.warn("supplya webhook: call not started", err.reason, err.message);
      return NextResponse.json({ error: err.message, reason: err.reason }, { status });
    }
    console.error("supplya webhook error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "internal error" },
      { status: 500 }
    );
  }
}
