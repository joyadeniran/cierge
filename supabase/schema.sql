-- Cierge schema. Run in the Supabase SQL editor (or via the Supabase MCP).
-- Four tables: customers -> calls -> insights, plus follow_ups.

create extension if not exists "pgcrypto";

-- People Cierge calls. `external_id` is the Supplya user id.
create table if not exists customers (
  id            uuid primary key default gen_random_uuid(),
  external_id   text,
  source        text not null default 'supplya',
  name          text,
  business_name text,
  phone         text not null,            -- E.164, e.g. +2348012345678
  email         text,
  region        text not null default 'NG',
  locale        text not null default 'en-NG',
  status        text not null default 'new',   -- new|onboarding|active|at_risk|churned
  health_score  int,
  created_at    timestamptz not null default now(),
  unique (source, external_id)
);

-- One row per outbound call attempt cycle.
create table if not exists calls (
  id                    uuid primary key default gen_random_uuid(),
  customer_id           uuid not null references customers(id) on delete cascade,
  calle_call_id         text,                         -- CALL-E call_task id
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

-- Structured extraction from a completed call (the "voice of customer" payload).
create table if not exists insights (
  id                uuid primary key default gen_random_uuid(),
  call_id           uuid not null references calls(id) on delete cascade,
  customer_id       uuid not null references customers(id) on delete cascade,
  business_type     text,
  goal              text,
  pain_points       jsonb,
  sentiment         text,          -- Positive|Neutral|Confused|Frustrated|Angry
  activation_status text,          -- Interested|Activated|NotInterested|NeedsHumanFollowUp
  follow_up_required boolean,
  wants_human_contact boolean,
  raw               jsonb,         -- full structured_result from CALL-E
  created_at        timestamptz not null default now()
);
create index if not exists insights_customer_idx on insights(customer_id);

-- Workflow actions triggered off a call outcome.
create table if not exists follow_ups (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  call_id     uuid references calls(id) on delete set null,
  channel     text not null,        -- email|whatsapp|task
  reason      text,
  status      text not null default 'pending', -- pending|sent|failed
  payload     jsonb,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create index if not exists follow_ups_customer_idx on follow_ups(customer_id);
