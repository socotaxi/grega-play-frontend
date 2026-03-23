import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import MainLayout from '../components/layout/MainLayout';
import Loading from '../components/ui/Loading';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import eventService from '../services/eventService';
import supabase from '../lib/supabaseClient';

const ManageParticipantsPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [videoCount, setVideoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isEventExpired = useCallback((evt) => {
    if (!evt?.deadline) return false;
    const deadline = new Date(evt.deadline);
    deadline.setHours(23, 59, 59, 999);
    return deadline < new Date();
  }, []);

  const isInvitationClosed = event
    ? event.status === 'done' || event.status === 'canceled' || isEventExpired(event)
    : false;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const eventData = await eventService.getEvent(eventId);
        setEvent(eventData);
        const { count } = await supabase
          .from('videos')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', eventId);
        setVideoCount(count || 0);
      } catch (err) {
        console.error('Erreur chargement participants :', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  useEffect(() => {
    if (!loading && event && user && user.id !== event.user_id) {
      toast.error("Vous n'êtes pas autorisé à gérer cet événement");
      navigate('/dashboard');
    }
  }, [loading, event, user, navigate]);

  const handleNativeShare = async () => {
    if (!event) return;
    const base = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
    const url = `${base}/e/${event.public_code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, url });
      } catch (e) {
        if (e.name !== 'AbortError') toast.error("Impossible d'ouvrir le partage");
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié !');
    }
  };

  if (loading) return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gray-50">
        <Loading />
      </div>
    </MainLayout>
  );

  if (error || !event) return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50 py-10 px-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error || 'Événement introuvable.'}
          </div>
          <Link to="/dashboard" className="text-sm text-indigo-600 hover:underline">← Tableau de bord</Link>
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link to={`/events/${eventId}`} className="text-xs text-gray-400 hover:text-gray-600">
                ← {event.title}
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">Participants</h1>
            </div>
            <span className={`mt-2 shrink-0 inline-flex px-3 py-1 text-[11px] font-medium rounded-full ${
              isInvitationClosed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {isInvitationClosed ? 'Invitations closes' : 'Ouvert'}
            </span>
          </div>

          {/* Carte Inviter */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Inviter des participants</h2>

            {isInvitationClosed && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg">
                Les invitations sont closes pour cet événement.
              </p>
            )}

            {/* Partage natif */}
            <Button
              type="button"
              onClick={handleNativeShare}
              disabled={isInvitationClosed}
              className="w-full py-3 text-sm font-semibold"
            >
              📤 Partager le lien (WhatsApp, SMS…)
            </Button>
          </div>

          {/* Compteur vidéos */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Vidéos soumises</p>
              <p className="text-xs text-gray-400 mt-0.5">Participants ayant envoyé leur clip</p>
            </div>
            <span className="text-2xl font-bold text-indigo-600">{videoCount}</span>
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

export default ManageParticipantsPage;
