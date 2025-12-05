// src/pages/SubmitVideoPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import eventService from '../services/eventService';
import videoService from '../services/videoService';
import { toast } from 'react-toastify';
import supabase from '../lib/supabaseClient';
import activityService from "../services/activityService";
import { useAuth } from "../context/AuthContext";

const MAX_VIDEO_DURATION_SECONDS = 30;
const MAX_VIDEO_SIZE_MB = 50;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

const SubmitVideoPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [event, setEvent] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [existingVideo, setExistingVideo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isInvited, setIsInvited] = useState(true);

  // Nom affiché dans l'UI
  const displayName =
    profile?.full_name && profile.full_name !== "User"
      ? profile.full_name
      : user?.email || "Invité";

  // Email utilisé comme identifiant interne (participant_name = email)
  const participantEmail = user?.email || "";

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const eventData = await eventService.getEvent(eventId);
        setEvent(eventData);

        // Messages d'info si déjà fermé / expiré
        if (eventData.status !== 'open') {
          setError("Cet événement n'accepte plus de vidéos.");
        }

        const endDate = new Date(eventData.deadline);
        if (endDate < new Date()) {
          setError('La date limite de cet événement est dépassée.');
        }

        // 🔒 Déterminer si l'utilisateur est le créateur
        const isCreatorLocal =
          user?.id && eventData?.user_id && eventData.user_id === user.id;

        const isPublicEvent = eventData?.is_public === true;

        if (isCreatorLocal || isPublicEvent) {
          // Le créateur et les participants d'un événement public
          // sont considérés comme "autorisés" sans vérification d'invitation.
          setIsInvited(true);
        } else if (participantEmail) {
          // 🔒 Vérifier que l'utilisateur (email) est bien invité à cet évènement
          const { data: invites, error: inviteErr } = await supabase
            .from("invitations")
            .select("email")
            .eq("event_id", eventId)
            .eq("email", participantEmail);

          if (inviteErr) {
            console.error("Erreur vérification invitation:", inviteErr);
          }

          const invited = invites && invites.length > 0;
          setIsInvited(!!invited);

          if (!invited) {
            setError("Vous n'êtes pas invité à cet événement. Vous ne pouvez pas envoyer de vidéo.");
          }
        }
      } catch (err) {
        console.error('Erreur chargement événement:', err);
        setError("Impossible de charger les détails de l'événement.");
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId, participantEmail, user]);

  useEffect(() => {
    const checkExistingVideo = async () => {
      if (!user?.id) return;
      try {
        const video = await videoService.getMyVideoForEvent(eventId, user.id);
        setExistingVideo(video);
      } catch {
        setExistingVideo(null);
      }
    };

    checkExistingVideo();
  }, [user?.id, eventId]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate(`/events/${eventId}/final`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate, eventId]);

  // 🔒 Calcul central : évènement expiré / fermé
  const now = new Date();
  const isEventExpired = event?.deadline
    ? new Date(event.deadline) < now
    : false;
  const isEventClosed = event?.status && event.status !== "open";

  // Le créateur de l'évènement doit toujours pouvoir envoyer une vidéo
  const isCreator =
    user?.id && event?.user_id && user.id === event.user_id;

  const isPublicEvent = event?.is_public === true;

  // On peut uploader si événement ouvert + (événement public OU invité OU créateur)
  const canUpload =
    !isEventExpired && !isEventClosed && (isPublicEvent || isInvited || isCreator);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 🔒 Double garde-fou : si l'événement est expiré/fermé ou non autorisé, on bloque
    if (!canUpload) {
      setError("Cet événement est terminé ou vous n'êtes pas autorisé à envoyer une vidéo.");
      e.target.value = null;
      return;
    }

    if (!file.type.startsWith('video/')) {
      setError('Veuillez sélectionner un fichier vidéo.');
      e.target.value = null;
      return;
    }

    // 🔒 Contrôle du poids côté frontend
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setError(`⛔ La vidéo est trop lourde. Taille maximale : ${MAX_VIDEO_SIZE_MB} Mo.`);
      setSelectedFile(null);
      setPreviewUrl(null);
      e.target.value = null;
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);

      if (video.duration > MAX_VIDEO_DURATION_SECONDS) {
        setError(`⛔ La vidéo ne doit pas dépasser ${MAX_VIDEO_DURATION_SECONDS} secondes.`);
        setSelectedFile(null);
        setPreviewUrl(null);
        e.target.value = null;
      } else {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setError(null);
      }
    };
    video.src = URL.createObjectURL(file);
  };

  const handleDeleteVideo = async () => {
    if (!window.confirm('Supprimer votre vidéo ?')) return;
    try {
      await videoService.deleteVideo(existingVideo.id);
      setExistingVideo(null);
      toast.success('Vidéo supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!event) {
      setError("Événement introuvable.");
      return;
    }

    // 🔒 Re-vérifier côté front juste avant envoi
    const nowLocal = new Date();
    const endDate = event.deadline ? new Date(event.deadline) : null;

    if (!endDate || endDate < nowLocal || event.status !== "open") {
      setError("Cet événement est terminé ou expiré. Vous ne pouvez plus envoyer de vidéo.");
      return;
    }

    // Si ce n'est pas le créateur, il doit être invité et avoir un email,
    // sauf si l'événement est public (dans ce cas tout utilisateur connecté peut participer)
    if (!isCreator && !isPublicEvent && (!isInvited || !participantEmail)) {
      setError("Vous n'êtes pas invité à cet événement. Vous ne pouvez pas envoyer de vidéo.");
      return;
    }

    if (!selectedFile || !(selectedFile instanceof File)) {
      setError("Veuillez sélectionner un fichier vidéo valide.");
      return;
    }

    // Double-check poids avant envoi
    if (selectedFile.size > MAX_VIDEO_SIZE_BYTES) {
      setError(`⛔ La vidéo est trop lourde. Taille maximale : ${MAX_VIDEO_SIZE_MB} Mo.`);
      return;
    }

    setSubmitting(true);

    // 🟦 DÉBUT : simulation de progression
    setUploadProgress(10);
    let intervalId = null;

    intervalId = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(intervalId);
          return 90;
        }
        return prev + 0.5; // progression douce
      });
    }, 500);
    // 🟦 FIN : simulation de progression

    try {
      // Upload de la vidéo (passera ensuite par les garde-fous backend)
      await videoService.uploadVideo(eventId, user.id, selectedFile, participantEmail);

      // Log dans le feed d'activité
      await activityService.logActivity({
        event_id: eventId,
        user_id: user?.id || null,
        type: "uploaded_video",
        message: `${displayName} a posté une vidéo 🎥`,
      });

      // Upload terminé → on termine la barre à 100 %
      setUploadProgress(100);
      setSuccess(true);

    } catch (err) {
      console.error("Erreur envoi vidéo:", err);
      setError(err.message || "Une erreur est survenue.");
      setUploadProgress(0);
    } finally {
      setSubmitting(false);
      if (intervalId) clearInterval(intervalId);
    }
  };

  if (loading) return <Loading fullPage />;

  if (success) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-green-600">Merci pour votre vidéo !</h2>
            <p className="mt-2 text-sm text-gray-600">
              Vous allez être redirigé automatiquement vers la vidéo finale...
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const videoUrl = existingVideo
    ? supabase.storage.from('videos').getPublicUrl(existingVideo.storage_path).data.publicUrl
    : null;

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{event?.title}</h1>
        {event?.theme && <p className="text-sm text-gray-500 mb-2">Thème : {event.theme}</p>}

        {(isEventExpired || isEventClosed) && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
            Cet événement est terminé. Vous ne pouvez plus envoyer de nouvelle vidéo.
          </div>
        )}

        {!isInvited && !isCreator && !isPublicEvent && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            Vous n'êtes pas invité à cet événement. Vous ne pouvez pas envoyer de vidéo.
          </div>
        )}

        {existingVideo && (
          <div className="mb-6 bg-white p-4 border rounded shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-2">🎬 Vidéo déjà envoyée</h3>
            <div className="w-full aspect-w-9 aspect-h-16 mb-3 rounded-md shadow-sm overflow-hidden">
              <video
                controls
                src={videoUrl}
                className="w-full h-full object-cover"
              />
            </div>
            <Button variant="danger" onClick={handleDeleteVideo}>Supprimer ma vidéo</Button>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded shadow">
          <div>
            <label className="block text-sm font-medium text-gray-700">Participant</label>
            <p className="mt-1 text-gray-900 font-medium">{displayName}</p>
          </div>

          {/* On n'affiche le bloc d'upload QUE si l'événement accepte encore des vidéos et que l'utilisateur est invité ou créateur */}
          {!existingVideo && canUpload && (
            <>
              <div>
                <label className="block text	sm font-medium text-gray-700">Vidéo</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  disabled={submitting || !canUpload}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Durée max : {MAX_VIDEO_DURATION_SECONDS} secondes · Taille max : {MAX_VIDEO_SIZE_MB} Mo.
                </p>
                {previewUrl && (
                  <div className="mt-4 w-full aspect-w-9 aspect-h-16 rounded-md shadow-sm overflow-hidden">
                    <video
                      src={previewUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* 🟦 Barre de progression visible dès le début de l'upload */}
              {uploadProgress > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-indigo-600 h-3 rounded-full transition-all duration-200 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 text-right">
                    {uploadProgress}%
                  </p>
                </div>
              )}

              <div>
                <Button
                  type="submit"
                  loading={submitting}
                  disabled={submitting || !selectedFile || !canUpload}
                >
                  Soumettre la vidéo
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </MainLayout>
  );
};

export default SubmitVideoPage;
