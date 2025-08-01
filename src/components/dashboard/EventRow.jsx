
import React from "react";
import { useNavigate } from "react-router-dom";

const EventRow = ({ event, formatDate, getStatusInfo, onDelete, deletingEventId }) => {
  const navigate = useNavigate();
  const statusInfo = getStatusInfo(event.status);

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-4 py-2 font-medium text-gray-900">{event.title}</td>
      <td className="px-4 py-2">{formatDate(event.deadline)}</td>
      <td className="px-4 py-2">{event.video_count || 0}</td>
      <td className={`px-4 py-2 ${statusInfo.color}`}>{statusInfo.label}</td>
      <td className="px-4 py-2 text-right space-x-2">
        <button
          onClick={() => navigate(`/events/${event.id}`)}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
        >
          Voir
        </button>
        <button
          onClick={() => onDelete(event.id)}
          disabled={deletingEventId === event.id}
          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
        >
          {deletingEventId === event.id ? "Suppression..." : "Supprimer"}
        </button>
      </td>
    </tr>
  );
};

export default EventRow;
