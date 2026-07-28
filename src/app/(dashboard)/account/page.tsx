import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel } from "@/components/ui";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 16, padding: "14px 0", borderTop: "1px solid #EFF1F4", alignItems: "center" }}>
      <div style={{ fontSize: 13, color: "#667085" }}>{label}</div>
      <div style={{ fontSize: 14 }}>{value}</div>
    </div>
  );
}

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const created = user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—";
  const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—";

  return (
    <>
      <PageHeader
        title="Account"
        subtitle="Manage your Cierge sign-in."
        action={
          <form action="/auth/signout" method="post">
            <button type="submit" style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "#111111", background: "#FFFFFF", border: "1px solid #D8DCE4", borderRadius: 8, padding: "10px 16px", cursor: "pointer" }}>
              Sign out
            </button>
          </form>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
        <Panel padded>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 9999, background: "#FF5A1F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, color: "#FFFFFF" }}>
              {(user.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{user.email}</div>
              <div style={{ fontSize: 13, color: "#667085" }}>Cierge · Supplya</div>
            </div>
          </div>
          <Row label="Email" value={user.email ?? "—"} />
          <Row label="Member since" value={created} />
          <Row label="Last sign-in" value={lastSignIn} />
          <Row label="User ID" value={user.id} />
        </Panel>

        <Panel padded>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Change password</div>
          <ChangePasswordForm />
        </Panel>
      </div>
    </>
  );
}
