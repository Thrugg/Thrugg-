-- One-time setup for the "ask" function's daily cap. Supabase dashboard → SQL Editor → New query → paste → Run.
-- Safe to run again. Only the function (service role) reads and writes it; signed-in users cannot see it.
create table if not exists public.ask_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  n integer not null default 0,
  primary key (user_id, day)
);
alter table public.ask_usage enable row level security;
-- No policies on purpose: with row-level security on and no policy, only the service role can use the table.
