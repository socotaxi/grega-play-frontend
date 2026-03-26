import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../../lib/supabaseClient";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { FcGoogle } from "react-icons/fc";
import { getReturnTo, clearReturnTo } from "../../utils/returnTo";

const inputCls = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors";

const LoginForm = () => {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();

  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);

  const redirectAfterLogin = () => {
    const target = getReturnTo();
    if (target) { clearReturnTo(); navigate(target, { replace: true }); return; }
    navigate("/dashboard", { replace: true });
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      toast.info("Redirection vers Google…");
    } catch {
      toast.error("Connexion Google impossible");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { toast.error("Email ou mot de passe incorrect."); return; }
      if (!data?.user?.confirmed_at) { toast.error("Valide d'abord ton adresse e-mail."); return; }
      toast.success("Connexion réussie !");
      redirectAfterLogin();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
      >
        <FcGoogle className="text-xl flex-shrink-0" />
        Continuer avec Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">ou</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="nom@exemple.fr"
            autoComplete="username"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-700">Mot de passe</label>
            <Link to="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputCls} pr-10`}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPwd ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connexion…
            </>
          ) : "Se connecter"}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
