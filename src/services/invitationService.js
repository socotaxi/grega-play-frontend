import supabase from '../lib/supabaseClient';
import emailService from './emailService';

// 🔹 Vérifie qu'un email a un format valide
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && regex.test(email.trim());
};

const invitationService = {
  /**
   * Récupère les invitations d'un événement
   */
  async getInvitations(eventId) {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('event_id', eventId);

    if (error) {
      console.error('❌ Erreur getInvitations:', error);
      throw new Error("Erreur lors de la récupération des invitations");
    }

    return data;
  },

  /**
   * Ajoute des invitations pour un événement
   * + envoie les emails d'invitation
   *
   * ATTENTION: on garde la signature d'origine
   *   addInvitations(eventId, emails, message = '', event = {}, organizer = {})
   */
  async addInvitations(eventId, emails, message = '', event = {}, organizer = {}) {
    if (!eventId || !Array.isArray(emails)) {
      throw new Error("Paramètres invalides");
    }

    // 🔹 Filtrer les emails invalides
    const validEmails = emails
      .filter((email) => isValidEmail(email))
      .map((email) => email.trim());

    if (!validEmails.length) {
      throw new Error("Aucune adresse email valide fournie");
    }

    if (validEmails.length !== emails.length) {
      console.warn(
        '⚠️ Certains emails ont été ignorés car invalides:',
        emails.filter((e) => !validEmails.includes(e?.trim()))
      );
    }

    const createdAt = new Date().toISOString();
    const invitations = validEmails.map((email) => ({
      event_id: eventId,
      email,
      token: crypto.randomUUID(),
      message,
      created_at: createdAt,
    }));

    // 1. Enregistrement en base
    const { data, error } = await supabase
      .from('invitations')
      .insert(invitations)
      .select();

    if (error) {
      console.error('❌ Erreur enregistrement invitations :', error);
      throw new Error("Erreur enregistrement invitations : " + error.message);
    }

    const organizerName = organizer.full_name || "L'organisateur";
    const eventTitle = event.title || 'Événement Grega Play';
    const eventDescription = event.description || '';

    // 2. Envoi des mails (un par un) via emailService.sendBulkInvitations
    const sendResults = await emailService.sendBulkInvitations(
      data.map((inv) => ({
        to: inv.email,
        subject: emailService.generateEmailSubject(eventTitle, organizerName),
        html: emailService.generateInvitationEmailTemplate({
          eventTitle,
          eventDescription,
          invitationLink: emailService.createInvitationLink(inv.token),
          organizerName,
          personalMessage: message,
        }),
        eventId,
        invitationToken: inv.token,
      }))
    );

    return sendResults;
  },

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

    // data peut être null si le token n'existe pas
    return data;
  },

  /**
   * Marquer une invitation comme acceptée (optionnel)
   * Utile pour le tracking (qui a cliqué sur le lien)
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

  /**
   * Supprime une invitation
   */
  async removeInvitation(invitationId) {
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      console.error('❌ Erreur removeInvitation:', error);
      throw new Error("Erreur suppression invitation");
    }

    return true;
  },
};

export default invitationService;
