import { compressVideo } from './compressService';
import { toast } from 'react-toastify'; // 🔔 importe le toast

const videoService = {
  async uploadVideo(eventId, participantName, file, ...rest) {
if (typeof compressVideo !== 'function') {
      console.error('❌ compressVideo est introuvable ou pas une fonction');
      throw new Error("Erreur interne : compressVideo() indisponible");
    }

    toast.info("Compression de votre vidéo en cours... 🎬", { autoClose: 4000 });

    // ✅ Compression de la vidéo avant envoi
    const compressedFile = await compressVideo(file);
    
    const formData = new FormData();
    formData.append('file', compressedFile); // ✅ Bon fichier compressé
    formData.append('eventId', eventId);
    formData.append('participantName', participantName);

    const response = await fetch('https://grega-play-backend-production.up.railway.app/api/videos/upload-and-compress', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error("Erreur lors de l'envoi de la vidéo");
    return response.json();
  },

  async generateFinalVideo(eventId) {
    const response = await fetch(`https://grega-play-backend-production.up.railway.app/api/videos/process?eventId=${eventId}`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error("Erreur génération vidéo");
    return response.json();
  },

  async getVideosByEvent(eventId) {
    const response = await fetch(`https://grega-play-backend-production.up.railway.app/api/videos?eventId=${eventId}`);
    if (!response.ok) throw new Error("Erreur chargement vidéos");
    return response.json();
  },

  // 🔽 NOUVELLE FONCTION POUR SUPPRIMER UNE VIDÉO
  // Cette fonction envoie une requête DELETE à ton backend pour supprimer une vidéo par ID
  async deleteVideo(videoId) {
    const response = await fetch(`https://grega-play-backend-production.up.railway.app/api/videos/${videoId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error("Erreur suppression vidéo");
    return response.json();
  }
};

export default videoService;
