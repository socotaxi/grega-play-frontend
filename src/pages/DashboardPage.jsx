import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Loading from '../components/ui/Loading';
import ActivityFeed from '../components/feed/ActivityFeed';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import PremiumStats from '../components/dashboard/PremiumStats';
import EventCard from '../components/dashboard/EventCard';
import VisitedEventsSection from '../components/dashboard/VisitedEventsSection';
import { useDashboardData } from '../hooks/useDashboardData';
import OnboardingTour from '../components/onboarding/OnboardingTour';
import { useOnboardingTour } from '../hooks/useOnboardingTour';

const QuickStat = ({ icon, label, value, bgColor, iconColor }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bgColor}`}>
      <svg className={`w-5 h-5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {icon}
      </svg>
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  </div>
);

const DashboardPage = () => {
  const {
    user, profile,
    eventStats, ownerNamesByUserId,
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
  } = useDashboardData();

  const { activeStep, advance, skip } = useOnboardingTour(user?.id, sortedEvents.length > 0);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center">
          <Loading />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

          <DashboardHeader user={user} profile={profile} premiumAccountLabel={premiumAccountLabel} />

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Quick stats — non-premium users */}
          {sortedEvents.length > 0 && !isPremiumAccount && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <QuickStat
                label="Événements"
                value={globalStats.totalEvents}
                bgColor="bg-indigo-50"
                iconColor="text-indigo-600"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
              />
              <QuickStat
                label="Vidéos reçues"
                value={globalStats.totalWithVideo}
                bgColor="bg-emerald-50"
                iconColor="text-emerald-600"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />}
              />
              <QuickStat
                label="En attente"
                value={globalStats.totalPending}
                bgColor="bg-amber-50"
                iconColor="text-amber-600"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
              />
            </div>
          )}

          {/* Premium stats */}
          {isPremiumAccount && sortedEvents.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Statistiques de participation</h2>
                <button
                  type="button"
                  onClick={() => setShowStats((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  {showStats ? (
                    <>
                      Réduire
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </>
                  ) : (
                    <>
                      Afficher
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
              {showStats && <PremiumStats globalStats={globalStats} statsByTheme={statsByTheme} />}
            </>
          )}

          {/* Main layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Events list */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Mes événements</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Projets vidéo créés ou reçus</p>
                  </div>
                  {sortedEvents.length > 0 && (
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full px-3 py-1">
                      {sortedEvents.length} événement{sortedEvents.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="px-5 py-5">
                  {sortedEvents.length === 0 ? (
                    <div className="py-12 flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-800">Aucun événement pour l&apos;instant</h3>
                      <p className="mt-1 text-sm text-gray-400 max-w-xs">
                        Crée ton premier événement pour collecter des vidéos et générer une surprise mémorable.
                      </p>
                      <Link
                        to="/create-event"
                        data-onboarding="create-btn"
                        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Créer mon premier événement
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sortedEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          user={user}
                          isPremiumAccount={isPremiumAccount}
                          ownerNamesByUserId={ownerNamesByUserId}
                          eventStats={eventStats}
                          capsByEventId={capsByEventId}
                          capsLoadingByEventId={capsLoadingByEventId}
                          deletingEventId={deletingEventId}
                          onDelete={handleDeleteEvent}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {missingVisited.length > 0 && (
                <VisitedEventsSection
                  missingVisited={missingVisited}
                  joinLoadingKey={joinLoadingKey}
                  onJoin={handleJoinVisited}
                  onClear={clearVisited}
                />
              )}
            </div>

            {/* Activity sidebar */}
            <div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 lg:sticky lg:top-6">
                <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Activité récente</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Dernières soumissions de clips</p>
                </div>
                <div className="px-3 py-3">
                  {sortedEvents.length > 0 ? (
                    <ActivityFeed eventId={sortedEvents[0].id} />
                  ) : (
                    <div className="flex flex-col items-center text-center py-8 px-2">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-400">Crée un événement pour voir l&apos;activité ici</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <OnboardingTour activeStep={activeStep} onAdvance={advance} onSkip={skip} />
    </MainLayout>
  );
};

export default DashboardPage;
