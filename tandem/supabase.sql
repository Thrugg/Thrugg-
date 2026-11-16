-- Tandem: the link between two learners. Run once in Supabase: SQL Editor → New query → paste → Run.
-- Safe to run again. Only needed for the "learn in tandem" part; Tandem works alone without it.
--
-- Each learner keeps one row per tandem: their name and colour, the cards they flagged for the other
-- to check, their answers to the other's flags, and a few totals for the shared view. A row can only be
-- written by its owner. It can be read by its owner and by the one other account that joined the same
-- tandem code. A code holds two people at most. The decks, the review history and the person's own cards
-- stay in app_state (one row per account) and are never shared.

create table if not exists public.tandem_pair (
  pair text not null check (char_length(pair) between 16 and 64),
  owner uuid not null default auth.uid(),
  data jsonb,
  client_ts timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (pair, owner)
);
alter table public.tandem_pair enable row level security;

-- Read through security-definer helpers, so the policies below do not query the table they protect.
create or replace function public.tandem_member(p text) returns boolean
  language sql security definer stable set search_path = public
  as $$ select exists (select 1 from public.tandem_pair where pair = p and owner = auth.uid()) $$;
create or replace function public.tandem_others(p text) returns integer
  language sql security definer stable set search_path = public
  as $$ select count(*)::int from public.tandem_pair where pair = p and owner <> auth.uid() $$;
revoke all on function public.tandem_member(text) from public;
revoke all on function public.tandem_others(text) from public;
grant execute on function public.tandem_member(text) to authenticated;
grant execute on function public.tandem_others(text) to authenticated;

drop policy if exists "tandem read" on public.tandem_pair;
create policy "tandem read" on public.tandem_pair for select to authenticated
  using (owner = auth.uid() or public.tandem_member(pair));
drop policy if exists "tandem join" on public.tandem_pair;
create policy "tandem join" on public.tandem_pair for insert to authenticated
  with check (owner = auth.uid() and public.tandem_others(pair) < 2);
drop policy if exists "tandem write" on public.tandem_pair;
create policy "tandem write" on public.tandem_pair for update to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists "tandem leave" on public.tandem_pair;
create policy "tandem leave" on public.tandem_pair for delete to authenticated
  using (owner = auth.uid());

create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists tandem_touch on public.tandem_pair;
create trigger tandem_touch before insert or update on public.tandem_pair
  for each row execute function public.touch_updated_at();
