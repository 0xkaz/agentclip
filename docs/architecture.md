# Architecture

## Components

- **apps/api** — a single Cloudflare Worker (Hono) hosting three surfaces:
  - `GET /auth/google/*` — Google OAuth login → signed session cookie.
  - `/api/*` — REST: `me`, `snippets` (Bearer), `tokens` (session).
  - `/mcp` — stateless JSON-RPC MCP server (Bearer).
- **apps/web** — React + Vite dashboard. Google login, create/revoke tokens.
- **apps/extension** — Chrome MV3. Context menu → confirm/edit window → POST.
- **packages/shared** — shared TypeScript types.

## Data model (D1 / SQLite)

`users`, `api_tokens` (SHA-256 hash only), `snippets` (with an `encrypted` flag), and
`shares` (public share-link slugs). See `apps/api/schema.sql`. Every query is scoped by
`user_id`.

## Search

- **Keyword** — `LIKE` substring match over content/title/tags (works for Japanese and
  partial words).
- **Semantic** — Workers AI (`@cf/baai/bge-m3`) embeddings stored in Vectorize, queried
  with a `user_id` metadata filter (`?q=…&mode=semantic`).
- Encrypted clips (`encrypted = 1`) are excluded from both. New clips index automatically;
  existing ones can be backfilled via `POST /api/my/reindex`.

## Auth

| Caller | Mechanism | Middleware |
|--------|-----------|------------|
| Dashboard (human) | Google OAuth → HMAC-signed `ac_session` cookie | `requireSession` |
| Extension / MCP / API (machine) | Bearer `ac_live_…`, matched by SHA-256 hash | `requireBearer` |

Tokens are generated with Web Crypto, returned in plaintext **once**, and stored only as a
hash. Session cookies are HMAC-signed with `SESSION_SECRET` — no server-side session store
in v1.

## MCP

`apps/api/src/mcp.ts` implements a minimal Streamable-HTTP MCP server: `initialize`,
`tools/list`, `tools/call`, over a single `POST /mcp`. Stateless, so it fits Workers
without Durable Objects. 7 tools: `store_snippet`, `search_snippets`, `semantic_search`,
`get_snippet`, `list_recent`, `update_snippet`, `delete_snippet`.

Dashboard snippet browsing/editing is served by session-scoped routes under
`GET/POST/PATCH/DELETE /api/my/snippets` (+ `?q=…&mode=…` search), so the dashboard needs
no token. Public share pages are served at `GET /s/:slug`.

## Extending later

- MCP OAuth: wrap with `@cloudflare/workers-oauth-provider` to issue MCP-client OAuth
  backed by Google, replacing manual token paste.
- Auto-tagging / summaries on save; share-link expiry UI; semantic backfill on login.
