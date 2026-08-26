-- ============================================================
-- TEST DIRETTO — perché la funzione non viene chiamata
-- Copia tutto e premi RUN. Poi ASPETTA 10 SECONDI e premi RUN
-- una seconda volta: la seconda volta mostra anche l'esito.
-- ============================================================

-- A. Il collegamento esiste?
select 'A. Collegamento attivo' as controllo,
       (select case when count(*) > 0 then 'SI' else 'NO -> esegui 07-collega-push.sql' end
        from pg_trigger where tgname = 'on_notification_push') as risultato;

-- B. Crea una notifica di prova per te stesso
insert into public.notifications (user_id, type, payload)
select id, 'new_post', jsonb_build_object('preview','Notifica di prova')
from public.profiles
where id = (select user_id from public.push_subscriptions order by created_at desc limit 1);

-- C. Esito delle ultime chiamate alla funzione
--    (la prima volta può essere vuoto: ripeti il RUN dopo 10 secondi)
select 'C. Esito chiamata' as controllo,
       status_code::text as codice,
       left(coalesce(content, error_msg, 'in attesa'), 300) as risposta,
       created as quando
from net._http_response
order by created desc
limit 5;
