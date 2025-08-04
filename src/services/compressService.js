let ffmpeg = null;

export const compressVideo = async (file) => {
  if (!ffmpeg) {
    const { createFFmpeg, fetchFile } = await import('@ffmpeg/ffmpeg');
    ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();
    compressVideo.fetchFile = fetchFile;
  }

  if (!compressVideo.fetchFile) {
    throw new Error("fetchFile est manquant");
  }

  ffmpeg.FS('writeFile', 'input.mp4', await compressVideo.fetchFile(file));

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
