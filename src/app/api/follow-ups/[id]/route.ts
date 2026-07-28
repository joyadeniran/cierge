import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED = new Set(["pending", "sent", "failed"]);

/**
 * PATCH /api/follow-ups/:id  { status: "sent" | "pending" | "failed" }
 * Used by the Tasks page to mark a follow-up done (or reopen it).
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const status = body.status;
  if (!status || !ALLOWED.has(status)) {
    return NextResponse.json({ error: "status must be one of pending|sent|failed" }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin()
      .from("follow_ups")
      .update({ status, sent_at: status === "sent" ? new Date().toISOString() : null })
      .eq("id", id)
      .select("id,status")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "follow-up not found" }, { status: 404 });
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal error" }, { status: 500 });
  }
}
