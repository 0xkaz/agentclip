import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { verifyGoogleIdToken } from "../src/google";

// Build a self-signed RS256 JWT and serve the matching public key as a JWKS so
// verifyGoogleIdToken can be exercised end-to-end without hitting Google.

const KID = "test-key-1";
let privateKey: CryptoKey;
let publicJwk: JsonWebKey;

function b64url(bytes: Uint8Array | string): string {
  const buf = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let bin = "";
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function makeIdToken(claims: Record<string, unknown>): Promise<string> {
  const header = b64url(JSON.stringify({ alg: "RS256", kid: KID, typ: "JWT" }));
  const payload = b64url(JSON.stringify(claims));
  const data = new TextEncoder().encode(`${header}.${payload}`);
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, data),
  );
  return `${header}.${payload}.${b64url(sig)}`;
}

function stubCerts(jwk: JsonWebKey): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ keys: [jwk] }),
      headers: { get: () => "public, max-age=3600" },
    })),
  );
}

const AUD = "client-123.apps.googleusercontent.com";
const ISS = "https://accounts.google.com";
const future = () => Math.floor(Date.now() / 1000) + 3600;

beforeAll(async () => {
  const pair = (await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  privateKey = pair.privateKey;
  const exported = (await crypto.subtle.exportKey("jwk", pair.publicKey)) as unknown as Record<
    string,
    unknown
  >;
  publicJwk = { ...exported, kid: KID, alg: "RS256", use: "sig" } as unknown as JsonWebKey;
});

afterEach(() => vi.unstubAllGlobals());

describe("verifyGoogleIdToken", () => {
  const base = () => ({ sub: "u1", email: "a@b.com", email_verified: true, aud: AUD, iss: ISS, exp: future() });

  it("accepts a valid token and returns its claims", async () => {
    stubCerts(publicJwk);
    const token = await makeIdToken(base());
    const claims = await verifyGoogleIdToken(token, [AUD]);
    expect(claims.sub).toBe("u1");
    expect(claims.email).toBe("a@b.com");
  });

  it("rejects an audience that is not allow-listed", async () => {
    stubCerts(publicJwk);
    const token = await makeIdToken(base());
    await expect(verifyGoogleIdToken(token, ["someone-else"])).rejects.toThrow();
  });

  it("rejects an unexpected issuer", async () => {
    stubCerts(publicJwk);
    const token = await makeIdToken({ ...base(), iss: "https://evil.example" });
    await expect(verifyGoogleIdToken(token, [AUD])).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    stubCerts(publicJwk);
    const token = await makeIdToken({ ...base(), exp: Math.floor(Date.now() / 1000) - 10 });
    await expect(verifyGoogleIdToken(token, [AUD])).rejects.toThrow();
  });

  it("rejects a tampered signature", async () => {
    stubCerts(publicJwk);
    const token = await makeIdToken(base());
    const tampered = token.slice(0, -3) + (token.endsWith("AAA") ? "BBB" : "AAA");
    await expect(verifyGoogleIdToken(tampered, [AUD])).rejects.toThrow();
  });
});
