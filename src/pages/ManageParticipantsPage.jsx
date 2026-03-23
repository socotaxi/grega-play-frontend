import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import MainLayout from '../components/layout/MainLayout';
import Loading from '../components/ui/Loading';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import eventService from '../services/eventService';
import invitationService from '../services/invitationService';
import emailService from '../services/emailService';
import supabase from '../lib/supabaseClient';

const ManageParticipantsPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [event, setEvent] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [invitationStatusByEmail, setInvitationStatusByEmail] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [simpleEmails, setSimpleEmails] = useState('');
  const [simpleSending, setSimpleSending] = useState(false);
  const [reminding, setReminding] = useState(false);

  const isEventExpired = useCallback((evt) => {
    if (!evt?.deadline) return false;
    const deadline = new Date(evt.deadline);
    deadline.setHours(23, 59, 59, 999);
    return deadline < new Date();
  }, []);

  const isInvitationClosed = event
    ? event.status === 'done' || event.status === 'canceled' || isEventExpired(event)
    : false;

  const computeStatusByEmail = async (invList) => {
    const acceptedUserIds = invList.map((inv) => inv.accepted_user_id).filter(Boolean);
    let videosByUserId = new Set();

    if (acceptedUserIds.length > 0) {
      const { data: videos } = await supabase
        .from('videos')
        .select('user_id')
        .eq('event_id', eventId)
        .in('user_id', acceptedUserIds);
      if (videos) videosByUserId = new Set(videos.map((v) => v.user_id));
    }

    const byEmail = {};
    for (const inv of invList) {
      const email = typeof inv.email === 'string' ? inv.email.trim() : '';
      if (!email) continue;
      byEmail[email] = {
        hasAccount: !!inv.accepted_user_id,
        hasSubmitted: !!(inv.accepted_user_id && videosByUserId.has(inv.accepted_user_id)),
      };
    }
    return byEmail;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const eventData = await eventService.getEvent(eventId);
        setEvent(eventData);
        const invList = (await invitationService.getInvitations(eventId)) || [];
        setInvitations(invList);
        setInvitationStatusByEmail(await computeStatusByEmail(invList));
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

  const handleSimpleInvite = async (e) => {
    e.preventDefault();
    if (isInvitationClosed) return;
    const emailList = simpleEmails.split(/[,\n]+/).map((em) => em.trim()).filter(Boolean);
    if (!emailList.length) { toast.info('Entrez au moins un email'); return; }
    try {
      setSimpleSending(true);
      const results = await emailService.sendSimpleInvitations(emailList, event, profile || user);
      results.failed.length === 0
        ? toast.success(`Email(s) envoyé(s) à ${results.success.length} personne(s)`)
        : toast.warning(`${results.success.length} envoyé(s), ${results.failed.length} échoué(s)`);
      setSimpleEmails('');
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSimpleSending(false);
    }
  };

  const handleRemindPending = async () => {
    if (!event || isEventExpired(event)) return;
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const apiKey = import.meta.env.VITE_BACKEND_API_KEY;
    if (!backendUrl || !apiKey) { toast.error('Configuration backend manquante.'); return; }
    try {
      setReminding(true);
      toast.info('Envoi des relances…');
      const res = await fetch(`${backendUrl}/api/events/${eventId}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Erreur relance'); return; }
      const count = data.remindersSent ?? 0;
      count === 0
        ? toast.info('Tous les participants ont déjà envoyé une vidéo.')
        : toast.success(`Relance envoyée à ${count} participant(s).`);
    } catch {
      toast.error('Erreur lors de la relance');
    } finally {
      setReminding(false);
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

            <div className="flex items-center gap-3 text-xs text-gray-400">
              <hr className="flex-1 border-gray-200" /> ou par email <hr className="flex-1 border-gray-200" />
            </div>

            {/* Email simple */}
            <form onSubmit={handleSimpleInvite} className="space-y-3">
              <textarea
                value={simpleEmails}
                onChange={(e) => setSimpleEmails(e.target.value)}
                rows={2}
                disabled={isInvitationClosed}
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="ami1@gmail.com, ami2@gmail.com…"
              />
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-gray-400">Sépare par virgule ou retour à la ligne.</p>
                <Button
                  type="submit"
                  loading={simpleSending}
                  disabled={simpleSending || isInvitationClosed}
                  className="text-sm px-4 py-2"
                >
                  Envoyer
                </Button>
              </div>
            </form>
          </div>

          {/* Carte Participants */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Invités
                <span className="ml-2 text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                  {invitations.length}
                </span>
              </h2>
              {invitations.length > 0 && (
                <button
                  onClick={handleRemindPending}
                  disabled={reminding || isEventExpired(event)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 font-medium"
                >
                  {reminding ? 'Envoi…' : '🔔 Relancer'}
                </button>
              )}
            </div>

            <div className="px-5 py-4">
              {invitations.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">Aucun invité pour le moment.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {invitations.map((inv) => {
                    const email = typeof inv.email === 'string' ? inv.email.trim() : '';
                    const status = invitationStatusByEmail[email] || {};
                    return (
                      <li key={inv.id || email} className="py-3 flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-800 truncate">{email}</span>
                        {status.hasSubmitted ? (
                          <span className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                            Vidéo envoyée
                          </span>
                        ) : status.hasAccount ? (
                          <span className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
                            Inscrit
                          </span>
                        ) : (
                          <span className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                            En attente
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

export default ManageParticipantsPage;
