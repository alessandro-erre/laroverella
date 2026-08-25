-- ============================================================
-- CONTROLLO NOTIFICHE — copia tutto e premi RUN
-- Restituisce una tabella con 4 righe da leggere.
-- ============================================================

select 'Utenti registrati' as controllo,
       (select count(*)::text from auth.users) as valore,
       'Deve essere uguale ai profili' as atteso
union all
select 'Profili creati',
       (select count(*)::text from public.profiles),
       'Deve essere uguale agli utenti'
union all
select 'Trigger attivi',
       (select count(*)::text from pg_trigger where tgname in
         ('on_post_created','on_comment_created','on_reaction_created','on_article_published')),
       'Devono essere 4'
union all
select 'Notifiche totali',
       (select count(*)::text from public.notifications),
       'Deve crescere dopo ogni post';
