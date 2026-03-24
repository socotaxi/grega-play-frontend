import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const statusMap = {
  open: { color: 'bg-yellow-100 text-yellow-800', label: 'Ouvert' },
  ready: { color: 'bg-blue-100 text-blue-800', label: 'Prêt pour montage' },
  processing: { color: 'bg-purple-100 text-purple-800', label: 'En traitement' },
  done: { color: 'bg-green-100 text-green-800', label: 'Terminé' },
  canceled: { color: 'bg-red-100 text-red-800', label: 'Annulé' },
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
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
          <img src={srcFallback} alt={alt} width="80" height="64" loading="lazy" decoding="async" className="w-20 h-16 object-cover rounded-md border border-gray-200" />
        </picture>
      ) : (
        <img src={src} alt={alt} width="80" height="64" loading="lazy" decoding="async" className="w-20 h-16 object-cover rounded-md border border-gray-200" />
      )}
    </Link>
  );
};

const EventCard = ({
  event, user, isPremiumAccount, ownerNamesByUserId,
  eventStats, capsByEventId, capsLoadingByEventId,
  deletingEventId, onDelete,
}) => {
  const status = statusMap[event.status] || { color: 'bg-gray-100 text-gray-800', label: 'Inconnu' };
  const isOwner = event.user_id === user?.id;
  const isPublicEvent = event.is_public === true;
  const hasFinalVideo = !!event.final_video_url;
  const isEffectivePremiumEvent = event.is_premium_event === true || (isPremiumAccount && isOwner);

  const publicUrl = event.public_code ? `${window.location.origin}/e/${event.public_code}` : '';
  // URL de partage WhatsApp : pointe vers le backend (/share/e/:code) pour déclencher
  // le crawler OG de WhatsApp (image + titre + description). L'utilisateur est ensuite
  // redirigé automatiquement vers l'app.
  const whatsappShareUrl = event.public_code && import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/share/e/${event.public_code}`
    : publicUrl;
  const creatorName = event.owner_name || ownerNamesByUserId[event.user_id] || 'Un organisateur';

  const stats = eventStats[event.id];
  const pendingCount = typeof stats?.totalPending === 'number' ? stats.totalPending : null;
  const totalWithVideo = typeof stats?.totalWithVideo === 'number' ? stats.totalWithVideo : 0;

  const caps = capsByEventId[event.id] || null;
  const capsLoading = !!capsLoadingByEventId[event.id];
  const latestVideo = caps?.state?.latestVideo || null;
  const hasReachedUploadLimit = Boolean(caps?.state?.hasReachedUploadLimit);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 shadow-sm px-4 py-4 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-start gap-3">
            <EventThumbnail url={event.media_url} eventId={event.id} />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">{event.title}</h3>
              <p className="text-xs text-gray-500">
                Créé par <span className="font-medium text-gray-700">{creatorName}</span>
              </p>
              <p className="text-xs text-gray-500">le {formatDate(event.created_at)}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full ${status.color}`}>{status.label}</span>
                <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-gray-100 text-gray-700">{isPublicEvent ? 'Public' : 'Privé'}</span>
                {isEventExpired(event) && <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-red-100 text-red-800">Expiré</span>}
                {hasFinalVideo && <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-purple-100 text-purple-800">Vidéo finale prête</span>}
                {isEffectivePremiumEvent && <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-violet-100 text-violet-800">Premium</span>}
                {capsLoading && !isOwner && <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-gray-100 text-gray-600">Vérification...</span>}
                {!isOwner && !!latestVideo && <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Vidéo envoyée</span>}
                {!isOwner && hasReachedUploadLimit && <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">Limite atteinte</span>}
                {isOwner && pendingCount > 0 && <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-orange-50 text-orange-700">{pendingCount} en attente de vidéo</span>}
                {isOwner && totalWithVideo > 0 && <span className="inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{totalWithVideo} vidéo{totalWithVideo > 1 ? 's' : ''} reçue{totalWithVideo > 1 ? 's' : ''}</span>}
              </div>


              {isOwner && event.public_code && (
                <div className="mt-3">
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Lien de partage</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={publicUrl}
                        className="flex-1 min-w-0 text-[11px] border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          navigator.clipboard.writeText(publicUrl)
                            .then(() => toast.success('Lien copié dans le presse-papiers'))
                            .catch(() => toast.error('Impossible de copier le lien'))
                        }
                        className="shrink-0 inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-[11px] font-medium rounded-md bg-white hover:bg-gray-50 text-gray-700"
                      >
                        Copier
                      </button>
                    </div>
                    <div className="flex justify-center sm:justify-start">
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `https://wa.me/?text=${encodeURIComponent(`Participe à mon événement Grega Play : ${whatsappShareUrl}`)}`,
                            '_blank'
                          )
                        }
                        className="inline-flex items-center justify-center px-4 py-2 text-[11px] font-semibold rounded-md bg-green-500 hover:bg-green-600 text-white"
                      >
                        Partager sur WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col gap-2 sm:items-end">
          <Link
            to={`/events/${event.id}`}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium rounded-lg"
          >
            Voir l&apos;évènement
          </Link>
          {isOwner && (
            <>
              <Link
                to={`/events/${event.id}/manage-participants`}
                className="inline-flex items-center px-3 py-1.5 border border-emerald-600 text-emerald-600 hover:bg-emerald-50 text-xs font-medium rounded-lg"
              >
                Inviter un ami
              </Link>
              <button
                onClick={() => onDelete(event.id)}
                disabled={deletingEventId === event.id}
                className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium rounded-lg disabled:opacity-60"
              >
                {deletingEventId === event.id ? 'Suppression...' : 'Supprimer'}
              </button>
            </>
          )}
          {!isOwner && caps?.actions?.canUploadVideo === true && !hasReachedUploadLimit && (
            <Link
              to={`/events/${event.id}/submit`}
              className="inline-flex items-center px-3 py-1.5 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 text-xs font-medium rounded-lg"
            >
              Envoyer ma vidéo
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;
