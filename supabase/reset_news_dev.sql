-- =====================================================================
-- reset_news_dev.sql — Elimina las noticias dummy de desarrollo
--
-- USO:
--   Ejecutar manualmente en el SQL editor de Supabase local (Studio)
--   o con: psql $DATABASE_URL -f supabase/reset_news_dev.sql
--
-- ⚠️  Solo borra los registros creados por seed_news_dev.sql.
-- ⚠️  No afecta noticias reales generadas por el cierre de partidos.
-- =====================================================================

DELETE FROM news
WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);
