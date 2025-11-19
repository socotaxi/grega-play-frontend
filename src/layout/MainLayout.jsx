import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MainLayout = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

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
                Montage vidéo collaboratif
              </span>
            </div>
          </Link>

          {/* MENU DESKTOP */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            <Link
              to="/"
              className="text-gray-600 hover:text-emerald-600 transition"
            >
              Accueil
            </Link>

            <Link
              to="/contact"
              className="text-gray-600 hover:text-emerald-600 transition"
            >
              Contact
            </Link>

            {user ? (
              <>
                <Link
                  to="/profile"
                  className="text-gray-600 hover:text-emerald-600 transition"
                >
                  Profil
                </Link>
                <Link
                  to="/create-event"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                >
                  Créer un événement
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-emerald-600 transition"
                >
                  Se connecter
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                >
                  Créer un compte
                </Link>
              </>
            )}
          </nav>

          {/* BURGER MOBILE */}
          <div className="lg:hidden">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-gray-700 hover:text-emerald-600 text-xl"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {/* MENU MOBILE */}
      {menuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-1">
            <Link
              to="/"
              className="block py-2 text-sm text-gray-700 hover:text-emerald-600"
              onClick={() => setMenuOpen(false)}
            >
              Accueil
            </Link>

            <Link
              to="/contact"
              className="block py-2 text-sm text-gray-700 hover:text-emerald-600"
              onClick={() => setMenuOpen(false)}
            >
              Contact
            </Link>

            {user ? (
              <>
                <div className="py-2 text-sm text-gray-600">
                  👤 {user.user_metadata?.first_name || user.email}
                </div>
                <Link
                  to="/profile"
                  className="block py-2 text-sm text-gray-700 hover:text-emerald-600"
                  onClick={() => setMenuOpen(false)}
                >
                  Profil
                </Link>
                <Link
                  to="/create-event"
                  className="block mt-1 py-2 text-sm font-semibold text-white text-center rounded-lg bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setMenuOpen(false)}
                >
                  Créer un événement
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block py-2 text-sm text-gray-700 hover:text-emerald-600"
                  onClick={() => setMenuOpen(false)}
                >
                  Se connecter
                </Link>
                <Link
                  to="/register"
                  className="block mt-1 py-2 text-sm font-semibold text-white text-center rounded-lg bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setMenuOpen(false)}
                >
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
