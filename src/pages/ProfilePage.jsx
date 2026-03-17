// src/pages/ProfilePage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/AuthContext";
import supabase from "../lib/supabaseClient";
import { toast } from "react-toastify";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { allCountries as phoneData } from "country-telephone-data";
import worldCountries from "world-countries";
import {
  HiPhone,
  HiLocationMarker,
  HiCalendar,
  HiUser,
  HiMail,
  HiPencil,
  HiLogout,
  HiSparkles,
  HiCheck,
  HiArrowRight,
  HiCamera,
  HiX,
} from "react-icons/hi";

// Convertit un code ISO2 en emoji drapeau
const isoToFlag = (iso2) =>
  iso2
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

// Tous les indicatifs téléphoniques (priorité 0 = entrée principale par pays)
const phoneCountryOptions = phoneData
  .filter((c) => c.priority === 0)
  .map((c) => ({
    value: `+${c.dialCode}`,
    label: `${isoToFlag(c.iso2)} +${c.dialCode} — ${c.name}`,
    dialCode: `+${c.dialCode}`,
    name: c.name,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Tous les pays du monde triés alphabétiquement
const countryOptions = [
  { value: "", label: "Sélectionne ton pays" },
  ...worldCountries
    .map((c) => ({ value: c.name.common, label: c.name.common }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr")),
];

const inputCls =
  "w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition";

const selectCls =
  "w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition";

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 16 - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
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

  const fetchProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) { console.error(error); return; }

    let birth_day = "", birth_month = "", birth_year = "";
    if (data.birth_date) {
      const d = new Date(data.birth_date);
      if (!isNaN(d.getTime())) {
        birth_day = String(d.getDate());
        birth_month = String(d.getMonth() + 1);
        birth_year = String(d.getFullYear());
      }
    }

    let phoneCountryCode = "+242", phoneNumber = "";
    if (data.phone) {
      const trimmed = data.phone.trim();
      if (trimmed.startsWith("+")) {
        const parts = trimmed.split(" ");
        phoneCountryCode = parts[0] || "+242";
        phoneNumber = parts.slice(1).join(" ");
      } else {
        phoneNumber = trimmed;
      }
    }

    setProfile(data);
    setFormData({ ...data, birth_day, birth_month, birth_year, gender: data.gender || "", phoneCountryCode, phoneNumber });
  };

  useEffect(() => { if (user) fetchProfile(); }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (name === "avatar" && files?.[0]) {
      setAvatarFile(files[0]);
      setAvatarPreview(URL.createObjectURL(files[0]));
    } else {
      if (name === "phoneNumber" || name === "phoneCountryCode") setPhoneError("");
      setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let avatar_url = formData.avatar_url;
    if (avatarFile) {
      const fileExt = avatarFile.name.split(".").pop();
      const filePath = `${user.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });
      if (uploadError) {
        console.error("Erreur upload avatar :", uploadError);
        toast.error(`Photo non sauvegardée : ${uploadError.message}. Les autres informations seront quand même enregistrées.`);
        // On ne bloque pas le reste du formulaire
      } else {
        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
        avatar_url = data.publicUrl.replace("/object/avatars/", "/object/public/avatars/");
      }
    }

    let birth_date = formData.birth_date || null;
    if (formData.birth_day && formData.birth_month && formData.birth_year) {
      const day = String(formData.birth_day).padStart(2, "0");
      const month = String(formData.birth_month).padStart(2, "0");
      birth_date = `${formData.birth_year}-${month}-${day}`;
    }

    let phoneE164 = null;
    if (formData.phoneNumber) {
      const phoneFull = `${formData.phoneCountryCode || ""} ${(formData.phoneNumber || "").trim()}`;
      const parsed = parsePhoneNumberFromString(phoneFull);
      if (!parsed || !parsed.isValid()) {
        setPhoneError("Numéro invalide. Vérifie l'indicatif et le numéro.");
        toast.error("Numéro de téléphone invalide.");
        setLoading(false);
        return;
      }
      phoneE164 = parsed.number;
    }

    const payload = {
      full_name: formData.full_name,
      birth_date,
      country: formData.country,
      phone: phoneE164,
      avatar_url,
      gender: formData.gender || null,
    };

    const doUpdate = () =>
      supabase.from("profiles").update(payload).eq("id", user.id);

    let { error } = await doUpdate();

    // JWT expiré → refresh puis retry
    if (error?.message === "JWT expired" || error?.code === "PGRST303") {
      const { error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr) {
        ({ error } = await doUpdate());
      }
    }

    setLoading(false);
    if (error) {
      console.error("Erreur mise à jour profil :", error);
      toast.error(`Erreur : ${error.message || "mise à jour impossible."}`);
    } else {
      toast.success("Profil mis à jour !");
      setEditMode(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      fetchProfile();
    }
  };

  if (!profile) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Chargement du profil...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const displayEmail = profile.email || user?.email || "";
  const now = new Date();
  const rawExpires = profile.premium_account_expires_at;
  const expiresDate = rawExpires ? new Date(rawExpires) : null;
  const hasNewPremiumFlag = profile.is_premium_account === true && expiresDate && expiresDate > now;
  const hasLegacyPremiumFlag = profile.is_premium === true;
  const isPremiumAccount = hasNewPremiumFlag || hasLegacyPremiumFlag;

  let premiumExpiryLabel = "";
  if (hasNewPremiumFlag && expiresDate) {
    premiumExpiryLabel = `Actif jusqu'au ${expiresDate.toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "numeric" })}`;
  } else if (hasLegacyPremiumFlag) {
    premiumExpiryLabel = "Premium actif";
  }

  const displayAvatar = avatarPreview || profile.avatar_url;
  const initials = profile.full_name ? profile.full_name.charAt(0).toUpperCase() : "G";

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-64px)] bg-gray-50 pb-10">
        <div className="max-w-lg mx-auto px-4 pt-0 space-y-4">

          {/* ── COVER + AVATAR CARD ── */}
          <div className="bg-white rounded-b-3xl overflow-hidden shadow-sm border border-gray-100">
            {/* Cover gradient */}
            <div className="h-28 bg-gradient-to-br from-[#0f0720] via-[#1e0d3e] to-[#0b0518] relative">
              {!editMode && (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium rounded-full backdrop-blur-sm border border-white/20 transition"
                >
                  <HiPencil className="w-3.5 h-3.5" />
                  Modifier
                </button>
              )}
            </div>

            {/* Avatar + identité */}
            <div className="flex flex-col items-center -mt-12 pb-6 px-5 text-center">
              <div className="relative mb-3">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-3xl border-4 border-white shadow-md">
                    {initials}
                  </div>
                )}
                {editMode && (
                  <label
                    htmlFor="avatar-input"
                    className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center cursor-pointer shadow-md transition"
                  >
                    <HiCamera className="w-4 h-4 text-white" />
                    <input
                      id="avatar-input"
                      type="file"
                      name="avatar"
                      accept="image/*"
                      onChange={handleChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <h1 className="text-lg font-bold text-gray-900">
                {profile.full_name || "Utilisateur Grega Play"}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{displayEmail}</p>

              <span
                className={`mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  isPremiumAccount
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                }`}
              >
                {isPremiumAccount && <HiSparkles className="w-3 h-3" />}
                {isPremiumAccount ? "Premium" : "Compte gratuit"}
              </span>

              {isPremiumAccount && premiumExpiryLabel && (
                <p className="mt-1 text-[11px] text-gray-500">{premiumExpiryLabel}</p>
              )}
            </div>
          </div>

          {/* ── VUE / FORMULAIRE ── */}
          <AnimatePresence mode="wait">
            {!editMode ? (
              <motion.div
                key="view"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {/* Infos personnelles */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 pt-4 pb-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                      Informations
                    </p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    <InfoRow icon={HiMail} label="Email" value={displayEmail} />
                    <InfoRow
                      icon={HiPhone}
                      label="Téléphone"
                      value={profile.phone || "—"}
                    />
                    <InfoRow
                      icon={HiLocationMarker}
                      label="Pays"
                      value={profile.country || "—"}
                    />
                    <InfoRow
                      icon={HiCalendar}
                      label="Date de naissance"
                      value={
                        profile.birth_date
                          ? new Date(profile.birth_date).toLocaleDateString(
                              "fr-FR",
                              { year: "numeric", month: "long", day: "numeric" }
                            )
                          : "—"
                      }
                    />
                    <InfoRow
                      icon={HiUser}
                      label="Genre"
                      value={
                        profile.gender === "female"
                          ? "Femme"
                          : profile.gender === "male"
                          ? "Homme"
                          : "—"
                      }
                    />
                  </div>
                </div>

                {/* Plan */}
                {isPremiumAccount ? (
                  <div className="bg-gradient-to-br from-[#0f0720] via-[#1e0d3e] to-[#0b0518] rounded-2xl p-5 text-white">
                    <p className="text-xs font-bold text-purple-300 uppercase tracking-wide">
                      Mon plan
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-lg font-bold">Premium ✨</p>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
                        Actif
                      </span>
                    </div>
                    {premiumExpiryLabel && (
                      <p className="mt-0.5 text-sm text-purple-200">
                        {premiumExpiryLabel}
                      </p>
                    )}
                    <ul className="mt-4 space-y-1.5">
                      {[
                        "Vidéos illimitées par événement",
                        "Clips jusqu'à 60 s",
                        "Transitions avancées",
                        "Traitement prioritaire",
                      ].map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 text-xs text-purple-100"
                        >
                          <HiCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-[#0f0720] via-[#1e0d3e] to-[#0b0518] rounded-2xl p-5 text-white">
                    <p className="text-xs font-bold text-purple-300 uppercase tracking-wide">
                      Mon plan
                    </p>
                    <p className="mt-1 text-lg font-bold">Compte gratuit</p>
                    <p className="mt-0.5 text-sm text-purple-200">
                      5 vidéos max · 30 s par clip · File standard
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/premium")}
                      className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-white text-purple-700 text-sm font-bold rounded-full shadow hover:bg-purple-50 transition"
                    >
                      <HiSparkles className="w-4 h-4" />
                      Passer Premium — Gratuit
                      <HiArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Déconnexion */}
                <button
                  type="button"
                  onClick={async () => { await logout(); navigate("/login"); }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-red-500 hover:text-red-600 bg-white border border-gray-200 rounded-2xl shadow-sm hover:bg-red-50 transition"
                >
                  <HiLogout className="w-4 h-4" />
                  Se déconnecter
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="edit"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Identité */}
                <FormSection title="Identité">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name || ""}
                      onChange={handleChange}
                      className={inputCls}
                      placeholder="Ton nom complet"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Genre <span className="text-gray-400 font-normal">(optionnel)</span>
                    </label>
                    <div className="flex gap-2">
                      {["female", "male"].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, gender: g }))}
                          className={`flex-1 py-3 rounded-xl border text-sm font-medium transition ${
                            formData.gender === g
                              ? "bg-purple-600 text-white border-purple-600"
                              : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                          }`}
                        >
                          {g === "female" ? "Femme" : "Homme"}
                        </button>
                      ))}
                    </div>
                  </div>
                </FormSection>

                {/* Coordonnées */}
                <FormSection title="Coordonnées">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Téléphone
                    </label>
                    <div className="flex gap-2">
                      <select
                        name="phoneCountryCode"
                        value={formData.phoneCountryCode || "+242"}
                        onChange={handleChange}
                        className="rounded-xl border border-gray-200 px-2.5 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent min-w-[110px] max-w-[140px]"
                      >
                        {phoneCountryOptions.map((p) => (
                          <option key={`${p.value}-${p.name}`} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber || ""}
                        onChange={handleChange}
                        className={`flex-1 rounded-xl border px-3.5 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition ${
                          phoneError ? "border-red-400" : "border-gray-200"
                        }`}
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                    {phoneError && (
                      <p className="mt-1 text-xs text-red-500">{phoneError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Pays
                    </label>
                    <select
                      name="country"
                      value={formData.country || ""}
                      onChange={handleChange}
                      className={selectCls}
                    >
                      {countryOptions.map((c) => (
                        <option key={c.value || "placeholder"} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </FormSection>

                {/* Date de naissance */}
                <FormSection title="Date de naissance">
                  <div className="flex gap-2">
                    <select
                      name="birth_day"
                      value={formData.birth_day || ""}
                      onChange={handleChange}
                      className={`${selectCls} flex-1`}
                    >
                      <option value="">Jour</option>
                      {days.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <select
                      name="birth_month"
                      value={formData.birth_month || ""}
                      onChange={handleChange}
                      className={`${selectCls} flex-[2]`}
                    >
                      <option value="">Mois</option>
                      {months.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <select
                      name="birth_year"
                      value={formData.birth_year || ""}
                      onChange={handleChange}
                      className={`${selectCls} flex-[1.5]`}
                    >
                      <option value="">Année</option>
                      {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </FormSection>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setEditMode(false); setAvatarFile(null); setAvatarPreview(null); }}
                    className="flex-1 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-2"
                  >
                    <HiX className="w-4 h-4" />
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-sm font-bold shadow-lg shadow-purple-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      "Enregistrer"
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 px-4 py-3">
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex-shrink-0">
      <Icon className="w-4 h-4" />
    </span>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] text-gray-400 font-medium">{label}</p>
      <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
    </div>
  </div>
);

const FormSection = ({ title, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
      {title}
    </p>
    {children}
  </div>
);

export default ProfilePage;
