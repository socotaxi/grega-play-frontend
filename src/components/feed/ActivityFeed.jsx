import React, { useEffect, useState } from "react";
import activityService from "../../services/activityService";

const ActivityFeed = ({ eventId, userId }) => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <p>Chargement du fil d’activités…</p>;

  return (
    <div className="p-4 bg-white rounded shadow mt-6">
      <h2 className="text-lg font-bold mb-2">Fil d’activités</h2>
      <ul>
        {feed.length === 0 ? (
          <li>Aucune activité pour l’instant.</li>
        ) : (
          feed.map((item) => (
            <li key={item.id} className="mb-2 text-sm">
              <strong>{item.user_full_name || item.user_email || "Utilisateur"}</strong>{" "}
              : {item.message}
              <br />
              <span className="text-gray-500 text-xs">
                {new Date(item.created_at).toLocaleString()}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default ActivityFeed;
