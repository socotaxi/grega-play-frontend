
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import eventService from '../services/eventService';
import invitationService from '../services/invitationService';

const CreateEventPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    theme: '',
    endDate: '',
    videoDuration: 60,
    maxClipDuration: 30,
    participants: []
  });
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || formData.participants.includes(email)) return;
    setFormData((prev) => ({
      ...prev,
      participants: [...prev.participants, email]
    }));
    setEmailInput('');
    toast.success('Participant ajouté');
  };

  const handleRemoveEmail = (email) => {
    setFormData((prev) => ({
      ...prev,
      participants: prev.participants.filter((e) => e !== email)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.endDate || formData.participants.length === 0) {
      toast.error("Veuillez remplir les champs requis");
      return;
    }

    setLoading(true);
    try {
      const event = await eventService.createEvent({
        ...formData,
        userId: user?.id,
        videoDuration: parseInt(formData.videoDuration),
        maxClipDuration: parseInt(formData.maxClipDuration)
      });
      await invitationService.addInvitations(event.id, formData.participants, '', event, user);
      toast.success('Événement créé avec succès');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-md mx-auto p-4 bg-white shadow-lg rounded-lg mt-6 mb-10">
        <h2 className="text-xl sm:text-2xl font-semibold text-center text-gray-800 mb-4">
          🎉 Créer un événement
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="title"
            placeholder="Titre de l'événement *"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md text-sm focus:ring"
            required
          />

          <textarea
            name="description"
            rows="2"
            placeholder="Description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md text-sm focus:ring"
          />

          <input
            type="text"
            name="theme"
            placeholder="Thème (optionnel)"
            value={formData.theme}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md text-sm focus:ring"
          />

          <input
            type="date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md text-sm focus:ring"
            required
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="videoDuration"
              min="30"
              max="300"
              value={formData.videoDuration}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="Durée finale"
            />
            <input
              type="number"
              name="maxClipDuration"
              min="5"
              max="30"
              value={formData.maxClipDuration}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="Clip max"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Participants *</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="email@exemple.com"
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
              <button
                type="button"
                onClick={handleAddEmail}
                className="px-3 py-2 text-white bg-indigo-600 rounded-md text-sm hover:bg-indigo-700"
              >
                Ajouter
              </button>
            </div>
            <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {formData.participants.map((email) => (
                <li
                  key={email}
                  className="flex justify-between items-center bg-gray-100 px-3 py-1 rounded text-sm"
                >
                  <span>{email}</span>
                  <button onClick={() => handleRemoveEmail(email)} className="text-red-600">
                    ✖
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <Button type="submit" disabled={loading} loading={loading}>
              {loading ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default CreateEventPage;
