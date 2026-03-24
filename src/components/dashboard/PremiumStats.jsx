const getProgressColor = (pct) => {
  if (pct < 30) return 'bg-red-500';
  if (pct < 70) return 'bg-amber-400';
  return 'bg-emerald-500';
};

const StatCard = ({ icon, label, value, sub, children }) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="mt-1.5 text-3xl font-bold text-gray-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
      </div>
      <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 ml-3">
        {icon}
      </div>
    </div>
    {children}
  </div>
);

const PremiumStats = ({ globalStats, statsByTheme }) => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Événements"
        value={globalStats.totalEvents}
        sub="Créés ou gérés"
        icon={
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
      />

      <StatCard
        label="Vidéos reçues"
        value={globalStats.totalWithVideo}
        sub={globalStats.totalInvitations > 0 ? `sur ${globalStats.totalInvitations} invités` : 'Clips collectés'}
        icon={
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
        }
      >
        {globalStats.totalInvitations > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
              <span>Taux de complétion</span>
              <span className="font-semibold text-gray-700">{globalStats.completionPct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${getProgressColor(globalStats.completionPct)} transition-all`}
                style={{ width: `${globalStats.completionPct}%` }}
              />
            </div>
          </div>
        )}
      </StatCard>

      <StatCard
        label="En attente"
        value={globalStats.totalPending}
        sub="Participants sans clip"
        icon={
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    </div>

    {statsByTheme.length > 0 && (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Performance par type d&apos;événement</h2>
          <p className="text-xs text-gray-400 mt-0.5">Taux de participation selon les thèmes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="pb-3 pr-4 text-left">Thème</th>
                <th className="pb-3 px-3 text-right">Événements</th>
                <th className="pb-3 px-3 text-right">Invités</th>
                <th className="pb-3 px-3 text-right">Vidéos</th>
                <th className="pb-3 pl-3 text-right">Complétion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {statsByTheme.map((row) => (
                <tr key={row.theme} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-gray-800">{row.theme}</td>
                  <td className="py-3 px-3 text-right text-gray-600">{row.eventsCount}</td>
                  <td className="py-3 px-3 text-right text-gray-600">{row.totalInvitations}</td>
                  <td className="py-3 px-3 text-right text-gray-600">{row.totalWithVideo}</td>
                  <td className="py-3 pl-3 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      row.completionPct >= 70 ? 'bg-emerald-50 text-emerald-700' :
                      row.completionPct >= 30 ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {row.completionPct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </>
);

export default PremiumStats;
