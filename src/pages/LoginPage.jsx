import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import LoginForm from "../components/auth/LoginForm";
import { setReturnTo, getReturnTo } from "../utils/returnTo";

const FEATURES = [
  "Accède à tous tes événements vidéo en cours et passés.",
  "Invite tes proches et suis leurs envois en temps réel.",
  "Génère ta vidéo finale en un clic — format 9:16 prêt à partager.",
];

const LoginPage = () => {
  const location = useLocation();

  const returnToFromQuery = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const raw = sp.get("returnTo");
    return raw ? decodeURIComponent(raw) : null;
  }, [location.search]);

  useEffect(() => {
    if (returnToFromQuery) { setReturnTo(returnToFromQuery); return; }
    const already = getReturnTo();
    if (already) return;
    try {
      const ref = document.referrer;
      if (!ref) return;
      const refUrl = new URL(ref);
      if (refUrl.origin !== window.location.origin) return;
      const refPath = refUrl.pathname + refUrl.search + refUrl.hash;
      if (refPath.startsWith("/e/") || refPath.startsWith("/events/")) setReturnTo(refPath);
    } catch { /* ignore */ }
  }, [returnToFromQuery]);

  const registerLink = useMemo(() => {
    const target = returnToFromQuery || getReturnTo();
    return target ? `/register?returnTo=${encodeURIComponent(target)}` : "/register";
  }, [returnToFromQuery]);

  return (
    <MainLayout>
      <div className="flex" style={{ minHeight: "calc(100vh - 64px)" }}>

        {/* ── Panneau gauche (desktop) ── */}
        <div className="hidden lg:flex lg:w-[44%] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex-col justify-between p-12 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-indigo-600/10 pointer-events-none" />

          <div className="relative space-y-6">
            <h2 className="text-2xl font-bold text-white leading-snug">
              Tes vidéos collaboratives<br />t&apos;attendent.
            </h2>
            <ul className="space-y-4">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-sm text-white/60 leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-white/20">© {new Date().getFullYear()} Grega Play</p>
        </div>

        {/* ── Panneau droit (formulaire) ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-white">
          <div className="w-full max-w-sm">
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
              <p className="mt-1 text-sm text-gray-500">E-mail, Google ou numéro de téléphone.</p>
            </div>

            <LoginForm />

            <p className="mt-6 text-center text-sm text-gray-500">
              Pas encore de compte ?{" "}
              <Link to={registerLink} className="font-semibold text-indigo-600 hover:text-indigo-700">
                Créer un compte gratuit
              </Link>
            </p>
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default LoginPage;
