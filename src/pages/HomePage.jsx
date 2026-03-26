import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../context/AuthContext';

/* ─── data ──────────────────────────────────────────────── */

const FEATURES = [
  {
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: '100 % collaboratif',
    desc: "Chaque invité envoie sa vidéo depuis son téléphone, où qu'il soit dans le monde.",
  },
  {
    bg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
    ),
    title: 'Montage automatique',
    desc: 'Un clic pour générer une vidéo finale en format 9:16 avec transitions et musique.',
  },
  {
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
    title: 'Prêt à partager',
    desc: 'Format vertical optimisé pour WhatsApp, Instagram Reels, TikTok et YouTube Shorts.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Crée ton événement',
    desc: 'Choisis un titre, un thème (anniversaire, mariage, départ…), une date limite et la durée max des clips.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    n: '02',
    title: 'Invite tes proches',
    desc: 'Partage un lien ou envoie des invitations par e-mail. Chacun filme et envoie sa vidéo en quelques secondes.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    n: '03',
    title: 'Génère la vidéo finale',
    desc: 'Quand tu es prêt, lance le montage. Grega Play assemble tout automatiquement en un seul fichier prêt à offrir.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
      </svg>
    ),
  },
];

const USE_CASES = [
  {
    imgWebp: '/images/home-birthday.webp',
    imgJpg: '/images/home-birthday.jpg',
    imgAlt: 'Montage vidéo pour un anniversaire',
    emoji: '🎂',
    title: 'Anniversaires & surprises',
    desc: 'Demande à chaque proche d\'envoyer un message. Grega Play assemble tout en une vidéo émouvante.',
    cta: 'Créer un événement anniversaire',
  },
  {
    imgWebp: '/images/home-wedding.webp',
    imgJpg: '/images/home-wedding.jpg',
    imgAlt: 'Montage vidéo pour un mariage',
    emoji: '💍',
    title: 'Mariages & grandes occasions',
    desc: 'Messages de la famille, des amis proches ou de la diaspora, réunis en un seul souvenir commun.',
    cta: 'Créer un événement mariage',
  },
  {
    imgWebp: '/images/home-team.webp',
    imgJpg: '/images/home-team.jpg',
    imgAlt: 'Montage vidéo pour une équipe',
    emoji: '🏢',
    title: 'Équipes & entreprises',
    desc: 'Départ d\'un collègue, best-of de l\'année, message collectif : renforcez la cohésion d\'équipe.',
    cta: 'Créer un événement d\'équipe',
  },
];

/* ─── component ─────────────────────────────────────────── */

