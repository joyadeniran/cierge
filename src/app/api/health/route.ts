import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint. Reports which env vars are present (booleans only — never
 * their values) and whether the DB is actually reachable with the current
 * service_role key.
 *
 * The project-ref comparison only works for legacy JWT keys, which carry the ref
 * in their payload. Modern `sb_secret_…` keys are opaque, so there is nothing to
 * decode and `match` reports null — "cannot determine" — rather than false.
 * Reporting false there was worse than useless: it looked like a misconfiguration
 * on a perfectly healthy deploy, and trained the reader to ignore the field. With
 * an opaque key, a wrong-project key shows up as `db.ok: false` instead.
 */
export async function GET() {
  const url = process.env.SUPABASE_URL ?? null;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  // Legacy service_role keys are JWTs whose payload carries the project ref.
  // Modern secret keys (`sb_secret_…`) are opaque and carry nothing to compare.
  const keyFormat: "jwt" | "opaque" | "missing" =
    !key ? "missing" : key.startsWith("sb_") ? "opaque" : "jwt";

  let keyRef: string | null = null;
  if (keyFormat === "jwt") {
    try {
      keyRef = JSON.parse(Buffer.from(key.split(".")[1], "base64").toString()).ref;
    } catch {
      keyRef = null;
    }
  }

  const urlRef = url?.match(/https:\/\/([^.]+)/)?.[1] ?? null;

  // null = not determinable from an opaque key, which is not the same as a mismatch.
  const match: boolean | null =
    keyRef === null ? null : Boolean(urlRef) && urlRef === keyRef;

  const env = {
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    CALLE_API_KEY: Boolean(process.env.CALLE_API_KEY),
    CALLE_WEBHOOK_SECRET: Boolean(process.env.CALLE_WEBHOOK_SECRET),
    APP_URL: process.env.APP_URL ?? null,
    SUPPLYA_WEBHOOK_SECRET: Boolean(process.env.SUPPLYA_WEBHOOK_SECRET),
  };

  let db: { ok: boolean; error: string | null } = { ok: false, error: "not attempted" };
  if (supabaseConfigured()) {
    try {
      const { error } = await supabaseAdmin()
        .from("customers")
        .select("id", { count: "exact", head: true });
      db = { ok: !error, error: error?.message ?? null };
    } catch (e) {
      db = { ok: false, error: e instanceof Error ? e.message : "unknown" };
    }
  }

  return NextResponse.json({
    ok: db.ok,
    project: { urlRef, keyRef, keyFormat, match },
    env,
    db,
    deployedAt: new Date().toISOString(),
  });
}
