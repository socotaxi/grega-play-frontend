
import React, { useEffect, useState } from 'react';
import activityService from '../../services/activityService';

const ActivityFeed = ({ eventId }) => {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
  console.log("🎯 ActivityFeed monté pour l’event :", eventId);
  const fetchActivities = async () => {
    const data = await activityService.getActivityByEvent(eventId);
    console.log("📄 Activités reçues :", data); // ← ici
    setActivities(data);
  };
  fetchActivities();
}, [eventId]);

  return (
    <div className="bg-white p-4 rounded shadow mt-6">
      <h3 className="text-lg font-semibold mb-3">📰 Fil d’actualités</h3>
      {activities.length === 0 ? (
        <p className="text-gray-500">Aucune actualité pour le moment.</p>
      ) : (
        <ul className="space-y-2">
          {activities.map((item) => (
            <li key={item.id} className="text-sm text-gray-800 border-b pb-1">
              <span className="block">{item.message}</span>
              <span className="text-xs text-gray-500">
                {new Date(item.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ActivityFeed;
