// Build the extension into dist/.
//   node build.mjs          → dev build (keeps localhost host permission)
//   node build.mjs --prod   → store build (strips localhost; agentclip.0xkaz.com only)
import { cpSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "src");
const dist = join(here, "dist");
const prod = process.argv.includes("--prod");

rmSync(dist, { recursive: true, force: true });
cpSync(src, dist, { recursive: true });

if (prod) {
  const mpath = join(dist, "manifest.json");
  const m = JSON.parse(readFileSync(mpath, "utf8"));
  m.host_permissions = (m.host_permissions ?? []).filter((h) => !h.includes("localhost"));
  writeFileSync(mpath, JSON.stringify(m, null, 2) + "\n");
  console.log("production manifest host_permissions:", m.host_permissions);
}

console.log(`built extension → apps/extension/dist${prod ? " (production)" : " (dev)"}`);
