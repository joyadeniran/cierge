-- Cierge schema. Run in the Supabase SQL editor (or via the Supabase MCP).
-- Four tables: customers -> calls -> insights, plus follow_ups.
--
-- This file is the source of truth. It previously drifted from the live
-- database — it declared `unique (source, external_id)`, omitted the
-- suppression columns and `follow_ups.kind`, and omitted both unique indexes
-- the application's concurrency and identity guarantees depend on. A fresh run
-- therefore produced a database that silently violated those guarantees. Keep
-- any future migration in this file and in the database, in the same change.

create extension if not exists "pgcrypto";

-- People Cierge calls. Identity is (source, phone) — never external_id, which
-- is nullable, and which Postgres treats as distinct per NULL, so keying on it
-- minted a fresh customer on every manual call and fragmented their history.
create table if not exists customers (
  id                 uuid primary key default gen_random_uuid(),
  external_id        text,                          -- Supplya user id, when known
  source             text not null default 'supplya',
  name               text,
  business_name      text,
  phone              text not null,                 -- E.164, e.g. +2348012345678
  email              text,
  region             text not null default 'NG',
  locale             text not null default 'en-NG',
  status             text not null default 'new',   -- new|onboarding|active|at_risk|churned
  health_score       int,
  -- Suppression. Set only from positive refusal evidence in a transcript.
  do_not_call        boolean not null default false,
  do_not_call_reason text,
  do_not_call_at     timestamptz,
  created_at         timestamptz not null default now()
);

create unique index if not exists customers_source_phone_key
  on customers (source, phone);

-- One row per outbound call attempt cycle.
create table if not exists calls (
  id                    uuid primary key default gen_random_uuid(),
  customer_id           uuid not null references customers(id) on delete cascade,
  calle_call_id         text,                               -- CALL-E call_task id
  type                  text not null default 'onboarding', -- onboarding|reactivation|feedback
  status                text not null default 'queued',     -- queued|in_progress|completed|failed|canceled
  summary               text,
  task_completed        boolean,
  completion_confidence numeric,
  transcript            jsonb,
  failure_code          text,
  created_at            timestamptz not null default now(),
  completed_at          timestamptz
);

create index if not exists calls_customer_idx on calls(customer_id);
create index if not exists calls_calle_idx on calls(calle_call_id);

-- The concurrency guard: at most one non-terminal call per customer. The
-- INSERT in startOnboardingCall depends on this raising 23505, which the caller
-- turns into a 409. Without it, two workers or a redelivered webhook can both
-- dial the same person.
create unique index if not exists calls_one_active_per_customer
  on calls (customer_id)
  where status in ('queued', 'in_progress');

-- Structured extraction from a call that reached someone (the "voice of
-- customer" payload). Absent for calls that never reached a human.
create table if not exists insights (
  id                  uuid primary key default gen_random_uuid(),
  call_id             uuid not null references calls(id) on delete cascade,
  customer_id         uuid not null references customers(id) on delete cascade,
  business_type       text,
  goal                text,
  pain_points         jsonb,
  sentiment           text,          -- Positive|Neutral|Confused|Frustrated|Angry
  activation_status   text,          -- Interested|Activated|NotInterested|NeedsHumanFollowUp
  follow_up_required  boolean,
  wants_human_contact boolean,
  raw                 jsonb,         -- full structured_result from CALL-E
  created_at          timestamptz not null default now()
);

create index if not exists insights_customer_idx on insights(customer_id);
create index if not exists insights_call_idx on insights(call_id);

-- Workflow actions triggered off a call outcome.
--
-- `kind` is load-bearing: 'retry', 'review', and 'action' rows are each looked
-- up by (call_id, kind) to stay idempotent against at-least-once webhook
-- redelivery. That check is deliberately in the application and not a unique
-- index — a 23505 raised here has no catch site and would turn the CALL-E
-- webhook into a 500, provoking redelivery in a loop.
create table if not exists follow_ups (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  call_id     uuid references calls(id) on delete set null,
  channel     text not null,        -- email|whatsapp|task
  kind        text,                 -- retry|review|action
  reason      text,
  status      text not null default 'pending', -- pending|sent|failed
  payload     jsonb,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);

create index if not exists follow_ups_customer_idx on follow_ups(customer_id);

-- Every read and write goes through the service-role key, which bypasses RLS.
-- The publishable key is used only for auth (sign in, change password) and
-- never for `.from()` access. Enabling RLS with no policies is therefore
-- invisible to the application, and stops the public key from being able to
-- read the customer table through PostgREST.
alter table customers  enable row level security;
alter table calls      enable row level security;
alter table insights   enable row level security;
alter table follow_ups enable row level security;
