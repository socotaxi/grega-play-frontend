import supabase from '../lib/supabaseClient';
import emailService from './emailService';

const invitationService = {
  /**
   * Récupère les invitations d'un événement
   */
  async getInvitations(eventId) {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw new Error("Erreur lors de la récupération des invitations");
    return data;
  },

  /**
   * Ajoute et envoie les invitations pour un événement
   */
  async addInvitations(eventId, emails, message = '', event = {}, organizer = {}) {
    if (!eventId || !Array.isArray(emails)) throw new Error("Paramètres invalides");

    const createdAt = new Date().toISOString();
    const invitations = emails.map(email => ({
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

    if (error) throw new Error("Erreur enregistrement invitations : " + error.message);

    // 2. Envoi des mails (un par un)
    const sendResults = await emailService.sendBulkInvitations(
      data.map(inv => ({
        to: inv.email,
        subject: emailService.generateEmailSubject(event.title, organizer.full_name || 'L\'organisateur'),
        html: emailService.generateInvitationEmailTemplate({
          eventTitle: event.title,
          eventDescription: event.description,
          eventTheme: event.theme,
          eventDeadline: event.deadline,
          invitationLink: emailService.createInvitationLink(inv.token),
          organizerName: organizer.full_name || 'L\'organisateur',
          personalMessage: message
        }),
        eventId,
        invitationToken: inv.token
      }))
    );

    return sendResults;
  },

  /**
   * Supprime une invitation
   */
  async removeInvitation(invitationId) {
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId);

    if (error) throw new Error("Erreur suppression invitation");
    return true;
  }
};

export default invitationService;
