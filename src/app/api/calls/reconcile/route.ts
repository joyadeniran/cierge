import { NextRequest, NextResponse } from "next/server";
import { reconcileStaleCalls } from "@/lib/reconcile";

export const dynamic = "force-dynamic";

/**
 * Close out calls whose terminal webhook never arrived.
 *
 * Safe to call repeatedly and safe to run on a schedule (Vercel Cron, an
 * external pinger, or by hand). Reachable either with a signed-in session — the
 * middleware gate — or with the Supplya shared secret so a cron can drive it
 * without a browser login.
 */
async function handle(req: NextRequest) {
  // This path is exempt from the middleware session gate so a scheduler can
  // reach it, which means the shared secret is the only thing protecting it.
  // Require it unconditionally — an absent header must never pass, and an
  // unset env var must fail closed rather than open the endpoint to anyone.
  const secret = process.env.SUPPLYA_WEBHOOK_SECRET;
  if (!secret) {
    console.error("reconcile: SUPPLYA_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "reconcile is not configured" }, { status: 503 });
  }
  if (req.headers.get("x-cierge-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await reconcileStaleCalls();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("reconcile error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "internal error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return handle(req);
}

// GET so a cron service that only issues GETs can drive it too.
export async function GET(req: NextRequest) {
  return handle(req);
}
