// src/pages/PremiumPage.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/AuthContext";
import eventService from "../services/eventService";
import { toast } from "react-toastify";
import {
  HiSparkles,
  HiFilm,
  HiLightningBolt,
  HiCheck,
  HiX,
  HiChevronDown,
  HiArrowRight,
  HiUsers,
  HiBriefcase,
  HiClock,
} from "react-icons/hi";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_KEY = import.meta.env.VITE_BACKEND_API_KEY;

const PremiumPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [boostTab, setBoostTab] = useState("account"); // "account" | "event"
  const [accountDuration, setAccountDuration] = useState("1w");
  const [eventDuration, setEventDuration] = useState("3d");
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [loadingBoostAccount, setLoadingBoostAccount] = useState(false);
  const [loadingBoostEvent, setLoadingBoostEvent] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const { isPremiumAccount, premiumAccountLabel } = useMemo(() => {
    if (!profile) return { isPremiumAccount: false, premiumAccountLabel: "" };
    const rawExpires = profile.premium_account_expires_at;
    const expiresDate = rawExpires ? new Date(rawExpires) : null;
    const effectivePremium = Boolean(
      profile.is_premium_account || profile.is_premium
    );
    let label = "";
    if (effectivePremium && expiresDate) {
      label = `Premium jusqu'au ${expiresDate.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}`;
    } else if (effectivePremium) {
      label = "Compte actuellement Premium";
    }
    return { isPremiumAccount: effectivePremium, premiumAccountLabel: label };
  }, [profile]);

  useEffect(() => {
    if (!user?.id) return;
    const loadEvents = async () => {
      try {
        setLoadingEvents(true);
        setEventsError(null);
        const dashboardEvents = await eventService.getDashboardEvents(
          user.id,
          user.email
        );
        setEvents(dashboardEvents || []);
      } catch (err) {
        setEventsError(
          err?.message || "Impossible de charger tes événements."
        );
      } finally {
        setLoadingEvents(false);
      }
    };
    loadEvents();
  }, [user]);

  const handleBoostAccount = async () => {
    if (!user?.id) {
      toast.error("Connecte-toi pour activer le Premium.");
      return;
    }
    if (!API_BASE_URL || !API_KEY) {
      toast.error("Configuration backend manquante.");
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
        body: JSON.stringify({ userId: user.id, duration: accountDuration }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch (_) {}
      if (!res.ok || data.error) {
        toast.error(data.error || "Impossible d'activer le Premium.");
        return;
      }
      toast.success(data.message || "Compte boosté en Premium !");
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast.error("Erreur lors de l'activation.");
    } finally {
      setLoadingBoostAccount(false);
    }
  };

  const handleBoostEvent = async () => {
    if (!user?.id) {
      toast.error("Connecte-toi pour booster un événement.");
      return;
    }
    if (isPremiumAccount) {
      toast.info("Ton compte est déjà Premium !");
      return;
    }
    if (!selectedEventId) {
      toast.error("Sélectionne un événement.");
      return;
    }
    if (!API_BASE_URL || !API_KEY) {
      toast.error("Configuration backend manquante.");
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
        toast.error(data.error || "Impossible de booster cet événement.");
        return;
      }
      toast.success(data.message || "Événement boosté en Premium !");
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast.error("Erreur lors de l'activation.");
    } finally {
      setLoadingBoostEvent(false);
    }
  };

  const accountDurationOptions = [
    { label: "1 semaine", value: "1w" },
    { label: "1 mois", value: "1m" },
  ];

  const eventDurationOptions = [
    { label: "24 h", value: "24h" },
    { label: "3 jours", value: "3d" },
    { label: "7 jours", value: "7d" },
  ];

  const canUseEventBoost = !isPremiumAccount && events.length > 0;

  const handleMainCta = () => {
    if (boostTab === "account") handleBoostAccount();
    else handleBoostEvent();
  };

  const isMainCtaLoading =
    boostTab === "account" ? loadingBoostAccount : loadingBoostEvent;

  const isMainCtaDisabled =
    boostTab === "account"
      ? loadingBoostAccount || isPremiumAccount
      : loadingBoostEvent || !canUseEventBoost || !selectedEventId;

  const benefits = [
    {
      icon: HiFilm,
      color: "bg-purple-100 text-purple-600",
      title: "Vidéos illimitées",
      desc: "Fini la limite de 5 clips. Collecte autant que tu veux.",
    },
    {
      icon: HiLightningBolt,
      color: "bg-amber-100 text-amber-600",
      title: "Traitement prioritaire",
      desc: "Ta vidéo finale est générée en tête de file.",
    },
    {
      icon: HiSparkles,
      color: "bg-emerald-100 text-emerald-600",
      title: "Meilleures transitions",
      desc: "Transitions fluides pour un rendu cinématographique.",
    },
    {
      icon: HiClock,
      color: "bg-blue-100 text-blue-600",
      title: "Clips plus longs",
      desc: "Jusqu'à 60 s par clip (30 s en gratuit).",
    },
  ];

  const faqItems = [
    {
      question: "Quelle est la différence entre gratuit et Premium ?",
      answer:
        "La version gratuite te permet de faire des petits événements (5 clips max, 30 s/clip). Premium débloque les clips illimités, plus de durée, de meilleures transitions et une priorité de traitement.",
    },
    {
      question: "Est-ce que je paye par événement ou par abonnement ?",
      answer:
        "Tu choisis : boost d'un événement spécifique, ou boost de tout ton compte pendant une durée donnée.",
    },
    {
      question: "Que deviennent mes événements gratuits si je passe Premium ?",
      answer:
        "Tes événements gratuits restent accessibles comme avant. Le boost Premium s'applique à tes nouveaux événements créés pendant la période active.",
    },
    {
      question: "Les participants doivent-ils payer ?",
      answer:
        "Non. Seul l'organisateur choisit le mode Premium. Les invités participent toujours gratuitement.",
    },
    {
      question: "Puis-je revenir à la version gratuite ?",
      answer:
        "Oui. Le Premium n'est pas une obligation permanente — tu l'actives quand tu en as besoin.",
    },
  ];

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-64px)] bg-gray-50 pb-28 md:pb-0">

        {/* ── HERO ── */}
        <section className="bg-gradient-to-br from-[#0f0720] via-[#1e0d3e] to-[#0b0518] px-4 py-12 sm:py-16 text-white">
          <div className="max-w-xl mx-auto text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold border border-amber-400/30 mb-5">
              <HiSparkles className="w-3.5 h-3.5" />
              Lancement — 100 % gratuit pendant la phase bêta
            </span>

            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight">
              Transforme tes moments en{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                souvenirs inoubliables
              </span>
            </h1>

            <p className="mt-4 text-sm sm:text-base text-purple-200 leading-relaxed">
              Grega Play Premium enlève toutes les limites. Plus de clips,
              meilleure qualité, montage prioritaire — pour les moments qui
              comptent vraiment.
            </p>

            {isPremiumAccount ? (
              <div className="mt-7 flex flex-col items-center gap-3">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-semibold border border-emerald-500/30">
                  <HiCheck className="w-4 h-4" />
                  {premiumAccountLabel || "Compte Premium actif"}
                </span>
                <button
                  onClick={() => navigate("/create-event")}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-full transition-colors"
                >
                  Créer un événement Premium{" "}
                  <HiArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap justify-center items-center gap-3">
                <span className="text-sm text-purple-300 line-through">
                  5 USD
                </span>
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-bold border border-white/20">
                  Actuellement gratuit
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── CONTENU ── */}
        <div className="max-w-xl mx-auto px-4 py-8 sm:py-10 space-y-10">

          {/* ── BOOST ── */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-1">
              Active ton boost Premium
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Choisis de booster tout ton compte ou un événement précis.
            </p>

            {/* Tab toggle */}
            <div className="flex bg-gray-100 rounded-full p-1 mb-5">
              <button
                type="button"
                onClick={() => setBoostTab("account")}
                className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  boostTab === "account"
                    ? "bg-white text-purple-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                🚀 Mon compte
              </button>
              <button
                type="button"
                onClick={() => setBoostTab("event")}
                className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  boostTab === "event"
                    ? "bg-white text-purple-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                🎉 Un événement
              </button>
            </div>

            <AnimatePresence mode="wait">
              {boostTab === "account" ? (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-5"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Tous tes événements passent Premium
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Idéal si tu organises régulièrement des événements. Le
                      boost s'applique à tous tes événements présents et
                      futurs pendant la durée choisie.
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      Durée du boost
                    </p>
                    <div className="flex gap-2">
                      {accountDurationOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAccountDuration(opt.value)}
                          disabled={isPremiumAccount}
                          className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                            accountDuration === opt.value
                              ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                              : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isPremiumAccount && (
                    <p className="text-xs text-emerald-600 font-medium">
                      ✅ {premiumAccountLabel}
                    </p>
                  )}

                  <p className="text-[11px] text-gray-400">
                    Activation gratuite pendant la phase de lancement.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="event"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-5"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Un événement précis passe Premium
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Parfait pour un anniversaire, un mariage ou un départ
                      important, sans toucher au reste de ton compte.
                    </p>
                  </div>

                  {isPremiumAccount ? (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                      Ton compte Premium est actif — tous tes événements en
                      bénéficient déjà.
                    </p>
                  ) : loadingEvents ? (
                    <p className="text-xs text-gray-500 animate-pulse">
                      Chargement de tes événements...
                    </p>
                  ) : eventsError ? (
                    <p className="text-xs text-red-500">{eventsError}</p>
                  ) : events.length === 0 ? (
                    <div className="text-center py-4 space-y-2">
                      <p className="text-sm text-gray-500">
                        Tu n&apos;as pas encore d&apos;événement.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/create-event")}
                        className="text-sm font-semibold text-purple-600 hover:text-purple-700"
                      >
                        Créer un premier événement →
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          Choisir l&apos;événement
                        </p>
                        <select
                          value={selectedEventId}
                          onChange={(e) => setSelectedEventId(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                        >
                          <option value="">
                            Sélectionne un événement...
                          </option>
                          {events.map((ev) => (
                            <option key={ev.id} value={ev.id}>
                              {ev.title || "Événement sans titre"}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          Durée du boost
                        </p>
                        <div className="flex gap-2">
                          {eventDurationOptions.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setEventDuration(opt.value)}
                              className={`flex-1 py-3 rounded-xl border text-xs font-medium transition-all ${
                                eventDuration === opt.value
                                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                                  : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-400">
                        Activation gratuite pendant la phase de lancement.
                      </p>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA desktop uniquement */}
            <div className="hidden md:block mt-4">
              <button
                type="button"
                onClick={handleMainCta}
                disabled={isMainCtaDisabled}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMainCtaLoading
                  ? "Activation en cours..."
                  : boostTab === "account"
                  ? isPremiumAccount
                    ? "Compte déjà Premium ✓"
                    : "Activer le boost compte — Gratuit"
                  : "Activer le boost événement — Gratuit"}
              </button>
            </div>
          </section>

          {/* ── BÉNÉFICES ── */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-1">
              Ce que tu gagnes avec Premium
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Premium augmente l&apos;impact émotionnel de ta vidéo finale.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {benefits.map((b) => (
                <div
                  key={b.title}
                  className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-3"
                >
                  <span
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${b.color}`}
                  >
                    <b.icon className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {b.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                      {b.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── COMPARAISON ── */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-1">
              Gratuit ou Premium ?
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Un aperçu rapide de ce qui change concrètement.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Colonne Gratuit */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <p className="text-sm font-bold text-gray-600 mb-4">
                  Gratuit
                </p>
                <ul className="space-y-3">
                  {[
                    "5 vidéos max",
                    "30 s par clip",
                    "1 transition",
                    "File standard",
                    "Pas de musique",
                    "Logo Grega Play",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <HiX className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-gray-500">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Colonne Premium */}
              <div className="bg-gradient-to-b from-purple-50 to-white rounded-2xl border border-purple-200 p-4 shadow-sm">
                <p className="text-sm font-bold text-purple-700 mb-4">
                  Premium ✨
                </p>
                <ul className="space-y-3">
                  {[
                    "Vidéos illimitées",
                    "60 s par clip",
                    "Transitions au choix",
                    "File prioritaire",
                    "Musique signature",
                    "Personnalisation",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <HiCheck className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-gray-800 font-medium">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ── POUR QUI ── */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-5">
              Pour qui ?
            </h2>
            <div className="space-y-3">
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex-shrink-0">
                  <HiUsers className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Familles & amis
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                    Anniversaires, mariages, naissances — collectez le maximum
                    de souvenirs vidéo sans limite.
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex-shrink-0">
                  <HiBriefcase className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Équipes & entreprises
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                    Départs, team building, challenges — Premium soigne
                    l&apos;image et la qualité du rendu final.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="pb-2">
            <h2 className="text-base font-bold text-gray-900 mb-5">
              Questions fréquentes
            </h2>
            <div className="space-y-2">
              {faqItems.map((item, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-4 text-left gap-3"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {item.question}
                    </span>
                    <HiChevronDown
                      className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                        openFaq === i ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === i && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
                          {item.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── CTA STICKY MOBILE ── */}
        <div className="md:hidden fixed inset-x-0 bottom-16 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 pt-3 pb-3">
          <button
            type="button"
            onClick={handleMainCta}
            disabled={isMainCtaDisabled}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
          >
            {isMainCtaLoading
              ? "Activation en cours..."
              : boostTab === "account"
              ? isPremiumAccount
                ? "Compte déjà Premium ✓"
                : "Activer le boost compte — Gratuit"
              : selectedEventId
              ? "Activer le boost événement — Gratuit"
              : "Sélectionne un événement d'abord"}
          </button>
        </div>
      </div>
    </MainLayout>
  );
};

export default PremiumPage;
