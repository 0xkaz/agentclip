-- Keyword search now uses LIKE (works for Japanese / partial matches),
-- so the FTS5 mirror and its triggers are no longer needed.
-- Apply: wrangler d1 execute agentclip --remote --file=./migrations/0003_drop_fts.sql

DROP TRIGGER IF EXISTS snippets_ai;
DROP TRIGGER IF EXISTS snippets_ad;
DROP TRIGGER IF EXISTS snippets_au_del;
DROP TRIGGER IF EXISTS snippets_au_ins;
DROP TABLE IF EXISTS snippets_fts;
