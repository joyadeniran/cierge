import { NextRequest, NextResponse } from "next/server";
import { calle } from "@/lib/calle";
import { ingestCallSnapshot, type CallSnapshot } from "@/lib/ingest";

/**
 * Terminal call events from CALL-E: call.completed | call.failed |
 * call.result_validation_failed. Signature is verified with
 * CALLE_WEBHOOK_SECRET; without a secret we fall back to raw parse (dev only).
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const secret = process.env.CALLE_WEBHOOK_SECRET;

  let event: { type: string; data: CallSnapshot };
  try {
    if (secret) {
      event = calle().webhooks.unwrap({
        rawBody,
        headers: req.headers,
        secret,
      }) as unknown as { type: string; data: CallSnapshot };
    } else {
      console.warn("CALLE_WEBHOOK_SECRET unset — skipping signature verification");
      event = JSON.parse(rawBody);
    }
  } catch (err) {
    console.error("calle webhook verify failed", err);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  try {
    await ingestCallSnapshot(event.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("calle webhook ingest error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "internal error" },
      { status: 500 }
    );
  }
}
