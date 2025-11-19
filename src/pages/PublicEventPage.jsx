// src/pages/PublicEventPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import Loading from "../components/ui/Loading";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import supabase from "../lib/supabaseClient";

const PublicEventPage = () => {
  const { publicCode } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Détecter si l'événement est expiré (deadline dépassée)
  const isEventExpired = useCallback((evt) => {
    if (!evt?.deadline) return false;

    const now = new Date();
    const deadline = new Date(evt.deadline);

    // On considère l’événement expiré après la fin de la journée de la deadline
    deadline.setHours(23, 59, 59, 999);

    return deadline < now;
  }, []);

  // Un seul booléen global : participation fermée (terminé / annulé / expiré)
  const isParticipationClosed = event
    ? event.status === "done" ||
      event.status === "canceled" ||
      isEventExpired(event)
    : false;

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.rpc(
          "get_event_by_public_code",
          { p_code: publicCode }
        );

        if (error) {
          console.error("Erreur RPC:", error);
          setError("Impossible de charger l'événement.");
        } else if (!data || data.length === 0) {
          setError("Événement introuvable ou expiré.");
        } else {
          setEvent(data[0]);
        }
      } catch (err) {
        console.error("Erreur inattendue:", err);
        setError("Une erreur s'est produite.");
      } finally {
        setLoading(false);
      }
    };

    if (publicCode) {
      fetchEvent();
    } else {
      setLoading(false);
      setError("Lien d'accès invalide.");
    }
  }, [publicCode]);

  const handleParticipate = () => {
    // Si participation fermée, on ne fait rien
    if (isParticipationClosed) {
      return;
    }

    if (!user) {
      navigate("/login");
      return;
    }

    if (event?.id) {
      // Tu peux ensuite rediriger vers la page d’envoi de vidéo
      navigate(`/events/${event.id}`);
    } else {
      navigate("/dashboard");
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="py-8 max-w-3xl mx-auto px-4">
          <Loading />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="py-8 max-w-3xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
          <div className="mt-4">
            <Link
              to="/"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Retour à l’accueil
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const expired = isEventExpired(event);
  const isDone = event.status === "done";
  const isCanceled = event.status === "canceled";

  // Fonction utilitaire pour afficher le média
  const renderMedia = (url) => {
    if (!url) return null;

    const lower = url.toLowerCase();

    if (lower.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
      return (
        <video
          src={url}
          controls
          className="w-full rounded-lg border mt-4"
        />
      );
    }

    if (lower.match(/\.(mp3|wav|ogg)$/i)) {
      return (
        <audio
          src={url}
          controls
          className="w-full mt-4"
        />
      );
    }

    return (
      <img
        src={url}
        alt="Illustration de l'événement"
        className="w-full rounded-lg border mt-4 object-cover"
      />
    );
  };

  return (
    <MainLayout>
      <div className="py-6 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Message global sur l'état de l'évènement */}
        {(expired || isDone || isCanceled) && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
            {isDone && (
              <p className="text-sm">
                Cet événement est terminé. Les participations sont closes.
              </p>
            )}
            {isCanceled && (
              <p className="text-sm">
                Cet événement a été annulé par son organisateur.
              </p>
            )}
            {expired && !isDone && !isCanceled && (
              <p className="text-sm">
                La date limite de participation est dépassée. Vous ne pouvez plus
                envoyer de vidéo.
              </p>
            )}
          </div>
        )}

        {/* Infos événement */}
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          {event.description && (
            <p className="text-sm text-gray-600 mt-2">{event.description}</p>
          )}
          {event.theme && (
            <p className="mt-2 text-xs inline-flex px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
              Thème : {event.theme}
            </p>
          )}

          {event.deadline && (
            <p className="mt-3 text-sm text-gray-500">
              Date limite :{" "}
              {new Date(event.deadline).toLocaleDateString("fr-FR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}

          {/* ✅ Nouveau : affichage du média d'illustration si présent */}
          {event.media_url && renderMedia(event.media_url)}
        </div>

        {/* Bloc participation */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-3">
          {!user && !isParticipationClosed && (
            <>
              <p className="text-sm text-gray-700">
                Pour participer à cet événement (envoyer une vidéo), vous devez
                d’abord vous connecter à Grega Play.
              </p>
              <Button onClick={handleParticipate} className="w-full">
                Se connecter pour participer
              </Button>
            </>
          )}

          {!user && isParticipationClosed && (
            <>
              <p className="text-sm text-gray-700">
                Les participations à cet événement sont closes. Vous pouvez
                uniquement consulter les informations.
              </p>
            </>
          )}

          {user && !isParticipationClosed && (
            <>
              <p className="text-sm text-gray-700">
                Vous êtes connecté en tant que{" "}
                <span className="font-semibold">{user.email}</span>.
              </p>
              <p className="text-sm text-gray-600">
                Cliquez sur le bouton ci-dessous pour accéder à la page de
                l’événement dans l’application et envoyer votre vidéo.
              </p>
              <Button onClick={handleParticipate} className="w-full">
                Participer à la vidéo
              </Button>
            </>
          )}

          {user && isParticipationClosed && (
            <>
              <p className="text-sm text-gray-700">
                Vous êtes connecté en tant que{" "}
                <span className="font-semibold">{user.email}</span>.
              </p>
              <p className="text-sm text-gray-600">
                Les participations à cet événement sont désormais closes. Vous ne
                pouvez plus envoyer de nouvelle vidéo.
              </p>
            </>
          )}
        </div>

        {/* Lien vers le dashboard */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 text-center text-sm text-gray-600">
          <p>
            Retrouve tous tes projets dans ton{" "}
            <Link
              to="/dashboard"
              className="text-indigo-600 hover:text-indigo-500"
            >
              tableau de bord Grega Play
            </Link>
            .
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default PublicEventPage;
