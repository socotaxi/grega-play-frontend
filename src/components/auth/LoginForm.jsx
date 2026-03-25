import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../../lib/supabaseClient";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { FcGoogle } from "react-icons/fc";
import { getReturnTo, clearReturnTo } from "../../utils/returnTo";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:3001";

const inputCls = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors";

const LoginForm = () => {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);

  const isEmail = (v) => /\S+@\S+\.\S+/.test(v);
  const isPhone = (v) => /^(\+?\d{8,15})$/.test(v.replace(/\s+/g, ""));
  const isEmailInput = isEmail(identifier.trim());
  const isPhoneInput = isPhone(identifier.trim());

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

  const sendWhatsAppOtp = async (phone) => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/request-otp-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur envoi WhatsApp");
      }
      toast.success("Code envoyé sur WhatsApp !");
      navigate("/verify-phone", { state: { phone } });
    } catch (err) {
      toast.error("Impossible d'envoyer le code sur WhatsApp.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    setLoading(true);
    try {
      if (isEmail(cleanId)) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanId, password });
        if (error) { toast.error("Email ou mot de passe incorrect."); return; }
        if (!data?.user?.confirmed_at) { toast.error("Valide d'abord ton adresse e-mail."); return; }
        toast.success("Connexion réussie !");
        redirectAfterLogin();
        return;
      }
      if (isPhone(cleanId)) {
        const phone = cleanId.startsWith("+") ? cleanId : "+242" + cleanId;
        await sendWhatsAppOtp(phone);
        return;
      }
      toast.error("Entre un e-mail valide ou un numéro de téléphone.");
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

        {/* Identifier */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            E-mail ou numéro de téléphone
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className={inputCls}
            placeholder="nom@exemple.fr ou +33 6 …"
            autoComplete="username"
          />
          {isPhoneInput && !isEmailInput && (
            <p className="mt-1.5 text-[11px] text-indigo-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
              </svg>
              Un code vous sera envoyé sur WhatsApp
            </p>
          )}
        </div>

        {/* Password — email only */}
        {isEmailInput && (
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
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || (!isEmailInput && !isPhoneInput)}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connexion…
            </>
          ) : isPhoneInput && !isEmailInput ? (
            "Recevoir mon code sur WhatsApp"
          ) : (
            "Se connecter"
          )}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
