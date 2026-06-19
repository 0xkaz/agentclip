import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import type { Env, Vars } from "./types";
import { userIdForToken } from "./db";
import { verifySession } from "./crypto";

export const SESSION_COOKIE = "ac_session";

type Ctx = Context<{ Bindings: Env; Variables: Vars }>;

// Bearer-token auth for machine clients (extension / MCP / API).
export async function requireBearer(c: Ctx, next: Next) {
  const auth = c.req.header("Authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return c.json({ error: "missing bearer token" }, 401);
  const userId = await userIdForToken(c.env.DB, m[1]);
  if (!userId) return c.json({ error: "invalid token" }, 401);
  c.set("userId", userId);
  await next();
}

// Signed-cookie session auth for the dashboard.
export async function requireSession(c: Ctx, next: Next) {
  const cookie = getCookie(c, SESSION_COOKIE);
  if (!cookie) return c.json({ error: "not authenticated" }, 401);
  const payload = await verifySession<{ uid: number }>(c.env.SESSION_SECRET, cookie);
  if (!payload?.uid) return c.json({ error: "invalid session" }, 401);
  c.set("userId", payload.uid);
  await next();
}
