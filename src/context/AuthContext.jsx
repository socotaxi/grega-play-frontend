import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from "react";
import supabase from "../lib/supabaseClient";
import { getReturnTo, clearReturnTo } from "../utils/returnTo";
import { subscribeToPush } from "../services/notificationService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  // ✅ empêche double redirection (init + onAuthStateChange)
  const didRedirectRef = useRef(false);
  // ✅ empêche double loadProfile pour le même userId
  const profileForUserRef = useRef(undefined);

  const loadProfile = async (userId) => {
    const resolvedId = userId || null;

    // Évite de re-fetcher si on charge déjà (ou vient de charger) pour ce même userId
    if (resolvedId === profileForUserRef.current) return;
    profileForUserRef.current = resolvedId;

    if (!resolvedId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const doQuery = () =>
        supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, is_premium_account, is_premium, premium_account_expires_at"
          )
          .eq("id", userId)
          .single();

      let { data, error } = await doQuery();

      // JWT expiré → on tente un refresh puis on relance la requête une fois
      if (error?.message === "JWT expired" || error?.code === "PGRST303") {
        const { error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr) {
          ({ data, error } = await doQuery());
        }
      }

      if (error) {
        console.error("Erreur chargement profil:", error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (e) {
      console.error("Erreur chargement profil (exception):", e);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  // ✅ returnTo doit être consommé UNE seule fois
  const redirectIfReturnTo = () => {
    try {
      if (didRedirectRef.current) return;

      const target = getReturnTo();
      if (!target) return;

      const current =
        window.location.pathname + window.location.search + window.location.hash;

      // Si on est déjà sur la bonne page, on nettoie quand même pour éviter
      // de rester bloqué à revenir dessus à chaque login.
      if (current === target) {
        clearReturnTo();
        didRedirectRef.current = true;
        return;
      }

      // 🔥 IMPORTANT : consommer (effacer) AVANT de rediriger
      clearReturnTo();
      didRedirectRef.current = true;

      // replace pour ne pas polluer l'historique
      window.location.replace(target);
    } catch (e) {
      console.error("returnTo redirect error:", e);
      // en cas d'erreur on évite un loop
      try {
        clearReturnTo();
      } catch {}
      didRedirectRef.current = true;
    }
  };

  useEffect(() => {
    const init = async () => {
      let currentUser = null;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error("Erreur récupération session:", error);

        let currentSession = data?.session ?? null;

        // Si le token est expiré (ou expire dans moins de 30 s), on rafraîchit
        // avant de faire quoi que ce soit pour éviter les erreurs "JWT expired".
        if (currentSession) {
          const now = Math.floor(Date.now() / 1000);
          const expiresAt = currentSession.expires_at ?? 0;
          if (expiresAt < now + 30) {
            const { data: refreshed, error: refreshErr } =
              await supabase.auth.refreshSession();
            if (!refreshErr && refreshed?.session) {
              currentSession = refreshed.session;
            } else {
              // Refresh token lui-même expiré → déconnexion propre
              await supabase.auth.signOut({ scope: "local" });
              currentSession = null;
            }
          }
        }

        currentUser = currentSession?.user ?? null;
        setSession(currentSession);
        setUser(currentUser);
      } finally {
        // ✅ Déverrouille l'UI dès que la session est connue,
        // sans attendre le chargement du profil (profileLoading gère ça)
        setLoading(false);
      }

      // Profile se charge après le déverrouillage (non-bloquant pour l'UI)
      await loadProfile(currentUser?.id ?? null);

      // ✅ si déjà connecté et returnTo existe
      if (currentUser) {
        redirectIfReturnTo();
      } else {
        // si pas connecté, on autorise une future redirection après login
        didRedirectRef.current = false;
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        const newUser = newSession?.user || null;

        setSession(newSession);
        setUser(newUser);

        loadProfile(newUser?.id || null);

        // ✅ reset du "guard" lorsqu'on se déconnecte
        if (!newUser) {
          didRedirectRef.current = false;
          return;
        }

        // ✅ dès que la session est active (connexion), on applique returnTo
        redirectIfReturnTo();
      }
    );

    return () => listener?.subscription?.unsubscribe();
  }, []);

  // Abonnement aux push notifications dès que l'utilisateur est connecté
  useEffect(() => {
    if (!user?.id) return;
    subscribeToPush(user.id).catch(() => {});
  }, [user?.id]);

  const safeProfile = profile ?? {};

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;

    setUser(null);
    setSession(null);
    setProfile(null);
    setProfileLoading(false);

    // ✅ autoriser une future redirection après prochaine connexion
    didRedirectRef.current = false;
  };

  const value = useMemo(
    () => ({
      user,
      session,
      profile: safeProfile,
      loading,
      profileLoading,
      loginWithGoogle,
      logout,
    }),
    [user, session, safeProfile, loading, profileLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
