
import supabase from '../lib/supabaseClient';

async function logActivity(eventId, type, message) {
  const { data, error } = await supabase
    .from('activity_feed')
    .insert([{ event_id: eventId, type, message }]);

  if (error) {
    console.error('Erreur ajout activité:', error);
    throw error;
  }
  return data;
}

async function getActivityByEvent(eventId) {
  const { data, error } = await supabase
    .from('activity_feed')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur récupération activité:', error);
    throw error;
  }
  return data;
}

export default {
  logActivity,
  getActivityByEvent,
};
