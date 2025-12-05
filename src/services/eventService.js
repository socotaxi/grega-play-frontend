import supabase from '../lib/supabaseClient';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_KEY = import.meta.env.VITE_BACKEND_API_KEY;

const eventService = {
  // ✅ Récupérer un événement par ID (ancienne méthode conservée)
  async getEvent(eventId) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      console.error("Erreur Supabase getEvent:", error);
      throw new Error("Erreur lors du chargement de l'événement");
    }
    return data;
  },

  // ✅ Méthode principale
  async getEventById(eventId) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        theme,
        deadline,
        video_duration,
        max_clip_duration,
        user_id,
        created_at,
        public_code,
        media_url,
        final_video_path
      `)
      .eq('id', eventId)
      .single();

    if (error) {
      console.error("Erreur Supabase getEventById:", error);
      throw new Error("Impossible de charger l'événement");
    }
    return data;
  },

  // ✅ Récupérer les participants d’un event
  async getEventParticipants(eventId) {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('event_id', eventId);

    if (error) {
      console.error("Erreur getEventParticipants:", error);
      throw new Error("Erreur chargement participants");
    }
    return data;
  },

  // ✅ Créer un event
  async createEvent({
    title,
    description,
    theme,
    endDate,
    videoDuration,
    maxClipDuration,
    userId,
    public_code,
    media_url,
    enable_notifications,
    isPublic = false,
  }) {
    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          title,
          description,
          theme,
          deadline: endDate,
          video_duration: videoDuration,
          max_clip_duration: maxClipDuration,
          user_id: userId,
          public_code: public_code,
          media_url: media_url,
          enable_notifications: enable_notifications,
          is_public: isPublic,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Erreur Supabase createEvent:', error);
      throw new Error("Erreur lors de la création");
    }

    return data;
  },

  // ✅ Supprimer un event (via backend Node → suppression en cascade)
  async deleteEvent(eventId, userId) {
    if (!API_BASE_URL || !API_KEY) {
      console.error(
        'Config backend manquante (VITE_BACKEND_URL ou VITE_BACKEND_API_KEY).'
      );
      throw new Error(
        "Configuration backend manquante pour la suppression de l'événement"
      );
    }

    const res = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({ userId }),
    });

    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      // pas grave si pas de JSON dans la réponse
    }

    if (!res.ok) {
      console.error('❌ Erreur API deleteEvent:', data);
      throw new Error(
        data.error || "Erreur lors de la suppression de l'événement"
      );
    }

    return true;
  },

  // ✅ Charger les events du dashboard (via RPC déjà créée en DB)
  async getDashboardEvents(userId, userEmail) {
    const { data, error } = await supabase.rpc('get_user_events', {
      p_user_id: userId,
      p_user_email: userEmail,
    });

    if (error) {
      console.error('Erreur RPC get_user_events:', error);
      throw new Error("Erreur chargement tableau de bord");
    }
    return data;
  },

  // ✅ Récupérer toutes les vidéos d’un event (utile pour FinalVideoPage)
  async getEventVideos(eventId) {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        id,
        event_id,
        user_id,
        storage_path,
        created_at
      `)
      .eq('event_id', eventId);

    if (error) {
      console.error("Erreur getEventVideos:", error);
      throw new Error("Erreur récupération vidéos");
    }
    return data;
  },

  // ✅ Récupérer les stats (invitations / vidéos / en attente) depuis le backend Node
  async getEventStats(eventId) {
    if (!API_BASE_URL || !API_KEY) {
      console.error(
        'Config backend manquante (VITE_BACKEND_URL ou VITE_BACKEND_API_KEY).'
      );
      // On renvoie des valeurs neutres pour ne pas casser l'affichage
      return {
        totalInvitations: 0,
        totalWithVideo: 0,
        totalPending: 0,
      };
    }

    const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('❌ Erreur API getEventStats:', data);
      throw new Error(data.error || 'Erreur récupération stats événement');
    }

    return data;
  },

  // ✅ Mettre à jour la date limite d'un événement
  async updateDeadline(eventId, newDeadline) {
    const { data, error } = await supabase
      .from('events')
      .update({ deadline: newDeadline })
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      console.error('Erreur updateDeadline:', error);
      throw new Error('Impossible de mettre à jour la date limite');
    }

    return data;
  },
};

export default eventService;
