import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({ log: true });

export const compressVideo = async (file) => {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  // On écrit la vidéo dans le système de fichiers virtuel
  ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));

  // Commande FFmpeg : réduire résolution + bitrate
  await ffmpeg.run(
    '-i', 'input.mp4',
    '-vf', 'scale=640:-2',     // largeur max 640px, hauteur auto
    '-b:v', '800k',            // bitrate vidéo réduit
    '-preset', 'ultrafast',
    'output.mp4'
  );

  // Lecture du fichier compressé
  const data = ffmpeg.FS('readFile', 'output.mp4');

  // Conversion en objet File compatible FormData
  const compressedFile = new File([data.buffer], 'compressed.mp4', {
    type: 'video/mp4',
  });

  return compressedFile;
};
