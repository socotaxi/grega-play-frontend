import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import supabase from "../../lib/supabaseClient";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import countries from "world-countries";

/* ─── country data ───────────────────────────────────────── */

const enrichedCountries = countries
  .map((c) => {
    const name = c.translations?.fra?.common || c.name.common;
    let dialCode = null;
    if (c.idd && typeof c.idd.root === "string" && Array.isArray(c.idd.suffixes) && c.idd.suffixes.length > 0) {
      dialCode = `${c.idd.root}${c.idd.suffixes[0]}`;
    }
    return { code: c.cca2, name, dialCode };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "fr"));

const countryOptions = [
  { value: "", label: "Sélectionne ton pays" },
  ...enrichedCountries.map((c) => ({ value: c.code, label: c.name })),
];

const phoneCountryOptions = enrichedCountries
  .filter((c) => !!c.dialCode)
  .map((c) => ({ value: c.dialCode, label: `${c.name} (${c.dialCode})`, code: c.code }))
  .sort((a, b) => a.label.localeCompare(b.label, "fr"));

const dialCodeByCountryCode = new Map();
phoneCountryOptions.forEach((e) => dialCodeByCountryCode.set(e.code, e.value));

/* ─── helpers ───────────────────────────────────────────── */

function isUnder15(dateString) {
  const birth = new Date(dateString);
  if (isNaN(birth.getTime())) return true;
  const minBirth = new Date();
  minBirth.setFullYear(minBirth.getFullYear() - 15);
  return birth > minBirth;
}

function detectCountryFromLocale() {
  if (typeof navigator === "undefined") return null;
  const locale = navigator.language || navigator.userLanguage;
  if (!locale) return null;
  const parts = locale.split("-");
  if (parts.length > 1) return parts[1].toUpperCase();
  return { fr: "FR", en: "US", es: "ES", pt: "PT" }[parts[0].toLowerCase()] || null;
}

/* ─── sub-components ─────────────────────────────────────── */

const inputCls = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

