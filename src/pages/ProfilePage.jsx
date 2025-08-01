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
    if (name === 'avatar' && files.length > 0) {
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
        <div className="text-center py-20 text-gray-500">Chargement du profil...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Mon Profil</h1>

        {!editMode ? (
          <div className="bg-white shadow-lg rounded-xl p-8">
            <div className="flex flex-col items-center">
              {profile.avatar_url && (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-32 h-32 rounded-full object-cover border-4 border-indigo-500 shadow-md"
                />
              )}
              <h2 className="mt-4 text-2xl font-semibold text-gray-800">{profile.full_name}</h2>
              <p className="text-sm text-gray-500">{profile.email}</p>
              <div className="flex gap-4 mt-4">
                <Button onClick={() => setEditMode(true)}>Modifier le profil</Button>
                <Button   variant="secondary"   onClick={async () => {await logout();
                  navigate('/login'); // ou '/' si tu préfères aller sur la Home
               }}
>
  Se déconnecter
</Button>

              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500">Téléphone</label>
                <p className="mt-1 text-base text-gray-800">{profile.phone || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Pays</label>
                <p className="mt-1 text-base text-gray-800">{profile.country || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Date de naissance</label>
                <p className="mt-1 text-base text-gray-800">{profile.birth_date || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Newsletter</label>
                <p className="mt-1 text-base text-gray-800">{profile.accept_news ? 'Oui' : 'Non'}</p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-6 bg-white shadow-md rounded-xl p-6">
            <div>
              <label className="block text-sm font-medium text-gray-500">Nom complet</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name || ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Téléphone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Pays</label>
              <input
                type="text"
                name="country"
                value={formData.country || ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Date de naissance</label>
              <input
                type="date"
                name="birth_date"
                value={formData.birth_date || ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Photo de profil</label>
              <input
                type="file"
                name="avatar"
                accept="image/*"
                onChange={handleChange}
                className="mt-1 block w-full text-sm"
              />
            </div>
            <div className="flex items-start">
              <input
                type="checkbox"
                name="accept_news"
                checked={formData.accept_news || false}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">Recevoir des actualités</label>
            </div>
            <div className="flex justify-between gap-4">
              <Button type="submit" loading={loading} className="w-full">Enregistrer</Button>
              <Button type="button" variant="secondary" onClick={() => setEditMode(false)} className="w-full">
                Annuler
              </Button>
            </div>
          </form>
        )}
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
