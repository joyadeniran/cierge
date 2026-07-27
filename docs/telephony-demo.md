# Demo telephony: calling yourself in Nigeria via a supported region

CALL-E cannot dial **+234 (Nigeria)**. Supported regions: US, Canada, Australia,
India, Singapore, Malaysia, UAE, Netherlands, Poland, Bangladesh, China.

For the hackathon demo we make CALL-E dial a **US Twilio number** that
**forwards** the call to your Nigerian phone. You answer in Lagos; CALL-E thinks
it called a US number. Perfect for recording the demo video.

```
CALL-E ──dials──▶ +1 US Twilio number ──TwiML <Dial>──▶ +234 your phone
```

## One-time Twilio setup (your account — needs your login + payment)

1. **Buy a US local number** with *Voice* capability
   (Twilio Console → Phone Numbers → Buy a number → Country: United States → Voice ✓). ~$1.15/mo.
2. **Enable Nigeria for outbound voice**
   (Console → Voice → Settings → **Geographic Permissions** → tick **Nigeria**).
   Without this, the forward leg to +234 is blocked.
3. **Create a TwiML Bin** (Console → Developer tools → TwiML Bins → Create):
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <Response>
     <Dial callerId="{{YOUR_TWILIO_NUMBER_E164}}">+234XXXXXXXXXX</Dial>
   </Response>
   ```
   Replace `+234XXXXXXXXXX` with your real Nigerian mobile.
4. **Point the number at the bin**
   (Phone Numbers → your number → Voice → *A call comes in* → **TwiML Bin** → select it → Save).

## Test it

Place an onboarding call to the **US Twilio number** (E.164, e.g. `+15551234567`):

```bash
curl -X POST "$APP_URL/api/calls/onboarding" \
  -H 'content-type: application/json' \
  -d '{"name":"Sarah","business_name":"Grace Stores","phone":"+15551234567"}'
```

Your Nigerian phone should ring, and Cierge's onboarding conversation begins.
When it ends, the insight appears on the dashboard (`/`).

> Note: the `customers.region`/`locale` still say `NG`/`en-NG` by default, which
> only hints CALL-E's conversation locale — the **dialed number** is what must be
> in a supported region. For the demo, pass the US number as `phone`.

## Production path (real +234, post-hackathon)

Swap the voice provider behind `src/lib/calle.ts` + `src/lib/calls-service.ts`
for a Nigeria-capable one. Candidates to spike (none verified yet):
- **Africa's Talking** — Nigeria-native Voice API.
- **Retell / Vapi + SIP trunk** — bring a Nigeria-capable carrier via SIP.
- **Twilio Elastic SIP** with Nigeria outbound enabled.
Keep the same `startOnboardingCall()` interface; only the provider client changes.
