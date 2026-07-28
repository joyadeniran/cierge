# Cierge — Product Specification

**Tagline:** Your AI Customer Success Agent  
**Hackathon:** CALL-E Devpost (deadline 2026-09-14, $10k prize pool)  
**Repo:** https://github.com/joyadeniran/cierge  
**Live:** https://cierge-one.vercel.app

---

## What it is

Cierge is a standalone AI voice agent that autonomously welcomes, onboards, and follows up with customers over the phone. Every call is turned into structured business intelligence — sentiment, goal, pain points, activation status — and stored for the team to act on.

**Customer #0:** Supplya (B2B procurement platform, Lagos). Cierge automates their "Customer Success Executive" role (contact every signup within 24h, onboard, nudge first order, capture feedback).

---

## Architecture

```
Supplya signup  ──POST──▶  /api/webhooks/supplya
                             └─ upsert customer
                             └─ POST to CALL-E SDK: plan + dial
CALL-E result   ──POST──▶  /api/webhooks/calle  (HMAC-verified)
                             └─ ingest structured_result
                             └─ store insight
                             └─ record follow-up
Manual trigger  ──POST──▶  /api/calls/onboarding
Dashboard       ◀──GET───  /  (server component, supabase query)
Health check    ◀──GET───  /api/health
```

### Stack

| Layer | Technology |
|---|---|
| App | Next.js 16, App Router (one Vercel deploy) |
| DB | Supabase (Postgres) |
| Voice | CALL-E SDK (`@call-e/calle` v0.2.2) |
| AI extraction | CALL-E native (resultSchema) + Gemini fallback |
| Deploy | Vercel — https://cierge-one.vercel.app |

---

## Database schema

### `customers`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| external_id | text | Supplya user ID |
| source | text | default `supplya` |
| name | text | |
| business_name | text | |
| phone | text | E.164 |
| email | text | |
| region | text | default `NG` |
| locale | text | default `en-NG` |
| status | text | new / onboarding / active / at_risk / churned |
| health_score | int | |
| created_at | timestamptz | |

### `calls`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| customer_id | uuid FK | → customers |
| calle_call_id | text | CALL-E call_task id |
| type | text | onboarding / reactivation / feedback |
| status | text | queued / in_progress / completed / failed / canceled |
| summary | text | CALL-E summary |
| task_completed | boolean | |
| completion_confidence | numeric | 0–1 |
| transcript | jsonb | |
| failure_code | text | |
| created_at | timestamptz | |
| completed_at | timestamptz | |

### `insights`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| call_id | uuid FK | → calls |
| customer_id | uuid FK | → customers |
| business_type | text | |
| goal | text | primary reason for signup |
| pain_points | jsonb | string[] |
| sentiment | text | Positive / Neutral / Confused / Frustrated / Angry |
| activation_status | text | Activated / Interested / NotInterested / NeedsHumanFollowUp |
| follow_up_required | boolean | |
| wants_human_contact | boolean | |
| raw | jsonb | full CALL-E structured_result |
| created_at | timestamptz | |

### `follow_ups`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| customer_id | uuid FK | |
| call_id | uuid FK | |
| channel | text | email / whatsapp / task |
| reason | text | |
| status | text | pending / sent / failed |
| payload | jsonb | |
| created_at | timestamptz | |
| sent_at | timestamptz | |

---

## API contracts

### `POST /api/webhooks/supplya`
Trigger an onboarding call for a new Supplya signup.

**Auth:** `x-cierge-secret: <SUPPLYA_WEBHOOK_SECRET>`

**Body:**
```json
{
  "external_id": "usr_abc123",
  "name": "Sarah Adeyemi",
  "business_name": "Grace Stores",
  "phone": "+15551234567",
  "email": "sarah@grace.ng"
}
```

**Success:** `{ ok: true, customerId, callId, calleCallId, status }`  
**Errors:** 401 (bad secret), 400 (invalid phone), 500 (internal)

---

### `POST /api/calls/onboarding`
Manual "call now" trigger — used by the dashboard modal and for testing.

**Body (existing customer):** `{ "customerId": "<uuid>" }`  
**Body (new customer):** `{ "name", "business_name", "phone" (E.164) }`

**Success:** `{ ok: true, customerId, callId, calleCallId, status }`  
**Errors:** 400 (invalid phone), 404 (customer not found), 500

