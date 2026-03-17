import React from 'react';
import { Link } from 'react-router-dom';

const VisitedEventsSection = ({ missingVisited, joinLoadingKey, onJoin, onClear }) => (
  <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Événements visités</h2>
        <p className="text-xs text-gray-500 mt-1">
          Tu as visité ces événements publics. Tu peux les ouvrir, ou décider de les rejoindre pour qu&apos;ils apparaissent dans ton dashboard.
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-[11px] font-medium text-gray-500 hover:text-gray-700"
      >
        Vider
      </button>
    </div>

    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      {missingVisited.map((v) => {
        const key = v.event_id ? `id:${v.event_id}` : `code:${v.public_code}`;
        const joining = joinLoadingKey === key;
        const openUrl = v.public_code ? `/e/${v.public_code}` : v.event_id ? `/events/${v.event_id}` : '#';
        return (
          <div key={key} className="rounded-xl border border-gray-200 bg-gray-50/40 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{v.title || 'Événement'}</p>
                <p className="text-[11px] text-gray-500">
                  {v.theme || 'Événement public'}
                  {v.visited_at ? ` • visité le ${new Date(v.visited_at).toLocaleDateString('fr-FR')}` : ''}
                </p>
              </div>
              <div className="flex flex-col items-center sm:flex-row sm:items-center gap-2">
                <Link
                  to={openUrl}
                  className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                >
                  Ouvrir
                </Link>
                <button
                  type="button"
                  onClick={() => onJoin(v)}
                  disabled={joining}
                  className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-60"
                >
                  {joining ? 'Rejoindre...' : 'Rejoindre'}
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
