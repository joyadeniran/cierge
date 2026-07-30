# Deploying Cierge to Vercel

Cierge is a single Next.js app → one Vercel project. Deploying gives you a
public `APP_URL`, which CALL-E needs to deliver call-result webhooks (no ngrok).

## Option A — GitHub import (recommended: auto-deploys on push)

1. vercel.com → **Add New… → Project** → import **`joyadeniran/cierge`**.
2. Framework preset: **Next.js** (auto-detected). Leave build/output defaults.
3. Add **Environment Variables** (below), then **Deploy**.
4. After the first deploy, copy the production URL and set `APP_URL` to it,
   then redeploy (so the webhook URL CALL-E is told matches the live domain).

## Option B — CLI (I can run this headlessly with a token)

Create a token at vercel.com/account/tokens, then either paste it to me or run:

```bash
cd cierge
vercel link --yes --token "$VERCEL_TOKEN"
vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

## Environment variables (set all in Vercel → Settings → Environment Variables)

| Key | Value |
|---|---|
| `SUPABASE_URL` | `https://xovsiklkiqxmpmvioscc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` secret |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xovsiklkiqxmpmvioscc.supabase.co` (client auth — **build-time inlined, redeploy after adding**) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_WM1NX05uYcblbsNH8-wlJw_wyUZMNRp` (client auth — safe to expose) |
| `CALLE_API_KEY` | from `calle auth login` |
| `CALLE_WEBHOOK_SECRET` | CALL-E dashboard → webhooks (recommended in prod) |
| `APP_URL` | your Vercel production URL (set after first deploy) |
| `SUPPLYA_WEBHOOK_SECRET` | any strong random string (share with Supplya) |
| `COMPANY_NAME` | `Supplya` |
| `GEMINI_API_KEY` | optional, for fallback extraction |

## After deploy

- Point CALL-E's webhook (and/or `APP_URL`) at `https://<your-domain>/api/webhooks/calle`.
- Give Supplya the signup webhook: `https://<your-domain>/api/webhooks/supplya`
  with header `x-cierge-secret: <SUPPLYA_WEBHOOK_SECRET>`.
