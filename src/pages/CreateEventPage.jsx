// src/pages/CreateEventPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import eventService from "../services/eventService";
import invitationService from "../services/invitationService";
import activityService from "../services/activityService";
import Button from "../components/ui/Button";
import MainLayout from "../layout/MainLayout"; // ✅ ajout import

const initialFormData = {
  title: "",
  description: "",
  theme: "",
  videoDuration: 30,
  maxClipDuration: 30,
  endDate: "",
  participants: [],
};

const CreateEventPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [participantEmail, setParticipantEmail] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [createdEventId, setCreatedEventId] = useState(null);
  const [copyingLink, setCopyingLink] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddParticipant = () => {
    if (participantEmail && !formData.participants.includes(participantEmail)) {
      setFormData((prev) => ({
        ...prev,
        participants: [...prev.participants, participantEmail],
      }));
      setParticipantEmail("");
    }
  };

  const handleRemoveParticipant = (email) => {
    setFormData((prev) => ({
      ...prev,
      participants: prev.participants.filter((p) => p !== email),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.endDate) {
      toast.error("Veuillez remplir les champs requis");
      return;
    }

    setLoading(true);
    try {
      const event = await eventService.createEvent({
        ...formData,
        userId: user?.id, // ✅ toujours l’UUID, pas l’email
        videoDuration: parseInt(formData.videoDuration),
        maxClipDuration: parseInt(formData.maxClipDuration),
      });

      // Invitations
      await invitationService.addInvitations(
        event.id,
        formData.participants,
        "",
        event,
        user
      );

      toast.success("Événement créé avec succès");

      // ✅ Log d'activité
      await activityService.logActivity({
        event_id: event.id,
        user_id: user?.id,
        type: "created_event",
        message: `${user?.email} a créé l'événement "${event.title}"`
      });

      const newShareLink = `${window.location.origin}/events/${event.id}`;
      setShareLink(newShareLink);
      setCreatedEventId(event.id);
      setFormData(initialFormData);
      setParticipantEmail("");
    } catch (err) {
      console.error("Erreur création événement:", err);
      toast.error("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareLink) return;
    try {
      setCopyingLink(true);
      await navigator.clipboard.writeText(shareLink);
      toast.success("Lien de partage copié");
    } catch (error) {
      console.error("Impossible de copier le lien", error);
      toast.error("Impossible de copier le lien");
    } finally {
      setCopyingLink(false);
    }
  };

  return (
    <MainLayout> {/* ✅ enveloppe ajoutée */}
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow">
        {shareLink && (
          <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-indigo-900">Lien de partage créé 🎉</h2>
              <p className="text-sm text-indigo-800">
                Partagez ce lien pour permettre à vos invités de consulter la page de l’événement.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 border border-indigo-300 rounded-md px-3 py-2 text-sm bg-white"
              />
              <Button
                type="button"
                onClick={handleCopyShareLink}
                loading={copyingLink}
                className="w-full sm:w-auto justify-center"
              >
                Copier le lien
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {createdEventId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(`/events/${createdEventId}`)}
                  className="w-full sm:w-auto justify-center"
                >
                  Voir l’événement
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/dashboard")}
                className="w-full sm:w-auto justify-center"
              >
                Aller au tableau de bord
              </Button>
            </div>
            <p className="text-xs text-indigo-700">
              Toute personne disposant de ce lien peut consulter la page, mais seule une personne connectée peut y participer.
            </p>
          </div>
        )}
        <h1 className="text-2xl font-bold mb-6">Créer un événement</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Titre</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Thème</label>
            <input
              type="text"
              name="theme"
              value={formData.theme}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Durée vidéo finale (sec)
              </label>
              <input
                type="number"
                name="videoDuration"
                value={formData.videoDuration}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Durée max d’un clip (sec)
              </label>
              <input
                type="number"
                name="maxClipDuration"
                value={formData.maxClipDuration}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date limite</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Participants</label>
            <div className="flex space-x-2">
              <input
                type="email"
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
                placeholder="Email participant"
                className="mt-1 flex-1 border-gray-300 rounded-md shadow-sm"
              />
              <Button type="button" onClick={handleAddParticipant}>
                Ajouter
              </Button>
            </div>
            <ul className="mt-2">
              {formData.participants.map((p, idx) => (
                <li key={idx} className="flex justify-between items-center">
                  {p}
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(p)}
                    className="text-red-500 text-sm"
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <Button type="submit" loading={loading} className="w-full">
              Créer l'événement
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default CreateEventPage;
