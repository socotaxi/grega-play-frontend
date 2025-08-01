import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabaseClient';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();
        if (!error) setProfile(data);
      }
    };
    fetchProfile();
  }, [user]);

  return (
    <nav className="bg-white shadow-md px-6 py-3 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold text-indigo-600">GregaPlay</Link>

      <div className="flex items-center gap-4">
        {user && profile ? (
          <>
            <span className="hidden sm:block text-sm text-gray-700">{profile.full_name}</span>
            <Link to="/profile">
              <img
                src={profile.avatar_url || '/default-avatar.png'}
                alt="avatar"
                className="w-9 h-9 rounded-full object-cover border"
              />
            </Link>
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-red-600 transition"
            >
              Déconnexion
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="text-sm text-indigo-600 hover:underline"
          >
            Connexion
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;