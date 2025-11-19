import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import MainLayout from '../components/layout/MainLayout';
import Loading from '../components/ui/Loading';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import eventService from '../services/eventService';
import invitationService from '../services/invitationService';

const ManageParticipantsPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [invitations, setInvitations] = useState([]);

  // ✅ Détection expiration (deadline dépassée)
  const isEventExpired = useCallback((evt) => {
    if (!evt?.deadline) return false;

    const now = new Date();
    const deadline = new Date(evt.deadline);

    // On considère l'évènement expiré après la fin de la journée de la deadline
    deadline.setHours(23, 59, 59, 999);

    return deadline < now;
  }, []);

  // ✅ Invitations fermées si terminé, annulé ou expiré
  const isInvitationClosed = event
    ? event.status === 'done' ||
      event.status === 'canceled' ||
      isEventExpired(event)
    : false;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const eventData = await eventService.getEvent(eventId);
        setEvent(eventData);

        // Invitations + participants liés
        const invList = await invitationService.getInvitations(eventId);
        setInvitations(invList);
        setParticipants(invList.filter((inv) => inv.user_id));
      } catch (err) {
        console.error('Erreur chargement participants :', err);
        setError("Erreur lors du chargement des données");
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

  const handleInvite = async (e) => {
    e.preventDefault();

    // ✅ Blocage logique : invitations fermées
    if (isInvitationClosed) {
      toast.error("Les invitations sont closes pour cet événement (terminé ou expiré).");
      return;
    }

    const emailList = emails
      .split(/[,\n]+/)
      .map((email) => email.trim())
      .filter(Boolean);

    if (emailList.length === 0) {
      toast.info('Veuillez entrer au moins un email');
      return;
    }

    try {
      setSending(true);
      await invitationService.addInvitations(eventId, emailList, message, event, user);
      const updated = await invitationService.getInvitations(eventId);
      setInvitations(updated);
      setParticipants(updated.filter((inv) => inv.user_id));
      setEmails('');
      setMessage('');
      toast.success('Invitations envoyées avec succès');
    } catch (err) {
      console.error('Error sending invitations:', err);
      toast.error(err.message || "Erreur lors de l'envoi des invitations");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-80px)] bg-gray-50">
          <div className="py-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
            <Loading />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !event) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-80px)] bg-gray-50">
          <div className="py-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error || "Événement introuvable."}
            </div>
            <div className="mt-4 text-sm">
              <Link
                to="/dashboard"
                className="inline-flex items-center text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
              >
                ← Retour au tableau de bord
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const deadlineText = event.deadline ? formatDate(event.deadline) : null;

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* En-tête */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {event.title}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Gestion des participants et des invitations.
              </p>
              {deadlineText && (
                <p className="mt-1 text-xs text-gray-500">
                  Date limite pour envoyer les vidéos : <span className="font-medium">{deadlineText}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col items-stretch md:items-end gap-2">
              <div className="inline-flex items-center gap-2">
                <span
                  className={`inline-flex px-3 py-1 text-[11px] font-medium rounded-full ${
                    isInvitationClosed
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {isInvitationClosed ? 'Invitations closes' : 'Invitations ouvertes'}
                </span>
              </div>
              <Link to={`/events/${eventId}`} className="w-full md:w-auto">
                <Button
                  variant="secondary"
                  className="w-full md:w-auto text-xs md:text-sm py-2"
                >
                  ← Retour à l&apos;événement
                </Button>
              </Link>
            </div>
          </div>

          {/* Carte Participants actuels */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Participants actuels
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Liste des personnes invitées et ayant créé un compte.
                </p>
              </div>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1">
                {participants.length} participant
                {participants.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="px-5 py-4">
              {participants.length === 0 ? (
                <div className="py-4 text-sm text-gray-500">
                  Aucun participant connecté pour le moment.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {participants.map((p) => (
                    <li
                      key={p.id || p.email}
                      className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900">
                          {p.email}
                        </span>
                        <span className="text-xs text-gray-500">
                          Statut : {p.status || 'invité'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {p.has_submitted ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-100 text-purple-800">
                            Vidéo soumise
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                            En attente de vidéo
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Carte invitations (nouveaux participants) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <form onSubmit={handleInvite}>
              <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">
                  Inviter de nouveaux participants
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Envoie des invitations par email pour que tes proches puissent
                  envoyer leur vidéo directement.
                </p>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Message d'info si invitations closes */}
                {isInvitationClosed && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-xl text-xs">
                    Les invitations sont closes pour cet événement
                    {event?.status === 'done' && ' (événement terminé).'}
                    {event?.status === 'canceled' && ' (événement annulé).'}
                    {isEventExpired(event) &&
                      event?.status !== 'done' &&
                      event?.status !== 'canceled' &&
                      ' (date limite dépassée).'}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Emails des invités
                  </label>
                  <textarea
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                    rows={3}
                    disabled={isInvitationClosed}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                    placeholder="Ex : ami1@gmail.com, ami2@gmail.com ou un email par ligne"
                  ></textarea>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Sépare les emails par des virgules ou des retours à la ligne.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Message personnel (optionnel)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    disabled={isInvitationClosed}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                    placeholder="Ex : Merci d'envoyer une courte vidéo pour souhaiter un joyeux anniversaire à..."
                  ></textarea>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    loading={sending}
                    disabled={sending || isInvitationClosed}
                    className="px-4 py-2.5 text-sm font-semibold"
                  >
                    {isInvitationClosed
                      ? 'Invitations closes'
                      : "Envoyer les invitations"}
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {/* Lien retour Dashboard */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600">
              Tu peux toujours revenir au{' '}
              <Link
                to="/dashboard"
                className="text-indigo-600 font-medium underline-offset-2 hover:underline"
              >
                tableau de bord
              </Link>{' '}
              pour gérer tous tes événements.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ManageParticipantsPage;
