import { Hono } from "hono";
import type { CreateTokenInput, CreatedToken } from "@agentclip/shared";
import type { Env, Vars } from "./types";
import { requireSession } from "./middleware";
import { createToken, listTokens, revokeToken } from "./db";
import { randomToken, sha256Hex } from "./crypto";

// Token management — dashboard only (session auth). Tokens are shown once.
export const tokens = new Hono<{ Bindings: Env; Variables: Vars }>();

tokens.use("*", requireSession);

tokens.get("/", async (c) => {
  const rows = await listTokens(c.env.DB, c.get("userId"));
  return c.json({ tokens: rows });
});

tokens.post("/", async (c) => {
  const body = await c.req.json<CreateTokenInput>().catch(() => null);
  const name = body?.name?.trim() || "default";
  const plain = randomToken();
  const hash = await sha256Hex(plain);
  const id = await createToken(c.env.DB, c.get("userId"), name, hash);
  const created: CreatedToken = { id, name, token: plain };
  return c.json(created, 201);
});

tokens.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "bad id" }, 400);
  await revokeToken(c.env.DB, c.get("userId"), id);
  return c.json({ ok: true });
});
