// ============================================================
// VetCare Manager — Edge Function: confirm-booking
// Gmail SMTP (nodemailer) — Optimizada para Supabase Edge
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

    if (!appointment_id) {
      return new Response(JSON.stringify({ error: 'appointment_id requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: apt, error: aptErr } = await supabase
      .from('appointments')
      .select('*').eq('id', appointment_id).single()

    if (aptErr || !apt) {
      return new Response(JSON.stringify({ error: 'Cita no encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: clinic } = await supabase
      .from('clinic_config')
      .select('*').eq('clinic_id', apt.clinic_id).single()

    const smtpEmail  = clinic?.smtp_email
    const smtpPass   = clinic?.smtp_password
    const clinicName = clinic?.clinic_name || 'VetCare Manager'

    if (!smtpEmail || !smtpPass) {
      return new Response(JSON.stringify({ error: 'Configura Gmail y Clave de App en Ajustes.' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: smtpEmail, pass: smtpPass },
      pool: false
    })

    const petName       = apt.pet_name      ?? 'tu mascota'
    const guardianName  = apt.guardian_name ?? 'Estimado/a tutor/a'
    const guardianEmail = apt.guardian_email
    const serviceName   = apt.service       ?? 'Consulta'

    const dateObj = new Date(apt.scheduled_at)
    const formattedDate = dateObj.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const formattedTime = dateObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })

    const replace = (str: string) => str
      .replace(/{tutor}/g, guardianName).replace(/{mascota}/g, petName)
      .replace(/{servicio}/g, serviceName).replace(/{fecha}/g, formattedDate)
      .replace(/{hora}/g, formattedTime)

    type MsgType = 'booking' | 'confirmation' | 'cancellation' | 'rescheduled'
    const msgMap: Record<MsgType, { title: string; defaultSubject: string }> = {
      booking:      { title: 'Reserva Recibida', defaultSubject: `Reserva recibida para ${petName} 📅` },
      confirmation: { title: 'Hora Confirmada',  defaultSubject: `¡Hora confirmada para ${petName}! ✅` },
      cancellation: { title: 'Cita Cancelada',   defaultSubject: `Cita cancelada para ${petName} ❌` },
      rescheduled:  { title: 'Cita Reprogramada',defaultSubject: `Cita reprogramada para ${petName} 🔄` },
    }

    const cfg = msgMap[(type as MsgType)] || msgMap.booking
    const subject = custom_subject ? replace(custom_subject) : cfg.defaultSubject

    const html = custom_body ? `<p>${replace(custom_body).replace(/\n/g, '<br>')}</p>` : `
      <div style="font-family:Arial;padding:20px;max-width:500px;border:1px solid #eee;border-radius:10px">
        <h2 style="color:#0284c7">${clinicName} - ${cfg.title}</h2>
        <p>Hola <strong>${guardianName}</strong>,</p>
        <p>Tu cita para <strong>${petName}</strong>:</p>
        <ul>
          <li>🩺 <strong>Servicio:</strong> ${serviceName}</li>
          <li>📅 <strong>Fecha:</strong> ${formattedDate}</li>
          <li>⏰ <strong>Hora:</strong> ${formattedTime}</li>
        </ul>
      </div>`

    await transporter.sendMail({
      from: `"${clinicName}" <${smtpEmail}>`,
      to: guardianEmail,
      subject,
      html,
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('SMTP Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Error SMTP' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
