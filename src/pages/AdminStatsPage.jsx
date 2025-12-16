import React, { useEffect, useMemo, useState } from 'react';
import supabase from '../lib/supabaseClient';
import AdminDashboardStats from '../components/dashboard/AdminDashboardStats';
import MainLayout from '../components/layout/MainLayout';

const ADMIN_EMAIL = 'edhemrombhot@gmail.com';

// ✅ Affichage uniquement (pas de conversion automatique)
const DISPLAY_CURRENCY = 'XOF';
const DISPLAY_LOCALE = 'fr-FR';

// ✅ Petit composant rétractable (HTML natif, accessible, sans dépendance)
function CollapsibleSection({ title, right, defaultOpen = false, children }) {
  return (
    <details
      className="rounded-3xl border border-emerald-100 bg-white shadow-sm"
      open={defaultOpen}
    >
      <summary className="list-none cursor-pointer px-5 py-4 select-none">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-800">{title}</span>
            <span className="text-xs text-gray-400">
              (cliquer pour ouvrir/fermer)
            </span>
          </div>
          <div className="flex items-center gap-3">
            {right}
            <span className="text-gray-400 text-sm">▾</span>
          </div>
        </div>
      </summary>

      <div className="px-5 pb-5 pt-1">{children}</div>
    </details>
  );
}

function CollapsibleSubSection({ title, children, defaultOpen = true }) {
  return (
    <details
      className="rounded-3xl border border-emerald-100 bg-white/70"
      open={defaultOpen}
    >
      <summary className="list-none cursor-pointer px-4 py-3 select-none">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            {title}
          </span>
          <span className="text-gray-400 text-sm">▾</span>
        </div>
      </summary>
      <div className="px-4 pb-4 pt-1">{children}</div>
    </details>
  );
}

// ✅ Bloc “Analyse automatique” (rétractable)
function AutoAnalysis({ children }) {
  return (
    <details className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/40">
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-emerald-700 select-none">
        Analyse automatique
      </summary>
      <div className="px-3 pb-3 pt-1 text-xs text-gray-700 space-y-1">
        {children}
      </div>
    </details>
  );
}

