import { compressVideo } from './compressService';
import { toast } from 'react-toastify'; // 🔔 importe le toast

const videoService = {
  async uploadVideo(eventId, participantName, file /* <- 3ᵉ arg */, _unused = null /* <- 4ᵉ arg ignoré */) {
    toast.info("Compression de votre vidéo en cours... 🎬", { autoClose: 4000 });
    
    // ✅ Compression de la vidéo avant envoi
    const compressedFile = await compressVideo(file);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('eventId', eventId);
    formData.append('participantName', participantName);

    const response = await fetch('https://grega-play-backend-production.up.railway.app/api/videos/upload', {
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
