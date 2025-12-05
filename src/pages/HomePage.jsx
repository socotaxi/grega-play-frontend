import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabaseClient';

const HomePage = () => {
  const { user } = useAuth();

  const primaryCtaLink = user ? '/create-event' : '/register';
  const primaryCtaLabel = user ? 'Créer un événement' : 'Créer un compte gratuit';
  const secondaryCtaLink = user ? '/dashboard' : '/login';
  const secondaryCtaLabel = user ? 'Voir mes événements' : 'Se connecter';

  // --- Gestion du popup d'installation PWA ---
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // --- Tracking basique des clics sur "Installer Grega Play" ---
  const trackInstallClick = async (source = 'home_modal') => {
    try {
      await supabase.from('app_install_events').insert([
        {
          source, // ex: 'home_modal', 'home_header_button'
        },
      ]);
    } catch (error) {
      console.error('Erreur tracking clic installation Grega Play :', error);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    // Si déjà installée en mode standalone → pas de popup
    if (isStandalone) {
      return;
    }

    // Détection "mobile" (user agent + largeur écran)
    const ua = window.navigator.userAgent || '';
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(ua) ||
      window.innerWidth <= 768;

    // On ne montre le popup que sur mobile
    if (!isMobile) {
      return;
    }

    // Si l'utilisateur a déjà cliqué sur "Plus tard" → on ne repropose pas le popup
    const hasDismissed =
      window.localStorage?.getItem('gp_install_prompt_dismissed') === '1';
    if (hasDismissed) {
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      // Empêche le prompt natif
      e.preventDefault();
      setDeferredPrompt(e);

      // On laisse la page se charger un peu avant de montrer le popup
      setTimeout(() => {
        setShowInstallModal(true);
      }, 1200);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async (source = 'home_modal') => {
    // Tracking du clic sur le bouton "Installer"
    await trackInstallClick(source);

    if (!deferredPrompt) {
      // Pas de prompt disponible (par exemple sur iOS Safari)
      return;
    }

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    // Dans tous les cas, on ferme le popup et on évite de spammer
    try {
      window.localStorage?.setItem('gp_install_prompt_dismissed', '1');
    } catch (e) {
      // silencieux
    }

    setDeferredPrompt(null);
    setShowInstallModal(false);

    console.log('PWA install outcome:', choiceResult?.outcome);
  };

  const handleCloseInstallModal = () => {
    try {
      window.localStorage?.setItem('gp_install_prompt_dismissed', '1');
    } catch (e) {
      // silencieux
    }
    setShowInstallModal(false);
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          {/* HERO façon : bandeau clair + carte à droite */}
          <section className="bg-gradient-to-br from-emerald-50 via-white to-gray-50 border border-emerald-100 rounded-3xl px-5 sm:px-8 py-8 shadow-sm">
            {/* Petit bouton permanent en "header" de la section
                → visible si on a reçu un beforeinstallprompt,
                   mais que le popup n'est pas en train d'être affiché */}
            <div className="flex justify-end mb-3">
              {deferredPrompt && !showInstallModal && (
                <button
                  type="button"
                  onClick={() => handleInstallClick('home_header_button')}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  <span className="text-xs">📱</span>
                  <span>Installer Grega Play</span>
                </button>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">

              {/* Texte gauche */}
              <div className="md:w-1/2">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-emerald-100 px-3 py-1 mb-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    Grega Play • Montage vidéo collaboratif
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
                  Créez des moments vidéo collaboratifs
                  <span className="block text-emerald-600 mt-1">
                    avec vos amis et votre famille.
                  </span>
                </h1>

                <p className="mt-4 text-sm sm:text-base text-gray-700">
                  Partagez des moments uniques et assemblez-les automatiquement en une seule vidéo.
                </p>
                <p className="mt-2 text-sm sm:text-base text-gray-600">
                  Chaque moment devient un prétexte pour créer du lien, rassembler la famille,
                  les amis ou l’équipe – même à distance.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link to={primaryCtaLink} className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto py-2.5 text-sm font-semibold">
                      {primaryCtaLabel}
                    </Button>
                  </Link>
                  <Link to={secondaryCtaLink} className="w-full sm:w-auto">
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto py-2.5 text-sm font-semibold border-emerald-500 text-emerald-700"
                    >
                      {secondaryCtaLabel}
                    </Button>
                  </Link>
                </div>

                <p className="mt-3 text-[11px] text-gray-500">
                  Aucun logiciel de montage à apprendre : vos proches envoient des vidéos,
                  Grega Play s’occupe du reste.
                </p>
              </div>

              {/* Carte “exemple d’événement” à droite, façon */}
              <div className="md:w-1/2">
                <div className="bg-white rounded-3xl shadow-md border border-emerald-100 px-5 py-5 sm:px-6 sm:py-6 max-w-md ml-auto">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm sm:text-base font-semibold text-gray-900 mt-1">
                        Anniversaire de Mamouna ❤️🥳
                      </h2>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Famille & amis envoient chacun une courte vidéo.
                      </p>
                    </div>
                    {/* mini badge */}
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700">
                      12 vidéos reçues
                    </div>
                  </div>

                  {/* Image / mockup */}
                  <div className="mt-4 rounded-2xl overflow-hidden border border-gray-100 bg-gray-100">
                    <img
                      src="/images/home-hero.jpg"
                      alt="Aperçu de l’événement Grega Play"
                      className="w-full h-40 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Progression, façon */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                      <span>Vidéos reçues</span>
                      <span>12 / 20</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full w-3/5 rounded-full bg-emerald-500" />
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Date limite : 28 novembre • Montage final prévu le 30.
                    </p>
                  </div>

                  {/* Mini avatars / collaboration */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      <div className="h-7 w-7 rounded-full bg-emerald-100 border border-white flex items-center justify-center text-[11px] text-emerald-700 font-semibold">
                        A
                      </div>
                      <div className="h-7 w-7 rounded-full bg-indigo-100 border border-white flex items-center justify-center text-[11px] text-indigo-700 font-semibold">
                        M
                      </div>
                      <div className="h-7 w-7 rounded-full bg-pink-100 border border-white flex items-center justify-center text-[11px] text-pink-700 font-semibold">
                        T
                      </div>
                      <div className="h-7 w-7 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[10px] text-gray-600">
                        +9
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      12 personnes participent à la surprise.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bande de réassurance façon “chiffres / promesses” */}
          <section>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Pensé pour les moments importants
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Anniversaires, mariages, départs, surprises, remerciements…
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    100% collaboratif
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Chacun participe depuis son téléphone, où qu’il soit.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Format vertical prêt à partager
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Idéal pour WhatsApp, Instagram, TikTok, YouTube Shorts.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* USE CASES avec images (déjà visuel) */}
          <section>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Pour quels moments utiliser Grega Play ?
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              Quelques exemples où un montage collaboratif crée vraiment du lien.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Anniversaire */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="h-32 sm:h-40 bg-gray-100">
                  <img
                    src="/images/home-birthday.jpg"
                    alt="Montage vidéo pour un anniversaire"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Anniversaires & surprises
                  </h3>
                  <p className="mt-2 text-xs text-gray-600 flex-1">
                    Demande à chaque proche d’envoyer une courte vidéo “joyeux anniversaire”.
                    Grega Play assemble tout en une seule vidéo émouvante.
                  </p>
                </div>
              </div>

              {/* Mariage / famille */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="h-32 sm:h-40 bg-gray-100">
                  <img
                    src="/images/home-wedding.jpg"
                    alt="Montage vidéo pour un mariage ou un événement familial"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Mariages & grandes occasions
                  </h3>
                  <p className="mt-2 text-xs text-gray-600 flex-1">
                    Messages de la famille, des amis proches ou de la diaspora qui
                    ne peut pas se déplacer, réunis en un souvenir commun.
                  </p>
                </div>
              </div>

              {/* Équipe / entreprise */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="h-32 sm:h-40 bg-gray-100">
                  <img
                    src="/images/home-team.jpg"
                    alt="Montage vidéo pour une équipe ou une entreprise"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Équipes & entreprises
                  </h3>
                  <p className="mt-2 text-xs text-gray-600 flex-1">
                    Départ d’un collègue, best-of de l’année, message collectif :
                    un format simple pour renforcer la cohésion.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* COMMENT ÇA MARCHE – 3 étapes claires */}
          <section>
            <div className="mb-4">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                Comment ça marche
              </p>
              <h2 className="mt-1 text-xl font-bold text-gray-900">
                En trois étapes simples
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    Crée ton événement
                  </p>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Choisis un titre, un thème (anniversaire, mariage, surprise…),
                  une date limite et la durée des clips.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    Invite tes proches
                  </p>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Partage un lien public ou envoie des invitations par email.
                  Chacun enregistre une courte vidéo depuis son téléphone.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    Génére la vidéo finale
                  </p>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Quand tu es prêt, tu lances le montage. Grega Play assemble tout
                  en un format vertical 9:16, prêt à être partagé partout.
                </p>
              </div>
            </div>
          </section>

          {/* CTA FINAL */}
          <section>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Lance ton premier montage collaboratif dès aujourd’hui.
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Crée un petit événement test, invite quelques proches et regarde
                  comment Grega Play peut rapprocher ta communauté.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to={primaryCtaLink} className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold">
                    {primaryCtaLabel}
                  </Button>
                </Link>
                {user && (
                  <Link to="/dashboard" className="w-full sm:w-auto">
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold"
                    >
                      Voir mes événements
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* POPUP INSTALL APP (uniquement mobile, voir useEffect) */}
      {showInstallModal && deferredPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative bg-white rounded-3xl shadow-2xl border border-emerald-100 max-w-sm w-full p-5">
            <button
              type="button"
              onClick={handleCloseInstallModal}
              className="absolute top-3 right-3 inline-flex items-center justify-center h-7 w-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs"
              aria-label="Fermer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-xl">
                📱
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                  Grega Play sur ton écran d’accueil
                </p>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Installe l’app pour un accès plus rapide
                </h2>
              </div>
            </div>
           <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <Button
                onClick={() => handleInstallClick('home_modal')}
                className="w-full py-2 text-sm font-semibold"
              >
                Installer Grega Play
              </Button>
              <button
                type="button"
                onClick={handleCloseInstallModal}
                className="w-full py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Plus tard
              </button>
            </div>

            <p className="mt-2 text-[10px] text-gray-400">
              Tu pourras toujours installer Grega Play depuis ton navigateur si tu changes d’avis.
            </p>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default HomePage;
