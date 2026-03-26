// src/services/emailService.js

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

const emailService = {
  /**
   * Template HTML pour les emails de contact (reçus par l'admin)
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
    <div style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 35px rgba(15,23,42,0.18);">
      <div style="background:#0f172a;padding:22px 20px;text-align:center;">
        <img src="${logoUrl}" alt="Grega Play" style="width:160px;height:auto;display:block;margin:0 auto 6px auto;" />
        <p style="color:#e2e8f0;font-size:13px;margin:2px 0 0 0;opacity:0.9;">Together, we create the moment</p>
      </div>

      <div style="padding:22px 22px 20px 22px;background:#ffffff;">
        <h1 style="margin:0 0 10px 0;font-size:20px;color:#0f172a;">Nouveau message depuis le formulaire de contact</h1>
        <p style="margin:0 0 14px 0;font-size:14px;color:#4b5563;">
          Tu as reçu un nouveau message envoyé depuis la page <strong>Contact</strong> de Grega Play.
        </p>

        <div style="background:#f9fafb;border-radius:12px;padding:14px 16px;margin:6px 0 16px 0;border-left:4px solid #16a34a;">
          <p style="margin:0 0 6px 0;font-size:13px;color:#111827;"><strong>Infos expéditeur :</strong></p>
          <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;">
            <strong>Nom :</strong> ${safeName}<br/>
            <strong>Email :</strong> ${safeFromEmail}<br/>
            <strong>Reçu le :</strong> ${formattedDate}
          </p>
        </div>

        <div style="background:#eff6ff;border-radius:12px;padding:14px 16px;margin-bottom:18px;">
          <p style="margin:0 0 6px 0;font-size:13px;color:#1e293b;"><strong>Message :</strong></p>
          <p style="margin:0;font-size:13px;color:#111827;line-height:1.7;white-space:pre-wrap;">
            ${safeMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </p>
        </div>

        <p style="margin:0;font-size:12px;color:#6b7280;">
          Tu peux répondre directement à ${safeFromEmail} depuis ta boîte mail.
        </p>
      </div>

      <div style="background:#f8fafc;padding:14px 12px 18px 12px;text-align:center;font-size:11px;color:#94a3b8;">
        Grega Play – L'émotion se construit ensemble<br />
        <span style="display:inline-block;margin-top:3px;">Ce message te parvient suite à une demande via le site gregaplay.com</span>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  },

  /**
   * Envoi du message de contact vers /api/email/contact
   */
  async sendContactMessage(payload) {
    if (!API_BASE_URL) {
      throw new Error("VITE_BACKEND_URL manquant dans .env");
    }
    return postJson(`${API_BASE_URL}/api/email/contact`, payload);
  },
};

export default emailService;
