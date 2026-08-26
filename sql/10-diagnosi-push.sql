-- ============================================================
-- DIAGNOSI: perché la chiamata non parte
-- Esegui UNA SEZIONE PER VOLTA: seleziona con il mouse le righe
-- della sezione, poi premi RUN (esegue solo la selezione).
-- ============================================================


-- ===== SEZIONE 1 — i pezzi ci sono? =====

select 'Estensione pg_net installata' as controllo,
       (select case when count(*)>0 then 'SI' else 'NO' end from pg_extension where extname='pg_net') as risultato
union all
select 'Dispositivi iscritti',
       (select count(*)::text from public.push_subscriptions)
union all
select 'Notifiche totali',
       (select count(*)::text from public.notifications);


-- ===== SEZIONE 2 — prova a chiamare la funzione, mostrando l'errore =====
-- Sostituisci i due valori come nel file 07, poi esegui.

select net.http_post(
  url     := 'https://INCOLLA_IL_TUO_PROJECT_REF.supabase.co/functions/v1/send-push',
  headers := jsonb_build_object('Content-Type','application/json',
                                'Authorization','Bearer INCOLLA_LA_SERVICE_ROLE_KEY'),
  body    := jsonb_build_object('record', jsonb_build_object(
               'user_id', (select user_id from public.push_subscriptions limit 1),
               'type', 'new_post',
               'payload', jsonb_build_object('preview','prova diretta')))
) as id_richiesta;


-- ===== SEZIONE 3 — aspetta 10 secondi ed esegui questa =====

select status_code as codice,
       left(coalesce(content, error_msg, '(nessuna risposta)'), 400) as risposta,
       created as quando
from net._http_response
order by created desc limit 5;
