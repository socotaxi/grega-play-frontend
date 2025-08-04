let ffmpeg = null;
let fetchFile = null; // ✅ Variable globale simple

export const compressVideo = async (file) => {
  if (!ffmpeg) {
    const ffmpegModule = await import('@ffmpeg/ffmpeg');
    ffmpeg = ffmpegModule.createFFmpeg({ log: true });
    fetchFile = ffmpegModule.fetchFile;
    await ffmpeg.load();
  }

  if (!ffmpeg || !fetchFile) {
    throw new Error("❌ FFmpeg ou fetchFile non chargé");
  }

  ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));

  await ffmpeg.run(
    '-i', 'input.mp4',
    '-vf', 'scale=640:-2',
    '-b:v', '800k',
    '-preset', 'ultrafast',
    'output.mp4'
  );

  const data = ffmpeg.FS('readFile', 'output.mp4');

  return new File([data.buffer], 'compressed.mp4', {
    type: 'video/mp4',
  });
};
