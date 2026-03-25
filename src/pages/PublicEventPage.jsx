// src/pages/PublicEventPage.jsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/AuthContext";
import supabase from "../lib/supabaseClient";
import { setReturnTo } from "../utils/returnTo";

const VISITED_KEY = "gp_visited_events_v1";

const safeParseJson = (raw, fallback) => {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
};

const upsertVisitedEvent = (visitedItem) => {
  try {
    const arr  = safeParseJson(localStorage.getItem(VISITED_KEY), []);
    const list = Array.isArray(arr) ? arr : [];
    const key  = visitedItem.event_id ? `id:${visitedItem.event_id}` : `code:${visitedItem.public_code}`;
    const next = [visitedItem, ...list.filter((x) => {
      const k = x?.event_id ? `id:${x.event_id}` : `code:${x?.public_code}`;
      return k !== key;
    })].slice(0, 20);
    localStorage.setItem(VISITED_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
};

// ─── Small helpers ─────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function formatDeadline(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function daysLeft(iso) {
  if (!iso) return null;
  const diff = new Date(iso).setHours(23, 59, 59, 999) - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return null;
  if (days === 0) return "Dernier jour !";
  if (days === 1) return "1 jour restant";
  return `${days} jours restants`;
}

// ─── Page ──────────────────────────────────────────────────────────────────

const PublicEventPage = () => {
  const { publicCode } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [isInvited, setIsInvited] = useState(null);

  const [contactOpen, setContactOpen]       = useState(false);
  const [contactName, setContactName]       = useState("");
  const [contactEmail, setContactEmail]     = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [contactStatus, setContactStatus]   = useState(null);
  const [contactFormCreatedAt]              = useState(() => Date.now());

  const isEventExpired = useCallback((evt) => {
    if (!evt?.deadline) return false;
    const d = new Date(evt.deadline);
    d.setHours(23, 59, 59, 999);
    return d < new Date();
  }, []);

  const isParticipationClosed = event
    ? event.status === "done" || event.status === "canceled" || isEventExpired(event)
    : false;

  const isPublicEvent  = event?.is_public === true;
  const isPremiumEvent = event?.is_premium_event === true;

  const currentReturnUrl = useMemo(() =>
    window.location.pathname + window.location.search + window.location.hash, []);

  // ── Fetch event ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true); setError(null);
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const res  = await fetch(`${backendUrl}/api/public/event/${publicCode}`);
        const json = await res.json();
        if (!res.ok) setError(json.error || "Événement introuvable ou expiré.");
        else setEvent(json.event);
      } catch {
        setError("Une erreur s'est produite.");
      } finally {
        setLoading(false);
      }
    };
    if (publicCode) fetchEvent();
    else { setLoading(false); setError("Lien d'accès invalide."); }
  }, [publicCode]);

  useEffect(() => {
    if (!event) return;
    upsertVisitedEvent({
      event_id: event.id || null, public_code: publicCode || null,
      title: event.title || "Événement", theme: event.theme || "",
      cover_url: event.media_url || null, visited_at: new Date().toISOString(),
    });
  }, [event, publicCode]);

  useEffect(() => {
    if (publicCode) setReturnTo(currentReturnUrl);
  }, [publicCode, currentReturnUrl]);

  // ── Check invitation ──────────────────────────────────────────────────────
  useEffect(() => {
    const checkInvitation = async () => {
      if (!user || !event?.id) { setIsInvited(null); return; }
      if (event.is_public === true) { setIsInvited(true); return; }
      try {
        const { data, error: err } = await supabase
          .from("invitations").select("id")
          .eq("event_id", event.id).eq("email", user.email);
        if (err) { setIsInvited(null); return; }
        setIsInvited(data && data.length > 0);
      } catch { setIsInvited(null); }
    };
    if (user && event?.id) checkInvitation();
    else setIsInvited(null);
  }, [user, event]);

  useEffect(() => { if (user?.email) setContactEmail(user.email); }, [user]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactSending(true); setContactStatus(null);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const res = await fetch(`${backendUrl}/api/public/contact-organizer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicCode, senderName: contactName.trim(),
          senderEmail: contactEmail.trim(), message: contactMessage.trim(),
          website: "", formCreatedAt: contactFormCreatedAt,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur envoi");
      setContactStatus("success");
      setContactName(""); setContactMessage("");
    } catch { setContactStatus("error"); }
    finally { setContactSending(false); }
  };

  const goLogin    = useCallback(() => navigate(`/login?returnTo=${encodeURIComponent(currentReturnUrl)}`), [navigate, currentReturnUrl]);
  const goRegister = useCallback(() => navigate(`/register?returnTo=${encodeURIComponent(currentReturnUrl)}`), [navigate, currentReturnUrl]);

  const handleParticipate = () => {
    if (isParticipationClosed) return;
    if (!user) { goLogin(); return; }
    if (!isPublicEvent && isInvited === false) return;
    navigate(event?.id ? `/events/${event.id}` : "/dashboard");
  };

  // ══════════════════════════════════════════════════════════════════════════
  // Loading
  // ══════════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Spinner />
            <p className="text-sm text-gray-400">Chargement de l'événement…</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Error
  // ══════════════════════════════════════════════════════════════════════════
  if (error) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">🔍</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Événement introuvable</h1>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors">
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Derived state
  // ══════════════════════════════════════════════════════════════════════════
  const expired    = isEventExpired(event);
  const isDone     = event.status === "done";
  const isCanceled = event.status === "canceled";
  const remaining  = daysLeft(event.deadline);
  const mediaUrl   = event.media_url;
  const isImage    = mediaUrl && /\.(jpe?g|png|gif|webp|avif|svg)(\?.*)?$/i.test(mediaUrl);
  const isVideo    = mediaUrl && /\.(mp4|mov|avi|mkv|webm)(\?.*)?$/i.test(mediaUrl);
  const isAudio    = mediaUrl && /\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(mediaUrl);

  // ══════════════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 pb-24 lg:pb-10">

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <div className="relative w-full bg-slate-900 overflow-hidden" style={{ minHeight: isImage || isVideo ? 320 : 200 }}>

          {/* Background media */}
          {isImage && (
            <img src={mediaUrl} alt={event.title} className="absolute inset-0 w-full h-full object-cover opacity-40" />
          )}
          {isVideo && (
            <video src={mediaUrl} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-30" />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-slate-900/20" />

          {/* Content */}
          <div className="relative max-w-2xl mx-auto px-4 pt-10 pb-10 flex flex-col gap-4">

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {event.theme && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20 backdrop-blur-sm">
                  🎉 {event.theme}
                </span>
              )}
              {isPremiumEvent && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30 backdrop-blur-sm">
                  ✦ Premium
                </span>
              )}
              {isPublicEvent ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-sm">
                  🔗 Accès avec le lien
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/70 border border-white/20 backdrop-blur-sm">
                  🔒 Sur invitation
                </span>
              )}
              {(isDone || isCanceled || expired) && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-400/20 text-red-300 border border-red-400/30 backdrop-blur-sm">
                  {isCanceled ? "Annulé" : "Terminé"}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              {event.title}
            </h1>

            {/* Description */}
            {event.description && (
              <p className="text-base text-white/70 leading-relaxed max-w-xl">
                {event.description}
              </p>
            )}

            {/* Deadline */}
            {event.deadline && (
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Date limite : {formatDeadline(event.deadline)}
                </div>
                {remaining && !isParticipationClosed && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {remaining}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── BODY ──────────────────────────────────────────────────────── */}
        <div className="max-w-2xl mx-auto px-4 -mt-2 space-y-4">

          {/* Media visible (video / audio) sous le hero */}
          {isVideo && (
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <video src={mediaUrl} controls className="w-full" />
            </div>
          )}
          {isAudio && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Audio de l'événement</p>
              <audio src={mediaUrl} controls className="w-full" />
            </div>
          )}

          {/* ── STATUT FERMÉ ──────────────────────────────────────────── */}
          {isParticipationClosed && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-xl">
                {isCanceled ? "🚫" : "🏁"}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {isCanceled
                    ? "Événement annulé"
                    : isDone
                    ? "Événement terminé"
                    : "Participations closes"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {isCanceled
                    ? "Cet événement a été annulé par son organisateur."
                    : isDone
                    ? "Les participations sont closes. Le montage final est en cours de préparation."
                    : "La date limite de participation est dépassée. Vous ne pouvez plus envoyer de vidéo."}
                </p>
              </div>
            </div>
          )}

          {/* ── CTA PRINCIPAL ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Info Premium */}
            {isPremiumEvent && (
              <div className="bg-amber-50 border-b border-amber-100 px-5 py-3 flex items-center gap-2">
                <span className="text-amber-500 text-base">✦</span>
                <p className="text-xs text-amber-800">
                  Cet événement utilise Grega Play Premium. La participation est <strong>entièrement gratuite</strong> pour toi.
                </p>
              </div>
            )}

            <div className="p-6 space-y-4">

              {/* Pas connecté + événement ouvert */}
              {!user && !isParticipationClosed && (
                <>
                  <div className="text-center pb-2">
                    <div className="text-4xl mb-3">🎬</div>
                    <h2 className="text-lg font-bold text-gray-900">Participe à la vidéo !</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Connecte-toi ou crée un compte gratuit pour envoyer ton clip.
                    </p>
                  </div>
                  <button
                    onClick={goLogin}
                    className="w-full py-3.5 rounded-2xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 active:scale-[0.98] transition-all shadow-sm"
                  >
                    Se connecter pour participer
                  </button>
                  <button
                    onClick={goRegister}
                    className="w-full py-3 rounded-2xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Pas encore de compte ? S'inscrire gratuitement
                  </button>
                </>
              )}

              {/* Pas connecté + événement fermé */}
              {!user && isParticipationClosed && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">Les participations sont closes. Tu peux consulter les informations ci-dessus.</p>
                </div>
              )}

              {/* Connecté + non invité */}
              {user && !isParticipationClosed && !isPublicEvent && isInvited === false && (
                <>
                  <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-start gap-3">
                    <span className="text-red-500 text-lg shrink-0">🚫</span>
                    <div>
                      <p className="text-sm font-semibold text-red-800">Accès non autorisé</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        Ton compte ({user.email}) ne figure pas dans la liste des invités de cet événement.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setContactOpen(true)}
                    className="w-full py-3 rounded-2xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Contacter l'organisateur
                  </button>
                </>
              )}

              {/* Connecté + autorisé + ouvert */}
              {user && !isParticipationClosed && (isPublicEvent || isInvited === true || isInvited === null) && (
                <>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center shrink-0">
                      {(user.email || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">Connecté en tant que</p>
                      <p className="text-sm font-semibold text-gray-800 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleParticipate}
                    disabled={!isPublicEvent && isInvited === null}
                    className="w-full py-3.5 rounded-2xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    {!isPublicEvent && isInvited === null ? (
                      <><Spinner /> Vérification…</>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                        </svg>
                        Envoyer ma vidéo
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Connecté + fermé */}
              {user && isParticipationClosed && (
                <div className="text-center py-2">
                  <p className="text-xs text-gray-400 mb-1">Connecté en tant que {user.email}</p>
                  <p className="text-sm text-gray-500">Les participations sont désormais closes.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── CONTACTER L'ORGANISATEUR ───────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setContactOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contacter l'organisateur
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${contactOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {contactOpen && (
              <div className="border-t border-gray-50 px-5 pb-5 pt-4">
                {contactStatus === "success" ? (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                    <span className="text-emerald-500">✓</span>
                    <p className="text-sm text-emerald-800">Votre message a bien été envoyé à l'organisateur.</p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-3">
                    {contactStatus === "error" && (
                      <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
                        Une erreur s'est produite. Veuillez réessayer.
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Votre nom</label>
                        <input
                          type="text" required value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Prénom Nom"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Votre email</label>
                        <input
                          type="email" required value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="vous@exemple.com"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Message</label>
                      <textarea
                        required rows={4} value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Votre message pour l'organisateur…"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent resize-none"
                      />
                    </div>
                    {/* Honeypot */}
                    <input type="text" name="website" style={{ display: "none" }} tabIndex={-1} />
                    <button
                      type="submit" disabled={contactSending}
                      className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {contactSending ? "Envoi en cours…" : "Envoyer le message"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* ── FOOTER LINK ───────────────────────────────────────────── */}
          <div className="text-center py-2">
            <p className="text-xs text-gray-400">
              Propulsé par{" "}
              <Link to="/dashboard" className="font-semibold text-brand-600 hover:underline">
                Grega Play
              </Link>
              {" "}· Crée tes propres événements vidéo
            </p>
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

export default PublicEventPage;
