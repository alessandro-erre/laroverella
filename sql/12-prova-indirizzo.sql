-- ============================================================
-- PROVA L'INDIRIZZO prima di collegare
-- Sostituisci i due valori, esegui, aspetta 10 secondi
-- e poi esegui la SEZIONE 2 in basso.
-- ============================================================

-- ===== SEZIONE 1 =====
select net.http_post(
  url     := rtrim('METTI_QUI_IL_PROJECT_URL', '/') || '/functions/v1/send-push',
  headers := jsonb_build_object('Content-Type','application/json',
                                'Authorization','Bearer METTI_QUI_LA_SECRET_KEY'),
  body    := jsonb_build_object('record', jsonb_build_object(
               'user_id', (select user_id from public.push_subscriptions limit 1),
               'type', 'new_post',
               'payload', jsonb_build_object('preview','prova diretta')))
) as id_richiesta;


-- ===== SEZIONE 2 — aspetta 10 secondi ed esegui questa =====
select status_code as codice,
       left(coalesce(content, error_msg, '(nessuna risposta)'), 400) as risposta,
       created as quando
from net._http_response
order by created desc limit 3;
