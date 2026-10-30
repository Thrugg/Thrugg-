-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Creates the two tables the apps sync to. Row-level security means each row belongs to the
-- signed-in account that wrote it, and nobody else can read or change it.

-- Cordée: logbook entries, bucket list, edited hikes, traced routes, shared settings
create table if not exists public.cordee_items (
  id text primary key,
  kind text not null,
  data jsonb,
  deleted boolean not null default false,
  client_ts timestamptz not null,
  updated_at timestamptz not null default now(),
  owner uuid not null default auth.uid()
);
create index if not exists cordee_items_updated on public.cordee_items (updated_at);
alter table public.cordee_items enable row level security;
drop policy if exists "owner only" on public.cordee_items;
create policy "owner only" on public.cordee_items for all
  using (auth.uid() = owner) with check (auth.uid() = owner);

-- Other apps (Safety Net Score, Gains & Greeks, …): one saved state per app
create table if not exists public.app_state (
  owner uuid not null default auth.uid(),
  app text not null,
  data jsonb,
  client_ts timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (owner, app)
);
alter table public.app_state enable row level security;
drop policy if exists "owner only" on public.app_state;
create policy "owner only" on public.app_state for all
  using (auth.uid() = owner) with check (auth.uid() = owner);

-- Keep updated_at current on every write
create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists cordee_touch on public.cordee_items;
create trigger cordee_touch before insert or update on public.cordee_items
  for each row execute function public.touch_updated_at();
drop trigger if exists app_state_touch on public.app_state;
create trigger app_state_touch before insert or update on public.app_state
  for each row execute function public.touch_updated_at();
