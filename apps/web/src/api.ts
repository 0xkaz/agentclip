import type { Snippet, ApiToken, CreatedToken, CreateSnippetInput, ShareResult } from "@agentclip/shared";

// Dev: dashboard (:5173) talks to the API worker (:8787) cross-origin.
// Production: VITE_API_BASE is "" (.env.production), so calls are same-origin relative.
export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8787";

// Public origin to show in setup/usage examples (the host clients should hit).
export const PUBLIC_BASE = API_BASE || window.location.origin;

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const loginUrl = `${API_BASE}/auth/google/login`;

export const api = {
  me: () => req<{ id: number; email: string; name: string | null }>("/api/me"),
  listTokens: () => req<{ tokens: ApiToken[] }>("/api/tokens"),
  createToken: (name: string) =>
    req<CreatedToken>("/api/tokens", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  revokeToken: (id: number) =>
    req<{ ok: boolean }>(`/api/tokens/${id}`, { method: "DELETE" }),
  // Session-scoped snippet CRUD (no token needed in the dashboard).
  mySnippets: (q?: string, mode?: "text" | "semantic") => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (mode) p.set("mode", mode);
    const qs = p.toString();
    return req<{ snippets: Snippet[] }>(`/api/my/snippets${qs ? `?${qs}` : ""}`);
  },
  shareSnippet: (id: number) =>
    req<ShareResult>(`/api/my/snippets/${id}/share`, { method: "POST" }),
  unshareSnippet: (id: number) =>
    req<{ ok: boolean }>(`/api/my/snippets/${id}/share`, { method: "DELETE" }),
  reindex: () => req<{ indexed: number }>("/api/my/reindex", { method: "POST" }),
  createMySnippet: (input: CreateSnippetInput) =>
    req<Snippet>("/api/my/snippets", { method: "POST", body: JSON.stringify(input) }),
  updateMySnippet: (id: number, input: CreateSnippetInput) =>
    req<Snippet>(`/api/my/snippets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteMySnippet: (id: number) =>
    req<{ ok: boolean }>(`/api/my/snippets/${id}`, { method: "DELETE" }),
  logout: () => req<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  // Permanently delete the account and all its data (clips, tokens, shares).
  deleteAccount: () => req<{ ok: boolean }>("/api/my/account", { method: "DELETE" }),
};
