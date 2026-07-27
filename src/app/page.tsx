import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type CallView = {
  id: string;
  type: string;
  status: string;
  summary: string | null;
  completion_confidence: number | null;
  created_at: string;
  customers: { name: string | null; business_name: string | null; phone: string } | null;
  insights: {
    sentiment: string | null;
    activation_status: string | null;
    follow_up_required: boolean | null;
    goal: string | null;
  }[];
};

const sentimentColor: Record<string, string> = {
  Positive: "bg-green-100 text-green-800",
  Neutral: "bg-gray-100 text-gray-700",
  Confused: "bg-yellow-100 text-yellow-800",
  Frustrated: "bg-orange-100 text-orange-800",
  Angry: "bg-red-100 text-red-800",
};

async function getCalls(): Promise<CallView[]> {
  const { data } = await supabaseAdmin()
    .from("calls")
    .select(
      "id,type,status,summary,completion_confidence,created_at,customers(name,business_name,phone),insights(sentiment,activation_status,follow_up_required,goal)"
    )
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as unknown as CallView[]) ?? [];
}

function SetupNotice() {
  return (
    <div className="mx-auto mt-24 max-w-xl rounded-xl border border-dashed p-8 text-center">
      <h1 className="text-2xl font-semibold">Cierge</h1>
      <p className="mt-2 text-gray-500">Your AI Customer Success agent.</p>
      <p className="mt-6 text-sm text-gray-600">
        Set <code className="rounded bg-gray-100 px-1">SUPABASE_URL</code> and{" "}
        <code className="rounded bg-gray-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
        <code className="rounded bg-gray-100 px-1">.env.local</code>, run{" "}
        <code className="rounded bg-gray-100 px-1">supabase/schema.sql</code>, then reload.
      </p>
    </div>
  );
}

export default async function Dashboard() {
  if (!supabaseConfigured()) return <SetupNotice />;
  const calls = await getCalls();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Cierge — Voice of Customer</h1>
        <p className="text-sm text-gray-500">
          Every onboarding call, its sentiment, and the next action.
        </p>
      </header>

      {calls.length === 0 ? (
        <p className="text-gray-500">
          No calls yet. Trigger one via{" "}
          <code className="rounded bg-gray-100 px-1">POST /api/calls/onboarding</code>.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Sentiment</th>
                <th className="px-4 py-3 font-medium">Activation</th>
                <th className="px-4 py-3 font-medium">Follow-up</th>
                <th className="px-4 py-3 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {calls.map((c) => {
                const insight = c.insights?.[0];
                return (
                  <tr key={c.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {c.customers?.name ?? "Unknown"}
                      </div>
                      <div className="text-gray-400">
                        {c.customers?.business_name ?? c.customers?.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {insight?.sentiment ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            sentimentColor[insight.sentiment] ?? "bg-gray-100"
                          }`}
                        >
                          {insight.sentiment}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{insight?.activation_status ?? "—"}</td>
                    <td className="px-4 py-3">
                      {insight?.follow_up_required ? (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                          Needed
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-gray-600">
                      {c.summary ?? insight?.goal ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
