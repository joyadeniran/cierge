# Cierge — Your AI Customer Success Agent

Cierge autonomously **welcomes, onboards, and follows up with customers over the
phone**, turning every call into structured business intelligence. Built on
[CALL-E](https://www.heycall-e.com/) for the voice layer.

First deployment target: **Supplya** — a B2B procurement platform for Nigerian
retailers. Cierge automates the [Customer Success Executive role](https://app.emploihq.com/jobs/2):
call every new signup within 24h, onboard them, nudge the first order, and
capture feedback.

## Stack

- **Next.js (App Router)** — UI + API routes + webhooks, one deploy on Vercel
- **Supabase** — Postgres (customers, calls, insights, follow-ups)
- **CALL-E** (`@call-e/calle`) — outbound calls, conversation, structured results
- **Gemini** — fallback extraction / enrichment

## How it works

```
Supplya signup ──▶ POST /api/webhooks/supplya
                     └─ upsert customer, create call row
                     └─ calle.calls.create({ task, recipient, resultSchema, webhookUrl })
                          └─ CALL-E dials +234, runs onboarding conversation
CALL-E result ───▶ POST /api/webhooks/calle  (signature-verified)
                     └─ store insight, update customer, record follow-up
Dashboard  ◀────── / (Voice of Customer table)
```

The onboarding call script and the structured-result JSON schema live in
[`src/lib/flows/onboarding.ts`](src/lib/flows/onboarding.ts).

## Setup

1. `cp .env.example .env.local` and fill it in.
2. Create a Supabase project, run [`supabase/schema.sql`](supabase/schema.sql).
3. `calle auth login` (once) to get `CALLE_API_KEY`.
4. `npm run dev`

### Endpoints

| Route | Purpose |
|---|---|
| `POST /api/webhooks/supplya` | New-signup trigger (auth: `x-cierge-secret`) |
| `POST /api/calls/onboarding` | Manual "call now" — `{customerId}` or `{name,business_name,phone}` |
| `POST /api/webhooks/calle` | CALL-E terminal result (signature-verified) |
| `GET /` | Voice-of-Customer dashboard |

### Placing a test call

```bash
curl -X POST http://localhost:3000/api/calls/onboarding \
  -H 'content-type: application/json' \
  -d '{"name":"Sarah","business_name":"Grace Stores","phone":"+2348012345678"}'
```

> CALL-E needs a public `APP_URL` for result webhooks — use an ngrok tunnel in dev.

## Status

MVP: onboarding welcome call, end to end. Roadmap: reactivation & feedback
calls, CRM connectors (Salesforce/HubSpot), health monitoring, multilingual.
