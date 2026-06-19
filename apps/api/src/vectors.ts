// Semantic search via Workers AI embeddings + Vectorize.
// Encrypted clips are never embedded → excluded from semantic search too.
import type { Env } from "./types";
import type { Snippet } from "@agentclip/shared";

// Multilingual embedding model (1024-dim). Index must match these dimensions.
const MODEL = "@cf/baai/bge-m3";

async function embed(env: Env, text: string): Promise<number[] | null> {
  if (!env.AI) return null;
  try {
    // Call .run as a member of env.AI to preserve `this` binding.
    const ai = env.AI as unknown as {
      run(m: string, i: unknown): Promise<{ data?: number[][] }>;
    };
    const res = await ai.run(MODEL, { text: [text.slice(0, 4000)] });
    return res?.data?.[0] ?? null;
  } catch {
    return null;
  }
}

// Index (or re-index) a snippet. Best-effort; never throws.
export async function indexSnippet(env: Env, s: Snippet): Promise<void> {
  if (!env.VECTORIZE || !env.AI) return;
  if (s.encrypted) {
    await removeFromIndex(env, s.id);
    return;
  }
  const vec = await embed(env, `${s.title ?? ""}\n${s.content}`);
  if (!vec) return;
  try {
    await env.VECTORIZE.upsert([
      { id: String(s.id), values: vec, metadata: { user_id: s.user_id } },
    ]);
  } catch {
    /* best-effort */
  }
}

// Backfill: (re)embed all of a user's non-encrypted clips into Vectorize.
export async function reindexUser(env: Env, userId: number): Promise<number> {
  if (!env.VECTORIZE || !env.AI) return 0;
  const res = await env.DB
    .prepare(`SELECT * FROM snippets WHERE user_id = ? AND encrypted = 0`)
    .bind(userId)
    .all<Snippet>();
  const rows = res.results ?? [];
  for (const r of rows) await indexSnippet(env, r);
  return rows.length;
}

export async function removeFromIndex(env: Env, id: number): Promise<void> {
  if (!env.VECTORIZE) return;
  try {
    await env.VECTORIZE.deleteByIds([String(id)]);
  } catch {
    /* best-effort */
  }
}

// Returns matching snippet ids (most relevant first), scoped to the user.
export async function semanticSearch(
  env: Env,
  userId: number,
  query: string,
  topK: number,
): Promise<number[]> {
  if (!env.VECTORIZE || !env.AI) return [];
  const vec = await embed(env, query);
  if (!vec) return [];
  try {
    const res = await env.VECTORIZE.query(vec, {
      topK,
      filter: { user_id: userId },
    });
    return (res?.matches ?? []).map((m) => Number(m.id)).filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
}
