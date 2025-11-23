// src/components/layout/AdminMenuLink.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useIsAdmin } from '../../hooks/useIsAdmin';

export default function AdminMenuLink() {
  const isAdmin = useIsAdmin();

  // Pendant le check, on ne montre rien (évite un "flash")
  if (isAdmin === null) return null;

  if (!isAdmin) return null;

  return (
    <NavLink
      to="/admin/stats"
      className={({ isActive }) =>
        [
          "inline-flex items-center px-3 py-2 rounded-xl text-sm font-medium transition",
          isActive
            ? "bg-emerald-600 text-white shadow-sm"
            : "text-gray-600 hover:text-gray-900 hover:bg-emerald-50"
        ].join(' ')
      }
    >
      <span className="mr-1.5 text-xs">📊</span>
      <span>Analytics</span>
    </NavLink>
  );
}
