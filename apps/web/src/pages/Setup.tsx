import { Link } from "react-router-dom";
import { Chrome, Plug, Terminal, Bot } from "lucide-react";
import { PUBLIC_BASE } from "../api";
import { Card, CodeBlock, PageHeader } from "../components/ui";

export function Setup() {
  const base = PUBLIC_BASE;

  return (
    <div>
      <PageHeader
        title="Setup & Usage"
        description="Connect the Chrome extension and your AI agents to AgentClip."
      />

      <p className="mb-6 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
        First, create a token on the{" "}
        <Link to="/app/tokens" className="font-medium underline">
          API Tokens
        </Link>{" "}
        page. You'll paste it into the extension and your MCP/API clients.
      </p>

      {/* Extension */}
      <Section icon={Chrome} title="1 · Chrome extension">
        <ol className="ml-4 list-decimal space-y-1.5 text-sm text-slate-700">
          <li>Build it: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">pnpm --filter @agentclip/extension build</code></li>
          <li>Open <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">chrome://extensions</code> → enable Developer mode.</li>
          <li>“Load unpacked” → select <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">apps/extension/dist</code>.</li>
          <li>Open the AgentClip options and set:
            <ul className="ml-4 mt-1 list-disc text-slate-600">
              <li>API base URL: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">{base}</code></li>
              <li>Token: your <code className="font-mono text-xs">ac_live_…</code> token</li>
            </ul>
          </li>
          <li>Select text on any page → right-click → “Save to AgentClip” → edit → Save.</li>
        </ol>
      </Section>

      {/* MCP */}
      <Section icon={Bot} title="2 · MCP (AI agents)">
        <p className="mb-3 text-sm text-slate-700">
          Point an MCP client at the endpoint below with your token as a Bearer header.
          Tools: <Tool>store_snippet</Tool> <Tool>search_snippets</Tool>{" "}
          <Tool>semantic_search</Tool> <Tool>get_snippet</Tool> <Tool>list_recent</Tool>{" "}
          <Tool>update_snippet</Tool> <Tool>delete_snippet</Tool>.
        </p>
        <div className="space-y-3">
          <CodeBlock label="MCP endpoint" code={`${base}/mcp`} />
          <CodeBlock
            label="Claude Desktop / MCP client config"
            code={JSON.stringify(
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
            )}
          />
        </div>
      </Section>

      {/* REST API */}
      <Section icon={Terminal} title="3 · REST API">
        <div className="space-y-3">
          <CodeBlock
            label="Save a snippet"
            code={`curl -X POST ${base}/api/snippets \\
  -H "Authorization: Bearer ac_live_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"content":"hello","tags":"demo"}'`}
          />
          <CodeBlock
            label="Search snippets"
            code={`curl "${base}/api/snippets?q=hello" \\
  -H "Authorization: Bearer ac_live_YOUR_TOKEN"`}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Plug;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mb-5 p-6">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-50 text-indigo-600">
          <Icon size={16} />
        </span>
        {title}
      </h2>
      {children}
    </Card>
  );
}

function Tool({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
      {children}
    </code>
  );
}
