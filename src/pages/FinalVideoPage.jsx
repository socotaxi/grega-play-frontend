import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import eventService from '../services/eventService';
import videoService from '../services/videoService';
import { useAuth } from '../context/AuthContext';

const SUPABASE_PROJECT_ID = 'cgqnrqbyvetcgwolkjvl.supabase.co';

const FinalVideoPage = () => {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [finalVideo, setFinalVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState(null);
  const [submittedVideos, setSubmittedVideos] = useState([]);

  const isOwner = user && event && user.id === event.user_id;

  useEffect(() => {
    const fetchSubmittedVideos = async () => {
      try {
        const videos = await videoService.getVideosByEvent(eventId);
        setSubmittedVideos(videos);
      } catch (err) {
        console.error('Erreur chargement des vidéos soumises:', err);
      }
    };

    if (isOwner) {
      fetchSubmittedVideos();
    }
  }, [event, user, eventId]);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        const eventData = await eventService.getEvent(eventId);
        setEvent(eventData);

        if (eventData.status === 'done' && eventData.final_video_url) {
          setFinalVideo(eventData.final_video_url);
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

  // 🔽 AJOUT : fonction pour supprimer une vidéo si on est créateur
  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm("Supprimer cette vidéo ?")) return;
    try {
      await videoService.deleteVideo(videoId);
      setSubmittedVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (err) {
      console.error("Erreur suppression vidéo :", err);
      alert("Erreur lors de la suppression de la vidéo.");
    }
  };

  const handleGenerateVideo = async () => {
    if (!event) return;

    try {
      setProcessing(true);
      setGenerationProgress(0);

      const timer = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 90) {
            clearInterval(timer);
            return 90;
          }
          return prev + 2;
        });
      }, 300);

      await videoService.generateFinalVideo(eventId);

      clearInterval(timer);
      setGenerationProgress(100);

      const updatedEvent = await eventService.getEvent(eventId);
      setEvent(updatedEvent);

      if (updatedEvent.final_video_url) {
        setFinalVideo(updatedEvent.final_video_url);
      }
    } catch (err) {
      console.error('Error generating video:', err);
      setError("Une erreur s'est produite lors de la génération de la vidéo.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <Loading fullPage />;
  }

  const canStartProcessing =
    event &&
    (event.status === 'ready' || event.status === 'open') &&
    user &&
    (user.id === event.user_id || user.role === 'admin');

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
              <Link to={`/submit/${event.id}`}>
                <Button>Soumettre une vidéo</Button>
              </Link>
            )}
            {isOwner && (
              <Link to={`/events/${event.id}/participants`}>
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
              <div className="mt-4 aspect-w-16 aspect-h-9">
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
    href={`https://wa.me/?text=${encodeURIComponent(`🎬 Voici notre vidéo finale de l'événement "${event.title}" 🎉\n\n${finalVideo}`)}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600"
  >
    Partager sur WhatsApp
  </a>
</div>
            </>
          ) : submittedVideos.length > 0 && canStartProcessing ? ( // ✅ correction ici
            <div className="text-center">
              <h3 className="mt-2 text-lg font-medium text-gray-900">Prêt pour le montage</h3>
              <p className="mt-1 text-sm text-gray-500">{submittedVideos.length} vidéos ont été soumises. Vous pouvez maintenant générer la vidéo finale.</p>
              <div className="mt-5">
                <Button onClick={handleGenerateVideo} loading={processing} disabled={processing}>
                  Générer la vidéo
                </Button>
              </div>
              {generationProgress > 0 && processing && (
                <div className="w-full bg-gray-200 rounded-full h-4 mt-4">
                  <div
                    className="bg-indigo-600 h-4 rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${generationProgress}%` }}
                  ></div>
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
 
        {/* 🔽 MODIFICATION : ajout du bouton supprimer pour le créateur */}
        {submittedVideos.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🎥 Vidéos soumises</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {submittedVideos.map((video, index) => (
                <div key={video.id || index} className="border rounded-lg shadow-sm p-2 bg-white">
                  <video
                    src={`https://cgqnrqbyvetcgwolkjvl.supabase.co/storage/v1/object/public/videos/${video.storage_path}`}
                    controls
                    className="w-full h-auto rounded"
                  />
                  <p className="mt-2 text-sm text-gray-700 text-center truncate">{video.participant_name}</p>
                  {isOwner && (
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
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default FinalVideoPage;