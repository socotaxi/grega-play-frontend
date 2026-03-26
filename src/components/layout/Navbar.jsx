import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabaseClient';
import { ADMIN_EMAIL } from '../../utils/adminUtils';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="bg-white shadow-md px-6 py-3 flex justify-between items-center relative">
      <Link to="/" className="text-xl font-bold text-indigo-600" onClick={closeMenu}>
        GregaPlay
      </Link>

      {/* Desktop */}
      <div className="hidden sm:flex items-center gap-4">
        {user && profile ? (
          <>
            {user.email === ADMIN_EMAIL && (
              <Link to="/admin/stats" className="text-sm text-indigo-600 font-semibold hover:underline">
                Admin
              </Link>
            )}
            <span className="text-sm text-gray-700">{profile.full_name}</span>
            <Link to="/profile">
              <img
                src={profile.avatar_url || '/default-avatar.png'}
                alt="avatar"
                className="w-9 h-9 rounded-full object-cover border"
              />
            </Link>
            <button onClick={logout} className="text-sm text-gray-600 hover:text-red-600 transition">
              Déconnexion
            </button>
          </>
        ) : (
          <Link to="/login" className="text-sm text-indigo-600 hover:underline">
            Connexion
          </Link>
        )}
      </div>

      {/* Mobile */}
      <div className="flex sm:hidden items-center gap-3">
        {user && profile && (
          <Link to="/profile" onClick={closeMenu}>
            <img
              src={profile.avatar_url || '/default-avatar.png'}
              alt="avatar"
              className="w-8 h-8 rounded-full object-cover border"
            />
          </Link>
        )}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="p-1 text-gray-600 hover:text-indigo-600 transition"
          aria-label="Menu"
        >
          {menuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t z-50 py-2">
          {user && profile ? (
            <>
              <div className="px-5 py-3 border-b">
                <p className="text-sm font-semibold text-gray-800">{profile.full_name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              {user.email === ADMIN_EMAIL && (
                <Link
                  to="/admin/stats"
                  onClick={closeMenu}
                  className="block px-5 py-3 text-sm text-indigo-600 font-semibold hover:bg-gray-50"
                >
                  Admin
                </Link>
              )}
              <Link
                to="/dashboard"
                onClick={closeMenu}
                className="block px-5 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                Tableau de bord
              </Link>
              <Link
                to="/profile"
                onClick={closeMenu}
                className="block px-5 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                Mon profil
              </Link>
              <button
                onClick={() => { logout(); closeMenu(); }}
                className="w-full text-left px-5 py-3 text-sm text-red-600 hover:bg-red-50"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={closeMenu}
              className="block px-5 py-3 text-sm text-indigo-600 hover:bg-gray-50"
            >
              Connexion
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
