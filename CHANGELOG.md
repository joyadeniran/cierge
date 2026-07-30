# Changelog

All notable changes to Cierge are documented here.

---

## [Unreleased]

### Added
- `docs/demo-video-script.md` — shot-by-shot 3-minute script for the CALL-E hackathon submission,
  built around the verified live call. Opens on the real unfilled Supplya CS job posting, centres
  on an unedited live call, and lands on the spoken-yes → structured field → queued task chain.
  Includes a pre-flight checklist, retry guidance for carrier congestion, and a note on showing the
  failure mode honestly.

### Submitted
- **PR [#48](https://github.com/CALLE-AI/awesome-phone-call-agents/pull/48)** to
  `CALLE-AI/awesome-phone-call-agents` — new `customer-onboarding-call` Agent Skill generalising
  this workflow: one signup → one call → one structured result → at most one follow-up task.
  Ships four references (structured result schema, safety contract, international routing, worked
  examples) plus README entries. Encodes the hard-won lessons: terminal ≠ reached, carrier audio is
  transcribed as customer speech, don't diagnose a corridor from a single overnight attempt, and
  don't invert the product with a conference bridge. Repository validation passes; all examples use
  reserved fictional 555-01xx numbers with no real numbers, keys, or transcripts.


## [0.8.0] — 2026-07-30

### ✅ Verified working end to end — real onboarding conversation
`call_TydrEhLIRaFZzMIDGW5UPw` (12:35 WAT) completed a genuine onboarding call over the
**direct-forward** path: CALL-E → +1 629 330 9406 → Twilio `<Dial>` → +234 → answered.
1m42s, 15 transcript turns, completion confidence 0.94. Structured extraction was complete
and correct from natural speech:

```json
{ "business_type": "Retail Grocery",
  "goal": "Get more people to buy from the business, especially online buyers.",
  "pain_points": ["Wants to increase online orders, not just offline sales."],
  "sentiment": "Positive", "activation_status": "NeedsHumanFollowUp",
  "used_similar_before": false, "wants_human_contact": true, "follow_up_required": true }
```

The webhook/ingest path wrote the call row, transcript, insight row, and follow-up task with
no intervention. The "Not reached" handling from 0.7.0 correctly classified the adjacent
failed call and queued its own retry task.

### Corrected
- **Reverted to the direct-forward TwiML bin** (`EH065f4f20eccde28f89b1b66e1343c7d4`) and
  made it the documented default. The conference bridge inverted the product — it required
  the *customer* to dial in, which is the opposite of what Cierge does. Kept only as a
  fallback.
- **The +234 problem is intermittent congestion, not a permanent carrier block.** Two calls
  with identical config, two minutes apart: 12:35 succeeded, 12:37 failed with "All circuits
  are busy now." The earlier "permanently blocked" conclusion was drawn from a single 01:41 AM
  attempt that Twilio logged as *"No Answer"* with nobody awake to answer. Correct response is
  to retry, not to re-architect.
- `docs/telephony-demo.md` rewritten accordingly.


## [0.7.0] — 2026-07-30

### First live end-to-end call — pipeline verified
Placed the first real call (`call_kSCuBDBjUGwhoHK_mSmSMg`) via `POST /api/webhooks/supplya`.
**The Cierge pipeline works end to end:** CALL-E accepted the call and began the
onboarding script, the terminal webhook fired, and `ingestCallSnapshot` wrote the call
row with status, `task_completed`, confidence 0.9, summary, `completed_at`, and 7
transcript turns. No insight row — correctly, because CALL-E returned
`structured_result: null` (no conversation took place).

### Fixed
- **"Not reached" calls no longer look like successes.** A CALL-E call can end
  `status=completed` yet never reach a human. Previously that rendered as a green
  "Completed" with no follow-up, so a dropped signup appeared onboarded.
  - `ingest.ts`: terminal-but-unreached calls now queue a retry task via
    `recordUnreachedFollowUp()` instead of returning early
  - `followups.ts`: new `recordUnreachedFollowUp()`, idempotent against
    at-least-once webhook redelivery
  - `Badge.tsx`: new `OutcomeBadge` (Onboarded / Not reached / Failed / Queued /
    In progress) replacing the raw lifecycle `StatusBadge` across overview,
    conversations, and call detail
  - Overview stats: "Completed" → **"Reached"** (calls that produced a conversation);
    activation rate now divides by reached, not completed
  - Call detail: explicit banner explaining why a call wasn't reached
  - Backfilled the retry task for the first live call

### Twilio configuration (completed)
- Verified **Nigeria geo-permissions were already enabled** via *Phone # Permission Check*
  against +2348033865501 → "Calling is enabled to this number." No change needed.
- Confirmed account is **pay-as-you-go** (not trial) — no verified-number restriction.
- Created TwiML Bin `Cierge - forward to Nigeria` (`EH065f4f20eccde28f89b1b66e1343c7d4`)
  and pointed the number's voice webhook at it.

### Finding: Twilio → +234 is blocked by the Nigerian carrier
The forward leg returned carrier IVR, not a person: *"All circuits are busy now"* and
*"The facility to make outgoing calls from this number has been withdrawn."* Consistent
with Nigerian carriers filtering international VoIP-originated calls with a foreign
caller ID. **Not fixable from Twilio settings.**

### Fix: conference bridge (now active)
- Created TwiML Bin `Cierge - conference bridge` (`EH3d4ab4e02f47bc67531d7636a6ba04ae`)
  and switched the number to it. Both parties dial into conference `cierge-demo`, so the
  blocked inbound-to-Nigeria leg disappears (outbound *from* Nigeria works fine).
  `beep="false"` + `waitUrl=""` so no audio is mistaken for customer speech.
- `docs/telephony-demo.md` rewritten with verified values, the evidence transcript,
  the ordered demo sequence, and how to switch back.

## [0.6.0] — 2026-07-28

### Added — Authentication (Supabase Auth)
- **`@supabase/ssr`** cookie-based auth: browser client (`src/lib/supabase/client.ts`) + server client (`src/lib/supabase/server.ts`)
- **`middleware.ts`** — refreshes the session on every request and gates the app: unauthenticated users are redirected to `/login` (webhooks + `/api/health` stay public so CALL-E/Supplya can reach them). Fails open if the public env vars are missing so a premature deploy can't take the site down.
- **`/login`** — branded sign-in / sign-up page (email + password), redirect-aware
- **`/auth/callback`** — exchanges email-confirmation / OAuth `code` for a session
- **`/auth/signout`** — POST route that clears the session
- **`/account`** — profile page: email, member-since, last sign-in, user ID; **change-password** form; sign-out button
- **Sidebar** now shows the real signed-in user, links to `/account`, and has a sign-out button
- **Dashboard layout** verifies the user server-side (defense in depth) and passes the email to the sidebar
- Seeded a confirmed **admin@cierge.app** account via the service-role admin API (bypasses email-confirmation friction for the demo)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` added to `.env.local` + `.env.example`

### Security
- The money-spending `/api/calls/onboarding` and `/api/follow-ups/[id]` endpoints are now behind auth (previously public — anyone could burn CALL-E credits)

### Verified
- `next build` clean — 16 routes + middleware

## [0.5.0] — 2026-07-28

### Added — Full dashboard build-out
- **Shared dashboard layout** (`src/app/(dashboard)/layout.tsx`) — route group with sidebar shell; setup notice when Supabase env is missing
- **Routed sidebar** (`Sidebar.tsx`) — now uses Next `Link` + `usePathname` for real navigation and active-state highlighting
- **Conversations page** (`/conversations`) — full call list (customer, type, status, sentiment, time, summary)
- **Call detail page** (`/conversations/[id]`) — chat-style transcript (bot vs customer bubbles with timestamps), summary panel, extracted-insight panel (sentiment, activation, business type, goal, pain points, follow-up, completion confidence); handles missing transcript/insight gracefully; `notFound()` on bad id
- **Customers page** (`/customers`) — customer list with status pill, phone, call count, latest sentiment, joined date
- **Tasks page** (`/tasks`) — follow-up queue with channel/reason/status; interactive **Mark done / reopen** button
- **Analytics page** (`/analytics`) — sentiment distribution, activation funnel, top pain points, calls-over-time — all rendered with CSS bars (no external chart lib); stat tiles for total/completion/failed/open follow-ups
- **`PATCH /api/follow-ups/[id]`** — mark a follow-up sent/pending/failed (validates status enum, 404 on missing)
- **Shared query layer** (`src/lib/queries.ts`) — typed `getCalls`, `getCall`, `getCustomers`, `getFollowUps`, `getAnalytics`; every function returns `{ data, error }` so pages render an error banner instead of throwing
- **Shared UI primitives** (`src/components/ui.tsx`) — `PageHeader`, `Panel`, `ErrorBanner`, `EmptyState`, `relativeTime`, `Dash`
- **`FollowUpActions.tsx`** — client Mark-done button with optimistic refresh + error surface

### Changed
- Overview page moved into `(dashboard)` route group; slimmed to use the shared layout/shell and shared primitives; rows now link to the conversation detail
- Every list page handles empty state with a clear CTA and surfaces DB errors via `ErrorBanner`

### Verified
- `next build` clean — 12 routes compile (6 pages + 6 API routes)

## [0.4.0] — 2026-07-28

### Added
- **Design system implementation** (`globals.css`, `layout.tsx`, all components)
  - CSS design tokens from Cierge Design System v1.0 (`--ink`, `--orange`, `--mist`, `--line`, `--slate`, `--success`, etc.)
  - Google Fonts: Inter Tight (headings), Inter (body), JetBrains Mono (data/labels)
  - `Logo` component — `<cierge>` wordmark with orange brackets, Inter Tight Bold
  - `Badge` component — `SentimentBadge`, `StatusBadge`, `ActivationBadge`, `FollowUpBadge` — all pill-shaped, colour-coded per design system
  - `Sidebar` component — fixed dark (Ink #111111) sidebar, 196px, logo + nav + avatar
  - `StatCard` component — white card, Inter Tight headline, Mist separator
  - `DashboardActions` component (client) — "Call a customer" orange button with hover state
  - `CallNowModal` component (client) — modal with name/business/phone fields, loading spinner, success state, error banner; auto-closes and refreshes page on success; closes on Escape key

- **Full dashboard redesign** (`src/app/page.tsx`)
  - Dark sidebar + Mist main canvas layout matching Applications section of design spec
  - 4 stat tiles: Calls placed, Completed, Activation rate, Follow-ups needed
  - Real data from `calls` + `insights` tables (Promise.allSettled — one table failure won't kill the other)
  - Call table with 6 columns: Customer, Status, Sentiment, Activation, Follow-up, Summary
  - Row hover state, truncated summary with tooltip, relative timestamps
  - Empty state with CTA pointing to "Call a customer" button
  - DB error banner (red, shows project ref to diagnose wrong-key mistakes)

- **`SPEC.md`** — full product specification: architecture, DB schema, API contracts, call flow, env vars, design tokens, CALL-E constraints, demo flow
- **`CHANGELOG.md`** — this file

### Changed
- `layout.tsx` — replaced Geist fonts with Inter/Inter Tight/JetBrains Mono; updated metadata title/description
- `globals.css` — replaced default Next.js styles with Cierge design token definitions

---

## [0.3.0] — 2026-07-28

### Added
- `/api/health` endpoint — live DB reachability check, env var presence audit, project-ref match verification (no secrets exposed)

### Fixed
- `src/app/page.tsx` — DB errors now show a red banner ("Database error: ...") instead of silently rendering "No calls yet"
- `src/lib/calls-service.ts` — strip trailing slash from `APP_URL` before building webhook URL (prevented double-slash in CALL-E callback)

---

## [0.2.0] — 2026-07-27

### Added
- Supabase project `cierge` provisioned (id: `xovsiklkiqxmpmvioscc`, region: eu-west-1, free tier)
- Supabase schema applied via MCP migration (`init_cierge_schema`): tables `customers`, `calls`, `insights`, `follow_ups` with indexes
- `.env.local` written with `SUPABASE_URL`, `APP_URL`, `SUPPLYA_WEBHOOK_SECRET`, placeholder keys
- `.env.example` unexcluded from `.gitignore` (now tracked); `.env.local` remains ignored

### Fixed
- `.gitignore` — `!.env.example` exception added so the template is committed to the repo

### Docs
- `docs/telephony-demo.md` — step-by-step Twilio US-number forwarding guide for the hackathon demo (CALL-E +234 limitation workaround)
- `docs/deploy-vercel.md` — Vercel deploy guide (GitHub import path + CLI path + all env vars)

---

## [0.1.0] — 2026-07-27

### Added — Initial scaffold

- **Next.js 16 app** (App Router, TypeScript, Tailwind, Turbopack) bootstrapped via `create-next-app`
- **Dependencies:** `@call-e/calle@0.2.2`, `@supabase/supabase-js`, `@google/genai`, `zod`
- **`src/lib/calle.ts`** — lazy `CalleClient` singleton, `calleConfigured()` guard
- **`src/lib/supabase.ts`** — service-role Supabase client singleton, `supabaseConfigured()` guard
- **`src/lib/flows/onboarding.ts`** — onboarding call task string, `onboardingResultSchema` (JSON Schema for CALL-E structured extraction), `OnboardingInsight` type
- **`src/lib/calls-service.ts`** — `upsertCustomer()`, `startOnboardingCall()` (creates DB row + places CALL-E call with `resultSchema` + `webhookUrl` + idempotency key)
- **`src/lib/ingest.ts`** — `ingestCallSnapshot()`: updates call row, stores insight, reflects activation into customer status; idempotent via Supabase upsert
- **`src/lib/followups.ts`** — `maybeFollowUp()`: records `follow_ups` row for frustrated/angry/follow-up-flagged calls (send dispatch is a TODO)
- **`src/app/api/webhooks/supplya/route.ts`** — new-signup trigger; validates `x-cierge-secret`, E.164 phone, calls `upsertCustomer` + `startOnboardingCall`
- **`src/app/api/webhooks/calle/route.ts`** — CALL-E terminal event receiver; HMAC verification via `calle().webhooks.unwrap()`, falls back to raw parse when `CALLE_WEBHOOK_SECRET` unset; calls `ingestCallSnapshot`
- **`src/app/api/calls/onboarding/route.ts`** — manual trigger; accepts `{customerId}` or `{name, business_name, phone}`
- **`src/app/page.tsx`** — initial Voice-of-Customer dashboard (table of calls with sentiment/activation/follow-up columns)
- **`supabase/schema.sql`** — DDL for all 4 tables (source of truth; applied via Supabase MCP)
- **`README.md`** — product overview, stack, setup steps, endpoint table, test call snippet

### Architecture decision
- **Standalone product, Supplya as customer #0** (not embedded in supplya-backend)
- **Single Next.js app** (no separate Express API server)
- **CALL-E for hackathon (supported-region demo)** + separate provider path for Nigeria production