const HomePage = () => {
  const { user } = useAuth();
  const [videoActive, setVideoActive] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  const primaryCtaLink  = user ? '/create-event' : '/register';
  const primaryCtaLabel = user ? 'Créer un événement' : 'Commencer gratuitement';
  const secondaryCtaLink  = user ? '/dashboard' : '/login';
  const secondaryCtaLabel = user ? 'Voir mes événements' : 'Se connecter';


  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Déjà installé en mode standalone → ne jamais afficher
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    const ua = window.navigator.userAgent || '';
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(ua) ||
      window.innerWidth <= 768;
    if (!isMobile) return;

    // Masqué pour cette session ("Plus tard") → ne pas reposer la question
    if (window.sessionStorage?.getItem('gp_install_dismissed_session') === '1') return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowInstallModal(true), 1200);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async (platform = 'web') => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      supabase.from('app_install_events').insert([{ platform }]).catch(() => {});
    }
    // Après la réponse de l'utilisateur, le navigateur ne redéclenche plus
    // beforeinstallprompt → pas besoin de flag permanent
    setDeferredPrompt(null);
    setShowInstallModal(false);
  };

  const handleCloseInstallModal = () => {
    // "Plus tard" → masqué uniquement pour cette session
    try { window.sessionStorage?.setItem('gp_install_dismissed_session', '1'); } catch (_) {}
    setShowInstallModal(false);
  };

  return (
    <MainLayout>
      <div className="bg-white">

        {/* ══════════════════════════════════════
            HERO
        ══════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* Install pill */}
          {deferredPrompt && !showInstallModal && (
            <div className="relative flex justify-center pt-5">
              <button
                type="button"
                onClick={() => handleInstallClick('home_header_button')}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-4 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 transition-colors"
              >
                <span>📱</span>
                Installer Grega Play sur ton écran d'accueil
              </button>
            </div>
          )}

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="flex flex-col lg:flex-row lg:items-center gap-12 lg:gap-16">

              {/* Left — copy */}
              <div className="lg:w-[52%] space-y-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Montage vidéo collaboratif
                </span>

                <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-[1.15] tracking-tight">
                  Créez des souvenirs{' '}
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                    vidéo collectifs
                  </span>{' '}
                  en quelques clics.
                </h1>

                <p className="text-base text-white/60 leading-relaxed max-w-lg">
                  Invitez vos proches à envoyer de courtes vidéos. Grega Play les assemble
                  automatiquement en un montage vertical prêt à partager — sans aucun logiciel.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link
                    to={primaryCtaLink}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-900/30 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {primaryCtaLabel}
                  </Link>
                  <Link
                    to={secondaryCtaLink}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold text-sm rounded-xl border border-white/10 transition-colors"
                  >
                    {secondaryCtaLabel}
                  </Link>
                </div>

                <p className="text-[11px] text-white/30 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Aucun logiciel à installer · Gratuit pour commencer
                </p>
              </div>

              {/* Right — video */}
              <div className="lg:w-[48%] flex justify-center lg:justify-end">
                <div className="w-full max-w-[280px] sm:max-w-[300px]">
                  <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-3 shadow-2xl shadow-black/40">
                    {/* Fake phone notch bar */}
                    <div className="flex items-center justify-between px-3 py-2 mb-2">
                      <span className="text-[10px] text-white/30 font-medium">Grega Play</span>
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      </div>
                    </div>
                    {/* 9:16 video */}
                    <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ paddingTop: '177.78%' }}>
                      {videoActive ? (
                        <iframe
                          src="https://www.youtube.com/embed/sCIDewhYZR0?si=kLfDvvltSHj2-pWO&autoplay=1"
                          title="Présentation de Grega Play"
                          className="absolute top-0 left-0 w-full h-full rounded-2xl"
                          style={{ border: 0 }}
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
                            alt="Aperçu vidéo Grega Play"
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
                              <svg className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                            <span className="text-[11px] text-white/80 font-medium">Voir la démo · 1 min</span>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FEATURES STRIP
        ══════════════════════════════════════ */}
        <section className="border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${f.bg} ${f.iconColor}`}>
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{f.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            COMMENT ÇA MARCHE
        ══════════════════════════════════════ */}
        <section className="bg-gray-50 border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

            <div className="text-center mb-12">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600">
                Comment ça marche
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">
                Trois étapes, c'est tout.
              </h2>
              <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                Pas de logiciel à apprendre, pas de montage à maîtriser.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Connector line (desktop only) */}
              <div className="hidden md:block absolute top-8 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gray-200" />

              {STEPS.map((step) => (
                <div key={step.n} className="relative bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                      {step.icon}
                    </div>
                    <span className="text-3xl font-black text-gray-100 select-none leading-none">{step.n}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{step.title}</h3>
                    <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            USE CASES
        ══════════════════════════════════════ */}
        <section>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

            <div className="text-center mb-12">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600">
                Cas d'usage
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">
                Pour chaque moment qui compte.
              </h2>
              <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                Quelques exemples où un montage collaboratif crée vraiment du lien.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {USE_CASES.map((uc) => (
                <Link
                  key={uc.title}
                  to={primaryCtaLink}
                  className="group bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:border-emerald-300 transition-all"
                >
                  {/* Image */}
                  <div className="relative h-40 bg-gray-100 overflow-hidden">
                    <picture>
                      <source srcSet={uc.imgWebp} type="image/webp" />
                      <img
                        src={uc.imgJpg}
                        alt={uc.imgAlt}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </picture>
                    <span className="absolute top-3 left-3 text-2xl leading-none">{uc.emoji}</span>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-sm font-semibold text-gray-900">{uc.title}</h3>
                    <p className="mt-1.5 text-xs text-gray-500 leading-relaxed flex-1">{uc.desc}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 group-hover:gap-2 transition-all">
                      {uc.cta}
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CTA FINAL
        ══════════════════════════════════════ */}
        <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Prêt à commencer ?
              </span>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                Lance ton premier montage collaboratif aujourd'hui.
              </h2>

              <p className="text-white/50 text-sm leading-relaxed">
                Crée un événement test en 2 minutes, invite quelques proches,
                et découvre comment Grega Play peut rendre tes moments inoubliables.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link
                  to={primaryCtaLink}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-900/30 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {primaryCtaLabel}
                </Link>
                {user && (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold text-sm rounded-xl border border-white/10 transition-colors"
                  >
                    Voir mes événements
                  </Link>
                )}
              </div>

              <p className="text-[11px] text-white/25">
                Aucune carte bancaire requise · Gratuit pour commencer
              </p>
            </div>
          </div>
        </section>

      </div>

      {/* ══════════════════════════════════════
          MODAL INSTALL PWA
      ══════════════════════════════════════ */}
      {showInstallModal && deferredPrompt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <button
              type="button"
              onClick={handleCloseInstallModal}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors"
              aria-label="Fermer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-2xl flex-shrink-0">
                📱
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-0.5">
                  Accès rapide
                </p>
                <h2 className="text-base font-bold text-gray-900 leading-tight">
                  Installe Grega Play sur ton écran d'accueil
                </h2>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleInstallClick('home_modal')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition-colors"
              >
                Installer l'application
              </button>
              <button
                type="button"
                onClick={handleCloseInstallModal}
                className="w-full py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-xl transition-colors border border-gray-200"
              >
                Plus tard
              </button>
            </div>

            <p className="mt-3 text-[10px] text-gray-400 text-center">
              Accessible sans connexion · Notifications de nouveaux clips
            </p>
          </div>
        </div>
      )}

    </MainLayout>
  );
};

export default HomePage;
