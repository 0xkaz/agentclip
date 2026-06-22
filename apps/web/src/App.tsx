import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api";
import { AppLayout } from "./components/AppLayout";
import { Landing } from "./pages/Landing";
import { Snippets } from "./pages/Snippets";
import { Tokens } from "./pages/Tokens";
import { Setup } from "./pages/Setup";

type Me = { id: number; email: string; name: string | null };
type Auth = { state: "loading" } | { state: "in"; me: Me } | { state: "out" };

export function App() {
  const [auth, setAuth] = useState<Auth>({ state: "loading" });

  useEffect(() => {
    api
      .me()
      .then((me) => setAuth(me && me.email ? { state: "in", me } : { state: "out" }))
      .catch(() => setAuth({ state: "out" }));
  }, []);

  if (auth.state === "loading") {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      </div>
    );
  }

  const loggedIn = auth.state === "in";

  return (
    <Routes>
      <Route
        path="/"
        element={loggedIn ? <Navigate to="/app/snippets" replace /> : <Landing />}
      />
      <Route
        path="/app/*"
        element={
          loggedIn ? (
            <AppLayout email={auth.me.email}>
              <Routes>
                <Route path="snippets" element={<Snippets />} />
                <Route path="tokens" element={<Tokens />} />
                <Route path="setup" element={<Setup />} />
                <Route path="*" element={<Navigate to="/app/snippets" replace />} />
              </Routes>
            </AppLayout>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
