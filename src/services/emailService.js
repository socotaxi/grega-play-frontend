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
 * Le backend Node se charge d'envoyer l'email via SMTP (SendGrid).
 */
const emailService = {
  /**
   * Génère le HTML de l’email d’invitation (version premium)
   */
  generateInvitationEmailTemplate(invitationData) {
    const {
      eventTitle,
      eventDescription,
      organizerName, // principal
      invitationLink,
      eventDeadline,
      personalMessage,
      eventTheme,
      eventImageUrl, // principal image
      eventThumbnailUrl, // alternatif image
    } = invitationData;

    // 🔹 Organisateur : on essaie plusieurs champs possibles
    const safeOrganizerName =
      organizerName ||
      invitationData.organizer_full_name ||
      invitationData.ownerName ||
      invitationData.owner_full_name ||
      invitationData.hostName ||
      "L'organisateur";

    const safeEventTitle = eventTitle || "Événement Grega Play";

    // 🔹 Image : on essaie plusieurs champs possibles
    const imageUrl =
      eventImageUrl ||
      eventThumbnailUrl ||
      invitationData.event_media_url ||
      invitationData.media_url ||
      invitationData.cover_url ||
      null;

    // Gestion propre de la date (évite "Invalid Date")
    let formattedDeadline = "";
    if (eventDeadline) {
      const d = new Date(eventDeadline);
      if (!isNaN(d.getTime())) {
        formattedDeadline = d.toLocaleDateString("fr-FR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    }

    // Extrait de description
    const baseDescription =
      eventDescription || "Partagez vos plus beaux moments en vidéo !";
    const descriptionPreview =
      baseDescription.length > 320
        ? baseDescription.slice(0, 320) + "..."
        : baseDescription;

    const logoUrl =
      "https://cgqnrqbyvetcgwolkjvl.supabase.co/storage/v1/object/public/gregaplay-assets/logo.png";

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Invitation Grega Play</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:’Segoe UI’,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6c47ff 0%,#a855f7 100%);padding:40px 48px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Grega Play</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Together, we create the moment</p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:40px 48px 0;">
              <p style="margin:0 0 8px;color:#999;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Vous avez une invitation</p>
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;font-weight:700;line-height:1.3;">
                ${safeOrganizerName} vous invite à participer à un événement vidéo collaboratif
              </h2>
              <p style="margin:0;color:#666;font-size:15px;line-height:1.7;">
                Rejoignez l’événement, partagez vos moments en vidéo et découvrez le montage final créé automatiquement par Grega Play.
              </p>
            </td>
          </tr>

          <!-- Event Card -->
          <tr>
            <td style="padding:32px 48px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5ff;border:1px solid #e4dcff;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="background:#6c47ff;width:5px;padding:0;">&nbsp;</td>
                  <td style="padding:24px 24px 20px;">

                    <p style="margin:0 0 4px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Événement</p>
                    <h3 style="margin:0 0 16px;color:#1a1a2e;font-size:18px;font-weight:700;">${safeEventTitle}</h3>

                    ${eventTheme ? `
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:0 12px 0 0;vertical-align:top;">
                          <span style="display:inline-block;background:#ede9ff;color:#6c47ff;font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;">${eventTheme}</span>
                        </td>
                      </tr>
                    </table>
                    <hr style="border:none;border-top:1px solid #e4dcff;margin:16px 0;"/>
                    ` : ""}

                    ${imageUrl ? `
                    <div style="margin-bottom:16px;">
                      <img src="${imageUrl}" alt="${safeEventTitle}" style="width:100%;border-radius:8px;display:block;"/>
                    </div>
                    ` : ""}

                    <p style="margin:0;color:#555;font-size:14px;line-height:1.7;">${descriptionPreview}</p>

                    ${formattedDeadline ? `
                    <p style="margin:12px 0 0;font-size:13px;color:#6c47ff;font-weight:600;">
                      Date limite : ${formattedDeadline}
                    </p>
                    ` : ""}

                    ${personalMessage ? `
                    <div style="margin-top:16px;padding:14px 16px;background:#ffffff;border-left:3px solid #a855f7;border-radius:6px;">
                      <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
                        <strong>Message de ${safeOrganizerName} :</strong><br/>
                        <em>${personalMessage}</em>
                      </p>
                    </div>
                    ` : ""}

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Steps -->
          <tr>
            <td style="padding:32px 48px 0;">
              <p style="margin:0 0 20px;color:#1a1a2e;font-size:15px;font-weight:700;">Comment participer ?</p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 0 16px;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="width:36px;vertical-align:top;"><span style="display:inline-block;width:28px;height:28px;background:#6c47ff;color:#fff;font-size:13px;font-weight:700;border-radius:50%;text-align:center;line-height:28px;">1</span></td>
                      <td style="padding-left:12px;vertical-align:middle;"><p style="margin:0;color:#444;font-size:14px;line-height:1.5;">Cliquez sur le bouton ci-dessous pour rejoindre l’événement</p></td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 16px;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="width:36px;vertical-align:top;"><span style="display:inline-block;width:28px;height:28px;background:#6c47ff;color:#fff;font-size:13px;font-weight:700;border-radius:50%;text-align:center;line-height:28px;">2</span></td>
                      <td style="padding-left:12px;vertical-align:middle;"><p style="margin:0;color:#444;font-size:14px;line-height:1.5;">Créez votre compte Grega Play ou connectez-vous</p></td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 16px;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="width:36px;vertical-align:top;"><span style="display:inline-block;width:28px;height:28px;background:#6c47ff;color:#fff;font-size:13px;font-weight:700;border-radius:50%;text-align:center;line-height:28px;">3</span></td>
                      <td style="padding-left:12px;vertical-align:middle;"><p style="margin:0;color:#444;font-size:14px;line-height:1.5;">Enregistrez ou téléchargez votre vidéo <span style="color:#6c47ff;font-weight:600;">(max 30 secondes)</span></p></td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="width:36px;vertical-align:top;"><span style="display:inline-block;width:28px;height:28px;background:#a855f7;color:#fff;font-size:13px;font-weight:700;border-radius:50%;text-align:center;line-height:28px;">✓</span></td>
                      <td style="padding-left:12px;vertical-align:middle;"><p style="margin:0;color:#444;font-size:14px;line-height:1.5;">Profitez du montage final créé <strong>automatiquement</strong> 🎬</p></td>
                    </tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:36px 48px 0;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:linear-gradient(135deg,#6c47ff 0%,#a855f7 100%);border-radius:8px;">
                    <a href="${invitationLink}" style="display:inline-block;padding:16px 44px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.2px;" target="_blank">
                      Participer à l’événement →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:36px 48px 0;">
              <hr style="border:none;border-top:1px solid #ebebf0;margin:0;"/>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:20px 48px 0;">
              <p style="margin:0 0 6px;color:#aaa;font-size:12px;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
              <p style="margin:0;word-break:break-all;">
                <a href="${invitationLink}" style="color:#6c47ff;font-size:12px;text-decoration:none;">${invitationLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9fb;padding:24px 48px;text-align:center;border-top:1px solid #ebebf0;margin-top:24px;">
              <p style="margin:0;color:#aaa;font-size:12px;line-height:1.7;">
                Vous recevez cet email car vous avez été invité(e) à rejoindre un événement sur <strong>Grega Play</strong>.<br/>
                Si vous n’attendiez pas cette invitation, vous pouvez ignorer cet email.
              </p>
              <p style="margin:12px 0 0;color:#ccc;font-size:11px;">© 2026 Grega Play — Tous droits réservés</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
  },

  /**
   * Envoie 1 email d’invitation via le backend Node
   */
  async sendInvitationEmail(emailData) {
    const { to, subject, html, eventId, invitationToken } = emailData;

    console.log(`Attempting to send invitation email to ${to}`);

    if (!API_BASE_URL) {
      console.error(
        "VITE_BACKEND_URL non défini – impossible d'envoyer l'email."
      );
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
   * Template HTML dédié pour les emails de contact
   */
  generateContactEmailTemplate({ name, fromEmail, message, submittedAt }) {
    const safeName = name || "Invité Grega Play";
    const safeFromEmail = fromEmail || "non communiqué";
    const safeMessage =
      (message && message.trim()) ||
      "Aucun message détaillé n'a été fourni.";
    const formattedDate =
      submittedAt ||
      new Date().toLocaleString("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

    const logoUrl =
      "https://cgqnrqbyvetcgwolkjvl.supabase.co/storage/v1/object/public/gregaplay-assets/logo.png";

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Nouveau message de contact - Grega Play</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      color: #0f172a;
    }
    .container {
      max-width: 640px;
      margin: 0 auto;
      padding: 24px 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div style="
      background:#ffffff;
      border-radius:18px;
      overflow:hidden;
      box-shadow:0 10px 35px rgba(15,23,42,0.18);
    ">
      <!-- HEADER -->
      <div style="
        background:#0f172a;
        padding:22px 20px;
        text-align:center;
      ">
        <img
          src="${logoUrl}"
          alt="Grega Play"
          style="width:160px; height:auto; display:block; margin:0 auto 6px auto;"
        />
        <p style="color:#e2e8f0; font-size:13px; margin:2px 0 0 0; opacity:0.9;">
          Together, we create the moment
        </p>
      </div>

      <!-- CONTENU PRINCIPAL -->
      <div style="padding:22px 22px 20px 22px; background:#ffffff;">
        <h1 style="
          margin:0 0 10px 0;
          font-size:20px;
          color:#0f172a;
        ">
          Nouveau message depuis le formulaire de contact
        </h1>

        <p style="margin:0 0 14px 0; font-size:14px; color:#4b5563;">
          Tu as reçu un nouveau message envoyé depuis la page <strong>Contact</strong> de Grega Play.
        </p>

        <!-- BLOC INFOS EXPÉDITEUR -->
        <div style="
          background:#f9fafb;
          border-radius:12px;
          padding:14px 16px;
          margin:6px 0 16px 0;
          border-left:4px solid #16a34a;
        ">
          <p style="margin:0 0 6px 0; font-size:13px; color:#111827;">
            <strong>Infos expéditeur :</strong>
          </p>
          <p style="margin:0; font-size:13px; color:#4b5563; line-height:1.6;">
            <strong>Nom :</strong> ${safeName}<br/>
            <strong>Email :</strong> ${safeFromEmail}<br/>
            <strong>Reçu le :</strong> ${formattedDate}
          </p>
        </div>

        <!-- MESSAGE -->
        <div style="
          background:#eff6ff;
          border-radius:12px;
          padding:14px 16px;
          margin-bottom:18px;
        ">
          <p style="margin:0 0 6px 0; font-size:13px; color:#1e293b;">
            <strong>Message :</strong>
          </p>
          <p style="
            margin:0;
            font-size:13px;
            color:#111827;
            line-height:1.7;
            white-space:pre-wrap;
          ">
            ${safeMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </p>
        </div>

        <p style="margin:0; font-size:12px; color:#6b7280;">
          Tu peux répondre directement à ${safeFromEmail} depuis ta boîte mail
          pour continuer la discussion.
        </p>
      </div>

      <!-- FOOTER -->
      <div style="
        background:#f8fafc;
        padding:14px 12px 18px 12px;
        text-align:center;
        font-size:11px;
        color:#94a3b8;
      ">
        Grega Play – L’émotion se construit ensemble<br />
        <span style="display:inline-block; margin-top:3px;">
          Ce message te parvient suite à une demande via le site gregaplay.com
        </span>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  },

  /**
   * Génère l’objet de l’email (invitations)
   */
  generateEmailSubject(eventTitle, organizerName) {
    return ` Invitation: ${eventTitle} - Partagez votre vidéo avec ${organizerName}`;
  },

  /**
   * Envoie des invitations simplifiées (lien public, sans token ni enregistrement BDD)
   */
  async sendSimpleInvitations(emails, event, organizer) {
    const appBaseUrl =
      import.meta.env.VITE_APP_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const publicLink = `${appBaseUrl}/e/${event.public_code}`;
    const organizerName = organizer?.full_name || "L’organisateur";
    const subject = this.generateEmailSubject(event.title || "un événement", organizerName);
    const html = this.generateInvitationEmailTemplate({
      eventTitle: event.title,
      eventDescription: event.description,
      organizerName,
      invitationLink: publicLink,
      eventDeadline: event.deadline,
      eventTheme: event.theme,
      eventImageUrl: event.media_url || event.cover_url,
    });

    const results = { success: [], failed: [] };
    for (const email of emails) {
      try {
        await this.sendInvitationEmail({ to: email, subject, html, eventId: event.id });
        results.success.push(email);
        await new Promise((r) => setTimeout(r, 100));
      } catch (e) {
        results.failed.push({ email, error: e.message });
      }
    }
    return results;
  },

  /**
   * Envoi du message de contact vers /api/email/contact
   */
  async sendContactMessage(payload) {
    if (!API_BASE_URL) {
      console.error(
        "VITE_BACKEND_URL non défini – impossible d'envoyer le message de contact."
      );
      throw new Error("BACKEND_URL manquant");
    }

    // payload attendu :
    // { email, subject, content, website, formCreatedAt }
    return postJson(`${API_BASE_URL}/api/email/contact`, payload);
  },
};

export default emailService;
