import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import MainLayout from '../components/layout/MainLayout';
import Loading from '../components/ui/Loading';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import eventService from '../services/eventService';
import invitationService from '../services/invitationService';
import supabase from '../lib/supabaseClient';

const ManageParticipantsPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);   // invités ayant un compte + info has_submitted
  const [invitations, setInvitations] = useState([]);     // toutes les invitations (emails)
  const [invitationStatusByEmail, setInvitationStatusByEmail] = useState({}); // { email: { hasAccount, hasSubmitted } }
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [reminding, setReminding] = useState(false); // état relance

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

  // 🔎 Construit participants + statut par email à partir des invitations + profiles + videos
  const computeParticipantsAndStatus = async (invList) => {
    const result = {
      participantsList: [],
      byEmail: {},
    };

    if (!invList || invList.length === 0) {
      return result;
    }

    // Emails uniques (normalisés)
    const rawEmails = invList
      .map((inv) => (typeof inv.email === 'string' ? inv.email.trim() : ''))
      .filter((e) => e !== '');

    const uniqueEmails = Array.from(new Set(rawEmails));

    if (uniqueEmails.length === 0) {
      return result;
    }

    // 1) Récupérer les profils pour ces emails
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('email', uniqueEmails);

    if (profilesError) {
      console.error('Erreur chargement profils pour participants :', profilesError);
      return result;
    }

    const profilesByEmail = {};
    (profiles || []).forEach((p) => {
      if (typeof p.email === 'string') {
        profilesByEmail[p.email.trim()] = p;
      }
    });

    const profileIds = (profiles || []).map((p) => p.id);

    let videosByUserId = new Set();

    // 2) Récupérer les vidéos pour ces profils sur cet event
    if (profileIds.length > 0) {
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select('id, user_id')
        .eq('event_id', eventId)
        .in('user_id', profileIds);

      if (videosError) {
        console.error('Erreur chargement vidéos pour participants :', videosError);
      } else if (videos && videos.length > 0) {
        videosByUserId = new Set(videos.map((v) => v.user_id));
      }
    }

    const byEmail = {};
    const participantsList = [];

    // 3) Construire le statut par email + la liste des participants
    for (const inv of invList) {
      const email = typeof inv.email === 'string' ? inv.email.trim() : '';
      if (!email) continue;

      const profile = profilesByEmail[email] || null;
      const hasAccount = !!profile;
      const hasSubmitted = !!(profile && videosByUserId.has(profile.id));

      byEmail[email] = {
        hasAccount,
        hasSubmitted,
      };

      if (hasAccount) {
        participantsList.push({
          ...inv,
          profile_id: profile.id,
          has_submitted: hasSubmitted,
        });
      }
    }

    result.participantsList = participantsList;
    result.byEmail = byEmail;
    return result;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const eventData = await eventService.getEvent(eventId);
        setEvent(eventData);

        // Récupération des invitations en base
        const invList = await invitationService.getInvitations(eventId);
        const safeInvList = invList || [];
        setInvitations(safeInvList);

        // Participants + statut par email
        const { participantsList, byEmail } =
          await computeParticipantsAndStatus(safeInvList);

        setParticipants(participantsList);
        setInvitationStatusByEmail(byEmail);
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

      // Recharger les invitations après envoi
      const updated = await invitationService.getInvitations(eventId);
      const safeUpdated = updated || [];
      setInvitations(safeUpdated);

      const { participantsList, byEmail } =
        await computeParticipantsAndStatus(safeUpdated);

      setParticipants(participantsList);
      setInvitationStatusByEmail(byEmail);

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

  // ✅ Relancer les participants sans vidéo (appel backend)
  const handleRemindPending = async () => {
    if (!event) return;

    if (isEventExpired(event)) {
      toast.error("L'événement est déjà expiré, tu ne peux plus relancer les participants.");
      return;
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const apiKey = import.meta.env.VITE_BACKEND_API_KEY;

    if (!backendUrl || !apiKey) {
      toast.error("Configuration backend manquante (URL ou clé API).");
      return;
    }

    try {
      setReminding(true);
      toast.info("Envoi des relances en cours…");

      const res = await fetch(`${backendUrl}/api/events/${eventId}/remind`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Erreur relance:", data);
        toast.error(data.error || "Erreur lors de la relance des participants");
        return;
      }

      const count = typeof data.remindersSent === "number" ? data.remindersSent : 0;
      if (count === 0) {
        toast.info("Aucun participant à relancer (tout le monde a déjà envoyé une vidéo ou aucune invitation en attente).");
      } else {
        toast.success(`Relance envoyée à ${count} participant(s) sans vidéo.`);
      }
    } catch (err) {
      console.error("❌ Erreur handleRemindPending:", err);
      toast.error("Erreur lors de la relance des participants");
    } finally {
      setReminding(false);
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
                  Date limite pour envoyer les vidéos :{" "}
                  <span className="font-medium">{deadlineText}</span>
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
              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <Link to={`/events/${eventId}`} className="w-full md:w-auto">
                  <Button
                    variant="secondary"
                    className="w-full md:w-auto text-xs md:text-sm py-2"
                  >
                    ← Retour à l&apos;événement
                  </Button>
                </Link>
                <Button
                  type="button"
                  onClick={handleRemindPending}
                  disabled={reminding || isEventExpired(event)}
                  variant="secondary"
                  className="w-full md:w-auto text-xs md:text-sm py-2"
                >
                  {reminding ? "Relance en cours..." : "🔔 Relancer les participants"}
                </Button>
              </div>
            </div>
          </div>

          {/* Carte Participants actuels (avec compte) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Participants actuels
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Liste des personnes invitées <strong>ayant créé un compte Grega Play</strong>, avec l&apos;état de leur vidéo.
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
                          Statut invitation : {p.status || 'envoyée'}
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

          {/* Carte Invitations envoyées (TOUS les invités) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Invitations envoyées
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Liste de toutes les adresses invitées, même si la personne n&apos;a pas encore créé de compte.
                </p>
              </div>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1">
                {invitations.length} invitation
                {invitations.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="px-5 py-4">
              {invitations.length === 0 ? (
                <div className="py-4 text-sm text-gray-500">
                  Aucune invitation envoyée pour le moment.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {invitations.map((inv) => {
                    const email = typeof inv.email === 'string' ? inv.email.trim() : '';
                    const status = invitationStatusByEmail[email] || {
                      hasAccount: false,
                      hasSubmitted: false,
                    };

                    return (
                      <li
                        key={inv.id || inv.email}
                        className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900">
                            {inv.email}
                          </span>
                          <span className="text-xs text-gray-500">
                            Statut invitation : {inv.status || 'envoyée'}
                          </span>
                          <span className="text-xs text-gray-500">
                            Compte Grega Play :{" "}
                            {status.hasAccount ? (
                              <span className="text-emerald-600 font-medium">créé</span>
                            ) : (
                              <span className="text-gray-600">non créé</span>
                            )}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {status.hasSubmitted ? (
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
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Carte invitations (formulaire nouveaux participants) */}
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
