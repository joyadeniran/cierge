# Demo Video Script — 3 minutes

For the CALL-E hackathon submission. Target ~2:50; judges score on real-world impact, idea
quality, technical depth, and demonstration clarity.

**The one rule:** show a real call happening. Everything else is supporting material. The single
most persuasive moment in this video is a phone actually ringing and a person talking to Cierge.

---

## Before you record

- [ ] Top up CALL-E credits (~$0.05/call, so $5 is plenty of runway for retakes)
- [ ] Confirm the Twilio number points at **Cierge - forward to Nigeria**
- [ ] Sign in to https://cierge-one.vercel.app so the dashboard is ready
- [ ] Have the dashboard on screen and your phone in shot or on speaker
- [ ] Do one throwaway practice call — roughly half of attempts hit carrier congestion, so
      budget for a retry. If you hear "all circuits are busy", just trigger again.
- [ ] Optional: clear old test rows so the dashboard reads cleanly

---

## 0:00–0:20 — The problem, stated as a real job

> "This is a job posting from my company, Supplya. We're hiring a Customer Success Executive for
> ₦100,000 a month. Their whole job is on this screen: call every new signup within 24 hours,
> onboard them, and find out why they joined.
>
> We never filled it. So most of our signups were never called at all."

**On screen:** the emploihq job posting, scrolling the responsibilities.

*Why this opens well: it's a real unfilled role at a real company, not a hypothetical persona.*

---

## 0:20–0:40 — What Cierge is

> "Cierge is an AI customer success agent that does that job. It calls every new customer, has a
> real conversation, and turns it into structured data your team can act on.
>
> It's built on CALL-E for the voice layer."

**On screen:** the Voice-of-Customer dashboard. Let the empty-ish state breathe — it's about to
fill in live.

---

## 0:40–1:10 — Trigger the call

> "When someone signs up on Supplya, our backend calls a Cierge webhook. Let me trigger that now."

**On screen:** either click **Call a customer** in the dashboard, or show the webhook fire:

```bash
curl -X POST https://cierge-one.vercel.app/api/webhooks/supplya \
  -H 'content-type: application/json' \
  -H 'x-cierge-secret: ***' \
  -d '{"external_id":"demo","name":"Joy","business_name":"Grace Stores","phone":"+1**********"}'
```

> "CALL-E places the call. My phone should ring in a moment."

*Mask the secret and the number on screen.*

---

## 1:10–2:00 — The call itself (the centrepiece)

**Let this run. Do not narrate over it.** Answer on speaker and have the actual conversation.

Cierge will: greet you by name, introduce itself, ask consent and mention recording, then ask what
business you run, why you signed up, what you're trying to solve, and whether you've used anything
similar — then offer a human follow-up and wrap up.

Answer naturally and briefly. Real, slightly messy answers are more convincing than polished ones.
Suggested beats, roughly what happened in the verified run:

- "We sell groceries."
- "I signed up so more people can buy from me."
- "We get online orders daily — I want more online, not just offline."
- "No, I haven't used anything like this."
- When it offers a follow-up: **"Sure, that would be great."** ← this one matters, it becomes a task

*Trim the ringing and any dead air in the edit. Keep the conversation itself unedited — its
naturalness is the proof.*

---

## 2:00–2:35 — The payoff: conversation becomes data

> "The call is over. Watch what happened without anyone touching it."

**On screen:** refresh the dashboard, then open the conversation detail.

Point at, in this order:

1. **The transcript** — the full exchange, turn by turn
2. **The extracted insight** — business type *Retail Grocery*, the goal, the pain point, sentiment
   *Positive*, activation *NeedsHumanFollowUp*
3. **Tasks** — the follow-up task now sitting in the queue

> "I never said the words 'needs human follow-up'. I said 'sure, that would be great' — and Cierge
> turned that into a field, and then into a task assigned to my team.
>
> That's the whole idea: every call becomes structured business intelligence, not a recording
> nobody listens to."

*This is the money shot. Spend time here. The spoken-yes → field → task chain is the argument.*

---

## 2:35–2:50 — Honesty and close

> "One real constraint: CALL-E doesn't dial Nigerian numbers directly, so calls route through a US
> number that forwards to my phone. International termination is unreliable, so Cierge treats a call
> that didn't reach anyone as 'not reached', never as a success, and automatically queues a retry."

**On screen:** briefly show a **Not reached** row with its retry task.

> "Cierge is live, it's open source, and it's doing a job we couldn't hire for. Every customer gets
> the welcome call. Nobody gets missed."

**End card:** `<cierge>` logo · cierge-one.vercel.app · github.com/joyadeniran/cierge

---

## Notes

**Show the failure honestly.** Judges have seen a hundred demos where everything works perfectly.
Fifteen seconds acknowledging a real constraint — and showing that the product handles it — reads
as engineering maturity, not weakness. It also happens to be true.

**Don't demo the dashboard for its own sake.** Analytics and Customers pages are worth at most a
two-second pan. The call and the extraction are the story.

**If the call fails on camera:** keep rolling, say "that's the carrier congestion I mentioned",
trigger again. A recovered failure is more credible than a cut.

**Consent:** you're recording a call you're a party to, on your own number, for your own product.
If you feature anyone else's voice, get their agreement first and say so on camera.
