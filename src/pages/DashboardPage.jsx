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
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.')) {
      return;
    }

    setDeletingEventId(eventId);
    
    try {
      console.log(`Attempting to delete event ${eventId}`);
      await eventService.deleteEvent(eventId, user.id);
      
      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      toast.success('Événement supprimé avec succès');
      
    } catch (error) {
      console.error('Error deleting event:', error);
      const errorMessage = error.message || 'Erreur lors de la suppression';
      toast.error(errorMessage);
    } finally {
      setDeletingEventId(null);
    }
  };

  const statusMap = useMemo(() => ({
    open: { color: 'bg-yellow-100 text-yellow-800', label: 'Ouvert' },
    ready: { color: 'bg-blue-100 text-blue-800', label: 'Prêt pour montage' },
    processing: { color: 'bg-purple-100 text-purple-800', label: 'En traitement' },
    done: { color: 'bg-green-100 text-green-800', label: 'Terminé' },
    canceled: { color: 'bg-red-100 text-red-800', label: 'Annulé' },
  }), []);
  
  const getStatusInfo = useCallback((status) => {
    return statusMap[status] || { color: 'bg-gray-100 text-gray-800', label: 'Inconnu' };
  }, [statusMap]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  }, []);

  // ✅ AJOUT : fonction pour détecter une deadline dépassée
  const isEventExpired = useCallback((event) => {
    if (!event?.deadline) return false;

    const now = new Date();
    const deadline = new Date(event.deadline);

    // On considère l'évènement expiré après la fin de la journée de la deadline
    deadline.setHours(23, 59, 59, 999);

    // Un évènement terminé/annulé ne doit pas être marqué "expiré"
    if (event.status === 'done' || event.status === 'canceled') {
      return false;
    }

    return deadline < now;
  }, []);
  
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [events]);

  if (loading) {
    return (
      <MainLayout>
        <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Loading />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Bienvenue, {profile?.full_name || user?.user_metadata?.full_name || user?.email}
          </p>
          <div className="mt-2">
            <InstallAppButton />
          </div>
        </div>

        <div className="mb-4 flex justify-between">
          <Link to="/create-event">
            <Button variant="primary" className="w-full sm:w-auto">
              <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Créer un événement
            </Button>
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        {events.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun événement</h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer un nouvel événement.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedEvents.map((event) => {
              const status = getStatusInfo(event.status);
              return (
                <div
                  key={event.id}
                  className="bg-white shadow rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                    <p className="text-sm text-gray-500">{formatDate(event.created_at)}</p>

                    <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded ${status.color}`}>
                      {status.label}
                    </span>

                    {/* ✅ AJOUT : Badge "Expiré" */}
                    {isEventExpired(event) && (
                      <span className="inline-block ml-2 mt-2 px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                        Expiré
                      </span>
                    )}

                    {/* ───────────────────────────────────────────── */}
                    {/*                Lien public + WhatsApp         */}
                    {/* ───────────────────────────────────────────── */}

                    {event.public_code && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Lien de partage
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={`${window.location.origin}/e/${event.public_code}`}
                              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50 text-gray-700"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const shareUrl = `${window.location.origin}/e/${event.public_code}`;
                                navigator.clipboard
                                  .writeText(shareUrl)
                                  .then(() => {
                                    toast.success('Lien copié dans le presse-papiers');
                                  })
                                  .catch(() => {
                                    toast.error('Impossible de copier le lien');
                                  });
                              }}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md bg-white hover:bg-gray-50 text-gray-700"
                            >
                              Copier
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const shareUrl = `${window.location.origin}/e/${event.public_code}`;
                              const message = `Participe à mon événement Grega Play : ${shareUrl}`;
                              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                              window.open(whatsappUrl, "_blank");
                            }}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md bg-green-500 hover:bg-green-600 text-white"
                          >
                            Partager sur WhatsApp
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 sm:mt-0 flex space-x-2">
                    {event.user_id === user.id && (
                      <Link
                        to={`/events/${event.id}/manage-participants`}
                        className="inline-flex items-center px-3 py-2 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 text-sm font-medium rounded-lg"
                      >
                        Inviter
                      </Link>
                    )}
                    <Link
                      to={`/events/${event.id}/final`}
                      className="inline-flex items-center px-3 py-2 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 text-sm font-medium rounded-lg"
                    >
                      Voir
                    </Link>

                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      disabled={deletingEventId === event.id}
                      className="inline-flex items-center px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium rounded-lg"
                    >
                      {deletingEventId === event.id ? 'Suppression...' : '🗑️ Supprimer'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {sortedEvents.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Activité récente</h2>
            <ActivityFeed eventId={sortedEvents[0].id} />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
