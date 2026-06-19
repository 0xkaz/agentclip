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

`users`, `api_tokens` (SHA-256 hash only), `snippets` (+ `snippets_fts` FTS5 mirror kept
in sync by triggers). See `apps/api/schema.sql`. Every query is scoped by `user_id`.

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
without Durable Objects. Tools map 1:1 to the D1 helpers in `db.ts`.

## Extending later

- Semantic search: add Workers AI embeddings + Vectorize alongside FTS5.
- MCP OAuth: wrap with `@cloudflare/workers-oauth-provider` to issue MCP-client OAuth
  backed by Google, replacing manual token paste.
- Dashboard snippet browsing: served by the session-scoped read route
  `GET /api/my/snippets` (list + `?q=` FTS search), so the dashboard needs no token.
