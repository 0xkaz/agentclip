import { Hono } from "hono";
import type { Env, Vars } from "./types";
import { requireBearer } from "./middleware";
import {
  insertSnippet,
  getSnippet,
  listRecent,
  searchSnippets,
  getSnippetsByIds,
  updateSnippet,
  deleteSnippet,
} from "./db";
import { semanticSearch } from "./vectors";

// Minimal stateless MCP server over Streamable HTTP (JSON-RPC).
// Implements: initialize, tools/list, tools/call. Bearer-token auth.
export const mcp = new Hono<{ Bindings: Env; Variables: Vars }>();

const PROTOCOL_VERSION = "2024-11-05";

const TOOL_DEFS = [
  {
    name: "store_snippet",
    description: "Save a text snippet to the user's AgentClip store.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "The text to store." },
        title: { type: "string" },
        source_url: { type: "string" },
        tags: { type: "string", description: "Comma-separated tags." },
        encrypted: {
          type: "boolean",
          description: "Encrypt at rest and exclude from search.",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "search_snippets",
    description: "Full-text (keyword) search the user's stored snippets.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "semantic_search",
    description:
      "Semantic (meaning-based) search over the user's snippets using embeddings.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_snippet",
    description: "Fetch a single snippet by id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" } },
      required: ["id"],
    },
  },
  {
    name: "list_recent",
    description: "List the most recently saved snippets.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "update_snippet",
    description: "Update a snippet's content (and optional title/tags) by id.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" },
        content: { type: "string" },
        title: { type: "string" },
        tags: { type: "string" },
        encrypted: { type: "boolean" },
      },
      required: ["id", "content"],
    },
  },
  {
    name: "delete_snippet",
    description: "Delete a snippet by id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" } },
      required: ["id"],
    },
  },
];

function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}
function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
function textContent(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

async function callTool(
  c: { env: Env },
  userId: number,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const env = c.env;
  switch (name) {
    case "store_snippet": {
      const row = await insertSnippet(
        env,
        userId,
        String(args.content ?? ""),
        args.title != null ? String(args.title) : null,
        args.source_url != null ? String(args.source_url) : null,
        args.tags != null ? String(args.tags) : null,
        args.encrypted === true,
      );
      return textContent({ id: row.id, saved: true, encrypted: !!row.encrypted });
    }
    case "search_snippets": {
      const rows = await searchSnippets(
        env,
        userId,
        String(args.query ?? ""),
        Math.min(Number(args.limit ?? 10) || 10, 50),
      );
      return textContent(rows);
    }
    case "semantic_search": {
      const ids = await semanticSearch(
        env,
        userId,
        String(args.query ?? ""),
        Math.min(Number(args.limit ?? 10) || 10, 50),
      );
      return textContent(await getSnippetsByIds(env, userId, ids));
    }
    case "get_snippet": {
      const row = await getSnippet(env, userId, Number(args.id));
      return textContent(row ?? { error: "not found" });
    }
    case "list_recent": {
      const rows = await listRecent(
        env,
        userId,
        Math.min(Number(args.limit ?? 10) || 10, 50),
      );
      return textContent(rows);
    }
    case "update_snippet": {
      const row = await updateSnippet(
        env,
        userId,
        Number(args.id),
        String(args.content ?? ""),
        args.title != null ? String(args.title) : null,
        args.tags != null ? String(args.tags) : null,
        args.encrypted === true,
      );
      return textContent(row ?? { error: "not found" });
    }
    case "delete_snippet": {
      const ok = await deleteSnippet(env, userId, Number(args.id));
      return textContent({ deleted: ok });
    }
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

mcp.use("*", requireBearer);

mcp.post("/", async (c) => {
  const req = await c.req.json<{ id?: unknown; method?: string; params?: any }>().catch(
    () => null,
  );
  if (!req?.method) return c.json(rpcError(null, -32600, "invalid request"), 400);
  const userId = c.get("userId");

  switch (req.method) {
    case "initialize":
      return c.json(
        rpcResult(req.id, {
          protocolVersion: PROTOCOL_VERSION,
          serverInfo: { name: "agentclip", version: "0.1.0" },
          capabilities: { tools: {} },
        }),
      );
    case "notifications/initialized":
      return c.body(null, 204);
    case "tools/list":
      return c.json(rpcResult(req.id, { tools: TOOL_DEFS }));
    case "tools/call": {
      const name = req.params?.name as string;
      const args = (req.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const result = await callTool(c, userId, name, args);
        return c.json(rpcResult(req.id, result));
      } catch (e) {
        return c.json(rpcError(req.id, -32000, (e as Error).message));
      }
    }
    default:
      return c.json(rpcError(req.id, -32601, "method not found"));
  }
});
