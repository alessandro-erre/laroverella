-- ============================================================
-- COLLEGAMENTO PUSH — versione a prova di errore
--
-- Servono due valori, da Supabase -> Settings -> API:
--   1. "Project URL"  -> es. https://abcdefgh.supabase.co
--      Incollalo TALE E QUALE al posto di METTI_QUI_IL_PROJECT_URL
--      (senza barra finale, senza aggiungere nulla)
--   2. "secret key" (o service_role) -> al posto di METTI_QUI_LA_SECRET_KEY
--
-- Poi: SQL Editor -> New query -> incolla tutto -> RUN
-- ============================================================

create extension if not exists pg_net;

create or replace function public.call_send_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text := 'METTI_QUI_IL_PROJECT_URL';
  key  text := 'METTI_QUI_LA_SECRET_KEY';
begin
  perform net.http_post(
    url     := rtrim(base, '/') || '/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || key),
    body    := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
exception when others then
  return new;
end $$;

drop trigger if exists on_notification_push on public.notifications;
create trigger on_notification_push
  after insert on public.notifications
  for each row execute function public.call_send_push();

-- FINE. Se appare "Success" il collegamento e' aggiornato.
