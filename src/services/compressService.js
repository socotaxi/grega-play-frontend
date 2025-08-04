let ffmpegInstance = null;

export const compressVideo = async (file) => {
  if (!ffmpegInstance) {
    // Import dynamique ESM compatible Vite
    const ffmpegModule = await import('@ffmpeg/ffmpeg');
    const createFFmpeg = ffmpegModule?.createFFmpeg || ffmpegModule?.default?.createFFmpeg;
    const fetchFile = ffmpegModule?.fetchFile || ffmpegModule?.default?.fetchFile;

    if (typeof createFFmpeg !== 'function') {
      throw new Error('❌ createFFmpeg() non disponible (import cassé)');
    }

    ffmpegInstance = createFFmpeg({ log: true });
    await ffmpegInstance.load();
    compressVideo.fetchFile = fetchFile;
  }

  if (!compressVideo.fetchFile || !ffmpegInstance) {
    throw new Error('❌ FFmpeg non chargé correctement');
  }

  ffmpegInstance.FS('writeFile', 'input.mp4', await compressVideo.fetchFile(file));

  await ffmpegInstance.run(
    '-i', 'input.mp4',
    '-vf', 'scale=640:-2',
    '-b:v', '800k',
    '-preset', 'ultrafast',
    'output.mp4'
  );

  const data = ffmpegInstance.FS('readFile', 'output.mp4');

  return new File([data.buffer], 'compressed.mp4', {
    type: 'video/mp4',
  });
};
