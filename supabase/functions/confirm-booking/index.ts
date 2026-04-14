// ============================================================
// VetCare Manager — Edge Function: confirm-booking
// Gmail SMTP (nodemailer) — Soporte Multi-Tipo y Plantillas
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
    const { appointment_id, type = 'booking', custom_subject, custom_body } = body

    if (!appointment_id) return new Response(JSON.stringify({ error: 'Falta ID de cita' }), { status: 400, headers: corsHeaders })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: apt } = await supabase.from('appointments').select('*').eq('id', appointment_id).single()
    if (!apt) return new Response(JSON.stringify({ error: 'Cita no encontrada' }), { status: 404, headers: corsHeaders })

    const { data: clinic } = await supabase.from('clinic_config').select('*').eq('clinic_id', apt.clinic_id).single()

    if (!clinic?.smtp_email || !clinic?.smtp_password) {
      return new Response(JSON.stringify({ error: 'Configuración SMTP incompleta' }), { status: 422, headers: corsHeaders })
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: clinic.smtp_email, pass: clinic.smtp_password },
    })

    const petName = apt.pet_name || 'tu mascota'
    const guardianName = apt.guardian_name || 'Estimado/a tutor/a'
    const dateObj = new Date(apt.scheduled_at)
    const formattedDate = dateObj.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const formattedTime = dateObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })

    const replace = (s: string) => s
      .replace(/{tutor}/g, guardianName)
      .replace(/{mascota}/g, petName)
      .replace(/{servicio}/g, apt.service || '')
      .replace(/{fecha}/g, formattedDate)
      .replace(/{hora}/g, formattedTime)

    // Lógica de plantillas por tipo
    let subject = ''
    let html = ''
    let title = ''
    let color = '#0284c7'

    switch (type) {
      case 'confirmation':
        subject = clinic.email_subject_confirmed ? replace(clinic.email_subject_confirmed) : `Cita Confirmada para ${petName} ✅`
        html = clinic.email_body_confirmed ? replace(clinic.email_body_confirmed) : `<p>Tu cita ha sido confirmada para el ${formattedDate} a las ${formattedTime}.</p>`
        title = 'Cita Confirmada'
        color = '#16a34a'
        break
      case 'cancellation':
        subject = clinic.email_subject_cancellation ? replace(clinic.email_subject_cancellation) : `Cita Cancelada para ${petName} ❌`
        html = clinic.email_body_cancellation ? replace(clinic.email_body_cancellation) : `<p>Lamentamos informarte que tu cita ha sido cancelada.</p>`
        title = 'Cita Cancelada'
        color = '#dc2626'
        break
      case 'rescheduled':
        subject = clinic.email_subject_rescheduled ? replace(clinic.email_subject_rescheduled) : `Cita Reprogramada para ${petName} 🔄`
        html = clinic.email_body_rescheduled ? replace(clinic.email_body_rescheduled) : `<p>Tu cita ha sido movida al ${formattedDate} a las ${formattedTime}.</p>`
        title = 'Cita Reprogramada'
        color = '#d97706'
        break
      case 'reminder':
        subject = clinic.email_subject_reminder_appointment ? replace(clinic.email_subject_reminder_appointment) : `Recordatorio de Cita para ${petName} 📅`
        html = clinic.email_body_reminder_appointment ? replace(clinic.email_body_reminder_appointment) : `<p>Te recordamos tu próxima cita del ${formattedDate} a las ${formattedTime}.</p>`
        title = 'Recordatorio de Cita'
        color = '#4f46e5'
        break
      default: // booking
        subject = clinic.email_subject_booking ? replace(clinic.email_subject_booking) : `Reserva recibida para ${petName} 📅`
        html = clinic.email_body_booking ? replace(clinic.email_body_booking) : `<p>Tu solicitud de reserva ha sido recibida y está pendiente de confirmación.</p>`
        title = 'Solicitud de Cita'
        color = '#0284c7'
    }

    // Generar link de Portal/Reserva
    const baseUrl = 'https://vetcare-manager.vercel.app'
    const portalUrl = `${baseUrl}/c/${clinic.slug || clinic.clinic_id}`
    const bookingUrl = `${baseUrl}/reserva/${clinic.slug || clinic.clinic_id}`

    // Renderizado Premium
    const renderTemplate = (contentHtml: string, titleStr: string, actionButton: string = '') => {
      const primaryColor = clinic.primary_color || '#fb7185'
      const secondaryColor = clinic.secondary_color || '#fff1f2'
      const textColor = '#1e293b'

      return `
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
                
                ${actionButton}
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
    }

    // Preparar el botón de acción según el contexto
    let actionButton = ''
    if (type === 'confirmation' || type === 'reminder' || type === 'rescheduled') {
      const gcalStart = dateObj.toISOString().replace(/-|:|\.\d+/g, '')
      const gcalEnd = new Date(dateObj.getTime() + 30 * 60 * 1000).toISOString().replace(/-|:|\.\d+/g, '')
      const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(subject)}&dates=${gcalStart}/${gcalEnd}&details=${encodeURIComponent(subject)}&location=${encodeURIComponent(clinic.clinic_name + ' - ' + (clinic.address || ''))}`

      actionButton = `
        <div style="text-align:center; margin-top:20px;">
          <a href="${gCalUrl}" class="button">📅 Agregar a Google Calendar</a>
          <br>
          <a href="${portalUrl}" style="color: ${clinic.primary_color || '#fb7185'}; font-size: 12px; font-weight: bold; text-decoration: none;">Ver mi Ficha en Línea 🐾</a>
        </div>
      `
    } else if (type === 'booking') {
      actionButton = `
        <div style="text-align:center; margin-top:20px;">
          <a href="${portalUrl}" class="button">🐾 Mi Portal de Tutor</a>
        </div>
      `
    }

    // Combinar en el HTML final
    if (custom_body) {
      html = renderTemplate(custom_body, subject, actionButton)
    } else {
      // Si no es custom, agregamos la caja de detalles bonita
      const detailsBox = `
        <div class="details-box">
          <div style="font-weight: 800; color: #475569; margin-bottom: 15px; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">Detalles de la Cita:</div>
          <div class="detail-item"><span class="detail-label">🐶 Mascota:</span> ${petName}</div>
          <div class="detail-item"><span class="detail-label">🏥 Servicio:</span> ${apt.service || 'Consulta'}</div>
          <div class="detail-item"><span class="detail-label">📅 Fecha:</span> ${formattedDate}</div>
          <div class="detail-item"><span class="detail-label">⏰ Hora:</span> ${formattedTime}</div>
        </div>
      `
      html = renderTemplate(html + detailsBox, title, actionButton)
    }

    await transporter.sendMail({
      from: `"${clinic.clinic_name}" <${clinic.smtp_email}>`,
      to: apt.guardian_email,
      subject,
      html,
    })

    // --- NOTIFICACIÓN PARA EL ADMIN (NUEVA RESERVA) ---
    // Si el tipo es 'booking' (default), avisamos a la clínica
    if (type === 'booking') {
      try {
        const adminSubject = clinic.email_subject_new_booking_admin ? replace(clinic.email_subject_new_booking_admin) : `¡Nueva Reserva! - ${petName} 🐾`
        const adminHtmlRaw = clinic.email_body_new_booking_admin ? replace(clinic.email_body_new_booking_admin) : `<p>Alguien ha agendado una hora para <strong>${petName}</strong> el día ${formattedDate} a las ${formattedTime}.</p>`

        const adminHtml = `<!DOCTYPE html><html><body style="font-family:Arial;padding:40px;background:#f1f5f9">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:24px;padding:40px;border:1px solid #cbd5e1">
            <h2 style="color:#0284c7;text-align:center">🔔 Nueva Reserva Recibida</h2>
            <div style="color:#334155;line-height:1.8;font-size:15px">${adminHtmlRaw.replace(/\n/g, '<br>')}</div>
            <div style="margin-top:30px;padding:20px;background:#f8fafc;border-radius:12px;font-size:13px;color:#475569">
              <strong>Tutor:</strong> ${guardianName}<br>
              <strong>Mascota:</strong> ${petName}<br>
              <strong>Servicio:</strong> ${apt.service || 'No especificado'}<br>
              <strong>Fecha:</strong> ${formattedDate} a las ${formattedTime}
            </div>
          </div>
        </body></html>`

        await transporter.sendMail({
          from: `"${clinic.clinic_name}" <${clinic.smtp_email}>`,
          to: clinic.contact_email || clinic.smtp_email,
          subject: adminSubject,
          html: adminHtml,
        })
      } catch (adminErr) {
        console.error('Admin notification failed:', adminErr)
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })

  } catch (err: any) {
    console.error('SMTP Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Error SMTP' }), { status: 500, headers: corsHeaders })
  }
})
