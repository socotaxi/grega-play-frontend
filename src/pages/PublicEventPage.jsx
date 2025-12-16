// src/pages/PublicEventPage.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import Loading from "../components/ui/Loading";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import supabase from "../lib/supabaseClient";
import { setReturnTo } from "../utils/returnTo";

const VISITED_KEY = "gp_visited_events_v1";

const safeParseJson = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const upsertVisitedEvent = (visitedItem) => {
  try {
    const arr = safeParseJson(localStorage.getItem(VISITED_KEY), []);
    const list = Array.isArray(arr) ? arr : [];

    const key = visitedItem.event_id
      ? `id:${visitedItem.event_id}`
      : `code:${visitedItem.public_code}`;

    const next = [
      visitedItem,
      ...list.filter((x) => {
        const k = x?.event_id ? `id:${x.event_id}` : `code:${x?.public_code}`;
        return k !== key;
      }),
    ].slice(0, 20);

    localStorage.setItem(VISITED_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
};

const PublicEventPage = () => {
  const { publicCode } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔒 nouvel état : savoir si l'utilisateur connecté est invité ou non
  const [isInvited, setIsInvited] = useState(null);

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

  const isPublicEvent = event?.is_public === true;
  const isPremiumEvent = event?.is_premium_event === true;

  const currentReturnUrl = useMemo(() => {
    return (
      window.location.pathname + window.location.search + window.location.hash
    );
  }, []);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.rpc("get_event_by_public_code", {
          p_code: publicCode,
        });

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

  // ✅ NEW : enregistrer "événement visité" (sans rejoindre) dès que l'event est chargé
  useEffect(() => {
    if (!event) return;

    upsertVisitedEvent({
      event_id: event.id || null,
      public_code: publicCode || null,
      title: event.title || "Événement",
      theme: event.theme || "",
      cover_url: event.media_url || null,
      visited_at: new Date().toISOString(),
    });
  }, [event, publicCode]);

  // ✅ NEW : stocker returnTo pour garantir le retour après login/register
  useEffect(() => {
    if (!publicCode) return;
    // on mémorise toujours la page publique comme point de retour
    setReturnTo(currentReturnUrl);
  }, [publicCode, currentReturnUrl]);

  // 🔒 Vérifier côté PublicEventPage si l'utilisateur connecté est bien invité
  useEffect(() => {
    const checkInvitation = async () => {
      if (!user || !event?.id) {
        setIsInvited(null);
        return;
      }

      // Si l'événement est public, tout utilisateur connecté est considéré comme "autorisé"
      if (event.is_public === true) {
        setIsInvited(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("invitations")
          .select("id")
          .eq("event_id", event.id)
          .eq("email", user.email);

        if (error) {
          console.error(
            "Erreur vérification invitation (PublicEventPage):",
            error
          );
          setIsInvited(null);
          return;
        }

        setIsInvited(data && data.length > 0);
      } catch (err) {
        console.error(
          "Erreur inattendue vérification invitation (PublicEventPage):",
          err
        );
        setIsInvited(null);
      }
    };

    if (user && event?.id) {
      checkInvitation();
    } else {
      setIsInvited(null);
    }
  }, [user, event]);

  const goLogin = useCallback(() => {
    // returnTo déjà posé, mais on le met aussi en query param (robuste)
    navigate(`/login?returnTo=${encodeURIComponent(currentReturnUrl)}`);
  }, [navigate, currentReturnUrl]);

  const goRegister = useCallback(() => {
    navigate(`/register?returnTo=${encodeURIComponent(currentReturnUrl)}`);
  }, [navigate, currentReturnUrl]);

  const handleParticipate = () => {
    if (isParticipationClosed) return;

    // Si pas connecté → login + returnTo
    if (!user) {
      goLogin();
      return;
    }

    // Si l'événement n'est pas public et que l'utilisateur n'est pas invité explicitement
    if (!isPublicEvent && isInvited === false) {
      return;
    }

    if (event?.id) {
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

  const renderMedia = (url) => {
    if (!url) return null;

    const lower = url.toLowerCase();

    if (lower.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
      return (
        <video src={url} controls className="w-full rounded-lg border mt-4" />
      );
    }

    if (lower.match(/\.(mp3|wav|ogg)$/i)) {
      return <audio src={url} controls className="w-full mt-4" />;
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

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>

            <div className="flex flex-wrap items-center gap-2">
              {event.theme && (
                <p className="text-xs inline-flex px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                  Thème : {event.theme}
                </p>
              )}

              {isPremiumEvent && (
                <span className="text-xs inline-flex px-2 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-100">
                  Événement Premium (offert)
                </span>
              )}

              {isPublicEvent ? (
                <span className="text-[11px] inline-flex px-2 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                  Accès avec le lien
                </span>
              ) : (
                <span className="text-[11px] inline-flex px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                  Participation sur invitation
                </span>
              )}
            </div>
          </div>

          {event.description && (
            <p className="text-sm text-gray-600 mt-2">{event.description}</p>
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

          {event.media_url && renderMedia(event.media_url)}
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-3">
          {isPremiumEvent && (
            <div className="mb-2 rounded-md bg-purple-50 border border-purple-100 px-3 py-2">
              <p className="text-[11px] text-purple-800">
                Cet événement utilise Grega Play Premium pendant la phase de
                lancement. Pour toi, en tant qu’invité, cela ne change rien au
                niveau du paiement : tu peux participer gratuitement, comme pour
                un événement classique.
              </p>
            </div>
          )}

          {!user && !isParticipationClosed && (
            <>
              <p className="text-sm text-gray-700">
                Pour participer à cet événement (envoyer une vidéo), vous devez
                d’abord vous connecter à Grega Play.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button onClick={goLogin} className="w-full">
                  Se connecter pour participer
                </Button>
                <Button
                  onClick={goRegister}
                  className="w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                >
                  S’inscrire
                </Button>
              </div>
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

          {user &&
            !isParticipationClosed &&
            !isPublicEvent &&
            isInvited === false && (
              <>
                <p className="text-sm text-gray-700">
                  Vous êtes connecté en tant que{" "}
                  <span className="font-semibold">{user.email}</span>.
                </p>
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  Vous ne faites pas partie des invités de cet événement. Vous
                  pouvez consulter les informations ci-dessus, mais vous ne
                  pourrez pas envoyer de vidéo pour cet événement.
                </p>
              </>
            )}

          {user &&
            !isParticipationClosed &&
            (isPublicEvent || isInvited === true || isInvited === null) && (
              <>
                <p className="text-sm text-gray-700">
                  Vous êtes connecté en tant que{" "}
                  <span className="font-semibold">{user.email}</span>.
                </p>
                <p className="text-sm text-gray-600">
                  Cliquez sur le bouton ci-dessous pour accéder à la page de
                  l’événement dans l’application et envoyer votre vidéo.
                </p>
                <Button
                  onClick={handleParticipate}
                  className="w-full"
                  disabled={!isPublicEvent && isInvited === null}
                >
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
