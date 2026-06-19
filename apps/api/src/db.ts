import type { Snippet, ApiToken, User } from "@agentclip/shared";
import type { Env } from "./types";
import { sha256Hex, encryptContent, decryptContent, randomSlug } from "./crypto";
import { indexSnippet, removeFromIndex } from "./vectors";

// Active-share subquery: the slug of a live (non-revoked, non-expired) share, or null.
const SHARE_SLUG = (ref: string) =>
  `(SELECT slug FROM shares WHERE shares.snippet_id = ${ref}.id AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > datetime('now')) LIMIT 1) AS share_slug`;

// Decrypt a row's content in place if it was stored encrypted.
async function decode(env: Env, row: Snippet | null): Promise<Snippet | null> {
  if (row && row.encrypted) row.content = await decryptContent(env.ENCRYPTION_KEY, row.content);
  return row;
}
async function decodeAll(env: Env, rows: Snippet[]): Promise<Snippet[]> {
  return Promise.all(rows.map((r) => decode(env, r) as Promise<Snippet>));
}

export async function upsertUser(
  db: D1Database,
  google_sub: string,
  email: string,
  name: string | null,
): Promise<User> {
  await db
    .prepare(
      `INSERT INTO users (google_sub, email, name) VALUES (?, ?, ?)
       ON CONFLICT(google_sub) DO UPDATE SET email = excluded.email, name = excluded.name`,
    )
    .bind(google_sub, email, name)
    .run();
  const row = await db
    .prepare(`SELECT * FROM users WHERE google_sub = ?`)
    .bind(google_sub)
    .first<User>();
  if (!row) throw new Error("user upsert failed");
  return row;
}

// Returns userId for a valid, non-revoked token, else null. Updates last_used_at.
export async function userIdForToken(
  db: D1Database,
  token: string,
): Promise<number | null> {
  const hash = await sha256Hex(token);
  const row = await db
    .prepare(
      `SELECT id, user_id FROM api_tokens WHERE token_hash = ? AND revoked_at IS NULL`,
    )
    .bind(hash)
    .first<{ id: number; user_id: number }>();
  if (!row) return null;
  await db
    .prepare(`UPDATE api_tokens SET last_used_at = datetime('now') WHERE id = ?`)
    .bind(row.id)
    .run();
  return row.user_id;
}

export async function createToken(
  db: D1Database,
  userId: number,
  name: string,
  tokenHash: string,
): Promise<number> {
  const res = await db
    .prepare(`INSERT INTO api_tokens (user_id, name, token_hash) VALUES (?, ?, ?)`)
    .bind(userId, name, tokenHash)
    .run();
  return res.meta.last_row_id as number;
}

export async function listTokens(db: D1Database, userId: number): Promise<ApiToken[]> {
  const res = await db
    .prepare(
      `SELECT id, user_id, name, last_used_at, created_at, revoked_at
       FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC`,
    )
    .bind(userId)
    .all<ApiToken>();
  return res.results ?? [];
}

export async function revokeToken(
  db: D1Database,
  userId: number,
  tokenId: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE api_tokens SET revoked_at = datetime('now')
       WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
    )
    .bind(tokenId, userId)
    .run();
}

