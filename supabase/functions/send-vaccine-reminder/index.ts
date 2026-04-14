// ============================================================
// Vetxora — Edge Function: send-vaccine-reminder
// Gmail SMTP (nodemailer) — Con Debug Detallado
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { vaccination_id, custom_subject, custom_body } = body

    if (!vaccination_id) return new Response(JSON.stringify({ error: 'Falta ID' }), { status: 400, headers: corsHeaders })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: vacc } = await supabase.from('vaccinations').select('*, patient:patients(name, guardian:guardians(name, email))').eq('id', vaccination_id).single()
    const { data: clinic } = await supabase.from('clinic_config').select('*').eq('clinic_id', vacc.clinic_id).single()

    if (!clinic?.smtp_email || !clinic?.smtp_password) {
      return new Response(JSON.stringify({ error: 'No hay Gmail o Clave de App configurada' }), { status: 422, headers: corsHeaders })
    }

    // Configuración robusta para Gmail
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // TLS
      auth: { user: clinic.smtp_email, pass: clinic.smtp_password },
      connectionTimeout: 10000, // 10 seg
    })

    const petName = vacc.patient?.name || 'mascota'
    const guardianEmail = vacc.patient?.guardian?.email
    const guardianName = vacc.patient?.guardian?.name || 'Estimado/a tutor/a'
    const nextDueStr = vacc.next_due_date || ''

    // Generar link de Portal/Reserva
    const baseUrl = 'https://vetxora.vercel.app'
    const portalUrl = `${baseUrl}/c/${clinic.slug || clinic.clinic_id}`
    const bookingUrl = `${baseUrl}/reserva/${clinic.slug || clinic.clinic_id}`

    // Renderizado Premium
    const primaryColor = clinic.primary_color || '#fb7185'
    const secondaryColor = clinic.secondary_color || '#fff1f2'
    const textColor = '#1e293b'

    const renderTemplate = (contentHtml: string, titleStr: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .body-wrap { background-color: #f1f5f9; width: 100%; padding: 40px 0; font-family: 'Segoe UI', Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 32px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
          .header { background: ${primaryColor}; padding: 40px 20px; text-align: center; }
          .logo { width: 80px; height: 80px; background: #fff; border-radius: 20px; padding: 10px; margin: 0 auto 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); object-fit: contain; }
          .content { padding: 40px; color: ${textColor}; line-height: 1.6; }
          .title { font-size: 24px; font-weight: 800; margin-bottom: 20px; color: #0f172a; text-align: center; }
          .details-box { background: ${secondaryColor}; border-radius: 24px; padding: 25px; margin: 30px 0; border: 1px solid ${primaryColor}20; }
          .detail-item { display: flex; align-items: center; margin-bottom: 12px; font-size: 15px; }
          .detail-label { font-weight: bold; color: ${primaryColor}; margin-right: 8px; min-width: 80px; }
          .footer { padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
          .button { display: inline-block; padding: 16px 32px; background: ${primaryColor}; color: #ffffff !important; text-decoration: none; border-radius: 16px; font-weight: bold; font-size: 14px; margin: 20px 0; }
          @media (max-width: 600px) { .content { padding: 25px; } .container { border-radius: 0; } }
        </style>
      </head>
      <body>
        <div class="body-wrap">
          <div class="container">
            <div class="header">
              ${clinic.clinic_logo_url ? `<img src="${clinic.clinic_logo_url}" class="logo">` : '<div class="logo" style="display:flex;align-items:center;justify-content:center;font-size:40px">🐾</div>'}
              <div style="color:#ffffff; font-weight: bold; font-size: 18px; letter-spacing: 1px;">${clinic.clinic_name.toUpperCase()}</div>
            </div>
            <div class="content">
              <div class="title">${titleStr}</div>
              <div style="font-size: 15px;">
                ${contentHtml.replace(/\n/g, '<br>')}
              </div>
              
              <div style="text-align:center; margin-top:20px;">
                <a href="${bookingUrl}" class="button">📅 Agendar Cita de Refuerzo</a>
                <br>
                <a href="${portalUrl}" style="color: ${primaryColor}; font-size: 12px; font-weight: bold; text-decoration: none;">Ver mi Ficha en Línea 🐾</a>
              </div>
            </div>
            <div class="footer">
              <strong>${clinic.clinic_name}</strong><br>
              ${clinic.address || ''}<br>
              Tel: ${clinic.contact_phone} | ${clinic.contact_email}<br><br>
              <em>Este es un correo automático, por favor no respondas directamente.</em>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    const bodyText = custom_body || `Hola ${guardianName}, te recordamos que se acerca el refuerzo de la vacuna ${vacc.vaccine_name} para ${petName}.`
    const detailsBox = `
      <div class="details-box">
        <div style="font-weight: 800; color: #475569; margin-bottom: 15px; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">Detalles Preventivos:</div>
        <div class="detail-item"><span class="detail-label">🐶 Mascota:</span> ${petName}</div>
        <div class="detail-item"><span class="detail-label">💉 Vacuna:</span> ${vacc.vaccine_name}</div>
        <div class="detail-item"><span class="detail-label">📅 Fecha:</span> ${nextDueStr}</div>
      </div>
    `
    const html = renderTemplate(bodyText + detailsBox, custom_subject || 'Recordatorio de Vacuna')

    // Intento de envío
    try {
      await transporter.sendMail({
        from: `"${clinic.clinic_name}" <${clinic.smtp_email}>`,
        to: guardianEmail,
        subject: custom_subject || 'Recordatorio de Vacuna',
        html,
      })
    } catch (mailErr: any) {
      console.error('SMTP Failure:', mailErr)
      return new Response(JSON.stringify({ 
        error: 'Error de Gmail: ' + mailErr.message,
        code: mailErr.code,
        command: mailErr.command 
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await supabase.from('vaccinations').update({ reminder_sent: true }).eq('id', vaccination_id)

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
