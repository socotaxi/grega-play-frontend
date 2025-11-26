import React, { createContext, useContext, useState, useEffect } from "react";
import supabase from "../lib/supabaseClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("Erreur récupération session", error);
      setSession(data?.session || null);
      setUser(data?.session?.user || null);
      setLoading(false);
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user || null);
      }
    );

    return () => listener?.subscription?.unsubscribe();
  }, []);

  // Connexion email / mot de passe
  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  // Inscription email / mot de passe
  const signup = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  // Connexion Google (OAuth)
  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) throw error;
  };

  // Déconnexion
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
    } catch (err) {
      console.error("Erreur logout:", err.message);
      throw err;
    }
  };

  const value = {
    user,
    session,
    loading,
    login,
    signup,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
