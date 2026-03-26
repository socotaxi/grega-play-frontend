// src/hooks/useIsAdmin.js
import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    async function checkAdmin() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        setIsAdmin(false);
        return;
      }

      const userEmail = data.user.email?.toLowerCase();
      setIsAdmin(userEmail === ADMIN_EMAIL.toLowerCase());
    }

    checkAdmin();
  }, []);

  return isAdmin; // null = en cours, true/false ensuite
}
