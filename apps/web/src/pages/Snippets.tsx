import { useEffect, useState } from "react";
import type { Snippet, CreateSnippetInput } from "@agentclip/shared";
import { Search, ExternalLink, FileText, Plus, Pencil, Trash2, X, Check, Lock, Eye, EyeOff, Share2, Globe, Sparkles } from "lucide-react";
import { api, PUBLIC_BASE } from "../api";
import { Badge, Button, Card, CopyButton, Input, PageHeader } from "../components/ui";

const empty: CreateSnippetInput = { content: "", title: "", tags: "", source_url: "", encrypted: false };

export function Snippets() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<CreateSnippetInput>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [edit, setEdit] = useState<CreateSnippetInput>(empty);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<"text" | "semantic">("text");
  const [reindexing, setReindexing] = useState<string>("");

  async function reindex() {
    setReindexing("Rebuilding…");
    try {
      const { indexed } = await api.reindex();
      setReindexing(`Indexed ${indexed} clips. Search is ready in ~1 min.`);
    } catch {
      setReindexing("Failed — try again.");
    }
  }

  const toggleReveal = (id: number) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  async function load(q?: string, searchMode: "text" | "semantic" = mode) {
    setLoading(true);
    try {
      const qt = q?.trim();
      setSnippets((await api.mySnippets(qt || undefined, qt ? searchMode : undefined)).snippets);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function share(id: number) {
    await api.shareSnippet(id);
    await load(query);
  }
  async function unshare(id: number) {
    await api.unshareSnippet(id);
    await load(query);
  }

  async function create() {
    if (!draft.content.trim()) return;
    setBusy(true);
    try {
      await api.createMySnippet(draft);
      setDraft(empty);
      setAdding(false);
      await load(query);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: number) {
    if (!edit.content.trim()) return;
    setBusy(true);
    try {
      await api.updateMySnippet(id, edit);
      setEditId(null);
      await load(query);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this snippet?")) return;
    await api.deleteMySnippet(id);
    await load(query);
  }

  function startEdit(s: Snippet) {
    setEditId(s.id);
    setEdit({
      content: s.content,
      title: s.title ?? "",
      tags: s.tags ?? "",
      source_url: s.source_url ?? "",
      encrypted: !!s.encrypted,
    });
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <PageHeader title="Snippets" description="Everything you've clipped, newest first." />
        <Button onClick={() => { setAdding((v) => !v); setDraft(empty); }}>
          <Plus size={16} /> New
        </Button>
      </div>

      {adding && (
        <Card className="mb-5 p-5">
          <SnippetForm value={draft} onChange={setDraft} showSource />
          <div className="mt-3 flex gap-2">
            <Button onClick={create} disabled={busy || !draft.content.trim()}>
              <Check size={16} /> Save
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="mb-2 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            placeholder={mode === "semantic" ? "Search by meaning…" : "Search your clips…"}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(query)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => load(query)}>Search</Button>
        {query && (
          <Button variant="ghost" onClick={() => { setQuery(""); load("", mode); }}>Clear</Button>
        )}
      </div>
      <div className="mb-6 inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
        {(["text", "semantic"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); if (query.trim()) load(query, m); }}
            className={
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors " +
              (mode === m ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-800")
            }
          >
            {m === "semantic" ? <Sparkles size={14} /> : <Search size={14} />}
            {m === "semantic" ? "Semantic" : "Keyword"}
          </button>
        ))}
      </div>
      {mode === "semantic" && (
        <div className="mb-6 -mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span>Semantic search needs clips to be indexed.</span>
          <button onClick={reindex} className="font-medium text-indigo-600 hover:underline">
            Rebuild index
          </button>
          {reindexing && <span className="text-slate-400">{reindexing}</span>}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : snippets.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
            <FileText size={22} />
          </span>
          <p className="font-medium text-slate-700">No snippets yet</p>
          <p className="max-w-sm text-sm text-slate-500">
            Add one with “New,” or clip text from any page with the Chrome extension.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {snippets.map((s) =>
            editId === s.id ? (
              <Card key={s.id} className="p-5">
                <SnippetForm value={edit} onChange={setEdit} showSource />
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => saveEdit(s.id)} disabled={busy || !edit.content.trim()}>
                    <Check size={16} /> Save
                  </Button>
                  <Button variant="ghost" onClick={() => setEditId(null)}>
                    <X size={16} /> Cancel
                  </Button>
                </div>
              </Card>
            ) : (
              <Card key={s.id} className="group p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {s.title && (
                      <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                        {!!s.encrypted && <Lock size={13} className="text-indigo-600" />}
                        {s.title}
                      </p>
                    )}
                    {s.encrypted && !revealed.has(s.id) ? (
                      <button
                        onClick={() => toggleReveal(s.id)}
                        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600"
                      >
                        <Lock size={14} />
                        <span className="tracking-widest">•••••••••••••</span>
                        <span className="inline-flex items-center gap-1 font-medium text-indigo-600">
                          <Eye size={13} /> Show
                        </span>
                      </button>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                          {s.content.length > 500 ? s.content.slice(0, 500) + "…" : s.content}
                        </p>
                        {!!s.encrypted && (
                          <button
                            onClick={() => toggleReveal(s.id)}
                            className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                          >
                            <EyeOff size={12} /> Hide
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!s.encrypted && (
                      <button
                        onClick={() => (s.share_slug ? unshare(s.id) : share(s.id))}
                        className={
                          "rounded-md p-1.5 hover:bg-slate-100 " +
                          (s.share_slug ? "text-indigo-600" : "text-slate-400 hover:text-slate-700")
                        }
                        title={s.share_slug ? "Unshare" : "Share (public link)"}
                      >
                        <Share2 size={15} />
                      </button>
                    )}
                    <button onClick={() => startEdit(s)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => remove(s.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  {!!s.encrypted && (
                    <Badge className="bg-indigo-50 text-indigo-700">
                      <Lock size={11} className="mr-1" /> encrypted · not searchable
                    </Badge>
                  )}
                  {typeof s.tags === "string" &&
                    s.tags.split(",").filter(Boolean).map((t) => <Badge key={t}>{t.trim()}</Badge>)}
                  <span>{s.created_at}</span>
                  {s.source_url && (
                    <a href={s.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
                      <ExternalLink size={12} /> source
                    </a>
                  )}
                </div>
                {s.share_slug && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs">
                    <Globe size={13} className="shrink-0 text-indigo-600" />
                    <a
                      href={`${PUBLIC_BASE}/s/${s.share_slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-indigo-700 hover:underline"
                    >
                      {`${PUBLIC_BASE}/s/${s.share_slug}`}
                    </a>
                    <CopyButton text={`${PUBLIC_BASE}/s/${s.share_slug}`} className="ml-auto shrink-0" />
                    <button
                      onClick={() => unshare(s.id)}
                      className="shrink-0 text-slate-400 hover:text-red-600"
                    >
                      Unshare
                    </button>
                  </div>
                )}
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function SnippetForm({
  value,
  onChange,
  showSource,
}: {
  value: CreateSnippetInput;
  onChange: (v: CreateSnippetInput) => void;
  showSource?: boolean;
}) {
  const set = (k: keyof CreateSnippetInput, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-2.5">
      <textarea
        value={value.content}
        onChange={(e) => set("content", e.target.value)}
        placeholder="Paste or type the text to store…"
        rows={5}
        className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      />
      <Input value={value.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="Title (optional)" />
      <Input value={value.tags ?? ""} onChange={(e) => set("tags", e.target.value)} placeholder="Tags, comma-separated" />
      {showSource && (
        <Input value={value.source_url ?? ""} onChange={(e) => set("source_url", e.target.value)} placeholder="Source URL (optional)" />
      )}
      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
        <input
          type="checkbox"
          checked={!!value.encrypted}
          onChange={(e) => onChange({ ...value, encrypted: e.target.checked })}
          className="mt-0.5 h-4 w-4 accent-indigo-600"
        />
        <span className="text-xs text-slate-600">
          <span className="flex items-center gap-1 font-medium text-slate-800">
            <Lock size={12} /> Encrypt this clip
          </span>
          Encrypted at rest and <b>excluded from search</b>. Don’t clip passwords or other
          secrets.
        </span>
      </label>
    </div>
  );
}
