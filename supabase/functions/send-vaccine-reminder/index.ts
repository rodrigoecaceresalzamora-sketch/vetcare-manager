// ============================================================
// Vetxora — Edge Function: send-vaccine-reminder
// Gmail SMTP (nodemailer) — Plantilla HTML Premium
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
    const { vaccination_id } = body

    if (!vaccination_id) {
      return new Response(JSON.stringify({ error: 'Falta vaccination_id' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // 1. Obtener datos de la vacuna con mascota y tutor
    const { data: vacc, error: vaccErr } = await supabase
      .from('vaccinations')
      .select('*, patient:patients(name, species, guardian:guardians(name, email))')
      .eq('id', vaccination_id)
      .single()

    if (vaccErr || !vacc) {
      return new Response(JSON.stringify({ error: 'Vacuna no encontrada' }), { status: 404, headers: corsHeaders })
    }

    // 2. Obtener configuración de la clínica (incluyendo textos del email)
    const { data: clinic, error: clinicErr } = await supabase
      .from('clinic_config')
      .select('*')
      .eq('clinic_id', vacc.clinic_id)
      .single()

    if (clinicErr || !clinic) {
      return new Response(JSON.stringify({ error: 'Clínica no encontrada' }), { status: 404, headers: corsHeaders })
    }

    if (!clinic.smtp_email || !clinic.smtp_password) {
      return new Response(JSON.stringify({ error: 'SMTP no configurado. Verifica Gmail y Clave de App.' }), { status: 422, headers: corsHeaders })
    }

    // 3. Datos básicos
    const petName      = vacc.patient?.name || 'tu mascota'
    const guardianName = vacc.patient?.guardian?.name || 'Estimado/a tutor/a'
    const guardianEmail = vacc.patient?.guardian?.email
    const vaccineName  = vacc.vaccine_name || 'vacuna'
    const nextDueDate  = vacc.next_due_date || ''

    if (!guardianEmail) {
      return new Response(JSON.stringify({ error: 'El tutor no tiene email registrado' }), { status: 422, headers: corsHeaders })
    }

    // 4. Formatear fecha legible
    const nextDueFormatted = nextDueDate
      ? new Date(nextDueDate + 'T12:00:00').toLocaleDateString('es-CL', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        })
      : 'Próximamente'

    // 5. Texto del correo: viene de clinic_config o usa fallback
    const replace = (s: string) => s
      .replace(/{tutor}/g, guardianName)
      .replace(/{mascota}/g, petName)
      .replace(/{vacuna}/g, vaccineName)
      .replace(/{fecha}/g, nextDueFormatted)

    const emailSubject = clinic.email_subject_vaccine_reminder
      ? replace(clinic.email_subject_vaccine_reminder)
      : `Recordatorio de Vacunación — ${petName} 💉`

    const emailBodyRaw = clinic.email_body_vaccine_reminder
      ? replace(clinic.email_body_vaccine_reminder)
      : `Estimado/a <strong>${guardianName}</strong>,\n\nEsperamos que tú y <strong>${petName}</strong> se encuentren muy bien.\n\nTe escribimos para recordarte que próximamente corresponde aplicar el refuerzo de la vacuna de tu compañero/a. Cumplir con los plazos de vacunación es fundamental para garantizar que su sistema inmunológico esté totalmente protegido.`

    // 6. Colores y branding de la clínica
    const primaryColor   = clinic.primary_color   || '#fb7185'
    const secondaryColor = clinic.secondary_color || '#fff1f2'

    // 7. Links
    const baseUrl    = Deno.env.get('BASE_URL') || 'https://vetxora.vercel.app'
    const portalUrl  = `${baseUrl}/c/${clinic.slug || clinic.clinic_id}`
    const bookingUrl = `${baseUrl}/reserva/${clinic.slug || clinic.clinic_id}`

    // 8. Google Calendar link (para la fecha de la vacuna)
    let gcalButton = ''
    if (nextDueDate) {
      const gcalDate = nextDueDate.replace(/-/g, '')
      const gcalUrl  = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Vacuna de ${petName} - ${vaccineName}`)}&dates=${gcalDate}/${gcalDate}&details=${encodeURIComponent(`Recordatorio de vacunación para ${petName}. Vacuna: ${vaccineName}`)}&location=${encodeURIComponent(clinic.clinic_name + (clinic.address ? ' - ' + clinic.address : ''))}`
      gcalButton = `<a href="${gcalUrl}" class="btn" style="background:${primaryColor}">📅 Agendar en Google Calendar</a>`
    }

    // 9. Horario de atención
    const scheduleHtml = (() => {
      if (!clinic.schedule) return ''
      const days: Record<string, string> = { '0': 'Domingo', '1': 'Lunes', '2': 'Martes', '3': 'Miércoles', '4': 'Jueves', '5': 'Viernes', '6': 'Sábado' }
      const lines = Object.entries(clinic.schedule as Record<string, string[]>)
        .map(([d, slots]) => `${days[d]}: ${slots[0]} — ${slots[slots.length - 1]}`)
      return lines.join('<br>')
    })()

    // 10. Construir HTML Premium
    const logoHtml = clinic.clinic_logo_url
      ? `<img src="${clinic.clinic_logo_url}" alt="${clinic.clinic_name}" style="width:70px;height:70px;object-fit:contain;border-radius:16px;background:#fff;padding:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);margin:0 auto 12px;display:block;">`
      : `<div style="width:70px;height:70px;background:#ffffff22;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 12px;">🐾</div>`

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: #f0f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; }
    .wrapper { width: 100%; padding: 40px 16px; background-color: #f0f4f8; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 28px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
    .header { background: ${primaryColor}; padding: 36px 24px 28px; text-align: center; }
    .header-name { color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; margin-top: 4px; }
    .header-sub { color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
    .body { padding: 36px 32px; color: #334155; font-size: 15px; line-height: 1.7; }
    .greeting { font-size: 16px; margin-bottom: 16px; }
    .details-card { background: ${secondaryColor}; border: 1px solid ${primaryColor}30; border-radius: 20px; padding: 24px; margin: 28px 0; }
    .details-title { font-size: 11px; font-weight: 800; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; }
    .detail-row { display: flex; align-items: flex-start; margin-bottom: 12px; font-size: 14px; }
    .detail-row:last-child { margin-bottom: 0; }
    .detail-icon { width: 28px; flex-shrink: 0; font-size: 16px; }
    .detail-label { font-weight: 700; color: ${primaryColor}; margin-right: 6px; }
    .detail-value { color: #334155; }
    .divider { height: 1px; background: #e2e8f0; margin: 28px 0; }
    .buttons { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 14px; font-weight: 700; font-size: 14px; text-decoration: none; margin: 6px 8px; color: #ffffff !important; }
    .btn-secondary { background: #f1f5f9 !important; color: ${primaryColor} !important; border: 2px solid ${primaryColor}40; }
    .signature { margin-top: 24px; font-size: 14px; color: #475569; }
    .signature strong { color: ${primaryColor}; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.8; }
    .footer a { color: ${primaryColor}; text-decoration: none; font-weight: 600; }
    @media (max-width: 600px) {
      .wrapper { padding: 0; }
      .card { border-radius: 0; box-shadow: none; }
      .body { padding: 28px 20px; }
      .btn { display: block; margin: 8px 0; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <!-- HEADER -->
      <div class="header">
        ${logoHtml}
        <div class="header-name">${clinic.clinic_name}</div>
        <div class="header-sub">Recordatorio de Vacunación</div>
      </div>

      <!-- BODY -->
      <div class="body">
        <div class="greeting">${emailBodyRaw.replace(/\n/g, '<br>')}</div>

        <!-- CUADRO DE DETALLES -->
        <div class="details-card">
          <div class="details-title">🗓️ Detalles de la cita:</div>
          <div class="detail-row">
            <span class="detail-icon">🐶</span>
            <span class="detail-label">Mascota:</span>
            <span class="detail-value">${petName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-icon">💉</span>
            <span class="detail-label">Vacuna:</span>
            <span class="detail-value">${vaccineName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-icon">📅</span>
            <span class="detail-label">Fecha sugerida:</span>
            <span class="detail-value">${nextDueFormatted}</span>
          </div>
          ${scheduleHtml ? `
          <div class="detail-row">
            <span class="detail-icon">🕐</span>
            <span class="detail-label">Horario de atención:</span>
            <span class="detail-value">${scheduleHtml}</span>
          </div>` : ''}
        </div>

        <!-- TEXTO ADICIONAL -->
        ${clinic.contact_phone ? `<p>Si deseas agendar tu cita o necesitas reprogramar, puedes responder a este correo o escribirnos vía <strong>WhatsApp al ${clinic.contact_phone}</strong>.</p>` : ''}

        <div class="divider"></div>

        <!-- BOTONES -->
        <div class="buttons">
          <a href="${bookingUrl}" class="btn" style="background:${primaryColor}">📅 Agendar Cita de Refuerzo</a>
          ${gcalButton}
          <br>
          <a href="${portalUrl}" class="btn-secondary btn" style="background:#f1f5f9;color:${primaryColor};">🐾 Ver mi Ficha en Línea</a>
        </div>

        <!-- FIRMA -->
        <div class="signature">
          <p>Atentamente,</p>
          <p><strong>${clinic.contact_name || clinic.clinic_name}</strong></p>
          ${clinic.contact_title ? `<p style="color:#64748b;font-size:13px;">${clinic.contact_title}</p>` : ''}
          ${clinic.contact_email ? `<p style="font-size:13px;margin-top:4px;">✉️ <a href="mailto:${clinic.contact_email}" style="color:${primaryColor};text-decoration:none;">${clinic.contact_email}</a>${clinic.contact_phone ? ` &nbsp;|&nbsp; 📱 ${clinic.contact_phone}` : ''}</p>` : ''}
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <strong>${clinic.clinic_name}</strong><br>
        ${clinic.address ? `${clinic.address}<br>` : ''}
        ${clinic.contact_phone ? `Tel: ${clinic.contact_phone} &nbsp;|&nbsp; ` : ''}
        ${clinic.contact_email ? `<a href="mailto:${clinic.contact_email}">${clinic.contact_email}</a>` : ''}<br><br>
        <em>Este es un correo automático generado por Vetxora.<br>Por favor, no respondas directamente a este mensaje.</em>
      </div>
    </div>
  </div>
</body>
</html>`

    // 11. Configurar SMTP y enviar
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: clinic.smtp_email, pass: clinic.smtp_password },
      connectionTimeout: 15000,
    })

    try {
      await transporter.sendMail({
        from: `"${clinic.clinic_name}" <${clinic.smtp_email}>`,
        to: guardianEmail,
        subject: emailSubject,
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

    // 12. Marcar recordatorio como enviado
    await supabase.from('vaccinations').update({ reminder_sent: true }).eq('id', vaccination_id)

    return new Response(JSON.stringify({ success: true, sent_to: guardianEmail }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
