-- ============================================================
-- CONTROLLO NOTIFICHE SUL TELEFONO — copia tutto e premi RUN
-- Restituisce 3 righe da leggere.
-- ============================================================

select 'Dispositivi iscritti alle notifiche' as controllo,
       (select count(*)::text from public.push_subscriptions) as valore,
       'Almeno 1 per ogni telefono su cui hai attivato l''interruttore' as atteso
union all
select 'Webhook send-push configurato',
       (select case when count(*) > 0 then 'SI' else 'NO' end
        from pg_trigger where tgname ilike '%send%push%' or tgname ilike '%supabase_functions%'),
       'Deve essere SI (Database -> Webhooks)'
union all
select 'Notifiche create nell''ultima ora',
       (select count(*)::text from public.notifications where created_at > now() - interval '1 hour'),
       'Deve essere > 0 se hai appena pubblicato un post';
