#!/usr/bin/env node
// End-to-end smoke test against a running AgentClip API (Bearer-token surface + MCP).
//
//   AGENTCLIP_TOKEN=ac_live_xxx node scripts/e2e.mjs
//   AGENTCLIP_BASE=https://agentclip.0xkaz.com AGENTCLIP_TOKEN=ac_live_xxx make e2e
//
// Create a token in the dashboard (API Tokens page) and pass it as AGENTCLIP_TOKEN.

const BASE = (process.env.AGENTCLIP_BASE || "https://agentclip.0xkaz.com").replace(/\/$/, "");
const TOKEN = process.env.AGENTCLIP_TOKEN;
if (!TOKEN) {
  console.error("Set AGENTCLIP_TOKEN (an ac_live_… token from the dashboard).");
  process.exit(2);
}
const H = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
const MARK = `e2e-${Math.random().toString(36).slice(2, 8)}`;

let passed = 0;
const created = [];
function ok(cond, label) {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { console.error(`  ✗ ${label}`); process.exitCode = 1; }
}
const api = (path, init) => fetch(`${BASE}${path}`, init);
const mcp = (name, args) =>
  api("/mcp", { method: "POST", headers: H, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }) }).then((r) => r.json());

try {
  console.log(`E2E against ${BASE} (marker ${MARK})`);

  // 1. create + get
  let r = await api("/api/snippets", { method: "POST", headers: H, body: JSON.stringify({ content: `hello ${MARK} world`, tags: "e2e" }) });
  ok(r.status === 201, "POST /api/snippets returns 201");
  const a = await r.json();
  created.push(a.id);
  ok(a.content.includes(MARK), "created snippet echoes content");
  const got = await api(`/api/snippets/${a.id}`, { headers: H }).then((x) => x.json());
  ok(got.id === a.id, "GET /api/snippets/:id");

  // 2. keyword search finds it
  const kw = await api(`/api/snippets?q=${MARK}`, { headers: H }).then((x) => x.json());
  ok(kw.snippets.some((s) => s.id === a.id), "keyword search finds the clip");

  // 3. auth rejection
  ok((await api("/api/snippets", { headers: {} })).status === 401, "missing token → 401");

  // 4. encryption: encrypted clip is decrypted on read but excluded from search
  const enc = await api("/api/snippets", { method: "POST", headers: H, body: JSON.stringify({ content: `secret ${MARK} value`, encrypted: true }) }).then((x) => x.json());
  created.push(enc.id);
  ok(enc.encrypted === 1, "encrypted clip stored with encrypted=1");
  ok(enc.content === `secret ${MARK} value`, "encrypted clip returned decrypted");
  const encSearch = await api(`/api/snippets?q=${MARK}`, { headers: H }).then((x) => x.json());
  ok(!encSearch.snippets.some((s) => s.id === enc.id), "encrypted clip excluded from search");

  // 5. update
  const upd = await api(`/api/snippets/${a.id}`, { method: "PATCH", headers: H, body: JSON.stringify({ content: `updated ${MARK}` }) }).then((x) => x.json());
  ok(upd.content === `updated ${MARK}`, "PATCH updates content");

  // 6. MCP tools/list
  const tools = await api("/mcp", { method: "POST", headers: H, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) }).then((x) => x.json());
  const names = tools.result.tools.map((t) => t.name);
  ok(["store_snippet", "search_snippets", "semantic_search", "get_snippet", "list_recent", "update_snippet", "delete_snippet"].every((n) => names.includes(n)), "MCP exposes all 7 tools");

  // 7. MCP delete (cleanup) + 404
  for (const id of created) await mcp("delete_snippet", { id });
  ok((await api(`/api/snippets/${a.id}`, { headers: H })).status === 404, "deleted clip → 404");
  created.length = 0;

  console.log(`\n${process.exitCode ? "FAILED" : "PASSED"} — ${passed} checks`);
} catch (e) {
  console.error("E2E error:", e);
  process.exitCode = 1;
} finally {
  for (const id of created) await api(`/api/snippets/${id}`, { method: "DELETE", headers: H }).catch(() => {});
}
