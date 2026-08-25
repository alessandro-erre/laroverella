-- ============================================================
-- La roverella di Patrica — Notifiche push sul telefono
-- Esegui in: Supabase Dashboard → SQL Editor → RUN
-- Crea solo una tabella nuova: non tocca nessun dato esistente.
-- ============================================================

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Ogni utente gestisce solo i propri dispositivi
drop policy if exists "push_own_select" on public.push_subscriptions;
create policy "push_own_select" on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "push_own_insert" on public.push_subscriptions;
create policy "push_own_insert" on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "push_own_update" on public.push_subscriptions;
create policy "push_own_update" on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "push_own_delete" on public.push_subscriptions;
create policy "push_own_delete" on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- FINE. Se in basso appare "Success" è andato tutto bene.
