/**
 * Client-side video compression using Canvas + MediaRecorder API.
 * Reduces resolution and bitrate to shrink video file size before upload.
 */

const OUTPUT_MAX_WIDTH = 720;
const OUTPUT_FRAME_RATE = 30;
const VIDEO_BITS_PER_SECOND = 1_500_000; // 1.5 Mbps
const AUDIO_BITS_PER_SECOND = 128_000;   // 128 Kbps

function getSupportedMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
}

/**
 * Compresses a video File using canvas re-encoding.
 * @param {File} file - Original video file
 * @param {{ onProgress?: (pct: number) => void }} options
 * @returns {Promise<File>} Compressed video file
 */
export async function compressVideo(file, { onProgress } = {}) {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('La compression vidéo n\'est pas supportée par ce navigateur.');
  }

  const url = URL.createObjectURL(file);

  try {
    // --- Load video metadata ---
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout lors du chargement de la vidéo')), 15_000);
      video.onloadedmetadata = () => { clearTimeout(timeout); resolve(); };
      video.onerror = () => { clearTimeout(timeout); reject(new Error('Impossible de lire la vidéo')); };
    });

    const { videoWidth, videoHeight, duration } = video;

    // --- Calculate output dimensions (keep aspect ratio) ---
    const scale = Math.min(1, OUTPUT_MAX_WIDTH / videoWidth);
    const outWidth = Math.round(videoWidth * scale);
    const outHeight = Math.round(videoHeight * scale);

    // --- Canvas setup ---
    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d');

    // --- Audio capture (best effort) ---
    let audioTracks = [];
    try {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      // Not connecting to audioCtx.destination — no sound played during compression
      audioTracks = dest.stream.getAudioTracks();
    } catch {
      // Audio capture not available — video will be muted but still compressed
    }

    // --- Build combined stream ---
    const videoStream = canvas.captureStream(OUTPUT_FRAME_RATE);
    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioTracks,
    ]);

    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    });

    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    // --- Frame drawing loop ---
    let animFrameId;
    const drawFrame = () => {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, outWidth, outHeight);
        if (onProgress && duration > 0) {
          onProgress(Math.min(99, Math.round((video.currentTime / duration) * 100)));
        }
      }
      animFrameId = requestAnimationFrame(drawFrame);
    };

    // --- Record ---
    recorder.start(100);
    animFrameId = requestAnimationFrame(drawFrame);

    await new Promise((resolve, reject) => {
      video.onended = () => {
        cancelAnimationFrame(animFrameId);
        recorder.stop();
      };
      recorder.onstop = resolve;
      video.onerror = reject;
      video.play().catch(reject);
    });

    if (onProgress) onProgress(100);

    // --- Build output File ---
    const ext = mimeType.startsWith('video/webm') ? 'webm' : 'mp4';
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const blob = new Blob(chunks, { type: mimeType });

    return new File([blob], `${baseName}_compressed.${ext}`, { type: mimeType });

  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Returns true if the file is large enough to benefit from compression.
 * @param {File} file
 * @param {number} thresholdBytes - default 15 MB
 */
export function shouldCompress(file, thresholdBytes = 15 * 1024 * 1024) {
  return file.size > thresholdBytes;
}