export async function insertSnippet(
  env: Env,
  userId: number,
  content: string,
  title: string | null,
  source_url: string | null,
  tags: string | null,
  encrypted = false,
): Promise<Snippet> {
  const stored = encrypted ? await encryptContent(env.ENCRYPTION_KEY, content) : content;
  const res = await env.DB
    .prepare(
      `INSERT INTO snippets (user_id, content, title, source_url, tags, encrypted)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(userId, stored, title, source_url, tags, encrypted ? 1 : 0)
    .run();
  const id = res.meta.last_row_id as number;
  const row = (await decode(
    env,
    await env.DB.prepare(`SELECT * FROM snippets WHERE id = ?`).bind(id).first<Snippet>(),
  ))!;
  if (!row) throw new Error("insert failed");
  await indexSnippet(env, row);
  return row;
}

export async function getSnippet(
  env: Env,
  userId: number,
  id: number,
): Promise<Snippet | null> {
  const row = await env.DB
    .prepare(`SELECT *, ${SHARE_SLUG("snippets")} FROM snippets WHERE id = ? AND user_id = ?`)
    .bind(id, userId)
    .first<Snippet>();
  return decode(env, row);
}

export async function getSnippetsByIds(
  env: Env,
  userId: number,
  ids: number[],
): Promise<Snippet[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const res = await env.DB
    .prepare(
      `SELECT *, ${SHARE_SLUG("snippets")} FROM snippets
       WHERE user_id = ? AND id IN (${placeholders})`,
    )
    .bind(userId, ...ids)
    .all<Snippet>();
  const byId = new Map((res.results ?? []).map((r) => [r.id, r]));
  // Preserve the relevance order from the vector search.
  const ordered = ids.map((i) => byId.get(i)).filter((r): r is Snippet => !!r);
  return decodeAll(env, ordered);
}

export async function listRecent(
  env: Env,
  userId: number,
  limit: number,
): Promise<Snippet[]> {
  const res = await env.DB
    .prepare(
      `SELECT *, ${SHARE_SLUG("snippets")} FROM snippets
       WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(userId, limit)
    .all<Snippet>();
  return decodeAll(env, res.results ?? []);
}

export async function updateSnippet(
  env: Env,
  userId: number,
  id: number,
  content: string,
  title: string | null,
  tags: string | null,
  encrypted = false,
): Promise<Snippet | null> {
  const stored = encrypted ? await encryptContent(env.ENCRYPTION_KEY, content) : content;
  await env.DB
    .prepare(
      `UPDATE snippets SET content = ?, title = ?, tags = ?, encrypted = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
    )
    .bind(stored, title, tags, encrypted ? 1 : 0, id, userId)
    .run();
  const row = await getSnippet(env, userId, id);
  if (row) await indexSnippet(env, row);
  return row;
}

export async function deleteSnippet(
  env: Env,
  userId: number,
  id: number,
): Promise<boolean> {
  const res = await env.DB
    .prepare(`DELETE FROM snippets WHERE id = ? AND user_id = ?`)
    .bind(id, userId)
    .run();
  const ok = (res.meta.changes ?? 0) > 0;
  if (ok) await removeFromIndex(env, id);
  return ok;
}

export async function searchSnippets(
  env: Env,
  userId: number,
  query: string,
  limit: number,
): Promise<Snippet[]> {
  // Substring (LIKE) match over content/title/tags. Works for any language
  // (incl. Japanese) and partial words. Encrypted clips (encrypted = 1) are
  // excluded, so they never appear in keyword search.
  const like = `%${query.replace(/[%_]/g, (m) => "\\" + m)}%`;
  const res = await env.DB
    .prepare(
      `SELECT *, ${SHARE_SLUG("snippets")} FROM snippets
       WHERE user_id = ? AND encrypted = 0
         AND (content LIKE ? ESCAPE '\\' OR title LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\')
       ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(userId, like, like, like, limit)
    .all<Snippet>();
  return decodeAll(env, res.results ?? []);
}

// ---- Public share links ----

// Returns the share slug (creating one if needed). Throws on encrypted clips.
export async function createShare(
  env: Env,
  userId: number,
  snippetId: number,
): Promise<string | null> {
  const snip = await env.DB
    .prepare(`SELECT id, encrypted FROM snippets WHERE id = ? AND user_id = ?`)
    .bind(snippetId, userId)
    .first<{ id: number; encrypted: number }>();
  if (!snip) return null;
  if (snip.encrypted) throw new Error("encrypted clips cannot be shared");
  const existing = await env.DB
    .prepare(
      `SELECT slug FROM shares WHERE snippet_id = ? AND user_id = ? AND revoked_at IS NULL`,
    )
    .bind(snippetId, userId)
    .first<{ slug: string }>();
  if (existing) return existing.slug;
  const slug = randomSlug();
  await env.DB
    .prepare(`INSERT INTO shares (slug, snippet_id, user_id) VALUES (?, ?, ?)`)
    .bind(slug, snippetId, userId)
    .run();
  return slug;
}

export async function revokeShare(
  env: Env,
  userId: number,
  snippetId: number,
): Promise<void> {
  await env.DB
    .prepare(
      `UPDATE shares SET revoked_at = datetime('now')
       WHERE snippet_id = ? AND user_id = ? AND revoked_at IS NULL`,
    )
    .bind(snippetId, userId)
    .run();
}

// Public lookup by slug (no auth). Honors revoke + expiry.
export async function getSharedSnippet(env: Env, slug: string): Promise<Snippet | null> {
  const row = await env.DB
    .prepare(
      `SELECT s.* FROM shares sh JOIN snippets s ON s.id = sh.snippet_id
       WHERE sh.slug = ? AND sh.revoked_at IS NULL
         AND (sh.expires_at IS NULL OR sh.expires_at > datetime('now'))`,
    )
    .bind(slug)
    .first<Snippet>();
  return decode(env, row);
}
