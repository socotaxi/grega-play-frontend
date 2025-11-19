// EventDetailsPage.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import Button from "../components/ui/Button";
import Loading from "../components/ui/Loading";
import { useAuth } from "../context/AuthContext";
import eventService from "../services/eventService";
import videoService from "../services/videoService";
import { toast } from "react-toastify";

const EventDetailsPage = () => {
  const { eventId } = useParams();
  const id = eventId;
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const statusMap = useMemo(
    () => ({
      open: { color: "bg-yellow-100 text-yellow-800", label: "Ouvert" },
      ready: { color: "bg-blue-100 text-blue-800", label: "Prêt pour montage" },
      processing: {
        color: "bg-purple-100 text-purple-800",
        label: "En traitement",
      },
      done: { color: "bg-green-100 text-green-800", label: "Terminé" },
      canceled: { color: "bg-red-100 text-red-800", label: "Annulé" },
    }),
    []
  );

  const getStatusInfo = useCallback(
    (status) =>
      statusMap[status] || {
        color: "bg-gray-100 text-gray-800",
        label: "Inconnu",
      },
    [statusMap]
  );

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString("fr-FR", options);
  }, []);

  const isEventExpired = useCallback(
    (event) => {
      if (!event?.deadline) return false;

      const now = new Date();
      const deadline = new Date(event.deadline);

      // On considère l'événement actif jusqu'à la fin de la journée de deadline
      deadline.setHours(23, 59, 59, 999);

      if (event.status === "done" || event.status === "canceled") {
        return false;
      }

      return deadline < now;
    },
    []
  );

  // Récupération de l'événement (toutes colonnes)
  const fetchEvent = useCallback(async () => {
    try {
      setLoading(true);
      const data = await eventService.getEvent(id);
      console.log("EVENT DETAIL:", data);
      setEvent(data);
    } catch (err) {
      console.error("Erreur récupération événement:", err);
      toast.error("Impossible de charger l’événement.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleGenerateFinalVideo = async () => {
    if (!window.confirm("Voulez-vous générer la vidéo finale ?")) return;

    try {
      setGenerating(true);
      await videoService.generateFinalVideo(id);
      toast.success("Vidéo finale générée avec succès.");
      fetchEvent();
    } catch (err) {
      console.error("Erreur génération vidéo:", err);
      toast.error("Erreur lors de la génération de la vidéo.");
    } finally {
      setGenerating(false);
    }
  };

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
  const statusInfo = getStatusInfo(event.status);
  const expired = isEventExpired(event);

  const publicUrl = event.public_code
    ? `${window.location.origin}/e/${event.public_code}`
    : "";

  // Affichage du média selon le type
  const renderMedia = (url) => {
    if (!url) return null;

    const lower = url.toLowerCase();

    if (lower.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
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
        <audio src={url} controls className="w-full mt-4" />
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
          {/* En-tête */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {event.title}
              </h1>
              {event.theme && (
                <p className="mt-1 text-sm text-indigo-600 font-medium">
                  {event.theme}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Créé le {formatDate(event.created_at)}
                {event.deadline && (
                  <> • Date limite vidéos : {formatDate(event.deadline)}</>
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex px-3 py-1 text-[11px] font-medium rounded-full ${statusInfo.color}`}
              >
                {statusInfo.label}
              </span>
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

          {/* Carte principale : infos événement + média + partage */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
            {/* Description */}
            {event.description && (
              <p className="text-sm text-gray-700 leading-relaxed">
                {event.description}
              </p>
            )}

            {/* Média */}
            {event.media_url && renderMedia(event.media_url)}

            {/* Bloc paramètres (durées) s'ils existent */}
            {(event.video_duration || event.max_clip_duration) && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600">
                <p className="font-semibold text-gray-700 mb-1">
                  Paramètres de la vidéo
                </p>
                <div className="flex flex-wrap gap-4">
                  {event.video_duration && (
                    <span>
                      Durée finale max&nbsp;:{" "}
                      <span className="font-medium">
                        {event.video_duration} secondes
                      </span>
                    </span>
                  )}
                  {event.max_clip_duration && (
                    <span>
                      Durée max d&apos;un clip&nbsp;:{" "}
                      <span className="font-medium">
                        {event.max_clip_duration} secondes
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Lien de partage */}
            {event.public_code && (
              <div className="border-t border-gray-100 pt-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">
                  Partager l&apos;événement
                </h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={publicUrl}
                      className="flex-1 text-[11px] border border-gray-200 rounded-md px-2 py-1.5 bg-gray-50 text-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(publicUrl)
                          .then(() => {
                            toast.success("Lien copié dans le presse-papiers");
                          })
                          .catch(() => {
                            toast.error("Impossible de copier le lien");
                          });
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-[11px] font-medium rounded-md bg-white hover:bg-gray-50 text-gray-700"
                    >
                      Copier
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const message = `Participe à mon événement Grega Play : ${publicUrl}`;
                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
                        message
                      )}`;
                      window.open(whatsappUrl, "_blank");
                    }}
                    className="inline-flex items-center justify-center px-3 py-1.5 text-[11px] font-medium rounded-md bg-green-500 hover:bg-green-600 text-white"
                  >
                    Partager sur WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Carte actions principales */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Actions sur l&apos;événement
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <Link
                to={`/submit-video/${event.id}`}
                className="w-full sm:w-auto"
              >
                <Button className="w-full sm:w-auto text-sm font-semibold py-2.5 inline-flex justify-center">
                  Soumettre une vidéo
                </Button>
              </Link>

              {isOwner && (
                <Link
                  to={`/events/${event.id}/manage-participants`}
                  className="w-full sm:w-auto"
                >
                  <Button className="w-full sm:w-auto text-sm font-semibold py-2.5 border border-indigo-600 text-indigo-600 bg-white hover:bg-indigo-50">
                    Inviter des participants
                  </Button>
                </Link>
              )}

              <Link
                to={`/events/${event.id}/final`}
                className="w-full sm:w-auto"
              >
                <Button className="w-full sm:w-auto text-sm font-semibold py-2.5 bg-purple-600 hover:bg-purple-700">
                  Voir les vidéos
                </Button>
              </Link>

              {isOwner && (
                <Button
                  onClick={handleGenerateFinalVideo}
                  disabled={generating}
                  className="w-full sm:w-auto text-sm font-semibold py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60"
                >
                  {generating ? "Génération..." : "Générer la vidéo finale"}
                </Button>
              )}
            </div>
          </div>

          {/* Carte vidéo finale */}
          {event.final_video_path && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Vidéo finale
              </h2>
              <video
                controls
                className="w-full rounded-xl border border-gray-200"
                src={event.final_video_path}
              />
              <p className="mt-2 text-xs text-gray-500">
                Tu peux télécharger ou partager cette vidéo en dehors de Grega
                Play.
              </p>
            </div>
          )}

          {/* Lien vers le Dashboard */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600">
              Retourner au{" "}
              <Link
                to="/dashboard"
                className="text-indigo-600 font-medium underline-offset-2 hover:underline"
              >
                tableau de bord
              </Link>{" "}
              pour voir tous tes événements et l&apos;activité récente.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default EventDetailsPage;
