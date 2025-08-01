import supabase from '../lib/supabaseClient';

/**
 * Email service for sending invitation emails
 * Uses Supabase Edge Functions or external email service
 */
const emailService = {
  /**
   * Generate HTML email template for event invitation
   * @param {Object} invitationData - Invitation details
   * @returns {string} HTML email template
   */
  generateInvitationEmailTemplate(invitationData) {
    const {
      eventTitle,
      eventDescription,
      organizerName,
      invitationLink,
      eventDeadline,
      personalMessage,
      eventTheme
    } = invitationData;

    const formattedDeadline = new Date(eventDeadline).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation - ${eventTitle}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { padding: 20px; }
        .event-details { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .invitation-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
        .personal-message { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; font-style: italic; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 Grega Play</h1>
            <h2>Vous êtes invité(e) à participer !</h2>
        </div>
        
        <div class="content">
            <p>Bonjour,</p>
            
            <p><strong>${organizerName}</strong> vous invite à participer à un événement vidéo collaboratif :</p>
            
            <div class="event-details">
                <h3>📽️ ${eventTitle}</h3>
                ${eventTheme ? `<p><strong>Thème :</strong> ${eventTheme}</p>` : ''}
                <p><strong>Description :</strong> ${eventDescription || 'Partagez vos plus beaux moments en vidéo !'}</p>
                <p><strong>Date limite :</strong> ${formattedDeadline}</p>
            </div>
            
            ${personalMessage ? `
            <div class="personal-message">
                <strong>Message personnel de ${organizerName} :</strong><br>
                "${personalMessage}"
            </div>
            ` : ''}
            
            <h3>🎯 Comment participer ?</h3>
            <ol>
                <li>Cliquez sur le bouton ci-dessous pour accepter l'invitation</li>
                <li>Créez votre compte Grega Play (si vous n'en avez pas déjà un)</li>
                <li>Téléchargez votre vidéo avant la date limite</li>
                <li>Regardez le montage final créé automatiquement !</li>
            </ol>
            
            <div style="text-align: center;">
                <a href="${invitationLink}" class="invitation-button">
                    🎬 Participer à l'événement
                </a>
            </div>
            
            <p><small><strong>Note :</strong> Cette invitation est personnelle et expire dans 30 jours. Si vous ne souhaitez pas participer, vous pouvez simplement ignorer ce message.</small></p>
        </div>
        
        <div class="footer">
            <p>Grega Play - La plateforme de montage vidéo collaboratif</p>
            <p>Cette invitation a été envoyée par ${organizerName}</p>
        </div>
    </div>
</body>
</html>
    `;
  },

  /**
   * Send invitation email using Supabase Edge Function
   * @param {Object} emailData - Email sending data
   * @returns {Promise<boolean>} Success status
   */
  async sendInvitationEmail(emailData) {
    try {
      const { to, subject, html, eventId, invitationToken } = emailData;

      console.log(`Attempting to send invitation email to ${to}`);

      // Try to use Supabase Edge Function for email sending
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          email: to,
          subject,
          content: html
        }
      });

      if (error) {
        console.warn('Supabase Edge Function email failed, trying alternative method:', error);
        
        // Fallback: Store email in database for manual processing or batch sending
        const { error: dbError } = await supabase
          .from('email_queue')
          .insert({
            to_email: to,
            subject,
            html_content: html,
            event_id: eventId,
            invitation_token: invitationToken,
            status: 'pending',
            created_at: new Date().toISOString()
          });

        if (dbError) {
          console.error('Failed to queue email:', dbError);
          throw new Error('Failed to send invitation email');
        }

        console.log('Email queued for batch processing');
        return true;
      }

      console.log('Email sent successfully:', data);
      return true;
    } catch (error) {
      console.error('Error sending invitation email:', error);
      throw error;
    }
  },

  /**
   * Send multiple invitation emails
   * @param {Array} invitations - Array of invitation data
   * @returns {Promise<Object>} Results summary
   */
  async sendBulkInvitations(invitations) {
    const results = {
      success: [],
      failed: [],
      total: invitations.length
    };

    for (const invitation of invitations) {
      try {
        await this.sendInvitationEmail(invitation);
        results.success.push(invitation.to);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to send email to ${invitation.to}:`, error);
        results.failed.push({
          email: invitation.to,
          error: error.message
        });
      }
    }

    return results;
  },

  /**
   * Create invitation link
   * @param {string} token - Invitation token
   * @returns {string} Full invitation URL
   */
  createInvitationLink(token) {
    const baseUrl =
      import.meta.env.VITE_APP_BASE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '') ||
      'https://grega-play.com';
    return `${baseUrl}/invitation/${token}`;
  },

  /**
   * Generate email subject line
   * @param {string} eventTitle - Event title
   * @param {string} organizerName - Organizer name
   * @returns {string} Email subject
   */
  generateEmailSubject(eventTitle, organizerName) {
    return `🎬 Invitation: ${eventTitle} - Partagez votre vidéo avec ${organizerName}`;
  }
};

export default emailService;