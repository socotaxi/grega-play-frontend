// src/pages/DashboardPage.jsx
import InstallAppButton from '../components/InstallAppButton';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import ActivityFeed from '../components/feed/ActivityFeed';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import { useAuth } from '../context/AuthContext';
import eventService from '../services/eventService';
import videoService from '../services/videoService';
import { toast } from 'react-toastify';
import supabase from '../lib/supabaseClient';

const VISITED_KEY = 'gp_visited_events_v1';

const safeParseJson = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const loadVisited = () => {
  const arr = safeParseJson(localStorage.getItem(VISITED_KEY), []);
  if (!Array.isArray(arr)) return [];
  // nettoyage minimal
  return arr
    .filter((x) => x && (x.public_code || x.event_id))
    .map((x) => ({
      event_id: x.event_id || null,
      public_code: x.public_code || null,
      title: x.title || 'Événement',
      theme: x.theme || '',
      visited_at: x.visited_at || null,
      cover_url: x.cover_url || null,
    }))
    .slice(0, 20);
};

const saveVisited = (arr) => {
  try {
    localStorage.setItem(VISITED_KEY, JSON.stringify(arr.slice(0, 20)));
  } catch {
    // ignore
  }
};

const removeVisitedByKey = (arr, item) => {
  const key = item.event_id ? `id:${item.event_id}` : `code:${item.public_code}`;
  return arr.filter((x) => {
    const k = x.event_id ? `id:${x.event_id}` : `code:${x.public_code}`;
    return k !== key;
  });
};

