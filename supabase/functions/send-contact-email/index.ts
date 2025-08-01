import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import 'https://deno.land/x/dotenv/load.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Méthode non autorisée', { status: 405 })
  }

  try {
    const { name, email, message } = await req.json()

    const content = `
Nom: ${name}
Email: ${email}

Message:
${message}
    `

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: 'contact@grega-play.com' }]
        }],
        from: { email: 'no-reply@grega-play.com', name: 'Grega Play Contact' },
        subject: '📩 Nouveau message via le formulaire de contact',
        content: [{
          type: 'text/plain',
          value: content
        }]
      })
    })

    if (!res.ok) {
      const error = await res.text()
      console.error('Erreur SendGrid:', error)
      return new Response('Erreur lors de l'envoi de l'email', { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Erreur contact:', err)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
