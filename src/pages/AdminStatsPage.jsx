import { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import ConfirmModal from '../components/admin/ConfirmModal';
import { useAdminStats } from '../hooks/useAdminStats';
import {
  ADMIN_EMAIL,
  formatAmount,
  isPremiumActive,
} from '../utils/adminUtils';

// ─── Icons ────────────────────────────────────────────────────────────────────

const IC = {
  users:   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4.13a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  zap:     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  events:  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  video:   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>,
  star:    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
  money:   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  refresh: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  search:  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>,
  check:   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
  chevron: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>,
  clock:   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner({ size = 'sm' }) {
  const s = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return (
    <svg className={`${s} animate-spin text-emerald-500`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `il y a ${m || 1} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

function Card({ children, className = '' }) {
  return <div className={`rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}>{children}</div>;
}

function Badge({ children, color = 'gray' }) {
  const c = {
    gray:    'bg-gray-100 text-gray-500',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber:   'bg-amber-50 text-amber-700',
    violet:  'bg-violet-50 text-violet-700',
    red:     'bg-red-50 text-red-600',
    sky:     'bg-sky-50 text-sky-700',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c[color] || c.gray}`}>{children}</span>;
}

function ProgressBar({ pct, color = 'emerald' }) {
  const c = { emerald: 'bg-emerald-500', violet: 'bg-violet-500', sky: 'bg-sky-500', amber: 'bg-amber-500' };
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${c[color] || c.emerald}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, badge, color = 'emerald', dark = false }) {
  const accent = {
    emerald: 'bg-emerald-50 text-emerald-600',
    violet:  'bg-violet-50 text-violet-600',
    sky:     'bg-sky-50 text-sky-600',
    amber:   'bg-amber-50 text-amber-600',
  };
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-3 shadow-sm ${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${dark ? 'bg-white/10 text-white' : accent[color]}`}>
          {icon}
        </div>
        {badge}
      </div>
      <div>
        <p className={`text-2xl font-bold tracking-tight leading-none ${dark ? 'text-white' : 'text-gray-900'}`}>{value ?? '—'}</p>
        <p className={`text-xs mt-1 font-medium ${dark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</p>
        {sub && <p className={`text-[11px] mt-0.5 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'apercu',    label: 'Vue d\'ensemble' },
  { id: 'activite',  label: 'Activité récente' },
  { id: 'outils',    label: 'Outils admin' },
];

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">{IC.check}</span>
      <p className="text-sm text-emerald-800 flex-1">{message}</p>
      <button onClick={onClose} className="text-emerald-400 hover:text-emerald-600 ml-2">✕</button>
    </div>
  );
}

// ─── Duration select ──────────────────────────────────────────────────────────

function DurationSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200">
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
  const [adminFeedback, setAdminFeedback] = useState(null);

  const {
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
  } = useAdminStats();

  if (adminToolsMsg && adminToolsMsg !== adminFeedback) setAdminFeedback(adminToolsMsg);

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (isAdmin === null) {
    return (
      <MainLayout>
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3"><Spinner size="lg" /><span className="text-sm text-gray-400">Vérification…</span></div>
        </main>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return (
      <MainLayout>
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center bg-white border border-gray-100 rounded-3xl px-8 py-10 shadow-sm max-w-sm">
            <div className="text-4xl mb-3">🔒</div>
            <h1 className="font-bold text-gray-900">Accès refusé</h1>
            <p className="text-sm text-gray-500 mt-1">Réservé à l'administrateur de Grega Play.</p>
          </div>
        </main>
      </MainLayout>
    );
  }

  const maxThemeRevenue = salesStats.byTheme[0]?.revenue || 1;

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <main className="min-h-screen bg-gray-50 pb-24 lg:pb-8">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="bg-slate-900">
          <div className="max-w-6xl mx-auto px-4 pt-6 pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Administration · {ADMIN_EMAIL}</p>
                <h1 className="text-xl font-bold text-white">Tableau de bord</h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Données en temps réel
                  {lastRefresh && (
                    <span className="ml-2 text-slate-500">· Mis à jour {timeAgo(lastRefresh)}</span>
                  )}
                </p>
              </div>
              <button
                onClick={refresh}
                disabled={statsLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/10 disabled:opacity-50 transition-all"
              >
                {statsLoading ? <Spinner /> : IC.refresh}
                Actualiser
              </button>
            </div>

            {/* KPIs inline dans le header */}
            {statsError ? (
              <div className="mb-4 text-sm text-red-400 bg-red-900/20 rounded-xl px-4 py-3">{statsError}</div>
            ) : stats ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-0">
                {[
                  { label: 'Utilisateurs', value: stats.totalUsers.toLocaleString('fr-FR'), sub: `+${stats.newUsers7d} cette semaine`, color: 'text-white' },
                  { label: 'Actifs 30 j',  value: stats.activeUsers30d.toLocaleString('fr-FR'), sub: `${stats.activationRate}% du total`, color: 'text-emerald-300' },
                  { label: 'Événements',   value: stats.totalEvents.toLocaleString('fr-FR'), sub: `+${stats.newEvents7d} cette semaine`, color: 'text-sky-300' },
                  { label: 'Vidéos',       value: stats.totalVideos.toLocaleString('fr-FR'), sub: `+${stats.newVideos7d} cette semaine`, color: 'text-violet-300' },
                ].map((k) => (
                  <div key={k.label} className="bg-white/5 border border-white/10 rounded-xl px-3 py-3">
                    <p className="text-[11px] text-slate-400">{k.label}</p>
                    <p className={`text-xl font-bold mt-0.5 ${k.color}`}>{k.value}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{k.sub}</p>
                  </div>
                ))}
              </div>
            ) : statsLoading ? (
              <div className="mb-4 flex items-center gap-2 text-slate-400 text-sm"><Spinner /> Chargement des données…</div>
            ) : null}

            {/* Tabs */}
            <div className="flex gap-0 mt-5 border-b border-white/10">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all ${
                    activeTab === t.id
                      ? 'border-emerald-400 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── CONTENT ─────────────────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

          {/* ══════════════════════════════════════════════════════════════
              TAB 1 — VUE D'ENSEMBLE
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'apercu' && stats && (
            <div className="space-y-6">

              {/* Métriques détaillées */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <KpiCard
                  label="Comptes Premium"
                  value={stats.premiumAccounts.toLocaleString('fr-FR')}
                  sub={`${stats.totalUsers > 0 ? Math.round((stats.premiumAccounts / stats.totalUsers) * 100) : 0}% des utilisateurs`}
                  icon={IC.star} color="amber"
                  badge={<Badge color="amber">Comptes</Badge>}
                />
                <KpiCard
                  label="Taux de complétion"
                  value={`${stats.completionRate}%`}
                  sub={`${stats.eventsWithVideo} / ${stats.totalEvents} événements finalisés`}
                  icon={IC.video} color="sky"
                />
                <KpiCard
                  label="Installations app"
                  value={stats.installClicks.toLocaleString('fr-FR')}
                  sub="Clics sur 'Installer'"
                  icon={IC.zap} color="violet"
                />
                <KpiCard
                  label="CA potentiel / mois"
                  value={formatAmount(salesStats.potentialMonthlyRevenue)}
                  sub={`Si phase bêta terminée · $${(9.99).toFixed(2)}/compte · $${(4.99).toFixed(2)}/event`}
                  icon={IC.money}
                  dark
                />
              </div>

              {/* Taux visuels */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Activation (30 j)',     value: stats.activationRate,  pct: stats.activationRate,  color: 'emerald', detail: `${stats.activeUsers30d} utilisateurs actifs` },
                  { label: 'Complétion événements', value: stats.completionRate,  pct: stats.completionRate,  color: 'sky',     detail: `${stats.eventsWithVideo} vidéos finales générées` },
                  { label: 'Part Premium',           value: stats.totalUsers > 0 ? Math.round((stats.premiumAccounts / stats.totalUsers) * 100) : 0,
                    pct: stats.totalUsers > 0 ? Math.round((stats.premiumAccounts / stats.totalUsers) * 100) : 0,
                    color: 'amber', detail: `${stats.premiumAccounts} comptes premium` },
                ].map((m) => (
                  <Card key={m.label} className="p-4">
                    <div className="flex items-end justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">{m.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{m.value}%</p>
                    </div>
                    <ProgressBar pct={m.pct} color={m.color} />
                    <p className="text-[11px] text-gray-400 mt-2">{m.detail}</p>
                  </Card>
                ))}
              </div>

              {/* Monétisation */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* CA réel (Stripe) + CA potentiel bêta */}
                <Card className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Revenus</h3>
                    <Badge color="amber">Phase bêta</Badge>
                  </div>

                  {/* CA potentiel */}
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 mb-4">
                    <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wide mb-3">
                      CA potentiel estimé · si les abonnements étaient actifs
                    </p>
                    <div className="space-y-3">
                      {[
                        { label: `Comptes Premium (× $9.99/mois)`, value: salesStats.potentialAccountRevenue, count: stats?.premiumAccounts ?? 0, color: 'emerald' },
                        { label: `Événements Premium (× $4.99)`,    value: salesStats.potentialEventRevenue,  count: salesStats.premiumEventCount,       color: 'violet' },
                      ].map((row) => {
                        const total = salesStats.potentialMonthlyRevenue;
                        const pct   = total > 0 ? Math.round((row.value / total) * 100) : 0;
                        return (
                          <div key={row.label}>
                            <div className="flex items-center justify-between mb-1.5 text-sm">
                              <span className="text-gray-600">{row.label}</span>
                              <span className="font-semibold text-gray-900">
                                {formatAmount(row.value)}
                                <span className="text-xs font-normal text-gray-400 ml-1">({row.count})</span>
                              </span>
                            </div>
                            <ProgressBar pct={pct} color={row.color} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 pt-3 border-t border-amber-200 flex items-center justify-between">
                      <span className="text-xs text-amber-700 font-medium">Total mensuel estimé</span>
                      <span className="text-base font-bold text-amber-800">{formatAmount(salesStats.potentialMonthlyRevenue)}</span>
                    </div>
                  </div>

                  {/* CA réel Stripe */}
                  <div className="pt-2">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">CA réel (Stripe)</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Total encaissé</span>
                      <span className="text-sm font-bold text-gray-900">{formatAmount(salesStats.totalRevenue)}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Stripe est désactivé pendant la phase bêta — toujours à $0.00.
                    </p>
                  </div>
                </Card>

                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Ventes par célébration</h3>
                  <p className="text-xs text-gray-400 mb-4">Basé sur les achats Stripe confirmés</p>
                  {salesStats.byTheme.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-gray-400">Aucune vente enregistrée.</p>
                      <p className="text-xs text-gray-300 mt-1">Les données apparaîtront quand Stripe sera activé.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {salesStats.byTheme.map((row, i) => {
                        const pct = maxThemeRevenue > 0 ? Math.round((row.revenue / maxThemeRevenue) * 100) : 0;
                        return (
                          <div key={row.theme}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[11px] font-bold text-gray-300 w-4 shrink-0">#{i + 1}</span>
                                <span className="text-sm text-gray-700 truncate">{row.theme}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <Badge color="gray">{row.purchasesCount} achat{row.purchasesCount > 1 ? 's' : ''}</Badge>
                                <span className="text-sm font-semibold text-gray-900">{formatAmount(row.revenue)}</span>
                              </div>
                            </div>
                            <ProgressBar pct={pct} color="emerald" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 2 — ACTIVITÉ RÉCENTE
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'activite' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Derniers événements */}
              <Card>
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Derniers événements créés</h3>
                  <Badge color="sky">{recentEvents.length}</Badge>
                </div>
                <div className="divide-y divide-gray-50">
                  {recentEvents.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-gray-400 text-center">Aucun événement.</p>
                  ) : recentEvents.map((ev) => (
                    <div key={ev.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0 text-base">
                        🎉
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{ev.title || 'Sans titre'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {ev.theme && <Badge color="gray">{ev.theme}</Badge>}
                          {ev.is_premium_event && <Badge color="amber">Premium</Badge>}
                          {ev.final_video_url && <Badge color="emerald">Finalisé</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-gray-400 shrink-0">
                        {IC.clock} {timeAgo(ev.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Derniers utilisateurs */}
              <Card>
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Dernières inscriptions</h3>
                  <Badge color="emerald">{recentUsers.length}</Badge>
                </div>
                <div className="divide-y divide-gray-50">
                  {recentUsers.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-gray-400 text-center">Aucun utilisateur.</p>
                  ) : recentUsers.map((u) => (
                    <div key={u.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">
                          {(u.full_name || u.email || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{u.full_name || 'Sans nom'}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {u.is_premium_account && <Badge color="amber">Premium</Badge>}
                        <span className="text-[11px] text-gray-400">{formatDate(u.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 3 — OUTILS ADMIN
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'outils' && (
            <div className="space-y-5">
              <Toast message={adminFeedback} onClose={() => setAdminFeedback(null)} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Gestion Premium Compte */}
                <Card className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Gérer un compte Premium</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Recherche par email ou nom (min. 2 car.)</p>
                    </div>
                    <Badge color="emerald">Compte</Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{IC.search}</div>
                      <input
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        placeholder="john@gmail.com ou Marie…"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent"
                      />
                      {userSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner /></div>}
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 min-w-0"
                      >
                        <option value="">{userResults.length === 0 ? 'Aucun résultat' : 'Choisir…'}</option>
                        {userResults.map((u) => {
                          const active = isPremiumActive(u.is_premium_account, u.premium_account_expires_at);
                          return (
                            <option key={u.id} value={u.id}>
                              {u.full_name ? `${u.full_name} — ` : ''}{u.email || u.id}{active ? ' ✓' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <DurationSelect value={userPremiumDuration} onChange={setUserPremiumDuration} />
                    </div>

                    {selectedUserId && (() => {
                      const u = userResults.find((r) => r.id === selectedUserId);
                      if (!u) return null;
                      const active = isPremiumActive(u.is_premium_account, u.premium_account_expires_at);
                      return (
                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center shrink-0">
                            {(u.full_name || u.email || '?')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 truncate">{u.full_name || 'Sans nom'}</p>
                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          </div>
                          <Badge color={active ? 'emerald' : 'gray'}>{active ? '✓ Premium' : 'Gratuit'}</Badge>
                        </div>
                      );
                    })()}

                    <div className="flex gap-2 pt-1">
                      <button
                        disabled={!selectedUserId || userPremiumSaving}
                        onClick={() => adminSetUserPremium({ userId: selectedUserId, enable: true })}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {userPremiumSaving ? 'En cours…' : 'Activer Premium'}
                      </button>
                      <button
                        disabled={!selectedUserId || userPremiumSaving}
                        onClick={() => adminSetUserPremium({ userId: selectedUserId, enable: false })}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Désactiver
                      </button>
                    </div>
                  </div>
                </Card>

                {/* Gestion Premium Événement */}
                <Card className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Booster un événement</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Recherche par titre ou UUID</p>
                    </div>
                    <Badge color="violet">Événement</Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{IC.search}</div>
                      <input
                        value={eventQuery}
                        onChange={(e) => setEventQuery(e.target.value)}
                        placeholder="Anniversaire Lyne ou UUID…"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent"
                      />
                      {eventSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner /></div>}
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 min-w-0"
                      >
                        <option value="">{eventResults.length === 0 ? 'Aucun résultat' : 'Choisir…'}</option>
                        {eventResults.map((ev) => {
                          const active = isPremiumActive(ev.is_premium_event, ev.premium_event_expires_at);
                          return (
                            <option key={ev.id} value={ev.id}>
                              {ev.title ? `${ev.title} — ` : ''}{ev.id}{active ? ' ✓' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <DurationSelect value={eventPremiumDuration} onChange={setEventPremiumDuration} />
                    </div>

                    {selectedEventId && (() => {
                      const ev = eventResults.find((r) => r.id === selectedEventId);
                      if (!ev) return null;
                      const active = isPremiumActive(ev.is_premium_event, ev.premium_event_expires_at);
                      return (
                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                          <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 text-sm flex items-center justify-center shrink-0">🎉</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 truncate">{ev.title || 'Sans titre'}</p>
                            <p className="text-xs text-gray-400 truncate">{ev.id}</p>
                          </div>
                          <Badge color={active ? 'emerald' : 'gray'}>{active ? '✓ Boosté' : 'Standard'}</Badge>
                        </div>
                      );
                    })()}

                    <div className="flex gap-2 pt-1">
                      <button
                        disabled={!selectedEventId || eventPremiumSaving}
                        onClick={() => adminSetEventPremium({ eventId: selectedEventId, enable: true })}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {eventPremiumSaving ? 'En cours…' : 'Booster Premium'}
                      </button>
                      <button
                        disabled={!selectedEventId || eventPremiumSaving}
                        onClick={() => adminSetEventPremium({ eventId: selectedEventId, enable: false })}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

        </div>
      </main>

      <ConfirmModal
        confirm={pendingConfirm}
        onConfirm={() => resolveConfirm(true)}
        onCancel={() => resolveConfirm(false)}
        loading={confirmLoading}
      />
    </MainLayout>
  );
}
