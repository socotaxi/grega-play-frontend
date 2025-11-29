import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import supabase from "../../lib/supabaseClient";
import Button from "../ui/Button";
import { parsePhoneNumberFromString } from "libphonenumber-js";

// Options pays (style Leetchi : liste déroulante)
const countryOptions = [
  { value: "", label: "Sélectionne ton pays" },
  { value: "Congo - Brazzaville", label: "Congo - Brazzaville" },
  { value: "Congo - Kinshasa", label: "Congo - Kinshasa" },
  { value: "France", label: "France" },
  { value: "Belgique", label: "Belgique" },
  { value: "Suisse", label: "Suisse" },
  { value: "Canada", label: "Canada" },
  { value: "États-Unis", label: "États-Unis" },
];

// Options indicatif téléphone (style Leetchi : préfixe international)
const phoneCountryOptions = [
  { value: "+242", label: "🇨🇬 +242" },
  { value: "+33", label: "🇫🇷 +33" },
  { value: "+32", label: "🇧🇪 +32" },
  { value: "+41", label: "🇨🇭 +41" },
  { value: "+1", label: "🇺🇸 +1" },
];

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
    // Pays + téléphone “façon Leetchi”
    country: "",
    phoneCountryCode: "+242",
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

      {/* Pays façon Leetchi : select */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Pays</label>
        <select
          name="country"
          value={formData.country}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm bg-white"
        >
          {countryOptions.map((c) => (
            <option key={c.value || "placeholder"} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Téléphone façon Leetchi : indicatif + numéro */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Téléphone portable
        </label>
        <div className="mt-1 flex">
          <select
            name="phoneCountryCode"
            value={formData.phoneCountryCode}
            onChange={handleChange}
            className="border border-gray-300 rounded-md bg-white px-2 py-2 text-sm shadow-sm mr-2 min-w-[96px]"
          >
            {phoneCountryOptions.map((p) => (
              <option key={p.value} value={p.value}>
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
        <label className="ml-2 block text-sm text-gray-900">
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
    </form>
  );
};

export default RegisterForm;
