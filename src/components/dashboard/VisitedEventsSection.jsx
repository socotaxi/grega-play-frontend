import { Link } from 'react-router-dom';

const VisitedEventsSection = ({ missingVisited, joinLoadingKey, onJoin, onClear }) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
    <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Événements visités</h2>
        <p className="text-xs text-gray-400 mt-0.5">Événements publics consultés récemment</p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
      >
        Effacer tout
      </button>
    </div>

    <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      {missingVisited.map((v) => {
        const key = v.event_id ? `id:${v.event_id}` : `code:${v.public_code}`;
        const joining = joinLoadingKey === key;
        const openUrl = v.public_code ? `/e/${v.public_code}` : v.event_id ? `/events/${v.event_id}` : '#';
        return (
          <div key={key} className="rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{v.title || 'Événement'}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {v.theme || 'Événement public'}
                  {v.visited_at ? ` · ${new Date(v.visited_at).toLocaleDateString('fr-FR')}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  to={openUrl}
                  className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Ouvrir
                </Link>
                <button
                  type="button"
                  onClick={() => onJoin(v)}
                  disabled={joining}
                  className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                >
                  {joining ? '…' : 'Rejoindre'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default VisitedEventsSection;
