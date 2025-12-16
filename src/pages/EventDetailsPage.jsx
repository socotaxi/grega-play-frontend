import React, { useEffect, useState, useCallback, useMemo } from "react";
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

  const isPremiumAccount = useMemo(() => {
    if (!profile) return false;

    const now = new Date();
    const rawExpires = profile.premium_account_expires_at;
    const expiresDate = rawExpires ? new Date(rawExpires) : null;

    const hasNewPremiumFlag =
      profile.is_premium_account === true && expiresDate && expiresDate > now;

    const hasLegacyPremiumFlag = profile.is_premium === true;

    return hasNewPremiumFlag || hasLegacyPremiumFlag;
  }, [profile]);

  const loadEvent = useCallback(async () => {
    try {
      const data = await eventService.getEventDetails(id);
      setEvent(data);

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
      toast.error("Impossible de charger l’événement.");
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

    if (eventToCheck.status === "done" || eventToCheck.status === "canceled") {
      return false;
    }

    return deadline < now;
  }, []);

  const getStatusInfo = useCallback((status) => {
    switch (status) {
      case "done":
        return {
          label: "Vidéo finale générée",
          color: "bg-purple-50 text-purple-700 border border-purple-200",
        };
      case "canceled":
        return {
          label: "Événement annulé",
          color: "bg-gray-50 text-gray-600 border border-gray-200",
        };
      default:
        return {
          label: "En cours",
          color: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        };
    }
  }, []);

  // ✅ NOUVEAU : auto-sauvegarde du contexte si event public et user non connecté
  useEffect(() => {
    if (!event) return;
    if (user) return;
    if (event.is_public !== true) return;

    const already = getReturnTo();
    if (already) return;

    const returnUrl =
      window.location.pathname + window.location.search + window.location.hash;

    setReturnTo(returnUrl);
  }, [event, user]);

  const saveReturnToHere = useCallback(() => {
    const returnUrl =
      window.location.pathname + window.location.search + window.location.hash;
    setReturnTo(returnUrl);
  }, []);

  const goLogin = useCallback(() => {
  saveReturnToHere();
  const returnUrl =
    window.location.pathname + window.location.search + window.location.hash;
  navigate(`/login?returnTo=${encodeURIComponent(returnUrl)}`);
}, [navigate, saveReturnToHere]);

const goRegister = useCallback(() => {
  saveReturnToHere();
  const returnUrl =
    window.location.pathname + window.location.search + window.location.hash;
  navigate(`/register?returnTo=${encodeURIComponent(returnUrl)}`);
}, [navigate, saveReturnToHere]);

  const handleUpdateDeadline = async (e) => {
    e.preventDefault();
    if (!event || !user) return;

    if (!newDeadline) {
      toast.error("Merci de choisir une nouvelle date limite.");
      return;
    }

    setUpdatingDeadline(true);
    try {
      const updatedEvent = await eventService.updateEventDeadline(
        event.id,
        newDeadline
      );
      setEvent(updatedEvent);
      setShowDeadlineForm(false);
      toast.success("Date limite mise à jour avec succès.");
    } catch (error) {
      console.error("Erreur mise à jour deadline:", error);
      toast.error(
        "Impossible de mettre à jour la date limite. Réessaie plus tard."
      );
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
      toast.error(
        "Seul le créateur de l'événement peut changer les notifications."
      );
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
        toast.error(
          "Impossible de mettre à jour les notifications. Réessaie plus tard."
        );
        return;
      }

      if (newValue) {
        toast.success("Notifications activées pour cet événement.");
      } else {
        toast.info("Notifications désactivées pour cet événement.");
      }
    } catch (err) {
      console.error("Erreur toggle notifications:", err);
      setNotificationsEnabled(!newValue);
      toast.error(
        "Une erreur est survenue lors de la mise à jour des notifications."
      );
    }
  };

  const participantsCount = useMemo(() => {
    return event?.participants_count ?? null;
  }, [event]);

  const formattedDeadline = useMemo(() => {
    if (!event?.deadline) return "Non définie";

    const d = new Date(event.deadline);
    return d.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [event]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-80px)] bg-gray-50">
          <div className="py-8 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Loading />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!event) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-80px)] bg-gray-50">
          <div className="py-8 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-gray-500">Événement introuvable.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const isOwner = event.user_id === user?.id;
  const ownerHasPremiumAccount = isOwner && isPremiumAccount;
  const statusInfo = getStatusInfo(event.status);
  const expired = isEventExpired(event);
  const isPublicEvent = event.is_public === true;

  const now = new Date();
  const premiumEventExpiresAt = event.premium_event_expires_at
    ? new Date(event.premium_event_expires_at)
    : null;

  const isEventBoostActive =
    event.is_premium_event === true &&
    premiumEventExpiresAt &&
    premiumEventExpiresAt > now;

  const isEffectivePremiumEvent = isEventBoostActive || ownerHasPremiumAccount;

  const basePublicUrl =
    import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;

  const publicUrl = event.public_code
    ? `${basePublicUrl}/e/${event.public_code}`
    : "";

  const renderMedia = (url) => {
    if (!url) return null;

    const lower = url.toLowerCase();

    if (lower.match(/\.(mp4|mov|webm|mkv)$/i)) {
      return (
        <video
          src={url}
          controls
          className="w-full rounded-xl border border-gray-200 mt-4"
        />
      );
    }

    if (lower.match(/\.(mp3|wav|ogg)$/i)) {
      return (
        <audio
          src={url}
          controls
          className="w-full rounded-xl border border-gray-200 mt-4"
        />
      );
    }

    if (lower.match(/\.(png|jpe?g|gif|webp)$/i)) {
      return (
        <img
          src={url}
          alt="Illustration de l'événement"
          className="w-full rounded-xl border border-gray-200 mt-4 object-cover"
        />
      );
    }

    return (
      <img
        src={url}
        alt="Illustration de l'événement"
        className="w-full rounded-xl border border-gray-200 mt-4 object-cover"
      />
    );
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {event.title || "Événement sans titre"}
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Créé par{" "}
                <span className="font-medium">
                  {ownerName || "Un organisateur"}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
              {isOwner && (
                <Link
                  to={`/events/${event.id}/manage-participants`}
                  className="w-full sm:w-auto"
                >
                  <Button className="w-full sm:w-auto text-sm font-semibold py-2.5 inline-flex justify-center">
                    Inviter des participants
                  </Button>
                </Link>
              )}

              {!user ? (
                <>
                  <Button
                    onClick={goLogin}
                    className="w-full sm:w-auto text-sm font-semibold py-2.5 inline-flex justify-center"
                  >
                    Se connecter pour participer
                  </Button>
                  <Button
                    onClick={goRegister}
                    className="w-full sm:w-auto text-sm font-medium py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  >
                    S’inscrire
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    to={`/submit-video/${event.id}`}
                    className="w-full sm:w-auto"
                  >
                    <Button className="w-full sm:w-auto text-sm font-medium py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                      Soumettre une vidéo
                    </Button>
                  </Link>

                  <Link
                    to={`/events/${event.id}/final`}
                    className="w-full sm:w-auto"
                  >
                    <Button className="w-full sm:w-auto text-sm font-semibold py-2.5 bg-purple-600 hover:bg-purple-700">
                      Voir les vidéos & générer le montage
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="inline-flex px-3 py-1 text-[11px] font-medium rounded-full bg-gray-100 text-gray-700">
                  {event.theme || "Type d'événement non précisé"}
                </span>
                <span className="inline-flex px-3 py-1 text-[11px] font-medium rounded-full bg-gray-100 text-gray-700">
                  Date limite :{" "}
                  <span className="font-semibold ml-1">
                    {formattedDeadline}
                  </span>
                </span>
                {participantsCount !== null && (
                  <span className="inline-flex px-3 py-1 text-[11px] font-medium rounded-full bg-gray-100 text-gray-700">
                    Invités :{" "}
                    <span className="font-semibold ml-1">
                      {participantsCount}
                    </span>
                  </span>
                )}
              </div>

              {isOwner && (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setShowDeadlineForm((prev) => !prev)}
                    className="inline-flex items-center px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-[11px] font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Modifier la date limite
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleVisibility}
                    disabled={updatingVisibility}
                    className={`inline-flex items-center px-3 py-1 rounded-full border text-[11px] font-medium ${
                      updatingVisibility
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
                    }`}
                  >
                    {updatingVisibility
                      ? "Changement de visibilité..."
                      : isPublicEvent
                      ? "Événement public"
                      : "Événement privé"}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <span
                  className={`inline-flex px-3 py-1 text-[11px] font-medium rounded-full ${statusInfo.color}`}
                >
                  {statusInfo.label}
                </span>

                <span className="inline-flex px-3 py-1 text-[11px] font-medium rounded-full bg-gray-100 text-gray-700">
                  {isPublicEvent ? "Public" : "Privé"}
                </span>

                {isEffectivePremiumEvent && (
                  <span className="inline-flex px-3 py-1 text-[11px] font-medium rounded-full bg-purple-100 text-purple-800">
                    Événement Premium
                  </span>
                )}

                {expired && (
                  <span className="inline-flex px-3 py-1 text-[11px] font-medium rounded-full bg-red-100 text-red-800">
                    Expiré
                  </span>
                )}

                {event.final_video_path && (
                  <span className="inline-flex px-3 py-1 text-[11px] font-medium rounded-full bg-purple-100 text-purple-800">
                    Vidéo finale prête
                  </span>
                )}
              </div>
            </div>

            {isOwner && (
              <button
                type="button"
                onClick={handleToggleNotifications}
                className={`inline-flex items-center px-3 py-2 rounded-xl text-[11px] font-medium border ${
                  notificationsEnabled
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-gray-50 text-gray-600 border-gray-200"
                }`}
              >
                <span
                  className={`mr-2 inline-flex h-4 w-7 items-center rounded-full transition
                        ${notificationsEnabled ? "bg-emerald-500" : "bg-gray-300"}`}
                >
                  <span
                    className={`h-3 w-3 bg-white rounded-full shadow transform transition-transform
                          ${
                            notificationsEnabled
                              ? "translate-x-3"
                              : "translate-x-1"
                          }`}
                  />
                </span>
                {notificationsEnabled
                  ? "Notifications activées"
                  : "Notifications désactivées"}
              </button>
            )}
          </div>

          {isOwner && showDeadlineForm && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4">
              <form
                onSubmit={handleUpdateDeadline}
                className="flex flex-col sm:flex-row gap-3 sm:items-center"
              >
                <div className="flex-1">
                  <label
                    htmlFor="newDeadline"
                    className="block text-xs font-medium text-gray-700 mb-1"
                  >
                    Nouvelle date limite pour recevoir les vidéos
                  </label>
                  <input
                    id="newDeadline"
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={updatingDeadline}
                    className="text-sm font-semibold py-2.5"
                  >
                    {updatingDeadline
                      ? "Mise à jour..."
                      : "Enregistrer la nouvelle date"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowDeadlineForm(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
            {event.description && (
              <p className="text-sm text-gray-700 leading-relaxed">
                {event.description}
              </p>
            )}

            {event.media_url && renderMedia(event.media_url)}

            {isOwner && event.public_code && (
              <div className="border-t border-gray-100 pt-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">
                  Partager l&apos;événement
                </h2>

                <div className="mt-3 flex flex-col sm:flex-row gap-4 sm:items-start">
                  <div className="shrink-0">
                    <div className="text-xs font-medium text-gray-700 mb-2">
                      QR code
                    </div>

                    <div
                      id="qr-event"
                      className="relative bg-white rounded-xl border border-gray-200 p-3 w-[168px] flex items-center justify-center"
                    >
                      <QRCode value={publicUrl} size={140} level="H" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-white rounded-lg p-1 shadow-sm">
                          <img
                            src="/logo-qr.png"
                            alt="Grega Play"
                            className="w-8 h-8 object-contain"
                          />
                        </div>
                      </div>
                    </div>

                    <p className="mt-2 text-[11px] text-gray-500">
                      Scan pour accéder à l&apos;événement
                    </p>
                  </div>

                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-700 mb-2">
                      Lien
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={publicUrl}
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 bg-gray-50"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(publicUrl);
                              toast.success(
                                "Lien copié dans le presse-papiers."
                              );
                            } catch (err) {
                              console.error("Erreur copie lien:", err);
                              toast.error("Impossible de copier le lien.");
                            }
                          }}
                          className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Copier
                        </button>
                      </div>
                    </div>

                    <p className="mt-2 text-[11px] text-gray-500">
                      Partage ce lien (ou le QR) à tes invités.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!user && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-700">
                Pour envoyer une vidéo, tu dois être connecté.
              </p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <Button onClick={goLogin} className="w-full sm:w-auto">
                  Se connecter
                </Button>
                <Button
                  onClick={goRegister}
                  className="w-full sm:w-auto bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                >
                  S’inscrire
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default EventDetailsPage;
