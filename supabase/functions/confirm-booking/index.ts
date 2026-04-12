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

    // Usar personalizados si vienen en el body (manual reminder de PatientDetail)
    if (custom_subject) subject = custom_subject
    if (custom_body) html = `<p style="font-family:Arial;line-height:1.6">${custom_body.replace(/\n/g, '<br>')}</p>`
    else {
      // Envolver el body de la base de datos en un diseño premium si no es custom
      html = `<!DOCTYPE html><html><body style="font-family:Arial;padding:40px;background:#f8fafc">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:24px;padding:40px;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)">
          <div style="text-align:center;font-size:40px;margin-bottom:10px">🐾</div>
          <h2 style="color:${color};text-align:center;margin:0 0 30px">${clinic.clinic_name}</h2>
          <div style="color:#334155;line-height:1.8;font-size:15px">${html.replace(/\n/g, '<br>')}</div>
          <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center uppercase tracking-widest">
            ${clinic.clinic_name} &middot; ${clinic.contact_phone}
          </div>
        </div>
      </body></html>`
    }

    await transporter.sendMail({
      from: `"${clinic.clinic_name}" <${clinic.smtp_email}>`,
      to: apt.guardian_email,
      subject,
      html,
    })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })

  } catch (err: any) {
    console.error('SMTP Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Error SMTP' }), { status: 500, headers: corsHeaders })
  }
})
