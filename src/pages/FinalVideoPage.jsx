// src/pages/FinalVideoPage.jsx
import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import Button from "../components/ui/Button";
import Loading from "../components/ui/Loading";
import eventService from "../services/eventService";
import videoService from "../services/videoService";
import { useAuth } from "../context/AuthContext";
import activityService from "../services/activityService";
import supabase from "../lib/supabaseClient";
import { toast } from "react-toastify";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getPublicVideoUrl = (storagePath) => {
  if (!storagePath) return null;
  const { data } = supabase.storage.from("videos").getPublicUrl(storagePath);
  return data?.publicUrl || null;
};

const extractFinalUrl = (final_video_url) => {
  if (!final_video_url) return null;
  if (typeof final_video_url === "string") return final_video_url;
  if (typeof final_video_url === "object" && final_video_url.videoUrl) return final_video_url.videoUrl;
  return null;
};

const TRANSITIONS = [
  { id: "modern_1", name: "Fondu", detail: "Transition douce" },
  { id: "modern_2", name: "Glissement", detail: "Style dynamique" },
  { id: "modern_3", name: "Zoom", detail: "Effet cinématique" },
  { id: "modern_4", name: "Cinéma", detail: "Transition pro" },
  { id: "modern_5", name: "Flash", detail: "Rythme rapide" },
];

const MODE_CHIPS = [
  { value: "none", label: "Aucune" },
  { value: "intro_outro", label: "Intro / Outro" },
  { value: "full", label: "Toute la vidéo" },
];

// ─── Icônes ───────────────────────────────────────────────────────────────────
const IconCheck = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const IconDownload = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const IconCopy = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
const IconStar = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);
const IconFilm = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
  </svg>
);
const IconMusic = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
  </svg>
);
const IconWatermark = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const IconUpload = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

