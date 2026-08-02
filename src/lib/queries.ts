import { supabaseAdmin } from "./supabase";

/**
 * Small typed data-access layer over Supabase. Every function returns
 * `{ data, error }` so pages can render an error banner instead of throwing.
 */

export type Result<T> = { data: T; error: string | null };

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e && "message" in e) return String((e as { message: unknown }).message);
  return "Unknown database error";
}

export type CustomerLite = {
  id: string;
  name: string | null;
  business_name: string | null;
  phone: string;
};

export type CallRow = {
  id: string;
  type: string;
  status: string;
  summary: string | null;
  completion_confidence: number | null;
  created_at: string;
  completed_at: string | null;
  customers: CustomerLite | null;
  insights: {
    sentiment: string | null;
    activation_status: string | null;
    follow_up_required: boolean | null;
    goal: string | null;
  }[];
};

const CALL_SELECT =
  "id,type,status,summary,completion_confidence,created_at,completed_at," +
  "customers(id,name,business_name,phone)," +
  "insights(sentiment,activation_status,follow_up_required,goal)";

export async function getCalls(limit = 100): Promise<Result<CallRow[]>> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("calls")
      .select(CALL_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as unknown as CallRow[], error: null };
  } catch (e) {
    return { data: [], error: errMsg(e) };
  }
}

export type CallDetail = {
  id: string;
  type: string;
  status: string;
  summary: string | null;
  task_completed: boolean | null;
  completion_confidence: number | null;
  transcript: unknown;
  failure_code: string | null;
  calle_call_id: string | null;
  created_at: string;
  completed_at: string | null;
  customers: CustomerLite | null;
  insights: {
    id: string;
    business_type: string | null;
    goal: string | null;
    pain_points: unknown;
    sentiment: string | null;
    activation_status: string | null;
    follow_up_required: boolean | null;
    wants_human_contact: boolean | null;
    raw: unknown;
  }[];
};

export async function getCall(id: string): Promise<Result<CallDetail | null>> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("calls")
      .select(
        "id,type,status,summary,task_completed,completion_confidence,transcript,failure_code,calle_call_id,created_at,completed_at," +
        "customers(id,name,business_name,phone)," +
        "insights(id,business_type,goal,pain_points,sentiment,activation_status,follow_up_required,wants_human_contact,raw)"
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return { data: null, error: error.message };
    return { data: (data as unknown as CallDetail) ?? null, error: null };
  } catch (e) {
    return { data: null, error: errMsg(e) };
  }
}

export type CustomerRow = {
  id: string;
  do_not_call?: boolean | null;
  do_not_call_reason?: string | null;
  name: string | null;
  business_name: string | null;
  phone: string;
  email: string | null;
  status: string;
  health_score: number | null;
  created_at: string;
  calls: { id: string; status: string; created_at: string }[];
  insights: { sentiment: string | null; activation_status: string | null }[];
};

export async function getCustomers(limit = 100): Promise<Result<CustomerRow[]>> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("customers")
      .select(
        "id,name,business_name,phone,email,status,health_score,created_at,do_not_call,do_not_call_reason," +
        "calls(id,status,created_at)," +
        "insights(sentiment,activation_status)"
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as unknown as CustomerRow[], error: null };
  } catch (e) {
    return { data: [], error: errMsg(e) };
  }
}

export type FollowUpRow = {
  id: string;
  channel: string;
  kind?: string | null;
  reason: string | null;
  status: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  sent_at: string | null;
  customers: CustomerLite | null;
};

export async function getFollowUps(limit = 100): Promise<Result<FollowUpRow[]>> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("follow_ups")
      .select("id,channel,kind,reason,status,payload,created_at,sent_at,customers(id,name,business_name,phone)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as unknown as FollowUpRow[], error: null };
  } catch (e) {
    return { data: [], error: errMsg(e) };
  }
}

export type AnalyticsData = {
  totalCalls: number;
  completed: number;
  failed: number;
  sentiment: Record<string, number>;
  activation: Record<string, number>;
  followUpsPending: number;
  followUpsTotal: number;
  topPainPoints: { label: string; count: number }[];
  callsByDay: { day: string; count: number }[];
};

export async function getAnalytics(): Promise<Result<AnalyticsData>> {
  const empty: AnalyticsData = {
    totalCalls: 0, completed: 0, failed: 0, sentiment: {}, activation: {},
    followUpsPending: 0, followUpsTotal: 0, topPainPoints: [], callsByDay: [],
  };
  try {
    const sb = supabaseAdmin();
    const [callsRes, insightsRes, followRes] = await Promise.all([
      sb.from("calls").select("status,created_at"),
      sb.from("insights").select("sentiment,activation_status,pain_points"),
      sb.from("follow_ups").select("status"),
    ]);

    const firstErr = callsRes.error || insightsRes.error || followRes.error;
    if (firstErr) return { data: empty, error: firstErr.message };

    const calls = (callsRes.data ?? []) as { status: string; created_at: string }[];
    const insights = (insightsRes.data ?? []) as { sentiment: string | null; activation_status: string | null; pain_points: unknown }[];
    const follows = (followRes.data ?? []) as { status: string }[];

    const sentiment: Record<string, number> = {};
    const activation: Record<string, number> = {};
    const painCounts: Record<string, number> = {};

    for (const i of insights) {
      if (i.sentiment) sentiment[i.sentiment] = (sentiment[i.sentiment] ?? 0) + 1;
      if (i.activation_status) activation[i.activation_status] = (activation[i.activation_status] ?? 0) + 1;
      if (Array.isArray(i.pain_points)) {
        for (const p of i.pain_points as unknown[]) {
          const key = String(p).trim();
          if (key) painCounts[key] = (painCounts[key] ?? 0) + 1;
        }
      }
    }

    const byDay: Record<string, number> = {};
    for (const c of calls) {
      const day = c.created_at.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
    }

    return {
      data: {
        totalCalls: calls.length,
        completed: calls.filter(c => c.status === "completed").length,
        failed: calls.filter(c => c.status === "failed").length,
        sentiment,
        activation,
        followUpsPending: follows.filter(f => f.status === "pending").length,
        followUpsTotal: follows.length,
        topPainPoints: Object.entries(painCounts)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6),
        callsByDay: Object.entries(byDay)
          .map(([day, count]) => ({ day, count }))
          .sort((a, b) => a.day.localeCompare(b.day))
          .slice(-14),
      },
      error: null,
    };
  } catch (e) {
    return { data: empty, error: errMsg(e) };
  }
}
