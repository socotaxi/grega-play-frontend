import React from "react";

const InvitationCard = ({ email, status }) => {
  return (
    <div className="flex items-center justify-between border p-3 rounded-md shadow-sm bg-white mb-2">
      <div>
        <p className="font-medium text-gray-800">{email}</p>
        <p className="text-sm text-gray-500">Statut : {status || "invité"}</p>
      </div>
    </div>
  );
};

export default InvitationCard;
