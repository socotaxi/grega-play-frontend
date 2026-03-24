import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const statusConfig = {
  open:       { pill: 'bg-amber-50 text-amber-700 ring-amber-200',    dot: 'bg-amber-400',   label: 'Ouvert' },
  ready:      { pill: 'bg-blue-50 text-blue-700 ring-blue-200',       dot: 'bg-blue-500',    label: 'Prêt pour montage' },
  processing: { pill: 'bg-purple-50 text-purple-700 ring-purple-200', dot: 'bg-purple-500',  label: 'En traitement' },
  done:       { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', label: 'Terminé' },
  canceled:   { pill: 'bg-red-50 text-red-700 ring-red-200',          dot: 'bg-red-400',     label: 'Annulé' },
};

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isEventExpired = (event) => {
  if (!event?.deadline) return false;
  if (event.status === 'done' || event.status === 'canceled') return false;
  const dl = new Date(event.deadline);
  dl.setHours(23, 59, 59, 999);
  return dl < new Date();
};

const EventThumbnail = ({ url, eventId }) => {
  const lower = (url || '').toLowerCase();
  let src = '/default-placeholder.webp';
  let srcFallback = '/default-placeholder.jpg';
  let alt = 'Visuel';
  if (lower.match(/\.(jpg|jpeg|png|gif|webp)$/i)) { src = url; srcFallback = url; alt = 'Visuel événement'; }
  else if (lower.match(/\.(mp4|mov|avi|mkv|webm)$/i)) { src = '/default-video-thumbnail.jpg'; srcFallback = src; }
  else if (lower.match(/\.(mp3|wav|ogg)$/i)) { src = '/default-audio-thumbnail.jpg'; srcFallback = src; }
  const isWebp = src.endsWith('.webp') && srcFallback.endsWith('.jpg');
  const imgClass = 'w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl flex-shrink-0';
  return (
    <Link to={`/events/${eventId}`} className="flex-shrink-0">
      {isWebp ? (
        <picture>
          <source srcSet={src} type="image/webp" />
          <img src={srcFallback} alt={alt} loading="lazy" decoding="async" className={imgClass} />
        </picture>
      ) : (
        <img src={src} alt={alt} loading="lazy" decoding="async" className={imgClass} />
      )}
    </Link>
  );
};

const ActionBtn = ({ to, onClick, disabled, variant = 'ghost', children }) => {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors';
  const v = {
    ghost:   'text-gray-600 hover:bg-gray-100',
    green:   'text-emerald-700 hover:bg-emerald-50',
    red:     'text-red-600 hover:bg-red-50',
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  };
  const cls = `${base} ${v[variant]} ${disabled ? 'opacity-50 pointer-events-none' : ''}`;
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  return <button type="button" onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
};

const EventCard = ({
  event, user, isPremiumAccount, ownerNamesByUserId,
  eventStats, capsByEventId, capsLoadingByEventId,
  deletingEventId, onDelete,
}) => {
  const status = statusConfig[event.status] || { pill: 'bg-gray-50 text-gray-600 ring-gray-200', dot: 'bg-gray-400', label: 'Inconnu' };
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
  const pendingCount = typeof stats?.totalPending === 'number' ? stats.totalPending : 0;
  const totalWithVideo = typeof stats?.totalWithVideo === 'number' ? stats.totalWithVideo : 0;
  const totalInvitations = typeof stats?.totalInvitations === 'number' ? stats.totalInvitations : 0;
  const completionPct = totalInvitations > 0 ? Math.round((totalWithVideo / totalInvitations) * 100) : 0;

  const caps = capsByEventId[event.id] || null;
  const capsLoading = !!capsLoadingByEventId[event.id];
  const latestVideo = caps?.state?.latestVideo || null;
  const hasReachedUploadLimit = Boolean(caps?.state?.hasReachedUploadLimit);

  // Tags inline (visibility flags only, not stats)
  const tags = [
    isPublicEvent ? '🌐 Public' : '🔒 Privé',
    expired && '⏱ Expiré',
    hasFinalVideo && '🎬 Vidéo finale prête',
    isEffectivePremiumEvent && '✦ Premium',
  ].filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">

      {/* ── Body ─────────────────────────────────── */}
      <div className="p-5">
        <div className="flex gap-4">

          <EventThumbnail url={event.media_url} eventId={event.id} />

          <div className="flex-1 min-w-0">

            {/* Row 1 : title + status */}
            <div className="flex items-start justify-between gap-3">
              <Link to={`/events/${event.id}`} className="min-w-0">
                <h3 className="text-[15px] font-semibold text-gray-900 hover:text-indigo-600 transition-colors leading-snug truncate">
                  {event.title}
                </h3>
              </Link>
              <span className={`flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ${status.pill}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>

            {/* Row 2 : creator + date */}
            <p className="mt-1 text-xs text-gray-400">
              Par <span className="text-gray-600 font-medium">{creatorName}</span>
              {' · '}{formatDate(event.created_at)}
            </p>

            {/* Row 3 : inline tags */}
            <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">
              {tags.join('  ·  ')}
            </p>

          </div>
        </div>

        {/* ── Owner stats bar ──────────────────────── */}
        {isOwner && totalInvitations > 0 && (
          <div className="mt-4 bg-gray-50 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700">
                {totalWithVideo} vidéo{totalWithVideo > 1 ? 's' : ''} reçue{totalWithVideo > 1 ? 's' : ''}
                <span className="text-gray-400 font-normal"> / {totalInvitations} invités</span>
              </span>
              <div className="flex items-center gap-3">
                {pendingCount > 0 && (
                  <span className="text-[11px] text-orange-600 font-medium">
                    {pendingCount} en attente
                  </span>
                )}
                <span className="text-xs font-semibold text-gray-700">{completionPct}%</span>
              </div>
            </div>
            <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  completionPct >= 70 ? 'bg-emerald-500' : completionPct >= 30 ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Participant status ───────────────────── */}
        {!isOwner && (
          <div className="mt-3">
            {capsLoading && (
              <p className="text-xs text-gray-400 italic">Vérification…</p>
            )}
            {!capsLoading && !!latestVideo && (
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Vidéo envoyée
              </p>
            )}
            {!capsLoading && hasReachedUploadLimit && (
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Limite d&apos;envoi atteinte
              </p>
            )}
          </div>
        )}

        {/* ── Share link — owner only ──────────────── */}
        {isOwner && event.public_code && (
          <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 015.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
            </svg>
            <span className="flex-1 min-w-0 text-[11px] text-gray-500 truncate font-mono">{publicUrl}</span>
            <button
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(publicUrl)
                  .then(() => toast.success('Lien copié !'))
                  .catch(() => toast.error('Impossible de copier'))
              }
              className="flex-shrink-0 text-[11px] font-medium text-gray-600 hover:text-indigo-600 transition-colors px-1"
            >
              Copier
            </button>
            <span className="text-gray-200 select-none">|</span>
            <button
              type="button"
              onClick={() =>
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(`Participe à mon événement Grega Play : ${whatsappShareUrl}`)}`,
                  '_blank'
                )
              }
              className="flex-shrink-0 text-[11px] font-semibold text-green-600 hover:text-green-700 transition-colors px-1"
            >
              WhatsApp
            </button>
          </div>
        )}
      </div>

      {/* ── Footer actions ───────────────────────── */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl flex items-center gap-1">
        <ActionBtn to={`/events/${event.id}`} variant="ghost">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Voir
        </ActionBtn>

        {isOwner && (
          <ActionBtn to={`/events/${event.id}/manage-participants`} variant="green">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Inviter
          </ActionBtn>
        )}

        {!isOwner && caps?.actions?.canUploadVideo === true && !hasReachedUploadLimit && (
          <ActionBtn to={`/events/${event.id}/submit`} variant="primary">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Envoyer ma vidéo
          </ActionBtn>
        )}

        {isOwner && (
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
        )}
      </div>

    </div>
  );
};

export default EventCard;
