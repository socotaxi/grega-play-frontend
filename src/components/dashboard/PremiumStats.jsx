import React from 'react';

const getProgressColor = (pct) => {
  if (pct < 30) return 'bg-red-500';
  if (pct < 70) return 'bg-orange-400';
  return 'bg-emerald-500';
};

const PremiumStats = ({ globalStats, statsByTheme }) => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4">
        <p className="text-xs text-gray-500">Événements</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{globalStats.totalEvents}</p>
        <p className="mt-1 text-[11px] text-gray-500">Nombre total d&apos;événements que tu as créés ou gères.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4">
        <p className="text-xs text-gray-500">Vidéos reçues</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {globalStats.totalWithVideo}
          {globalStats.totalInvitations > 0 && (
            <span className="ml-2 text-sm font-medium text-gray-500">/ {globalStats.totalInvitations}</span>
          )}
        </p>
        <p className="mt-1 text-[11px] text-gray-500">Clips reçus sur l&apos;ensemble de tes événements.</p>
        {globalStats.totalInvitations > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
              <span>Taux de complétion</span>
              <span className="font-medium text-gray-700">{globalStats.completionPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-2 rounded-full ${getProgressColor(globalStats.completionPct)} transition-all`}
                style={{ width: `${globalStats.completionPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4">
        <p className="text-xs text-gray-500">En attente de vidéo</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{globalStats.totalPending}</p>
        <p className="mt-1 text-[11px] text-gray-500">Participants invités qui n&apos;ont pas encore envoyé de clip.</p>
      </div>
    </div>

    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Performance par type d&apos;événement</h2>
        <p className="text-xs text-gray-500 mt-1">
          Compare les types d&apos;événements pour voir où Grega Play performe le mieux.
        </p>
      </div>
      <div className="mt-2 overflow-x-auto">
        {statsByTheme.length === 0 ? (
          <p className="text-xs text-gray-500 py-4">Aucune statistique disponible pour l&apos;instant.</p>
        ) : (
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] text-gray-500">
                <th className="py-2 pr-4 text-left font-medium">Type d&apos;événement</th>
                <th className="py-2 px-2 text-right font-medium">Événements</th>
                <th className="py-2 px-2 text-right font-medium">Invités</th>
                <th className="py-2 px-2 text-right font-medium">Vidéos reçues</th>
                <th className="py-2 pl-2 text-right font-medium">Taux de complétion</th>
              </tr>
            </thead>
            <tbody>
              {statsByTheme.map((row) => (
                <tr key={row.theme} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2 pr-4 text-left text-gray-800">{row.theme}</td>
                  <td className="py-2 px-2 text-right text-gray-700">{row.eventsCount}</td>
                  <td className="py-2 px-2 text-right text-gray-700">{row.totalInvitations}</td>
                  <td className="py-2 px-2 text-right text-gray-700">{row.totalWithVideo}</td>
                  <td className="py-2 pl-2 text-right text-gray-700">{row.completionPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </>
);

export default PremiumStats;
