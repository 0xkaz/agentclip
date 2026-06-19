import { Hono } from "hono";
import type { CreateSnippetInput } from "@agentclip/shared";
import type { Env, Vars } from "./types";
import { requireBearer } from "./middleware";
import {
  insertSnippet,
  getSnippet,
  listRecent,
  searchSnippets,
  getSnippetsByIds,
  updateSnippet,
  deleteSnippet,
} from "./db";
import { semanticSearch, reindexUser } from "./vectors";

// REST API for snippets. Bearer-token auth (extension + programmatic).
export const snippets = new Hono<{ Bindings: Env; Variables: Vars }>();

snippets.use("*", requireBearer);

snippets.post("/", async (c) => {
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

snippets.get("/", async (c) => {
  const q = c.req.query("q");
  const mode = c.req.query("mode");
  const uid = c.get("userId");
  const limit = Math.min(Number(c.req.query("limit") ?? 20) || 20, 100);
  let rows;
  if (!q) rows = await listRecent(c.env, uid, limit);
  else if (mode === "semantic")
    rows = await getSnippetsByIds(c.env, uid, await semanticSearch(c.env, uid, q, limit));
  else rows = await searchSnippets(c.env, uid, q, limit);
  return c.json({ snippets: rows });
});

snippets.post("/reindex", async (c) => {
  const indexed = await reindexUser(c.env, c.get("userId"));
  return c.json({ indexed });
});

snippets.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "bad id" }, 400);
  const row = await getSnippet(c.env, c.get("userId"), id);
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

snippets.patch("/:id", async (c) => {
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

snippets.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "bad id" }, 400);
  const ok = await deleteSnippet(c.env, c.get("userId"), id);
  return c.json({ ok });
});
