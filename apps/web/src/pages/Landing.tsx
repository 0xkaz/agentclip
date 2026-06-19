import { motion } from "framer-motion";
import { Scissors, Database, Bot, MousePointerClick, ArrowRight, Github, Terminal } from "lucide-react";
import { loginUrl, PUBLIC_BASE } from "../api";
import { CodeBlock } from "../components/ui";

const REPO_URL = "https://github.com/0xkaz/agentclip";

const fade = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
};

const features = [
  {
    icon: MousePointerClick,
    title: "Clip in one click",
    body: "Select text on any page, right-click “Save to AgentClip,” and edit it before it’s stored.",
  },
  {
    icon: Database,
    title: "Stored on Cloudflare",
    body: "Your clips live in your own per-user store with keyword and semantic search — fast and private.",
  },
  {
    icon: Bot,
    title: "Recall from any AI",
    body: "Issue a token and your AI agents read your clips over MCP or a simple REST API.",
  },
];

const steps = [
  { n: "1", t: "Sign in with Google", d: "Create your account in one click." },
  { n: "2", t: "Install the extension", d: "Clip selected text from any browser tab." },
  { n: "3", t: "Connect your agent", d: "Add your token to an MCP client or call the API." },
];

// REST endpoints (Bearer token). Share links are created from the dashboard
// (session) and read publicly at /s/:slug.
const restEndpoints: [string, string, string][] = [
  ["POST", "/api/snippets", "Create a clip — content, title?, source_url?, tags?, encrypted?"],
  ["GET", "/api/snippets?q=&mode=&limit=", "List, or keyword / semantic search (mode=semantic)"],
  ["GET", "/api/snippets/:id", "Fetch one clip"],
  ["PATCH", "/api/snippets/:id", "Update content / title / tags / encrypted"],
  ["DELETE", "/api/snippets/:id", "Delete a clip"],
  ["POST", "/api/snippets/reindex", "Rebuild the semantic index for existing clips"],
];

const mcpTools: [string, string][] = [
  ["store_snippet", "Save a clip (supports encrypted)"],
  ["search_snippets", "Keyword (substring) search"],
  ["semantic_search", "Meaning-based search"],
  ["get_snippet", "Fetch one clip by id"],
  ["list_recent", "List the newest clips"],
  ["update_snippet", "Update a clip"],
  ["delete_snippet", "Delete a clip"],
];

export function Landing() {
  const base = PUBLIC_BASE;
  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        agentclip: {
          type: "http",
          url: `${base}/mcp`,
          headers: { Authorization: "Bearer ac_live_YOUR_TOKEN" },
        },
      },
    },
    null,
    2,
  );
  const restExample = `B=${base}
H='Authorization: Bearer ac_live_YOUR_TOKEN'

# create ("encrypted": true to encrypt at rest + exclude from search)
curl -X POST $B/api/snippets -H "$H" -H 'Content-Type: application/json' \\
  -d '{"content":"hello","title":"note","tags":"demo","encrypted":false}'

# keyword search (substring; works for Japanese)
curl "$B/api/snippets?q=hello&limit=20" -H "$H"

# semantic search (meaning-based)
curl "$B/api/snippets?q=greeting&mode=semantic" -H "$H"

# get one
curl "$B/api/snippets/123" -H "$H"

# update
curl -X PATCH $B/api/snippets/123 -H "$H" -H 'Content-Type: application/json' \\
  -d '{"content":"updated"}'

# delete
curl -X DELETE $B/api/snippets/123 -H "$H"

# rebuild the semantic index for older clips
curl -X POST $B/api/snippets/reindex -H "$H"`;

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">
            <Scissors size={16} />
          </span>
          <span className="text-base font-semibold tracking-tight">AgentClip</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="#developers"
            className="mr-1 hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:inline"
          >
            API &amp; MCP
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            aria-label="GitHub repository"
          >
            <Github size={17} />
          </a>
          <a
            href={loginUrl}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Sign in
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50 via-white to-violet-50" />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white/70 px-3 py-1 text-xs font-medium text-indigo-700">
              <Bot size={13} /> MCP + REST ready
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Clip anything.{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Recall it from any AI.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
              AgentClip saves the text you select in the browser to a personal store,
              then lets your AI agents read it back over MCP or a token-authenticated API.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <a
                href={loginUrl}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Sign in with Google <ArrowRight size={16} />
              </a>
              <a
                href="#how"
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                How it works
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-5 sm:grid-cols-3">
          {features.map((f) => (
            <motion.div
              key={f.title}
              {...fade}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                <f.icon size={20} />
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl px-6 py-16">
        <motion.h2 {...fade} className="text-center text-2xl font-semibold tracking-tight">
          Three steps to a memory your agents share
        </motion.h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {steps.map((s) => (
            <motion.div {...fade} key={s.n} className="rounded-xl border border-slate-200 bg-white p-6">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {s.n}
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{s.t}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.d}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <a
            href={loginUrl}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Get started free <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* For developers — API & MCP (visible without signing in) */}
      <section id="developers" className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <motion.div {...fade} className="mb-8 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              <Terminal size={13} /> For developers
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">API &amp; MCP</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
              Sign in and create a per-user token (dashboard → API Tokens), then read and
              write your clips from any AI agent or tool. Replace
              <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">ac_live_YOUR_TOKEN</code>
              with your token.
            </p>
          </motion.div>

          {/* Auth note */}
          <motion.div {...fade} className="mb-8 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <b className="text-slate-800">Auth.</b> Every request uses a per-user Bearer
            token: <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">Authorization: Bearer ac_live_…</code>.
            Base URL <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">{base}</code>.
            Every clip is scoped to your account.
          </motion.div>

          {/* REST */}
          <motion.div {...fade} className="mb-10">
            <div className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
              <Terminal size={18} className="text-indigo-600" /> REST API
            </div>
            <div className="mb-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Method</th>
                    <th className="px-4 py-2 font-medium">Path</th>
                    <th className="hidden px-4 py-2 font-medium sm:table-cell">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {restEndpoints.map(([m, p, d]) => (
                    <tr key={m + p}>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-700">{m}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-800">{p}</td>
                      <td className="hidden px-4 py-2.5 text-xs text-slate-500 sm:table-cell">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CodeBlock label="curl — full reference" code={restExample} />
            <p className="mt-2 text-xs text-slate-500">
              Share links are created from the dashboard and read publicly at
              <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono">{base}/s/&lt;slug&gt;</code>.
            </p>
          </motion.div>

          {/* MCP */}
          <motion.div {...fade}>
            <div className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
              <Bot size={18} className="text-indigo-600" /> MCP server
            </div>
            <p className="mb-4 text-sm text-slate-600">
              Point any MCP client at <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">{base}/mcp</code> (Streamable HTTP).
            </p>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Tool</th>
                      <th className="px-4 py-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mcpTools.map(([n, d]) => (
                      <tr key={n}>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-800">{n}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <CodeBlock label="MCP client config" code={mcpConfig} />
            </div>
          </motion.div>

          <div className="mt-10 text-center">
            <a
              href={loginUrl}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sign in to get a token <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-5">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <Github size={16} /> github.com/0xkaz/agentclip
            </a>
            <a href="/privacy" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Privacy
            </a>
          </div>
          <p className="text-center text-sm text-slate-400">
            AgentClip · a personal clip store for the age of AI agents
          </p>
        </div>
      </footer>
    </div>
  );
}
