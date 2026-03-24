import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const statusConfig = {
  open:       { bg: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-400',   label: 'Ouvert',              border: 'border-l-amber-400' },
  ready:      { bg: 'bg-blue-50 text-blue-700 border-blue-200',      dot: 'bg-blue-500',    label: 'Prêt pour montage',   border: 'border-l-blue-500' },
  processing: { bg: 'bg-purple-50 text-purple-700 border-purple-200',dot: 'bg-purple-500',  label: 'En traitement',       border: 'border-l-purple-500' },
  done:       { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Terminé',          border: 'border-l-emerald-500' },
  canceled:   { bg: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-400',     label: 'Annulé',              border: 'border-l-red-400' },
};

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
};

const isEventExpired = (event) => {
  if (!event?.deadline) return false;
  if (event.status === 'done' || event.status === 'canceled') return false;
  const deadline = new Date(event.deadline);
  deadline.setHours(23, 59, 59, 999);
  return deadline < new Date();
};

const EventThumbnail = ({ url, eventId }) => {
  const lower = (url || '').toLowerCase();
  let src = '/default-placeholder.webp';
  let srcFallback = '/default-placeholder.jpg';
  let alt = 'Aucun visuel';
  if (lower.match(/\.(jpg|jpeg|png|gif|webp)$/i)) { src = url; srcFallback = url; alt = 'Visuel événement'; }
  else if (lower.match(/\.(mp4|mov|avi|mkv|webm)$/i)) { src = '/default-video-thumbnail.jpg'; srcFallback = src; alt = 'Miniature vidéo'; }
  else if (lower.match(/\.(mp3|wav|ogg)$/i)) { src = '/default-audio-thumbnail.jpg'; srcFallback = src; alt = 'Miniature audio'; }
  const isWebp = src.endsWith('.webp') && srcFallback.endsWith('.jpg');
  return (
    <Link to={`/events/${eventId}`} className="flex-shrink-0">
      {isWebp ? (
        <picture>
          <source srcSet={src} type="image/webp" />
          <img src={srcFallback} alt={alt} width="88" height="66" loading="lazy" decoding="async"
            className="w-22 h-16 object-cover rounded-xl border border-gray-100 shadow-sm" />
        </picture>
      ) : (
        <img src={src} alt={alt} width="88" height="66" loading="lazy" decoding="async"
          className="w-22 h-16 object-cover rounded-xl border border-gray-100 shadow-sm" />
      )}
    </Link>
  );
};

const Badge = ({ className, children }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${className}`}>
    {children}
  </span>
);

const ActionBtn = ({ to, onClick, disabled, variant = 'outline', className = '', children }) => {
  const base = 'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors';
  const variants = {
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    green:   'border border-emerald-300 text-emerald-700 hover:bg-emerald-50',
    red:     'border border-red-200 text-red-600 hover:bg-red-50',
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
  };
  const cls = `${base} ${variants[variant]} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`;
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  return <button type="button" onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
};

const EventCard = ({
  event, user, isPremiumAccount, ownerNamesByUserId,
  eventStats, capsByEventId, capsLoadingByEventId,
  deletingEventId, onDelete,
}) => {
  const status = statusConfig[event.status] || { bg: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-400', label: 'Inconnu', border: 'border-l-gray-300' };
  const isOwner = event.user_id === user?.id;
  const isPublicEvent = event.is_public === true;
  const hasFinalVideo = !!event.final_video_url;
  const isEffectivePremiumEvent = event.is_premium_event === true || (isPremiumAccount && isOwner);
  const expired = isEventExpired(event);

  const publicUrl = event.public_code ? `${window.location.origin}/e/${event.public_code}` : '';
  const whatsappShareUrl = event.public_code && import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/share/e/${event.public_code}`
    : publicUrl;
  const creatorName = event.owner_name || ownerNamesByUserId[event.user_id] || 'Un organisateur';

  const stats = eventStats[event.id];
  const pendingCount = typeof stats?.totalPending === 'number' ? stats.totalPending : null;
  const totalWithVideo = typeof stats?.totalWithVideo === 'number' ? stats.totalWithVideo : 0;
  const totalInvitations = typeof stats?.totalInvitations === 'number' ? stats.totalInvitations : 0;

  const caps = capsByEventId[event.id] || null;
  const capsLoading = !!capsLoadingByEventId[event.id];
  const latestVideo = caps?.state?.latestVideo || null;
  const hasReachedUploadLimit = Boolean(caps?.state?.hasReachedUploadLimit);

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 border-l-4 ${status.border} shadow-sm hover:shadow-md transition-all`}>
      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          <EventThumbnail url={event.media_url} eventId={event.id} />

          <div className="flex-1 min-w-0">
            {/* Title + status */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link to={`/events/${event.id}`}>
                  <h3 className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors truncate">
                    {event.title}
                  </h3>
                </Link>
                <p className="text-xs text-gray-400 mt-0.5">
                  Par <span className="text-gray-600 font-medium">{creatorName}</span> · {formatDate(event.created_at)}
                </p>
              </div>
              <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${status.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dot}`} />
                {status.label}
              </span>
            </div>

            {/* Badges */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Badge className="bg-gray-50 text-gray-600 border-gray-200">
                {isPublicEvent ? '🌐 Public' : '🔒 Privé'}
              </Badge>
              {expired && <Badge className="bg-red-50 text-red-700 border-red-200">⏱ Expiré</Badge>}
              {hasFinalVideo && <Badge className="bg-purple-50 text-purple-700 border-purple-200">🎬 Vidéo finale prête</Badge>}
              {isEffectivePremiumEvent && <Badge className="bg-violet-50 text-violet-700 border-violet-200">✦ Premium</Badge>}
              {capsLoading && !isOwner && <Badge className="bg-gray-50 text-gray-400 border-gray-200">Vérification…</Badge>}
              {!isOwner && !!latestVideo && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">✓ Vidéo envoyée</Badge>}
              {!isOwner && hasReachedUploadLimit && <Badge className="bg-amber-50 text-amber-700 border-amber-200">Limite atteinte</Badge>}
              {isOwner && totalInvitations > 0 && (
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">
                  {totalWithVideo}/{totalInvitations} vidéos
                </Badge>
              )}
              {isOwner && pendingCount > 0 && (
                <Badge className="bg-orange-50 text-orange-700 border-orange-200">{pendingCount} en attente</Badge>
              )}
            </div>

            {/* Share section — owner only */}
            {isOwner && event.public_code && (
              <div className="mt-3 bg-gray-50 rounded-xl px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 015.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
                  </svg>
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="flex-1 min-w-0 bg-transparent text-[11px] text-gray-600 outline-none truncate"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(publicUrl)
                        .then(() => toast.success('Lien copié !'))
                        .catch(() => toast.error('Impossible de copier'))
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copier
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(`Participe à mon événement Grega Play : ${whatsappShareUrl}`)}`,
                        '_blank'
                      )
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-green-500 hover:bg-green-600 text-white"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M11.986 0C5.368 0 0 5.368 0 11.986c0 2.1.549 4.07 1.51 5.788L0 24l6.395-1.678A11.94 11.94 0 0011.986 24c6.618 0 11.986-5.368 11.986-11.986C23.972 5.368 18.604 0 11.986 0zm0 21.909a9.923 9.923 0 01-5.054-1.374l-.362-.215-3.795.995 1.012-3.695-.235-.379A9.921 9.921 0 012.077 11.986c0-5.47 4.44-9.909 9.909-9.909 5.47 0 9.909 4.44 9.909 9.909 0 5.47-4.44 9.909-9.909 9.909z"/>
                    </svg>
                    WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
          <ActionBtn to={`/events/${event.id}`} variant="outline">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Voir
          </ActionBtn>

          {isOwner && (
            <>
              <ActionBtn to={`/events/${event.id}/manage-participants`} variant="green">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Inviter
              </ActionBtn>
              <ActionBtn
                onClick={() => onDelete(event.id)}
                disabled={deletingEventId === event.id}
                variant="red"
                className="ml-auto"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {deletingEventId === event.id ? 'Suppression…' : 'Supprimer'}
              </ActionBtn>
            </>
          )}

          {!isOwner && caps?.actions?.canUploadVideo === true && !hasReachedUploadLimit && (
            <ActionBtn to={`/events/${event.id}/submit`} variant="primary">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Envoyer ma vidéo
            </ActionBtn>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;
