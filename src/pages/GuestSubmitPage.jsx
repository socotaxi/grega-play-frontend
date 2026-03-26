// src/pages/GuestSubmitPage.jsx — Upload vidéo sans compte (invité)
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import videoService from "../services/videoService";
import { compressVideo, shouldCompress } from "../utils/videoCompressor";
import { toast } from "react-toastify";

const MAX_DURATION_SEC = 30;
const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const COMPRESS_THRESHOLD = 15 * 1024 * 1024;

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

function clampPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function formatSpeed(bps) {
  const n = Number(bps);
  if (!Number.isFinite(n) || n <= 0) return null;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} Ko/s`;
  return `${(kb / 1024).toFixed(1)} Mo/s`;
}

function formatEta(sec) {
  const s = Number(sec);
  if (!Number.isFinite(s) || s <= 0) return null;
  if (s < 60) return `${Math.round(s)}s`;
  return `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;
}

const GuestSubmitPage = () => {
  const { publicCode } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mobile = isMobile();

  const guestName = searchParams.get("name") || "";

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [event, setEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileError, setFileError] = useState(null);

  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressionInfo, setCompressionInfo] = useState(null);
  const [needsCompression, setNeedsCompression] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isIndeterminate, setIsIndeterminate] = useState(false);
  const [uploadMeta, setUploadMeta] = useState({ loadedLabel: null, totalLabel: null, speedBps: null, etaSeconds: null });

  // Redirect if no name provided
  useEffect(() => {
    if (!guestName.trim()) navigate(`/e/${publicCode}`, { replace: true });
  }, [guestName, publicCode, navigate]);

  // Fetch event info
  useEffect(() => {
    const fetch_ = async () => {
      setLoadingEvent(true);
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const res = await fetch(`${backendUrl}/api/public/event/${publicCode}`);
        const json = await res.json();
        if (!res.ok || !json.event) { setEventError("Événement introuvable."); return; }
        if (!json.event.is_public) { setEventError("Cet événement n'accepte pas les participations sans compte."); return; }
        if (json.event.status !== "open") { setEventError("Cet événement n'accepte plus de vidéos."); return; }
        setEvent(json.event);
      } catch {
        setEventError("Impossible de charger l'événement.");
      } finally {
        setLoadingEvent(false);
      }
    };
    if (publicCode) fetch_();
  }, [publicCode]);

  // Redirect to confirmation page after success
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => navigate(`/e/${publicCode}`), 3000);
    return () => clearTimeout(t);
  }, [success, publicCode, navigate]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setCompressionInfo(null);
    setNeedsCompression(false);
    setUploadProgress(0);
    setSuccess(false);

    if (!file.type.startsWith("video/")) {
      setFileError("Veuillez sélectionner un fichier vidéo.");
      e.target.value = null;
      return;
    }

    const tooBig = file.size > MAX_SIZE_BYTES;
    if (tooBig && !mobile) {
      setFileError(`La vidéo est trop lourde. Maximum : ${MAX_SIZE_MB} Mo.`);
      e.target.value = null;
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      if (video.duration > MAX_DURATION_SEC) {
        setFileError(`La vidéo dépasse ${MAX_DURATION_SEC} secondes.`);
        setSelectedFile(null);
        setPreviewUrl(null);
        e.target.value = null;
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));

      if (shouldCompress(file, COMPRESS_THRESHOLD)) {
        if (mobile) {
          handleCompress(file);
        } else {
          setNeedsCompression(tooBig);
        }
      }
    };
    video.onerror = () => {
      setFileError("Impossible de lire la vidéo. Essaie un autre fichier.");
      setSelectedFile(null);
      setPreviewUrl(null);
      e.target.value = null;
    };
    video.src = URL.createObjectURL(file);
  };

  const handleCompress = async (fileToCompress) => {
    setCompressing(true);
    setCompressionProgress(0);
    try {
      const compressed = await compressVideo(fileToCompress, { onProgress: setCompressionProgress });
      if (compressed.size > MAX_SIZE_BYTES) {
        setFileError(`Même après compression, la vidéo est trop lourde. Essaie une vidéo plus courte.`);
        setSelectedFile(null);
        setPreviewUrl(null);
        setNeedsCompression(false);
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
      setNeedsCompression(false);
      setCompressionInfo({ originalSize: fileToCompress.size, compressedSize: compressed.size });
      toast.success("Vidéo compressée !");
    } catch {
      setFileError("La compression a échoué. Essaie une vidéo plus légère.");
      setNeedsCompression(false);
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !event?.id) return;
    setSubmitError(null);
    setSubmitting(true);
    setUploadProgress(1);
    setIsIndeterminate(false);
    setUploadMeta({ loadedLabel: null, totalLabel: null, speedBps: null, etaSeconds: null });

    try {
      await videoService.uploadVideoAsGuest(
        selectedFile,
        { eventId: event.id, guestName },
        (pctRaw, meta) => {
          if (pctRaw === -1) {
            setIsIndeterminate(true);
            if (meta) setUploadMeta({ loadedLabel: meta.loadedLabel ?? null, totalLabel: meta.totalLabel ?? null, speedBps: meta.speedBps ?? null, etaSeconds: meta.etaSeconds ?? null });
            setUploadProgress((p) => (p > 0 ? p : 10));
            return;
          }
          setIsIndeterminate(false);
          if (meta) setUploadMeta({ loadedLabel: meta.loadedLabel ?? null, totalLabel: meta.totalLabel ?? null, speedBps: meta.speedBps ?? null, etaSeconds: meta.etaSeconds ?? null });
          const pct = clampPct(pctRaw);
          if (pct === null) return;
          setUploadProgress(pct >= 100 ? 99 : Math.max(1, pct));
        }
      );

      setUploadProgress(100);
      toast.success("Merci pour ta vidéo !");
      setSuccess(true);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setSubmitError(err?.message || "Une erreur s'est produite lors de l'envoi.");
      toast.error(err?.message || "Erreur lors de l'envoi.");
      setUploadProgress(0);
      setIsIndeterminate(false);
      setUploadMeta({ loadedLabel: null, totalLabel: null, speedBps: null, etaSeconds: null });
    } finally {
      setSubmitting(false);
    }
  };

  const speedLabel = formatSpeed(uploadMeta?.speedBps);
  const etaLabel = formatEta(uploadMeta?.etaSeconds);
  const showProgressBar = submitting || (uploadProgress > 0 && uploadProgress < 100);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loadingEvent) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-sm text-gray-400">Chargement…</p>
        </div>
      </MainLayout>
    );
  }

  if (eventError) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <p className="text-sm text-gray-500 mb-4">{eventError}</p>
            <Link to={`/e/${publicCode}`} className="text-brand-600 text-sm font-semibold hover:underline">
              ← Retour à l'événement
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (success) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-sm space-y-4">
            <div className="text-5xl">🎉</div>
            <h1 className="text-xl font-bold text-gray-900">Vidéo envoyée !</h1>
            <p className="text-sm text-gray-500">Merci <strong>{guestName}</strong> pour ta participation !</p>

            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 text-left space-y-2">
              <p className="text-sm font-semibold text-indigo-800">Envie de revoir ta vidéo ?</p>
              <p className="text-xs text-indigo-600 leading-relaxed">
                Crée un compte gratuit pour retrouver ta vidéo, suivre le montage final et participer à d'autres événements.
              </p>
              <Link
                to={`/register?returnTo=${encodeURIComponent(`/e/${publicCode}`)}`}
                className="inline-block mt-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Créer un compte gratuit
              </Link>
            </div>

            <p className="text-xs text-gray-400">Tu vas être redirigé dans quelques secondes…</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to={`/e/${publicCode}`} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3">
            ← Retour à l'événement
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{event?.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bonjour <strong>{guestName}</strong> ! Choisis ta vidéo et envoie-la.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-gray-100 rounded-2xl shadow-sm p-5">

          {/* File inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={submitting || compressing}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="video/*"
            capture="camcorder"
            className="hidden"
            onChange={handleFileChange}
            disabled={submitting || compressing}
          />

          {/* Upload buttons */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Ta vidéo</label>
            {mobile ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={submitting || compressing}
                  className="flex-1 flex flex-col items-center gap-1 py-4 border-2 border-dashed border-blue-400 rounded-xl text-blue-600 text-sm font-medium hover:bg-blue-50 transition disabled:opacity-50"
                >
                  <span className="text-2xl">📷</span>
                  Filmer maintenant
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting || compressing}
                  className="flex-1 flex flex-col items-center gap-1 py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <span className="text-2xl">🎞️</span>
                  Depuis la galerie
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting || compressing}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                🎬 Choisir une vidéo
              </button>
            )}
            <p className="mt-2 text-xs text-gray-400">
              Durée max : {MAX_DURATION_SEC} secondes · Taille max : {MAX_SIZE_MB} Mo
              {mobile && " · Compression automatique si &gt; 15 Mo"}
            </p>
          </div>

          {/* Compression progress */}
          {compressing && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex justify-between mb-1 text-sm text-blue-700 font-medium">
                <span>⚙️ Compression…</span>
                <span>{compressionProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded h-2 overflow-hidden">
                <div className="bg-blue-600 h-2 transition-all" style={{ width: `${compressionProgress}%` }} />
              </div>
            </div>
          )}

          {/* Compression result */}
          {compressionInfo && !compressing && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              ✅ Vidéo compressée : {(compressionInfo.compressedSize / 1024 / 1024).toFixed(1)} Mo
              {" "}(économie de {((1 - compressionInfo.compressedSize / compressionInfo.originalSize) * 100).toFixed(0)}%)
            </p>
          )}

          {/* Manual compress (desktop) */}
          {!mobile && needsCompression && !compressing && selectedFile && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-orange-600">⚠️ Vidéo trop lourde pour l'envoi direct.</span>
              <button
                type="button"
                onClick={() => handleCompress(selectedFile)}
                className="text-xs px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
              >
                Compresser
              </button>
            </div>
          )}

          {/* Selected file name */}
          {selectedFile && !compressing && (
            <p className="text-xs text-gray-500 truncate">
              📎 {selectedFile.name} — {(selectedFile.size / 1024 / 1024).toFixed(1)} Mo
            </p>
          )}

          {/* Preview */}
          {previewUrl && !compressing && (
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <video controls src={previewUrl} className="w-full" playsInline />
            </div>
          )}

          {/* File error */}
          {fileError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {fileError}
            </div>
          )}

          {/* Upload progress */}
          {showProgressBar && (
            <div>
              <div className="flex justify-between mb-1 text-xs text-gray-600">
                <span>Envoi en cours…</span>
                <span>{isIndeterminate ? "…" : `${uploadProgress}%`}</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                <div className="bg-brand-600 h-2 transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-gray-400">
                {uploadMeta.loadedLabel && uploadMeta.totalLabel && (
                  <span>{uploadMeta.loadedLabel} / {uploadMeta.totalLabel}</span>
                )}
                {speedLabel && <span>Vitesse : {speedLabel}</span>}
                {etaLabel && <span>Restant : {etaLabel}</span>}
              </div>
              {uploadProgress >= 99 && submitting && (
                <p className="mt-1 text-[11px] text-gray-400">Finalisation…</p>
              )}
            </div>
          )}

          {/* Submit error */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {submitError}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting || compressing || needsCompression || !selectedFile}
            className="w-full py-3.5 rounded-2xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {submitting
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Envoi…</>
              : compressing
              ? "Compression…"
              : "Envoyer ma vidéo"}
          </button>
        </form>
      </div>
    </MainLayout>
  );
};

export default GuestSubmitPage;
