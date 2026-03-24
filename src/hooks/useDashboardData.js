import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import eventService from '../services/eventService';
import videoService from '../services/videoService';
import supabase from '../lib/supabaseClient';
import { toast } from 'react-toastify';
import { loadVisited, saveVisited, removeVisitedByKey } from '../utils/visitedEvents';

export const useDashboardData = () => {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [eventStats, setEventStats] = useState({});
  const [ownerNamesByUserId, setOwnerNamesByUserId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [capsByEventId, setCapsByEventId] = useState({});
  const [capsLoadingByEventId, setCapsLoadingByEventId] = useState({});
  const capsByEventIdRef = useRef({});
  const capsLoadingByEventIdRef = useRef({});
  const [visitedEvents, setVisitedEvents] = useState([]);
  const [joinLoadingKey, setJoinLoadingKey] = useState(null);

  useEffect(() => { capsByEventIdRef.current = capsByEventId; }, [capsByEventId]);
  useEffect(() => { capsLoadingByEventIdRef.current = capsLoadingByEventId; }, [capsLoadingByEventId]);

  useEffect(() => {
    setVisitedEvents(loadVisited());
  }, []);

  const { isPremiumAccount, premiumAccountLabel } = useMemo(() => {
    if (!profile) return { isPremiumAccount: false, premiumAccountLabel: '' };
    const now = new Date();
    const expiresDate = profile.premium_account_expires_at ? new Date(profile.premium_account_expires_at) : null;
    const hasNewPremiumFlag = profile.is_premium_account === true && expiresDate && expiresDate > now;
    const hasLegacyPremiumFlag = profile.is_premium === true;
    const effectivePremium = hasNewPremiumFlag || hasLegacyPremiumFlag;
    let label = '';
    if (hasNewPremiumFlag && expiresDate) {
      label = `Compte Premium actif jusqu'au ${expiresDate.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}`;
    } else if (hasLegacyPremiumFlag) {
      label = 'Compte Premium (mode historique activé).';
    }
    return { isPremiumAccount: effectivePremium, premiumAccountLabel: label };
  }, [profile]);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const dashboardEvents = await eventService.getDashboardEvents(user.id, user.email);
      setEvents(dashboardEvents);
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err?.message || "Impossible de charger vos événements. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) fetchEvents();
  }, [user, fetchEvents]);

  const handleDeleteEvent = useCallback(async (eventId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.')) return;
    setDeletingEventId(eventId);
    try {
      await eventService.deleteEvent(eventId, user.id);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast.success('Événement supprimé avec succès');
    } catch (err) {
      console.error('Error deleting event:', err);
      toast.error(err.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingEventId(null);
    }
  }, [user]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [events]);

  useEffect(() => {
    const loadOwnerNames = async () => {
      if (!sortedEvents.length) return;
      const userIds = Array.from(
        new Set(sortedEvents.map((e) => e.user_id).filter(Boolean).filter((uid) => !ownerNamesByUserId[uid]))
      );
      if (userIds.length === 0) return;
      const { data, error: dbError } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      if (dbError) { console.error('Erreur chargement owner names:', dbError.message); return; }
      const next = {};
      (data || []).forEach((p) => { next[p.id] = p.full_name || null; });
      setOwnerNamesByUserId((prev) => ({ ...prev, ...next }));
    };
    loadOwnerNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedEvents]);

  useEffect(() => {
    const loadStats = async () => {
      if (!sortedEvents.length) { setEventStats({}); return; }
      try {
        const ids = sortedEvents.map((e) => e.id);
        const batchResult = await eventService.getBatchEventStats(ids);
        const entries = sortedEvents.map((e) => {
          const s = batchResult[e.id] || {};
          return [e.id, {
            totalInvitations: s.totalInvitations ?? 0,
            totalWithVideo: s.totalWithVideo ?? s.videos_count ?? 0,
            totalPending: s.totalPending ?? 0,
          }];
        });
        setEventStats(Object.fromEntries(entries));
      } catch (err) {
        console.error('Erreur chargement stats events:', err);
      }
    };
    loadStats();
  }, [sortedEvents]);

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
      // Les capabilities ne sont utiles que pour les événements dont l'utilisateur n'est PAS le propriétaire
      // (bouton "Envoyer ma vidéo", badges "Vidéo envoyée" / "Limite atteinte")
      const toLoad = sortedEvents
        .filter((e) => e.user_id !== user?.id)
        .map((e) => e.id)
        .filter((id) => id && !(id in currentCaps) && currentLoading[id] !== true);
      if (toLoad.length === 0) return;
      setCapsLoadingByEventId((prev) => {
        const next = { ...prev };
        toLoad.forEach((id) => (next[id] = true));
        return next;
      });
      let batchResults = {};
      try {
        batchResults = await videoService.getBatchEventCapabilities(toLoad);
      } catch {
        // en cas d'erreur, on met null pour chaque event
        toLoad.forEach((id) => { batchResults[id] = null; });
      }
      if (cancelled) return;
      setCapsByEventId((prev) => ({ ...prev, ...batchResults }));
      setCapsLoadingByEventId((prev) => {
        const next = { ...prev };
        toLoad.forEach((id) => (next[id] = false));
        return next;
      });
    };
    loadCapsForEvents();
    return () => { cancelled = true; };
  }, [user?.id, sortedEvents]);

  const globalStats = useMemo(() => {
    const result = { totalEvents: events.length, totalInvitations: 0, totalWithVideo: 0, totalPending: 0, completionPct: 0 };
    events.forEach((evt) => {
      const stats = eventStats[evt.id];
      if (!stats) return;
      if (typeof stats.totalInvitations === 'number') result.totalInvitations += stats.totalInvitations;
      if (typeof stats.totalWithVideo === 'number') result.totalWithVideo += stats.totalWithVideo;
      if (typeof stats.totalPending === 'number') result.totalPending += stats.totalPending;
    });
    if (result.totalInvitations > 0) {
      result.completionPct = Math.round((result.totalWithVideo / result.totalInvitations) * 100);
    }
    return result;
  }, [events, eventStats]);

  const statsByTheme = useMemo(() => {
    const map = {};
    events.forEach((evt) => {
      const themeKey = evt.theme || 'Autre';
      if (!map[themeKey]) {
        map[themeKey] = { theme: themeKey, eventsCount: 0, totalInvitations: 0, totalWithVideo: 0, totalPending: 0 };
      }
      map[themeKey].eventsCount += 1;
      const stats = eventStats[evt.id];
      if (!stats) return;
      if (typeof stats.totalInvitations === 'number') map[themeKey].totalInvitations += stats.totalInvitations;
      if (typeof stats.totalWithVideo === 'number') map[themeKey].totalWithVideo += stats.totalWithVideo;
      if (typeof stats.totalPending === 'number') map[themeKey].totalPending += stats.totalPending;
    });
    return Object.values(map)
      .map((row) => ({ ...row, completionPct: row.totalInvitations > 0 ? Math.round((row.totalWithVideo / row.totalInvitations) * 100) : 0 }))
      .sort((a, b) => b.eventsCount - a.eventsCount);
  }, [events, eventStats]);

  const eventsIdSet = useMemo(() => new Set(events.map((e) => e.id)), [events]);

  const missingVisited = useMemo(() => {
    return (visitedEvents || [])
      .filter((v) => (v.event_id ? !eventsIdSet.has(v.event_id) : true))
      .slice(0, 6);
  }, [visitedEvents, eventsIdSet]);

  const handleJoinVisited = useCallback(async (item) => {
    if (!user?.id) { toast.error('Tu dois être connecté.'); return; }
    if (!item?.public_code) { toast.error("Impossible de rejoindre : code public manquant."); return; }
    const key = item.event_id ? `id:${item.event_id}` : `code:${item.public_code}`;
    setJoinLoadingKey(key);
    try {
      const { data, error: rpcError } = await supabase.rpc('join_public_event', { p_public_code: item.public_code });
      if (rpcError) { console.error('join_public_event error:', rpcError); toast.error(rpcError.message || "Impossible de rejoindre l'événement."); return; }
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
  }, [user?.id, fetchEvents]);

  const clearVisited = useCallback(() => {
    setVisitedEvents([]);
    saveVisited([]);
    toast.info('Liste des événements visités vidée.');
  }, []);

  return {
    user, profile,
    events, eventStats, ownerNamesByUserId,
    loading, error,
    deletingEventId, showStats, setShowStats,
    capsByEventId, capsLoadingByEventId,
    joinLoadingKey,
    isPremiumAccount, premiumAccountLabel,
    sortedEvents,
    globalStats, statsByTheme,
    missingVisited,
    handleDeleteEvent,
    handleJoinVisited,
    clearVisited,
  };
};
