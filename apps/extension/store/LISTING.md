# AgentClip — Chrome Web Store listing

Assets in this folder:

| File | Use | Size |
|------|-----|------|
| `screenshot-1280x800.png` | Screenshot #1 (feature graphic) | 1280×800 |
| `promo-marquee-1400x560.png` | Marquee promo tile | 1400×560 |
| `promo-small-440x280.png` | Small promo tile | 440×280 |
| `../src/icons/icon128.png` | Store icon | 128×128 |

> Still recommended: 2–3 real screenshots of the dashboard (Snippets / Tokens /
> Setup) and the right-click → confirm flow. Capture them logged in at
> https://agentclip.0xkaz.com and crop to 1280×800. See "Capturing screenshots" below.

---

## Name

AgentClip — clip text, recall it from any AI

## Short description (≤132 chars)

Save selected browser text to your own store and read it back from your AI agents over MCP or a token-authenticated REST API.

## Detailed description

AgentClip turns the text you select in the browser into a personal, searchable memory
that your AI agents and tools can read.

How it works:
1. Select text on any page, right-click, and choose "Save to AgentClip."
2. Edit the content, title, tags, and source in a quick confirm window — then save.
3. Retrieve your clips from the dashboard, a REST API, or an MCP server using a
   per-user token you control.

Features:
• One-click capture from any page via the right-click menu
• Edit before saving — content, title, tags, and source URL
• Full-text search across everything you've clipped
• Per-clip encryption: mark sensitive clips to encrypt them at rest and exclude
  them from search
• MCP server + REST API so AI agents (e.g. Claude) can store and search your clips
• Per-user API tokens you can create and revoke anytime
• Sign in with Google; your data is scoped to your account

AgentClip is open source: https://github.com/0xkaz/agentclip
Privacy policy: https://agentclip.0xkaz.com/privacy

Note: please don't clip passwords or other secrets. Snippet text is readable by the
service so it can be searched and returned to your agents (encrypted clips are protected
at rest and excluded from search, but this is not end-to-end encryption).

## Category

Productivity

## Permission justifications (paste into the dashboard)

- contextMenus — "Adds a right-click 'Save to AgentClip' item so the user can send the
  text they have selected to their store."
- storage — "Stores the user's API base URL and API token locally so the extension can
  authenticate requests."
- host permission (agentclip.0xkaz.com) — "Sends saved snippets to the user's own
  AgentClip API endpoint."

## Privacy practices (dashboard)

- Data handled: user-selected text and optional title/tags/source URL, account email.
- Not sold, not used for ads, not shared with third parties.
- "Limited Use" compliant; data is used only to provide the user's own clip store.

## Distribution

Visibility: **Unlisted** (share by direct link). Switch to Public only if/when this
becomes a multi-tenant product.

## Build the upload package

```sh
pnpm --filter @agentclip/extension package   # → apps/extension/agentclip-extension.zip
```

## Capturing screenshots

Log in at https://agentclip.0xkaz.com, then capture (Cmd-Shift-4 on macOS) at a 1280×800
window:
1. Snippets page with a few clips (incl. one encrypted, masked).
2. API Tokens page (token creation reveal).
3. Setup & Usage page (MCP config + curl).
4. A page showing the right-click "Save to AgentClip" menu + confirm window.
