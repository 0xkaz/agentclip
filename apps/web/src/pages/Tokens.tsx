import { useEffect, useState } from "react";
import type { ApiToken, CreatedToken } from "@agentclip/shared";
import { KeyRound, Trash2, TriangleAlert } from "lucide-react";
import { api } from "../api";
import { Badge, Button, Card, CopyButton, Input, PageHeader } from "../components/ui";

export function Tokens() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<CreatedToken | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setTokens(await api.listTokens().then((r) => r.tokens));
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    setBusy(true);
    try {
      const t = await api.createToken(name.trim() || "default");
      setCreated(t);
      setName("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: number) {
    await api.revokeToken(id);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="API Tokens"
        description="Tokens authenticate the extension, MCP clients, and the REST API."
      />

      {/* Create */}
      <Card className="mb-6 p-5">
        <label className="text-sm font-medium text-slate-700">Create a token</label>
        <div className="mt-2 flex gap-2">
          <Input
            value={name}
            placeholder="e.g. laptop-extension, claude-mcp"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <Button onClick={create} disabled={busy}>
            <KeyRound size={16} /> Create
          </Button>
        </div>

        {created && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <TriangleAlert size={16} /> Copy this token now — it won't be shown again.
            </div>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-md border border-amber-200 bg-white px-3 py-2 font-mono text-xs text-slate-800">
                {created.token}
              </code>
              <CopyButton text={created.token} />
            </div>
          </div>
        )}
      </Card>

      {/* List */}
      <Card>
        <div className="border-b border-slate-100 px-5 py-3 text-sm font-medium text-slate-700">
          Your tokens
        </div>
        {tokens.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No tokens yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-800">{t.name}</span>
                    {t.revoked_at && <Badge className="bg-red-50 text-red-600">revoked</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    created {t.created_at}
                    {t.last_used_at ? ` · last used ${t.last_used_at}` : " · never used"}
                  </div>
                </div>
                {!t.revoked_at && (
                  <Button variant="danger" size="sm" onClick={() => revoke(t.id)}>
                    <Trash2 size={14} /> Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
