.PHONY: install dev deploy build typecheck lint lint-fix test e2e db-init

install:
	pnpm install

dev:
	pnpm --filter @agentclip/api dev

db-init:
	pnpm --filter @agentclip/api db:init

# Build the dashboard, then deploy the Worker (which serves API + MCP + dashboard).
deploy:
	pnpm --filter @agentclip/web build
	pnpm --filter @agentclip/api run deploy

build:
	pnpm --filter @agentclip/web build
	pnpm --filter @agentclip/extension build

typecheck:
	pnpm -r typecheck

lint:
	pnpm -r lint

lint-fix:
	pnpm -r lint --fix || echo "Resolve remaining lint issues manually."

test:
	pnpm -r test

# End-to-end smoke test against a running instance.
# Usage: AGENTCLIP_TOKEN=ac_live_xxx make e2e   (optional AGENTCLIP_BASE)
e2e:
	node scripts/e2e.mjs
