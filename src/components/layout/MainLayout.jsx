import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabaseClient';
import { AnimatePresence, motion } from 'framer-motion';

const MainLayout = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Erreur chargement profil :', error.message);
        } else if (!data) {
          console.warn('Aucun profil trouvé pour cet utilisateur.');
          navigate('/'); // 🔁 Redirection vers la homepage si le profil est manquant
        } else {
          setProfile(data);
        }
      }
    };
    fetchProfile();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="flex items-center justify-between px-6 py-4 shadow bg-white">
        <Link to="/">
          <img
            src="/logo.png"
            alt="Logo Grega Play"
            className="h-10 w-auto object-contain"
            style={{ maxHeight: '40px' }}
          />
        </Link>

        <div className="lg:hidden">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-gray-700 hover:text-indigo-600 focus:outline-none text-2xl"
          >
            ☰
          </button>
        </div>

        <nav className="hidden lg:flex items-center space-x-6">
          {!user && (
            <Link to="/" className="text-gray-700 hover:text-indigo-600 font-medium transition">
              Accueil
            </Link>
          )}
          {user && (
            <Link to="/dashboard" className="text-gray-700 hover:text-indigo-600 font-medium transition">
              Dashboard
            </Link>
          )}
          {user ? (
            <Link
              to="/profile"
              className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 font-medium transition"
            >
              {profile?.avatar_url && (
                <img src={profile.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="avatar" />
              )}
              <span>{profile?.full_name || user.email}</span>
            </Link>
          ) : (
            <Link to="/login" className="text-gray-700 hover:text-indigo-600 font-medium transition">
              Login
            </Link>
          )}
          <Link to="/contact" className="text-gray-700 hover:text-indigo-600 font-medium transition">
            Contact
          </Link>
        </nav>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden px-6 pb-4 bg-white shadow overflow-hidden"
          >
            {!user && (
              <Link
                to="/"
                className="block py-2 text-gray-700 hover:text-indigo-600"
                onClick={() => setMenuOpen(false)}
              >
                Accueil
              </Link>
            )}
            {user && (
              <Link
                to="/dashboard"
                className="block py-2 text-gray-700 hover:text-indigo-600"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
            )}
            {user ? (
              <Link
                to="/profile"
                className="block py-2 text-gray-700 hover:text-indigo-600"
                onClick={() => setMenuOpen(false)}
              >
                👤 {profile?.full_name || user.email}
              </Link>
            ) : (
              <Link
                to="/login"
                className="block py-2 text-gray-700 hover:text-indigo-600"
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
            )}
            <Link
              to="/contact"
              className="block py-2 text-gray-700 hover:text-indigo-600"
              onClick={() => setMenuOpen(false)}
            >
              Contact
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="p-6">{children}</main>
    </div>
  );
};

export default MainLayout;
