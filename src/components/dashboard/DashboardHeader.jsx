import { Link } from 'react-router-dom';
import InstallAppButton from '../InstallAppButton';

const DashboardHeader = ({ user, profile, premiumAccountLabel }) => {
  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email || '';
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-2xl px-6 py-6 text-white shadow-lg">
      {/* Decoration circles */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        {/* Identity */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-white/30 shadow"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30 shadow">
                <span className="text-xl font-bold text-white">{initials}</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-white/60 text-sm">{greeting} 👋</p>
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{name}</h1>
            <p className="text-white/50 text-xs mt-0.5">Gère tes projets vidéo collaboratifs</p>
            {premiumAccountLabel && (
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-900/30 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                ✦ {premiumAccountLabel}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <InstallAppButton />
          <Link
            to="/create-event"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-indigo-700 font-semibold text-sm rounded-xl shadow hover:bg-indigo-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nouvel événement
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
