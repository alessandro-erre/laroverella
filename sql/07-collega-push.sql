-- ============================================================
-- Collegamento notifiche -> funzione send-push (senza Webhooks)
--
-- PRIMA di eseguire, sostituisci i due valori qui sotto.
--   1. INCOLLA_IL_TUO_PROJECT_REF
--      lo trovi nell'indirizzo di Supabase:
--      https://supabase.com/dashboard/project/QUESTO_PEZZO
--   2. INCOLLA_LA_SERVICE_ROLE_KEY
--      Supabase -> Settings -> API -> "service_role" (chiave lunga, segreta)
--
-- Poi: SQL Editor -> New query -> incolla tutto -> RUN
-- ============================================================

-- 1. Estensione per le chiamate in uscita
create extension if not exists pg_net with schema extensions;

-- 2. Funzione che chiama send-push a ogni nuova notifica
create or replace function public.call_send_push()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  fn_url text := 'https://INCOLLA_IL_TUO_PROJECT_REF.supabase.co/functions/v1/send-push';
  key    text := 'INCOLLA_LA_SERVICE_ROLE_KEY';
begin
  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || key),
    body    := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
exception when others then
  return new; -- un invio fallito non deve bloccare la notifica
end $$;

-- 3. Attiva il collegamento
drop trigger if exists on_notification_push on public.notifications;
create trigger on_notification_push
  after insert on public.notifications
  for each row execute function public.call_send_push();

-- FINE. Se appare "Success" il collegamento e' attivo.
