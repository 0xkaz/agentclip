# Agent workflow

## Setup

```sh
make install
pnpm --filter @agentclip/api exec wrangler d1 create agentclip   # paste id into wrangler.toml
make db-init                                                     # local schema
cp apps/api/.dev.vars.example apps/api/.dev.vars                 # fill secrets
```

Google OAuth: create an OAuth client (Web) in Google Cloud Console. Authorized redirect URI
= `http://localhost:8787/auth/google/callback` for local dev. Put the client id/secret in
`.dev.vars`. `SESSION_SECRET` is any random 32+ byte string.

## Run / build / test

```sh
make dev                              # wrangler dev (API)
pnpm --filter @agentclip/web dev      # dashboard
make build                            # web build + extension/dist
make test                             # vitest (crypto unit tests)
make typecheck
```

Load the extension: `make build`, then in Chrome → Extensions → Developer mode → Load
unpacked → `apps/extension/dist`. Open the extension options, set API base + a token created
in the dashboard.

## Conventions

- TypeScript everywhere except the extension (plain MV3 JS, no bundler).
- All D1 access lives in `apps/api/src/db.ts`; routes stay thin.
- Every query is scoped by `user_id`. Never trust client-supplied user identity.
- Tokens: store SHA-256 hashes only; show plaintext once at creation.
- Secrets via `.dev.vars` / `wrangler secret put`. Never commit them.

## Deploy

Production is a single Worker (`agentclip-production`) that also serves the built
dashboard, deployed via `wrangler deploy --env production` (wrapped by `make deploy`).

```sh
# one-time: create the Vectorize index + remote schema, set secrets
pnpm --filter @agentclip/api exec wrangler vectorize create agentclip-snippets --dimensions=1024 --metric=cosine
pnpm --filter @agentclip/api exec wrangler vectorize create-metadata-index agentclip-snippets --property-name=user_id --type=number
pnpm --filter @agentclip/api db:init:remote
pnpm --filter @agentclip/api exec wrangler secret put GOOGLE_CLIENT_ID --env production  # + SECRET, SESSION_SECRET, ENCRYPTION_KEY
make deploy   # builds the dashboard, then deploys the Worker (API + MCP + OAuth + dashboard)
```

The `[env.production]` block in `wrangler.toml` binds D1, Vectorize, Workers AI, static
assets, and the `agentclip.0xkaz.com` custom domain. Keep the Google redirect URI in sync
with `APP_BASE_URL`.

## E2E

`make e2e` (env `AGENTCLIP_TOKEN`, optional `AGENTCLIP_BASE`) runs an end-to-end smoke test
against a running instance: create → keyword search → encryption excluded → update → MCP
tools → delete.
