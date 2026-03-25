import { useEffect, useState } from "react";
import activityService from "../../services/activityService";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_KEY = import.meta.env.VITE_BACKEND_API_KEY;

const PAGE_SIZE = 4;

const ActivityFeed = ({ eventId, userId }) => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        let data = [];
        if (eventId) {
          data = await activityService.getEventFeed(eventId);
        } else if (userId) {
          data = await activityService.getUserFeed(userId);
        }
        setFeed(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erreur feed:", err);
        setFeed([]);
      } finally {
        setLoading(false);
      }
    };

    if (eventId || userId) {
      fetchFeed();
    }
  }, [eventId, userId]);

  const clearAll = async () => {
    if (!feed.length) return;
    setClearing(true);

    const url = eventId
      ? `${API_BASE_URL}/api/activity/event/${eventId}`
      : `${API_BASE_URL}/api/activity/user/${userId}`;

    const res = await fetch(url, {
      method: "DELETE",
      headers: { "x-api-key": API_KEY },
    });

    if (!res.ok) {
      console.error("Erreur clearAll activity_feed:", await res.text());
      setClearing(false);
      return;
    }

    setFeed([]);
    setPage(1);
    setClearing(false);
  };

  const totalPages = Math.ceil(feed.length / PAGE_SIZE);
  const paginated = feed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <p>Chargement du fil d'activités…</p>;

  return (
    <div className="p-4 bg-white rounded shadow mt-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">Fil d'activités</h2>
        {feed.length > 0 && (
          <button
            onClick={clearAll}
            disabled={clearing}
            className="text-sm text-red-500 hover:underline disabled:opacity-50"
          >
            {clearing ? "Suppression…" : "Tout effacer"}
          </button>
        )}
      </div>

      <ul>
        {feed.length === 0 ? (
          <li className="text-sm text-gray-500">Aucune activité pour l'instant.</li>
        ) : (
          paginated.map((item) => (
            <li key={item.id} className="mb-2 text-sm">
              {item.message}
              <br />
              <span className="text-gray-500 text-xs">
                {new Date(item.created_at).toLocaleString()}
              </span>
            </li>
          ))
        )}
      </ul>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Précédent
          </button>
          <span className="text-xs text-gray-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
