import supabase from '../lib/supabaseClient';

const invitationService = {
  /**
   * Récupère UNE invitation à partir d'un token
   * Utilisé par InvitationPage (/invitation/:token)
   */
  async getInvitationByToken(token) {
    if (!token) {
      throw new Error("Token d'invitation manquant");
    }

    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (error) {
      console.error('❌ Erreur getInvitationByToken:', error);
      throw new Error("Erreur lors du chargement de l'invitation");
    }

    return data;
  },

  /**
   * Marque une invitation comme acceptée
   */
  async markInvitationAccepted(token, userId = null) {
    if (!token) {
      throw new Error("Token d'invitation manquant");
    }

    const { data: inv, error: fetchError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (fetchError || !inv) {
      console.error('❌ Erreur markInvitationAccepted (fetch):', fetchError);
      throw new Error("Invitation introuvable");
    }

    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_user_id: userId,
      })
      .eq('id', inv.id);

    if (updateError) {
      console.error('❌ Erreur markInvitationAccepted (update):', updateError);
      throw new Error("Erreur lors de la mise à jour de l'invitation");
    }

    return true;
  },
};

export default invitationService;
