-- Busca: acentuação e similaridade tipográfica.
-- unaccent permite que "sao jose" encontre "São José"; pg_trgm sustenta a
-- tolerância a erro de digitação sem depender de um motor externo.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Configuração de busca em português sem acento, imutável para uso em índice.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'portugues_sem_acento') THEN
    CREATE TEXT SEARCH CONFIGURATION portugues_sem_acento (COPY = portuguese);
    ALTER TEXT SEARCH CONFIGURATION portugues_sem_acento
      ALTER MAPPING FOR hword, hword_part, word WITH unaccent, portuguese_stem;
  END IF;
END
$$;

-- Índices de similaridade para a busca global.
CREATE INDEX IF NOT EXISTS municipality_name_trgm
  ON "Municipality" USING gin (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS person_name_trgm
  ON "Person" USING gin (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS company_name_trgm
  ON "Company" USING gin (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS entity_alias_key_trgm
  ON "EntityAlias" USING gin ("normalizedKey" gin_trgm_ops);

-- Busca textual em notícias e sinais do Radar.
CREATE INDEX IF NOT EXISTS news_article_fts
  ON "NewsArticle" USING gin (
    to_tsvector('portugues_sem_acento', coalesce(title, '') || ' ' || coalesce(summary, ''))
  );
CREATE INDEX IF NOT EXISTS radar_signal_fts
  ON "RadarSignal" USING gin (
    to_tsvector('portugues_sem_acento', coalesce(headline, '') || ' ' || coalesce(description, ''))
  );
CREATE INDEX IF NOT EXISTS council_project_fts
  ON "CouncilProject" USING gin (
    to_tsvector('portugues_sem_acento', coalesce(title, '') || ' ' || coalesce(summary, ''))
  );
