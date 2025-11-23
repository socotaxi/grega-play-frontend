// src/services/dashboardService.js
import supabase from '../lib/supabaseClient';

export async function fetchDashboardStats() {
  const { data, error } = await supabase
    .from('grega_dashboard_stats')
    .select('*')
    .single(); // la vue retourne une seule ligne

  if (error) {
    console.error('Erreur fetchDashboardStats :', error);
    throw error;
  }

  return data;
}
