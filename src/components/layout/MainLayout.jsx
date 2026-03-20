import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import supabase from "../../lib/supabaseClient";
import AdminMenuLink from "./AdminMenuLink";
import BottomNav from "./BottomNav";
import NotificationBell from "./NotificationBell";

const MainLayout = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) { setProfile(null); return; }

      const doQuery = () =>
        supabase
          .from("profiles")
          .select("full_name, avatar_url, is_premium_account, premium_account_expires_at, is_premium")
          .eq("id", user.id)
          .maybeSingle();

      let { data, error } = await doQuery();

      // JWT expiré → refresh puis retry
      if (error?.message === "JWT expired" || error?.code === "PGRST303") {
        const { error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr) {
          ({ data, error } = await doQuery());
        }
      }

      if (error) { console.error("Erreur chargement profil :", error.message); return; }
      if (!data) { console.warn("Aucun profil trouvé, redirection…"); navigate("/"); return; }
      setProfile(data);
    };
    fetchProfile();
  }, [user, navigate]);

  const isPremiumAccount = useMemo(() => {
    if (!profile) return false;
    return Boolean(profile.is_premium_account || profile.is_premium);
  }, [profile]);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || "";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* LOGO */}
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo Grega Play" className="h-8 w-auto object-contain" />
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold tracking-tight text-gray-900">Grega Play</span>
              <span className="text-[11px] text-gray-500 -mt-1 hidden sm:block">Together, we create the moment</span>
            </div>
          </Link>

          {/* NAV DESKTOP uniquement */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {!user && (
              <Link to="/" className="text-gray-600 hover:text-emerald-600 transition">Accueil</Link>
            )}
            {user && (
              <Link to="/dashboard" className="text-gray-600 hover:text-emerald-600 transition">Dashboard</Link>
            )}
            <AdminMenuLink />
            {user ? (
              <div className="flex items-center gap-2">
                <NotificationBell />
                <Link to="/profile" className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="avatar" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                      {(displayName || "G").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[140px] truncate">{displayName}</span>
                </Link>
                {isPremiumAccount && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                    Premium
                  </span>
                )}
              </div>
            ) : (
              <Link to="/login" className="text-gray-600 hover:text-emerald-600 transition">Se connecter</Link>
            )}
            {!user && (
              <Link to="/register" className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition">
                Créer un compte
              </Link>
            )}
            <Link to="/contact" className="text-gray-600 hover:text-emerald-600 transition">Contact</Link>
          </nav>

          {/* AVATAR mobile (header) */}
          {user && (
            <div className="lg:hidden flex items-center gap-1">
              <NotificationBell />
              <Link to="/profile" className="flex items-center gap-2">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="avatar" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-semibold text-brand-600">
                    {(displayName || "G").charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
            </div>
          )}

          {/* CTA mobile non connecté */}
          {!user && (
            <Link
              to="/login"
              className="lg:hidden px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-semibold"
            >
              Connexion
            </Link>
          )}
        </div>
      </header>

      {/* CONTENU — padding bas pour ne pas être masqué par la bottom nav */}
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>

      {/* BOTTOM NAV mobile */}
      <BottomNav />

    </div>
  );
};

export default MainLayout;
