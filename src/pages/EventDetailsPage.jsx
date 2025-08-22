// EventDetailsPage.jsx
import React, { useEffect, useState, useCallback } from "react";
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

  const fetchEvent = useCallback(async () => {
    try {
      setLoading(true);
      const data = await eventService.getEventById(id);
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
      toast.success("Vidéo finale générée avec succès !");
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
        <div className="py-8 max-w-4xl mx-auto px-4">
          <Loading />
        </div>
      </MainLayout>
    );
  }

  if (!event) {
    return (
      <MainLayout>
        <div className="py-8 max-w-4xl mx-auto px-4">
          <p className="text-gray-500">Événement introuvable.</p>
        </div>
      </MainLayout>
    );
  }

  const isOwner = event.user_id === user?.id;

  return (
    <MainLayout>
      <div className="py-6 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Infos événement */}
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{event.description}</p>
          <p className="mt-2 text-sm text-gray-400">
            Créé le {new Date(event.created_at).toLocaleDateString("fr-FR")}
          </p>
        </div>

        {/* Actions principales */}
        <div className="bg-white shadow rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-2">
          <Link
            to={`/submit-video/${event.id}`}
            className="w-full sm:w-auto inline-flex justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow hover:bg-indigo-700"
          >
            📤 Soumettre une vidéo
          </Link>

          {isOwner && (
            <Link
              to={`/events/${event.id}/manage-participants`}
              className="w-full sm:w-auto inline-flex justify-center px-4 py-2 border border-indigo-600 text-indigo-600 text-sm font-medium rounded-lg shadow hover:bg-indigo-50"
            >
              ✉️ Inviter
            </Link>
          )}

          {/* Bouton vers FinalVideoPage pour tous */}
          <Link
            to={`/events/${event.id}/final`}
            className="w-full sm:w-auto inline-flex justify-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg shadow hover:bg-purple-700"
          >
            📺 Voir les vidéos
          </Link>

          {isOwner && (
            <button
              onClick={handleGenerateFinalVideo}
              disabled={generating}
              className="w-full sm:w-auto inline-flex justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg shadow hover:bg-green-700 disabled:opacity-50"
            >
              {generating ? "⏳ Génération..." : "🎬 Générer la vidéo finale"}
            </button>
          )}
        </div>

        {/* Vidéo finale */}
        {event.final_video_path && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Vidéo finale
            </h2>
            <video
              controls
              className="w-full rounded-lg border"
              src={event.final_video_path}
            />
          </div>
        )}

        {/* Redirection activité */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600">
            👉 Consultez l’<Link to="/dashboard" className="text-indigo-600 font-medium">activité récente</Link> pour voir les actions des participants.
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default EventDetailsPage;
