import { Hono } from "hono";
import { cors } from "hono/cors";
import { deleteCookie } from "hono/cookie";
import type { Env, Vars } from "./types";
import { auth } from "./auth";
import { snippets } from "./snippets";
import { tokens } from "./tokens";
import { mcp } from "./mcp";
import { requireSession, requireBearer, SESSION_COOKIE } from "./middleware";
import {
  listRecent,
  searchSnippets,
  getSnippetsByIds,
  insertSnippet,
  updateSnippet,
  deleteSnippet,
  createShare,
  revokeShare,
  getSharedSnippet,
  deleteUser,
} from "./db";
import { semanticSearch, reindexUser } from "./vectors";
import type { CreateSnippetInput, ShareResult } from "@agentclip/shared";
import { privacyHtml } from "./privacy";
import { sharePageHtml, shareNotFoundHtml } from "./share";

// Shared helper: run a snippet query honoring q + mode=semantic|text.
async function runSearch(env: Env, userId: number, q: string | undefined, mode: string | undefined, limit: number) {
  if (!q) return listRecent(env, userId, limit);
  if (mode === "semantic") {
    const ids = await semanticSearch(env, userId, q, limit);
    return getSnippetsByIds(env, userId, ids);
  }
  return searchSnippets(env, userId, q, limit);
}

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

// CORS: allow the dashboard origin (with cookies) and extension origins (Bearer).
app.use("*", (c, next) =>
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (origin === c.env.DASHBOARD_ORIGIN) return origin;
      if (origin.startsWith("chrome-extension://")) return origin;
      return undefined;
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })(c, next),
);

app.get("/health", (c) => c.json({ ok: true }));

// Public privacy policy (clean URL for the Chrome Web Store listing).
app.get("/privacy", (c) => c.html(privacyHtml(c.env.APP_BASE_URL)));

// Public read-only share page.
app.get("/s/:slug", async (c) => {
  const snip = await getSharedSnippet(c.env, c.req.param("slug"));
  if (!snip) return c.html(shareNotFoundHtml(), 404);
  return c.html(sharePageHtml(snip));
});

// Current user (dashboard session).
app.get("/api/me", requireSession, async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT id, email, name FROM users WHERE id = ?`,
  )
    .bind(c.get("userId"))
    .first();
  // The session can outlive the user (e.g. after account deletion). Treat a
  // missing user as logged-out and clear the stale cookie so the dashboard
  // shows the landing page instead of crashing on a null user.
  if (!row) {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ error: "not authenticated" }, 401);
  }
  return c.json(row);
});

// Account deletion (Bearer auth, for the mobile app). Permanently removes the
// authenticated user and all their data — required by the App Store / Play.
app.delete("/api/me", requireBearer, async (c) => {
  await deleteUser(c.env, c.get("userId"));
  return c.json({ ok: true });
});

// Account deletion (session auth, for the web dashboard). Same effect, and
// clears the session cookie so the browser is logged out immediately.
app.delete("/api/my/account", requireSession, async (c) => {
  await deleteUser(c.env, c.get("userId"));
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

// Dashboard-scoped snippet CRUD (session auth). The dashboard never needs a token.
app.get("/api/my/snippets", requireSession, async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 20) || 20, 100);
  const rows = await runSearch(
    c.env,
    c.get("userId"),
    c.req.query("q"),
    c.req.query("mode"),
    limit,
  );
  return c.json({ snippets: rows });
});

app.post("/api/my/snippets", requireSession, async (c) => {
  const body = await c.req.json<CreateSnippetInput>().catch(() => null);
  if (!body?.content?.trim()) return c.json({ error: "content required" }, 400);
  const row = await insertSnippet(
    c.env,
    c.get("userId"),
    body.content,
    body.title ?? null,
    body.source_url ?? null,
    body.tags ?? null,
    body.encrypted ?? false,
  );
  return c.json(row, 201);
});

app.patch("/api/my/snippets/:id", requireSession, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "bad id" }, 400);
  const body = await c.req.json<CreateSnippetInput>().catch(() => null);
  if (!body?.content?.trim()) return c.json({ error: "content required" }, 400);
  const row = await updateSnippet(
    c.env,
    c.get("userId"),
    id,
    body.content,
    body.title ?? null,
    body.tags ?? null,
    body.encrypted ?? false,
  );
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

app.delete("/api/my/snippets/:id", requireSession, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "bad id" }, 400);
  const ok = await deleteSnippet(c.env, c.get("userId"), id);
  return c.json({ ok });
});

// Rebuild the semantic index for the signed-in user's existing clips.
app.post("/api/my/reindex", requireSession, async (c) => {
  const indexed = await reindexUser(c.env, c.get("userId"));
  return c.json({ indexed });
});

// Create (or fetch existing) a public share link for a clip.
app.post("/api/my/snippets/:id/share", requireSession, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "bad id" }, 400);
  try {
    const slug = await createShare(c.env, c.get("userId"), id);
    if (!slug) return c.json({ error: "not found" }, 404);
    const result: ShareResult = { slug, url: `${c.env.APP_BASE_URL}/s/${slug}` };
    return c.json(result, 201);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

app.delete("/api/my/snippets/:id/share", requireSession, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "bad id" }, 400);
  await revokeShare(c.env, c.get("userId"), id);
  return c.json({ ok: true });
});

app.route("/auth", auth);
app.route("/api/snippets", snippets);
app.route("/api/tokens", tokens);
app.route("/mcp", mcp);

// Production single-origin: serve the SPA for any non-API/asset route.
// Existing static files are served by the edge before reaching the Worker;
// this fallback returns index.html for client-side routes. (No-op in dev.)
app.get("*", async (c) => {
  if (!c.env.ASSETS) return c.json({ error: "not found" }, 404);
  const url = new URL(c.req.url);
  url.pathname = "/index.html";
  return c.env.ASSETS.fetch(new Request(url, c.req.raw));
});

export default app;
