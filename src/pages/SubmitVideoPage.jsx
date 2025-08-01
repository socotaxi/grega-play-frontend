import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import eventService from '../services/eventService';
import videoService from '../services/videoService';
import { toast } from 'react-toastify';
import supabase from '../lib/supabaseClient';

const SubmitVideoPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [participantName, setParticipantName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [existingVideo, setExistingVideo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressTimer, setProgressTimer] = useState(null);

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
      if (!participantName.trim()) return;
      try {
        const video = await videoService.getMyVideoForEvent(eventId, participantName.trim());
        setExistingVideo(video);
      } catch (err) {
        setExistingVideo(null);
      }
    };

    checkExistingVideo();
  }, [participantName, eventId]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 4000); // ⏳ Redirection après 4 secondes

      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Veuillez sélectionner un fichier vidéo.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handleDeleteVideo = async () => {
    if (!window.confirm('Supprimer votre vidéo ?')) return;
    try {
      await videoService.deleteVideo(existingVideo.id);
      setExistingVideo(null);
      toast.success('Vidéo supprimée');
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!participantName.trim()) {
      setError('Veuillez entrer votre nom.');
      return;
    }

    if (!selectedFile) {
      setError('Veuillez sélectionner une vidéo à soumettre.');
      return;
    }

    setUploadProgress(0);
    const timer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(timer);
          return 90;
        }
        return prev + 2;
      });
    }, 300);
    setProgressTimer(timer);
    setSubmitting(true);

    try {
      await videoService.uploadVideo(eventId, participantName.trim(), selectedFile, null);
      setUploadProgress(100);
      clearInterval(timer);
      setSuccess(true);
    } catch (err) {
      console.error('Erreur envoi vidéo:', err);
      setError(err.message || 'Une erreur est survenue.');
      clearInterval(timer);
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
              Elle sera incluse dans le montage final. <br />
              Redirection vers le tableau de bord...
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
            <label className="block text-sm font-medium text-gray-700">Votre nom</label>
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Entrez votre nom"
              required
            />
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
