import { motion } from "framer-motion";
import { Scissors, Database, Bot, MousePointerClick, ArrowRight, Github } from "lucide-react";
import { loginUrl } from "../api";

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
    body: "Your clips live in your own per-user store with full-text search — fast and private.",
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

export function Landing() {
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
