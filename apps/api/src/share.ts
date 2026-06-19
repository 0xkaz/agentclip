// Public, read-only share page served at GET /s/:slug.
import type { Snippet } from "@agentclip/shared";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SHELL = (title: string, body: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 680px; margin: 48px auto; padding: 0 20px; color: #0f172a; }
  .card { border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.04); padding: 24px; }
  h1 { font-size: 1.3rem; margin: 0 0 12px; }
  pre { white-space: pre-wrap; word-wrap: break-word; font: inherit; margin: 0; line-height: 1.6; color: #1e293b; }
  .tags { margin-top: 14px; }
  .tag { display: inline-block; background: #f1f5f9; color: #475569; border-radius: 6px; padding: 2px 8px; font-size: .78rem; margin-right: 6px; }
  .brand { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; }
  .logo { width: 26px; height: 26px; border-radius: 7px; background: #4f46e5; display: grid; place-items: center; color: #fff; font-weight: 700; }
  a { color: #4f46e5; text-decoration: none; }
  .foot { margin-top: 20px; font-size: .8rem; color: #94a3b8; }
  .src { font-size: .8rem; margin-top: 10px; }
</style>
</head>
<body>
  <div class="brand"><span class="logo">✂</span><a href="/"><b>AgentClip</b></a></div>
  ${body}
</body>
</html>`;

export function sharePageHtml(s: Snippet): string {
  const tags = (s.tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `<span class="tag">${esc(t)}</span>`)
    .join("");
  const src = s.source_url
    ? `<div class="src">Source: <a href="${esc(s.source_url)}" rel="noreferrer nofollow">${esc(s.source_url)}</a></div>`
    : "";
  return SHELL(
    s.title ? `${s.title} — AgentClip` : "Shared clip — AgentClip",
    `<div class="card">
      ${s.title ? `<h1>${esc(s.title)}</h1>` : ""}
      <pre>${esc(s.content)}</pre>
      ${tags ? `<div class="tags">${tags}</div>` : ""}
      ${src}
    </div>
    <p class="foot">Shared via <a href="/">AgentClip</a></p>`,
  );
}

export function shareNotFoundHtml(): string {
  return SHELL(
    "Not found — AgentClip",
    `<div class="card"><h1>This link isn't available</h1>
     <p>The shared clip was removed, revoked, or has expired.</p></div>`,
  );
}
