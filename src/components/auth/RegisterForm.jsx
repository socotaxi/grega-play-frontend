import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import supabase from "../../lib/supabaseClient";
import Button from "../ui/Button";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import countries from "world-countries";

// 🔧 Construction des listes complètes pays + indicatifs

// On enrichit les pays avec leur indicatif principal
const enrichedCountries = countries
  .map((c) => {
    const name = c.translations?.fra?.common || c.name.common;
    let dialCode = null;

    if (
      c.idd &&
      typeof c.idd.root === "string" &&
      Array.isArray(c.idd.suffixes) &&
      c.idd.suffixes.length > 0
    ) {
      // Exemple : root "+2", suffix "42" => "+242"
      dialCode = `${c.idd.root}${c.idd.suffixes[0]}`;
    }

    return {
      code: c.cca2, // FR, CG, US...
      name,
      dialCode, // peut être null pour certains territoires
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "fr"));

// Liste complète des pays pour le select
const countryOptions = [
  { value: "", label: "Sélectionne ton pays" },
  ...enrichedCountries.map((c) => ({
    value: c.code,
    label: c.name,
  })),
];

// Liste complète des indicatifs pour le select téléphone
const phoneCountryOptions = enrichedCountries
  .filter((c) => !!c.dialCode)
  .map((c) => ({
    value: c.dialCode, // ex: "+242"
    label: `${c.name} (${c.dialCode})`,
    code: c.code,
  }))
  .sort((a, b) => a.label.localeCompare(b.label, "fr"));

// Map rapide pour retrouver l’indicatif à partir du code pays
const dialCodeByCountryCode = new Map();
phoneCountryOptions.forEach((entry) => {
  dialCodeByCountryCode.set(entry.code, entry.value);
});

// 🔒 Vérifie si la date de naissance indique moins de 15 ans
function isUnder15(birthDateString) {
  const birth = new Date(birthDateString);
  if (isNaN(birth.getTime())) return true; // date invalide → on refuse

  const today = new Date();
  const minBirth = new Date(
    today.getFullYear() - 15,
    today.getMonth(),
    today.getDate()
  );

  return birth > minBirth;
}

// Détection pays à partir de la langue du navigateur
function detectCountryFromLocale() {
  if (typeof navigator === "undefined") return null;
  const locale = navigator.language || navigator.userLanguage;
  if (!locale) return null;

  const parts = locale.split("-");
  if (parts.length > 1) {
    return parts[1].toUpperCase();
  }

  const lang = parts[0].toLowerCase();
  const fallbackMap = {
    fr: "FR",
    en: "US",
    es: "ES",
    pt: "PT",
  };
  return fallbackMap[lang] || null;
}

const RegisterForm = () => {
  const navigate = useNavigate();

  // Listes pour la date
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 120 }, (_, idx) => currentYear - idx); 
  const days = Array.from({ length: 31 }, (_, idx) => idx + 1);
  const months = [
    { value: 1, label: "Janvier" },
    { value: 2, label: "Février" },
    { value: 3, label: "Mars" },
    { value: 4, label: "Avril" },
    { value: 5, label: "Mai" },
    { value: 6, label: "Juin" },
    { value: 7, label: "Juillet" },
    { value: 8, label: "Août" },
    { value: 9, label: "Septembre" },
    { value: 10, label: "Octobre" },
    { value: 11, label: "Novembre" },
    { value: 12, label: "Décembre" },
  ];

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birth_day: "",
    birth_month: "",
    birth_year: "",
    gender: "",
    country: "",
    phoneCountryCode: "+242",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptNews: false,
    acceptTerms: false,
  });

  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "phoneNumber" || name === "phoneCountryCode") {
        setPhoneError("");
      }

      return updated;
    });
  };

  // 🧠 Auto-détection du pays via IP puis fallback langue
  useEffect(() => {
    let isMounted = true;

    const applyDetectedCountry = (cc) => {
      if (!cc || !isMounted) return;

      const upper = cc.toUpperCase();

      setFormData((prev) => {
        if (prev.country) return prev;

        const detectedDial = dialCodeByCountryCode.get(upper);
        return {
          ...prev,
          country: upper,
          phoneCountryCode: detectedDial || prev.phoneCountryCode,
        };
      });
    };

    const detectCountry = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (res.ok) {
          const data = await res.json();
          if (data?.country) {
            applyDetectedCountry(data.country);
            return;
          }
        }
      } catch {}

      const localeCountry = detectCountryFromLocale();
      if (localeCountry) applyDetectedCountry(localeCountry);
    };

    detectCountry();

    return () => {
      isMounted = false;
    };
  }, []);

  // ----------------------------------------------------
  // 🔥 handleSubmit avec message clair pour RATE LIMIT 429
  // ----------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (!formData.acceptTerms) {
      toast.error("Vous devez accepter les CGU et la politique de confidentialité");
      return;
    }

    let birth_date = null;
    if (formData.birth_day && formData.birth_month && formData.birth_year) {
      const day = String(formData.birth_day).padStart(2, "0");
      const month = String(formData.birth_month).padStart(2, "0");
      birth_date = `${formData.birth_year}-${month}-${day}`;
    }

    if (!birth_date || isUnder15(birth_date)) {
      toast.error("Impossible de créer votre compte. Vous devez avoir au moins 15 ans.");
      return;
    }

    let phoneE164 = null;
    if (formData.phoneNumber) {
      const parsed = parsePhoneNumberFromString(
        `${formData.phoneCountryCode} ${formData.phoneNumber.trim()}`
      );
      if (!parsed?.isValid()) {
        setPhoneError("Numéro de téléphone invalide.");
        toast.error("Numéro de téléphone invalide.");
        return;
      }
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
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: fullName,
            birth_date,
            country: formData.country,
            phone: phoneE164,
            accept_news: formData.acceptNews,
            gender: formData.gender,
          },
        },
      });

      // ➤ ICI : MESSAGE CLAIR POUR RATE LIMIT
      if (error) {
        const msg = error.message?.toLowerCase() || "";

        if (error.status === 429 || msg.includes("rate limit") || msg.includes("too many")) {
          toast.error(
            "Trop de tentatives d’inscription.\n" +
              "Vérifie si ton compte existe déjà ou réessaie dans quelques minutes."
          );
          setLoading(false);
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

  // ----------------------------------------------------
  // FORMULAIRE COMPLET (inchangé)
  // ----------------------------------------------------
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Prénom & Nom */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Prénom</label>
          <input
            type="text"
            name="firstName"
            required
            value={formData.firstName}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nom</label>
          <input
            type="text"
            name="lastName"
            required
            value={formData.lastName}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm"
          />
        </div>
      </div>

      {/* Date de naissance */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Date de naissance</label>
        <div className="mt-1 flex gap-2">
          <select
            name="birth_day"
            value={formData.birth_day}
            onChange={handleChange}
            className="w-1/3 border border-gray-300 px-2 py-2 rounded-md shadow-sm sm:text-sm bg-white"
          >
            <option value="">Jour</option>
            {days.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            name="birth_month"
            value={formData.birth_month}
            onChange={handleChange}
            className="w-1/3 border border-gray-300 px-2 py-2 rounded-md shadow-sm sm:text-sm bg-white"
          >
            <option value="">Mois</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            name="birth_year"
            value={formData.birth_year}
            onChange={handleChange}
            className="w-1/3 border border-gray-300 px-2 py-2 rounded-md shadow-sm sm:text-sm bg-white"
          >
            <option value="">Année</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Tu dois avoir au moins 15 ans pour t’inscrire.
        </p>
      </div>

      {/* Genre */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Genre</label>
        <div className="mt-2 flex gap-4">
          <label className="inline-flex items-center text-sm text-gray-700">
            <input
              type="radio"
              name="gender"
              value="female"
              checked={formData.gender === "female"}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 border-gray-300"
            />
            <span className="ml-2">Femme</span>
          </label>
          <label className="inline-flex items-center text-sm text-gray-700">
            <input
              type="radio"
              name="gender"
              value="male"
              checked={formData.gender === "male"}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 border-gray-300"
            />
            <span className="ml-2">Homme</span>
          </label>
        </div>
      </div>

      {/* Pays */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Pays</label>
        <select
          name="country"
          value={formData.country}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm bg-white"
        >
          {countryOptions.map((c, index) => (
            <option key={index} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Téléphone */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Téléphone portable</label>
        <div className="mt-1 flex">
          <select
            name="phoneCountryCode"
            value={formData.phoneCountryCode}
            onChange={handleChange}
            className="border border-gray-300 rounded-md bg-white px-2 py-2 text-sm shadow-sm mr-2 min-w-[120px]"
          >
            {phoneCountryOptions.map((p, index) => (
              <option key={index} value={p.value}>{p.label}</option>
            ))}
          </select>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            className={`flex-1 border px-3 py-2 rounded-md shadow-sm sm:text-sm ${
              phoneError ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="06 12 34 56 78"
          />
        </div>
        {phoneError && (
          <p className="mt-1 text-xs text-red-600">{phoneError}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Adresse e-mail</label>
        <input
          type="email"
          name="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm"
        />
      </div>

      {/* Mot de passe */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
        <input
          type="password"
          name="password"
          required
          value={formData.password}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm"
        />
      </div>

      {/* Confirmation mot de passe */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
        <input
          type="password"
          name="confirmPassword"
          required
          value={formData.confirmPassword}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm"
        />
      </div>

      {/* Checkbox news */}
      <div className="flex items-center">
        <input
          type="checkbox"
          name="acceptNews"
          checked={formData.acceptNews}
          onChange={handleChange}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">
          Recevoir les actualités et offres
        </label>
      </div>

      {/* Checkbox CGU */}
      <div className="flex items-center">
        <input
          type="checkbox"
          name="acceptTerms"
          checked={formData.acceptTerms}
          onChange={handleChange}
          required
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">
          J’accepte les CGU et la politique de confidentialité
        </label>
      </div>

      {/* CTA */}
      <div>
        <Button type="submit" loading={loading} className="w-full">
          S'inscrire
        </Button>
      </div>

      {/* Upsell Premium */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Tu veux plus de possibilités ?
          <button
            type="button"
            onClick={() => navigate("/premium")}
            className="ml-1 font-semibold text-purple-600 hover:text-purple-700 underline"
          >
            Passer au plan Premium
          </button>
        </p>
      </div>
    </form>
  );
};

export default RegisterForm;
