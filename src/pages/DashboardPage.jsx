import InstallAppButton from '../components/InstallAppButton';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ActivityFeed from '../components/feed/ActivityFeed';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import { useAuth } from '../context/AuthContext';
import eventService from '../services/eventService';
import { toast } from 'react-toastify';

const DashboardPage = () => {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [eventStats, setEventStats] = useState({}); // { eventId: { totalInvitations, totalWithVideo, totalPending } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingEventId, setDeletingEventId] = useState(null);

  const fetchEvents = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const dashboardEvents = await eventService.getDashboardEvents(
        user.id,
        user.email,
      );
      setEvents(dashboardEvents);
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(
        err?.message ||
          "Impossible de charger vos événements. Veuillez réessayer.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      fetchEvents();
    }
  }, [user, fetchEvents]);

  const handleDeleteEvent = async (eventId) => {
    if (
      !window.confirm(
        'Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.',
      )
    ) {
      return;
    }

    setDeletingEventId(eventId);

    try {
      console.log(`Attempting to delete event ${eventId}`);
      await eventService.deleteEvent(eventId, user.id);

      setEvents((prevEvents) =>
        prevEvents.filter((event) => event.id !== eventId),
      );
      toast.success('Événement supprimé avec succès');
    } catch (error) {
      console.error('Error deleting event:', error);
      const errorMessage = error.message || 'Erreur lors de la suppression';
      toast.error(errorMessage);
    } finally {
      setDeletingEventId(null);
    }
  };

  const statusMap = useMemo(
    () => ({
      open: { color: 'bg-yellow-100 text-yellow-800', label: 'Ouvert' },
      ready: {
        color: 'bg-blue-100 text-blue-800',
        label: 'Prêt pour montage',
      },
      processing: {
        color: 'bg-purple-100 text-purple-800',
        label: 'En traitement',
      },
      done: { color: 'bg-green-100 text-green-800', label: 'Terminé' },
      canceled: { color: 'bg-red-100 text-red-800', label: 'Annulé' },
    }),
    [],
  );

  const getStatusInfo = useCallback(
    (status) => {
      return (
        statusMap[status] || {
          color: 'bg-gray-100 text-gray-800',
          label: 'Inconnu',
        }
      );
    },
    [statusMap],
  );

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  }, []);

  const isEventExpired = useCallback((event) => {
    if (!event?.deadline) return false;

    const now = new Date();
    const deadline = new Date(event.deadline);

    deadline.setHours(23, 59, 59, 999);

    if (event.status === 'done' || event.status === 'canceled') {
      return false;
    }

    return deadline < now;
  }, []);

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
  }, [events]);

  // ✅ Charger les stats (invitations / vidéos / en attente) pour chaque event
  useEffect(() => {
    const loadStats = async () => {
      if (!sortedEvents.length) {
        setEventStats({});
        return;
      }

      try {
        const entries = await Promise.all(
          sortedEvents.map(async (evt) => {
            try {
              const stats = await eventService.getEventStats(evt.id);
              return [evt.id, stats];
            } catch (err) {
              console.error('Erreur stats event', evt.id, err);
              return [evt.id, null];
            }
          }),
        );

        setEventStats(Object.fromEntries(entries));
      } catch (err) {
        console.error('Erreur chargement stats events:', err);
      }
    };

    loadStats();
  }, [sortedEvents]);

  // ✅ Couleur dynamique de la barre en fonction du pourcentage
  const getProgressColor = (pct) => {
    if (pct < 30) return 'bg-red-500';
    if (pct < 70) return 'bg-orange-400';
    return 'bg-emerald-500';
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-80px)] bg-gray-50">
          <div className="py-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <Loading />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          {/* En-tête */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Tableau de bord
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Bienvenue,{' '}
                {profile?.full_name ||
                  user?.user_metadata?.full_name ||
                  user?.email}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Gère tes projets vidéo, invite des participants et suis
                l&apos;avancement de tes montages Grega Play.
              </p>
            </div>

            <div className="flex flex-col items-stretch md:items-end gap-3">
              <InstallAppButton />
              <Link to="/create-event" className="w-full md:w-auto">
                <Button className="w-full md:w-auto py-2.5 text-sm font-semibold inline-flex items-center justify-center">
                  <svg
                    className="mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Créer un nouvel événement
                </Button>
              </Link>
            </div>
          </div>

          {/* Bloc erreur éventuel */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Contenu principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne principale : événements */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Mes événements
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Retrouve tous tes projets vidéo créés ou reçus.
                    </p>
                  </div>
                  {sortedEvents.length > 0 && (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1">
                      {sortedEvents.length} événement
                      {sortedEvents.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="px-5 py-4">
                  {events.length === 0 ? (
                    <div className="py-8 flex flex-col items-center text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-300"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                      <h3 className="mt-3 text-sm font-semibold text-gray-800">
                        Aucun événement pour l&apos;instant
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 max-w-xs">
                        Crée ton premier événement pour collecter des vidéos et
                        générer une belle surprise pour tes proches.
                      </p>
                      <Link to="/create-event" className="mt-4">
                        <Button className="text-sm px-4 py-2">
                          + Créer un événement
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sortedEvents.map((event) => {
                        const status = getStatusInfo(event.status);
                        const hasFinalVideo = !!event.final_video_url;

                        const publicUrl = event.public_code
                          ? `${window.location.origin}/e/${event.public_code}`
                          : '';

                        const stats = eventStats[event.id];
                        const pendingCount =
                          typeof stats?.totalPending === 'number'
                            ? stats.totalPending
                            : null;

                        const totalInvitations =
                          typeof stats?.totalInvitations === 'number'
                            ? stats.totalInvitations
                            : 0;
                        const totalWithVideo =
                          typeof stats?.totalWithVideo === 'number'
                            ? stats.totalWithVideo
                            : 0;
                        const progressPct =
                          totalInvitations > 0
                            ? Math.round(
                                (totalWithVideo / totalInvitations) * 100,
                              )
                            : 0;

                        const barColorClass = getProgressColor(progressPct);

                        return (
                          <div
                            key={event.id}
                            className="rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 shadow-sm px-4 py-4 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              {/* Infos principales */}
                              <div className="flex-1">
                                <div className="flex items-start gap-3">
                                  {/* Miniature */}
                                  {event.media_url && (
                                    <Link
                                      to={`/events/${event.id}`}
                                      className="flex-shrink-0"
                                    >
                                      <img
                                        src={event.media_url}
                                        alt="Miniature de l'événement"
                                        className="w-20 h-16 object-cover rounded-md border border-gray-200 cursor-pointer hover:opacity-90 transition"
                                      />
                                    </Link>
                                  )}

                                  <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-gray-900">
                                      {event.title}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                      Créé le {formatDate(event.created_at)}
                                    </p>

                                    {/* Statuts */}
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <span
                                        className={`inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full ${status.color}`}
                                      >
                                        {status.label}
                                      </span>

                                      {isEventExpired(event) && (
                                        <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-red-100 text-red-800">
                                          Expiré
                                        </span>
                                      )}

                                      {hasFinalVideo && (
                                        <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-purple-100 text-purple-800">
                                          Vidéo finale prête
                                        </span>
                                      )}

                                      {/* Badge "en attente de vidéo" */}
                                      {pendingCount !== null && (
                                        <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-orange-50 text-orange-700">
                                          {pendingCount} en attente de vidéo
                                        </span>
                                      )}
                                    </div>

                                    {/* ✅ Barre de progression vidéos reçues */}
                                    {totalInvitations > 0 && (
                                      <div className="mt-3">
                                        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                                          <span>Vidéos reçues</span>
                                          <span className="font-medium text-gray-700">
                                            {totalWithVideo} / {totalInvitations}{' '}
                                            ({progressPct}%)
                                          </span>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                                          <div
                                            className={`h-2 rounded-full ${barColorClass} transition-all`}
                                            style={{
                                              width: `${progressPct}%`,
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {/* Lien de partage */}
                                    {event.public_code && (
                                      <div className="mt-3">
                                        <label className="block text-[11px] font-medium text-gray-500 mb-1">
                                          Lien de partage
                                        </label>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                          <div className="flex-1 flex items-center gap-2">
                                            <input
                                              type="text"
                                              readOnly
                                              value={publicUrl}
                                              className="flex-1 text-[11px] border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard
                                                  .writeText(publicUrl)
                                                  .then(() => {
                                                    toast.success(
                                                      'Lien copié dans le presse-papiers',
                                                    );
                                                  })
                                                  .catch(() => {
                                                    toast.error(
                                                      'Impossible de copier le lien',
                                                    );
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
                                                message,
                                              )}`;
                                              window.open(whatsappUrl, '_blank');
                                            }}
                                            className="inline-flex items-center justify-center px-3 py-1.5 text-[11px] font-medium rounded-md bg-green-500 hover:bg-green-600 text-white"
                                          >
                                            Partager sur WhatsApp
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex sm:flex-col gap-2 sm:items-end">
                                {event.user_id === user.id && (
                                  <Link
                                    to={`/events/${event.id}/manage-participants`}
                                    className="inline-flex items-center px-3 py-1.5 border border-emerald-600 text-emerald-600 hover:bg-emerald-50 text-xs font-medium rounded-lg"
                                  >
                                    Inviter
                                  </Link>
                                )}

                                <Link
                                  to={`/events/${event.id}`}
                                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium rounded-lg"
                                >
                                  Voir
                                </Link>

                                <button
                                  onClick={() => handleDeleteEvent(event.id)}
                                  disabled={deletingEventId === event.id}
                                  className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium rounded-lg disabled:opacity-60"
                                >
                                  {deletingEventId === event.id
                                    ? 'Suppression...'
                                    : '🗑️ Supprimer'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Colonne latérale : activité récente */}
            <div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full">
                <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Activité récente
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Les dernières actions sur tes événements.
                  </p>
                </div>
                <div className="px-3 py-3">
                  {sortedEvents.length > 0 ? (
                    <ActivityFeed eventId={sortedEvents[0].id} />
                  ) : (
                    <p className="text-xs text-gray-500 px-2 py-4">
                      Crée un événement pour voir ici l&apos;activité de ton
                      projet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