// ─── Chip ─────────────────────────────────────────────────────────────────────
const Chip = ({ active, children, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={[
      "px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
      active
        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50",
      disabled ? "opacity-40 cursor-not-allowed" : "",
    ].join(" ")}
  >
    {children}
  </button>
);

// ─── SectionCard ──────────────────────────────────────────────────────────────
const SectionCard = ({ icon, title, badge, right, children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-indigo-500">{icon}</span>}
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {badge}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
    <div className="px-5 py-5">{children}</div>
  </div>
);

// ─── PremiumBadge ─────────────────────────────────────────────────────────────
const PremiumBadge = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-200">
    <IconStar /> Premium
  </span>
);

// ─── FileUploadArea ───────────────────────────────────────────────────────────
const FileUploadArea = ({ label, accept, onChange, fileName, uploaded, onClear, hint }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-2">{label}</label>
    {fileName || uploaded ? (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50">
        <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs text-emerald-700 font-medium truncate flex-1">
          {uploaded ? "Fichier enregistré" : fileName}
        </span>
        <button type="button" onClick={onClear} className="text-red-500 hover:text-red-600 shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    ) : (
      <label className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-colors">
        <IconUpload />
        <span className="text-xs text-gray-500 font-medium">Cliquer pour choisir un fichier</span>
        <input type="file" accept={accept} onChange={onChange} className="sr-only" />
      </label>
    )}
    {hint && <p className="mt-1.5 text-[11px] text-gray-400">{hint}</p>}
  </div>
);

// ─── VideoCard (memoized) ─────────────────────────────────────────────────────
const VideoCard = memo(function VideoCard({ video, isOwner, canSelect, isSelected, onToggleSelect, onDelete, userId }) {
  return (
    <div
      className={[
        "relative rounded-2xl overflow-hidden border-2 transition-all cursor-default",
        canSelect
          ? isSelected
            ? "border-indigo-500 shadow-md shadow-indigo-100"
            : "border-gray-200 hover:border-indigo-300"
          : "border-gray-200",
      ].join(" ")}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] bg-gray-900">
        <video
          src={video.publicUrl}
          className="w-full h-full object-cover"
          preload="metadata"
          playsInline
          onClick={canSelect ? () => onToggleSelect(video.id) : undefined}
        />

        {/* Selection overlay */}
        {canSelect && (
          <button
            type="button"
            onClick={() => onToggleSelect(video.id)}
            className="absolute inset-0 w-full h-full focus:outline-none"
            aria-label={isSelected ? "Désélectionner" : "Sélectionner"}
          >
            <div className="absolute top-2 right-2">
              <div
                className={[
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  isSelected
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-white/80 border-gray-300 backdrop-blur-sm",
                ].join(" ")}
              >
                {isSelected && <IconCheck />}
              </div>
            </div>
          </button>
        )}

        {/* Selected banner */}
        {isSelected && (
          <div className="absolute bottom-0 inset-x-0 bg-indigo-600/90 py-1 text-center text-[11px] font-semibold text-white tracking-wide">
            Sélectionnée
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 bg-white flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate">
            {video.participant_name || "Auteur inconnu"}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {video.created_at
              ? new Date(video.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
              : "Date inconnue"}
          </p>
        </div>
        {(isOwner || video.user_id === userId) && (
          <button
            type="button"
            onClick={() => onDelete(video.id)}
            className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Supprimer"
          >
            <IconTrash />
          </button>
        )}
      </div>
    </div>
  );
});

// ─── SubmittedVideosSection (memoized) ────────────────────────────────────────
const SubmittedVideosSection = memo(function SubmittedVideosSection({
  submittedVideosWithUrl,
  isOwner,
  canStartProcessingNow,
  selectedVideoIds,
  onToggleSelect,
  onDelete,
  userId,
  maxSelectableForFinal,
}) {
  if (!submittedVideosWithUrl?.length) return null;

  const overLimit = Number.isFinite(maxSelectableForFinal) && selectedVideoIds.length > maxSelectableForFinal;

  return (
    <SectionCard
      icon={<IconFilm />}
      title={isOwner ? "Vidéos soumises" : "Vidéos"}
      right={
        isOwner && canStartProcessingNow ? (
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-semibold ${overLimit ? "text-red-600" : "text-gray-600"}`}>
              {selectedVideoIds.length} sélectionnée{selectedVideoIds.length > 1 ? "s" : ""}
            </span>
            {Number.isFinite(maxSelectableForFinal) && (
              <span className="text-[11px] text-gray-400">/ {maxSelectableForFinal} max</span>
            )}
          </div>
        ) : null
      }
    >
      {isOwner && canStartProcessingNow && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
          <svg className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-indigo-700">
            Clique sur les vidéos pour les sélectionner.
            Minimum <strong>2</strong> vidéos
            {Number.isFinite(maxSelectableForFinal) ? <>, maximum <strong>{maxSelectableForFinal}</strong></> : ""}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {submittedVideosWithUrl.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            isOwner={isOwner}
            canSelect={isOwner && canStartProcessingNow}
            isSelected={selectedVideoIds.includes(video.id)}
            onToggleSelect={onToggleSelect}
            onDelete={onDelete}
            userId={userId}
          />
        ))}
      </div>
    </SectionCard>
  );
});

// ─── Page principale ──────────────────────────────────────────────────────────
const FinalVideoPage = () => {
  const { eventId } = useParams();
  const { user, profile } = useAuth();

  const [event, setEvent] = useState(null);
  const [finalVideo, setFinalVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  const [processing, setProcessing] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationLabel, setGenerationLabel] = useState("");

  const [error, setError] = useState(null);
  const [submittedVideos, setSubmittedVideos] = useState([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState([]);

  const [capabilities, setCapabilities] = useState(null);
  const [capLoading, setCapLoading] = useState(true);
  const [capError, setCapError] = useState(null);

  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [jobError, setJobError] = useState(null);

  const pollTimerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  const pollDelayRef = useRef(2000);
  const hasRealProgressRef = useRef(false);

  const [transitionChoice, setTransitionChoice] = useState("modern_1");
  const [transitionDuration] = useState(0.3);

  const [watermarkEnabled, setWatermarkEnabled] = useState(true);

  const [musicMode, setMusicMode] = useState("none");
  const [musicVolume, setMusicVolume] = useState(0.6);
  const [musicFile, setMusicFile] = useState(null);

  const [introMode, setIntroMode] = useState("image");
  const [outroMode, setOutroMode] = useState("image");

  const [introFile, setIntroFile] = useState(null);
  const [outroFile, setOutroFile] = useState(null);

  const introTextRef = useRef("");
  const outroTextRef = useRef("");
  const introTextAreaRef = useRef(null);
  const outroTextAreaRef = useRef(null);

  useEffect(() => {
    if (musicFile && musicMode === "none") setMusicMode("full");
  }, [musicFile, musicMode]);

  useEffect(() => {
    if (introMode === "text") setIntroFile(null);
  }, [introMode]);

  useEffect(() => {
    if (outroMode === "text") setOutroFile(null);
  }, [outroMode]);

  const [assetPaths, setAssetPaths] = useState({ intro: null, outro: null, music: null });
  const [assetUploading, setAssetUploading] = useState(false);
  const [assetUploadError, setAssetUploadError] = useState(null);

  const isOwner = user && event && (user.id === event.user_id || user.role === "admin");

  const caps = capabilities || null;
  const capsActions = caps?.actions || {};
  const capsLimits = caps?.limits || {};
  const capsState = caps?.state || {};
  const capsPremium = caps?.premium || {};

  const latestVideo = capsState?.latestVideo || null;
  const hasReachedUploadLimit = Boolean(capsState?.hasReachedUploadLimit);

  const canUploadVideo = Boolean(capsActions?.canUploadVideo);
  const canGenerateFinalVideo = Boolean(capsActions?.canGenerateFinalVideo);
  const canRegenerateFinalVideo = Boolean(capsActions?.canRegenerateFinalVideo);

  const maxSelectableForFinal = Number.isFinite(capsLimits?.maxClipsSelectableForFinal)
    ? capsLimits.maxClipsSelectableForFinal
    : 5;

  const canUsePremiumEditing = Boolean(
    capsPremium?.isEffectivePremium ||
      capsPremium?.isPremium ||
      capsPremium?.isPremiumAccount ||
      capsPremium?.isPremiumEvent ||
      canRegenerateFinalVideo
  );

  useEffect(() => {
    if (!caps) return;
    if (!canUsePremiumEditing) setWatermarkEnabled(true);
  }, [caps, canUsePremiumEditing]);

  const assetStorageKey = useMemo(() => {
    if (!eventId) return null;
    return `gp:premiumAssets:${eventId}`;
  }, [eventId]);

  useEffect(() => {
    if (!assetStorageKey) return;
    try {
      const raw = localStorage.getItem(assetStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setAssetPaths({ intro: parsed.intro || null, outro: parsed.outro || null, music: parsed.music || null });
      }
    } catch {}
  }, [assetStorageKey]);

  useEffect(() => {
    if (!assetStorageKey) return;
    try {
      localStorage.setItem(assetStorageKey, JSON.stringify(assetPaths || { intro: null, outro: null, music: null }));
    } catch {}
  }, [assetStorageKey, assetPaths]);

  const uploadAssetNow = useCallback(
    async (file, kind) => {
      if (!file) return null;
      if (!canUsePremiumEditing) { toast.error("Options Premium requises."); return null; }
      if (!user?.id) { toast.error("Tu dois être connecté."); return null; }
      if (!eventId) { toast.error("Événement introuvable."); return null; }
      setAssetUploadError(null);
      setAssetUploading(true);
      try {
        const r = await videoService.uploadPremiumAsset(file, { userId: user.id, eventId, kind });
        if (!r?.storagePath) throw new Error("Upload réussi mais storagePath manquant.");
        return r.storagePath;
      } catch (e) {
        const msg = e?.message || "Erreur upload des assets premium.";
        setAssetUploadError(msg);
        toast.error(msg);
        return null;
      } finally {
        setAssetUploading(false);
      }
    },
    [canUsePremiumEditing, user?.id, eventId]
  );

  const handleIntroFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0] || null;
    setIntroFile(file);
    if (e?.target) e.target.value = "";
    if (!file) return;
    setAssetPaths((p) => ({ ...p, intro: null }));
    const storagePath = await uploadAssetNow(file, "intro");
    if (storagePath) { setAssetPaths((p) => ({ ...p, intro: storagePath })); toast.success("Intro enregistrée."); }
  }, [uploadAssetNow]);

  const handleOutroFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0] || null;
    setOutroFile(file);
    if (e?.target) e.target.value = "";
    if (!file) return;
    setAssetPaths((p) => ({ ...p, outro: null }));
    const storagePath = await uploadAssetNow(file, "outro");
    if (storagePath) { setAssetPaths((p) => ({ ...p, outro: storagePath })); toast.success("Outro enregistrée."); }
  }, [uploadAssetNow]);

  const handleMusicFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0] || null;
    setMusicFile(file);
    if (e?.target) e.target.value = "";
    if (!file) return;
    setAssetPaths((p) => ({ ...p, music: null }));
    const storagePath = await uploadAssetNow(file, "music");
    if (storagePath) {
      setAssetPaths((p) => ({ ...p, music: storagePath }));
      if (musicMode === "none") setMusicMode("full");
      toast.success("Musique enregistrée.");
    }
  }, [uploadAssetNow, musicMode]);

  const handleClearIntro = useCallback(() => { setIntroFile(null); setAssetPaths((p) => ({ ...p, intro: null })); }, []);
  const handleClearOutro = useCallback(() => { setOutroFile(null); setAssetPaths((p) => ({ ...p, outro: null })); }, []);
  const handleClearMusic = useCallback(() => { setMusicFile(null); setAssetPaths((p) => ({ ...p, music: null })); setMusicMode("none"); }, []);

  const latestVideoUrl = useMemo(() => {
    if (!latestVideo?.storage_path) return null;
    return getPublicVideoUrl(latestVideo.storage_path);
  }, [latestVideo?.storage_path]);

  const hasNotifiedProcessingRef = useRef(false);
  const hasNotifiedDoneRef = useRef(false);
  const hasAppliedDoneStateRef = useRef(false);
  const baselineFinalUrlRef = useRef(null);
  const jobIdRef = useRef(null);
  const processingRef = useRef(false);

  useEffect(() => { jobIdRef.current = jobId; }, [jobId]);
  useEffect(() => { processingRef.current = processing; }, [processing]);

  const resetRunGuards = () => {
    hasNotifiedProcessingRef.current = false;
    hasNotifiedDoneRef.current = false;
    hasAppliedDoneStateRef.current = false;
    pollDelayRef.current = 2000;
    hasRealProgressRef.current = false;
  };

  const acceptDoneOnlyIfNewFinalUrl = (updatedEvent) => {
    const updatedUrl = extractFinalUrl(updatedEvent?.final_video_url);
    if (!updatedUrl) return false;
    const baseline = baselineFinalUrlRef.current;
    if (baseline && updatedUrl === baseline) return false;
    return true;
  };

  const stopProgressTimer = () => {
    if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
  };
  const stopPollTimer = () => {
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null; }
  };

  const stopProcessingUi = useCallback((opts = {}) => {
    const { toastMessage = null } = opts;
    stopProgressTimer();
    stopPollTimer();
    try { if (abortControllerRef.current) abortControllerRef.current.abort(); } catch {} finally { abortControllerRef.current = null; }
    setProcessing(false);
    setGenerationProgress(0);
    setGenerationLabel("");
    setJobId(null);
    setJobStatus(null);
    setJobError(null);
    pollDelayRef.current = 2000;
    hasRealProgressRef.current = false;
    if (toastMessage) toast.info(toastMessage);
  }, []);

  useEffect(() => { return () => { stopProcessingUi(); }; }, [stopProcessingUi]);

  useEffect(() => {
    let cancelled = false;
    const loadCaps = async () => {
      try {
        setCapLoading(true); setCapError(null); setCapabilities(null);
        if (!eventId || !user?.id) return;
        const c = await videoService.getEventCapabilities(eventId);
        if (!cancelled) setCapabilities(c);
      } catch (e) {
        console.warn("Capabilities load failed:", e);
        if (!cancelled) { setCapabilities(null); setCapError(e?.message || "Impossible de charger les droits."); }
      } finally {
        if (!cancelled) setCapLoading(false);
      }
    };
    loadCaps();
    return () => { cancelled = true; };
  }, [eventId, user?.id]);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        const eventData = await eventService.getEvent(eventId);
        setEvent(eventData);
        baselineFinalUrlRef.current = extractFinalUrl(eventData?.final_video_url) || null;
        if (eventData?.status === "processing") {
          setProcessing(true);
          setGenerationProgress((p) => (p > 0 ? p : 5));
          setGenerationLabel((l) => (l ? l : "Montage en cours…"));
        }
        if (eventData.status === "done" && eventData.final_video_url) {
          const baseUrl = extractFinalUrl(eventData.final_video_url);
          if (baseUrl) setFinalVideo(`${baseUrl}?t=${Date.now()}`);
        }
      } catch (err) {
        console.error("Error fetching event details:", err);
        setError("Impossible de charger les détails de l'événement.");
      } finally {
        setLoading(false);
      }
    };
    fetchEventDetails();
  }, [eventId]);

  useEffect(() => {
    const fetchSubmittedVideos = async () => {
      try {
        const videos = await videoService.getVideosByEvent(eventId);
        if (!isOwner && user) {
          setSubmittedVideos(videos.filter((v) => v.user_id === user.id));
        } else {
          setSubmittedVideos(videos);
        }
      } catch (err) {
        console.error("Erreur chargement des vidéos soumises:", err);
      }
    };
    if (user && eventId) fetchSubmittedVideos();
  }, [eventId, user?.id, isOwner]);

  const submittedVideosWithUrl = useMemo(() => {
    return (submittedVideos || []).map((v) => ({ ...v, publicUrl: getPublicVideoUrl(v.storage_path) })).filter((v) => Boolean(v.publicUrl));
  }, [submittedVideos]);

  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`event-changes-${eventId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "events", filter: `id=eq.${eventId}` }, (payload) => {
        const updated = payload.new;
        setEvent(updated);
        const isFollowingJob = Boolean(jobIdRef.current);
        if (updated.status === "processing") {
          setProcessing(true);
          setGenerationProgress((p) => (p > 0 ? p : 5));
          setGenerationLabel((l) => (l ? l : "Montage en cours…"));
          if (!hasNotifiedProcessingRef.current) { hasNotifiedProcessingRef.current = true; toast.info("Génération de la vidéo en cours..."); }
        }
        if (!isFollowingJob && updated.status === "done" && updated.final_video_url) {
          if (!acceptDoneOnlyIfNewFinalUrl(updated)) return;
          const baseUrl = extractFinalUrl(updated.final_video_url);
          if (!baseUrl) return;
          if (!hasAppliedDoneStateRef.current) {
            hasAppliedDoneStateRef.current = true;
            setFinalVideo(`${baseUrl}?t=${Date.now()}`);
            setGenerationProgress(100);
            setGenerationLabel("Montage terminé");
            setProcessing(false);
            baselineFinalUrlRef.current = baseUrl;
          }
          if (!hasNotifiedDoneRef.current) { hasNotifiedDoneRef.current = true; toast.success("Vidéo finale générée !"); }
        }
        if (updated.status && ["failed", "canceled", "open", "ready"].includes(updated.status)) {
          if (processingRef.current || jobIdRef.current) stopProcessingUi();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, stopProcessingUi]);

  useEffect(() => {
    if (!jobId || !user?.id) return;
    let cancelled = false;
    const scheduleNext = () => {
      const delay = Math.min(15000, Math.max(1500, pollDelayRef.current));
      pollTimerRef.current = setTimeout(poll, delay);
      pollDelayRef.current = Math.min(15000, Math.round(pollDelayRef.current * 1.5));
    };
    const poll = async () => {
      if (cancelled) return;
      try {
        const job = await videoService.getFinalVideoJob({ jobId, userId: user.id });
        if (cancelled) return;
        setJobStatus(job.status);
        if (typeof job.progress === "number") {
          const safeProgress = Math.max(0, Math.min(100, job.progress));
          if (!hasRealProgressRef.current) { hasRealProgressRef.current = true; stopProgressTimer(); }
          setGenerationProgress((p) => Math.max(p, safeProgress));
        }
        if (job.stage && typeof job.stage === "string") setGenerationLabel(job.stage);
        if (job.status === "done") {
          stopPollTimer(); stopProgressTimer();
          const finalUrl = job.finalVideoUrl || job.final_video_url || job.final_video_url?.videoUrl || null;
          if (finalUrl && typeof finalUrl === "string") {
            const baseUrl = finalUrl.split("?")[0];
            setFinalVideo(`${baseUrl}?t=${Date.now()}`);
            baselineFinalUrlRef.current = baseUrl;
          }
          setGenerationProgress(100); setGenerationLabel("Montage terminé"); setProcessing(false);
          setJobId(null); setJobStatus(null);
          if (!hasNotifiedDoneRef.current) { hasNotifiedDoneRef.current = true; toast.success("Vidéo finale générée !"); }
          return;
        }
        if (job.status === "failed") {
          stopPollTimer(); stopProgressTimer();
          setProcessing(false); setGenerationProgress(0); setGenerationLabel("");
          setJobError(job.error || "Erreur pendant le montage.");
          setError(job.error || "Une erreur s'est produite lors de la génération de la vidéo.");
          toast.error(job.error || "Erreur pendant le montage.");
          setJobId(null); setJobStatus(null);
          return;
        }
        pollDelayRef.current = Math.max(2000, Math.round(pollDelayRef.current * 0.85));
        scheduleNext();
      } catch { scheduleNext(); }
    };
    poll();
    return () => { cancelled = true; stopPollTimer(); };
  }, [jobId, user?.id]);

  const handleDeleteVideo = useCallback(async (videoId) => {
    if (!window.confirm("Supprimer cette vidéo ?")) return;
    try {
      await videoService.deleteVideo(videoId);
      setSubmittedVideos((prev) => prev.filter((v) => v.id !== videoId));
      setSelectedVideoIds((prev) => prev.filter((id) => id !== videoId));
    } catch (err) {
      console.error("Erreur suppression vidéo :", err);
      alert("Erreur lors de la suppression de la vidéo.");
    }
  }, []);

  const toggleSelectVideo = useCallback((videoId) => {
    if (!isOwner) return;
    setSelectedVideoIds((prev) => prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]);
  }, [isOwner]);

  const handleCancelGeneration = useCallback(async () => {
    stopProcessingUi({ toastMessage: "Montage annulé." });
  }, [stopProcessingUi]);

  const publicShareUrl = event?.public_code ? `${window.location.origin}/player/${event.public_code}` : finalVideo || "";
  const capsUnavailable = !caps;
  const canStartProcessing = event && ["ready", "open", "done", "processing"].includes(event.status) && isOwner;
  const overLimit = Number.isFinite(maxSelectableForFinal) && selectedVideoIds.length > maxSelectableForFinal;
  const generateDisabled = processing || Boolean(jobId) || assetUploading;
  const isFirstGeneration = !finalVideo;
  const canStartProcessingNow = Boolean(canStartProcessing && isOwner && !capsUnavailable);

  const buildRequestedOptions = useCallback(() => {
    if (!canUsePremiumEditing) {
      return { transition: "modern_1", transitionDuration: 0.3, watermark: { enabled: true }, music: { mode: "none", volume: 0.6 }, intro: { enabled: true, type: "default" }, outro: { enabled: true, type: "default" } };
    }
    const resolvedMusicMode = musicMode === "none" && (musicFile || assetPaths.music) ? "full" : musicMode;
    const intro = introMode === "text"
      ? { enabled: true, type: "custom_text", text: (introTextRef.current || "").trim() || null }
      : { enabled: true, type: assetPaths.intro ? "custom_image" : "default", storagePath: assetPaths.intro || null };
    const outro = outroMode === "text"
      ? { enabled: true, type: "custom_text", text: (outroTextRef.current || "").trim() || null }
      : { enabled: true, type: assetPaths.outro ? "custom_image" : "default", storagePath: assetPaths.outro || null };
    return { transition: transitionChoice, transitionDuration: Number(transitionDuration || 0.3), watermark: { enabled: Boolean(watermarkEnabled) }, music: { mode: resolvedMusicMode, volume: Number(musicVolume || 0.6), storagePath: assetPaths.music || null }, intro, outro };
  }, [canUsePremiumEditing, transitionChoice, transitionDuration, watermarkEnabled, musicMode, musicVolume, musicFile, assetPaths, introMode, outroMode]);

  const handleGenerateVideo = useCallback(async () => {
    if (!user) return toast.error("Tu dois être connecté.");
    if (!event) return toast.info("Chargement de l'événement… réessaie dans 1 seconde.");
    if (!isOwner) return toast.error("Seul le créateur peut générer la vidéo finale.");
    if (!caps) { setError("Impossible de charger les droits (capabilities)."); return toast.error("Impossible de charger les droits. Recharge la page."); }
    if (!canGenerateFinalVideo) return toast.error("Tu n'as pas le droit de lancer le montage pour cet événement.");
    if (!isFirstGeneration && !canRegenerateFinalVideo) { setError("La régénération est réservée au mode Premium."); return toast.error("Fonction réservée au mode Premium."); }
    if (!Array.isArray(selectedVideoIds) || selectedVideoIds.length < 2) { setError("Sélectionne au moins 2 vidéos pour générer la vidéo finale."); return toast.error("Sélectionne au moins 2 vidéos."); }
    if (Number.isFinite(maxSelectableForFinal) && selectedVideoIds.length > maxSelectableForFinal) { setError(`La sélection est limitée à ${maxSelectableForFinal} vidéos.`); return toast.error(`Maximum ${maxSelectableForFinal} vidéos.`); }
    if (processing || jobId) return;
    try {
      setError(null); setJobError(null); setAssetUploadError(null);
      const currentEventFinal = extractFinalUrl(event?.final_video_url);
      const currentFinalFromState = finalVideo ? finalVideo.split("?")[0] : null;
      baselineFinalUrlRef.current = currentEventFinal || currentFinalFromState || null;
      resetRunGuards();
      abortControllerRef.current = new AbortController();
      setProcessing(true); setGenerationProgress(5); setGenerationLabel("Préparation des vidéos…");
      toast.info("Montage lancé. La vidéo apparaîtra dès qu'elle sera prête.");
      stopProgressTimer();
      progressTimerRef.current = setInterval(() => {
        if (hasRealProgressRef.current) return;
        setGenerationProgress((prev) => {
          if (prev >= 90) return 90;
          const next = prev + 0.5;
          if (next < 30) setGenerationLabel("Préparation des vidéos…");
          else if (next < 60) setGenerationLabel("Montage en cours…");
          else if (next < 90) setGenerationLabel("Finalisation de la vidéo…");
          return next;
        });
      }, 600);
      let requestedOptions = buildRequestedOptions();
      if (canUsePremiumEditing && (musicFile || (introMode === "image" && introFile) || (outroMode === "image" && outroFile))) {
        setAssetUploading(true);
        try {
          if (introMode === "image" && introFile && !assetPaths.intro) {
            const r = await videoService.uploadPremiumAsset(introFile, { userId: user.id, eventId, kind: "intro" });
            setAssetPaths((p) => ({ ...p, intro: r.storagePath }));
            requestedOptions = { ...requestedOptions, intro: { enabled: true, type: "custom_image", storagePath: r.storagePath } };
          }
          if (outroMode === "image" && outroFile && !assetPaths.outro) {
            const r = await videoService.uploadPremiumAsset(outroFile, { userId: user.id, eventId, kind: "outro" });
            setAssetPaths((p) => ({ ...p, outro: r.storagePath }));
            requestedOptions = { ...requestedOptions, outro: { enabled: true, type: "custom_image", storagePath: r.storagePath } };
          }
          if (musicFile && !assetPaths.music) {
            const r = await videoService.uploadPremiumAsset(musicFile, { userId: user.id, eventId, kind: "music" });
            setAssetPaths((p) => ({ ...p, music: r.storagePath }));
            requestedOptions = { ...requestedOptions, music: { ...(requestedOptions.music || {}), storagePath: r.storagePath, mode: requestedOptions.music?.mode || "full" } };
            if (requestedOptions.music?.mode === "none") requestedOptions.music.mode = "full";
          }
        } catch (e) {
          const msg = e?.message || "Erreur upload des assets premium.";
          setAssetUploadError(msg); toast.error(msg); setAssetUploading(false); stopProcessingUi(); return;
        } finally { setAssetUploading(false); }
      }
      const started = await videoService.startFinalVideoJob({ eventId, userId: user.id, selectedVideoIds, options: requestedOptions });
      setJobId(started.jobId); setJobStatus(started.status || "queued");
      try {
        const creatorName = profile?.full_name && profile.full_name !== "User" ? profile.full_name : user?.email || "Un utilisateur";
        await activityService.logActivity({ event_id: eventId, user_id: user.id, type: "started_final_video_job", message: `${creatorName} a lancé le montage de la vidéo finale de l'événement "${event.title}"` });
      } catch {}
    } catch (err) {
      if (err?.name === "AbortError") { stopProcessingUi({ toastMessage: "Montage annulé." }); return; }
      console.error("Error starting async job:", err);
      try {
        const fallbackOptions = buildRequestedOptions();
        const { finalVideoUrl } = await videoService.generateFinalVideo(eventId, selectedVideoIds, fallbackOptions);
        stopProgressTimer();
        const baseUrl = finalVideoUrl.split("?")[0];
        setFinalVideo(`${baseUrl}?t=${Date.now()}`);
        setGenerationProgress(100); setGenerationLabel("Montage terminé"); setProcessing(false);
        baselineFinalUrlRef.current = baseUrl;
        toast.success("Vidéo finale générée !");
      } catch (fallbackErr) {
        stopProcessingUi();
        setError("Une erreur s'est produite lors de la génération de la vidéo.");
        toast.error(fallbackErr?.message || "Erreur lors de la génération.");
      }
    } finally { abortControllerRef.current = null; }
  }, [user, event, isOwner, caps, canGenerateFinalVideo, canRegenerateFinalVideo, isFirstGeneration, selectedVideoIds, maxSelectableForFinal, eventId, profile, processing, jobId, canUsePremiumEditing, buildRequestedOptions, musicFile, introMode, outroMode, introFile, outroFile, assetPaths, stopProcessingUi, finalVideo]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || capLoading) return <Loading fullPage />;

  const showSubmitButtonForParticipant = !isOwner && !capsUnavailable && canUploadVideo && !hasReachedUploadLimit && !latestVideo;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

          {/* ── Header ───────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link to={event ? `/events/${event.id}` : "/dashboard"} className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">
                  ← Retour à l&apos;événement
                </Link>
              </div>
              <h1 className="text-xl font-bold text-gray-900">{event ? event.title : "Vidéo finale"}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {event?.theme && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{event.theme}</span>
                )}
                {jobStatus && (
                  <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                    Job : {jobStatus}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isOwner && !capsUnavailable && latestVideo && (
                <div className="inline-flex items-center px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                  ✓ Vidéo déjà envoyée
                </div>
              )}
              {isOwner && (
                <Link to={`/events/${event.id}/manage-participants`}>
                  <Button type="button" variant="secondary" className="text-sm">Inviter des participants</Button>
                </Link>
              )}
              <Link to="/dashboard">
                <Button type="button" variant="secondary" className="text-sm">Tableau de bord</Button>
              </Link>
            </div>
          </div>

          {/* ── Erreurs ───────────────────────────────────────────── */}
          {(error || capError || jobError) && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error || capError || jobError}</span>
            </div>
          )}

          {/* ── CTA soumettre une vidéo (tout le monde) ──────────── */}
          {!hasReachedUploadLimit && (
            <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 p-6 flex flex-col sm:flex-row items-center gap-5 text-white shadow-lg">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 text-2xl">
                🎥
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-base font-bold">Envoie ta vidéo !</p>
                <p className="text-sm text-indigo-100 mt-0.5">
                  Filme-toi et partage un message pour cet événement.
                </p>
              </div>
              <Link to={`/submit-video/${event.id}`} className="shrink-0">
                <button
                  type="button"
                  className="px-6 py-3 rounded-2xl bg-white text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-colors shadow-sm"
                >
                  Soumettre ma vidéo →
                </button>
              </Link>
            </div>
          )}

          {/* Limite atteinte */}
          {!capsUnavailable && hasReachedUploadLimit && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-center gap-3 text-amber-800">
              <span className="text-xl">⚠️</span>
              <p className="text-sm font-medium">Limite de soumission atteinte pour cet événement.</p>
            </div>
          )}

          {/* ── Vidéo déjà envoyée (participant) ─────────────────── */}
          {!isOwner && !capsUnavailable && latestVideo && (
            <SectionCard icon={<IconFilm />} title="Ma vidéo soumise">
              <p className="text-xs text-gray-500 mb-4">En version gratuite, une seule vidéo par événement. Passe en Premium pour en envoyer plus.</p>
              {latestVideoUrl ? (
                <div className="max-w-xs mx-auto">
                  <div className="aspect-[9/16] rounded-2xl overflow-hidden shadow-md">
                    <video controls className="w-full h-full object-cover" src={latestVideoUrl} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center">Vidéo envoyée (URL indisponible).</p>
              )}
            </SectionCard>
          )}

          {/* ── Vidéos soumises ───────────────────────────────────── */}
          <SubmittedVideosSection
            submittedVideosWithUrl={submittedVideosWithUrl}
            isOwner={isOwner}
            canStartProcessingNow={canStartProcessingNow}
            selectedVideoIds={selectedVideoIds}
            onToggleSelect={toggleSelectVideo}
            onDelete={handleDeleteVideo}
            userId={user?.id}
            maxSelectableForFinal={maxSelectableForFinal}
          />

          {/* ── Empty state ───────────────────────────────────────── */}
          {!finalVideo && submittedVideosWithUrl.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 text-gray-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-500">Aucune vidéo soumise pour le moment</p>
              <p className="text-xs text-gray-400 mt-1">Les vidéos de vos invités apparaîtront ici.</p>
            </div>
          )}

          {/* ── Options de montage (Premium) ──────────────────────── */}
          {isOwner && canStartProcessingNow && (
            <SectionCard
              icon={<IconFilm />}
              title="Options de montage"
              badge={canUsePremiumEditing ? <PremiumBadge /> : null}
            >
              {!canUsePremiumEditing ? (
                <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <IconStar />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900">Options avancées disponibles en Premium</p>
                    <p className="text-xs text-amber-700 mt-0.5">Transitions personnalisées, musique, intro/outro, suppression du watermark…</p>
                  </div>
                  <Link to="/premium">
                    <button type="button" className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors shrink-0">
                      Passer Premium
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Transitions */}
                  <div>
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Transition entre les clips</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {TRANSITIONS.map((t) => {
                        const active = transitionChoice === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTransitionChoice(t.id)}
                            className={[
                              "flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all text-center",
                              active ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
                            ].join(" ")}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? "border-indigo-600 bg-indigo-600" : "border-gray-300"}`}>
                              {active && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <span className={`text-xs font-semibold ${active ? "text-indigo-700" : "text-gray-700"}`}>{t.name}</span>
                            <span className="text-[10px] text-gray-400 leading-tight">{t.detail}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Intro / Outro */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Intro */}
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Intro</p>
                        <div className="flex gap-1">
                          <Chip active={introMode === "image"} onClick={() => setIntroMode("image")}>Image</Chip>
                          <Chip active={introMode === "text"} onClick={() => { setIntroMode("text"); setTimeout(() => introTextAreaRef.current?.focus(), 0); }}>Texte</Chip>
                        </div>
                      </div>
                      {introMode === "image" ? (
                        <FileUploadArea
                          label="Image PNG/JPG/WebP (format portrait recommandé)"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleIntroFileChange}
                          fileName={introFile?.name}
                          uploaded={!!assetPaths.intro}
                          onClear={handleClearIntro}
                          hint="Format 9:16 ou logo centré"
                        />
                      ) : (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Texte d&apos;intro</label>
                          <textarea
                            ref={introTextAreaRef}
                            defaultValue={introTextRef.current}
                            onChange={(e) => { introTextRef.current = e.target.value; }}
                            rows={3}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder='Ex: "Joyeux anniversaire !"'
                          />
                          <p className="mt-1 text-[11px] text-gray-400">Court et lisible, 1–2 lignes.</p>
                        </div>
                      )}
                    </div>

                    {/* Outro */}
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Outro</p>
                        <div className="flex gap-1">
                          <Chip active={outroMode === "image"} onClick={() => setOutroMode("image")}>Image</Chip>
                          <Chip active={outroMode === "text"} onClick={() => { setOutroMode("text"); setTimeout(() => outroTextAreaRef.current?.focus(), 0); }}>Texte</Chip>
                        </div>
                      </div>
                      {outroMode === "image" ? (
                        <FileUploadArea
                          label="Image PNG/JPG/WebP"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleOutroFileChange}
                          fileName={outroFile?.name}
                          uploaded={!!assetPaths.outro}
                          onClear={handleClearOutro}
                          hint="Remerciements, signature, logo…"
                        />
                      ) : (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Texte d&apos;outro</label>
                          <textarea
                            ref={outroTextAreaRef}
                            defaultValue={outroTextRef.current}
                            onChange={(e) => { outroTextRef.current = e.target.value; }}
                            rows={3}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Ex: &quot;Avec amour, de toute l'équipe.&quot;"
                          />
                          <p className="mt-1 text-[11px] text-gray-400">Court et lisible, 1–2 lignes.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Musique */}
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500"><IconMusic /></span>
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Musique de fond</p>
                      </div>
                      <div className="flex gap-1">
                        {MODE_CHIPS.map((m) => (
                          <Chip key={m.value} active={musicMode === m.value} onClick={() => setMusicMode(m.value)}>
                            {m.label}
                          </Chip>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FileUploadArea
                        label="Fichier audio (MP3, M4A, WAV)"
                        accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/wav"
                        onChange={handleMusicFileChange}
                        fileName={musicFile?.name}
                        uploaded={!!assetPaths.music}
                        onClear={handleClearMusic}
                        hint={musicMode === "intro_outro" ? "Jouée sur l'intro et l'outro uniquement" : undefined}
                      />
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Volume</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            step="0.05"
                            min="0.05"
                            max="1"
                            value={musicVolume}
                            onChange={(e) => setMusicVolume(e.target.value)}
                            className="flex-1 accent-indigo-600"
                          />
                          <span className="text-xs font-semibold text-gray-700 w-8 text-right">{Math.round(musicVolume * 100)}%</span>
                        </div>
                        <p className="mt-1.5 text-[11px] text-gray-400">60% recommandé pour ne pas couvrir les voix.</p>
                      </div>
                    </div>
                  </div>

                  {/* Watermark */}
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-gray-500"><IconWatermark /></span>
                      <div>
                        <p className="text-xs font-semibold text-gray-700">Watermark Grega Play</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {canUsePremiumEditing
                            ? "En Premium, tu peux le désactiver pour une vidéo sans logo."
                            : "En version gratuite, le watermark est obligatoire."}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={watermarkEnabled}
                        disabled={!canUsePremiumEditing}
                        onChange={(e) => { if (!canUsePremiumEditing) return; setWatermarkEnabled(e.target.checked); }}
                      />
                      <div className={`w-10 h-6 rounded-full transition-colors ${watermarkEnabled ? "bg-indigo-600" : "bg-gray-300"} ${!canUsePremiumEditing ? "opacity-50" : ""}`}>
                        <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${watermarkEnabled ? "translate-x-5" : "translate-x-1"}`} />
                      </div>
                    </label>
                  </div>

                  {assetUploading && (
                    <div className="flex items-center gap-2 text-xs text-indigo-600 animate-pulse">
                      <span className="inline-block w-3 h-3 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                      Upload des assets en cours…
                    </div>
                  )}
                  {assetUploadError && <p className="text-xs text-red-600">{assetUploadError}</p>}
                </div>
              )}
            </SectionCard>
          )}

          {/* ── Générer le montage ────────────────────────────────── */}
          {isOwner && canStartProcessingNow && (
            <SectionCard
              icon={<IconFilm />}
              title={finalVideo ? "Régénérer le montage" : "Générer le montage final"}
              right={
                <div className={`text-xs font-semibold ${overLimit ? "text-red-600" : selectedVideoIds.length >= 2 ? "text-emerald-600" : "text-gray-400"}`}>
                  {selectedVideoIds.length} vidéo{selectedVideoIds.length > 1 ? "s" : ""} sélectionnée{selectedVideoIds.length > 1 ? "s" : ""}
                </div>
              }
            >
              {!capsUnavailable && !canGenerateFinalVideo ? (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                  Tu n&apos;as pas le droit de lancer le montage pour cet événement.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Alertes */}
                  {overLimit && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                      Trop de vidéos sélectionnées — maximum {maxSelectableForFinal}.
                    </div>
                  )}
                  {selectedVideoIds.length < 2 && !processing && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
                      Sélectionne au moins 2 vidéos dans la liste ci-dessus.
                    </div>
                  )}
                  {finalVideo && !canRegenerateFinalVideo && !capsUnavailable && (
                    <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-600">
                      La régénération est réservée au mode Premium.
                    </div>
                  )}

                  {/* Barre de progression */}
                  {processing && generationProgress > 0 && (
                    <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-indigo-700 font-medium flex items-center gap-1.5">
                          <span className="inline-block w-3 h-3 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                          {generationLabel || "Montage en cours…"}
                        </span>
                        <span className="text-indigo-600 font-bold">{Math.round(generationProgress)}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-indigo-100 rounded-full overflow-hidden">
                        <div
                          className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out"
                          style={{ width: `${generationProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={handleGenerateVideo}
                      loading={processing || assetUploading}
                      disabled={generateDisabled || selectedVideoIds.length < 2 || overLimit}
                      className="text-sm font-semibold px-6 py-2.5"
                    >
                      {processing
                        ? "Génération en cours…"
                        : finalVideo
                        ? "Régénérer avec la sélection"
                        : "🎬 Lancer le montage"}
                    </Button>
                    {(processing || jobId) && (
                      <Button type="button" variant="secondary" onClick={handleCancelGeneration} disabled={assetUploading} className="text-sm">
                        Annuler
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* ── Vidéo finale ──────────────────────────────────────── */}
          {finalVideo && isOwner && (
            <SectionCard
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" /></svg>}
              title="Vidéo finale"
              badge={<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold border border-emerald-200">✓ Prête</span>}
            >
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Player */}
                <div className="flex-1 max-w-xs mx-auto lg:mx-0">
                  <div className="aspect-[9/16] rounded-2xl overflow-hidden shadow-xl">
                    <video controls className="w-full h-full object-cover" src={finalVideo}>
                      Votre navigateur ne prend pas en charge la lecture de vidéos.
                    </video>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-1 flex flex-col gap-4 justify-center">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-1">Partager ou télécharger</p>
                    <p className="text-xs text-gray-500">Ton montage est prêt. Envoie-le à tes invités ou télécharge-le.</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <a
                      href={finalVideo}
                      download={`${(event?.title || "video").replace(/\s+/g, "_")}_final.mp4`}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
                    >
                      <IconDownload /> Télécharger la vidéo
                    </a>

                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Voici notre vidéo finale de l'événement "${event?.title || ""}"\n\n${publicShareUrl}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-semibold transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.535 5.856L.057 23.535a.5.5 0 00.608.608l5.743-1.476A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.956 9.956 0 01-5.085-1.389l-.364-.216-3.768.968.986-3.682-.236-.378A9.972 9.972 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                      </svg>
                      Partager sur WhatsApp
                    </a>
                  </div>

                  {publicShareUrl && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1.5">Lien de partage public</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={publicShareUrl}
                          className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-600 bg-gray-50 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(publicShareUrl); toast.success("Lien copié !"); }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors shrink-0"
                        >
                          <IconCopy /> Copier
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── Message participant quand vidéo finale dispo ──────── */}
          {event?.status === "done" && finalVideo && !isOwner && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-3 text-purple-500">
                <IconFilm />
              </div>
              <p className="text-sm font-semibold text-gray-700">La vidéo finale est disponible</p>
              <p className="text-xs text-gray-500 mt-1">Le créateur de l&apos;événement va bientôt la partager avec vous.</p>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

export default FinalVideoPage;
