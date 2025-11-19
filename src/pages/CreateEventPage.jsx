// src/pages/CreateEventPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import eventService from "../services/eventService";
import invitationService from "../services/invitationService";
import activityService from "../services/activityService";
import Button from "../components/ui/Button";
import MainLayout from "../layout/MainLayout"; // garde ton import actuel
import supabase from "../lib/supabaseClient";

// Génère un code public unique pour le lien partageable
const generatePublicCode = (length = 12) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const CreateEventPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    theme: "",
    videoDuration: 30,
    maxClipDuration: 30,
    endDate: "",
    participants: [],
  });

  const [loading, setLoading] = useState(false);
  const [participantEmail, setParticipantEmail] = useState("");

  // fichier média optionnel
  const [mediaFile, setMediaFile] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddParticipant = () => {
    if (
      participantEmail &&
      !formData.participants.includes(participantEmail.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        participants: [...prev.participants, participantEmail.trim()],
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

    const publicCode = generatePublicCode();

    setLoading(true);
    try {
      // upload du média si présent
      let mediaUrl = null;

      if (mediaFile) {
        const fileExt = mediaFile.name.split(".").pop();
        const fileName = `${user?.id || "anonymous"}_${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("event-media")
          .upload(`events/${fileName}`, mediaFile);

        if (uploadError) {
          console.error("Erreur upload média:", uploadError);
          toast.error("Erreur lors de l'upload du média");
          setLoading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("event-media")
          .getPublicUrl(uploadData.path);

        mediaUrl = publicUrlData?.publicUrl || null;
      }

      const event = await eventService.createEvent({
        ...formData,
        userId: user?.id,
        videoDuration: parseInt(formData.videoDuration),
        maxClipDuration: parseInt(formData.maxClipDuration),
        public_code: publicCode,
        media_url: mediaUrl,
      });

      await invitationService.addInvitations(
        event.id,
        formData.participants,
        "",
        event,
        user
      );

      toast.success("Événement créé avec succès");

      await activityService.logActivity({
        event_id: event.id,
        user_id: user?.id,
        type: "created_event",
        message: `${user?.email} a créé l'événement "${event.title}"`,
      });

      navigate("/dashboard");
    } catch (err) {
      console.error("Erreur création événement:", err);
      toast.error("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col md:flex-row md:items-start md:justify-between gap-10">
          {/* Bloc texte à gauche (inspiration Facebook) */}
          <div className="md:w-1/2">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Crée ton événement en quelques clics
            </h1>
            <p className="text-base text-gray-600 mb-4">
              Récupère facilement des vidéos de tes proches pour un anniversaire,
              un mariage ou un moment important. Grega Play se charge du montage
              final pour toi.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                <span>Invite tes amis par email en un seul endroit.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                <span>Fixe une date limite pour recevoir les vidéos.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                <span>Génère automatiquement une vidéo souvenir verticale.</span>
              </li>
            </ul>
          </div>

          {/* Formulaire dans une carte à droite */}
          <div className="md:w-1/2">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200">
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Nouveau projet vidéo
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  C&apos;est rapide et gratuit. Tu pourras inviter tes amis juste après.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="px-6 pt-4 pb-6 space-y-4"
              >
                {/* Titre + Thème */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Titre de l&apos;événement *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Anniversaire de Lyne, Mariage d’Isaac..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Thème (optionnel)
                    </label>
                    <input
                      type="text"
                      name="theme"
                      value={formData.theme}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Anniversaire, Mariage, Départ, Baby-shower..."
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Message pour tes invités (optionnel)
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    placeholder="Explique en quelques mots le but de la vidéo (ex : 'Envoyez une courte vidéo pour souhaiter un joyeux anniversaire à...')"
                  />
                </div>

                {/* Média */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Visuel de l&apos;événement (optionnel)
                  </label>
                  <input
                    type="file"
                    accept="image/*,video/*,audio/*"
                    onChange={(e) =>
                      setMediaFile(
                        e.target.files && e.target.files[0]
                          ? e.target.files[0]
                          : null
                      )
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Ce média s&apos;affichera sur la page publique de l&apos;événement
                    (photo, visuel, musique d&apos;ambiance...).
                  </p>
                </div>

                {/* Durées & Date limite */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 px-3 py-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Paramètres de la vidéo
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600">
                        Durée finale max (secondes)
                      </label>
                      <input
                        type="number"
                        name="videoDuration"
                        value={formData.videoDuration}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600">
                        Durée max d&apos;un clip (secondes)
                      </label>
                      <input
                        type="number"
                        name="maxClipDuration"
                        value={formData.maxClipDuration}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-600">
                      Date limite pour envoyer les vidéos *
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Inviter des participants (emails)
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="email"
                      value={participantEmail}
                      onChange={(e) => setParticipantEmail(e.target.value)}
                      placeholder="Ex : ami1@gmail.com"
                      className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <Button type="button" onClick={handleAddParticipant}>
                      Ajouter
                    </Button>
                  </div>

                  {formData.participants.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.participants.map((p, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs text-indigo-700"
                        >
                          {p}
                          <button
                            type="button"
                            onClick={() => handleRemoveParticipant(p)}
                            className="text-[11px] text-indigo-500 hover:text-red-500"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-[11px] text-gray-500">
                    Tu pourras aussi partager un lien public d&apos;accès à l&apos;événement.
                  </p>
                </div>

                {/* CTA */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    loading={loading}
                    className="w-full py-2.5 text-base font-semibold"
                  >
                    Créer l&apos;événement
                  </Button>
                  <p className="mt-2 text-[11px] text-gray-500 text-center">
                    En créant cet événement, tu confirmes que les vidéos envoyées
                    respectent les personnes filmées.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CreateEventPage;
