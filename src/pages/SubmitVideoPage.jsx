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

  const participantName =
    profile?.full_name && profile.full_name !== "User"
      ? profile.full_name
      : user?.email || "Invité";

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const eventData = await eventService.getEvent(eventId);
        setEvent(eventData);

        if (eventData.status !== 'open') {
          setError("Cet événement n'accepte plus de vidéos.");
        }

        const endDate = new Date(eventData.deadline);
        if (endDate < new Date()) {
          setError('La date limite de cet événement est dépassée.');
        }
      } catch (err) {
        console.error('Erreur chargement événement:', err);
        setError("Impossible de charger les détails de l'événement.");
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

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


  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Veuillez sélectionner un fichier vidéo.');
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);

      if (video.duration > 10) {
        setError("⛔ La vidéo ne doit pas dépasser 10 secondes.");
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

    if (!selectedFile || !(selectedFile instanceof File)) {
      setError("Veuillez sélectionner un fichier vidéo valide.");
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {

      // ✅ ICI : NOUVELLE LIGNE AVEC participantName
      await videoService.uploadVideo(eventId, user.id, selectedFile, participantName);

      await activityService.logActivity({
        event_id: eventId,
        user_id: user?.id || null,
        type: "uploaded_video",
        message: `${participantName} a posté une vidéo 🎥`,
      });

      setUploadProgress(100);
      setSuccess(true);

    } catch (err) {
      console.error("Erreur envoi vidéo:", err);
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
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
        {event?.theme && <p className="text-sm text-gray-500 mb-6">Thème : {event.theme}</p>}

        {existingVideo && (
          <div className="mb-6 bg-white p-4 border rounded shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-2">🎬 Vidéo déjà envoyée</h3>
            <video controls src={videoUrl} className="w-full h-auto rounded mb-3" />
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
            <p className="mt-1 text-gray-900 font-medium">{participantName}</p>
          </div>

          {!existingVideo && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vidéo</label>
                <input type="file" accept="video/*" onChange={handleFileChange} />
                {previewUrl && (
                  <video src={previewUrl} controls className="mt-4 w-full rounded" />
                )}
              </div>

              {uploadProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
                  <div
                    className="bg-indigo-600 h-4 rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}

              <div>
                <Button type="submit" loading={submitting}>
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
