import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import reactionService, { ALLOWED_EMOJIS } from "../services/reactionService";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// ─── Reactions bar ───────────────────────────────────────────────────────────

function ReactionsBar({ publicCode }) {
  const [counts, setCounts]       = useState({});
  const [myReaction, setMyReaction] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [animating, setAnimating] = useState(null); // emoji en cours d'animation

  // Chargement initial
  useEffect(() => {
    if (!publicCode) return;
    Promise.all([
      reactionService.getCounts(publicCode),
      reactionService.getMyReaction(publicCode),
    ]).then(([c, my]) => {
      setCounts(c);
      setMyReaction(my);
    }).finally(() => setLoading(false));
  }, [publicCode]);

  // Abonnement Realtime
  useEffect(() => {
    if (!publicCode) return;
    const channel = supabase
      .channel(`reactions-${publicCode}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "final_video_reactions", filter: `public_code=eq.${publicCode}` },
        async () => {
          const updated = await reactionService.getCounts(publicCode);
          setCounts(updated);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [publicCode]);

  const handleToggle = useCallback(async (emoji) => {
    const prev = myReaction;
    const isToggleOff = prev === emoji;

    // Optimistic update
    setMyReaction(isToggleOff ? null : emoji);
    setCounts((c) => {
      const next = { ...c };
      if (prev) next[prev] = Math.max(0, (next[prev] || 1) - 1);
      if (!isToggleOff) next[emoji] = (next[emoji] || 0) + 1;
      return next;
    });

    // Animation burst
    setAnimating(emoji);
    setTimeout(() => setAnimating(null), 400);

    try {
      await reactionService.toggleReaction(publicCode, emoji);
    } catch {
      // Rollback
      setMyReaction(prev);
      setCounts((c) => {
        const next = { ...c };
        if (!isToggleOff) next[emoji] = Math.max(0, (next[emoji] || 1) - 1);
        if (prev) next[prev] = (next[prev] || 0) + 1;
        return next;
      });
    }
  }, [publicCode, myReaction]);

  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div className="mt-6">
      {total > 0 && (
        <p className="text-center text-xs text-gray-400 mb-3">
          {total} réaction{total > 1 ? "s" : ""}
        </p>
      )}
      <div className="flex flex-wrap gap-2 justify-center">
        {ALLOWED_EMOJIS.map((emoji) => {
          const count = counts[emoji] || 0;
          const isActive = myReaction === emoji;
          const isBursting = animating === emoji;

          return (
            <button
              key={emoji}
              onClick={() => handleToggle(emoji)}
              disabled={loading}
              style={{ transform: isBursting ? "scale(1.35)" : "scale(1)", transition: "transform 0.2s cubic-bezier(.34,1.56,.64,1)" }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border select-none transition-colors
                ${isActive
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                } disabled:opacity-50`}
            >
              <span className="text-lg leading-none">{emoji}</span>
              {count > 0 && (
                <span className="tabular-nums text-xs">{count}</span>
              )}
            </button>
          );
        })}
      </div>
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

        {/* ── Reactions section ── */}
        <div className="bg-white border border-emerald-100 rounded-2xl px-5 py-5 text-center shadow-sm">
          <p className="text-gray-700 font-semibold mb-1">Tu as aimé ce montage ?</p>
          <p className="text-gray-400 text-sm">Laisse une réaction !</p>
          <ReactionsBar publicCode={publicCode} />
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
