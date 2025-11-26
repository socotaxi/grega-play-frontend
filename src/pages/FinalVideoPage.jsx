// src/pages/FinalVideoPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import eventService from '../services/eventService';
import videoService from '../services/videoService';
import { useAuth } from '../context/AuthContext';
import activityService from "../services/activityService";
import supabase from "../lib/supabaseClient";
import { toast } from "react-toastify";

// Helper pour obtenir l'URL publique d'une vidéo stockée dans le bucket "videos"
const getPublicVideoUrl = (storagePath) => {
  if (!storagePath) return null;

  const { data } = supabase
    .storage
    .from("videos")
    .getPublicUrl(storagePath);

  return data?.publicUrl || null;
};

const FinalVideoPage = () => {
  const { eventId } = useParams();
  const { user, profile } = useAuth();
  const [event, setEvent] = useState(null);
  const [finalVideo, setFinalVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState(null);
  const [submittedVideos, setSubmittedVideos] = useState([]);
  const [generationLabel, setGenerationLabel] = useState("");
  const [selectedVideoIds, setSelectedVideoIds] = useState([]);

  const isOwner = user && event && user.id === event.user_id;

  // Charger vidéos soumises
  useEffect(() => {
    const fetchSubmittedVideos = async () => {
      try {
        const videos = await videoService.getVideosByEvent(eventId);

        if (!isOwner && user) {
          const userVideos = videos.filter(v => v.user_id === user.id);
          setSubmittedVideos(userVideos);
        } else {
          setSubmittedVideos(videos);
        }
      } catch (err) {
        console.error('Erreur chargement des vidéos soumises:', err);
      }
    };

    if (user) {
      fetchSubmittedVideos();
    }
  }, [event, user, eventId, isOwner]);

  // Charger détails de l'événement
  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        const eventData = await eventService.getEvent(eventId);
        setEvent(eventData);

        if (eventData.status === 'done' && eventData.final_video_url) {
          const baseUrl =
            typeof eventData.final_video_url === "string"
              ? eventData.final_video_url
              : eventData.final_video_url.videoUrl;

          setFinalVideo(`${baseUrl}?t=${Date.now()}`);
        }
      } catch (err) {
        console.error('Error fetching event details:', err);
        setError("Impossible de charger les détails de l'événement.");
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  // Realtime Supabase pour suivre les updates de l'événement
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`event-changes-${eventId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "events", filter: `id=eq.${eventId}` },
        (payload) => {
          console.log("📡 Realtime update reçu:", payload.new);
          const updated = payload.new;
          setEvent(updated);

          if (updated.status === "processing") {
            toast.info("⏳ Génération de la vidéo en cours...");
          }

          if (updated.status === "done" && updated.final_video_url) {
            const baseUrl =
              typeof updated.final_video_url === "string"
                ? updated.final_video_url
                : updated.final_video_url.videoUrl;

            setFinalVideo(`${baseUrl}?t=${Date.now()}`);
            setGenerationProgress(100);
            setGenerationLabel("Montage terminé 🎉");
            setProcessing(false);
            toast.success("🎉 Vidéo finale générée !");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Polling de secours quand l'événement est en "processing"
  useEffect(() => {
    if (!eventId) return;
    if (event?.status !== 'processing') return;

    let isCancelled = false;
    let attempts = 0;
    const maxAttempts = 45;

    const pollEvent = async () => {
      if (isCancelled) return;
      attempts += 1;

      try {
        const updatedEvent = await eventService.getEvent(eventId);
        if (isCancelled) return;

        setEvent(updatedEvent);

        if (updatedEvent.status === 'done' && updatedEvent.final_video_url) {
          const baseUrl =
            typeof updatedEvent.final_video_url === 'string'
              ? updatedEvent.final_video_url
              : updatedEvent.final_video_url.videoUrl;

          setFinalVideo(`${baseUrl}?t=${Date.now()}`);
          setGenerationProgress(100);
          setProcessing(false);
          toast.success("🎉 Vidéo finale générée !");
          return;
        }

        if (updatedEvent.status === 'processing' && attempts < maxAttempts) {
          setTimeout(pollEvent, 5000);
        } else if (updatedEvent.status !== 'processing') {
          setProcessing(false);
        } else {
          setProcessing(false);
          toast.error("Le montage prend plus de temps que prévu. Actualisez la page dans quelques minutes.");
        }
      } catch (err) {
        if (isCancelled) return;
        console.error("Erreur lors du polling de l'événement:", err);
        setProcessing(false);
        toast.error("Erreur lors du suivi de la génération de la vidéo.");
      }
    };

    pollEvent();

    return () => {
      isCancelled = true;
    };
  }, [event?.status, eventId]);

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm("Supprimer cette vidéo ?")) return;
    try {
      await videoService.deleteVideo(videoId);
      setSubmittedVideos(prev => prev.filter(v => v.id !== videoId));
      setSelectedVideoIds(prev => prev.filter(id => id !== videoId));
    } catch (err) {
      console.error("Erreur suppression vidéo :", err);
      alert("Erreur lors de la suppression de la vidéo.");
    }
  };

  const toggleSelectVideo = (videoId) => {
    if (!isOwner) return;

    setSelectedVideoIds((prev) => {
      if (prev.includes(videoId)) {
        return prev.filter((id) => id !== videoId);
      }
      return [...prev, videoId];
    });
  };

  const handleGenerateVideo = async () => {
    if (!event || !user) return;

    // Règles de base : 2 à 5 vidéos sélectionnées en gratuit
    if (!Array.isArray(selectedVideoIds) || selectedVideoIds.length < 2) {
      setError("Sélectionne au moins 2 vidéos pour générer la vidéo finale.");
      toast.error("Sélectionne au moins 2 vidéos.");
      return;
    }

    const isPremium = false; // à remplacer plus tard quand le Premium sera implémenté

    if (!isPremium && selectedVideoIds.length > 5) {
      setError("La version gratuite permet d'utiliser au maximum 5 vidéos. Passe à Premium pour en utiliser davantage.");
      toast.error("Maximum 5 vidéos en version gratuite.");
      return;
    }

    let timer;
    try {
      setError(null);
      setProcessing(true);
      setGenerationProgress(5); // démarre très bas
      setGenerationLabel("Préparation des vidéos…"); // texte initial

      setEvent(prev => prev ? { ...prev, status: 'processing' } : prev);

      // 🟦 Barre de progression lente + texte dynamique
      timer = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 90) {
            clearInterval(timer);
            return 90;
          }

          const next = prev + 0.5; // progression plus lente

          // Texte dynamique selon l'avancement
          if (next < 30) {
            setGenerationLabel("Préparation des vidéos…");
          } else if (next < 60) {
            setGenerationLabel("Montage en cours…");
          } else if (next < 90) {
            setGenerationLabel("Finalisation de la vidéo…");
          }

          return next;
        });
      }, 600); // tick plus espacé → plus lent
      // 🟦 fin barre lente

      const res = await videoService.generateFinalVideo(eventId, selectedVideoIds);

      if (timer) clearInterval(timer);
      setGenerationProgress((prev) => (prev < 90 ? 90 : prev));

      if (res?.finalVideoUrl?.videoUrl) {
        const url = `${res.finalVideoUrl.videoUrl}?t=${Date.now()}`;
        setFinalVideo(url);
        setGenerationProgress(100);
        setGenerationLabel("Montage terminé 🎉");
        setProcessing(false);
        toast.success("🎉 Vidéo finale générée !");
      }

      const creatorName =
        profile?.full_name && profile.full_name !== "User"
          ? profile.full_name
          : user?.email || "Un utilisateur";

      await activityService.logActivity({
        event_id: eventId,
        user_id: user.id,
        type: "generated_final_video",
        message: `${creatorName} a (re)généré la vidéo finale de l'événement "${event.title}" 🎬✅`
      });
    } catch (err) {
      console.error('Error generating video:', err);
      if (timer) clearInterval(timer);
      setProcessing(false);
      setGenerationProgress(0);
      setGenerationLabel("");
      setError("Une erreur s'est produite lors de la génération de la vidéo.");
      toast.error("❌ Erreur lors de la génération !");
    }
  };

  if (loading) {
    return <Loading fullPage />;
  }

  const canStartProcessing =
    event &&
    (event.status === 'ready' || event.status === 'open' || event.status === 'done') &&
    user &&
    (user.id === event.user_id || user.role === 'admin');

  // 🔗 Lien public de partage (player) basé sur public_code
  const publicShareUrl =
    event?.public_code
      ? `${window.location.origin}/player/${event.public_code}`
      : finalVideo || "";

  const selectionInfo =
    isOwner && submittedVideos.length > 0
      ? `Vidéos sélectionnées : ${selectedVideoIds.length} (min 2, max 5 en gratuit)`
      : "";

  const generateDisabled =
    processing ||
    !isOwner ||
    !canStartProcessing ||
    selectedVideoIds.length < 2 ||
    selectedVideoIds.length > 5;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">
              {event ? event.title : 'Vidéo finale'}
            </h1>
            {event?.theme && (
              <p className="mt-1 text-sm text-gray-500">Thème: {event.theme}</p>
            )}
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
            {['open', 'ready'].includes(event?.status) && (
              <Link to={`/submit-video/${event.id}`}>
                <Button>Soumettre une vidéo</Button>
              </Link>
            )}
            {isOwner && (
              <Link to={`/events/${event.id}/manage-participants`}>
                <Button variant="secondary">Inviter des participants</Button>
              </Link>
            )}
            <Link to="/dashboard">
              <Button variant="secondary">Retour au tableau de bord</Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg px-4 py-5 sm:p-6">
          {finalVideo && isOwner ? (
            <>
              <h3 className="text-lg font-medium text-gray-900">Vidéo finale</h3>
              <div className="mt-4 aspect-w-9 aspect-h-16">
                <video
                  controls
                  className="w-full h-auto rounded-md shadow-lg"
                  src={finalVideo}
                >
                  Votre navigateur ne prend pas en charge la lecture de vidéos.
                </video>
              </div>
              <div className="mt-5 flex flex-col sm:flex-row justify-center gap-4">
                <a
                  href={finalVideo}
                  download={`${event.title.replace(/\s+/g, '_')}_final.mp4`}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Télécharger la vidéo
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`🎬 Voici notre vidéo finale de l'événement "${event.title}" 🎉\n\n${publicShareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600"
                >
                  Partager sur WhatsApp
                </a>
              </div>

              {/* Lien de partage public (pro, version player) */}
              {publicShareUrl && (
                <div className="mt-4 max-w-xl mx-auto">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lien de partage public
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      readOnly
                      value={publicShareUrl}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(publicShareUrl);
                        toast.success("Lien copié dans le presse-papiers");
                      }}
                      className="px-3 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Copier le lien
                    </button>
                  </div>
                </div>
              )}

              {isOwner && submittedVideos.length > 0 && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Tu peux sélectionner 2 à 5 vidéos ci-dessous pour régénérer la vidéo finale.
                  </p>
                  <p className="text-xs text-gray-500 mb-3">{selectionInfo}</p>
                  <Button onClick={handleGenerateVideo} loading={processing} disabled={generateDisabled}>
                    🔄 Régénérer la vidéo avec la sélection
                  </Button>
                </div>
              )}

              {/* Barre de progression */}
              {processing && generationProgress > 0 && (
                <div className="mt-4">
                  {generationLabel && (
                    <p className="mb-1 text-sm text-gray-600 text-left">
                      {generationLabel}
                    </p>
                  )}
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-indigo-600 h-3 rounded-full transition-all duration-200 ease-out"
                      style={{ width: `${generationProgress}%` }}
                    ></div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 text-right">
                    {Math.round(generationProgress)}%
                  </p>
                </div>
              )}
            </>
          ) : submittedVideos.length > 0 && canStartProcessing && isOwner ? (
            <div className="text-center">
              <h3 className="mt-2 text-lg font-medium text-gray-900">Prêt pour le montage</h3>
              <p className="mt-1 text-sm text-gray-500">
                {submittedVideos.length} vidéos ont été soumises. Sélectionne entre 2 et 5 vidéos ci-dessous pour créer la vidéo finale.
              </p>
              <p className="mt-1 text-xs text-gray-500">{selectionInfo}</p>
              <div className="mt-5">
                <Button
                  onClick={handleGenerateVideo}
                  loading={processing}
                  disabled={generateDisabled}
                >
                  Générer la vidéo finale
                </Button>
              </div>

              {/* Barre de progression similaire à l’upload */}
              {generationProgress > 0 && (
                <div className="mt-4">
                  {/* Texte dynamique au-dessus de la barre */}
                  {generationLabel && (
                    <p className="mb-1 text-sm text-gray-600 text-left">
                      {generationLabel}
                    </p>
                  )}
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-indigo-600 h-3 rounded-full transition-all duration-200 ease-out"
                      style={{ width: `${generationProgress}%` }}
                    ></div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 text-right">
                    {Math.round(generationProgress)}%
                  </p>
                </div>
              )}

            </div>
          ) : event?.status === 'done' && finalVideo && !isOwner ? (
            <p className="text-center text-gray-600 mt-4 italic">
              🎬 La vidéo finale de <strong>{event.title}</strong> est disponible.<br />
              Le créateur de l’événement va bientôt la partager avec vous.
            </p>
          ) : (
            <p className="text-center text-gray-500 mt-4">Aucune vidéo finale disponible.</p>
          )}
        </div>

        {submittedVideos.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🎥 Vidéos soumises</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {submittedVideos.map((video, index) => {
                const publicUrl = getPublicVideoUrl(video.storage_path);

                const isSelected = selectedVideoIds.includes(video.id);

                return (
                  <div key={video.id || index} className="border rounded-lg shadow-sm p-2 bg-white">
                    {isOwner && canStartProcessing && (
                      <label className="flex items-center gap-2 mb-2 text-xs text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                          checked={isSelected}
                          onChange={() => toggleSelectVideo(video.id)}
                        />
                        <span>Inclure dans le montage</span>
                      </label>
                    )}
                    <video
                      src={publicUrl}
                      controls
                      className="w-full h-auto rounded"
                    />
                    <p className="mt-2 text-sm font-semibold text-gray-900 text-center truncate">
                      {video.participant_name || "Auteur inconnu"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 text-center">
                      Partagée le{" "}
                      {video.created_at
                        ? new Date(video.created_at).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "date inconnue"}
                    </p>

                    {(isOwner || video.user_id === user?.id) && (
                      <div className="mt-2 flex justify-center">
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          className="text-red-600 text-sm hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default FinalVideoPage;
