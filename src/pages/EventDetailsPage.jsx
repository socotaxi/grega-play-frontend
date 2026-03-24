import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import Button from "../components/ui/Button";
import Loading from "../components/ui/Loading";
import { useAuth } from "../context/AuthContext";
import eventService from "../services/eventService";
import { toast } from "react-toastify";
import supabase from "../lib/supabaseClient";
import QRCode from "react-qr-code";
import { setReturnTo, getReturnTo } from "../utils/returnTo";

// ─── Icônes inline ────────────────────────────────────────────────────────────
const IconCalendar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const IconUsers = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const IconBell = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const IconShare = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);
const IconCopy = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const IconFilm = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
  </svg>
);
const IconStar = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

// ─── Composant Toggle ─────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, label, labelOn, labelOff }) => (
  <button
    type="button"
    onClick={onChange}
    aria-label={label}
    className={`group inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
      checked
        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
        : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
    }`}
  >
    <span
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? "bg-emerald-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${
          checked ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </span>
    {checked ? labelOn : labelOff}
  </button>
);

// ─── Composant StatCard ───────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub }) => (
  <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide truncate">{label}</p>
      <p className="text-sm font-bold text-gray-800 leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Badge ────────────────────────────────────────────────────────────────────
const Badge = ({ children, color = "gray" }) => {
  const colors = {
    gray:    "bg-gray-100 text-gray-600",
    green:   "bg-emerald-50 text-emerald-700 border border-emerald-200",
    red:     "bg-red-50 text-red-600 border border-red-200",
    purple:  "bg-purple-50 text-purple-700 border border-purple-200",
    amber:   "bg-amber-50 text-amber-700 border border-amber-200",
    blue:    "bg-blue-50 text-blue-700 border border-blue-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full ${colors[color]}`}>
      {children}
    </span>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────
const EventDetailsPage = () => {
  const { eventId } = useParams();
  const id = eventId;
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [event, setEvent] = useState(null);
  const [ownerName, setOwnerName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingDeadline, setUpdatingDeadline] = useState(false);
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);
  const [newDeadline, setNewDeadline] = useState("");
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [pendingCount, setPendingCount] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // 💬 Contact organisateur
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [contactStatus, setContactStatus] = useState(null);
  const [contactFormCreatedAt] = useState(() => Date.now());

  const isPremiumAccount = useMemo(() => {
    if (!profile) return false;
    const now = new Date();
    const rawExpires = profile.premium_account_expires_at;
    const expiresDate = rawExpires ? new Date(rawExpires) : null;
    const hasNewPremiumFlag = profile.is_premium_account === true && expiresDate && expiresDate > now;
    const hasLegacyPremiumFlag = profile.is_premium === true;
    return hasNewPremiumFlag || hasLegacyPremiumFlag;
  }, [profile]);

  const loadEvent = useCallback(async () => {
    try {
      const data = await eventService.getEventDetails(id);
      setEvent(data);
      if (user && data.user_id === user.id) {
        try {
          const { count } = await supabase
            .from("event_participants")
            .select("id", { count: "exact", head: true })
            .eq("event_id", id)
            .eq("has_submitted", false);
          setPendingCount(count ?? 0);
        } catch (_) {}
      }
      setNewDeadline(data.deadline ? data.deadline.split("T")[0] : "");
      if (typeof data.enable_notifications === "boolean") {
        setNotificationsEnabled(data.enable_notifications);
      }
      if (data?.owner_name) {
        setOwnerName(data.owner_name);
      } else if (data?.user_id) {
        const { data: ownerProfile, error } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.user_id)
          .maybeSingle();
        if (error) {
          console.error("Erreur chargement owner profile :", error.message);
          setOwnerName(null);
        } else {
          setOwnerName(ownerProfile?.full_name || null);
        }
      } else {
        setOwnerName(null);
      }
    } catch (error) {
      console.error("Erreur récupération événement:", error);
      toast.error("Impossible de charger l'événement.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadEvent();
  }, [id, loadEvent]);

  const isEventExpired = useCallback((eventToCheck) => {
    if (!eventToCheck?.deadline) return false;
    const now = new Date();
    const deadline = new Date(eventToCheck.deadline);
    deadline.setHours(23, 59, 59, 999);
    if (eventToCheck.status === "done" || eventToCheck.status === "canceled") return false;
    return deadline < now;
  }, []);

  useEffect(() => {
    if (!event) return;
    if (user) return;
    if (event.is_public !== true) return;
    const already = getReturnTo();
    if (already) return;
    const returnUrl = window.location.pathname + window.location.search + window.location.hash;
    setReturnTo(returnUrl);
  }, [event, user]);

  const saveReturnToHere = useCallback(() => {
    const returnUrl = window.location.pathname + window.location.search + window.location.hash;
    setReturnTo(returnUrl);
  }, []);

  const goLogin = useCallback(() => {
    saveReturnToHere();
    const returnUrl = window.location.pathname + window.location.search + window.location.hash;
    navigate(`/login?returnTo=${encodeURIComponent(returnUrl)}`);
  }, [navigate, saveReturnToHere]);

  const goRegister = useCallback(() => {
    saveReturnToHere();
    const returnUrl = window.location.pathname + window.location.search + window.location.hash;
    navigate(`/register?returnTo=${encodeURIComponent(returnUrl)}`);
  }, [navigate, saveReturnToHere]);

  const handleUpdateDeadline = async (e) => {
    e.preventDefault();
    if (!event || !user) return;
    if (!newDeadline) { toast.error("Merci de choisir une nouvelle date limite."); return; }
    setUpdatingDeadline(true);
    try {
      const updatedEvent = await eventService.updateEventDeadline(event.id, newDeadline);
      setEvent(updatedEvent);
      setShowDeadlineForm(false);
      toast.success("Date limite mise à jour avec succès.");
    } catch (error) {
      console.error("Erreur mise à jour deadline:", error);
      toast.error("Impossible de mettre à jour la date limite. Réessaie plus tard.");
    } finally {
      setUpdatingDeadline(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!event || !user) return;
    setUpdatingVisibility(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .update({ is_public: !event.is_public })
        .eq("id", event.id)
        .select()
        .single();
      if (error) {
        console.error("Erreur changement visibilité:", error);
        toast.error("Impossible de changer la visibilité de l'événement.");
      } else {
        setEvent(data);
        toast.success("Visibilité de l'événement mise à jour.");
      }
    } catch (error) {
      console.error("Erreur toggle visibility:", error);
      toast.error("Erreur lors du changement de visibilité");
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!event || !user) return;
    if (event.user_id !== user.id) {
      toast.error("Seul le créateur de l'événement peut changer les notifications.");
      return;
    }
    const newValue = !notificationsEnabled;
    try {
      setNotificationsEnabled(newValue);
      const { error } = await supabase
        .from("events")
        .update({ enable_notifications: newValue })
        .eq("id", event.id);
      if (error) {
        console.error("Erreur update enable_notifications:", error);
        setNotificationsEnabled(!newValue);
        toast.error("Impossible de mettre à jour les notifications. Réessaie plus tard.");
        return;
      }
      if (newValue) { toast.success("Notifications activées pour cet événement."); }
      else { toast.info("Notifications désactivées pour cet événement."); }
    } catch (err) {
      console.error("Erreur toggle notifications:", err);
      setNotificationsEnabled(!newValue);
      toast.error("Une erreur est survenue lors de la mise à jour des notifications.");
    }
  };

  const handleSendReminder = async () => {
    if (!event || !user) return;
    setSendingReminder(true);
    try {
      const result = await eventService.sendReminder(event.id);
      if (result.count === 0) {
        toast.info("Tous les participants ont déjà soumis une vidéo !");
      } else {
        toast.success(`Rappel envoyé à ${result.sent} participant${result.sent > 1 ? "s" : ""} en attente.`);
        setPendingCount(0);
      }
    } catch (err) {
      console.error("Erreur envoi rappel:", err);
      toast.error("Impossible d'envoyer les rappels. Réessaie plus tard.");
    } finally {
      setSendingReminder(false);
    }
  };

  const formattedDeadline = useMemo(() => {
    if (!event?.deadline) return "Non définie";
    return new Date(event.deadline).toLocaleDateString("fr-FR", {
      year: "numeric", month: "long", day: "numeric",
    });
  }, [event]);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactSending(true);
    setContactStatus(null);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const res = await fetch(`${backendUrl}/api/public/contact-organizer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicCode: event?.public_code,
          senderName: profile?.full_name || user?.email || "Participant",
          senderEmail: user?.email,
          message: contactMessage.trim(),
          website: "",
          formCreatedAt: contactFormCreatedAt,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur envoi");
      setContactStatus("success");
      setContactMessage("");
    } catch {
      setContactStatus("error");
    } finally {
      setContactSending(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center">
          <Loading />
        </div>
      </MainLayout>
    );
  }

  if (!event) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center">
          <p className="text-sm text-gray-500">Événement introuvable.</p>
        </div>
      </MainLayout>
    );
  }

  // ── Dérivations ────────────────────────────────────────────────────────────
  const isOwner = event.user_id === user?.id;
  const ownerHasPremiumAccount = isOwner && isPremiumAccount;
  const expired = isEventExpired(event);
  const isPublicEvent = event.is_public === true;
  const now = new Date();
  const premiumEventExpiresAt = event.premium_event_expires_at ? new Date(event.premium_event_expires_at) : null;
  const isEventBoostActive = event.is_premium_event === true && premiumEventExpiresAt && premiumEventExpiresAt > now;
  const isEffectivePremiumEvent = isEventBoostActive || ownerHasPremiumAccount;
  const basePublicUrl = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
  const publicUrl = event.public_code ? `${basePublicUrl}/e/${event.public_code}` : "";
  const participantsCount = event?.participants_count ?? null;
  const isDone = event.status === "done";
  const isCanceled = event.status === "canceled";

  const statusConfig = isDone
    ? { label: "Vidéo finale générée", color: "purple" }
    : isCanceled
    ? { label: "Annulé", color: "gray" }
    : expired
    ? { label: "Expiré", color: "red" }
    : { label: "En cours", color: "green" };

  const renderMedia = (url) => {
    if (!url) return null;
    const lower = url.toLowerCase();
    const cls = "w-full h-full object-cover";
    if (lower.match(/\.(mp4|mov|webm|mkv)$/i))
      return <video src={url} controls className={cls} />;
    if (lower.match(/\.(mp3|wav|ogg)$/i))
      return <audio src={url} controls className="w-full" />;
    return <img src={url} alt="Illustration de l'événement" className={cls} />;
  };

  const hasMedia = !!event.media_url;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

          {/* ── Hero ─────────────────────────────────────────────── */}
          <div className="relative bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Media banner */}
            {hasMedia && (
              <div className="w-full h-48 sm:h-64 bg-gray-900 overflow-hidden">
                {renderMedia(event.media_url)}
              </div>
            )}

            {/* Contenu hero */}
            <div className={`px-6 ${hasMedia ? "pt-5" : "pt-7"} pb-6`}>
              {/* Badges statut */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge color={statusConfig.color}>{statusConfig.label}</Badge>
                <Badge color={isPublicEvent ? "blue" : "gray"}>{isPublicEvent ? "Public" : "Privé"}</Badge>
                {isEffectivePremiumEvent && (
                  <Badge color="purple"><IconStar /> Premium</Badge>
                )}
                {event.final_video_path && (
                  <Badge color="purple"><IconFilm /> Vidéo finale prête</Badge>
                )}
              </div>

              {/* Titre + créateur */}
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {event.title || "Événement sans titre"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Organisé par{" "}
                <span className="font-semibold text-gray-700">{ownerName || "Un organisateur"}</span>
                {event.theme && (
                  <> &middot; <span className="text-gray-500">{event.theme}</span></>
                )}
              </p>

              {event.description && (
                <p className="mt-4 text-sm text-gray-600 leading-relaxed max-w-2xl">
                  {event.description}
                </p>
              )}

              {/* CTAs */}
              <div className="mt-5 flex flex-wrap gap-2">
                {isOwner ? (
                  <>
                    <Link to={`/events/${event.id}/manage-participants`}>
                      <Button className="text-sm font-semibold px-5 py-2.5">
                        <span className="mr-1.5">👥</span> Inviter des participants
                      </Button>
                    </Link>
                    <Link to={`/events/${event.id}/final`}>
                      <Button className="text-sm font-semibold px-5 py-2.5 bg-purple-600 hover:bg-purple-700 border-transparent text-white">
                        <span className="mr-1.5">🎬</span> Voir les vidéos & générer le montage
                      </Button>
                    </Link>
                    {pendingCount > 0 && (
                      <button
                        type="button"
                        onClick={handleSendReminder}
                        disabled={sendingReminder}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-md border text-sm font-semibold transition-colors ${
                          sendingReminder
                            ? "bg-amber-50 text-amber-400 border-amber-200 cursor-not-allowed"
                            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                        }`}
                      >
                        <IconBell />
                        {sendingReminder
                          ? "Envoi en cours..."
                          : `Relancer ${pendingCount} participant${pendingCount > 1 ? "s" : ""}`}
                      </button>
                    )}
                  </>
                ) : !user ? (
                  <>
                    <Button onClick={goLogin} className="text-sm font-semibold px-5 py-2.5">
                      Se connecter pour participer
                    </Button>
                    <Button
                      onClick={goRegister}
                      className="text-sm font-medium px-5 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                    >
                      S&apos;inscrire
                    </Button>
                  </>
                ) : (
                  <Link to={`/submit-video/${event.id}`}>
                    <Button className="text-sm font-medium px-5 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                      <span className="mr-1.5">🎥</span> Soumettre une vidéo
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ── Stat cards ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              icon={<IconCalendar />}
              label="Date limite"
              value={formattedDeadline}
              sub={expired ? "Délai dépassé" : undefined}
            />
            {participantsCount !== null && (
              <StatCard
                icon={<IconUsers />}
                label="Participants invités"
                value={participantsCount}
              />
            )}
            {isOwner && pendingCount !== null && (
              <StatCard
                icon={<IconBell />}
                label="En attente de vidéo"
                value={pendingCount}
                sub={pendingCount === 0 ? "Tout le monde a soumis" : undefined}
              />
            )}
          </div>

          {/* ── Paramètres propriétaire ───────────────────────────── */}
          {isOwner && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800">Paramètres de l&apos;événement</h2>
              </div>
              <div className="px-5 py-4 flex flex-wrap gap-3 items-center">
                {/* Modifier la date limite */}
                <button
                  type="button"
                  onClick={() => setShowDeadlineForm((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <IconEdit />
                  Modifier la date limite
                </button>

                {/* Visibilité */}
                <button
                  type="button"
                  onClick={handleToggleVisibility}
                  disabled={updatingVisibility}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                    updatingVisibility
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : isPublicEvent
                      ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {updatingVisibility ? "Mise à jour..." : isPublicEvent ? "🌐 Public" : "🔒 Privé"}
                </button>

                {/* Notifications */}
                <Toggle
                  checked={notificationsEnabled}
                  onChange={handleToggleNotifications}
                  label="Activer les notifications"
                  labelOn="Notifications activées"
                  labelOff="Notifications désactivées"
                />
              </div>

              {/* Formulaire date limite (inline) */}
              {showDeadlineForm && (
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
                  <form onSubmit={handleUpdateDeadline} className="flex flex-col sm:flex-row gap-3 sm:items-end">
                    <div className="flex-1">
                      <label htmlFor="newDeadline" className="block text-xs font-medium text-gray-700 mb-1">
                        Nouvelle date limite
                      </label>
                      <input
                        id="newDeadline"
                        type="date"
                        value={newDeadline}
                        onChange={(e) => setNewDeadline(e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={updatingDeadline} className="text-sm font-semibold py-2">
                        {updatingDeadline ? "Enregistrement..." : "Enregistrer"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setShowDeadlineForm(false)}
                        className="text-sm text-gray-500 hover:text-gray-700 px-2"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ── Partager (owner) ──────────────────────────────────── */}
          {isOwner && event.public_code && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header cliquable */}
              <button
                type="button"
                onClick={() => setShareOpen((o) => !o)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <IconShare />
                  Partager l&apos;événement
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${shareOpen ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {shareOpen && (
                <div className="px-5 py-5 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
                    {/* QR Code */}
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div
                        id="qr-event"
                        className="relative bg-white rounded-2xl border border-gray-200 p-3 w-[156px] flex items-center justify-center shadow-sm"
                      >
                        <QRCode value={publicUrl} size={128} level="H" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-white rounded-lg p-1 shadow-sm">
                            <img src="/logo-qr.png" alt="Grega Play" className="w-8 h-8 object-contain" />
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-gray-400 text-center">Scanner pour rejoindre</p>
                    </div>

                    {/* Lien + actions */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1.5">Lien de partage</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={publicUrl}
                            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-700 bg-gray-50 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(publicUrl);
                                toast.success("Lien copié dans le presse-papiers.");
                              } catch {
                                toast.error("Impossible de copier le lien.");
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <IconCopy /> Copier
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const whatsappUrl = event.public_code && import.meta.env.VITE_BACKEND_URL
                            ? `${import.meta.env.VITE_BACKEND_URL}/share/e/${event.public_code}`
                            : publicUrl;
                          window.open(
                            `https://wa.me/?text=${encodeURIComponent(`Participe à mon événement Grega Play : ${whatsappUrl}`)}`,
                            "_blank"
                          );
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-semibold transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.535 5.856L.057 23.535a.5.5 0 00.608.608l5.743-1.476A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.956 9.956 0 01-5.085-1.389l-.364-.216-3.768.968.986-3.682-.236-.378A9.972 9.972 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                        </svg>
                        Partager sur WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Connexion requise (non connecté) ─────────────────── */}
          {!user && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-indigo-900">Rejoins l&apos;événement</p>
                <p className="text-xs text-indigo-600 mt-0.5">Connecte-toi pour envoyer ta vidéo et participer.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={goLogin} className="text-sm font-semibold py-2.5 px-5">
                  Se connecter
                </Button>
                <Button
                  onClick={goRegister}
                  className="text-sm font-medium py-2.5 px-5 bg-white text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                >
                  S&apos;inscrire
                </Button>
              </div>
            </div>
          )}

          {/* ── Contacter l'organisateur (participants uniquement) ── */}
          {!isOwner && event?.public_code && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setContactOpen((o) => !o)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-800">
                  💬 Contacter l&apos;organisateur
                </span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${contactOpen ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {contactOpen && (
                <div className="px-5 py-5 border-t border-gray-100">
                  {contactStatus === "success" ? (
                    <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                      Votre message a bien été envoyé à l&apos;organisateur.
                    </p>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-3">
                      {contactStatus === "error" && (
                        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                          Une erreur s&apos;est produite. Veuillez réessayer.
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Envoyé en tant que <span className="font-medium text-gray-700">{profile?.full_name || user?.email}</span>
                      </p>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
                        <textarea
                          required
                          rows={4}
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          placeholder="Votre message pour l'organisateur…"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                        />
                      </div>
                      {/* Honeypot */}
                      <input type="text" name="website" style={{ display: "none" }} tabIndex={-1} />
                      <Button type="submit" disabled={contactSending} className="w-full text-sm font-semibold py-2.5">
                        {contactSending ? "Envoi en cours…" : "Envoyer le message"}
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

export default EventDetailsPage;
