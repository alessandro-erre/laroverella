-- ============================================================
-- ESITO DELLE CHIAMATE ALLA FUNZIONE send-push
-- Copia tutto e premi RUN.
-- ============================================================

select status_code as codice,
       left(coalesce(content, error_msg, '(nessuna risposta)'), 300) as risposta,
       created as quando
from net._http_response
order by created desc
limit 5;
