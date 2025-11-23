// src/services/emailService.js

// URL du backend et clé API (comme videoService / notificationService)
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_KEY = import.meta.env.VITE_BACKEND_API_KEY;

/**
 * Appel générique POST JSON vers le backend email
 */
async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    console.error("❌ Erreur HTTP email:", res.status, text);
    throw new Error("Erreur API email");
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * Email service pour gérer les invitations (frontend)
 * Le backend Node se charge d'envoyer l'email via SMTP Hostinger.
 */
const emailService = {
  /**
   * Génère le HTML de l’email d’invitation
   */
  generateInvitationEmailTemplate(invitationData) {
    const {
      eventTitle,
      eventDescription,
      organizerName,
      invitationLink,
      eventDeadline,
      personalMessage,
      eventTheme,
    } = invitationData;

    const formattedDeadline = new Date(eventDeadline).toLocaleDateString(
      "fr-FR",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

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
                ${eventTheme ? `<p><strong>Thème :</strong> ${eventTheme}</p>` : ""}
                <p><strong>Description :</strong> ${
                  eventDescription || "Partagez vos plus beaux moments en vidéo !"
                }</p>
                <p><strong>Date limite :</strong> ${formattedDeadline}</p>
            </div>
            
            ${
              personalMessage
                ? `
            <div class="personal-message">
                <strong>Message personnel de ${organizerName} :</strong><br>
                "${personalMessage}"
            </div>
            `
                : ""
            }
            
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
   * Envoie 1 email d’invitation via le backend Node
   * (le backend gère SMTP Hostinger)
   */
  async sendInvitationEmail(emailData) {
    const { to, subject, html, eventId, invitationToken } = emailData;

    console.log(`Attempting to send invitation email to ${to}`);

    if (!API_BASE_URL) {
      console.error("VITE_BACKEND_URL non défini – impossible d'envoyer l'email.");
      throw new Error("BACKEND_URL manquant");
    }

    await postJson(`${API_BASE_URL}/api/email/invite`, {
      to,
      subject,
      html,
      eventId,
      invitationToken,
    });

    console.log("Email sent (via backend Node) to:", to);
    return true;
  },

  /**
   * Envoie plusieurs invitations (boucle sur sendInvitationEmail)
   */
  async sendBulkInvitations(invitations) {
    const results = {
      success: [],
      failed: [],
      total: invitations.length,
    };

    for (const invitation of invitations) {
      try {
        await this.sendInvitationEmail(invitation);
        results.success.push(invitation.to);

        // Petit délai pour éviter un éventuel rate limiting SMTP
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to send email to ${invitation.to}:`, error);
        results.failed.push({
          email: invitation.to,
          error: error.message,
        });
      }
    }

    return results;
  },

  /**
   * Crée le lien d’invitation (part de la base URL publique de l’app)
   */
  createInvitationLink(token) {
    const baseUrl =
      import.meta.env.VITE_APP_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "") ||
      "https://grega-play.com";

    return `${baseUrl}/invitation/${token}`;
  },

  /**
   * Génère l’objet de l’email
   */
  generateEmailSubject(eventTitle, organizerName) {
    return `🎬 Invitation: ${eventTitle} - Partagez votre vidéo avec ${organizerName}`;
  },
};

export default emailService;
