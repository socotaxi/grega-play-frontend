import React, { useEffect, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabaseClient';
import Button from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error(error);
    } else {
      setProfile(data);
      setFormData(data);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (name === 'avatar' && files && files.length > 0) {
      setAvatarFile(files[0]);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let avatar_url = formData.avatar_url;

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) {
        alert('Erreur lors de l’upload de la photo');
        setLoading(false);
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      avatar_url = data.publicUrl.replace('/object/avatars/', '/object/public/avatars/');
    }

    const updates = {
      full_name: formData.full_name,
      birth_date: formData.birth_date,
      country: formData.country,
      phone: formData.phone,
      accept_news: formData.accept_news,
      avatar_url,
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    setLoading(false);
    if (error) {
      alert('Erreur lors de la mise à jour');
    } else {
      alert('Profil mis à jour');
      setEditMode(false);
      fetchProfile();
      setAvatarFile(null);
    }
  };

  if (!profile) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-80px)] bg-gray-50">
          <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
            Chargement du profil...
          </div>
        </div>
      </MainLayout>
    );
  }

  const displayEmail = profile.email || user?.email || '';

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50">
        <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
          {/* En-tête */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mon profil</h1>
              <p className="mt-1 text-sm text-gray-600">
                Gère les informations de ton compte Grega Play.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
              {!editMode && (
                <Button onClick={() => setEditMode(true)} className="text-sm py-2.5">
                  Modifier le profil
                </Button>
              )}
              <Button
                variant="secondary"
                className="text-sm py-2.5"
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
              >
                Se déconnecter
              </Button>
            </div>
          </div>

          {/* Carte profil / formulaire */}
          {!editMode ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
              {/* Bloc identité */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-shrink-0 flex items-center justify-center">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-indigo-500 shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-2xl border-4 border-indigo-200">
                      {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'G'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {profile.full_name || 'Utilisateur Grega Play'}
                  </h2>
                  <p className="text-sm text-gray-500">{displayEmail}</p>
                  <div className="mt-3 inline-flex px-3 py-1 rounded-full bg-gray-100 text-[11px] text-gray-600 font-medium">
                    Compte Grega Play
                  </div>
                </div>
              </div>

              {/* Infos détaillées */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Téléphone
                  </p>
                  <p className="mt-1 text-sm text-gray-800">
                    {profile.phone || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Pays
                  </p>
                  <p className="mt-1 text-sm text-gray-800">
                    {profile.country || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Date de naissance
                  </p>
                  <p className="mt-1 text-sm text-gray-800">
                    {profile.birth_date || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Newsletter
                  </p>
                  <p className="mt-1 text-sm text-gray-800">
                    {profile.accept_news ? 'Oui, je souhaite recevoir les nouveautés' : 'Non'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Modifier les informations
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Mets à jour ton nom, tes coordonnées et ta photo de profil.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ton nom complet"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="+242..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Pays
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Congo, France..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    name="birth_date"
                    value={formData.birth_date || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Photo de profil
                </label>
                <input
                  type="file"
                  name="avatar"
                  accept="image/*"
                  onChange={handleChange}
                  className="mt-1 block w-full text-xs text-gray-600"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Utilise une image carrée pour un meilleur rendu (ex : 512×512).
                </p>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="accept_news"
                  checked={formData.accept_news || false}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded mt-0.5"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Recevoir des actualités sur Grega Play (nouveaux formats, idées de vidéos,
                  etc.).
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full sm:w-auto text-sm font-semibold py-2.5"
                >
                  Enregistrer
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditMode(false)}
                  className="w-full sm:w-auto text-sm font-semibold py-2.5"
                >
                  Annuler
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
