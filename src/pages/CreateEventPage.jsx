import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import eventService from "../services/eventService";
import activityService from "../services/activityService";
import MainLayout from "../layout/MainLayout";
import supabase from "../lib/supabaseClient";
import { subscribeToPush } from "../services/notificationService";

/* ─── helpers ───────────────────────────────────────────── */

const generatePublicCode = (length = 12) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < length; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

const isPastDate = (dateString) => {
  if (!dateString) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const selected = new Date(dateString); selected.setHours(0, 0, 0, 0);
  return selected < today;
};


/* ─── sub-components ─────────────────────────────────────── */

const SectionCard = ({ step, title, subtitle, children }) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
        {step}
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="px-6 py-5 space-y-5">{children}</div>
  </div>
);

const Field = ({ label, required, hint, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
      {label}
      {required && <span className="text-indigo-500 ml-0.5">*</span>}
      {!required && <span className="ml-1 text-gray-400 font-normal">(optionnel)</span>}
    </label>
    {children}
    {hint && <p className="mt-1.5 text-[11px] text-gray-400 leading-relaxed">{hint}</p>}
  </div>
);

const inputCls = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors";

const Toggle = ({ id, name, checked, onChange, label, desc }) => (
  <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
    <div className="flex-shrink-0 mt-0.5">
      <div className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}>
        <input
          type="checkbox"
          id={id}
          name={name}
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
    </div>
    <div>
      <p className="text-sm font-medium text-gray-800 leading-snug">{label}</p>
      {desc && <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">{desc}</p>}
    </div>
  </label>
);

const THEMES = [
  { value: "Anniversaire", emoji: "🎂" },
  { value: "Mariage",      emoji: "💍" },
  { value: "Départ",       emoji: "✈️" },
  { value: "Surprise",     emoji: "🎁" },
  { value: "Équipe",       emoji: "🏢" },
  { value: "Autre",        emoji: "🎉" },
];

/* ─── page ───────────────────────────────────────────────── */

const CreateEventPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    theme: "",
    maxClipDuration: 30,
    endDate: "",
    enableNotifications: true,
    isPublic: false,
  });

  const [loading, setLoading] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);

  const todayString = new Date().toISOString().split("T")[0];

  /* handlers */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleMediaChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    setMediaFile(file);
    if (file && file.type.startsWith("image/")) {
      setMediaPreview(URL.createObjectURL(file));
    } else {
      setMediaPreview(null);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.endDate) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    if (isPastDate(formData.endDate)) {
      toast.error("La date limite ne peut pas être dans le passé");
      return;
    }

    const publicCode = generatePublicCode();
    setLoading(true);
    try {
      let mediaUrl = null;
      if (mediaFile) {
        const fileExt = mediaFile.name.split(".").pop();
        const fileName = `${user?.id || "anonymous"}_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("event-media")
          .upload(`events/${fileName}`, mediaFile);
        if (uploadError) {
          toast.error("Erreur lors de l'upload du visuel");
          setLoading(false);
          return;
        }
        const { data: publicUrlData } = supabase.storage
          .from("event-media")
          .getPublicUrl(uploadData.path);
        mediaUrl = publicUrlData?.publicUrl ?? null;
      }

      const event = await eventService.createEvent({
        ...formData,
        userId: user?.id,
        maxClipDuration: parseInt(formData.maxClipDuration),
        videoDuration: parseInt(formData.maxClipDuration),
        public_code: publicCode,
        media_url: mediaUrl,
        enable_notifications: formData.enableNotifications,
        isPublic: formData.isPublic,
        theme: formData.theme || null,
      });

      if (formData.enableNotifications && user?.id) {
        try { await subscribeToPush(user.id); } catch (_) {}
      }

      await activityService.logActivity({
        event_id: event.id,
        user_id: user?.id,
        type: "created_event",
        message: `${profile?.full_name?.split(" ")[0] ?? user?.email} a créé l'événement "${event.title}"`,
      });

      toast.success("Événement créé !");
      navigate("/dashboard");
    } catch (err) {
      console.error("Erreur création événement:", err);
      toast.error("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">

          {/* Header */}
          <div className="mb-8">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-4"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Tableau de bord
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Créer un événement</h1>
            <p className="mt-1 text-sm text-gray-500">
              Tes proches recevront un lien pour envoyer leurs clips. Tu génères la vidéo finale quand tu veux.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── Section 1 : Informations ── */}
            <SectionCard step="1" title="L'événement" subtitle="Donne un nom et un contexte à ton projet vidéo">

              <Field label="Titre de l'événement" required>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className={inputCls}
                  placeholder="Anniversaire de Lyne, Mariage d'Isaac…"
                />
              </Field>

              <Field label="Thème" hint="Aide à organiser tes événements dans les statistiques.">
                <div className="flex flex-wrap gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, theme: prev.theme === t.value ? "" : t.value }))}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        formData.theme === t.value
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                      }`}
                    >
                      <span>{t.emoji}</span>
                      {t.value}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Message pour tes invités" hint="S'affiche sur la page de soumission des vidéos.">
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className={`${inputCls} resize-none`}
                  placeholder="Explique en quelques mots le but de la vidéo…"
                />
              </Field>

              <Field label="Visuel de l'événement" hint="Photo ou image affichée sur la page publique.">
                <div className="flex items-start gap-3">
                  {mediaPreview ? (
                    <div className="relative flex-shrink-0">
                      <img
                        src={mediaPreview}
                        alt="Aperçu"
                        className="w-16 h-16 rounded-xl object-cover border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 text-white text-[10px] flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <label className="flex-1 cursor-pointer">
                    <div className={`${inputCls} flex items-center gap-2 cursor-pointer`}>
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-gray-500 text-sm truncate">
                        {mediaFile ? mediaFile.name : "Choisir une image…"}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleMediaChange}
                      className="sr-only"
                    />
                  </label>
                </div>
              </Field>
            </SectionCard>

            {/* ── Section 2 : Paramètres ── */}
            <SectionCard step="2" title="Paramètres" subtitle="Date limite et durée des clips envoyés par tes invités">

              <Field label="Date limite pour envoyer les vidéos" required hint="Après cette date, ton événement passe en mode 'Prêt pour montage'.">
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                  min={todayString}
                  className={inputCls}
                />
              </Field>

              <Field label="Durée maximale par clip (secondes)" hint="Recommandé : 30 s. Max autorisé : 35 s.">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    name="maxClipDuration"
                    value={formData.maxClipDuration}
                    onChange={handleChange}
                    min={5}
                    max={35}
                    step={5}
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="flex-shrink-0 w-14 text-center text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg py-1.5 border border-indigo-100">
                    {formData.maxClipDuration} s
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-0.5">
                  <span>5 s</span><span>35 s</span>
                </div>
              </Field>
            </SectionCard>

            {/* ── Section 3 : Accès & notifications ── */}
            <SectionCard step="3" title="Accès & notifications" subtitle="Qui peut participer et comment tu veux être prévenu">
              <div className="space-y-5">
                <Toggle
                  id="isPublic"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleChange}
                  label="Événement public"
                  desc="Toute personne ayant le lien peut envoyer une vidéo. Si désactivé, seuls les invités par e-mail peuvent participer."
                />
                <div className="border-t border-gray-100" />
                <Toggle
                  id="enableNotifications"
                  name="enableNotifications"
                  checked={formData.enableNotifications}
                  onChange={handleChange}
                  label="Recevoir les notifications"
                  desc="Tu seras prévenu(e) à chaque nouveau clip reçu."
                />
              </div>
            </SectionCard>

            {/* ── Submit ── */}
            <div className="pt-2 pb-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Création en cours…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Créer l'événement
                  </>
                )}
              </button>
              <p className="mt-3 text-[11px] text-gray-400 text-center">
                En créant cet événement, tu confirmes que tout respecte les personnes filmées.
              </p>
            </div>

          </form>
        </div>
      </div>
    </MainLayout>
  );
};

export default CreateEventPage;
