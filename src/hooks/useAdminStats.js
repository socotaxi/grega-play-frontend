import { useEffect, useMemo, useState } from 'react';
import supabase from '../lib/supabaseClient';
import {
  ADMIN_EMAIL,
  DISPLAY_CURRENCY,
  safeNumber,
  computeExpiresAt,
  formatDateTime,
} from '../utils/adminUtils';

export function useAdminStats() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [installStats, setInstallStats] = useState({ totalClicks: 0 });

  const [snapshotGenerating, setSnapshotGenerating] = useState(false);
  const [snapshotGenMsg, setSnapshotGenMsg] = useState(null);

  const [snapshots, setSnapshots] = useState([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState(null);
  const [historyRange, setHistoryRange] = useState('30');

  const [salesStats, setSalesStats] = useState({
    totalRevenueXof: 0,
    accountRevenueXof: 0,
    eventRevenueXof: 0,
    premiumEventCount: 0,
    currency: DISPLAY_CURRENCY,
    byTheme: [],
  });

  const [adminStatsCache, setAdminStatsCache] = useState(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [cacheError, setCacheError] = useState(null);

  const [adminToolsMsg, setAdminToolsMsg] = useState(null);

  // pendingConfirm: { message, subtext, action: async fn } | null
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Users search/selection
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [userSearching, setUserSearching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userPremiumDuration, setUserPremiumDuration] = useState('30');
  const [userPremiumSaving, setUserPremiumSaving] = useState(false);

  // Events search/selection
  const [eventQuery, setEventQuery] = useState('');
  const [eventResults, setEventResults] = useState([]);
  const [eventSearching, setEventSearching] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventPremiumDuration, setEventPremiumDuration] = useState('30');
  const [eventPremiumSaving, setEventPremiumSaving] = useState(false);

  // ------------------------------------------------------------------ derived

  const historyStats = useMemo(() => {
    const arr = Array.isArray(snapshots) ? snapshots : [];
    const count = arr.length;
    const latest = count ? arr[count - 1] : null;
    return {
      count,
      latest,
      latestLabel: latest?.snapshot_date
        ? new Date(latest.snapshot_date).toLocaleDateString('fr-FR')
        : null,
    };
  }, [snapshots]);

  const lastSnapshotLabel = adminStatsCache?.snapshot_date
    ? new Date(adminStatsCache.snapshot_date).toLocaleDateString('fr-FR')
    : null;

  const activationPercent = (() => {
    if (!adminStatsCache) return 0;
    const total = safeNumber(adminStatsCache.total_users);
    const active = safeNumber(adminStatsCache.active_users_last_30d);
    if (total <= 0) return 0;
    return Math.round((active / total) * 100);
  })();

  // ------------------------------------------------------------------ confirm modal

  async function resolveConfirm(confirmed) {
    if (!confirmed || !pendingConfirm) {
      setPendingConfirm(null);
      return;
    }
    const { action } = pendingConfirm;
    setPendingConfirm(null);
    setConfirmLoading(true);
    try {
      await action();
    } finally {
      setConfirmLoading(false);
    }
  }

  // ------------------------------------------------------------------ fetch

  async function checkAdmin() {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) { setIsAdmin(false); return; }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      const userEmail = authData.user.email?.toLowerCase();
      setIsAdmin(userEmail === ADMIN_EMAIL.toLowerCase());
      return;
    }
    setIsAdmin(Boolean(profile.is_admin));
  }

  async function fetchInstallStats() {
    try {
      const { count, error } = await supabase
        .from('app_install_events')
        .select('*', { count: 'exact', head: true });
      if (!error) setInstallStats({ totalClicks: count || 0 });
    } catch (err) {
      console.error('Erreur inattendue stats installation:', err);
    }
  }

  async function fetchSalesStats() {
    try {
      const { data: accountSubs } = await supabase
        .from('account_subscriptions')
        .select('amount_cents, amount_xof, currency, status');

      const { data: eventPurchases } = await supabase
        .from('event_premium_purchases')
        .select('amount_cents, amount_xof, currency, status, event_id, event:events(theme)');

      const accountList = accountSubs || [];
      const eventList = eventPurchases || [];

      const isPaidLike = (status) =>
        ['paid', 'active', 'succeeded', 'success', 'complete', 'completed', 'captured'].includes(
          String(status || '').toLowerCase().trim()
        );

      const paidAccount = accountList.filter((s) => isPaidLike(s.status));
      const paidEvents = eventList.filter((p) => isPaidLike(p.status));

      const toDisplayXof = (row) => {
        const ccy = String(row?.currency || '').toUpperCase();
        const ax = Number(row?.amount_xof);
        if (ccy === 'XOF' && Number.isFinite(ax) && ax > 0) return ax;
        const cents = Number(row?.amount_cents);
        if (Number.isFinite(cents) && cents > 0) return Math.round(cents / 100);
        return 0;
      };

      const accountRevenueXof = paidAccount.reduce((sum, s) => sum + toDisplayXof(s), 0);
      const eventRevenueXof = paidEvents.reduce((sum, p) => sum + toDisplayXof(p), 0);
      const totalRevenueXof = accountRevenueXof + eventRevenueXof;

      const byThemeMap = new Map();
      paidEvents.forEach((p) => {
        const theme = p.event?.theme || 'Autre';
        const current = byThemeMap.get(theme) || { theme, revenueXof: 0, purchasesCount: 0 };
        current.revenueXof += toDisplayXof(p);
        current.purchasesCount += 1;
        byThemeMap.set(theme, current);
      });
      const byTheme = Array.from(byThemeMap.values()).sort((a, b) => b.revenueXof - a.revenueXof);

      const { count: premiumEventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('is_premium_event', true);

      setSalesStats({ totalRevenueXof, accountRevenueXof, eventRevenueXof, premiumEventCount: premiumEventsCount || 0, currency: DISPLAY_CURRENCY, byTheme });
    } catch (err) {
      console.error('Erreur inattendue chargement ventes Premium:', err);
    }
  }

  async function fetchAdminStatsCache() {
    try {
      setCacheLoading(true);
      setCacheError(null);
      const { data, error } = await supabase
        .from('admin_stats_cache')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) { setCacheError('Impossible de charger le snapshot global.'); return; }
      if (!data) { setCacheError('Aucun snapshot trouvé.'); setAdminStatsCache(null); return; }
      setAdminStatsCache(data);
    } catch (err) {
      setCacheError('Erreur inattendue lors du chargement du snapshot.');
    } finally {
      setCacheLoading(false);
    }
  }

  async function fetchSnapshotsHistory() {
    try {
      setSnapshotsLoading(true);
      setSnapshotsError(null);

      let q = supabase
        .from('admin_stats_cache')
        .select('id, snapshot_date, total_users, active_users_last_30d, total_events, events_with_final_video, total_videos, average_videos_per_event, premium_account_count, total_revenue_cents, currency, created_at')
        .order('snapshot_date', { ascending: true });

      if (historyRange !== 'all') {
        const from = new Date();
        from.setDate(from.getDate() - Number(historyRange));
        q = q.gte('snapshot_date', from.toISOString().slice(0, 10));
      }

      const { data, error } = await q.limit(400);
      if (error) { setSnapshotsError("Impossible de charger l'historique des snapshots."); return; }
      setSnapshots(Array.isArray(data) ? data : []);
    } catch (e) {
      setSnapshotsError("Erreur inattendue lors du chargement de l'historique.");
    } finally {
      setSnapshotsLoading(false);
    }
  }

  async function generateSnapshot() {
    try {
      setSnapshotGenerating(true);
      setSnapshotGenMsg(null);
      const { error } = await supabase.rpc('refresh_admin_stats_cache');
      if (error) { setSnapshotGenMsg("Impossible de générer le snapshot (droits/RPC)."); return; }
      setSnapshotGenMsg('Snapshot généré avec succès.');
      await Promise.all([fetchAdminStatsCache(), fetchSnapshotsHistory()]);
    } catch (e) {
      setSnapshotGenMsg('Erreur inattendue pendant la génération du snapshot.');
    } finally {
      setSnapshotGenerating(false);
    }
  }

  async function searchEntities({ kind, q }) {
    const isUsers = kind === 'users';
    const query = String(q || '').trim();
    const setResults = isUsers ? setUserResults : setEventResults;
    const setSearching = isUsers ? setUserSearching : setEventSearching;

    if (!query) { setResults([]); return; }

    try {
      setSearching(true);
      let supabaseQuery;
      if (isUsers) {
        supabaseQuery = supabase
          .from('profiles')
          .select('id, email, full_name, is_premium_account, premium_account_expires_at')
          .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`);
      } else {
        const looksLikeUuid = /^[0-9a-fA-F-]{36}$/.test(query);
        const orFilter = looksLikeUuid
          ? `title.ilike.%${query}%,id.eq.${query}`
          : `title.ilike.%${query}%`;
        supabaseQuery = supabase
          .from('events')
          .select('id, title, status, is_premium_event, premium_event_expires_at, created_at')
          .or(orFilter);
      }

      const { data, error } = await supabaseQuery.order('created_at', { ascending: false }).limit(20);
      if (error) {
        setAdminToolsMsg(isUsers
          ? 'Impossible de rechercher les utilisateurs (RLS/colonnes).'
          : 'Impossible de rechercher les evenements (RLS/colonnes).');
        setResults([]);
        return;
      }
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      setAdminToolsMsg(isUsers
        ? 'Erreur inattendue pendant la recherche utilisateurs.'
        : 'Erreur inattendue pendant la recherche evenements.');
      setResults([]);
    } finally {
      (isUsers ? setUserSearching : setEventSearching)(false);
    }
  }

  const searchUsers = (q) => searchEntities({ kind: 'users', q });
  const searchEvents = (q) => searchEntities({ kind: 'events', q });

  function adminSetUserPremium({ userId, enable }) {
    if (!userId) return;
    const expiresAt = enable ? computeExpiresAt(userPremiumDuration) : null;
    setPendingConfirm({
      message: enable ? 'Activer Premium pour ce compte ?' : 'Désactiver Premium pour ce compte ?',
      subtext: enable
        ? `Durée : ${userPremiumDuration === 'forever' ? 'Illimité' : userPremiumDuration + ' jours'} — expire le ${formatDateTime(expiresAt)}`
        : 'Le compte perdra immédiatement ses droits Premium.',
      action: async () => {
        try {
          setUserPremiumSaving(true);
          setAdminToolsMsg(null);
          const { error } = await supabase.rpc('admin_set_user_premium', {
            p_user_id: userId,
            p_is_premium: Boolean(enable),
            p_expires_at: expiresAt,
          });
          if (error) {
            setAdminToolsMsg("Action refusée. Vérifie que les RPC 'admin_set_user_premium' existent et que ton compte est admin.");
            return;
          }
          setAdminToolsMsg(enable
            ? `Premium compte activé (jusqu'au ${formatDateTime(expiresAt)}).`
            : 'Premium compte désactivé.');
          await Promise.all([fetchAdminStatsCache(), fetchSalesStats()]);
          await searchUsers(userQuery);
        } catch (e) {
          setAdminToolsMsg('Erreur inattendue pendant la mise à jour Premium compte.');
        } finally {
          setUserPremiumSaving(false);
        }
      },
    });
  }

  function adminSetEventPremium({ eventId, enable }) {
    if (!eventId) return;
    const expiresAt = enable ? computeExpiresAt(eventPremiumDuration) : null;
    setPendingConfirm({
      message: enable ? 'Booster cet événement en Premium ?' : 'Retirer le boost Premium de cet événement ?',
      subtext: enable
        ? `Durée : ${eventPremiumDuration === 'forever' ? 'Illimité' : eventPremiumDuration + ' jours'} — expire le ${formatDateTime(expiresAt)}`
        : "L'événement perdra immédiatement son accès aux fonctionnalités Premium.",
      action: async () => {
        try {
          setEventPremiumSaving(true);
          setAdminToolsMsg(null);
          const { error } = await supabase.rpc('admin_set_event_premium', {
            p_event_id: eventId,
            p_is_premium: Boolean(enable),
            p_expires_at: expiresAt,
          });
          if (error) {
            setAdminToolsMsg("Action refusée. Vérifie que les RPC 'admin_set_event_premium' existent et que ton compte est admin.");
            return;
          }
          setAdminToolsMsg(enable
            ? `Boost Premium activé (jusqu'au ${formatDateTime(expiresAt)}).`
            : 'Boost Premium retiré.');
          await Promise.all([fetchAdminStatsCache(), fetchSalesStats()]);
          await searchEvents(eventQuery);
        } catch (e) {
          setAdminToolsMsg('Erreur inattendue pendant la mise à jour Premium événement.');
        } finally {
          setEventPremiumSaving(false);
        }
      },
    });
  }

  // ------------------------------------------------------------------ effects

  useEffect(() => { checkAdmin(); }, []);

  useEffect(() => {
    if (isAdmin === true) {
      fetchInstallStats();
      fetchSalesStats();
      fetchAdminStatsCache();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin === true) fetchSnapshotsHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyRange, isAdmin]);

  useEffect(() => {
    if (isAdmin !== true) return;
    const t = setTimeout(() => {
      const q = String(userQuery || '').trim();
      if (q.length >= 2) searchUsers(q);
      else setUserResults([]);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userQuery, isAdmin]);

  useEffect(() => {
    if (isAdmin !== true) return;
    const t = setTimeout(() => {
      const q = String(eventQuery || '').trim();
      if (q.length >= 2) searchEvents(q);
      else setEventResults([]);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventQuery, isAdmin]);

  return {
    isAdmin,
    adminStatsCache, cacheLoading, cacheError,
    lastSnapshotLabel, activationPercent,
    snapshotGenerating, snapshotGenMsg, generateSnapshot,
    snapshots, snapshotsLoading, snapshotsError, historyStats,
    historyRange, setHistoryRange, fetchSnapshotsHistory,
    installStats, salesStats,
    adminToolsMsg,
    pendingConfirm, confirmLoading, resolveConfirm,
    userQuery, setUserQuery, userResults, userSearching,
    selectedUserId, setSelectedUserId,
    userPremiumDuration, setUserPremiumDuration, userPremiumSaving,
    adminSetUserPremium,
    eventQuery, setEventQuery, eventResults, eventSearching,
    selectedEventId, setSelectedEventId,
    eventPremiumDuration, setEventPremiumDuration, eventPremiumSaving,
    adminSetEventPremium,
  };
}
