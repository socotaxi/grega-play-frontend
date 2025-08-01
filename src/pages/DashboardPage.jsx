import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import ActivityFeed from '../components/feed/ActivityFeed';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import { useAuth } from '../context/AuthContext';
import eventService from '../services/eventService';
import { toast } from 'react-toastify';

// Memoized event row component for better performance with many events
const EventRow = memo(({ event, formatDate, getStatusInfo, onDelete, deletingEventId }) => {
  const statusInfo = getStatusInfo(event.status);
  
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {event.title}
            </div>
            <div className="text-sm text-gray-500">
              {event.theme || "Aucun thème spécifié"}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {formatDate(event.deadline)}
        </div>
        <div className="text-sm text-gray-500">
          Date limite
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {event.video_count || 0} vidéos
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <Link to={`/event/${event.id}/final`} className="text-indigo-600 hover:text-indigo-900 mr-4">
          Voir
        </Link>
        {event.status === 'open' && (
          <>
            <Link to={`/submit/${event.id}`} className="text-indigo-600 hover:text-indigo-900 mr-4">
              Soumettre une vidéo
            </Link>
            <Link
              to={`/events/${event.id}/participants`}
              className="text-green-600 hover:text-green-900 mr-4"
            >
              Inviter des participants
            </Link>
          </>
        )}
        <button
          onClick={() => onDelete(event.id)}
          disabled={deletingEventId === event.id}
          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Supprimer l'événement"
        >
          {deletingEventId === event.id ? (
            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin inline-block"></div>
          ) : (
            <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </td>
    </tr>
  );
});

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
    // Confirmation dialog
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.')) {
      return;
    }

    setDeletingEventId(eventId);
    
    try {
      console.log(`🗑️ Attempting to delete event ${eventId}`);
      await eventService.deleteEvent(eventId, user.id);
      
      // Remove the event from the local state
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

  // Get event status color and label - memoized to prevent recreation on each render
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

  // Format date for display - memoized
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  }, []);
  
  // Memoize sorted events to prevent unnecessary recalculation
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      // Sort by creation date, newest first
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
      <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">
              Tableau de bord
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Bienvenue,
              {' '}
              {profile?.full_name && profile.full_name !== 'User'
                ? profile.full_name
                : user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Link to="/create-event">
              <Button variant="primary">
                <svg className="mr-2 -ml-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Créer un événement
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        {events.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-12 sm:px-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun événement</h3>
              <p className="mt-1 text-sm text-gray-500">
                Commencez par créer un nouvel événement.
              </p>
              <div className="mt-6">
                <Link to="/create-event">
                  <Button>
                    <svg className="mr-2 -ml-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nouveau événement
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Événement
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vidéos
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedEvents.map((event) => (
                        <EventRow 
                          key={event.id} 
                          event={event} 
                          formatDate={formatDate} 
                          getStatusInfo={getStatusInfo}
                          onDelete={handleDeleteEvent}
                          deletingEventId={deletingEventId}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default DashboardPage;