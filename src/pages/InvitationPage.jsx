import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import MainLayout from '../components/layout/MainLayout';
import InvitationCard from '../components/invitation/InvitationCard';
import Loading from '../components/ui/Loading';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import invitationService from '../services/invitationService';
import activityService from "../services/activityService";

// 🔒 Vérifie si la date de naissance indique moins de 15 ans
function isUnder15(birthDateString) {
  const birth = new Date(birthDateString);
  if (isNaN(birth.getTime())) return true; // date invalide → on refuse

  const today = new Date();
  const minBirth = new Date(
    today.getFullYear() - 15,
    today.getMonth(),
    today.getDate()
  );

  // true = trop jeune
  return birth > minBirth;
}

const InvitationPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, profile, login, register } = useAuth();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState('register'); // 'register' or 'login'
  const [authLoading, setAuthLoading] = useState(false);
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    birthDate: '', // 🔹 ajouté
  });

  useEffect(() => {
    if (token) {
      loadInvitation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    // Si l'utilisateur est déjà connecté et que l'invitation est chargée,
    // on accepte automatiquement l'invitation (statut "pending")
    if (user && invitation && invitation.status === 'pending') {
      handleAcceptInvitation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, invitation]);

  const loadInvitation = async () => {
    try {
      setLoading(true);
      const invitationData = await invitationService.getInvitationByToken(token);

      if (!invitationData) {
        setError('Invitation non trouvée ou expirée');
        return;
      }

      setInvitation(invitationData);

      // Pré-remplir l'email si disponible
      if (invitationData.email) {
        setAuthData((prev) => ({ ...prev, email: invitationData.email }));
      }
    } catch (err) {
      console.error('Error loading invitation:', err);
      setError("Erreur lors du chargement de l'invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!user) {
      setShowAuthForm(true);
      return;
    }

    try {
      let success = false;

      // Compatibilité avec une éventuelle ancienne méthode acceptInvitation
      if (typeof invitationService.acceptInvitation === 'function') {
        try {
          const result = await invitationService.acceptInvitation(token, user.id);
          if (result) success = true;
        } catch (e) {
          console.warn("acceptInvitation a échoué ou n'est pas utilisée :", e);
        }
      }

      // Nouvelle logique : marquer l'invitation comme acceptée + lier user_id
      if (typeof invitationService.markInvitationAccepted === 'function') {
        await invitationService.markInvitationAccepted(token, user.id);
        success = true;
      }

      if (success) {
        toast.success('Invitation acceptée avec succès !');

        // Log activité
        try {
          await activityService.logActivity({
            event_id: invitation.event_id,
            user_id: user.id,
            type: "accepted_invitation",
            message: `${profile?.full_name ? profile.full_name.split(" ")[0] : user.email} a rejoint l'événement 🎉`,
          });
        } catch (logErr) {
          console.warn("Erreur logActivity (accepted_invitation):", logErr);
        }

        // Mise à jour locale du statut
        setInvitation((prev) =>
          prev ? { ...prev, status: 'accepted', user_id: user.id } : prev
        );

        // Navigation vers la page de l'événement
        const targetEventId =
          invitation.events?.id || invitation.event_id || invitation.event?.id;

        if (targetEventId) {
          navigate(`/events/${targetEventId}`);
        } else {
          navigate('/dashboard');
        }
      } else {
        toast.error("Erreur lors de l'acceptation de l'invitation");
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error("Erreur lors de l'acceptation de l'invitation");
    }
  };

  const handleDeclineInvitation = async () => {
    try {
      let success = false;

      // Compatibilité si une méthode declineInvitation existe
      if (typeof invitationService.declineInvitation === 'function') {
        success = await invitationService.declineInvitation(token);
      } else {
        // Fallback : on met simplement à jour le statut en front
        success = true;
      }

      if (success) {
        toast.info("Invitation déclinée");

        // Log activité
        try {
          await activityService.logActivity({
            event_id: invitation.event_id,
            user_id: user?.id || null,
            type: "declined_invitation",
            message: `${profile?.full_name ? profile.full_name.split(" ")[0] : user?.email || 'Un invité'} a refusé l'invitation ❌`,
          });
        } catch (logErr) {
          console.warn("Erreur logActivity (declined_invitation):", logErr);
        }

        setInvitation((prev) =>
          prev ? { ...prev, status: 'declined' } : prev
        );
      } else {
        toast.error("Erreur lors du refus de l'invitation");
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error("Erreur lors du refus de l'invitation");
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    try {
      if (authMode === 'register') {
        if (authData.password !== authData.confirmPassword) {
          toast.error('Les mots de passe ne correspondent pas');
          return;
        }

        // 🔒 Contrôle d’âge : au moins 15 ans
        if (!authData.birthDate || isUnder15(authData.birthDate)) {
          toast.error(
            "Impossible de créer votre compte\nImpossible de vous inscrire sur GregaPlay"
          );
          return;
        }
      }

      setAuthLoading(true);

      if (authMode === 'register') {
        await register(authData.email, authData.password, authData.fullName);
        toast.success('Compte créé avec succès !');
      } else {
        await login(authData.email, authData.password);
        toast.success('Connexion réussie !');
      }

      // Après auth, le useEffect user+invitation se charge d'accepter l'invitation
      setShowAuthForm(false);
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error.message || "Erreur d'authentification");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthInputChange = (e) => {
    const { name, value } = e.target;
    setAuthData((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-64">
          <Loading />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
            <h2 className="text-lg font-semibold mb-2">Invitation non valide</h2>
            <p>{error}</p>
            <Button
              className="mt-4"
              onClick={() => navigate('/')}
            >
              Retour à l&apos;accueil
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!invitation) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p>Invitation non trouvée</p>
            <Button onClick={() => navigate('/')}>
              Retour à l&apos;accueil
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            🎬 Vous êtes invité(e) !
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Participez à un événement vidéo collaboratif
          </p>
        </div>

        <InvitationCard
          invitation={invitation}
          onAccept={handleAcceptInvitation}
          onDecline={handleDeclineInvitation}
          currentUser={user}
        />

        {/* Authentication Modal */}
        {showAuthForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {authMode === 'register' ? 'Créer un compte' : 'Se connecter'}
                  </h3>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={authData.email}
                      onChange={handleAuthInputChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {authMode === 'register' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nom complet
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={authData.fullName}
                        onChange={handleAuthInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {authMode === 'register' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Date de naissance
                      </label>
                      <input
                        type="date"
                        name="birthDate"
                        value={authData.birthDate}
                        onChange={handleAuthInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Vous devez avoir au moins 15 ans pour vous inscrire.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Mot de passe
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={authData.password}
                      onChange={handleAuthInputChange}
                      required
                      minLength="6"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {authMode === 'register' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Confirmer le mot de passe
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={authData.confirmPassword}
                        onChange={handleAuthInputChange}
                        required
                        minLength="6"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <Button
                      type="submit"
                      loading={authLoading}
                      className="flex-1"
                    >
                      {authMode === 'register'
                        ? 'Créer le compte'
                        : 'Se connecter'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowAuthForm(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                </form>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      setAuthMode(authMode === 'register' ? 'login' : 'register')
                    }
                    className="text-indigo-600 hover:text-indigo-500 text-sm"
                  >
                    {authMode === 'register'
                      ? 'Déjà un compte ? Se connecter'
                      : 'Pas de compte ? Créer un compte'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default InvitationPage;
