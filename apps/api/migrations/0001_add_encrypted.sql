-- Adds per-clip encryption support to an existing AgentClip DB.
-- Apply: wrangler d1 execute agentclip --remote --file=./migrations/0001_add_encrypted.sql

ALTER TABLE snippets ADD COLUMN encrypted INTEGER NOT NULL DEFAULT 0;

-- Replace FTS sync triggers with encryption-aware versions
-- (encrypted = 1 rows are not indexed → excluded from search).
DROP TRIGGER IF EXISTS snippets_ai;
DROP TRIGGER IF EXISTS snippets_ad;
DROP TRIGGER IF EXISTS snippets_au;

CREATE TRIGGER snippets_ai AFTER INSERT ON snippets WHEN new.encrypted = 0 BEGIN
  INSERT INTO snippets_fts(rowid, content, title, tags)
  VALUES (new.id, new.content, new.title, new.tags);
END;

CREATE TRIGGER snippets_ad AFTER DELETE ON snippets WHEN old.encrypted = 0 BEGIN
  INSERT INTO snippets_fts(snippets_fts, rowid, content, title, tags)
  VALUES ('delete', old.id, old.content, old.title, old.tags);
END;

CREATE TRIGGER snippets_au_del AFTER UPDATE ON snippets WHEN old.encrypted = 0 BEGIN
  INSERT INTO snippets_fts(snippets_fts, rowid, content, title, tags)
  VALUES ('delete', old.id, old.content, old.title, old.tags);
END;

CREATE TRIGGER snippets_au_ins AFTER UPDATE ON snippets WHEN new.encrypted = 0 BEGIN
  INSERT INTO snippets_fts(rowid, content, title, tags)
  VALUES (new.id, new.content, new.title, new.tags);
END;
