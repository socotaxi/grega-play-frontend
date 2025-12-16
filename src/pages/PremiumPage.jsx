// src/pages/PremiumPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import eventService from "../services/eventService";
import { toast } from "react-toastify";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_KEY = import.meta.env.VITE_BACKEND_API_KEY;

const PremiumPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [accountDuration, setAccountDuration] = useState("1w"); // 1 semaine par défaut
  const [eventDuration, setEventDuration] = useState("3d"); // 3 jours par défaut
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [loadingBoostAccount, setLoadingBoostAccount] = useState(false);
  const [loadingBoostEvent, setLoadingBoostEvent] = useState(false);

  // Calcul Premium compte (même logique que MainLayout → truthy sur is_premium_account OU is_premium)
  const { isPremiumAccount, premiumAccountExpiresAt, premiumAccountLabel } =
    useMemo(() => {
      if (!profile) {
        return {
          isPremiumAccount: false,
          premiumAccountExpiresAt: null,
          premiumAccountLabel: "",
        };
      }

      const rawExpires = profile.premium_account_expires_at;
      const expiresDate = rawExpires ? new Date(rawExpires) : null;

      const effectivePremium = Boolean(
        profile.is_premium_account || profile.is_premium
      );

      let label = "";
      if (effectivePremium && expiresDate) {
        const options = {
          year: "numeric",
          month: "short",
          day: "numeric",
        };
        label = `Ton compte est Premium jusqu'au ${expiresDate.toLocaleDateString(
          "fr-FR",
          options
        )}`;
      } else if (effectivePremium) {
        label = "Ton compte est actuellement en mode Premium.";
      }

      return {
        isPremiumAccount: effectivePremium,
        premiumAccountExpiresAt: expiresDate,
        premiumAccountLabel: label,
      };
    }, [profile]);

  // Charger les événements de l'utilisateur pour le boost événement
  useEffect(() => {
    const loadEvents = async () => {
      if (!user?.id) return;

      try {
        setLoadingEvents(true);
        setEventsError(null);
        const dashboardEvents = await eventService.getDashboardEvents(
          user.id,
          user.email
        );
        setEvents(dashboardEvents || []);
      } catch (err) {
        console.error("Erreur chargement événements pour Premium:", err);
        setEventsError(
          err?.message ||
            "Impossible de charger vos événements. Veuillez réessayer."
        );
      } finally {
        setLoadingEvents(false);
      }
    };

    loadEvents();
  }, [user]);

  const handleContinueFree = () => {
    navigate("/dashboard");
  };

  const handleBoostAccount = async () => {
    if (!user?.id) {
      toast.error("Tu dois être connecté pour activer le compte Premium.");
      return;
    }

    if (!API_BASE_URL || !API_KEY) {
      console.error("Config backend manquante pour boost compte.");
      toast.error(
        "Configuration backend manquante. Vérifie les variables d'environnement."
      );
      return;
    }

    setLoadingBoostAccount(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/billing/checkout-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          userId: user.id,
          duration: accountDuration,
        }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (_) {}

      if (!res.ok || data.error) {
        console.error("❌ Erreur boost compte Premium:", data);
        toast.error(
          data.error ||
            "Impossible d'activer le compte Premium pour le moment."
        );
        return;
      }

      toast.success(
        data.message ||
          "Ton compte a été boosté en Premium pendant la période choisie."
      );

      // Option simple : recharger la page pour récupérer le nouveau profil Premium
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      console.error("❌ Erreur réseau boost compte Premium:", err);
      toast.error("Erreur lors de l'activation du compte Premium.");
    } finally {
      setLoadingBoostAccount(false);
    }
  };

  const handleBoostEvent = async () => {
    if (!user?.id) {
      toast.error("Tu dois être connecté pour booster un événement.");
      return;
    }

    if (isPremiumAccount) {
      toast.info(
        "Ton compte est déjà Premium, tous tes événements bénéficient des options Premium."
      );
      return;
    }

    if (!selectedEventId) {
      toast.error("Sélectionne d'abord un événement à booster.");
      return;
    }

    if (!API_BASE_URL || !API_KEY) {
      console.error("Config backend manquante pour boost événement.");
      toast.error(
        "Configuration backend manquante. Vérifie les variables d'environnement."
      );
      return;
    }

    setLoadingBoostEvent(true);
    try {
      const baseUrl = window.location.origin + "/premium";

      const res = await fetch(`${API_BASE_URL}/api/billing/checkout-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          eventId: selectedEventId,
          userId: user.id,
          duration: eventDuration,
          successUrl: baseUrl,
          cancelUrl: baseUrl,
        }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (_) {}

      if (!res.ok || data.error) {
        console.error("❌ Erreur boost événement Premium:", data);
        toast.error(
          data.error ||
            "Impossible de booster cet événement pour le moment."
        );
        return;
      }

      toast.success(
        data.message ||
          "Ton événement a été boosté en Premium pendant la période choisie."
      );

      // On peut recharger la page ou simplement rafraîchir les événements
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      console.error("❌ Erreur réseau boost événement Premium:", err);
      toast.error("Erreur lors de l'activation de l'événement Premium.");
    } finally {
      setLoadingBoostEvent(false);
    }
  };

  const accountDurationOptions = [
    { label: "1 semaine", value: "1w" },
    { label: "1 mois", value: "1m" },
  ];

  const eventDurationOptions = [
    { label: "24 heures", value: "24h" },
    { label: "3 jours", value: "3d" },
    { label: "7 jours", value: "7d" },
  ];

  const canUseEventBoost = !isPremiumAccount && events.length > 0;

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
          {/* HERO */}
          <section className="bg-white rounded-3xl border border-gray-200 shadow-sm px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 mb-3">
                  Lancement · Grega Play Premium free*
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Booster ton compte ou un événement en Premium (Free*)
                </h1>
                <p className="mt-3 text-sm text-gray-600 max-w-xl">
                  Plus de vidéos, plus de liberté, plus d’émotion. Grega Play
                  Premium te donne tout ce qu’il faut pour créer des vidéos
                  collectives inoubliables. (*Pendant la phase de lancement,
                  l’activation est gratuite, mais limitée dans le temps :
                  choisis un boost de compte ou un boost d’événement.)
                </p>

                {!isPremiumAccount ? (
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                      Tu peux activer un boost Premium free
                    </span>
                    <button
                      type="button"
                      onClick={handleContinueFree}
                      className="text-sm font-medium text-gray-600 hover:text-gray-800"
                    >
                      Continuer avec la version gratuite
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                        Tu es déjà en compte Premium
                      </span>
                      {premiumAccountLabel && (
                        <span className="text-xs text-gray-600">
                          {premiumAccountLabel}
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={() => navigate("/create-event")}
                      className="inline-flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-full shadow-sm w-fit"
                    >
                      Créer un nouvel événement Premium
                    </Button>
                  </div>
                )}
              </div>

              <div className="md:w-64">
                <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-emerald-500 rounded-2xl p-4 text-white shadow-lg">
                  <p className="text-xs uppercase tracking-wide text-purple-100">
                    Offre de lancement
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    Grega Play Premium
                  </p>
                  <p className="mt-1 text-sm text-purple-100">
                    Idéal pour les grandes célébrations, les équipes et les
                    familles.
                  </p>
                  <div className="mt-4">
                    <p className="text-sm text-purple-100 line-through">
                      Abonnement premium : 2500 XOF
                    </p>
                    <p className="mt-1 text-2xl font-bold">Actuellement : 0 XAF</p>
                    <p className="text-xs text-purple-100">
                      *Grega Play Premium est gratuit pendant la phase de lancement, pour une
                      durée limitée.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CHOIX DU MODE PREMIUM */}
          <section className="space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Choisir comment booster Grega Play en Premium
            </h2>
            <p className="text-sm text-gray-600 max-w-2xl">
              Tu as deux options : booster ton{" "}
              <span className="font-semibold">compte</span> pour que tous tes
              événements soient Premium pendant une durée donnée, ou booster un
              <span className="font-semibold"> événement spécifique</span> pour
              une célébration importante.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Boost Compte Premium */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Booster mon compte Premium
                  </h3>
                  {isPremiumAccount && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-100">
                      Déjà actif
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600">
                  Tous tes événements (présents et futurs) bénéficient des
                  options Premium pendant la durée choisie.
                </p>

                <div className="mt-2 space-y-2">
                  <p className="text-xs font-medium text-gray-700">
                    Durée du boost compte :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {accountDurationOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAccountDuration(opt.value)}
                        disabled={isPremiumAccount}
                        className={`px-3 py-1.5 rounded-full border text-xs font-medium ${
                          accountDuration === opt.value
                            ? "bg-purple-600 text-white border-purple-600"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        } ${
                          isPremiumAccount ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {premiumAccountLabel && (
                  <p className="mt-1 text-[11px] text-emerald-700">
                    {premiumAccountLabel}
                  </p>
                )}

                <div className="mt-3">
                  <Button
                    onClick={handleBoostAccount}
                    disabled={loadingBoostAccount || isPremiumAccount}
                    className="w-full text-sm font-semibold py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingBoostAccount
                      ? "Activation en cours..."
                      : isPremiumAccount
                      ? "Compte déjà Premium"
                      : "Booster mon compte en Premium"}
                  </Button>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Pendant la phase de lancement, ce boost de compte est
                    gratuit, mais limité dans le temps.
                  </p>
                </div>
              </div>

              {/* Boost Événement Premium */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Booster un événement Premium
                  </h3>
                  {isPremiumAccount && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium border border-gray-200">
                      Désactivé si compte Premium actif
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600">
                  Parfait si tu veux booster uniquement un anniversaire, un
                  mariage, un départ ou un challenge précis, sans tout ton
                  compte.
                </p>

                {loadingEvents ? (
                  <p className="text-xs text-gray-500">
                    Chargement de tes événements...
                  </p>
                ) : eventsError ? (
                  <p className="text-xs text-red-600">{eventsError}</p>
                ) : events.length === 0 ? (
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Tu n&apos;as pas encore d&apos;événement à booster.</p>
                    <button
                      type="button"
                      onClick={() => navigate("/create-event")}
                      className="text-xs font-medium text-purple-600 hover:text-purple-700"
                    >
                      Créer un premier événement
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700">
                        Choisir l&apos;événement à booster :
                      </p>
                      <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        disabled={isPremiumAccount}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          Sélectionne un événement dans ta liste
                        </option>
                        {events.map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {ev.title || "Événement sans titre"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-gray-700">
                        Durée du boost événement :
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {eventDurationOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setEventDuration(opt.value)}
                            disabled={!canUseEventBoost}
                            className={`px-3 py-1.5 rounded-full border text-xs font-medium ${
                              eventDuration === opt.value
                                ? "bg-purple-600 text-white border-purple-600"
                                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                            } ${
                              !canUseEventBoost
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3">
                      <Button
                        onClick={handleBoostEvent}
                        disabled={
                          loadingBoostEvent ||
                          !canUseEventBoost ||
                          !selectedEventId
                        }
                        className="w-full text-sm font-semibold py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loadingBoostEvent
                          ? "Activation en cours..."
                          : "Booster cet événement en Premium"}
                      </Button>
                      <p className="mt-1 text-[11px] text-gray-500">
                        L&apos;événement choisi bénéficiera des options Premium
                        (plus de vidéos, options avancées, etc.) pendant la
                        durée choisie.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* BENEFICES PREMIUM */}
          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Ce que tu gagnes avec Grega Play Premium
            </h2>
            <p className="text-sm text-gray-600 max-w-2xl">
              Premium n’ajoute pas juste des options techniques. Il augmente
              surtout l’impact émotionnel de ta vidéo finale, en te donnant plus
              de matière et plus de contrôle sur le rendu.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">
                  Plus de vidéos par événement
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Collecte bien plus de contributions pour les grands moments :
                  anniversaires ronds, départs d’équipe, mariages, etc. Tu n’es
                  plus limité à quelques clips.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">
                  Transitions et rythme plus fluides
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Accède à des transitions plus modernes et un montage plus
                  fluide, pour une vidéo qui ressemble à un vrai mini-film
                  collectif.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">
                  Musique signature Grega Play
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Ajoute automatiquement une musique signature sur l’intro et
                  l’outro, pour un rendu plus professionnel et mémorable.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">
                  Priorité sur la génération de la vidéo finale
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Tes événements Premium passent en priorité dans la file de
                  génération, pour recevoir la vidéo finale plus rapidement.
                </p>
              </div>
            </div>
          </section>

          {/* COMPARATIF FREE VS PREMIUM */}
          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Gratuit ou Premium : que change concrètement Grega Play ?
            </h2>
            <p className="text-sm text-gray-600 max-w-2xl">
              La version gratuite est parfaite pour tester l’appli ou pour des
              petits événements. Premium débloque tout le potentiel de Grega
              Play pour les moments vraiment importants. Aujourd’hui, Premium est free*, mais pour une durée limitée.
            </p>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="grid grid-cols-3 text-xs sm:text-sm font-semibold bg-gray-50 border-b border-gray-200">
                <div className="px-4 py-3 text-gray-600">Fonctionnalité</div>
                <div className="px-4 py-3 text-center text-gray-700">
                  Gratuit
                </div>
                <div className="px-4 py-3 text-center text-purple-700">
                  Premium (free*)
                </div>
              </div>

              <div className="divide-y divide-gray-100 text-xs sm:text-sm">
                <Row
                  label="Nombre de vidéos par événement"
                  free="Limité (5 vidéos)"
                  premium="Illimité"
                />
                <Row
                  label="Durée max par vidéo"
                  free="30 s."
                  premium="60 s."
                />
                <Row
                  label="Transitions vidéo"
                  free="1 transition standard"
                  premium="Transitions au choix"
                />
                <Row
                  label="Musique de fond"
                  free="/"
                  premium="Musique personnalisable"
                />
                <Row
                  label="Watermark / logo"
                  free="Logo Grega Play"
                  premium="Logo + Options de personnalisation"
                />
                <Row
                  label="Priorité de traitement"
                  free="File standard"
                  premium="File prioritaire"
                />
                <Row
                  label="Support"
                  free="Support standard par email"
                  premium="Support prioritaire"
                />
              </div>
            </div>
          </section>

          {/* POUR QUI ? */}
          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Pour qui est fait Grega Play Premium ?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">
                  Familles et amis
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Anniversaires, remises de diplômes, naissances, mariages,
                  surprises. Premium te permet de récupérer beaucoup plus de
                  vidéos et de créer un souvenir fort, que la personne gardera
                  longtemps.
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">
                  Équipes, entreprises et associations
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Challenge entre collègues, départ d’un collaborateur, team
                  building, messages de remerciement pour un client. Premium est
                  adapté aux projets où l’image de ton équipe compte.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="space-y-4 pb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Questions fréquentes
            </h2>
            <div className="space-y-2">
              <FaqItem question="Quelle est la différence principale entre la version gratuite et Premium ?">
                La version gratuite te permet de découvrir Grega Play et de faire
                des petits événements. Premium débloque un nombre plus élevé de
                vidéos, plus de durée par clip, des transitions plus riches, la
                musique signature et une priorité de traitement. 
              </FaqItem>

              <FaqItem question="Est-ce que je paye par événement ou par abonnement ?">
                Tu peux choisir ton modèle : prix par événement Premium, abonnement mensuel pour
                les gros utilisateurs, ou une combinaison des deux.
              </FaqItem>

              <FaqItem question="Que deviennent mes événements gratuits si je passe en Premium ?">
                Tes événements gratuits restent accessibles comme avant. Passer en
                Premium te permet simplement de créer de nouveaux événements avec
                plus de possibilités, ou de passer certains événements clés en
                mode Premium ou Boost.
              </FaqItem>

              <FaqItem question="Les participants doivent-ils payer quelque chose ?">
                Non. Seul l’organisateur de l’événement décide ou non de passer
                l’événement en mode Premium. Les invités n’ont rien à payer pour
                participer ou envoyer leurs vidéos.
              </FaqItem>

              <FaqItem question="Puis-je revenir à la version gratuite après ?">
                Oui. Tu peux très bien utiliser Premium sur certains événements
                importants, puis revenir à des événements gratuits. Premium n’est
                pas une obligation permanente.
              </FaqItem>
              
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
};

const Row = ({ label, free, premium }) => (
  <div className="grid grid-cols-3">
    <div className="px-4 py-3 text-gray-700 border-r border-gray-100">
      {label}
    </div>
    <div className="px-4 py-3 text-center text-gray-600 border-r border-gray-100">
      {free}
    </div>
    <div className="px-4 py-3 text-center text-purple-700 font-medium">
      {premium}
    </div>
  </div>
);

const FaqItem = ({ question, children }) => (
  <details className="bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm">
    <summary className="text-sm font-medium text-gray-900 cursor-pointer">
      {question}
    </summary>
    <p className="mt-2 text-sm text-gray-600">{children}</p>
  </details>
);

export default PremiumPage;
