// Privacy policy served at GET /privacy (clean URL for the Chrome Web Store listing).
// Review the contact line before publishing.

const CONTACT_EMAIL = "hi@0xkaz.com";
const CONTACT_REPO = "https://github.com/0xkaz/agentclip/issues";

export function privacyHtml(baseUrl: string): string {
  const host = baseUrl.replace(/^https?:\/\//, "");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AgentClip — Privacy Policy</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #0f172a; line-height: 1.65; }
  h1 { font-size: 1.6rem; } h2 { font-size: 1.15rem; margin-top: 2rem; }
  a { color: #4f46e5; } code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; }
  .muted { color: #64748b; font-size: .9rem; }
</style>
</head>
<body>
  <h1>AgentClip Privacy Policy</h1>
  <p class="muted">Last updated: 2026-06-19 · Service: <code>${host}</code></p>

  <p>AgentClip lets you save text you select in the browser to your own personal
  store and retrieve it through your AI agents and tools. This policy explains what
  data we handle and how.</p>

  <h2>What we collect</h2>
  <ul>
    <li><b>Snippets you choose to save</b> — the text you explicitly select and confirm,
      plus optional title, tags, and the source page URL.</li>
    <li><b>Account info</b> — your Google account identifier and email, obtained via
      Google OAuth when you sign in.</li>
    <li><b>API tokens</b> — stored only as a SHA-256 hash; the plaintext is shown once
      at creation and never stored.</li>
  </ul>
  <p>The Chrome extension only sends data when you actively choose “Save to AgentClip.”
  It does not read or monitor pages in the background.</p>

  <h2>How we use it</h2>
  <ul>
    <li>To store your snippets and let you (and your own tokens) search and retrieve them
      over the dashboard, REST API, and MCP.</li>
    <li>We do <b>not</b> sell your data, show ads, or share it with third parties.</li>
  </ul>

  <h2>Storage &amp; security</h2>
  <ul>
    <li>Data is stored on Cloudflare (D1), <b>encrypted at rest</b>, and all traffic uses
      <b>TLS in transit</b>.</li>
    <li>Access is scoped to your account; every request is authenticated by your Google
      session (dashboard) or your Bearer token (extension/API/MCP).</li>
    <li>Please do not clip passwords or other secrets — snippet text is readable by the
      service so it can be searched and returned to your agents.</li>
    <li>You may mark a clip as <b>encrypted</b>: its content is encrypted at rest with a
      server-managed key and is <b>excluded from search</b>. (This protects data in the
      database; it is not end-to-end encryption.)</li>
  </ul>

  <h2>Your controls</h2>
  <ul>
    <li>Edit or delete any snippet from the dashboard at any time.</li>
    <li>Revoke API tokens from the dashboard.</li>
    <li>Request full account/data deletion via the contact below.</li>
  </ul>

  <h2>Contact</h2>
  <p>Questions or deletion requests:
    <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
    &middot; <a href="${CONTACT_REPO}">GitHub issues</a></p>
</body>
</html>`;
}
