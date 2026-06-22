// Verify Google ID tokens (JWT) issued to the mobile app's native Google
// Sign-In. Unlike the dashboard's authorization-code flow (auth.ts), native
// apps obtain an ID token directly and POST it here, so the Worker must verify
// the signature itself against Google's published RSA keys (JWKS).
//
// No external dependency: RS256 verification uses Web Crypto, which is
// available on Cloudflare Workers.

const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const VALID_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export interface GoogleIdTokenClaims {
  sub: string;
  email: string;
  email_verified?: boolean | string;
  name?: string;
  aud: string;
  iss: string;
  exp: number;
}

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeSegment<T>(segment: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment))) as T;
}

// Cache Google's signing keys for the lifetime of the isolate. Google rotates
// keys infrequently and advertises caching via Cache-Control; a per-isolate
// cache keeps logins fast without risking stale-key failures for long.
let keyCache: { keys: JsonWebKey[]; expiresAt: number } | null = null;

async function fetchGoogleKeys(now: number): Promise<JsonWebKey[]> {
  if (keyCache && keyCache.expiresAt > now) return keyCache.keys;
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new Error("failed to fetch Google signing keys");
  const body = (await res.json()) as { keys: JsonWebKey[] };
  // Honour the response's max-age, falling back to 1 hour.
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "")?.[1] ?? 3600);
  keyCache = { keys: body.keys, expiresAt: now + maxAge * 1000 };
  return body.keys;
}

/**
 * Verify a Google-issued ID token and return its claims. Throws if the token is
 * malformed, has a bad signature, is expired, or its issuer/audience don't
 * match. `allowedAudiences` must contain the OAuth client id(s) the token was
 * minted for (the mobile app's Google client id, typically the Web client id).
 */
export async function verifyGoogleIdToken(
  idToken: string,
  allowedAudiences: string[],
  now: number = Date.now(),
): Promise<GoogleIdTokenClaims> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("malformed id token");
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  const header = decodeSegment<{ alg: string; kid: string }>(headerB64);
  if (header.alg !== "RS256") throw new Error(`unexpected token algorithm: ${header.alg}`);

  const keys = await fetchGoogleKeys(now);
  const jwk = keys.find((k) => (k as JsonWebKey & { kid?: string }).kid === header.kid);
  if (!jwk) throw new Error("signing key not found");

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signed = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlToBytes(signatureB64),
    signed,
  );
  if (!valid) throw new Error("invalid token signature");

  const claims = decodeSegment<GoogleIdTokenClaims>(payloadB64);
  if (!VALID_ISSUERS.includes(claims.iss)) throw new Error(`invalid issuer: ${claims.iss}`);
  if (!allowedAudiences.includes(claims.aud)) throw new Error("audience mismatch");
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= now) throw new Error("token expired");
  if (!claims.sub || !claims.email) throw new Error("token missing sub/email");

  return claims;
}