---

### `POST /api/webhooks/calle`
CALL-E terminal event receiver (`call.completed | call.failed | call.result_validation_failed`).

**Auth:** HMAC signature via `CALLE_WEBHOOK_SECRET` (optional; skipped when env unset, dev only).

**Body:** CALL-E `WebhookEvent` (see SDK `webhooks.d.ts`). Key field: `event.data` = `CallTask` snapshot with `structured_result` and per-recipient results.

**Success:** `{ ok: true }`  
**Errors:** 400 (bad signature or parse), 500 (ingest failure)

---

### `GET /api/health`
Diagnostic — reports env presence and live DB reachability (no secrets leaked).

**Response example:**
```json
{
  "ok": true,
  "project": { "urlRef": "xovsiklkiqxmpmvioscc", "keyRef": "xovsiklkiqxmpmvioscc", "match": true },
  "env": { "SUPABASE_URL": true, "CALLE_API_KEY": true, ... },
  "db": { "ok": true, "error": null },
  "deployedAt": "2026-07-28T00:00:00Z"
}
```

---

## Onboarding call flow

1. **Welcome** — greet by name, introduce Cierge, ask consent + recording notice.
2. **Discovery** — business type, signup reason, challenges, prior platform experience.
3. **Nudge** — encourage placing first Supplya order; offer to connect with a human if needed.
4. **FAQ handling** — answer only what Cierge knows; anything uncertain → offer human follow-up.
5. **Wrap-up** — summarise next steps, thank customer.

**Structured result schema (`resultSchema`):**
```json
{
  "business_name": "string",
  "business_type": "string",
  "goal": "string",
  "pain_points": ["string"],
  "used_similar_before": "boolean",
  "sentiment": "Positive | Neutral | Confused | Frustrated | Angry",
  "activation_status": "Activated | Interested | NotInterested | NeedsHumanFollowUp",
  "wants_human_contact": "boolean",
  "follow_up_required": "boolean",
  "notes": "string"
}
```

---

## Design system

Defined in `Cierge Design System.dc.html` (Claude Design project `0bfefda0-e04e-4387-8009-04650bbccb8f`).

| Token | Value |
|---|---|
| `--ink` | #111111 |
| `--white` | #FFFFFF |
| `--orange` | #FF5A1F |
| `--orange-h` | #E04A11 |
| `--orange-s` | #FFF1EB |
| `--slate` | #667085 |
| `--mist` | #F7F8FA |
| `--line` | #E7E9EE |
| `--success` | #22C55E |

**Fonts:** Inter Tight (headings), Inter (body), JetBrains Mono (data/labels).  
**Logo:** `<cierge>` — Inter Tight Bold, orange brackets, ink wordmark.

---

## Environment variables

| Key | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | ✅ | `https://xovsiklkiqxmpmvioscc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service-role secret (never client-side) |
| `CALLE_API_KEY` | ✅ | From `calle auth login` |
| `CALLE_WEBHOOK_SECRET` | ⚠️ | Recommended in prod; dev skips verify |
| `APP_URL` | ✅ | Public URL — must not have trailing slash |
| `SUPPLYA_WEBHOOK_SECRET` | ✅ | Shared secret with Supplya backend |
| `COMPANY_NAME` | optional | Default: `Supplya` |
| `GEMINI_API_KEY` | optional | Fallback extraction |

---

## CALL-E constraints (as of 2026-07-28)

- **Nigeria (+234) not supported.** Supported: US, Canada, Australia, India, Singapore, Malaysia, UAE, Netherlands, Poland, Bangladesh, China.
- **Demo workaround:** Use a US Twilio number that forwards inbound to your +234 phone. See `docs/telephony-demo.md`.
- **Production path (post-hackathon):** Swap voice provider behind `src/lib/calle.ts` for Africa's Talking, or Retell/Vapi + Nigeria SIP trunk.

---

## Demo flow (for the video)

1. Open `https://cierge-one.vercel.app` — Voice of Customer dashboard.
2. Click **Call a customer** → fill in name, business, US forwarding number → **Call now**.
3. Your Nigerian phone rings. Cierge conducts the onboarding conversation.
4. Call ends → CALL-E hits the webhook → structured insight appears in the table.
5. Show: sentiment badge, activation status, goal, follow-up flag.
6. Optional: show `/api/health` JSON for technical credibility.
