import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const HomeIcon = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const DashboardIcon = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const ProfileIcon = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LoginIcon = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
  </svg>
);

const NavItem = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors ${
      active ? 'text-brand-600' : 'text-gray-400'
    }`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </Link>
);

const BottomNav = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const is = (path) => pathname === path;

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {user ? (
          <>
            <NavItem
              to="/dashboard"
              label="Dashboard"
              active={is('/dashboard')}
              icon={<DashboardIcon active={is('/dashboard')} />}
            />

            <Link
              to="/create-event"
              className="flex flex-col items-center justify-center flex-1 -mt-5"
            >
              <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center shadow-lg text-white">
                <PlusIcon />
              </div>
              <span className="text-[10px] font-medium text-gray-400 mt-1">Créer</span>
            </Link>

            <NavItem
              to="/profile"
              label="Profil"
              active={is('/profile')}
              icon={<ProfileIcon active={is('/profile')} />}
            />
          </>
        ) : (
          <>
            <NavItem
              to="/"
              label="Accueil"
              active={is('/')}
              icon={<HomeIcon active={is('/')} />}
            />
            <NavItem
              to="/login"
              label="Connexion"
              active={is('/login')}
              icon={<LoginIcon active={is('/login')} />}
            />
            <NavItem
              to="/register"
              label="S'inscrire"
              active={is('/register')}
              icon={<ProfileIcon active={is('/register')} />}
            />
          </>
        )}
      </div>
    </nav>
  );
};

export default BottomNav;
