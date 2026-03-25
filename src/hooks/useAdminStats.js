import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';
import {
  ADMIN_EMAIL,
  DISPLAY_CURRENCY,
  PRICING,
  safeNumber,
  computeExpiresAt,
  formatDateTime,
} from '../utils/adminUtils';

export function useAdminStats() {
  const [isAdmin, setIsAdmin] = useState(null);

  // Live stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Sales
  const [salesStats, setSalesStats] = useState({
    totalRevenue: 0,
    accountRevenue: 0,
    eventRevenue: 0,
    premiumEventCount: 0,
    potentialMonthlyRevenue: 0,
    potentialAccountRevenue: 0,
    potentialEventRevenue: 0,
    currency: DISPLAY_CURRENCY,
    byTheme: [],
  });

  // Recent activity
  const [recentEvents, setRecentEvents] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);

  // Admin tools
  const [adminToolsMsg, setAdminToolsMsg] = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [userSearching, setUserSearching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userPremiumDuration, setUserPremiumDuration] = useState('30');
  const [userPremiumSaving, setUserPremiumSaving] = useState(false);

  const [eventQuery, setEventQuery] = useState('');
  const [eventResults, setEventResults] = useState([]);
  const [eventSearching, setEventSearching] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventPremiumDuration, setEventPremiumDuration] = useState('30');
  const [eventPremiumSaving, setEventPremiumSaving] = useState(false);

  // ── Admin check ──────────────────────────────────────────────────────────

  async function checkAdmin() {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) { setIsAdmin(false); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profile?.is_admin != null) {
      setIsAdmin(Boolean(profile.is_admin));
    } else {
      setIsAdmin(authData.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    }
  }

  // ── Live stats fetch ─────────────────────────────────────────────────────

  async function fetchLiveStats() {
    try {
      setStatsLoading(true);
      setStatsError(null);

      const now = new Date();
      const ago30d = new Date(now - 30 * 86400000).toISOString();
      const ago7d  = new Date(now - 7  * 86400000).toISOString();

      const [
        { count: totalUsers },
        { count: newUsers7d },
        { count: premiumAccounts },
        { count: totalEvents },
        { count: eventsWithVideo },
        { count: newEvents7d },
        { count: totalVideos },
        { count: newVideos7d },
        { count: installClicks },
        { data: activeUserData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', ago7d),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium_account', true),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }).not('final_video_url', 'is', null),
        supabase.from('events').select('*', { count: 'exact', head: true }).gte('created_at', ago7d),
        supabase.from('videos').select('*', { count: 'exact', head: true }),
        supabase.from('videos').select('*', { count: 'exact', head: true }).gte('created_at', ago7d),
        supabase.from('app_install_events').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('user_id').gte('created_at', ago30d),
      ]);

      // Distinct active users from events created last 30d
      const activeUsers30d = activeUserData
        ? new Set(activeUserData.map((r) => r.user_id)).size
        : 0;

      const total = safeNumber(totalUsers);
      const activationRate = total > 0 ? Math.round((activeUsers30d / total) * 100) : 0;
      const completionRate = safeNumber(totalEvents) > 0
        ? Math.round((safeNumber(eventsWithVideo) / safeNumber(totalEvents)) * 100)
        : 0;

      setStats({
        totalUsers:      safeNumber(totalUsers),
        newUsers7d:      safeNumber(newUsers7d),
        premiumAccounts: safeNumber(premiumAccounts),
        totalEvents:     safeNumber(totalEvents),
        eventsWithVideo: safeNumber(eventsWithVideo),
        newEvents7d:     safeNumber(newEvents7d),
        totalVideos:     safeNumber(totalVideos),
        newVideos7d:     safeNumber(newVideos7d),
        installClicks:   safeNumber(installClicks),
        activeUsers30d,
        activationRate,
        completionRate,
      });

      setLastRefresh(new Date());
    } catch (e) {
      setStatsError('Impossible de charger les statistiques.');
    } finally {
      setStatsLoading(false);
    }
  }

  async function fetchSalesStats() {
    try {
      const [
        { data: accountSubs },
        { data: eventPurchases },
        { count: premiumAccountCount },
        { count: premiumEventCount },
      ] = await Promise.all([
        supabase.from('account_subscriptions').select('amount_cents, currency, status'),
        supabase.from('event_premium_purchases').select('amount_cents, currency, status, event_id, event:events(theme)'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium_account', true),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('is_premium_event', true),
      ]);

      const isPaidLike = (s) =>
        ['paid','active','succeeded','success','complete','completed','captured']
          .includes(String(s || '').toLowerCase().trim());

      // Convertit en USD (Stripe stocke en cents)
      const toUsd = (row) => {
        const cents = Number(row?.amount_cents);
        return Number.isFinite(cents) && cents > 0 ? cents / 100 : 0;
      };

      const paidAccount = (accountSubs   || []).filter((s) => isPaidLike(s.status));
      const paidEvents  = (eventPurchases || []).filter((p) => isPaidLike(p.status));
      const accountRevenue = paidAccount.reduce((sum, s) => sum + toUsd(s), 0);
      const eventRevenue   = paidEvents.reduce((sum, p) => sum + toUsd(p), 0);

      const byThemeMap = new Map();
      paidEvents.forEach((p) => {
        const theme   = p.event?.theme || 'Autre';
        const current = byThemeMap.get(theme) || { theme, revenue: 0, purchasesCount: 0 };
        current.revenue        += toUsd(p);
        current.purchasesCount += 1;
        byThemeMap.set(theme, current);
      });

      // CA potentiel : comptes/événements Premium actuels × tarif défini dans PRICING
      const potentialAccountRevenue = (premiumAccountCount || 0) * PRICING.premiumAccountUsd;
      const potentialEventRevenue   = (premiumEventCount   || 0) * PRICING.premiumEventUsd;

      setSalesStats({
        totalRevenue: accountRevenue + eventRevenue,
        accountRevenue,
        eventRevenue,
        premiumEventCount: premiumEventCount || 0,
        potentialAccountRevenue,
        potentialEventRevenue,
        potentialMonthlyRevenue: potentialAccountRevenue + potentialEventRevenue,
        currency: DISPLAY_CURRENCY,
        byTheme: Array.from(byThemeMap.values()).sort((a, b) => b.revenue - a.revenue),
      });
    } catch (e) {
      console.error('Erreur sales stats:', e);
    }
  }

  async function fetchRecentActivity() {
    try {
      const [{ data: events }, { data: users }] = await Promise.all([
        supabase.from('events')
          .select('id, title, theme, status, created_at, final_video_url, is_premium_event')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase.from('profiles')
          .select('id, full_name, email, avatar_url, created_at, is_premium_account')
          .order('created_at', { ascending: false })
          .limit(8),
      ]);
      setRecentEvents(events || []);
      setRecentUsers(users  || []);
    } catch (e) {
      console.error('Erreur activité récente:', e);
    }
  }

  // ── Refresh all ──────────────────────────────────────────────────────────

  async function refresh() {
    await Promise.all([fetchLiveStats(), fetchSalesStats(), fetchRecentActivity()]);
  }

  // ── Confirm modal ────────────────────────────────────────────────────────

  async function resolveConfirm(confirmed) {
    if (!confirmed || !pendingConfirm) { setPendingConfirm(null); return; }
    const { action } = pendingConfirm;
    setPendingConfirm(null);
    setConfirmLoading(true);
    try { await action(); } finally { setConfirmLoading(false); }
  }

  // ── Search ───────────────────────────────────────────────────────────────

  async function searchEntities({ kind, q }) {
    const isUsers   = kind === 'users';
    const query     = String(q || '').trim();
    const setResults  = isUsers ? setUserResults  : setEventResults;
    const setSearching = isUsers ? setUserSearching : setEventSearching;

    if (!query) { setResults([]); return; }
    setSearching(true);
    try {
      let sq;
      if (isUsers) {
        sq = supabase.from('profiles')
          .select('id, email, full_name, is_premium_account, premium_account_expires_at')
          .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`);
      } else {
        const isUuid = /^[0-9a-fA-F-]{36}$/.test(query);
        sq = supabase.from('events')
          .select('id, title, status, is_premium_event, premium_event_expires_at, created_at')
          .or(isUuid ? `title.ilike.%${query}%,id.eq.${query}` : `title.ilike.%${query}%`);
      }
      const { data, error } = await sq.order('created_at', { ascending: false }).limit(20);
      if (error) { setAdminToolsMsg('Recherche impossible (permissions).'); setResults([]); return; }
      setResults(Array.isArray(data) ? data : []);
    } catch { setAdminToolsMsg('Erreur inattendue lors de la recherche.'); setResults([]); }
    finally { setSearching(false); }
  }

  // ── Premium actions ──────────────────────────────────────────────────────

  function adminSetUserPremium({ userId, enable }) {
    if (!userId) return;
    const expiresAt = enable ? computeExpiresAt(userPremiumDuration) : null;
    setPendingConfirm({
      message: enable ? 'Activer Premium pour ce compte ?' : 'Désactiver Premium pour ce compte ?',
      subtext: enable
        ? `Durée : ${userPremiumDuration === 'forever' ? 'Illimité' : userPremiumDuration + ' jours'} — expire le ${formatDateTime(expiresAt)}`
        : 'Le compte perdra immédiatement ses droits Premium.',
      action: async () => {
        setUserPremiumSaving(true);
        setAdminToolsMsg(null);
        try {
          const { error } = await supabase.rpc('admin_set_user_premium', {
            p_user_id: userId, p_is_premium: Boolean(enable), p_expires_at: expiresAt,
          });
          if (error) { setAdminToolsMsg("Action refusée. Vérifier les RPC 'admin_set_user_premium'."); return; }
          setAdminToolsMsg(enable ? `Premium activé (jusqu'au ${formatDateTime(expiresAt)}).` : 'Premium désactivé.');
          await Promise.all([fetchLiveStats(), fetchSalesStats()]);
          await searchEntities({ kind: 'users', q: userQuery });
        } catch { setAdminToolsMsg('Erreur inattendue.'); }
        finally { setUserPremiumSaving(false); }
      },
    });
  }

  function adminSetEventPremium({ eventId, enable }) {
    if (!eventId) return;
    const expiresAt = enable ? computeExpiresAt(eventPremiumDuration) : null;
    setPendingConfirm({
      message: enable ? 'Booster cet événement en Premium ?' : 'Retirer le boost Premium ?',
      subtext: enable
        ? `Durée : ${eventPremiumDuration === 'forever' ? 'Illimité' : eventPremiumDuration + ' jours'} — expire le ${formatDateTime(expiresAt)}`
        : "L'événement perdra ses fonctionnalités Premium.",
      action: async () => {
        setEventPremiumSaving(true);
        setAdminToolsMsg(null);
        try {
          const { error } = await supabase.rpc('admin_set_event_premium', {
            p_event_id: eventId, p_is_premium: Boolean(enable), p_expires_at: expiresAt,
          });
          if (error) { setAdminToolsMsg("Action refusée. Vérifier les RPC 'admin_set_event_premium'."); return; }
          setAdminToolsMsg(enable ? `Boost Premium activé (jusqu'au ${formatDateTime(expiresAt)}).` : 'Boost Premium retiré.');
          await Promise.all([fetchLiveStats(), fetchSalesStats()]);
          await searchEntities({ kind: 'events', q: eventQuery });
        } catch { setAdminToolsMsg('Erreur inattendue.'); }
        finally { setEventPremiumSaving(false); }
      },
    });
  }

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => { checkAdmin(); }, []);

  useEffect(() => {
    if (isAdmin === true) refresh();
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin !== true) return;
    const t = setTimeout(() => {
      const q = String(userQuery || '').trim();
      if (q.length >= 2) searchEntities({ kind: 'users', q });
      else setUserResults([]);
    }, 350);
    return () => clearTimeout(t);
  }, [userQuery, isAdmin]);

  useEffect(() => {
    if (isAdmin !== true) return;
    const t = setTimeout(() => {
      const q = String(eventQuery || '').trim();
      if (q.length >= 2) searchEntities({ kind: 'events', q });
      else setEventResults([]);
    }, 350);
    return () => clearTimeout(t);
  }, [eventQuery, isAdmin]);

  return {
    isAdmin,
    stats, statsLoading, statsError, lastRefresh, refresh,
    salesStats,
    recentEvents, recentUsers,
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
