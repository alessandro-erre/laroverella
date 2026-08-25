-- ============================================================
-- La roverella di Patrica — FIX notifiche (v2)
-- Esegui TUTTO in: Supabase Dashboard → SQL Editor → RUN
-- Sostituisce il file 03-notifiche.sql precedente.
-- ============================================================

-- 1. Il vincolo sui tipi accettava solo 3 valori: lo allarghiamo.
--    (era la causa del blocco: i nuovi trigger venivano rifiutati)
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('new_post','new_comment','new_reaction','new_article','comment_reply','reaction'));

-- 2. Permesso di inserimento
drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications for insert to authenticated
  with check (true);

-- 3. Profili mancanti: senza riga in `profiles` un utente non riceve notifiche.
--    a) crea i profili mancanti per chi è già iscritto
insert into public.profiles (id, name)
select u.id, coalesce(u.raw_user_meta_data->>'name', split_part(u.email,'@',1))
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

--    b) assicura la creazione automatica al prossimo login/registrazione
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. NUOVO POST → a tutti tranne l'autore
create or replace function public.notify_new_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, payload)
  select p.id, 'new_post', jsonb_build_object('post_id', new.id, 'preview', left(coalesce(new.text,''), 80))
  from public.profiles p
  where p.id <> new.author_id and coalesce(p.push_notifications, true) = true;
  return new;
end $$;

drop trigger if exists on_post_created on public.posts;
create trigger on_post_created after insert on public.posts
  for each row execute function public.notify_new_post();

-- 5. NUOVO COMMENTO → autore del post + chi ha già commentato
create or replace function public.notify_new_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare who text;
begin
  select coalesce(name,'Un membro') into who from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, type, payload)
  select distinct t.uid, 'new_comment',
         jsonb_build_object('post_id', new.post_id, 'who', who, 'preview', left(coalesce(new.text,''), 80))
  from (
    select author_id as uid from public.posts where id = new.post_id
    union
    select user_id as uid from public.comments where post_id = new.post_id
  ) t
  join public.profiles p on p.id = t.uid
  where t.uid is not null and t.uid <> new.user_id
    and coalesce(p.push_notifications, true) = true;
  return new;
exception when others then
  return new; -- una notifica fallita non deve mai bloccare il commento
end $$;

drop trigger if exists on_comment_created on public.comments;
create trigger on_comment_created after insert on public.comments
  for each row execute function public.notify_new_comment();

-- 6. NUOVA REAZIONE → autore del post
create or replace function public.notify_new_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare who text; target uuid;
begin
  select author_id into target from public.posts where id = new.post_id;
  if target is null or target = new.user_id then return new; end if;
  select coalesce(name,'Un membro') into who from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, type, payload)
  select target, 'new_reaction', jsonb_build_object('post_id', new.post_id, 'who', who, 'emoji', new.emoji)
  where exists (select 1 from public.profiles where id = target and coalesce(push_notifications, true) = true);
  return new;
exception when others then
  return new;
end $$;

drop trigger if exists on_reaction_created on public.reactions;
create trigger on_reaction_created after insert on public.reactions
  for each row execute function public.notify_new_reaction();

-- 7. NUOVO RACCONTO pubblicato → a tutti
create or replace function public.notify_new_article()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.published is not true then return new; end if;
  if tg_op = 'UPDATE' and old.published is true then return new; end if;
  insert into public.notifications (user_id, type, payload)
  select p.id, 'new_article', jsonb_build_object('article_id', new.id, 'title', new.title)
  from public.profiles p where coalesce(p.push_notifications, true) = true;
  return new;
exception when others then
  return new;
end $$;

drop trigger if exists on_article_published on public.articles;
create trigger on_article_published after insert or update of published on public.articles
  for each row execute function public.notify_new_article();

-- 8. Realtime
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when others then null; end $$;

-- FINE. Se in basso appare "Success. No rows returned" è andato tutto bene.
