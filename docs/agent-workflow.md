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

```sh
pnpm --filter @agentclip/api exec wrangler d1 execute agentclip --remote --file=./schema.sql
pnpm --filter @agentclip/api exec wrangler secret put GOOGLE_CLIENT_ID    # + SECRET, SESSION_SECRET
make deploy
```

Update `APP_BASE_URL` / `DASHBOARD_ORIGIN` vars (and the Google redirect URI) to the
deployed origins. Deploy the dashboard to Cloudflare Pages and publish the extension
separately.
