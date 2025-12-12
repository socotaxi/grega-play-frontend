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

  // true = trop jeune
  return birth > minBirth;
}

// Détection pays à partir de la langue du navigateur
function detectCountryFromLocale() {
  if (typeof navigator === "undefined") return null;
  const locale = navigator.language || navigator.userLanguage;
  if (!locale) return null;

  const parts = locale.split("-");
  if (parts.length > 1) {
    // ex: "fr-FR" → "FR"
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
  const years = Array.from({ length: 120 }, (_, idx) => currentYear - idx); // 120 ans de recul
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
    // Date
    birth_day: "",
    birth_month: "",
    birth_year: "",
    // Genre
    gender: "",
    // Pays + téléphone
    country: "",
    phoneCountryCode: "+242", // fallback Congo-Brazzaville si la détection échoue
    phoneNumber: "",
    // Auth
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

  // 🧠 Auto-détection du pays à partir de l’IP puis de la langue
  useEffect(() => {
    let isMounted = true;

    const applyDetectedCountry = (countryCode) => {
      if (!countryCode || !isMounted) return;

      const upperCode = countryCode.toUpperCase();

      setFormData((prev) => {
        // Si l’utilisateur a déjà choisi un pays, on ne touche à rien
        if (prev.country) return prev;

        const detectedDial =
          dialCodeByCountryCode.get(upperCode) || prev.phoneCountryCode;

        return {
          ...prev,
          country: upperCode,
          phoneCountryCode: detectedDial || prev.phoneCountryCode,
        };
      });
    };

    const detectCountry = async () => {
      // 1) Tentative via IP (plus précis)
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (res.ok) {
          const data = await res.json();
          if (data && data.country) {
            applyDetectedCountry(data.country);
            return;
          }
        }
      } catch (err) {
        // silencieux, on bascule sur la langue
        console.warn("Impossible de détecter le pays via IP:", err);
      }

      // 2) Fallback via langue du navigateur
      const fromLocale = detectCountryFromLocale();
      if (fromLocale) {
        applyDetectedCountry(fromLocale);
      }
    };

    detectCountry();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (!formData.acceptTerms) {
      toast.error(
        "Vous devez accepter les CGU et la politique de confidentialité"
      );
      return;
    }

    // Construire la date de naissance au format YYYY-MM-DD
    let birth_date = null;
    if (formData.birth_day && formData.birth_month && formData.birth_year) {
      const day = String(formData.birth_day).padStart(2, "0");
      const month = String(formData.birth_month).padStart(2, "0");
      const year = String(formData.birth_year);
      birth_date = `${year}-${month}-${day}`;
    }

    // 🔒 Contrôle d’âge : au moins 15 ans
    if (!birth_date || isUnder15(birth_date)) {
      toast.error(
        "Impossible de créer votre compte\nImpossible de vous inscrire sur GregaPlay"
      );
      return;
    }

    // Construire et valider le téléphone (E.164)
    let phoneE164 = null;

    if (formData.phoneNumber) {
      const code = formData.phoneCountryCode || "";
      const rawNumber = formData.phoneNumber.trim().replace(/\s+/g, " ");
      const phoneFull = code ? `${code} ${rawNumber}` : rawNumber;

      const parsed = parsePhoneNumberFromString(phoneFull);
      if (!parsed || !parsed.isValid()) {
        setPhoneError(
          "Numéro de téléphone invalide. Vérifie l’indicatif et le numéro."
        );
        toast.error(
          "Numéro de téléphone invalide. Vérifie l’indicatif et le numéro."
        );
        return;
      }

      // format E.164 : +242xxxxxx
      phoneE164 = parsed.number;
    }

    setLoading(true);
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName || null,
            last_name: formData.lastName || null,
            full_name: fullName || null,
            birth_date: birth_date,
            country: formData.country || null,
            phone: phoneE164 || null,
            accept_news: formData.acceptNews ?? false,
            gender: formData.gender || null,
          },
        },
      });

      if (error) throw error;

      // 🔗 Lier l'inscription aux invitations existantes (email identique)
      try {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (!userErr && userRes?.user?.email) {
          const userEmail = userRes.user.email;
          const userId = userRes.user.id;

          // Récupérer toutes les invitations pour cet email
          const { data: invitations, error: invErr } = await supabase
            .from("invitations")
            .select("*")
            .eq("email", userEmail);

          if (!invErr && invitations && invitations.length > 0) {
            const ids = invitations.map((inv) => inv.id);
            await supabase
              .from("invitations")
              .update({
                user_id: userId,
                status: "accepted",
                accepted_at: new Date().toISOString(),
              })
              .in("id", ids);
          }
        }
      } catch (linkErr) {
        console.error("Erreur association invitation → user:", linkErr);
        // On ne bloque pas l'inscription si le lien échoue
      }

      toast.success("Inscription réussie !");
      navigate("/check-email", { state: { email: formData.email } });
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Prénom
          </label>
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

      {/* Date de naissance : Jour / Mois / Année */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Date de naissance
        </label>
        <div className="mt-1 flex gap-2">
          <select
            name="birth_day"
            value={formData.birth_day}
            onChange={handleChange}
            className="w-1/3 border border-gray-300 px-2 py-2 rounded-md shadow-sm sm:text-sm bg-white"
          >
            <option value="">Jour</option>
            {days.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
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
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
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
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Choisis ton jour, ton mois et ton année. Tu dois avoir au moins 15
          ans pour t’inscrire.
        </p>
      </div>

      {/* Genre : Femme / Homme */}
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
        <p className="mt-1 text-xs text-gray-500">
          Optionnel, c’est juste pour personnaliser ton expérience Grega Play.
        </p>
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
          {countryOptions.map((c, idx) => (
            <option key={idx} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Téléphone : indicatif + numéro */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Téléphone portable
        </label>
        <div className="mt-1 flex">
          <select
            name="phoneCountryCode"
            value={formData.phoneCountryCode}
            onChange={handleChange}
            className="border border-gray-300 rounded-md bg-white px-2 py-2 text-sm shadow-sm mr-2 min-w-[120px]"
          >
            {phoneCountryOptions.map((p, idx) => (
              <option key={idx} value={p.value}>
                {p.label}
              </option>
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
        <p className="mt-1 text-xs text-gray-500">
          Nous utilisons ton numéro pour sécuriser ton compte.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Adresse e-mail
        </label>
        <input
          type="email"
          name="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Mot de passe
        </label>
        <input
          type="password"
          name="password"
          required
          value={formData.password}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Confirmer le mot de passe
        </label>
        <input
          type="password"
          name="confirmPassword"
          required
          value={formData.confirmPassword}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          name="acceptNews"
          checked={formData.acceptNews}
          onChange={handleChange}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
        />
        <label className="ml-2 block text	sm text-gray-900">
          Recevoir les actualités et offres
        </label>
      </div>

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
