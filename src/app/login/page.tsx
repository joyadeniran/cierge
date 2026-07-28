import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Sign in · Cierge" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  const safe = redirect && redirect.startsWith("/") ? redirect : "/";
  return <LoginForm redirect={safe} />;
}
