import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import ActivityFeed from '../components/feed/ActivityFeed';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import PremiumStats from '../components/dashboard/PremiumStats';
import EventCard from '../components/dashboard/EventCard';
import VisitedEventsSection from '../components/dashboard/VisitedEventsSection';
import { useDashboardData } from '../hooks/useDashboardData';

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

          <DashboardHeader user={user} profile={profile} premiumAccountLabel={premiumAccountLabel} />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}

          {isPremiumAccount && sortedEvents.length > 0 && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowStats((prev) => !prev)}
                className="text-xs md:text-sm px-4 py-2"
              >
                {showStats ? 'Masquer les statistiques' : 'Afficher les statistiques de participation'}
              </Button>
            </div>
          )}

          {isPremiumAccount && showStats && sortedEvents.length > 0 && (
            <PremiumStats globalStats={globalStats} statsByTheme={statsByTheme} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Mes événements</h2>
                    <p className="text-xs text-gray-500 mt-1">Retrouve tous tes projets vidéo créés ou reçus.</p>
                  </div>
                  {sortedEvents.length > 0 && (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1">
                      {sortedEvents.length} événement{sortedEvents.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="px-5 py-4">
                  {sortedEvents.length === 0 ? (
                    <div className="py-8 flex flex-col items-center text-center">
                      <h3 className="mt-3 text-sm font-semibold text-gray-800">Aucun événement pour l&apos;instant</h3>
                      <p className="mt-1 text-sm text-gray-500 max-w-xs">
                        Crée ton premier événement pour collecter des vidéos et générer une surprise.
                      </p>
                      <Link to="/create-event" className="mt-4">
                        <Button className="text-sm px-4 py-2">+ Créer un événement</Button>
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

            <div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full">
                <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Activité récente</h2>
                </div>
                <div className="px-3 py-3">
                  {sortedEvents.length > 0 ? (
                    <ActivityFeed eventId={sortedEvents[0].id} />
                  ) : (
                    <p className="text-xs text-gray-500 px-2 py-4">
                      Crée un événement pour voir ici l&apos;activité de ton projet.
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
