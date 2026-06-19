// Shared types/DTOs across api, web, and extension.

export interface Snippet {
  id: number;
  user_id: number;
  content: string;
  title: string | null;
  source_url: string | null;
  tags: string | null; // comma-separated for v1
  encrypted: number; // 0 | 1 — encrypted clips are encrypted at rest and excluded from search
  created_at: string;
  updated_at: string;
  share_slug?: string | null; // present when the clip has a live public share link
}

export interface ShareResult {
  slug: string;
  url: string;
}

export interface ApiToken {
  id: number;
  user_id: number;
  name: string;
  // token_hash is never returned to clients
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface User {
  id: number;
  google_sub: string;
  email: string;
  name: string | null;
  created_at: string;
}

// ---- Request DTOs ----

export interface CreateSnippetInput {
  content: string;
  title?: string;
  source_url?: string;
  tags?: string;
  encrypted?: boolean; // encrypt at rest + exclude from search
}

export interface CreateTokenInput {
  name: string;
}

// Returned only once, at creation time.
export interface CreatedToken {
  id: number;
  name: string;
  token: string; // plaintext, shown once
}

// ---- MCP ----

export const MCP_TOOLS = [
  "store_snippet",
  "search_snippets",
  "get_snippet",
  "list_recent",
] as const;

export type McpToolName = (typeof MCP_TOOLS)[number];
