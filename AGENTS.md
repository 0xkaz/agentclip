# AGENTS.md — agentclip

## Project

`agentclip` is a personal text-clipping knowledge store. A Chrome extension captures
selected browser text, lets the user edit it in a confirm screen, and saves it to a
Cloudflare-backed store. Saved snippets are retrievable by AI clients and tools over a
per-user-token-authenticated REST API and MCP server.

## Stack

- TypeScript + Hono on Cloudflare Workers (REST + MCP + Google OAuth, one Worker)
- Cloudflare D1 (SQLite) with FTS5 full-text search
- React + Vite dashboard (Google login, snippet & token management)
- Chrome extension (Manifest V3)
- pnpm workspace monorepo

## Layout

- `apps/api` — Worker: REST API, MCP endpoint, Google OAuth, D1 access
- `apps/web` — React dashboard
- `apps/extension` — Chrome MV3 extension
- `packages/shared` — shared types/DTOs

## Commands

- `make install` — install all workspace deps
- `make dev` — run the API worker locally (`wrangler dev`)
- `make test` — run Vitest
- `make lint` / `make typecheck` — checks
- `make build` — build web + extension
- `make deploy` — deploy the API worker

## Auth model

Two paths: humans use Google OAuth + signed session cookie (dashboard only); machines
(extension / MCP / API) use opaque per-user Bearer tokens (`ac_live_...`), stored only
as SHA-256 hashes. See `docs/architecture.md`.

## Secrets

Real values live in `wrangler secret put` / `.dev.vars` (git-ignored). Never commit secrets.

## Detailed workflow

See [docs/agent-workflow.md](docs/agent-workflow.md) and [docs/architecture.md](docs/architecture.md).