// ✅ Mini “chart” sans dépendance (SVG)
function MiniLineChart({
  title,
  data,
  valueKey,
  dateKey = 'snapshot_date',
  height = 120,
}) {
  const points = useMemo(() => {
    if (!Array.isArray(data) || data.length < 2) return null;

    const values = data.map((d) => Number(d?.[valueKey] ?? 0));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const w = 520; // viewBox width
    const h = height;
    const padX = 14;
    const padY = 14;

    const xStep = (w - padX * 2) / (values.length - 1);

    const pts = values.map((v, i) => {
      const x = padX + i * xStep;
      const y =
        padY + (h - padY * 2) - ((v - min) / range) * (h - padY * 2);
      return { x, y, v };
    });

    const d = pts
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(' ');

    const last = pts[pts.length - 1]?.v ?? 0;
    const first = pts[0]?.v ?? 0;
    const delta = last - first;

    return { d, min, max, last, first, delta, w, h };
  }, [data, valueKey, height]);

  const lastDateLabel = useMemo(() => {
    const last = data?.[data.length - 1];
    if (!last?.[dateKey]) return null;
    return new Date(last[dateKey]).toLocaleDateString('fr-FR');
  }, [data, dateKey]);

  return (
    <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">{title}</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {points ? points.last : 0}
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            {lastDateLabel ? `Dernier point : ${lastDateLabel}` : '—'}
          </p>
        </div>

        {points ? (
          <div className="text-right">
            <p className="text-[11px] text-gray-500">Variation</p>
            <p className="text-xs font-semibold text-gray-800">
              {points.delta >= 0 ? `+${points.delta}` : `${points.delta}`}
            </p>
            <p className="text-[11px] text-gray-400">
              Min {points.min} • Max {points.max}
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-gray-400">Pas assez de points</p>
        )}
      </div>

      <div className="mt-3">
        <svg
          viewBox={`0 0 520 ${height}`}
          className="w-full"
          role="img"
          aria-label={title}
        >
          {/* axes baseline */}
          <line
            x1="14"
            y1={height - 14}
            x2="506"
            y2={height - 14}
            stroke="rgba(15,23,42,0.08)"
          />
          {/* path */}
          {points && (
            <>
              <path
                d={points.d}
                fill="none"
                stroke="rgba(16,185,129,0.85)"
                strokeWidth="2.5"
              />
              {/* last dot */}
              <circle
                cx={(() => {
                  const values = data.map((d) => Number(d?.[valueKey] ?? 0));
                  const i = values.length - 1;
                  const xStep = (520 - 28) / (values.length - 1);
                  return 14 + i * xStep;
                })()}
                cy={(() => {
                  const values = data.map((d) => Number(d?.[valueKey] ?? 0));
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  const range = max - min || 1;
                  const v = values[values.length - 1];
                  return (
                    14 +
                    (height - 28) -
                    ((v - min) / range) * (height - 28)
                  );
                })()}
                r="4"
                fill="rgba(16,185,129,1)"
              />
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

export default function AdminStatsPage() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [installStats, setInstallStats] = useState({ totalClicks: 0 });

  // ✅ Bouton snapshot
  const [snapshotGenerating, setSnapshotGenerating] = useState(false);
  const [snapshotGenMsg, setSnapshotGenMsg] = useState(null);

  // ✅ Historique snapshots
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState(null);
  const [historyRange, setHistoryRange] = useState('30'); // '7' | '30' | '90' | 'all'

  // ✅ Stats de ventes Premium + nombre d'événements Premium
  const [salesStats, setSalesStats] = useState({
    totalRevenueXof: 0,
    accountRevenueXof: 0,
    eventRevenueXof: 0,
    premiumEventCount: 0,
    currency: DISPLAY_CURRENCY,
    byTheme: [], // { theme, revenueXof, purchasesCount }
  });

  // ✅ Snapshot cache global (admin_stats_cache)
  const [adminStatsCache, setAdminStatsCache] = useState(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [cacheError, setCacheError] = useState(null);

  // ✅ Admin tools: bascule Premium (compte) + boost Premium (événement)
  const [adminToolsMsg, setAdminToolsMsg] = useState(null);

  // --- Users search/selection
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [userSearching, setUserSearching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userPremiumDuration, setUserPremiumDuration] = useState('30'); // days: '7' | '30' | '90' | '365' | 'forever'
  const [userPremiumSaving, setUserPremiumSaving] = useState(false);

  // --- Events search/selection
  const [eventQuery, setEventQuery] = useState('');
  const [eventResults, setEventResults] = useState([]);
  const [eventSearching, setEventSearching] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventPremiumDuration, setEventPremiumDuration] = useState('30'); // days: '7' | '30' | '90' | '365' | 'forever'
  const [eventPremiumSaving, setEventPremiumSaving] = useState(false);

  // ✅ Helper
  const safeNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };


  const toIsoDateTime = (d) => {
    try {
      return new Date(d).toISOString();
    } catch {
      return null;
    }
  };

  const computeExpiresAt = (duration) => {
    // duration: '7' | '30' | '90' | '365' | 'forever'
    const now = new Date();
    if (duration === 'forever') {
      // date lointaine, compatible timestamptz
      const far = new Date(Date.UTC(2099, 11, 31, 23, 59, 59));
      return far.toISOString();
    }
    const days = Number(duration);
    const d = new Date(now);
    d.setDate(d.getDate() + (Number.isFinite(days) ? days : 30));
    return d.toISOString();
  };

  const formatDateTime = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('fr-FR');
    } catch {
      return String(iso);
    }
  };

  const isPremiumActive = (flag, expiresAt) => {
    if (!flag) return false;
    if (!expiresAt) return true;
    try {
      return new Date(expiresAt).getTime() > Date.now();
    } catch {
      return true;
    }
  };

  // ✅ IMPORTANT: ce useMemo doit être AVANT les retours conditionnels
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

  async function checkAdmin() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      setIsAdmin(false);
      return;
    }

    const userEmail = data.user.email?.toLowerCase();
    setIsAdmin(userEmail === ADMIN_EMAIL.toLowerCase());
  }

  async function fetchInstallStats() {
    try {
      const { count, error } = await supabase
        .from('app_install_events')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Erreur chargement stats installation:', error);
        return;
      }

      setInstallStats({
        totalClicks: count || 0,
      });
    } catch (err) {
      console.error('Erreur inattendue stats installation:', err);
    }
  }

  async function fetchSalesStats() {
    try {
      const { data: accountSubs, error: accError } = await supabase
        .from('account_subscriptions')
        .select('amount_cents, amount_xof, currency, status');

      if (accError) {
        console.error('Erreur chargement ventes comptes Premium:', accError);
      }

      const { data: eventPurchases, error: evtError } = await supabase
        .from('event_premium_purchases')
        .select(
          'amount_cents, amount_xof, currency, status, event_id, event:events(theme)'
        );

      if (evtError) {
        console.error('Erreur chargement ventes événements Premium:', evtError);
      }

      const accountList = accountSubs || [];
      const eventList = eventPurchases || [];

      const isPaidLike = (status) => {
        const s = String(status || '').toLowerCase().trim();
        return (
          s === 'paid' ||
          s === 'active' ||
          s === 'succeeded' ||
          s === 'success' ||
          s === 'complete' ||
          s === 'completed' ||
          s === 'captured'
        );
      };

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

      const accountRevenueXof = paidAccount.reduce(
        (sum, s) => sum + toDisplayXof(s),
        0
      );
      const eventRevenueXof = paidEvents.reduce(
        (sum, p) => sum + toDisplayXof(p),
        0
      );
      const totalRevenueXof = accountRevenueXof + eventRevenueXof;

      const byThemeMap = new Map();
      paidEvents.forEach((p) => {
        const theme = p.event?.theme || 'Autre';
        const current = byThemeMap.get(theme) || {
          theme,
          revenueXof: 0,
          purchasesCount: 0,
        };
        current.revenueXof += toDisplayXof(p);
        current.purchasesCount += 1;
        byThemeMap.set(theme, current);
      });

      const byTheme = Array.from(byThemeMap.values()).sort(
        (a, b) => b.revenueXof - a.revenueXof
      );

      const { count: premiumEventsCount, error: premiumEventsError } =
        await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('is_premium_event', true);

      if (premiumEventsError) {
        console.error(
          "Erreur comptage des événements Premium (is_premium_event = true):",
          premiumEventsError
        );
      }

      setSalesStats({
        totalRevenueXof,
        accountRevenueXof,
        eventRevenueXof,
        premiumEventCount: premiumEventsCount || 0,
        currency: DISPLAY_CURRENCY,
        byTheme,
      });
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

      if (error) {
        console.error('Erreur chargement admin_stats_cache:', error);
        setCacheError('Impossible de charger le snapshot global.');
        return;
      }

      if (!data) {
        setCacheError('Aucun snapshot trouvé dans admin_stats_cache.');
        setAdminStatsCache(null);
        return;
      }

      setAdminStatsCache(data);
    } catch (err) {
      console.error('Erreur inattendue admin_stats_cache:', err);
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
        .select(
          'id, snapshot_date, total_users, active_users_last_30d, total_events, events_with_final_video, total_videos, average_videos_per_event, premium_account_count, total_revenue_cents, currency, created_at'
        )
        .order('snapshot_date', { ascending: true });

      if (historyRange !== 'all') {
        const days = Number(historyRange);
        const from = new Date();
        from.setDate(from.getDate() - days);
        q = q.gte('snapshot_date', from.toISOString().slice(0, 10)); // YYYY-MM-DD
      }

      // limite douce pour éviter une page trop lourde
      q = q.limit(400);

      const { data, error } = await q;

      if (error) {
        console.error('Erreur chargement historique snapshots:', error);
        setSnapshotsError("Impossible de charger l'historique des snapshots.");
        return;
      }

      setSnapshots(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erreur inattendue historique snapshots:', e);
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

      if (error) {
        console.error('Erreur génération snapshot:', error);
        setSnapshotGenMsg("Impossible de générer le snapshot (droits/RPC).");
        return;
      }

      setSnapshotGenMsg('Snapshot généré avec succès.');
      await Promise.all([fetchAdminStatsCache(), fetchSnapshotsHistory()]);
    } catch (e) {
      console.error('Erreur inattendue génération snapshot:', e);
      setSnapshotGenMsg('Erreur inattendue pendant la génération du snapshot.');
    } finally {
      setSnapshotGenerating(false);
    }
  }


  async function searchUsers(q) {
    const query = String(q || '').trim();
    if (!query) {
      setUserResults([]);
      return;
    }

    try {
      setUserSearching(true);

      // On essaie d'abord sur email, puis full_name
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_premium_account, premium_account_expires_at')
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Erreur recherche users:', error);
        setAdminToolsMsg("Impossible de rechercher les utilisateurs (RLS/colonnes).");
        setUserResults([]);
        return;
      }

      setUserResults(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erreur inattendue recherche users:', e);
      setAdminToolsMsg('Erreur inattendue pendant la recherche utilisateurs.');
      setUserResults([]);
    } finally {
      setUserSearching(false);
    }
  }

  async function searchEvents(q) {
    const query = String(q || '').trim();
    if (!query) {
      setEventResults([]);
      return;
    }

    try {
      setEventSearching(true);

      const looksLikeUuid = /^[0-9a-fA-F-]{36}$/.test(query);
      const orFilter = looksLikeUuid
        ? `title.ilike.%${query}%,id.eq.${query}`
        : `title.ilike.%${query}%`;

      const { data, error } = await supabase
        .from('events')
        .select('id, title, status, is_premium_event, premium_event_expires_at, created_at')
        .or(orFilter)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Erreur recherche events:', error);
        setAdminToolsMsg("Impossible de rechercher les événements (RLS/colonnes).");
        setEventResults([]);
        return;
      }

      setEventResults(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erreur inattendue recherche events:', e);
      setAdminToolsMsg('Erreur inattendue pendant la recherche événements.');
      setEventResults([]);
    } finally {
      setEventSearching(false);
    }
  }

  async function adminSetUserPremium({ userId, enable }) {
    if (!userId) return;
    try {
      setUserPremiumSaving(true);
      setAdminToolsMsg(null);

      const expiresAt = enable ? computeExpiresAt(userPremiumDuration) : null;

      const confirmText = enable
        ? `Activer Premium pour cet utilisateur jusqu’au ${formatDateTime(expiresAt)} ?`
        : 'Désactiver Premium pour cet utilisateur ?';

      // sécurité UX
      if (!window.confirm(confirmText)) return;

      const { error } = await supabase.rpc('admin_set_user_premium', {
        p_user_id: userId,
        p_is_premium: Boolean(enable),
        p_expires_at: expiresAt,
      });

      if (error) {
        console.error('Erreur RPC admin_set_user_premium:', error);
        // message clair (souvent "not_admin" ou "permission denied")
        setAdminToolsMsg(
          "Action refusée. Vérifie que les RPC 'admin_set_user_premium' existent et que ton compte est admin."
        );
        return;
      }

      setAdminToolsMsg(
        enable
          ? `Premium compte activé (jusqu’au ${formatDateTime(expiresAt)}).`
          : 'Premium compte désactivé.'
      );

      // rafraîchit la liste affichée
      await Promise.all([fetchAdminStatsCache(), fetchSalesStats()]);
      await searchUsers(userQuery);
    } catch (e) {
      console.error('Erreur inattendue set_user_premium:', e);
      setAdminToolsMsg('Erreur inattendue pendant la mise à jour Premium compte.');
    } finally {
      setUserPremiumSaving(false);
    }
  }

  async function adminSetEventPremium({ eventId, enable }) {
    if (!eventId) return;
    try {
      setEventPremiumSaving(true);
      setAdminToolsMsg(null);

      const expiresAt = enable ? computeExpiresAt(eventPremiumDuration) : null;

      const confirmText = enable
        ? `Booster Premium cet événement jusqu’au ${formatDateTime(expiresAt)} ?`
        : 'Retirer le boost Premium de cet événement ?';

      if (!window.confirm(confirmText)) return;

      const { error } = await supabase.rpc('admin_set_event_premium', {
        p_event_id: eventId,
        p_is_premium: Boolean(enable),
        p_expires_at: expiresAt,
      });

      if (error) {
        console.error('Erreur RPC admin_set_event_premium:', error);
        setAdminToolsMsg(
          "Action refusée. Vérifie que les RPC 'admin_set_event_premium' existent et que ton compte est admin."
        );
        return;
      }

      setAdminToolsMsg(
        enable
          ? `Boost Premium activé (jusqu’au ${formatDateTime(expiresAt)}).`
          : 'Boost Premium retiré.'
      );

      await Promise.all([fetchAdminStatsCache(), fetchSalesStats()]);
      await searchEvents(eventQuery);
    } catch (e) {
      console.error('Erreur inattendue set_event_premium:', e);
      setAdminToolsMsg('Erreur inattendue pendant la mise à jour Premium événement.');
    } finally {
      setEventPremiumSaving(false);
    }
  }

  useEffect(() => {
    checkAdmin();
  }, []);


  useEffect(() => {
    if (isAdmin === true) {
      fetchInstallStats();
      fetchSalesStats();
      fetchAdminStatsCache();
      fetchSnapshotsHistory();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin === true) {
      fetchSnapshotsHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyRange, isAdmin]);


  useEffect(() => {
    if (isAdmin !== true) return;

    const t = setTimeout(() => {
      const q = String(userQuery || '').trim();
      if (q.length >= 2) searchUsers(q);
      if (q.length < 2) setUserResults([]);
    }, 350);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userQuery, isAdmin]);

  useEffect(() => {
    if (isAdmin !== true) return;

    const t = setTimeout(() => {
      const q = String(eventQuery || '').trim();
      if (q.length >= 2) searchEvents(q);
      if (q.length < 2) setEventResults([]);
    }, 350);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventQuery, isAdmin]);

  if (isAdmin === null) {
    return (
      <MainLayout>
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
          <div className="max-w-6xl mx-auto px-4 py-10">
            <p className="text-sm text-gray-500">Vérification de l’accès…</p>
          </div>
        </main>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return (
      <MainLayout>
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
          <div className="max-w-3xl mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Accès refusé</h1>
            <p className="mt-3 text-sm text-gray-600">
              Cette page est réservée à l’administrateur de Grega Play.
            </p>
          </div>
        </main>
      </MainLayout>
    );
  }

  const formatAmount = (xofAmount) => {
    const amount = Number(xofAmount || 0);

    try {
      return amount.toLocaleString(DISPLAY_LOCALE, {
        style: 'currency',
        currency: DISPLAY_CURRENCY,
        maximumFractionDigits: 0,
      });
    } catch {
      return `${Math.round(amount).toLocaleString(DISPLAY_LOCALE)} F CFA`;
    }
  };

  const formatPercent = (value) => {
    if (value == null) return '0 %';
    return `${Number(value).toFixed(1)} %`;
  };

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

  return (
    <MainLayout>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Analytics Grega Play
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Statistiques clés : utilisateurs, événements, vidéos, complétion
                et ventes Premium.
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={generateSnapshot}
                  disabled={snapshotGenerating}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
                  title="Crée un snapshot dans admin_stats_cache"
                >
                  {snapshotGenerating ? 'Génération…' : 'Générer un snapshot'}
                </button>

                <div className="px-4 py-3 rounded-2xl bg-white/80 border border-emerald-100 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                    Compte admin
                  </p>
                  <p className="text-sm text-gray-800 mt-1">{ADMIN_EMAIL}</p>
                </div>
              </div>

              {snapshotGenMsg && (
                <p className="text-xs text-gray-600">{snapshotGenMsg}</p>
              )}
            </div>
          </header>

          {/* Résumé + Objectif */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-3xl border border-emerald-100 bg-white shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700">Résumé</h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Ce tableau de bord te permet de visualiser :
                <br />- l’activité réelle sur Grega Play (créateurs + participants),
                <br />- le taux de complétion des événements,
                <br />- les volumes vidéos envoyés,
                <br />- et les ventes Premium par compte, par événement et par
                type de célébration, ainsi que le nombre d&apos;événements passés
                en Premium.
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-emerald-600 text-white shadow-sm p-5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Objectif
                </p>
                <p className="mt-2 text-sm">
                  Suivre la progression de l’usage réel de Grega Play et mesurer
                  la monétisation (Premium compte + Premium événement) pour
                  préparer l’activation des paiements.
                </p>
              </div>

              <p className="mt-4 text-xs text-emerald-100">
                Prochaine étape : comparer les snapshots (J-7 / J-30) et
                améliorer la complétion (vidéo finale).
              </p>
            </div>
          </section>

          {/* === Vue globale === */}
          <CollapsibleSection
            title="Vue globale (snapshot admin_stats_cache)"
            defaultOpen={true}
            right={
              lastSnapshotLabel ? (
                <span className="text-xs text-gray-500">
                  Dernier snapshot : {lastSnapshotLabel}
                </span>
              ) : null
            }
          >
            {cacheLoading && (
              <p className="text-xs text-gray-500">
                Chargement du snapshot global…
              </p>
            )}

            {cacheError && <p className="text-xs text-red-500">{cacheError}</p>}

            {!cacheLoading && !cacheError && !adminStatsCache && (
              <p className="text-xs text-gray-500">Aucun snapshot disponible.</p>
            )}

            {adminStatsCache && (
              <div className="space-y-4">
                <CollapsibleSubSection
                  title="Utilisateurs & événements"
                  defaultOpen={true}
                >
                  <AutoAnalysis>
                    <p>
                      • Activation (30 jours) :{' '}
                      <strong>{activationPercent}%</strong> (
                      {adminStatsCache.active_users_last_30d}/
                      {adminStatsCache.total_users}).
                    </p>
                    <p>
                      • Vidéo finale :{' '}
                      <strong>{adminStatsCache.events_with_final_video}</strong>{' '}
                      événement(s) complété(s).
                    </p>
                    <p>
                      → Priorité : améliorer l’activation (onboarding/rappels) et
                      pousser la complétion (CTA “Générer la vidéo”).
                    </p>
                  </AutoAnalysis>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
                    <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-4">
                      <p className="text-xs text-gray-500">Utilisateurs totaux</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {adminStatsCache.total_users}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Tous les comptes créés sur Grega Play.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-4">
                      <p className="text-xs text-gray-500">
                        Utilisateurs actifs (30 jours)
                      </p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {adminStatsCache.active_users_last_30d}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Comptes ayant réalisé au moins une action récente.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-4">
                      <p className="text-xs text-gray-500">Événements créés</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {adminStatsCache.total_events}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Tous les événements, Premium ou non.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-4">
                      <p className="text-xs text-gray-500">
                        Événements avec vidéo finale
                      </p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {adminStatsCache.events_with_final_video}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Indicateur direct de complétion.
                      </p>
                    </div>
                  </div>
                </CollapsibleSubSection>

                <CollapsibleSubSection
                  title="Vidéos, participation & premium"
                  defaultOpen={true}
                >
                  <AutoAnalysis>
                    <p>
                      • Intensité :{' '}
                      <strong>
                        {Number(adminStatsCache.average_videos_per_event || 0).toFixed(1)}
                      </strong>{' '}
                      vidéos / événement en moyenne.
                    </p>
                    <p>
                      • Premium :{' '}
                      <strong>{adminStatsCache.premium_account_count}</strong>{' '}
                      compte(s) actif(s) → signal de valeur perçue.
                    </p>
                    <p>
                      → Opportunité : rendre “générer la vidéo finale” plus
                      visible dès que suffisamment de vidéos sont reçues.
                    </p>
                  </AutoAnalysis>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
                    <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-4">
                      <p className="text-xs text-gray-500">Vidéos reçues</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {adminStatsCache.total_videos}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Total des contributions vidéo sur la plateforme.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-4">
                      <p className="text-xs text-gray-500">
                        Vidéos / événement (moyenne)
                      </p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {Number(adminStatsCache.average_videos_per_event || 0).toFixed(1)}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Mesure l&apos;intensité de participation.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-4">
                      <p className="text-xs text-gray-500">
                        Taux de participation moyen
                      </p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {formatPercent(adminStatsCache.avg_participation_rate)}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Ratio moyen invités / vidéos reçues.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-4">
                      <p className="text-xs text-gray-500">
                        Comptes Premium actifs
                      </p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {adminStatsCache.premium_account_count}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Comptes avec Premium actif au moment du snapshot.
                      </p>
                    </div>
                  </div>
                </CollapsibleSubSection>
              </div>
            )}
          </CollapsibleSection>

          {/* === Historique === */}
          <CollapsibleSection
            title="Historique des snapshots (liste + courbes)"
            defaultOpen={true}
            right={
              historyStats.count ? (
                <span className="text-xs text-gray-500">
                  {historyStats.count} snapshot(s)
                  {historyStats.latestLabel ? ` • Dernier : ${historyStats.latestLabel}` : ''}
                </span>
              ) : null
            }
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Période</label>
                <select
                  className="text-sm rounded-xl border border-emerald-100 bg-white px-3 py-2"
                  value={historyRange}
                  onChange={(e) => setHistoryRange(e.target.value)}
                >
                  <option value="7">7 jours</option>
                  <option value="30">30 jours</option>
                  <option value="90">90 jours</option>
                  <option value="all">Tout</option>
                </select>

                <button
                  onClick={fetchSnapshotsHistory}
                  className="px-3 py-2 rounded-xl border border-emerald-100 bg-white text-sm font-semibold"
                >
                  Actualiser
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Astuce : clique “Générer un snapshot” pour ajouter un nouveau point.
              </p>
            </div>

            {snapshotsLoading && (
              <p className="mt-3 text-xs text-gray-500">Chargement de l’historique…</p>
            )}
            {snapshotsError && (
              <p className="mt-3 text-xs text-red-500">{snapshotsError}</p>
            )}

            {!snapshotsLoading && !snapshotsError && snapshots.length >= 2 && (
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <MiniLineChart title="Utilisateurs totaux" data={snapshots} valueKey="total_users" />
                <MiniLineChart title="Utilisateurs actifs (30 jours)" data={snapshots} valueKey="active_users_last_30d" />
                <MiniLineChart title="Événements totaux" data={snapshots} valueKey="total_events" />
                <MiniLineChart title="Vidéos totales" data={snapshots} valueKey="total_videos" />
                <MiniLineChart title="Comptes Premium" data={snapshots} valueKey="premium_account_count" />
                <MiniLineChart title="Événements avec vidéo finale" data={snapshots} valueKey="events_with_final_video" />
              </div>
            )}

            {!snapshotsLoading && !snapshotsError && snapshots.length < 2 && (
              <p className="mt-3 text-xs text-gray-500">
                Pas assez de snapshots pour afficher des courbes. Crée au moins 2 snapshots.
              </p>
            )}

            {/* Liste */}
            <CollapsibleSubSection title="Liste des snapshots" defaultOpen={false}>
              {!snapshotsLoading && !snapshotsError && snapshots.length === 0 && (
                <p className="text-xs text-gray-500">Aucun snapshot.</p>
              )}

              {!snapshotsLoading && !snapshotsError && snapshots.length > 0 && (
                <div className="overflow-x-auto mt-3 rounded-3xl border border-emerald-100 bg-white shadow-sm">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-[11px] text-gray-500">
                        <th className="py-3 px-4 text-left font-medium">Date</th>
                        <th className="py-3 px-2 text-right font-medium">Users</th>
                        <th className="py-3 px-2 text-right font-medium">Actifs 30j</th>
                        <th className="py-3 px-2 text-right font-medium">Events</th>
                        <th className="py-3 px-2 text-right font-medium">Finales</th>
                        <th className="py-3 px-2 text-right font-medium">Vidéos</th>
                        <th className="py-3 px-2 text-right font-medium">Vid./Event</th>
                        <th className="py-3 px-2 text-right font-medium">Premium</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshots
                        .slice()
                        .reverse()
                        .map((s) => (
                          <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-2 px-4 text-left text-gray-800">
                              {s.snapshot_date
                                ? new Date(s.snapshot_date).toLocaleDateString('fr-FR')
                                : '—'}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-800 font-medium">
                              {safeNumber(s.total_users)}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-700">
                              {safeNumber(s.active_users_last_30d)}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-700">
                              {safeNumber(s.total_events)}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-700">
                              {safeNumber(s.events_with_final_video)}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-700">
                              {safeNumber(s.total_videos)}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-700">
                              {Number(s.average_videos_per_event || 0).toFixed(1)}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-700">
                              {safeNumber(s.premium_account_count)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleSubSection>
          </CollapsibleSection>

          {/* === Indicateurs clés (usage & monétisation en live) === */}
          <CollapsibleSection
            title="Indicateurs clés (usage et monétisation)"
            defaultOpen={true}
          >
            <CollapsibleSubSection title="Admin : gérer Premium (comptes & événements)" defaultOpen={true}>
              <AutoAnalysis>
                <p>
                  • Ici tu peux forcer un compte en Premium ou booster un événement, uniquement en admin.
                </p>
                <p>
                  • Ces actions doivent passer par des RPC sécurisées (admin_set_user_premium / admin_set_event_premium).
                </p>
              </AutoAnalysis>

              {adminToolsMsg && (
                <div className="mt-3 rounded-2xl border border-emerald-100 bg-white p-3">
                  <p className="text-xs text-gray-700">{adminToolsMsg}</p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* --- Premium Compte --- */}
                <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-800">Basculer un compte en Premium</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Recherche par email ou nom (min. 2 caractères).
                  </p>

                  <div className="mt-3 space-y-3">
                    <input
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="Ex: john@gmail.com ou Marie"
                      className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm"
                    />

                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="flex-1 rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-sm"
                      >
                        <option value="">
                          {userSearching ? 'Recherche…' : 'Sélectionner un utilisateur'}
                        </option>
                        {userResults.map((u) => {
                          const label = `${u.full_name ? u.full_name + ' — ' : ''}${u.email || u.id}`;
                          const active = isPremiumActive(u.is_premium_account, u.premium_account_expires_at);
                          const badge = active ? ` (Premium jusqu’au ${formatDateTime(u.premium_account_expires_at)})` : '';
                          return (
                            <option key={u.id} value={u.id}>
                              {label}{badge}
                            </option>
                          );
                        })}
                      </select>

                      <select
                        value={userPremiumDuration}
                        onChange={(e) => setUserPremiumDuration(e.target.value)}
                        className="sm:w-44 rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-sm"
                        title="Durée du Premium"
                      >
                        <option value="7">7 jours</option>
                        <option value="30">30 jours</option>
                        <option value="90">90 jours</option>
                        <option value="365">365 jours</option>
                        <option value="forever">Illimité</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={!selectedUserId || userPremiumSaving}
                        onClick={() => adminSetUserPremium({ userId: selectedUserId, enable: true })}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
                      >
                        {userPremiumSaving ? 'En cours…' : 'Activer Premium'}
                      </button>

                      <button
                        disabled={!selectedUserId || userPremiumSaving}
                        onClick={() => adminSetUserPremium({ userId: selectedUserId, enable: false })}
                        className="px-4 py-2 rounded-xl border border-emerald-100 bg-white text-sm font-semibold text-gray-800 disabled:opacity-60"
                      >
                        Désactiver
                      </button>
                    </div>

                    <p className="text-[11px] text-gray-500">
                      Note : si les RPC n’existent pas encore, cette action échouera (à créer côté Supabase).
                    </p>
                  </div>
                </div>

                {/* --- Premium Événement --- */}
                <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-800">Booster un événement en Premium</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Recherche par titre (min. 2 caractères). Tu peux aussi coller un ID.
                  </p>

                  <div className="mt-3 space-y-3">
                    <input
                      value={eventQuery}
                      onChange={(e) => setEventQuery(e.target.value)}
                      placeholder="Ex: Anniversaire Lyne ou 128cd01e-…"
                      className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm"
                    />

                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="flex-1 rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-sm"
                      >
                        <option value="">
                          {eventSearching ? 'Recherche…' : 'Sélectionner un événement'}
                        </option>
                        {eventResults.map((ev) => {
                          const label = `${ev.title ? ev.title + ' — ' : ''}${ev.id}`;
                          const active = isPremiumActive(ev.is_premium_event, ev.premium_event_expires_at);
                          const badge = active ? ` (Boost jusqu’au ${formatDateTime(ev.premium_event_expires_at)})` : '';
                          return (
                            <option key={ev.id} value={ev.id}>
                              {label}{badge}
                            </option>
                          );
                        })}
                      </select>

                      <select
                        value={eventPremiumDuration}
                        onChange={(e) => setEventPremiumDuration(e.target.value)}
                        className="sm:w-44 rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-sm"
                        title="Durée du boost"
                      >
                        <option value="7">7 jours</option>
                        <option value="30">30 jours</option>
                        <option value="90">90 jours</option>
                        <option value="365">365 jours</option>
                        <option value="forever">Illimité</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={!selectedEventId || eventPremiumSaving}
                        onClick={() => adminSetEventPremium({ eventId: selectedEventId, enable: true })}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
                      >
                        {eventPremiumSaving ? 'En cours…' : 'Booster Premium'}
                      </button>

                      <button
                        disabled={!selectedEventId || eventPremiumSaving}
                        onClick={() => adminSetEventPremium({ eventId: selectedEventId, enable: false })}
                        className="px-4 py-2 rounded-xl border border-emerald-100 bg-white text-sm font-semibold text-gray-800 disabled:opacity-60"
                      >
                        Retirer
                      </button>
                    </div>

                    <p className="text-[11px] text-gray-500">
                      Astuce : une fois boosté, l’événement doit débloquer les règles Premium (upload multiple / régénération).
                    </p>
                  </div>
                </div>
              </div>
            </CollapsibleSubSection>

            <CollapsibleSubSection title="Cartes principales" defaultOpen={true}>
              <AutoAnalysis>
                <p>
                  • CA Premium actuel :{' '}
                  <strong>{formatAmount(salesStats.totalRevenueXof)}</strong>.
                </p>
                <p>
                  • Répartition compte vs événement : utile pour tester deux
                  leviers de monétisation (abonnement vs achat ponctuel).
                </p>
                <p>
                  → Prochaine étape : brancher le paiement réel puis suivre la
                  conversion (visites premium → achats).
                </p>
              </AutoAnalysis>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
                <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-4">
                  <p className="text-xs text-gray-500">
                    Clics sur “Installer Grega Play”
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {installStats.totalClicks}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Indicateur d’intérêt pour le mode “app”.
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-4">
                  <p className="text-xs text-gray-500">
                    Chiffre d’affaires Premium
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {formatAmount(salesStats.totalRevenueXof)}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Total ventes Premium (compte + événement).
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-4">
                  <p className="text-xs text-gray-500">
                    Répartition compte vs événement
                  </p>
                  <div className="mt-1 text-sm text-gray-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Premium par compte</span>
                      <span className="font-semibold">
                        {formatAmount(salesStats.accountRevenueXof)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Premium par événement</span>
                      <span className="font-semibold">
                        {formatAmount(salesStats.eventRevenueXof)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-4">
                  <p className="text-xs text-gray-500">
                    Événements passés en Premium
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {salesStats.premiumEventCount}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Events avec is_premium_event = true.
                  </p>
                </div>
              </div>
            </CollapsibleSubSection>

            <CollapsibleSubSection
              title="Ventes Premium par type de célébration"
              defaultOpen={false}
            >
              <AutoAnalysis>
                <p>
                  • Objectif : identifier les thèmes qui monétisent le mieux.
                </p>
                <p>
                  → Action : si un thème surperforme, prioriser son marketing et
                  ses templates.
                </p>
              </AutoAnalysis>

              <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-5 mt-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">
                      Ventes Premium par type de célébration
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Classement des types d’événements par chiffre d’affaires.
                    </p>
                  </div>
                </div>

                {salesStats.byTheme.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">
                    Aucune vente Premium enregistrée pour le moment.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-[11px] text-gray-500">
                          <th className="py-2 pr-4 text-left font-medium">
                            Type d&apos;événement
                          </th>
                          <th className="py-2 px-2 text-right font-medium">
                            Ventes (CA)
                          </th>
                          <th className="py-2 pl-2 text-right font-medium">
                            Nombre d&apos;achats
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesStats.byTheme.map((row) => (
                          <tr
                            key={row.theme}
                            className="border-b border-gray-50 hover:bg-gray-50/50"
                          >
                            <td className="py-2 pr-4 text-left text-gray-800">
                              {row.theme}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-800 font-medium">
                              {formatAmount(row.revenueXof)}
                            </td>
                            <td className="py-2 pl-2 text-right text-gray-700">
                              {row.purchasesCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CollapsibleSubSection>

            <CollapsibleSubSection
              title="Détails usage (AdminDashboardStats)"
              defaultOpen={false}
            >
              <AutoAnalysis>
                <p>
                  • Sert à diagnostiquer l’usage fin quand un KPI semble faible.
                </p>
                <p>
                  → Action : comprendre “où ça bloque” (upload, invitations,
                  génération finale).
                </p>
              </AutoAnalysis>

              <div className="mt-3">
                <AdminDashboardStats />
              </div>
            </CollapsibleSubSection>
          </CollapsibleSection>
        </div>
      </main>
    </MainLayout>
  );
}
