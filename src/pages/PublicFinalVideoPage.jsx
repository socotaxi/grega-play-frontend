import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function buildShareUrl(publicCode) {
  const backendUrl = import.meta.env.VITE_API_BASE_URL || "";
  if (backendUrl) return `${backendUrl}/share/v/${publicCode}`;
  return `${window.location.origin}/player/${publicCode}`;
}

// ─── Share buttons ───────────────────────────────────────────────────────────

function ShareBar({ publicCode, title }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = buildShareUrl(publicCode);
  const shareText = encodeURIComponent(`🎬 Regardez notre montage vidéo "${title}" !`);
  const whatsappUrl = `https://wa.me/?text=${shareText}%20${encodeURIComponent(shareUrl)}`;

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleNativeShare() {
    if (!navigator.share) return handleCopy();
    try {
      await navigator.share({ title, url: shareUrl });
    } catch {
      // user cancelled — no-op
    }
  }

  return (
    <div className="flex flex-wrap gap-3 justify-center mt-6">
      {/* WhatsApp */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#25D366] text-white font-semibold text-sm shadow hover:brightness-110 transition"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.1 1.51 5.833L.057 23.082a.75.75 0 0 0 .924.908l5.42-1.424A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.7 9.7 0 0 1-4.953-1.354l-.355-.212-3.684.968.984-3.594-.233-.37A9.693 9.693 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
        </svg>
        WhatsApp
      </a>

      {/* Copy link */}
      <button
        onClick={handleCopy}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-full border font-semibold text-sm shadow transition ${
          copied
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        }`}
      >
        {copied ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Lien copié !
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Copier le lien
          </>
        )}
      </button>

      {/* Native share (mobile) */}
      {typeof navigator !== "undefined" && navigator.share && (
        <button
          onClick={handleNativeShare}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 text-white font-semibold text-sm shadow hover:bg-emerald-600 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Partager
        </button>
      )}
    </div>
  );
}

// ─── Stat pill ───────────────────────────────────────────────────────────────

function StatPill({ icon, label }) {
  return (
    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-full px-3 py-1 text-sm font-medium">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

function PublicFinalVideoPage() {
  const { publicCode } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const videoRef = useRef(null);

  useEffect(() => {
    if (!publicCode) return;
    setLoading(true);
    setError("");
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/public/final-video/${publicCode}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.message || body.error || "Impossible de charger la vidéo finale");
        return body;
      })
      .then(setData)
      .catch((err) => {
        console.error("Erreur chargement vidéo finale:", err);
        setError(err.message || "Impossible de charger la vidéo. Vérifie ta connexion ou réessaie plus tard.");
      })
      .finally(() => setLoading(false));
  }, [publicCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Chargement du montage…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 px-4">
        <div className="bg-white border border-red-200 rounded-2xl px-6 py-6 shadow-sm max-w-md text-center">
          <div className="text-3xl mb-3">😔</div>
          <p className="text-red-600 font-semibold mb-1">Une erreur s'est produite</p>
          <p className="text-gray-500 text-sm">{error || "Vidéo introuvable"}</p>
        </div>
      </div>
    );
  }

  const eventDate = formatDate(data.deadline);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-gray-50 flex flex-col">

      {/* ── Header ── */}
      <header className="w-full px-4 py-3 flex items-center justify-between border-b border-emerald-100 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">GP</span>
          </div>
          <span className="font-semibold text-gray-800">Grega Play</span>
        </div>
        <a
          href="/"
          className="text-xs font-medium text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 hover:bg-emerald-50 transition"
        >
          Créer ma vidéo
        </a>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">

        {/* ── Title block ── */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide mb-3">
            <span>🎬</span> Montage collectif
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
            {data.title}
          </h1>
          {data.description && (
            <p className="text-gray-500 mt-2 text-sm leading-relaxed max-w-xl mx-auto">
              {data.description}
            </p>
          )}

          {/* Stats pills */}
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {data.videosCount > 0 && (
              <StatPill icon="🎞️" label={`${data.videosCount} clip${data.videosCount > 1 ? "s" : ""}`} />
            )}
            {data.participantsCount > 0 && (
              <StatPill icon="👥" label={`${data.participantsCount} participant${data.participantsCount > 1 ? "s" : ""}`} />
            )}
            {eventDate && (
              <StatPill icon="📅" label={eventDate} />
            )}
            {data.theme && (
              <StatPill icon="✨" label={data.theme} />
            )}
          </div>
        </div>

        {/* ── Video player ── */}
        <div className="w-full rounded-2xl overflow-hidden shadow-lg bg-black aspect-video relative group">
          <video
            ref={videoRef}
            src={data.finalVideoUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-contain"
            poster={data.mediaUrl || undefined}
          />
        </div>

        {/* ── Share section ── */}
        <div className="bg-white border border-emerald-100 rounded-2xl px-5 py-5 text-center shadow-sm">
          <p className="text-gray-700 font-semibold mb-1">Tu as aimé ce montage ?</p>
          <p className="text-gray-400 text-sm">Partage-le avec tes proches !</p>
          <ShareBar publicCode={publicCode} title={data.title} />
        </div>

        {/* ── CTA ── */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl px-6 py-5 text-white text-center shadow">
          <p className="font-bold text-lg mb-1">Crée ton propre montage collectif</p>
          <p className="text-emerald-100 text-sm mb-4">
            Invite tes amis à envoyer des clips, Grega Play assemble tout automatiquement.
          </p>
          <a
            href="/"
            className="inline-block bg-white text-emerald-700 font-semibold rounded-full px-6 py-2.5 text-sm hover:bg-emerald-50 transition"
          >
            Commencer gratuitement
          </a>
        </div>

        {/* ── Footer ── */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Créé avec <span className="font-semibold text-emerald-600">Grega Play</span> — L'émotion se construit ensemble.
        </p>
      </main>
    </div>
  );
}

export default PublicFinalVideoPage;
