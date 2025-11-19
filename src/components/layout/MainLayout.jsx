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

  // Chargement profil utilisateur
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
          console.warn('Aucun profil trouvé, redirection…');
          navigate('/');
        } else {
          setProfile(data);
        }
      }
    };

    fetchProfile();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      
      {/* HEADER PREMIUM */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* LOGO + BASELINE */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo Grega Play"
              className="h-8 w-auto object-contain"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold tracking-tight text-gray-900">
                Grega Play
              </span>
              <span className="text-[11px] text-gray-500 -mt-1">
                Together, we create the moment
              </span>
            </div>
          </Link>

          {/* MENU DESKTOP */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {!user && (
              <Link to="/" className="text-gray-600 hover:text-emerald-600 transition">
                Accueil
              </Link>
            )}

            {user && (
              <Link to="/dashboard" className="text-gray-600 hover:text-emerald-600 transition">
                Dashboard
              </Link>
            )}

            <Link to="/contact" className="text-gray-600 hover:text-emerald-600 transition">
              Contact
            </Link>

            {/* Profil avec avatar */}
            {user ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    className="w-8 h-8 rounded-full object-cover"
                    alt="avatar"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                    {profile?.full_name?.charAt(0) || user.email.charAt(0)}
                  </div>
                )}
                <span>{profile?.full_name || user.email}</span>
              </Link>
            ) : (
              <Link to="/login" className="text-gray-600 hover:text-emerald-600 transition">
                Se connecter
              </Link>
            )}

            {/* CTA */}
            {user ? (
              <Link
                to="/create-event"
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
              >
                Créer un événement
              </Link>
            ) : (
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
              >
                Créer un compte
              </Link>
            )}
          </nav>

          {/* BURGER MOBILE */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden text-gray-700 hover:text-emerald-600 text-2xl"
          >
            ☰
          </button>
        </div>
      </header>

      {/* MENU MOBILE */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-white/95 backdrop-blur border-b border-gray-200 overflow-hidden"
          >
            <div className="px-6 py-3 space-y-1 text-sm">

              {!user && (
                <Link
                  to="/"
                  className="block py-2 text-gray-700 hover:text-emerald-600"
                  onClick={() => setMenuOpen(false)}
                >
                  Accueil
                </Link>
              )}

              {user && (
                <Link
                  to="/dashboard"
                  className="block py-2 text-gray-700 hover:text-emerald-600"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}

              {user ? (
                <Link
                  to="/profile"
                  className="block py-2 text-gray-700 hover:text-emerald-600"
                  onClick={() => setMenuOpen(false)}
                >
                  👤 {profile?.full_name || user.email}
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="block py-2 text-gray-700 hover:text-emerald-600"
                  onClick={() => setMenuOpen(false)}
                >
                  Se connecter
                </Link>
              )}

              <Link
                to="/contact"
                className="block py-2 text-gray-700 hover:text-emerald-600"
                onClick={() => setMenuOpen(false)}
              >
                Contact
              </Link>

              {/* CTA mobile */}
              {user ? (
                <Link
                  to="/create-event"
                  className="block mt-2 text-center py-2 rounded-lg font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setMenuOpen(false)}
                >
                  Créer un événement
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="block mt-2 text-center py-2 rounded-lg font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setMenuOpen(false)}
                >
                  Créer un compte
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTENU */}
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default MainLayout;
