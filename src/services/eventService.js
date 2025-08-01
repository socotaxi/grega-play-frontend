
import supabase from '../lib/supabaseClient';

const eventService = {
  async getEvent(eventId) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) throw new Error("Erreur lors du chargement de l'événement");
    return data;
  },

  async getEventParticipants(eventId) {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw new Error("Erreur chargement participants");
    return data;
  },

  async createEvent(eventData) {
    const {
      title,
      description,
      theme,
      endDate,
      videoDuration,
      maxClipDuration,
      userId
    } = eventData;

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
          user_id: userId
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Erreur Supabase:', error);
      throw new Error("Erreur lors de la création");
    }

    return data;
  },

  async deleteEvent(eventId, userId) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) throw new Error("Erreur suppression événement");
    return true;
  },

  async getDashboardEvents(userId, userEmail) {
    const { data, error } = await supabase
      .rpc('get_user_events', {
        p_user_id: userId,
        p_user_email: userEmail,
      });

    if (error) {
      console.error('Erreur RPC get_user_events:', error);
      throw new Error("Erreur chargement tableau de bord");
    }
    return data;
  },
};

export default eventService;
