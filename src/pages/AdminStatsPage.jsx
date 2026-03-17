import { useState } from 'react';
import AdminDashboardStats from '../components/dashboard/AdminDashboardStats';
import MainLayout from '../components/layout/MainLayout';
import MiniLineChart from '../components/admin/MiniLineChart';
import KpiCard from '../components/admin/KpiCard';
import ConfirmModal from '../components/admin/ConfirmModal';
import { useAdminStats } from '../hooks/useAdminStats';
import {
  ADMIN_EMAIL,
  safeNumber,
  formatAmount,
  formatPercent,
  formatDateTime,
  isPremiumActive,
} from '../utils/adminUtils';

// ─── Tab definition ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'apercu',     label: 'Aperçu',     icon: '📊' },
  { id: 'historique', label: 'Historique', icon: '📈' },
  { id: 'tools',      label: 'Admin',      icon: '🛠' },
];

// ─── Reusable sub-components ──────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
      {children}
    </h2>
  );
}

function FeedbackBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-sm text-gray-700">{message}</p>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs shrink-0">
        ✕
      </button>
    </div>
  );
}

// ─── Duration select (reused in both admin panels) ────────────────────────────
function DurationSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm"
    >
      <option value="7">7 jours</option>
      <option value="30">30 jours</option>
      <option value="90">90 jours</option>
      <option value="365">365 jours</option>
      <option value="forever">Illimité</option>
    </select>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminStatsPage() {
  const [activeTab, setActiveTab] = useState('apercu');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState(null);

  const {
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
  } = useAdminStats();

  // Sync adminToolsMsg to local feedback banner
  if (adminToolsMsg && adminToolsMsg !== adminFeedback) setAdminFeedback(adminToolsMsg);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (isAdmin === null) {
    return (
      <MainLayout>
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Vérification de l'accès…
          </div>
        </main>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return (
      <MainLayout>
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center">
          <div className="text-center max-w-sm px-4">
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-xl font-bold text-gray-900">Accès refusé</h1>
            <p className="mt-2 text-sm text-gray-500">
              Cette page est réservée à l'administrateur de Grega Play.
            </p>
          </div>
        </main>
      </MainLayout>
    );
  }

  // ── Trends (compare last two snapshots) ──────────────────────────────────
  const prevSnapshot = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;
  const trend = (field) => {
    if (!adminStatsCache || !prevSnapshot) return null;
    return { delta: safeNumber(adminStatsCache[field]) - safeNumber(prevSnapshot[field]) };
  };

  // ── Completion rate ────────────────────────────────────────────────────────
  const completionRate = (() => {
    if (!adminStatsCache) return null;
    const total = safeNumber(adminStatsCache.total_events);
    const done = safeNumber(adminStatsCache.events_with_final_video);
    if (total <= 0) return null;
    return Math.round((done / total) * 100);
  })();

  // ── Bar chart for sales by theme ──────────────────────────────────────────
  const maxThemeRevenue = salesStats.byTheme[0]?.revenueXof || 1;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

          {/* ── HEADER ──────────────────────────────────────────────────── */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Analytics Grega Play
              </h1>
              <p className="mt-0.5 text-sm text-gray-500">
                {lastSnapshotLabel
                  ? `Dernier snapshot : ${lastSnapshotLabel}`
                  : 'Aucun snapshot disponible'}
                {' · '}
                <span className="text-xs text-gray-400">{ADMIN_EMAIL}</span>
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <button
                onClick={generateSnapshot}
                disabled={snapshotGenerating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-sm hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {snapshotGenerating ? (
                  <>
                    <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Génération…
                  </>
                ) : (
                  '＋ Générer un snapshot'
                )}
              </button>
              {snapshotGenMsg && (
                <p className="text-xs text-gray-500">{snapshotGenMsg}</p>
              )}
            </div>
          </header>

          {/* ── HERO KPI STRIP ──────────────────────────────────────────── */}
          {cacheLoading && (
            <p className="text-xs text-gray-400 animate-pulse">Chargement des indicateurs…</p>
          )}
          {cacheError && (
            <p className="text-xs text-red-500">{cacheError}</p>
          )}

          {adminStatsCache && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard
                label="Utilisateurs"
                value={safeNumber(adminStatsCache.total_users).toLocaleString('fr-FR')}
                trend={trend('total_users')}
              />
              <KpiCard
                label="Actifs 30 j"
                value={safeNumber(adminStatsCache.active_users_last_30d).toLocaleString('fr-FR')}
                description={`${activationPercent}% d'activation`}
                trend={trend('active_users_last_30d')}
              />
              <KpiCard
                label="Événements"
                value={safeNumber(adminStatsCache.total_events).toLocaleString('fr-FR')}
                trend={trend('total_events')}
              />
              <KpiCard
                label="Vidéos reçues"
                value={safeNumber(adminStatsCache.total_videos).toLocaleString('fr-FR')}
                trend={trend('total_videos')}
              />
              <KpiCard
                label="Comptes Premium"
                value={safeNumber(adminStatsCache.premium_account_count).toLocaleString('fr-FR')}
                trend={trend('premium_account_count')}
              />
              <KpiCard
                label="CA Premium"
                value={formatAmount(salesStats.totalRevenueXof)}
                description="Ventes compte + événement"
                dark
              />
            </div>
          )}

          {/* ── TABS ────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-1 rounded-2xl bg-gray-100/80 p-1 w-fit">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === t.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* ════════════════════════════════════════════════════════════════
              TAB 1 — APERÇU
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'apercu' && (
            <div className="space-y-8">

              {/* Quick analysis strip */}
              {adminStatsCache && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                    Analyse automatique
                  </p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>
                      • Activation (30 j) :{' '}
                      <strong>{activationPercent}%</strong>{' '}
                      ({safeNumber(adminStatsCache.active_users_last_30d)}/{safeNumber(adminStatsCache.total_users)} comptes actifs).
                    </li>
                    <li>
                      • Complétion :{' '}
                      <strong>{completionRate != null ? `${completionRate}%` : '—'}</strong>{' '}
                      des événements ont une vidéo finale ({safeNumber(adminStatsCache.events_with_final_video)}/{safeNumber(adminStatsCache.total_events)}).
                    </li>
                    <li>
                      • Participation :{' '}
                      <strong>{Number(adminStatsCache.average_videos_per_event || 0).toFixed(1)}</strong>{' '}
                      vidéos / événement en moyenne.
                    </li>
                    {formatPercent(adminStatsCache.avg_participation_rate) !== '0 %' && (
                      <li>
                        • Taux de participation moyen :{' '}
                        <strong>{formatPercent(adminStatsCache.avg_participation_rate)}</strong>.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Sparklines grid */}
              {snapshots.length >= 2 ? (
                <>
                  <div>
                    <SectionTitle>Évolution dans le temps</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <MiniLineChart title="Utilisateurs totaux"           data={snapshots} valueKey="total_users" />
                      <MiniLineChart title="Utilisateurs actifs (30 j)"    data={snapshots} valueKey="active_users_last_30d" />
                      <MiniLineChart title="Événements totaux"             data={snapshots} valueKey="total_events" />
                      <MiniLineChart title="Vidéos totales"                data={snapshots} valueKey="total_videos" />
                      <MiniLineChart title="Comptes Premium"               data={snapshots} valueKey="premium_account_count" />
                      <MiniLineChart title="Événements avec vidéo finale"  data={snapshots} valueKey="events_with_final_video" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-emerald-200 px-5 py-8 text-center">
                  <p className="text-sm text-gray-500">
                    Pas encore assez de snapshots pour afficher des courbes.
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Génère au moins 2 snapshots via le bouton en haut de page.
                  </p>
                </div>
              )}

              {/* Sales breakdown */}
              <div>
                <SectionTitle>Monétisation</SectionTitle>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                  {/* CA by source */}
                  <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800">Chiffre d'affaires</h3>
                    <div className="space-y-2">
                      {[
                        { label: 'Premium par compte',    value: salesStats.accountRevenueXof },
                        { label: 'Premium par événement', value: salesStats.eventRevenueXof },
                      ].map((row) => {
                        const pct = salesStats.totalRevenueXof > 0
                          ? Math.round((row.value / salesStats.totalRevenueXof) * 100)
                          : 0;
                        return (
                          <div key={row.label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600">{row.label}</span>
                              <span className="text-xs font-semibold text-gray-800">
                                {formatAmount(row.value)}
                                <span className="font-normal text-gray-400 ml-1">({pct}%)</span>
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-emerald-50 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Total</span>
                      <span className="text-sm font-bold text-gray-900">
                        {formatAmount(salesStats.totalRevenueXof)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Événements Premium actifs</span>
                      <span className="text-sm font-bold text-gray-900">
                        {salesStats.premiumEventCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Clics "Installer l'app"</span>
                      <span className="text-sm font-bold text-gray-900">
                        {installStats.totalClicks}
                      </span>
                    </div>
                  </div>

                  {/* Sales by theme */}
                  <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">
                      Ventes par type de célébration
                    </h3>
                    {salesStats.byTheme.length === 0 ? (
                      <p className="text-xs text-gray-400 py-4 text-center">
                        Aucune vente Premium enregistrée.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {salesStats.byTheme.map((row) => {
                          const pct = Math.round((row.revenueXof / maxThemeRevenue) * 100);
                          return (
                            <div key={row.theme}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-700 truncate max-w-[120px]">
                                  {row.theme}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] text-gray-400">
                                    {row.purchasesCount} achat{row.purchasesCount > 1 ? 's' : ''}
                                  </span>
                                  <span className="text-xs font-semibold text-gray-800 w-24 text-right">
                                    {formatAmount(row.revenueXof)}
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-emerald-50 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-400 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed stats — collapsible */}
              <div>
                <button
                  onClick={() => setDetailsOpen((v) => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700 uppercase tracking-widest"
                >
                  <span>{detailsOpen ? '▾' : '▸'}</span>
                  Détails usage (AdminDashboardStats)
                </button>
                {detailsOpen && (
                  <div className="mt-4">
                    <AdminDashboardStats />
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 2 — HISTORIQUE
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'historique' && (
            <div className="space-y-6">

              {/* Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 shrink-0">Période</label>
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
                    className="px-3 py-2 rounded-xl border border-emerald-100 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Actualiser
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  {historyStats.count} snapshot(s)
                  {historyStats.latestLabel ? ` · Dernier : ${historyStats.latestLabel}` : ''}
                </p>
              </div>

              {snapshotsLoading && (
                <p className="text-xs text-gray-400 animate-pulse">Chargement de l'historique…</p>
              )}
              {snapshotsError && (
                <p className="text-xs text-red-500">{snapshotsError}</p>
              )}

              {/* Charts */}
              {!snapshotsLoading && !snapshotsError && (
                snapshots.length >= 2 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <MiniLineChart title="Utilisateurs totaux"           data={snapshots} valueKey="total_users"              height={110} />
                    <MiniLineChart title="Utilisateurs actifs (30 j)"    data={snapshots} valueKey="active_users_last_30d"     height={110} />
                    <MiniLineChart title="Événements totaux"             data={snapshots} valueKey="total_events"              height={110} />
                    <MiniLineChart title="Vidéos totales"                data={snapshots} valueKey="total_videos"              height={110} />
                    <MiniLineChart title="Comptes Premium"               data={snapshots} valueKey="premium_account_count"     height={110} />
                    <MiniLineChart title="Événements avec vidéo finale"  data={snapshots} valueKey="events_with_final_video"   height={110} />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-emerald-200 px-5 py-10 text-center">
                    <p className="text-sm text-gray-500">
                      Pas assez de snapshots. Génère au moins 2 points.
                    </p>
                  </div>
                )
              )}

              {/* Snapshot table */}
              {!snapshotsLoading && !snapshotsError && snapshots.length > 0 && (
                <div>
                  <SectionTitle>Liste des snapshots</SectionTitle>
                  <div className="overflow-x-auto rounded-2xl border border-emerald-100 bg-white shadow-sm">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-[11px] text-gray-400">
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
                            <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <td className="py-2 px-4 text-left text-gray-700 font-medium">
                                {s.snapshot_date
                                  ? new Date(s.snapshot_date).toLocaleDateString('fr-FR')
                                  : '—'}
                              </td>
                              <td className="py-2 px-2 text-right text-gray-700">{safeNumber(s.total_users)}</td>
                              <td className="py-2 px-2 text-right text-gray-600">{safeNumber(s.active_users_last_30d)}</td>
                              <td className="py-2 px-2 text-right text-gray-600">{safeNumber(s.total_events)}</td>
                              <td className="py-2 px-2 text-right text-gray-600">{safeNumber(s.events_with_final_video)}</td>
                              <td className="py-2 px-2 text-right text-gray-600">{safeNumber(s.total_videos)}</td>
                              <td className="py-2 px-2 text-right text-gray-600">
                                {Number(s.average_videos_per_event || 0).toFixed(1)}
                              </td>
                              <td className="py-2 px-2 text-right text-gray-600">{safeNumber(s.premium_account_count)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 3 — ADMIN TOOLS
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'tools' && (
            <div className="space-y-6">

              <FeedbackBanner
                message={adminFeedback}
                onClose={() => setAdminFeedback(null)}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* ── Premium Compte ───────────────────────────────────── */}
                <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">
                      Basculer un compte en Premium
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Recherche par email ou nom (min. 2 caractères).
                    </p>
                  </div>

                  <input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Ex : john@gmail.com ou Marie"
                    className="w-full rounded-xl border border-emerald-100 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />

                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="flex-1 rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">
                        {userSearching ? 'Recherche…' : 'Sélectionner un utilisateur'}
                      </option>
                      {userResults.map((u) => {
                        const label = `${u.full_name ? u.full_name + ' — ' : ''}${u.email || u.id}`;
                        const active = isPremiumActive(u.is_premium_account, u.premium_account_expires_at);
                        const badge = active
                          ? ` ✓ Premium jusqu'au ${formatDateTime(u.premium_account_expires_at)}`
                          : '';
                        return (
                          <option key={u.id} value={u.id}>
                            {label}{badge}
                          </option>
                        );
                      })}
                    </select>
                    <DurationSelect value={userPremiumDuration} onChange={setUserPremiumDuration} />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={!selectedUserId || userPremiumSaving}
                      onClick={() => adminSetUserPremium({ userId: selectedUserId, enable: true })}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {userPremiumSaving ? 'En cours…' : 'Activer Premium'}
                    </button>
                    <button
                      disabled={!selectedUserId || userPremiumSaving}
                      onClick={() => adminSetUserPremium({ userId: selectedUserId, enable: false })}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Désactiver
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-400">
                    Nécessite les RPC <code className="bg-gray-100 px-1 rounded">admin_set_user_premium</code> côté Supabase.
                  </p>
                </div>

                {/* ── Premium Événement ────────────────────────────────── */}
                <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">
                      Booster un événement en Premium
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Recherche par titre (min. 2 car.) ou colle un UUID.
                    </p>
                  </div>

                  <input
                    value={eventQuery}
                    onChange={(e) => setEventQuery(e.target.value)}
                    placeholder="Ex : Anniversaire Lyne ou 128cd01e-…"
                    className="w-full rounded-xl border border-emerald-100 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />

                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                      className="flex-1 rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">
                        {eventSearching ? 'Recherche…' : 'Sélectionner un événement'}
                      </option>
                      {eventResults.map((ev) => {
                        const label = `${ev.title ? ev.title + ' — ' : ''}${ev.id}`;
                        const active = isPremiumActive(ev.is_premium_event, ev.premium_event_expires_at);
                        const badge = active
                          ? ` ✓ Boost jusqu'au ${formatDateTime(ev.premium_event_expires_at)}`
                          : '';
                        return (
                          <option key={ev.id} value={ev.id}>
                            {label}{badge}
                          </option>
                        );
                      })}
                    </select>
                    <DurationSelect value={eventPremiumDuration} onChange={setEventPremiumDuration} />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={!selectedEventId || eventPremiumSaving}
                      onClick={() => adminSetEventPremium({ eventId: selectedEventId, enable: true })}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {eventPremiumSaving ? 'En cours…' : 'Booster Premium'}
                    </button>
                    <button
                      disabled={!selectedEventId || eventPremiumSaving}
                      onClick={() => adminSetEventPremium({ eventId: selectedEventId, enable: false })}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Retirer
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-400">
                    Nécessite les RPC <code className="bg-gray-100 px-1 rounded">admin_set_event_premium</code> côté Supabase.
                  </p>
                </div>

              </div>

              {/* Detailed stats */}
              <div>
                <button
                  onClick={() => setDetailsOpen((v) => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700 uppercase tracking-widest"
                >
                  <span>{detailsOpen ? '▾' : '▸'}</span>
                  Détails usage (AdminDashboardStats)
                </button>
                {detailsOpen && (
                  <div className="mt-4">
                    <AdminDashboardStats />
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </main>

      {/* ── Confirmation modal (above everything) ───────────────────────── */}
      <ConfirmModal
        confirm={pendingConfirm}
        onConfirm={() => resolveConfirm(true)}
        onCancel={() => resolveConfirm(false)}
        loading={confirmLoading}
      />

    </MainLayout>
  );
}
