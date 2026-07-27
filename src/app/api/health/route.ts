import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint. Reports which env vars are present (booleans only — never
 * their values) and whether the DB is actually reachable with the current
 * service_role key. Also decodes the key's project ref to catch a
 * wrong-project key without exposing the secret.
 */
export async function GET() {
  const url = process.env.SUPABASE_URL ?? null;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  let keyRef: string | null = null;
  try {
    keyRef = JSON.parse(Buffer.from(key.split(".")[1], "base64").toString()).ref;
  } catch {
    keyRef = null;
  }
  const urlRef = url?.match(/https:\/\/([^.]+)/)?.[1] ?? null;

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
    project: { urlRef, keyRef, match: Boolean(urlRef && keyRef && urlRef === keyRef) },
    env,
    db,
    deployedAt: new Date().toISOString(),
  });
}
