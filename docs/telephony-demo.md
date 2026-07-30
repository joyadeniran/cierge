# Demo telephony — verified setup and findings

## Live values

| Thing | Value |
|---|---|
| Twilio number (CALL-E dials this) | **+1 629 330 9406** |
| Nigerian phone | +234 803 386 5501 |
| Phone number SID | `PN9ff18db3108ab8c2aafc10cdff45293f` |
| TwiML Bin — conference bridge (**active**) | `EH3d4ab4e02f47bc67531d7636a6ba04ae` |
| TwiML Bin — direct forward (kept, not active) | `EH065f4f20eccde28f89b1b66e1343c7d4` |
| Billing | Pay-as-you-go (upgraded — no verified-number restriction) |

## Verified facts (2026-07-30)

- **CALL-E will not dial +234 directly.** Rejected immediately at the API/agent layer.
- **CALL-E happily dials the US Twilio number.** The region restriction is on the destination, so a US number is the way in.
- **Twilio geo-permissions already allow Nigeria.** Confirmed with Voice → Geo Permissions → *Phone # Permission Check* against +2348033865501: *"Calling is enabled to this number."* Nigeria low-risk is enabled, $0.23–$0.235/min. **No change was needed here.**
- **The Twilio → +234 forward leg is blocked by the Nigerian carrier.** This is the real blocker, and it is not a Twilio configuration problem.

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

This is consistent with Nigerian carriers filtering international VoIP-originated calls presenting a foreign caller ID (anti-SIM-box / IRSF measures). It is not fixable from Twilio settings.

## The fix: conference bridge (currently active)

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

## Production path (post-hackathon)

Swap the voice provider behind `src/lib/calle.ts` + `src/lib/calls-service.ts` for one that terminates reliably in Nigeria:

- **Africa's Talking** — Nigeria-native Voice API, local termination, local rates.
- **Retell / Vapi + a Nigeria-capable SIP trunk** — bring your own carrier.
- **Twilio Elastic SIP** with a Nigerian carrier interconnect.

Keep the `startOnboardingCall()` interface; only the provider client changes. The webhook/ingest/dashboard layer is provider-agnostic and already proven.
