let ffmpeg = null;

export const compressVideo = async (file) => {
  // 📦 Charge FFmpeg dynamiquement uniquement au moment de l'appel
  if (!ffmpeg) {
    const { createFFmpeg, fetchFile } = await import('@ffmpeg/ffmpeg');
    ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();
    compressVideo.fetchFile = fetchFile;
  }

  // 📝 Écrit le fichier vidéo d'entrée
  ffmpeg.FS('writeFile', 'input.mp4', await compressVideo.fetchFile(file));

  // ⚙️ Commande FFmpeg : redimensionner et compresser
  await ffmpeg.run(
    '-i', 'input.mp4',
    '-vf', 'scale=640:-2',
    '-b:v', '800k',
    '-preset', 'ultrafast',
    'output.mp4'
  );

  // 📤 Lis le fichier compressé
  const data = ffmpeg.FS('readFile', 'output.mp4');

  // 🔁 Renvoie un objet `File` compatible pour upload
  return new File([data.buffer], 'compressed.mp4', {
    type: 'video/mp4',
  });
};
