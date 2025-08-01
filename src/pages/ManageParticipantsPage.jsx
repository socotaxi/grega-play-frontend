import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const eventData = await eventService.getEvent(eventId);
        setEvent(eventData);
        const partList = await eventService.getEventParticipants(eventId);
        setParticipants(partList);
      } catch (err) {
        console.error('Error loading event or participants:', err);
        setError("Erreur lors du chargement de l'événement");
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
      const updated = await eventService.getEventParticipants(eventId);
      setParticipants(updated);
      setEmails('');
      setMessage('');
    } catch (err) {
      console.error('Error sending invitations:', err);
      toast.error(err.message || "Erreur lors de l'envoi des invitations");
    } finally {
      setSending(false);
    }
  };

  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const eventData = await eventService.getEvent(eventId);
        setEvent(eventData);
        const invList = await invitationService.getInvitations(eventId);
        setInvitations(invList);
        setParticipants(invList.filter(inv => inv.user_id));
      } catch (err) {
        console.error('Erreur chargement participants :', err);
        setError("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);


  if (loading) {
    return (
      <MainLayout>
        <div className="py-8 flex justify-center">
          <Loading />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="py-8 text-center text-red-500">{error}</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          <p className="text-sm text-gray-500">Gestion des participants</p>
        </div>

        <div className="bg-white shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Participants actuels</h2>
            {participants.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun participant</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {participants.map((p) => (
                  <li key={p.id || p.email} className="py-2 flex justify-between">
                    <span>{p.email}</span>
                    <span className="text-sm text-gray-500">
                      {p.status}
                      {p.has_submitted ? ' (vidéo soumise)' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white shadow sm:rounded-lg mb-6">
          <form onSubmit={handleInvite}>
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Inviter de nouveaux participants</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emails (séparés par des virgules ou des retours à la ligne)
                </label>
                <textarea
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  rows={3}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                ></textarea>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message personnel (optionnel)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                ></textarea>
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={sending} disabled={sending}>
                  Envoyer les invitations
                </Button>
              </div>
            </div>
          </form>
        </div>

        <div className="flex justify-end">
          <Link to={`/events/${eventId}/final`} className="mr-3">
            <Button variant="secondary">Retour à l'événement</Button>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
};

export default ManageParticipantsPage;