const DashboardPage = () => {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [eventStats, setEventStats] = useState({});
  const [ownerNamesByUserId, setOwnerNamesByUserId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [showStats, setShowStats] = useState(false);

  // ✅ NEW: map capabilities par event (source de vérité "déjà envoyé")
  const [capsByEventId, setCapsByEventId] = useState({});
  const [capsLoadingByEventId, setCapsLoadingByEventId] = useState({});

  // ✅ FIX: refs pour éviter que l'effet "caps" reboucle à cause des deps objets
  const capsByEventIdRef = useRef({});
  const capsLoadingByEventIdRef = useRef({});

  // ✅ NEW: événements visités (localStorage)
  const [visitedEvents, setVisitedEvents] = useState([]);
  const [joinLoadingKey, setJoinLoadingKey] = useState(null);

  useEffect(() => {
    capsByEventIdRef.current = capsByEventId;
  }, [capsByEventId]);

  useEffect(() => {
    capsLoadingByEventIdRef.current = capsLoadingByEventId;
  }, [capsLoadingByEventId]);

  // ✅ charger les visités au chargement (et à chaque retour dashboard)
  useEffect(() => {
    setVisitedEvents(loadVisited());
  }, []);

  // Compte Premium = is_premium_account (avec expiration) ou ancien is_premium
  const { isPremiumAccount, premiumAccountLabel } = useMemo(() => {
    if (!profile) {
      return {
        isPremiumAccount: false,
        premiumAccountLabel: '',
      };
    }

    const now = new Date();
    const rawExpires = profile.premium_account_expires_at;
    const expiresDate = rawExpires ? new Date(rawExpires) : null;

    const hasNewPremiumFlag =
      profile.is_premium_account === true && expiresDate && expiresDate > now;

    const hasLegacyPremiumFlag = profile.is_premium === true;

    const effectivePremium = hasNewPremiumFlag || hasLegacyPremiumFlag;

    let label = '';
    if (hasNewPremiumFlag && expiresDate) {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      label = `Compte Premium actif jusqu'au ${expiresDate.toLocaleDateString(
        'fr-FR',
        options,
      )}`;
    } else if (hasLegacyPremiumFlag) {
      label = 'Compte Premium (mode historique activé).';
    }

    return {
      isPremiumAccount: effectivePremium,
      premiumAccountLabel: label,
    };
  }, [profile]);

  const fetchEvents = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const dashboardEvents = await eventService.getDashboardEvents(
        user.id,
        user.email,
      );
      setEvents(dashboardEvents);
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(
        err?.message ||
          "Impossible de charger vos événements. Veuillez réessayer.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      fetchEvents();
    }
  }, [user, fetchEvents]);

  const handleDeleteEvent = async (eventId) => {
    if (
      !window.confirm(
        'Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.',
      )
    ) {
      return;
    }

    setDeletingEventId(eventId);

    try {
      await eventService.deleteEvent(eventId, user.id);
      setEvents((prevEvents) =>
        prevEvents.filter((event) => event.id !== eventId),
      );
      toast.success('Événement supprimé avec succès');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingEventId(null);
    }
  };

  const statusMap = useMemo(
    () => ({
      open: { color: 'bg-yellow-100 text-yellow-800', label: 'Ouvert' },
      ready: { color: 'bg-blue-100 text-blue-800', label: 'Prêt pour montage' },
      processing: { color: 'bg-purple-100 text-purple-800', label: 'En traitement' },
      done: { color: 'bg-green-100 text-green-800', label: 'Terminé' },
      canceled: { color: 'bg-red-100 text-red-800', label: 'Annulé' },
    }),
    [],
  );

  const getStatusInfo = useCallback(
    (status) => {
      return (
        statusMap[status] || {
          color: 'bg-gray-100 text-gray-800',
          label: 'Inconnu',
        }
      );
    },
    [statusMap],
  );

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  }, []);

  const isEventExpired = useCallback((event) => {
    if (!event?.deadline) return false;

    const now = new Date();
    const deadline = new Date(event.deadline);
    deadline.setHours(23, 59, 59, 999);

    if (event.status === 'done' || event.status === 'canceled') {
      return false;
    }

    return deadline < now;
  }, []);

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
  }, [events]);

  // ✅ NEW: charger les noms des créateurs
  useEffect(() => {
    const loadOwnerNames = async () => {
      if (!sortedEvents.length) return;

      const userIds = Array.from(
        new Set(
          sortedEvents
            .map((e) => e.user_id)
            .filter(Boolean)
            .filter((uid) => !ownerNamesByUserId[uid]),
        ),
      );

      if (userIds.length === 0) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (error) {
        console.error('Erreur chargement owner names:', error.message);
        return;
      }

      const next = {};
      (data || []).forEach((p) => {
        next[p.id] = p.full_name || null;
      });

      setOwnerNamesByUserId((prev) => ({ ...prev, ...next }));
    };

    loadOwnerNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedEvents]);

  // Charger les stats (invitations / vidéos / en attente)
  useEffect(() => {
    const loadStats = async () => {
      if (!sortedEvents.length) {
        setEventStats({});
        return;
      }

      try {
        const entries = await Promise.all(
          sortedEvents.map(async (evt) => {
            try {
              const stats = await eventService.getEventStats(evt.id);
              return [evt.id, stats];
            } catch (err) {
              console.error('Erreur stats event', evt.id, err);
              return [evt.id, null];
            }
          }),
        );

        setEventStats(Object.fromEntries(entries));
      } catch (err) {
        console.error('Erreur chargement stats events:', err);
      }
    };

    loadStats();
  }, [sortedEvents]);

  // ✅ NEW: Charger capabilities pour chaque event
  useEffect(() => {
    let cancelled = false;

    const loadCapsForEvents = async () => {
      if (!user?.id) return;

      if (!sortedEvents.length) {
        setCapsByEventId((prev) => (Object.keys(prev).length ? {} : prev));
        setCapsLoadingByEventId((prev) => (Object.keys(prev).length ? {} : prev));
        return;
      }

      const currentCaps = capsByEventIdRef.current || {};
      const currentLoading = capsLoadingByEventIdRef.current || {};

      const toLoad = sortedEvents
        .map((e) => e.id)
        .filter((id) => id && !(id in currentCaps) && currentLoading[id] !== true);

      if (toLoad.length === 0) return;

      setCapsLoadingByEventId((prev) => {
        const next = { ...prev };
        toLoad.forEach((id) => (next[id] = true));
        return next;
      });

      const results = await Promise.allSettled(
        toLoad.map((eventId) => videoService.getEventCapabilities(eventId)),
      );

      if (cancelled) return;

      setCapsByEventId((prev) => {
        const next = { ...prev };
        results.forEach((res, idx) => {
          const eventId = toLoad[idx];
          next[eventId] = res.status === 'fulfilled' ? res.value : null;
        });
        return next;
      });

      setCapsLoadingByEventId((prev) => {
        const next = { ...prev };
        toLoad.forEach((id) => (next[id] = false));
        return next;
      });
    };

    loadCapsForEvents();

    return () => {
      cancelled = true;
    };
  }, [user?.id, sortedEvents]);

  const getProgressColor = (pct) => {
    if (pct < 30) return 'bg-red-500';
    if (pct < 70) return 'bg-orange-400';
    return 'bg-emerald-500';
  };

  const globalStats = useMemo(() => {
    const result = {
      totalEvents: events.length,
      totalInvitations: 0,
      totalWithVideo: 0,
      totalPending: 0,
      completionPct: 0,
    };

    events.forEach((evt) => {
      const stats = eventStats[evt.id];
      if (!stats) return;

      if (typeof stats.totalInvitations === 'number') {
        result.totalInvitations += stats.totalInvitations;
      }
      if (typeof stats.totalWithVideo === 'number') {
        result.totalWithVideo += stats.totalWithVideo;
      }
      if (typeof stats.totalPending === 'number') {
        result.totalPending += stats.totalPending;
      }
    });

    if (result.totalInvitations > 0) {
      result.completionPct = Math.round(
        (result.totalWithVideo / result.totalInvitations) * 100,
      );
    }

    return result;
  }, [events, eventStats]);

  const statsByTheme = useMemo(() => {
    const map = {};

    events.forEach((evt) => {
      const themeKey = evt.theme || 'Autre';
      if (!map[themeKey]) {
        map[themeKey] = {
          theme: themeKey,
          eventsCount: 0,
          totalInvitations: 0,
          totalWithVideo: 0,
          totalPending: 0,
        };
      }

      map[themeKey].eventsCount += 1;

      const stats = eventStats[evt.id];
      if (!stats) return;

      if (typeof stats.totalInvitations === 'number') {
        map[themeKey].totalInvitations += stats.totalInvitations;
      }
      if (typeof stats.totalWithVideo === 'number') {
        map[themeKey].totalWithVideo += stats.totalWithVideo;
      }
      if (typeof stats.totalPending === 'number') {
        map[themeKey].totalPending += stats.totalPending;
      }
    });

    return Object.values(map)
      .map((row) => ({
        ...row,
        completionPct:
          row.totalInvitations > 0
            ? Math.round((row.totalWithVideo / row.totalInvitations) * 100)
            : 0,
      }))
      .sort((a, b) => b.eventsCount - a.eventsCount);
  }, [events, eventStats]);

  // ✅ NEW: calcul des "visités" qui ne sont pas dans le dashboard
  const eventsIdSet = useMemo(() => new Set(events.map((e) => e.id)), [events]);

  const missingVisited = useMemo(() => {
    const list = visitedEvents || [];
    return list
      .filter((v) => {
        if (v.event_id) return !eventsIdSet.has(v.event_id);
        return true;
      })
      .slice(0, 6);
  }, [visitedEvents, eventsIdSet]);

  const handleJoinVisited = useCallback(
    async (item) => {
      if (!user?.id) {
        toast.error('Tu dois être connecté.');
        return;
      }
      if (!item?.public_code) {
        toast.error("Impossible de rejoindre : code public manquant.");
        return;
      }

      const key = item.event_id ? `id:${item.event_id}` : `code:${item.public_code}`;
      setJoinLoadingKey(key);

      try {
        const { data, error } = await supabase.rpc('join_public_event', {
          p_public_code: item.public_code,
        });

        if (error) {
          console.error('join_public_event error:', error);
          toast.error(error.message || "Impossible de rejoindre l'événement.");
          return;
        }

        toast.success("Événement rejoint. Il est maintenant dans ton dashboard.");

        await fetchEvents();

        setVisitedEvents((prev) => {
          const next = removeVisitedByKey(prev || [], item);
          saveVisited(next);
          return next;
        });

        void data;
      } catch (e) {
        console.error(e);
        toast.error("Impossible de rejoindre l'événement.");
      } finally {
        setJoinLoadingKey(null);
      }
    },
    [user?.id, fetchEvents],
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-80px)] bg-gray-50">
          <div className="py-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <Loading />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          {/* En-tête */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Tableau de bord
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Bienvenue,{' '}
                {profile?.full_name ||
                  user?.user_metadata?.full_name ||
                  user?.email}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Gère tes projets vidéo, invite des participants et suis
                l&apos;avancement de tes montages Grega Play.
              </p>
              {premiumAccountLabel && (
                <p className="mt-2 text-xs text-amber-700 bg-amber-50 inline-flex px-3 py-1 rounded-full border border-amber-200">
                  {premiumAccountLabel}
                </p>
              )}
            </div>

            <div className="flex flex-col items-stretch md:items-end gap-3">
              <InstallAppButton />
              <Link to="/create-event" className="w-full md:w-auto">
                <Button className="w-full md:w-auto py-2.5 text-sm font-semibold inline-flex items-center justify-center">
                  <svg
                    className="mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Créer un nouvel événement
                </Button>
              </Link>
            </div>
          </div>

          {/* Bloc erreur éventuel */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Bouton stats → premium uniquement */}
          {isPremiumAccount && events.length > 0 && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowStats((prev) => !prev)}
                className="text-xs md:text-sm px-4 py-2"
              >
                {showStats
                  ? 'Masquer les statistiques'
                  : 'Afficher les statistiques de participation'}
              </Button>
            </div>
          )}

          {/* Statistiques globales */}
          {isPremiumAccount && showStats && events.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4">
                <p className="text-xs text-gray-500">Événements</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {globalStats.totalEvents}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  Nombre total d&apos;événements que tu as créés ou gères.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4">
                <p className="text-xs text-gray-500">Vidéos reçues</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {globalStats.totalWithVideo}
                  {globalStats.totalInvitations > 0 && (
                    <span className="ml-2 text-sm font-medium text-gray-500">
                      / {globalStats.totalInvitations}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  Clips reçus sur l&apos;ensemble de tes événements.
                </p>
                {globalStats.totalInvitations > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                      <span>Taux de complétion</span>
                      <span className="font-medium text-gray-700">
                        {globalStats.completionPct}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${getProgressColor(
                          globalStats.completionPct,
                        )} transition-all`}
                        style={{ width: `${globalStats.completionPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4">
                <p className="text-xs text-gray-500">En attente de vidéo</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {globalStats.totalPending}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  Participants invités qui n&apos;ont pas encore envoyé de clip.
                </p>
              </div>
            </div>
          )}

          {/* Stats par type */}
          {isPremiumAccount && showStats && events.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Performance par type d&apos;événement
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Compare les types d&apos;événements pour voir où Grega Play
                    performe le mieux.
                  </p>
                </div>
              </div>

              <div className="mt-2 overflow-x-auto">
                {statsByTheme.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4">
                    Aucune statistique disponible pour l&apos;instant.
                  </p>
                ) : (
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-[11px] text-gray-500">
                        <th className="py-2 pr-4 text-left font-medium">
                          Type d&apos;événement
                        </th>
                        <th className="py-2 px-2 text-right font-medium">
                          Événements
                        </th>
                        <th className="py-2 px-2 text-right font-medium">
                          Invités
                        </th>
                        <th className="py-2 px-2 text-right font-medium">
                          Vidéos reçues
                        </th>
                        <th className="py-2 pl-2 text-right font-medium">
                          Taux de complétion
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsByTheme.map((row) => (
                        <tr
                          key={row.theme}
                          className="border-b border-gray-50 hover:bg-gray-50/50"
                        >
                          <td className="py-2 pr-4 text-left text-gray-800">
                            {row.theme}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-700">
                            {row.eventsCount}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-700">
                            {row.totalInvitations}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-700">
                            {row.totalWithVideo}
                          </td>
                          <td className="py-2 pl-2 text-right text-gray-700">
                            {row.completionPct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Contenu principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne principale : événements */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Mes événements
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Retrouve tous tes projets vidéo créés ou reçus.
                    </p>
                  </div>
                  {sortedEvents.length > 0 && (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1">
                      {sortedEvents.length} événement
                      {sortedEvents.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="px-5 py-4">
                  {/* ... TON BLOC "Mes événements" inchangé ... */}
                  {events.length === 0 ? (
                    <div className="py-8 flex flex-col items-center text-center">
                      <h3 className="mt-3 text-sm font-semibold text-gray-800">
                        Aucun événement pour l&apos;instant
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 max-w-xs">
                        Crée ton premier événement pour collecter des vidéos et
                        générer une surprise.
                      </p>
                      <Link to="/create-event" className="mt-4">
                        <Button className="text-sm px-4 py-2">
                          + Créer un événement
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sortedEvents.map((event) => {
                        const status = getStatusInfo(event.status);
                        const hasFinalVideo = !!event.final_video_url;
                        const isPublicEvent = event.is_public === true;

                        const isOwner = event.user_id === user?.id;

                        const ownerHasPremiumAccount =
                          isPremiumAccount && isOwner;
                        const isPremiumEvent = event.is_premium_event === true;
                        const isEffectivePremiumEvent =
                          isPremiumEvent || ownerHasPremiumAccount;

                        const publicUrl = event.public_code
                          ? `${window.location.origin}/e/${event.public_code}`
                          : '';

                        const stats = eventStats[event.id];
                        const pendingCount =
                          typeof stats?.totalPending === 'number'
                            ? stats.totalPending
                            : null;

                        const totalInvitations =
                          typeof stats?.totalInvitations === 'number'
                            ? stats.totalInvitations
                            : 0;
                        const totalWithVideo =
                          typeof stats?.totalWithVideo === 'number'
                            ? stats.totalWithVideo
                            : 0;

                        const progressPct =
                          totalInvitations > 0
                            ? Math.round(
                                (totalWithVideo / totalInvitations) * 100,
                              )
                            : 0;

                        const barColorClass = getProgressColor(progressPct);

                        const creatorName =
                          event.owner_name ||
                          ownerNamesByUserId[event.user_id] ||
                          'Un organisateur';

                        const caps = capsByEventId[event.id] || null;
                        const capsLoading = !!capsLoadingByEventId[event.id];

                        const latestVideo = caps?.state?.latestVideo || null;
                        const hasReachedUploadLimit = Boolean(
                          caps?.state?.hasReachedUploadLimit,
                        );

                        const showAlreadySentBadge = !isOwner && !!latestVideo;
                        const showLimitReachedBadge =
                          !isOwner && hasReachedUploadLimit;

                        return (
                          <div
                            key={event.id}
                            className="rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 shadow-sm px-4 py-4 transition-colors"
                          >
                            {/* ... ton rendu de carte inchangé ... */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-start gap-3">
                                  <Link
                                    to={`/events/${event.id}`}
                                    className="flex-shrink-0"
                                  >
                                    {(() => {
                                      const url = event.media_url || '';
                                      const lower = url.toLowerCase();

                                      if (lower.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                                        return (
                                          <img
                                            src={url}
                                            alt="Visuel événement"
                                            className="w-20 h-16 object-cover rounded-md border border-gray-200"
                                          />
                                        );
                                      }

                                      if (lower.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
                                        return (
                                          <img
                                            src="/default-video-thumbnail.jpg"
                                            alt="Miniature vidéo"
                                            className="w-20 h-16 object-cover rounded-md border border-gray-200"
                                          />
                                        );
                                      }

                                      if (lower.match(/\.(mp3|wav|ogg)$/i)) {
                                        return (
                                          <img
                                            src="/default-audio-thumbnail.jpg"
                                            alt="Miniature audio"
                                            className="w-20 h-16 object-cover rounded-md border border-gray-200"
                                          />
                                        );
                                      }

                                      return (
                                        <img
                                          src="/default-placeholder.jpg"
                                          alt="Aucun visuel"
                                          className="w-20 h-16 object-cover rounded-md border border-gray-200"
                                        />
                                      );
                                    })()}
                                  </Link>

                                  <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-gray-900">
                                      {event.title}
                                    </h3>

                                    <p className="text-xs text-gray-500">
                                      Créé par{' '}
                                      <span className="font-medium text-gray-700">
                                        {creatorName}
                                      </span>
                                    </p>

                                    <p className="text-xs text-gray-500">
                                      le {formatDate(event.created_at)}
                                    </p>

                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <span
                                        className={`inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full ${status.color}`}
                                      >
                                        {status.label}
                                      </span>

                                      <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-gray-100 text-gray-700">
                                        {isPublicEvent ? 'Public' : 'Privé'}
                                      </span>

                                      {isEventExpired(event) && (
                                        <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-red-100 text-red-800">
                                          Expiré
                                        </span>
                                      )}

                                      {hasFinalVideo && (
                                        <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-purple-100 text-purple-800">
                                          Vidéo finale prête
                                        </span>
                                      )}

                                      {isEffectivePremiumEvent && (
                                        <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-violet-100 text-violet-800">
                                          Premium
                                        </span>
                                      )}

                                      {capsLoading && !isOwner && (
                                        <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-gray-100 text-gray-600">
                                          Vérification...
                                        </span>
                                      )}

                                      {showAlreadySentBadge && (
                                        <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          Vidéo envoyée
                                        </span>
                                      )}

                                      {showLimitReachedBadge && (
                                        <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                          Limite atteinte
                                        </span>
                                      )}

                                      {isOwner && pendingCount !== null && (
                                        <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-orange-50 text-orange-700">
                                          {pendingCount} en attente de vidéo
                                        </span>
                                      )}
                                    </div>

                                    {totalInvitations > 0 && (
                                      <div className="mt-3">
                                        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                                          <span>Vidéos reçues</span>
                                          <span className="font-medium text-gray-700">
                                            {totalWithVideo} / {totalInvitations}{' '}
                                            ({progressPct}%)
                                          </span>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                                          <div
                                            className={`h-2 rounded-full ${barColorClass} transition-all`}
                                            style={{ width: `${progressPct}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {isOwner && event.public_code && (
                                      <div className="mt-3">
                                        <label className="block text-[11px] font-medium text-gray-500 mb-1">
                                          Lien de partage
                                        </label>
<div className="flex flex-col gap-2">
  {/* Ligne 1 : champ + copier (compact, type app) */}
  <div className="flex flex-wrap items-center gap-2">
    <input
      type="text"
      readOnly
      value={publicUrl}
      className="flex-1 min-w-0 text-[11px] border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700"
    />

    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          .writeText(publicUrl)
          .then(() => {
            toast.success('Lien copié dans le presse-papiers');
          })
          .catch(() => {
            toast.error('Impossible de copier le lien');
          });
      }}
      className="shrink-0 inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-[11px] font-medium rounded-md bg-white hover:bg-gray-50 text-gray-700"
    >
      Copier
    </button>
  </div>

  {/* Ligne 2 : actions centrées (effet native app) */}
  <div className="flex justify-center sm:justify-start">
    <button
      type="button"
      onClick={() => {
        const message = `Participe à mon événement Grega Play : ${publicUrl}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }}
      className="inline-flex items-center justify-center px-4 py-2 text-[11px] font-semibold rounded-md bg-green-500 hover:bg-green-600 text-white"
    >
      Partager sur WhatsApp
    </button>
  </div>
</div>

                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex sm:flex-col gap-2 sm:items-end">
                                {isOwner && (
                                  <>
                                    <Link
                                      to={`/events/${event.id}/manage-participants`}
                                      className="inline-flex items-center px-3 py-1.5 border border-emerald-600 text-emerald-600 hover:bg-emerald-50 text-xs font-medium rounded-lg"
                                    >
                                      Inviter
                                    </Link>

                                    <button
                                      onClick={() => handleDeleteEvent(event.id)}
                                      disabled={deletingEventId === event.id}
                                      className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium rounded-lg disabled:opacity-60"
                                    >
                                      {deletingEventId === event.id
                                        ? 'Suppression...'
                                        : 'Supprimer'}
                                    </button>
                                  </>
                                )}

                                {!isOwner &&
                                  caps &&
                                  caps?.actions?.canUploadVideo === true &&
                                  caps?.state?.hasReachedUploadLimit === false && (
                                    <Link
                                      to={`/events/${event.id}/submit`}
                                      className="inline-flex items-center px-3 py-1.5 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 text-xs font-medium rounded-lg"
                                    >
                                      Envoyer ma vidéo
                                    </Link>
                                  )}

                                <Link
                                  to={`/events/${event.id}`}
                                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium rounded-lg"
                                >
                                  Voir
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ DÉPLACÉ ICI : Encadré "Événements visités" APRÈS "Mes événements" */}
              {missingVisited.length > 0 && (
                <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">
                        Événements visités
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Tu as visité ces événements publics. Tu peux les ouvrir, ou décider de les rejoindre pour qu’ils apparaissent dans ton dashboard.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVisitedEvents([]);
                        saveVisited([]);
                        toast.info('Liste des événements visités vidée.');
                      }}
                      className="text-[11px] font-medium text-gray-500 hover:text-gray-700"
                    >
                      Vider
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {missingVisited.map((v) => {
                      const key = v.event_id ? `id:${v.event_id}` : `code:${v.public_code}`;
                      const joining = joinLoadingKey === key;

                      const openUrl = v.public_code
                        ? `/e/${v.public_code}`
                        : v.event_id
                        ? `/events/${v.event_id}`
                        : '#';

                      return (
                        <div
                          key={key}
                          className="rounded-xl border border-gray-200 bg-gray-50/40 px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {v.title || 'Événement'}
                              </p>
                              <p className="text-[11px] text-gray-500">
                                {v.theme ? v.theme : 'Événement public'}
                                {v.visited_at ? ` • visité le ${new Date(v.visited_at).toLocaleDateString('fr-FR')}` : ''}
                              </p>
                            </div>

                            <div className="flex flex-col items-center sm:flex-row sm:items-center gap-2">

                              <Link
                                to={openUrl}
                                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Ouvrir
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleJoinVisited(v)}
                                disabled={joining}
                                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-60"
                              >
                                {joining ? 'Rejoindre...' : 'Rejoindre'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full">
                <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Activité récente
                  </h2>
                </div>
                <div className="px-3 py-3">
                  {sortedEvents.length > 0 ? (
                    <ActivityFeed eventId={sortedEvents[0].id} />
                  ) : (
                    <p className="text-xs text-gray-500 px-2 py-4">
                      Crée un événement pour voir ici l&apos;activité de ton
                      projet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