const Field = ({ label, hint, error, children }) => (
  <div>
    {label && <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>}
    {children}
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    {hint && !error && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
  </div>
);

const SectionLabel = ({ children }) => (
  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 pt-2">{children}</p>
);

const months = [
  { v: 1, l: "Janvier" }, { v: 2, l: "Février" }, { v: 3, l: "Mars" },
  { v: 4, l: "Avril" }, { v: 5, l: "Mai" }, { v: 6, l: "Juin" },
  { v: 7, l: "Juillet" }, { v: 8, l: "Août" }, { v: 9, l: "Septembre" },
  { v: 10, l: "Octobre" }, { v: 11, l: "Novembre" }, { v: 12, l: "Décembre" },
];

/* ─── component ─────────────────────────────────────────── */

const RegisterForm = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const years = Array.from({ length: 120 }, (_, i) => currentYear - i);

  const [formData, setFormData] = useState({
    firstName: "", lastName: "",
    birth_day: "", birth_month: "", birth_year: "",
    gender: "",
    country: "",
    phoneCountryCode: "+242",
    phoneNumber: "",
    email: "", password: "", confirmPassword: "",
    acceptNews: false, acceptTerms: false,
  });

  const [loading, setLoading]     = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      if (name === "phoneNumber" || name === "phoneCountryCode") setPhoneError("");
      return { ...prev, [name]: type === "checkbox" ? checked : value };
    });
  };

  /* Auto-detect country */
  useEffect(() => {
    let active = true;
    const apply = (cc) => {
      if (!cc || !active) return;
      const upper = cc.toUpperCase();
      setFormData((prev) => {
        if (prev.country) return prev;
        return { ...prev, country: upper, phoneCountryCode: dialCodeByCountryCode.get(upper) || prev.phoneCountryCode };
      });
    };
    (async () => {
      try {
        const res = await fetch("https://api.country.is/");
        if (res.ok) { const d = await res.json(); if (d?.country) { apply(d.country); return; } }
      } catch { /* ignore */ }
      apply(detectCountryFromLocale());
    })();
    return () => { active = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { toast.error("Les mots de passe ne correspondent pas"); return; }
    if (!formData.acceptTerms) { toast.error("Tu dois accepter les CGU et la politique de confidentialité"); return; }

    let birth_date = null;
    if (formData.birth_day && formData.birth_month && formData.birth_year) {
      birth_date = `${formData.birth_year}-${String(formData.birth_month).padStart(2, "0")}-${String(formData.birth_day).padStart(2, "0")}`;
    }
    if (!birth_date || isUnder15(birth_date)) {
      toast.error("Tu dois avoir au moins 15 ans pour t'inscrire."); return;
    }

    let phoneE164 = null;
    if (formData.phoneNumber) {
      const parsed = parsePhoneNumberFromString(`${formData.phoneCountryCode} ${formData.phoneNumber.trim()}`);
      if (!parsed?.isValid()) { setPhoneError("Numéro de téléphone invalide."); toast.error("Numéro de téléphone invalide."); return; }
      phoneE164 = parsed.number;
    }

    setLoading(true);
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName, last_name: formData.lastName,
            full_name: fullName, birth_date, country: formData.country,
            phone: phoneE164, accept_news: formData.acceptNews, gender: formData.gender,
          },
        },
      });

      if (error) {
        const msg = error.message?.toLowerCase() || "";
        if (error.status === 429 || msg.includes("rate limit") || msg.includes("too many")) {
          toast.error("Trop de tentatives. Vérifie si ton compte existe déjà ou réessaie dans quelques minutes.");
          return;
        }
        throw error;
      }

      toast.success("Inscription réussie !");
      navigate("/check-email", { state: { email: formData.email } });
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const pwdMatch = formData.confirmPassword && formData.password === formData.confirmPassword;
  const pwdMismatch = formData.confirmPassword && formData.password !== formData.confirmPassword;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Identité ─────────────────────────────── */}
      <SectionLabel>Identité</SectionLabel>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom">
          <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} className={inputCls} placeholder="Marie" />
        </Field>
        <Field label="Nom">
          <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} className={inputCls} placeholder="Dupont" />
        </Field>
      </div>

      {/* Genre */}
      <Field label="Genre">
        <div className="flex gap-2">
          {[{ v: "female", l: "Femme" }, { v: "male", l: "Homme" }, { v: "other", l: "Autre" }].map(({ v, l }) => (
            <button
              key={v}
              type="button"
              onClick={() => setFormData((p) => ({ ...p, gender: p.gender === v ? "" : v }))}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                formData.gender === v
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </Field>

      {/* Date de naissance */}
      <Field label="Date de naissance" hint="Tu dois avoir au moins 15 ans pour t'inscrire.">
        <div className="grid grid-cols-3 gap-2">
          <select name="birth_day" value={formData.birth_day} onChange={handleChange} className={selectCls}>
            <option value="">Jour</option>
            {days.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select name="birth_month" value={formData.birth_month} onChange={handleChange} className={selectCls}>
            <option value="">Mois</option>
            {months.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
          <select name="birth_year" value={formData.birth_year} onChange={handleChange} className={selectCls}>
            <option value="">Année</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </Field>

      {/* ── Localisation ─────────────────────────── */}
      <SectionLabel>Localisation</SectionLabel>

      <Field label="Pays">
        <select name="country" value={formData.country} onChange={handleChange} required className={selectCls}>
          {countryOptions.map((c, i) => <option key={i} value={c.value}>{c.label}</option>)}
        </select>
      </Field>

      <Field label="Téléphone portable" error={phoneError} hint="Facultatif — permet de se connecter via WhatsApp.">
        <div className="flex gap-2">
          <select
            name="phoneCountryCode"
            value={formData.phoneCountryCode}
            onChange={handleChange}
            className={`${selectCls} w-28 flex-shrink-0`}
          >
            {phoneCountryOptions.map((p, i) => <option key={i} value={p.value}>{p.value}</option>)}
          </select>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            className={`${inputCls} ${phoneError ? "border-red-400 focus:ring-red-400" : ""}`}
            placeholder="06 12 34 56 78"
          />
        </div>
      </Field>

      {/* ── Connexion ─────────────────────────────── */}
      <SectionLabel>Connexion</SectionLabel>

      <Field label="Adresse e-mail">
        <input type="email" name="email" required value={formData.email} onChange={handleChange} className={inputCls} placeholder="nom@exemple.fr" autoComplete="email" />
      </Field>

      <Field label="Mot de passe">
        <div className="relative">
          <input
            type={showPwd ? "text" : "password"}
            name="password"
            required
            value={formData.password}
            onChange={handleChange}
            className={`${inputCls} pr-10`}
            placeholder="8 caractères minimum"
            autoComplete="new-password"
          />
          <button type="button" tabIndex={-1} onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {showPwd
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
              }
            </svg>
          </button>
        </div>
      </Field>

      <Field
        label="Confirmer le mot de passe"
        error={pwdMismatch ? "Les mots de passe ne correspondent pas" : ""}
      >
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            name="confirmPassword"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`${inputCls} pr-10 ${pwdMismatch ? "border-red-400 focus:ring-red-400" : pwdMatch ? "border-emerald-400 focus:ring-emerald-400" : ""}`}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {showConfirm
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
              }
            </svg>
          </button>
          {pwdMatch && (
            <span className="absolute right-9 top-1/2 -translate-y-1/2 text-emerald-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
        </div>
      </Field>

      {/* ── Conditions ─────────────────────────────── */}
      <div className="pt-1 space-y-3">
        {/* Newsletter */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="acceptNews"
            checked={formData.acceptNews}
            onChange={handleChange}
            className="mt-0.5 h-4 w-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 flex-shrink-0"
          />
          <span className="text-xs text-gray-600">Recevoir les actualités et offres de Grega Play</span>
        </label>

        {/* CGU */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="acceptTerms"
            checked={formData.acceptTerms}
            onChange={handleChange}
            required
            className="mt-0.5 h-4 w-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 flex-shrink-0"
          />
          <span className="text-xs text-gray-600 leading-relaxed">
            J&apos;accepte les{" "}
            <Link to="/cgu" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2">
              CGU
            </Link>{" "}
            et la{" "}
            <Link to="/confidentialite" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm mt-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Création du compte…
          </>
        ) : "Créer mon compte"}
      </button>
    </form>
  );
};

export default RegisterForm;
