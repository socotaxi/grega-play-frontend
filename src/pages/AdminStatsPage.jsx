// src/pages/AdminStatsPage.jsx
import React, { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';
import AdminDashboardStats from '../components/dashboard/AdminDashboardStats';
import MainLayout from '../components/layout/MainLayout';

const ADMIN_EMAIL = 'edhemrombhot@gmail.com';

export default function AdminStatsPage() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [installStats, setInstallStats] = useState({ totalClicks: 0 });

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

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin === true) {
      fetchInstallStats();
    }
  }, [isAdmin]);

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

  // ✔ Ici : accès admin validé
  return (
    <MainLayout>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
          {/* Header premium */}
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Analytics Grega Play
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Statistiques clés : utilisateurs, événements, vidéos et complétion.
              </p>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-white/80 border border-emerald-100 shadow-sm">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                Compte admin
              </p>
              <p className="text-sm text-gray-800 mt-1">{ADMIN_EMAIL}</p>
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
                <br />- et les premiers signaux techniques.
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-emerald-600 text-white shadow-sm p-5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Objectif
                </p>
                <p className="mt-2 text-sm">
                  Suivre la progression de l’usage réel de Grega Play et détecter
                  les opportunités d’amélioration.
                </p>
              </div>

              <p className="mt-4 text-xs text-emerald-100">
                Prochaine étape : ajouter des sections “Technique” et “Audience”.
              </p>
            </div>
          </section>

          {/* Statistiques principales */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              Indicateurs clés (version 1)
            </h2>

            {/* Bloc stats installation PWA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-4">
                <p className="text-xs text-gray-500">
                  Clics sur “Installer Grega Play”
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {installStats.totalClicks}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  Nombre total de clics sur les boutons d’installation (Home, header,
                  etc.). C’est un premier indicateur d’intérêt pour le mode “app”.
                </p>
              </div>
            </div>

            <AdminDashboardStats />
          </section>
        </div>
      </main>
    </MainLayout>
  );
}
