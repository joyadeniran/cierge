# Demo telephony — verified setup and findings

## Live values

| Thing | Value |
|---|---|
| Twilio number (CALL-E dials this) | **+1 629 330 9406** |
| Nigerian phone | +234 803 386 5501 |
| Phone number SID | `PN9ff18db3108ab8c2aafc10cdff45293f` |
| TwiML Bin — direct forward (**active — use this**) | `EH065f4f20eccde28f89b1b66e1343c7d4` |
| TwiML Bin — conference bridge (kept, not active) | `EH3d4ab4e02f47bc67531d7636a6ba04ae` |
| Billing | Pay-as-you-go (upgraded — no verified-number restriction) |

## ✅ It works — verified end to end (2026-07-30 12:35 WAT)

`call_TydrEhLIRaFZzMIDGW5UPw` — a real onboarding conversation over the **direct forward**
path: CALL-E → +1 629 330 9406 → Twilio `<Dial>` → +234 803 386 5501 → answered.
1m42s, 15 turns, completion confidence 0.94, and a fully populated structured result
(business type, goal, pain points, sentiment, activation status, human-contact flag).
The insight row and follow-up task were written automatically by the webhook/ingest path.

**Use the direct-forward bin.** It is the correct product shape: Cierge calls the customer.
The conference bridge (below) makes the *customer* dial in, which inverts the product — it
exists only as a fallback and should not be used for demos.

### The +234 issue is intermittent congestion, not a block

Two calls, same configuration, two minutes apart:

- **12:35:22 — succeeded.** Full conversation.
- **12:37:12 — failed.** `"All circuits are busy now. Please try again later."`

So Twilio→+234 termination is *unreliable*, not blocked. An earlier conclusion that the
Nigerian carrier permanently blocks it was over-drawn from a single **01:41 AM** attempt
that Twilio logged as **"No Answer"** while nobody was awake to pick up.

**Design for retries.** Budget roughly one retry per attempt; CALL-E's own failure summary
suggests waiting ~45 minutes, though an immediate retry often succeeds. Cierge already
queues a retry task automatically whenever a call ends without reaching anyone.

## Reference facts (2026-07-30)

- **CALL-E will not dial +234 directly.** Rejected immediately at the API/agent layer.
- **CALL-E happily dials the US Twilio number.** The region restriction is on the destination, so a US number is the way in.
- **Twilio geo-permissions already allow Nigeria.** Confirmed with Voice → Geo Permissions → *Phone # Permission Check* against +2348033865501: *"Calling is enabled to this number."* Nigeria low-risk is enabled, $0.23–$0.235/min. **No change was needed here.**
- **The Twilio → +234 forward leg is unreliable but works.** Roughly half of attempts hit carrier congestion; retry.

### Evidence

First live call (`call_kSCuBDBjUGwhoHK_mSmSMg`). CALL-E connected and began the script; the audio it received back from the forward leg was carrier IVR, not a person:

```
bot   0s   "Hi Joy,"
bot   0s   "this is Cierge from Supplya, a B2B procurement platform that helps retailers,"
user  4s   "All circuits are busy now. Please try again later."
bot   6s   "Okay."
user  13s  "All circuits are busy now. Please try again later."
bot   15s  "No rush."
user  25s  "The facility to make outgoing calls from this number has been withdrawn."
```

CALL-E's own summary: *"The call could not reach Joy because the phone network reported a dialing/caller-line restriction."*

At the time this looked like a permanent carrier block. It isn't — the same configuration
succeeded at 12:35 WAT. Read it as congestion plus, in this instance, a 1:41 AM call nobody
answered. Retry rather than re-architect.

## Fallback: conference bridge (not active — avoid for demos)

Instead of Twilio calling *into* Nigeria, **both parties dial into the same conference.** Outbound calls *from* Nigeria to a US number work normally, so the blocked leg disappears entirely.

```
You (+234) ──dial──▶ +1 629 330 9406 ──▶ conference "cierge-demo"
                                              ▲
CALL-E     ──dial──▶ +1 629 330 9406 ─────────┘
```

TwiML (bin `EH3d4ab4e02f47bc67531d7636a6ba04ae`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response><Dial><Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="false" waitUrl="">cierge-demo</Conference></Dial></Response>
```

`waitUrl=""` and `beep="false"` matter — hold music or beeps would be transcribed as customer speech and corrupt the extraction.

### Demo sequence (order matters)

1. **Call +1 629 330 9406 from your phone first.** You'll hear silence — you're in the conference, waiting.
2. **Trigger the Cierge call** (dashboard → *Call a customer* → phone `+16293309406`, or the curl below).
3. CALL-E joins the same conference and starts the onboarding conversation. Talk to it normally.
4. Hang up. CALL-E finalises, posts to `/api/webhooks/calle`, and the insight appears on the dashboard.

```bash
curl -X POST https://cierge-one.vercel.app/api/webhooks/supplya \
  -H 'content-type: application/json' \
  -H 'x-cierge-secret: <SUPPLYA_WEBHOOK_SECRET>' \
  -d '{"external_id":"demo-002","name":"Joy","business_name":"Grace Stores","phone":"+16293309406"}'
```

> Trigger via the webhook (shared-secret auth) or the signed-in dashboard — `/api/calls/onboarding` is behind login.

If nobody is in the conference when CALL-E joins, it talks into silence and the call is recorded as **Not reached** with a retry task queued. That is correct behaviour, not a bug.

### Switching back to direct forward

Phone Numbers → Active numbers → +1 629 330 9406 → Configure → *A call comes in* → TwiML Bin → **Cierge - forward to Nigeria**. Worth retrying occasionally: "all circuits are busy" is partly congestion, so it may succeed on another day or another Nigerian carrier.

## Troubleshooting

### Call fails instantly with `获取机器人失败` — check the CALL-E balance first

Symptoms: `status: failed`, `failure_code: call_failed`, attempt
`failure_code: 获取机器人失败` ("failed to fetch bot"), **`started_at: null`**, zero
transcript turns, `$0.00` billed. The CALL-E event log shows `botlab create bot` → a long
gap → `resolve robot id` → init failed. API create latency also degrades to ~30s.

**This is not a Twilio or TwiML problem — Twilio is never reached.** The call never dials.

Observed 2026-07-30: the first call succeeded at exactly **$1.00** balance (cost $0.05 for
29s ⇒ ~$0.10/min). Every call afterwards, at **$0.95** with a *"Low Balance"* flag, failed
this way. Working theory: **CALL-E requires ≥$1.00 available to provision a call.**

Fix: `dashboard.heycall-e.com` → **Billing** → **Top Up Balance**. Budget ~$0.10/min;
$5–10 covers testing plus recording the demo video.

### Inbound call answers then goes silent

Expected when you're the only participant in the conference. `beep="false"` is deliberate
so CALL-E doesn't transcribe beeps as customer speech. Stay on the line until the Cierge
call joins.

## Production path (post-hackathon)

Swap the voice provider behind `src/lib/calle.ts` + `src/lib/calls-service.ts` for one that terminates reliably in Nigeria:

- **Africa's Talking** — Nigeria-native Voice API, local termination, local rates.
- **Retell / Vapi + a Nigeria-capable SIP trunk** — bring your own carrier.
- **Twilio Elastic SIP** with a Nigerian carrier interconnect.

Keep the `startOnboardingCall()` interface; only the provider client changes. The webhook/ingest/dashboard layer is provider-agnostic and already proven.
