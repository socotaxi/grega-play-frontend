import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const MainLayout = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="flex items-center justify-between px-6 py-4 shadow bg-white">
        {/* LOGO + TITRE */}
        <Link to="/" className="flex items-center space-x-3">
          <img
            src="/logo.png"
            alt="Logo Grega Play"
            className="h-10 w-auto object-contain"
            style={{ maxHeight: "40px" }}
          />
          <span className="text-xl font-bold text-gray-800">Grega Play</span>
        </Link>

        {/* BURGER */}
        <div className="lg:hidden">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-gray-700 hover:text-indigo-600 focus:outline-none"
          >
            ☰
          </button>
        </div>

        {/* MENU */}
        <nav className="hidden lg:flex items-center space-x-6">
          <Link to="/" className="text-gray-700 hover:text-indigo-600 font-medium transition">
            Accueil
          </Link>
          {user ? (
            <>
              <span className="text-gray-600 font-semibold">👤 {user.user_metadata?.first_name || user.email}</span>
              <Link to="/profile" className="text-gray-700 hover:text-indigo-600 font-medium transition">
                Profil
              </Link>
            </>
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

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="lg:hidden px-6 pb-4 bg-white shadow">
          <Link to="/" className="block py-2 text-gray-700 hover:text-indigo-600" onClick={() => setMenuOpen(false)}>
            Accueil
          </Link>
          {user ? (
            <>
              <div className="py-2 text-gray-700 font-semibold">👤 {user.user_metadata?.first_name || user.email}</div>
              <Link to="/profile" className="block py-2 text-gray-700 hover:text-indigo-600" onClick={() => setMenuOpen(false)}>
                Profil
              </Link>
            </>
          ) : (
            <Link to="/login" className="block py-2 text-gray-700 hover:text-indigo-600" onClick={() => setMenuOpen(false)}>
              Login
            </Link>
          )}
          <Link to="/contact" className="block py-2 text-gray-700 hover:text-indigo-600" onClick={() => setMenuOpen(false)}>
            Contact
          </Link>
        </div>
      )}

      <main className="p-6">{children}</main>
    </div>
  );
};

export default MainLayout;
