import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import type { Env, Vars } from "./types";
import { upsertUser, createToken } from "./db";
import { signSession, randomToken, sha256Hex } from "./crypto";
import { SESSION_COOKIE } from "./middleware";
import { verifyGoogleIdToken } from "./google";

export const auth = new Hono<{ Bindings: Env; Variables: Vars }>();

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";

function redirectUri(env: Env): string {
  return `${env.APP_BASE_URL}/auth/google/callback`;
}

// Step 1: send the user to Google's consent screen.
auth.get("/google/login", (c) => {
  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(c.env),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
  });
  return c.redirect(`${GOOGLE_AUTH}?${params.toString()}`);
});

// Step 2: exchange the code, upsert the user, set a signed session cookie.
auth.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.text("missing code", 400);

  const tokenRes = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(c.env),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return c.text("token exchange failed", 502);
  const { access_token } = await tokenRes.json<{ access_token: string }>();

  const infoRes = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) return c.text("userinfo failed", 502);
  const info = await infoRes.json<{ sub: string; email: string; name?: string }>();

  const user = await upsertUser(c.env.DB, info.sub, info.email, info.name ?? null);
  const session = await signSession(c.env.SESSION_SECRET, { uid: user.id });

  setCookie(c, SESSION_COOKIE, session, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return c.redirect(c.env.DASHBOARD_ORIGIN);
});

// Native mobile sign-in: the app performs Google Sign-In on-device and POSTs
// the resulting ID token here. We verify it ourselves (google.ts) and mint an
// opaque `ac_live_...` Bearer token — the same kind the dashboard issues — so
// the app can call the REST API. The plain token is returned once.
auth.post("/google/native", async (c) => {
  const body = await c.req.json<{ idToken?: string }>().catch(() => null);
  const idToken = body?.idToken?.trim();
  if (!idToken) return c.json({ error: "idToken required" }, 400);

  // The ID token's audience is the OAuth client id the app signed in with
  // (typically the Web client id passed to the native SDK). Accept the
  // dashboard client id plus any extra native client ids from config.
  const audiences = [c.env.GOOGLE_CLIENT_ID, ...(c.env.GOOGLE_NATIVE_CLIENT_IDS ?? "").split(",")]
    .map((s) => s.trim())
    .filter(Boolean);

  let claims;
  try {
    claims = await verifyGoogleIdToken(idToken, audiences);
  } catch {
    return c.json({ error: "invalid Google token" }, 401);
  }
  if (!(claims.email_verified === true || claims.email_verified === "true")) {
    return c.json({ error: "email not verified" }, 403);
  }

  const user = await upsertUser(c.env.DB, claims.sub, claims.email, claims.name ?? null);
  const plain = randomToken();
  await createToken(c.env.DB, user.id, "mobile", await sha256Hex(plain));
  return c.json({ token: plain, tokenType: "Bearer" }, 201);
});

auth.post("/logout", (c) => {
  setCookie(c, SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return c.json({ ok: true });
});
