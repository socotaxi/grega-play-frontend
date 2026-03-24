import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabaseClient';

const HomePage = () => {
  const { user } = useAuth();
  const [videoActive, setVideoActive] = useState(false);

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

          {/* HERO façon : bandeau clair + vidéo YouTube à droite */}
          <section className="bg-gradient-to-br from-emerald-50 via-white to-gray-50 border border-emerald-100 rounded-3xl px-5 sm:px-8 py-8 shadow-sm">
            {/* Petit bouton permanent en "header" de la section */}
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
                  Créez des moments vidéo inoubliables✨
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

              {/* Vidéo YouTube à droite */}
              <div className="md:w-1/2">
                <div className="bg-white rounded-3xl shadow-md border border-emerald-100 px-5 py-5 sm:px-6 sm:py-6 max-w-md ml-auto">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                        Grega Play en moins d'1 minute🕐
                      </h2>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Une courte vidéo pour comprendre le fonctionnement.
                      </p>
                    </div>
                  </div>

                     {/* Wrapper responsive 9:16 — façade lazy : YouTube ne charge que si l'utilisateur clique */}
<div className="mt-2 relative w-full rounded-2xl overflow-hidden bg-black" style={{ paddingTop: '177.78%' }}>
  {videoActive ? (
    <iframe
      src="https://www.youtube.com/embed/sCIDewhYZR0?si=kLfDvvltSHj2-pWO&autoplay=1"
      title="Présentation de Grega Play"
      className="absolute top-0 left-0 w-full h-full rounded-2xl"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  ) : (
    <button
      type="button"
      onClick={() => setVideoActive(true)}
      className="absolute top-0 left-0 w-full h-full group"
      aria-label="Lancer la vidéo de présentation Grega Play"
    >
      <img
        src="https://img.youtube.com/vi/sCIDewhYZR0/hqdefault.jpg"
        alt="Aperçu de la vidéo de présentation Grega Play"
        width="480"
        height="360"
        loading="lazy"
        className="w-full h-full object-cover opacity-85"
      />
      {/* Bouton play YouTube rouge */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-150">
          <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
      <p className="absolute bottom-3 left-0 right-0 text-center text-[11px] text-white/80 font-medium">
        Cliquez pour lancer la vidéo
      </p>
    </button>
  )}
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

          {/* USE CASES avec images (cliquables) */}
          <section>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Pour quels moments utiliser Grega Play ?
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              Quelques exemples où un montage collaboratif crée vraiment du lien.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Anniversaire */}
              <Link
                to={primaryCtaLink}
                className="group bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md hover:border-emerald-400 transition-all duration-150"
              >
                <div className="h-32 sm:h-40 bg-gray-100 overflow-hidden">
                  <picture>
                    <source srcSet="/images/home-birthday.webp" type="image/webp" />
                    <img
                      src="/images/home-birthday.jpg"
                      alt="Montage vidéo pour un anniversaire"
                      width="400"
                      height="160"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-150"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </picture>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Anniversaires & surprises
                  </h3>
                  <p className="mt-2 text-xs text-gray-600 flex-1">
                    Demande à chaque proche d’envoyer une courte vidéo “joyeux anniversaire”.
                    Grega Play assemble tout en une seule vidéo émouvante.
                  </p>
                  <span className="mt-3 text-[11px] font-medium text-emerald-600 group-hover:underline">
                    Créer un événement anniversaire →
                  </span>
                </div>
              </Link>

              {/* Mariage / famille */}
              <Link
                to={primaryCtaLink}
                className="group bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md hover:border-emerald-400 transition-all duration-150"
              >
                <div className="h-32 sm:h-40 bg-gray-100 overflow-hidden">
                  <picture>
                    <source srcSet="/images/home-wedding.webp" type="image/webp" />
                    <img
                      src="/images/home-wedding.jpg"
                      alt="Montage vidéo pour un mariage ou un événement familial"
                      width="400"
                      height="160"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-150"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </picture>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Mariages & grandes occasions
                  </h3>
                  <p className="mt-2 text-xs text-gray-600 flex-1">
                    Messages de la famille, des amis proches ou de la diaspora qui
                    ne peut pas se déplacer, réunis en un souvenir commun.
                  </p>
                  <span className="mt-3 text-[11px] font-medium text-emerald-600 group-hover:underline">
                    Créer un événement mariage →
                  </span>
                </div>
              </Link>

              {/* Équipe / entreprise */}
              <Link
                to={primaryCtaLink}
                className="group bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md hover:border-emerald-400 transition-all duration-150"
              >
                <div className="h-32 sm:h-40 bg-gray-100 overflow-hidden">
                  <picture>
                    <source srcSet="/images/home-team.webp" type="image/webp" />
                    <img
                      src="/images/home-team.jpg"
                      alt="Montage vidéo pour une équipe ou une entreprise"
                      width="400"
                      height="160"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-150"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </picture>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Équipes & entreprises
                  </h3>
                  <p className="mt-2 text-xs text-gray-600 flex-1">
                    Départ d’un collègue, best-of de l’année, message collectif :
                    un format simple pour renforcer la cohésion.
                  </p>
                  <span className="mt-3 text-[11px] font-medium text-emerald-600 group-hover:underline">
                    Créer un événement d’équipe →
                  </span>
                </div>
              </Link>
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
          <div className="relative bg-white rounded-3xl shadow-2xl border-emerald-100 max-w-sm w-full p-5">
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
