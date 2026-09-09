import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie and gates the app: unauthenticated
 * users are redirected to /login (except public paths).
 *
 * Ordering matters here. This runs on every request, so anything it awaits is
 * on the critical path of the whole site — including the webhook endpoints
 * CALL-E and Supplya post to. When the Supabase project behind it became
 * unreachable, `auth.getUser()` hung until Vercel killed the invocation and
 * every route returned 504, webhooks included. Two rules came out of that:
 *
 *   1. Machine-to-machine routes return before any auth work happens. They
 *      authenticate themselves with shared secrets and signatures; they must
 *      never be able to fail because the auth backend is having a bad day.
 *   2. The session lookup is bounded. If it does not answer, treat the request
 *      as signed out and let the login page render, rather than timing out.
 */

/** Ceiling on the session lookup. Past this we stop waiting and redirect. */
const AUTH_TIMEOUT_MS = 2_500;

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Rule 1: callers that carry their own credentials. `/api/webhooks/*` is
  // secret- and signature-checked in the route, and `/api/calls/reconcile`
  // fails closed on its shared secret. None of them has a browser session to
  // refresh, so there is nothing to gain by consulting Supabase first.
  if (
    path.startsWith("/api/webhooks") ||
    path === "/api/health" ||
    path === "/api/calls/reconcile"
  ) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  // Safety net: if the public Supabase env isn't configured (e.g. a deploy
  // landed before the Vercel env vars were set), don't hard-crash every route.
  // Auth enforcement resumes automatically once the env vars are present.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Rule 2: bounded. A hung or unreachable auth backend resolves to "no user",
  // which costs a signed-in visitor a trip through /login. The alternative is a
  // gateway timeout on every page, which costs them the site.
  const user = await getUserOrNull(supabase);

  const isPublic = path === "/login" || path.startsWith("/auth");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // Already signed in but visiting /login → send to dashboard
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

/** Resolve the session, or null if Supabase errors or does not answer in time. */
async function getUserOrNull(
  supabase: ReturnType<typeof createServerClient>
): Promise<unknown | null> {
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), AUTH_TIMEOUT_MS)),
    ]);
    if (!result) {
      console.warn(`auth.getUser timed out after ${AUTH_TIMEOUT_MS}ms — treating as signed out`);
      return null;
    }
    return result.data.user ?? null;
  } catch (e) {
    console.warn(`auth.getUser failed — treating as signed out: ${String(e)}`);
    return null;
  }
}

export const config = {
  matcher: [
    // Run on everything except static assets and image files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
