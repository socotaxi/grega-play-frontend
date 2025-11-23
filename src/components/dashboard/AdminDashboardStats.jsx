// src/components/dashboard/AdminDashboardStats.jsx
import React, { useEffect, useState } from 'react';
import { fetchDashboardStats } from '../../services/dashboardService';

export default function AdminDashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Erreur AdminDashboardStats :', error);
        setErrorMsg("Impossible de charger les statistiques.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement des statistiques...</p>;
  }

  if (errorMsg) {
    return <p className="text-sm text-red-600">{errorMsg}</p>;
  }

  if (!stats) {
    return <p className="text-sm text-gray-500">Aucune donnée disponible.</p>;
  }

  const {
    weekly_active_users,
    events_last_7d,
    total_videos,
    completed_events,
    upload_errors,
  } = stats;

  return (
    <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Utilisateurs actifs (7j) */}
      <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Utilisateurs actifs (7 derniers jours)
        </h3>
        <p className="mt-2 text-3xl font-bold text-gray-900">
          {weekly_active_users ?? 0}
        </p>
      </div>

      {/* Événements créés (7j) */}
      <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Événements créés (7 derniers jours)
        </h3>
        <p className="mt-2 text-3xl font-bold text-gray-900">
          {events_last_7d ?? 0}
        </p>
      </div>

      {/* Total vidéos */}
      <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Vidéos envoyées (total)
        </h3>
        <p className="mt-2 text-3xl font-bold text-gray-900">
          {total_videos ?? 0}
        </p>
      </div>

      {/* Événements complétés */}
      <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Événements complétés
        </h3>
        <p className="mt-2 text-3xl font-bold text-gray-900">
          {completed_events ?? 0}
        </p>
      </div>

      {/* Erreurs d'upload (placeholder) */}
      <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Erreurs d'upload (placeholder)
        </h3>
        <p className="mt-2 text-3xl font-bold text-gray-900">
          {upload_errors ?? 0}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Ce chiffre sera connecté à de vrais logs plus tard.
        </p>
      </div>
    </section>
  );
}
