-- =====================================================================
-- seed_news_dev.sql — Noticias dummy para desarrollo local
--
-- USO:
--   Ejecutar manualmente en el SQL editor de Supabase local (Studio)
--   o con: psql $DATABASE_URL -f supabase/seed_news_dev.sql
--
-- ⚠️  NO ejecutar en producción.
-- ⚠️  NO forma parte del pipeline de migraciones.
--
-- Los registros usan UUIDs fijos con prefijo 00000000 para que sean
-- fácilmente identificables y eliminables con reset_news_dev.sql.
--
-- Para limpiar: ejecutar supabase/reset_news_dev.sql
-- =====================================================================

INSERT INTO news (id, title, summary, content, related_match_id, created_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '🇦🇷 Argentina 2 - 1 🇲🇦 Marruecos',
    'El partido finalizó y la clasificación fue actualizada.',
    '🇦🇷 Argentina venció a 🇲🇦 Marruecos 2-1. Los puntos de los participantes ya fueron calculados y la tabla general fue actualizada.',
    NULL,
    now() - interval '2 hours'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '🇪🇸 España 0 - 0 🇫🇷 Francia',
    'El partido finalizó y la clasificación fue actualizada.',
    '🇪🇸 España y 🇫🇷 Francia empataron 0-0. Los puntos de los participantes ya fueron calculados y la tabla general fue actualizada.',
    NULL,
    now() - interval '1 day'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '🇧🇷 Brasil 3 - 0 🇲🇽 México',
    'El partido finalizó y la clasificación fue actualizada.',
    '🇧🇷 Brasil venció a 🇲🇽 México 3-0. Los puntos de los participantes ya fueron calculados y la tabla general fue actualizada.',
    NULL,
    now() - interval '2 days'
  )
ON CONFLICT (id) DO NOTHING;
