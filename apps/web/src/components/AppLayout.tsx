import { type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FileText, KeyRound, Plug, LogOut, Scissors, Github } from "lucide-react";
import { api } from "../api";
import { cn } from "../lib/utils";

const REPO_URL = "https://github.com/0xkaz/agentclip";

const nav = [
  { to: "/app/snippets", label: "Snippets", icon: FileText },
  { to: "/app/tokens", label: "API Tokens", icon: KeyRound },
  { to: "/app/setup", label: "Setup & Usage", icon: Plug },
];

export function AppLayout({ email, children }: { email: string; children: ReactNode }) {
  const navigate = useNavigate();

  async function logout() {
    await api.logout().catch(() => {});
    navigate("/");
    window.location.reload();
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="flex flex-col border-r border-slate-200 bg-white md:h-screen md:sticky md:top-0">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">
              <Scissors size={16} />
            </span>
            <span className="text-base font-semibold tracking-tight">AgentClip</span>
          </div>
          {/* Sign out is in the sidebar footer on desktop; surface it here on mobile. */}
          <button
            onClick={logout}
            aria-label="Sign out"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 md:hidden"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
        <nav className="flex gap-1 px-3 md:flex-col md:gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100",
                )
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-slate-100 p-3 md:block">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            <Github size={16} /> Source
          </a>
          <div className="truncate px-2 pb-2 pt-2 text-xs text-slate-400">{email}</div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
