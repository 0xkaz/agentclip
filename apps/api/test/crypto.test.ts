import { describe, it, expect } from "vitest";
import {
  randomToken,
  sha256Hex,
  signSession,
  verifySession,
  encryptContent,
  decryptContent,
} from "../src/crypto";

describe("crypto", () => {
  it("generates prefixed, unique tokens", () => {
    const a = randomToken();
    const b = randomToken();
    expect(a.startsWith("ac_live_")).toBe(true);
    expect(a).not.toEqual(b);
  });

  it("hashes deterministically", async () => {
    expect(await sha256Hex("hello")).toEqual(await sha256Hex("hello"));
    expect(await sha256Hex("a")).not.toEqual(await sha256Hex("b"));
  });

  it("signs and verifies a session, rejecting tampering", async () => {
    const secret = "test-secret";
    const token = await signSession(secret, { uid: 42 });
    expect(await verifySession<{ uid: number }>(secret, token)).toEqual({ uid: 42 });
    expect(await verifySession(secret, token + "x")).toBeNull();
    expect(await verifySession("wrong-secret", token)).toBeNull();
  });

  it("encrypts and decrypts content round-trip", async () => {
    const key = "encryption-test-key";
    const plain = "secret note 日本語 🔒";
    const enc = await encryptContent(key, plain);
    expect(enc.startsWith("enc:v1:")).toBe(true);
    expect(enc).not.toContain(plain);
    expect(await decryptContent(key, enc)).toEqual(plain);
  });

  it("passes through non-encrypted content unchanged", async () => {
    expect(await decryptContent("k", "plain text")).toEqual("plain text");
  });
});
