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

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Invitation - ${safeEventTitle}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      color: #0f172a;
    }
    .container {
      max-width: 600px;
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
      box-shadow:0 10px 35px rgba(0,0,0,0.12);
    ">
      <!-- HEADER AVEC LOGO -->
      <div style="
        background:#0f172a;
        padding:32px 24px;
        text-align:center;
      ">
        <img
          src="${logoUrl}"
          alt="Grega Play"
          style="width:180px; height:auto; display:block; margin:0 auto 8px auto;"
        />
        <p style="color:#e2e8f0; font-size:14px; margin:4px 0 0 0; opacity:0.85;">
          Together, we create the moment
        </p>
      </div>

      <!-- CONTENU -->
      <div style="padding:28px 24px 24px 24px; background:#ffffff;">
        <p style="margin:0 0 12px 0; font-size:15px; color:#111827;">
          Bonjour,
        </p>

        <p style="margin:0 0 18px 0; font-size:15px; color:#1f2933;">
          <strong>${safeOrganizerName}</strong> vous invite à participer à un
          montage vidéo collaboratif sur <strong>Grega Play</strong>.
        </p>

        <!-- TITRE & ORGANISATEUR -->
        <h1 style="
          margin:0;
          margin-bottom:10px;
          font-size:22px;
          line-height:1.3;
          color:#0f172a;
          text-align:left;
        ">
           Invitation à l’événement&nbsp;: <br />
          <span style="color:#16a34a;">${safeEventTitle}</span>
        </h1>

        ${
          eventTheme
            ? `<p style="margin:4px 0 16px 0; font-size:14px; color:#4b5563;">
                 <strong>Thème :</strong> ${eventTheme}
               </p>`
            : `<p style="margin:4px 0 16px 0; font-size:14px; color:#4b5563;">
                 <strong>Thème :</strong> Partage de moments en vidéo
               </p>`
        }

        <!-- IMAGE DE L'ÉVÉNEMENT -->
        ${
          imageUrl
            ? `
        <div style="text-align:center; margin:22px 0;">
          <img
            src="${imageUrl}"
            alt="Image de l'événement ${safeEventTitle}"
            style="
              width:100%;
              max-width:480px;
              border-radius:14px;
              box-shadow:0 6px 18px rgba(0,0,0,0.15);
              display:block;
              margin:0 auto;
            "
          />
        </div>
        `
            : ""
        }

        <!-- DÉTAILS DE L'ÉVÉNEMENT -->
        <div style="
          background:#f9fafb;
          border-radius:12px;
          padding:16px 18px;
          margin-top:10px;
          margin-bottom:18px;
          border-left:4px solid #16a34a;
        ">
          <p style="margin:0 0 8px 0; font-size:14px; color:#111827;">
            <strong>À propos de l’événement :</strong>
          </p>
          <p style="margin:0; font-size:14px; color:#4b5563; line-height:1.6;">
            ${descriptionPreview}
          </p>
          ${
            formattedDeadline
              ? `
          <p style="margin:12px 0 0 0; font-size:13px; color:#111827;">
            <strong>Date limite pour envoyer votre vidéo :</strong><br />
            <span style="color:#dc2626;">${formattedDeadline}</span>
          </p>
          `
              : ""
          }
        </div>

        <!-- MESSAGE PERSONNEL -->
        ${
          personalMessage
            ? `
        <div style="
          margin-top:10px;
          margin-bottom:20px;
          padding:16px 18px;
          background:#e0f2fe;
          border-radius:10px;
        ">
          <p style="margin:0 0 6px 0; font-size:13px; color:#0f172a;">
            <strong>Message personnel de ${safeOrganizerName} :</strong>
          </p>
          <p style="margin:0; font-size:13px; color:#1f2937; font-style:italic;">
            "${personalMessage}"
          </p>
        </div>
        `
            : ""
        }

        <!-- COMMENT PARTICIPER -->
        <h3 style="
          margin:0;
          margin-bottom:8px;
          font-size:16px;
          color:#0f172a;
        ">
          🎯 Comment participer ?
        </h3>
        <ol style="
          margin:0;
          padding-left:18px;
          margin-bottom:22px;
          font-size:14px;
          color:#4b5563;
          line-height:1.7;
        ">
          <li>Cliquez sur le bouton ci-dessous pour rejoindre l’événement</li>
          <li>Créez votre compte Grega Play ou connectez-vous</li>
          <li>Enregistrez ou téléchargez votre vidéo (max 30&nbsp;secondes)</li>
          <li>Profitez du montage final créé automatiquement </li>
        </ol>

        <!-- BOUTON CTA -->
        <div style="text-align:center; margin:24px 0 18px 0;">
          <a
            href="${invitationLink}"
            style="
              display:inline-block;
              background:linear-gradient(135deg,#16a34a,#059669);
              color:#ffffff;
              text-decoration:none;
              padding:14px 32px;
              border-radius:9999px;
              font-weight:600;
              font-size:15px;
              box-shadow:0 6px 18px rgba(0,0,0,0.20);
            "
            target="_blank"
          >
            Participer à l'événement
          </a>
        </div>

        <!-- LIEN TEXTE -->
        <p style="margin:0 0 8px 0; font-size:12px; color:#6b7280; text-align:center;">
          Si le bouton ne fonctionne pas, copiez/collez ce lien dans votre navigateur :<br />
          <a href="${invitationLink}" style="color:#16a34a;" target="_blank">
            ${invitationLink}
          </a>
        </p>

        <!-- NOTE -->
        <p style="margin:12px 0 0 0; font-size:11px; color:#9ca3af; text-align:center;">
          Cette invitation est personnelle. Si vous ne souhaitez pas participer,
          vous pouvez simplement ignorer ce message.
        </p>
      </div>

      <!-- FOOTER -->
      <div style="
        background:#f8fafc;
        padding:16px 12px 20px 12px;
        text-align:center;
        font-size:11px;
        color:#94a3b8;
      ">
        Grega Play – L’émotion se construit ensemble<br />
        <span style="display:inline-block; margin-top:4px;">
          Invitation envoyée par ${safeOrganizerName}
        </span><br />
        <span style="display:inline-block; margin-top:2px; color:#cbd5f5;">
          Version template: FRONT-PREMIUM-v2
        </span>
      </div>
    </div>
  </div>
</body>
</html>
    `;
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
