// ============================================================
// Vetxora — Edge Function: confirm-booking
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
    const { appointment_id, type = 'booking' } = body

    if (!appointment_id) {
      return new Response(JSON.stringify({ error: 'Falta appointment_id' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // 1. Obtener datos de la cita
    const { data: apt, error: aptErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointment_id)
      .single()

    if (aptErr || !apt) {
      return new Response(JSON.stringify({ error: 'Cita no encontrada' }), { status: 404, headers: corsHeaders })
    }

    // 2. Obtener config de la clínica
    const { data: clinic, error: clinicErr } = await supabase
      .from('clinic_config')
      .select('*')
      .eq('clinic_id', apt.clinic_id)
      .single()

    if (clinicErr || !clinic) {
      return new Response(JSON.stringify({ error: 'Clínica no encontrada' }), { status: 404, headers: corsHeaders })
    }

    if (!clinic.smtp_email || !clinic.smtp_password) {
      return new Response(JSON.stringify({ error: 'SMTP no configurado. Verifica Gmail y Clave de App.' }), { status: 422, headers: corsHeaders })
    }

    // 3. Datos básicos
    const petName      = apt.pet_name      || 'tu mascota'
    const guardianName = apt.guardian_name || 'Estimado/a tutor/a'
    const guardianEmail = apt.guardian_email

    if (!guardianEmail) {
      return new Response(JSON.stringify({ error: 'La cita no tiene email registrado' }), { status: 422, headers: corsHeaders })
    }

    // 4. Formatear fechas
    const dateObj = new Date(apt.scheduled_at)
    const formattedDate = dateObj.toLocaleDateString('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    const formattedTime = dateObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })

    // 5. Colores y branding de la clínica
    const primaryColor   = clinic.primary_color   || '#fb7185'
    const secondaryColor = clinic.secondary_color || '#fff1f2'

    // 6. Links
    const baseUrl    = Deno.env.get('BASE_URL') || 'https://vetxora.vercel.app'
    const portalUrl  = `${baseUrl}/c/${clinic.slug || clinic.clinic_id}`

    // 7. Reemplazos de variables en plantillas
    const replace = (s: string) => s
      .replace(/{tutor}/g,    guardianName)
      .replace(/{mascota}/g,  petName)
      .replace(/{servicio}/g, apt.service || 'Consulta')
      .replace(/{fecha}/g,    formattedDate)
      .replace(/{hora}/g,     formattedTime)

    // 8. Determinar tipo de correo
    type EmailType = 'booking' | 'confirmation' | 'cancellation' | 'rescheduled' | 'reminder'
    const emailType = type as EmailType

    const typeConfig: Record<EmailType, {
      subjectField: string,    bodyField: string,
      defaultSubject: string,  defaultBody: string,
      headerLabel: string,     emoji: string,
      accentColor: string,     showCalendar: boolean
    }> = {
      booking: {
        subjectField:   'email_subject_booking',
        bodyField:      'email_body_booking',
        defaultSubject: `Solicitud Recibida para ${petName} 📅`,
        defaultBody:    `Hola <strong>${guardianName}</strong>, hemos recibido tu solicitud de cita para <strong>${petName}</strong>.\n\nQuedará como <strong>pendiente</strong> hasta ser confirmada por la veterinaria. Te avisaremos cuando esté lista.`,
        headerLabel:    'Solicitud de Cita',
        emoji:          '📅',
        accentColor:    primaryColor,
        showCalendar:   false,
      },
      confirmation: {
        subjectField:   'email_subject_confirmed',
        bodyField:      'email_body_confirmed',
        defaultSubject: `¡Cita Confirmada para ${petName}! ✅`,
        defaultBody:    `Hola <strong>${guardianName}</strong>, te confirmamos que la cita de <strong>${petName}</strong> para el día <strong>${formattedDate}</strong> a las <strong>${formattedTime}</strong> ha sido confirmada.\n\n¡Te esperamos!`,
        headerLabel:    'Cita Confirmada',
        emoji:          '✅',
        accentColor:    '#16a34a',
        showCalendar:   true,
      },
      cancellation: {
        subjectField:   'email_subject_cancellation',
        bodyField:      'email_body_cancellation',
        defaultSubject: `Cita Cancelada para ${petName} ❌`,
        defaultBody:    `Hola <strong>${guardianName}</strong>, lamentamos informarte que la cita de <strong>${petName}</strong> del día <strong>${formattedDate}</strong> a las <strong>${formattedTime}</strong> ha sido cancelada.\n\nSi tienes alguna consulta, contáctanos.`,
        headerLabel:    'Cita Cancelada',
        emoji:          '❌',
        accentColor:    '#dc2626',
        showCalendar:   false,
      },
      rescheduled: {
        subjectField:   'email_subject_rescheduled',
        bodyField:      'email_body_rescheduled',
        defaultSubject: `Cita Reprogramada para ${petName} 🔄`,
        defaultBody:    `Hola <strong>${guardianName}</strong>, te informamos que la cita de <strong>${petName}</strong> ha sido movida al día <strong>${formattedDate}</strong> a las <strong>${formattedTime}</strong>.`,
        headerLabel:    'Cita Reprogramada',
        emoji:          '🔄',
        accentColor:    '#d97706',
        showCalendar:   true,
      },
      reminder: {
        subjectField:   'email_subject_reminder_appointment',
        bodyField:      'email_body_reminder_appointment',
        defaultSubject: `Recordatorio de Cita para ${petName} ⏰`,
        defaultBody:    `Hola <strong>${guardianName}</strong>, te recordamos tu próxima cita de <strong>${petName}</strong> para el día <strong>${formattedDate}</strong> a las <strong>${formattedTime}</strong>.\n\n¡No olvides!`,
        headerLabel:    'Recordatorio de Cita',
        emoji:          '⏰',
        accentColor:    '#4f46e5',
        showCalendar:   true,
      },
    }

    const cfg = typeConfig[emailType] || typeConfig.booking
    const subjectRaw = (clinic as any)[cfg.subjectField] || cfg.defaultSubject
    const bodyRaw    = (clinic as any)[cfg.bodyField]    || cfg.defaultBody

    const emailSubject = replace(subjectRaw)
    const emailBody    = replace(bodyRaw)
    const accentColor  = cfg.accentColor

    // 9. Google Calendar button
    let gcalButton = ''
    if (cfg.showCalendar) {
      const gcalStart = dateObj.toISOString().replace(/-|:|\.\d+/g, '')
      const gcalEnd   = new Date(dateObj.getTime() + (apt.duration_minutes || 30) * 60 * 1000).toISOString().replace(/-|:|\.\d+/g, '')
      const gcalUrl   = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(emailSubject)}&dates=${gcalStart}/${gcalEnd}&details=${encodeURIComponent(`Cita de ${petName} — ${apt.service || 'Consulta'}`)}&location=${encodeURIComponent(clinic.clinic_name + (clinic.address ? ' - ' + clinic.address : ''))}`
      gcalButton = `<a href="${gcalUrl}" class="btn" style="background:${accentColor}">📅 Agregar a Google Calendar</a>`
    }

    // 10. Logo HTML
    const logoHtml = clinic.clinic_logo_url
      ? `<img src="${clinic.clinic_logo_url}" alt="${clinic.clinic_name}" style="width:70px;height:70px;object-fit:contain;border-radius:16px;background:#fff;padding:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);margin:0 auto 12px;display:block;">`
      : `<div style="width:70px;height:70px;background:#ffffff22;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 12px;">🐾</div>`

    // 11. Construir HTML Premium
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
    .header { background: ${accentColor}; padding: 36px 24px 28px; text-align: center; }
    .header-badge { display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; padding: 5px 14px; border-radius: 20px; margin-bottom: 16px; }
    .header-name { color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; margin-top: 4px; }
    .header-sub { color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-top: 6px; }
    .body { padding: 36px 32px; color: #334155; font-size: 15px; line-height: 1.7; }
    .body p { margin-bottom: 12px; }
    .details-card { background: ${secondaryColor}; border: 1px solid ${primaryColor}30; border-radius: 20px; padding: 24px; margin: 28px 0; }
    .details-title { font-size: 11px; font-weight: 800; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; }
    .detail-row { display: flex; align-items: flex-start; margin-bottom: 12px; font-size: 14px; }
    .detail-row:last-child { margin-bottom: 0; }
    .detail-icon { width: 28px; flex-shrink: 0; font-size: 16px; }
    .detail-label { font-weight: 700; color: ${primaryColor}; margin-right: 6px; min-width: 70px; }
    .detail-value { color: #334155; }
    .divider { height: 1px; background: #e2e8f0; margin: 28px 0; }
    .buttons { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 14px; font-weight: 700; font-size: 14px; text-decoration: none; margin: 6px 6px; color: #ffffff !important; }
    .btn-outline { background: #f1f5f9 !important; color: ${primaryColor} !important; border: 2px solid ${primaryColor}40; }
    .signature { margin-top: 24px; font-size: 14px; color: #475569; }
    .signature strong { color: ${accentColor}; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.8; }
    .footer a { color: ${primaryColor}; text-decoration: none; font-weight: 600; }
    @media (max-width: 600px) {
      .wrapper { padding: 0; }
      .card { border-radius: 0; box-shadow: none; }
      .body { padding: 28px 20px; }
      .btn { display: block; width: 100%; margin: 8px 0; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">

      <!-- HEADER -->
      <div class="header">
        <div class="header-badge">${cfg.emoji} ${cfg.headerLabel}</div>
        ${logoHtml}
        <div class="header-name">${clinic.clinic_name}</div>
      </div>

      <!-- BODY -->
      <div class="body">
        ${emailBody.replace(/\n/g, '<br>')}

        <!-- CUADRO DE DETALLES DE LA CITA -->
        <div class="details-card">
          <div class="details-title">📋 Detalles de la cita:</div>
          <div class="detail-row">
            <span class="detail-icon">🐶</span>
            <span class="detail-label">Mascota:</span>
            <span class="detail-value">${petName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-icon">🏥</span>
            <span class="detail-label">Servicio:</span>
            <span class="detail-value">${apt.service || 'Consulta'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-icon">📅</span>
            <span class="detail-label">Fecha:</span>
            <span class="detail-value">${formattedDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-icon">⏰</span>
            <span class="detail-label">Hora:</span>
            <span class="detail-value">${formattedTime}</span>
          </div>
          ${apt.notes ? `
          <div class="detail-row">
            <span class="detail-icon">📝</span>
            <span class="detail-label">Motivo:</span>
            <span class="detail-value">${apt.notes}</span>
          </div>` : ''}
        </div>

        <div class="divider"></div>

        <!-- BOTONES DE ACCIÓN -->
        <div class="buttons">
          ${gcalButton}
          <a href="${portalUrl}" class="btn btn-outline" style="background:#f1f5f9;color:${primaryColor};">🐾 Mi Portal de Mascotas</a>
        </div>

        <!-- FIRMA -->
        <div class="signature">
          <p>Atentamente,</p>
          <p><strong>${clinic.contact_name || clinic.clinic_name}</strong></p>
          ${clinic.contact_title ? `<p style="color:#64748b;font-size:13px;">${clinic.contact_title}</p>` : ''}
          ${clinic.contact_email ? `<p style="font-size:13px;margin-top:6px;">✉️ <a href="mailto:${clinic.contact_email}" style="color:${accentColor};text-decoration:none;">${clinic.contact_email}</a>${clinic.contact_phone ? ` &nbsp;|&nbsp; 📱 ${clinic.contact_phone}` : ''}</p>` : ''}
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <strong>${clinic.clinic_name}</strong><br>
        ${clinic.address ? `${clinic.address}<br>` : ''}
        ${clinic.contact_phone ? `Tel: ${clinic.contact_phone}${clinic.contact_email ? ' &nbsp;|&nbsp; ' : ''}` : ''}
        ${clinic.contact_email ? `<a href="mailto:${clinic.contact_email}">${clinic.contact_email}</a>` : ''}<br><br>
        <em>Este es un correo automático generado por Vetxora.<br>Por favor, no respondas directamente a este mensaje.</em>
      </div>
    </div>
  </div>
</body>
</html>`

    // 12. Enviar correo al tutor
    const transporter = nodemailer.createTransport({
      host: clinic.smtp_host || 'smtp.gmail.com',
      port: Number(clinic.smtp_port) || 587,
      secure: clinic.smtp_port === 465,
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

    // 13. Notificación al admin cuando llega una nueva reserva
    if (emailType === 'booking') {
      try {
        const adminSubjectRaw = clinic.email_subject_new_booking_admin || `🔔 Nueva Reserva — {mascota}`
        const adminBodyRaw    = clinic.email_body_new_booking_admin    || `Se ha recibido una nueva solicitud de cita para <strong>{mascota}</strong> el día {fecha} a las {hora}.`

        const adminSubject = replace(adminSubjectRaw)
        const adminBody    = replace(adminBodyRaw)

        const adminHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body { background:#f0f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin:0;padding:0; }
    .card { max-width:560px; margin:40px auto; background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.08); }
    .hdr { background:#0284c7; padding:28px 24px; text-align:center; color:#fff; font-size:18px; font-weight:800; }
    .bdy { padding:32px; color:#334155; font-size:15px; line-height:1.7; }
    .box { background:#f0f9ff; border:1px solid #bae6fd; border-radius:16px; padding:20px; margin:24px 0; font-size:14px; color:#0c4a6e; }
    .box p { margin: 6px 0; }
    .ftr { background:#f8fafc; border-top:1px solid #e2e8f0; padding:20px 32px; text-align:center; font-size:11px; color:#94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="hdr">🔔 Nueva Reserva Recibida</div>
    <div class="bdy">
      <p>${adminBody.replace(/\n/g, '<br>')}</p>
      <div class="box">
        <p><strong>Tutor:</strong> ${guardianName}</p>
        <p><strong>Email:</strong> ${guardianEmail}</p>
        <p><strong>Mascota:</strong> ${petName}</p>
        <p><strong>Servicio:</strong> ${apt.service || 'No especificado'}</p>
        <p><strong>Fecha:</strong> ${formattedDate}</p>
        <p><strong>Hora:</strong> ${formattedTime}</p>
        ${apt.notes ? `<p><strong>Motivo:</strong> ${apt.notes}</p>` : ''}
        ${apt.guardian_phone ? `<p><strong>Teléfono:</strong> ${apt.guardian_phone}</p>` : ''}
      </div>
    </div>
    <div class="ftr">Generado por Vetxora &mdash; ${clinic.clinic_name}</div>
  </div>
</body>
</html>`

        await transporter.sendMail({
          from: `"${clinic.clinic_name}" <${clinic.smtp_email}>`,
          to: clinic.contact_email || clinic.smtp_email,
          subject: adminSubject,
          html: adminHtml,
        })
      } catch (adminErr) {
        console.error('Error enviando notificación al admin:', adminErr)
      }
    }

    return new Response(JSON.stringify({ success: true, type: emailType, sent_to: guardianEmail }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('Error inesperado:', err)
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
