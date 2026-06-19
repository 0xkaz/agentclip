# AgentClip

Clip selected browser text — with a confirm/edit step — into a personal store on
Cloudflare, then retrieve it from **AI agents (MCP)** and tools over a
per-user-token-authenticated **REST API**.

- **agent** — AI clients reach your clips over MCP / REST with a per-user token.
- **clip** — a Chrome extension (Manifest V3) adds a "Save to AgentClip" context menu;
  you edit the text before it's saved.

Production runs as a **single Cloudflare Worker** at `https://agentclip.0xkaz.com` serving
the API, the MCP server, Google OAuth, and the dashboard from one origin.

- **Live app:** https://agentclip.0xkaz.com
- **Source:** https://github.com/0xkaz/agentclip
- **日本語版 README:** [README.ja.md](README.ja.md)

## Features

- **Clip & edit** — right-click any selection → edit content/title/tags/source → save.
- **Keyword search** — substring match over content/title/tags (works for Japanese too).
- **Semantic search** — meaning-based search via Workers AI embeddings + Vectorize.
- **Per-clip encryption** — mark a clip to encrypt it at rest; encrypted clips are
  excluded from search (and shown masked, with a reveal toggle).
- **Share links** — publish a single clip at a public read-only `/s/<slug>` URL; revoke
  anytime (encrypted clips can't be shared).
- **MCP + REST** — AI agents and tools read/write your clips with a per-user token.
- **Google sign-in** for the dashboard; opaque per-user Bearer tokens for machines.

## Use the hosted app

The fastest path — no local setup:

1. Open **https://agentclip.0xkaz.com** and **Sign in with Google**.
2. Go to **API Tokens** → create a token (`ac_live_…`, shown once — copy it).
3. Open **Setup & Usage** in the app — it shows your exact MCP config and `curl`
   examples, plus the Chrome-extension steps below.

The dashboard has three pages:

| Page | What it does |
|------|--------------|
| **Snippets** | Browse & full-text-search everything you've clipped |
| **API Tokens** | Create / revoke per-user Bearer tokens |
| **Setup & Usage** | Copy-paste MCP config, REST `curl`, and extension setup |

## Monorepo layout

```
apps/api         Cloudflare Worker — REST + MCP + Google OAuth, D1, serves dashboard
apps/web         React + Vite dashboard — landing page + Snippets / Tokens / Setup
apps/extension   Chrome MV3 extension — capture + confirm/edit
packages/shared  shared TypeScript types
```

The rest of this README covers running and deploying it yourself.
Requirements: **Node 20+**, **pnpm 9+** (`npm i -g pnpm`), a Cloudflare account, and a
Google OAuth client.

---

## 1. Clone & install

```sh
git clone https://github.com/0xkaz/agentclip.git
cd agentclip
pnpm install      # or: make install
```

## 2. Configure Cloudflare D1

```sh
pnpm --filter @agentclip/api exec wrangler d1 create agentclip
```

Paste the returned `database_id` into **both** `[[d1_databases]]` blocks in
`apps/api/wrangler.toml` (the top-level one and the `[env.production]` one).

```sh
make db-init                # apply schema.sql to the LOCAL D1
# later, for production:
pnpm --filter @agentclip/api db:init:remote
```

## 3. Configure Google OAuth

In Google Cloud Console → Credentials → create an **OAuth client ID (Web application)**.
Add authorized redirect URIs:

- Local: `http://localhost:8787/auth/google/callback`
- Production: `https://agentclip.0xkaz.com/auth/google/callback`

Then create local secrets:

```sh
cp apps/api/.dev.vars.example apps/api/.dev.vars
# edit apps/api/.dev.vars:
#   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET (any random 32+ byte string)
```

## 4. Run locally

```sh
make dev                              # API + MCP on http://localhost:8787
pnpm --filter @agentclip/web dev      # dashboard on http://localhost:5173
```

Open `http://localhost:5173`, sign in with Google, and create an API token.

## 5. Install the Chrome extension

```sh
pnpm --filter @agentclip/extension build      # outputs apps/extension/dist
```

1. Open `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select `apps/extension/dist`.
3. Click the AgentClip icon → set **API base URL** and paste the **token** from the dashboard.
   - Local: `http://localhost:8787`
   - Production: `https://agentclip.0xkaz.com`
4. Select text on any page → right-click → **Save to AgentClip** → edit → **Save**.

## 6. Deploy to production (`agentclip.0xkaz.com`)

```sh
# one-time: set production secrets
pnpm --filter @agentclip/api exec wrangler secret put GOOGLE_CLIENT_ID --env production
pnpm --filter @agentclip/api exec wrangler secret put GOOGLE_CLIENT_SECRET --env production
pnpm --filter @agentclip/api exec wrangler secret put SESSION_SECRET --env production
pnpm --filter @agentclip/api db:init:remote        # schema on remote D1

make deploy        # builds the dashboard, then deploys the Worker (--env production)
```

> The custom domain route (`agentclip.0xkaz.com`) requires the Cloudflare API token to
> have **Zone:Edit** on `0xkaz.com` in addition to Workers/D1 edit. Without it, deploy
> the Worker and bind the domain from the dashboard, or use the `*.workers.dev` URL.

---

## Using the REST API

```sh
# save (add "encrypted": true to encrypt at rest + exclude from search)
curl -X POST https://agentclip.0xkaz.com/api/snippets \
  -H "Authorization: Bearer ac_live_..." \
  -H "Content-Type: application/json" \
  -d '{"content":"hello","tags":"demo"}'

# keyword search (substring; works for Japanese)
curl "https://agentclip.0xkaz.com/api/snippets?q=hello" -H "Authorization: Bearer ac_live_..."

# semantic search (meaning-based)
curl "https://agentclip.0xkaz.com/api/snippets?q=greeting&mode=semantic" -H "Authorization: Bearer ac_live_..."

# update / delete
curl -X PATCH  https://agentclip.0xkaz.com/api/snippets/1 -H "Authorization: Bearer ac_live_..." -H "Content-Type: application/json" -d '{"content":"updated"}'
curl -X DELETE https://agentclip.0xkaz.com/api/snippets/1 -H "Authorization: Bearer ac_live_..."
```

## Using MCP

Point an MCP client at `https://agentclip.0xkaz.com/mcp` with header
`Authorization: Bearer ac_live_...`. Tools: `store_snippet`, `search_snippets`,
`semantic_search`, `get_snippet`, `list_recent`, `update_snippet`, `delete_snippet`.

> Semantic search indexes new clips automatically; to index clips made earlier, open the
> **Snippets** page, switch to **Semantic**, and click **Rebuild index** (or
> `POST /api/my/reindex`). Vectorize is eventually consistent (new clips become
> searchable within ~1 minute).

See [docs/architecture.md](docs/architecture.md) and
[docs/agent-workflow.md](docs/agent-workflow.md) for details.
