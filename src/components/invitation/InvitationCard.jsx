import React from "react";
import Button from "../ui/Button";

const InvitationCard = ({ invitation, onAccept, onDecline, currentUser }) => {
  if (!invitation) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between border p-4 rounded-md shadow-sm bg-white mb-4">
      <div className="text-center sm:text-left">
        <p className="font-medium text-gray-800">{invitation.email}</p>
        <p className="text-sm text-gray-500">
          Statut : {invitation.status || "invité"}
        </p>
      </div>

      {/* ✅ Boutons d'action */}
      {invitation.status === "pending" && (
        <div className="mt-3 sm:mt-0 flex gap-2">
          <Button
            onClick={() => onAccept?.(invitation)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            ✅ Accepter
          </Button>
          <Button
            onClick={() => onDecline?.(invitation)}
            variant="secondary"
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            ❌ Refuser
          </Button>
        </div>
      )}

      {/* ✅ Cas où l’utilisateur a déjà répondu */}
      {invitation.status === "accepted" && (
        <p className="text-green-600 font-semibold mt-2 sm:mt-0">
          ✔️ Acceptée
        </p>
      )}
      {invitation.status === "declined" && (
        <p className="text-red-600 font-semibold mt-2 sm:mt-0">
          ❌ Déclinée
        </p>
      )}
    </div>
  );
};

export default InvitationCard;
