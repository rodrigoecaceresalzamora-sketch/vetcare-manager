// ============================================================
// VetCare Manager — Edge Function: confirm-booking
// Lee smtp_email / smtp_password de clinic_config en BD
// Usa Gmail SMTP (nodemailer)
// Tipos: booking | confirmation | cancellation | rescheduled
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
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Cargar la cita
    const { data: apt, error: aptErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointment_id)
      .single()

    if (aptErr || !apt) {
      return new Response(JSON.stringify({ error: 'Reserva no encontrada', detail: aptErr?.message }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Cargar configuración SMTP de la clínica
    const { data: clinic } = await supabase
      .from('clinic_config')
      .select('clinic_name, smtp_email, smtp_password, email_subject_booking, email_body_booking, email_subject_cancellation, email_body_cancellation, email_subject_rescheduled, email_body_rescheduled')
      .eq('clinic_id', apt.clinic_id)
      .single()

    const smtpEmail  = clinic?.smtp_email
    const smtpPass   = clinic?.smtp_password
    const clinicName = clinic?.clinic_name || 'VetCare Manager'

    if (!smtpEmail || !smtpPass) {
      return new Response(JSON.stringify({ error: 'Configura tu Gmail y Clave de App en Ajustes -> Mensajes Email.' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const petName       = apt.pet_name      ?? 'tu mascota'
    const guardianName  = apt.guardian_name ?? 'Estimado/a tutor/a'
    const guardianEmail = apt.guardian_email
    const serviceName   = apt.service       ?? 'Consulta'

    if (!guardianEmail) {
      return new Response(JSON.stringify({ error: 'El tutor no tiene email registrado' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const dateObj = new Date(apt.scheduled_at)
    const formattedDate = dateObj.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const formattedTime = dateObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })

    const replace = (str: string) => str
      .replace(/{tutor}/g, guardianName)
      .replace(/{mascota}/g, petName)
      .replace(/{servicio}/g, serviceName)
      .replace(/{fecha}/g, formattedDate)
      .replace(/{hora}/g, formattedTime)

    // ── Definir contenido según tipo ──────────────────────────
    type MsgType = 'booking' | 'confirmation' | 'cancellation' | 'rescheduled'
    const msgMap: Record<MsgType, { icon: string; color: string; title: string; bodyLine: string; subjectKey: keyof typeof clinic; bodyKey: keyof typeof clinic; defaultSubject: string }> = {
      booking: {
        icon: '📅', color: '#0284c7', title: 'Reserva Recibida',
        bodyLine: 'Hemos recibido tu solicitud de hora. Quedará <strong>pendiente</strong> hasta ser confirmada.',
        subjectKey: 'email_subject_booking', bodyKey: 'email_body_booking',
        defaultSubject: `Reserva recibida para ${petName} 📅`,
      },
      confirmation: {
        icon: '✅', color: '#16a34a', title: 'Hora Confirmada',
        bodyLine: '¡Tu cita ha sido <strong>confirmada</strong>! Te esperamos puntualmente.',
        subjectKey: 'email_subject_booking', bodyKey: 'email_body_booking',
        defaultSubject: `¡Hora confirmada para ${petName}! ✅`,
      },
      cancellation: {
        icon: '❌', color: '#dc2626', title: 'Cita Cancelada',
        bodyLine: 'Lamentamos informarte que tu cita ha sido <strong>cancelada</strong>. Contáctanos para reagendar.',
        subjectKey: 'email_subject_cancellation', bodyKey: 'email_body_cancellation',
        defaultSubject: `Cita cancelada para ${petName}`,
      },
      rescheduled: {
        icon: '🔄', color: '#d97706', title: 'Cita Reprogramada',
        bodyLine: 'Tu cita ha sido <strong>reprogramada</strong> para una nueva fecha y hora.',
        subjectKey: 'email_subject_rescheduled', bodyKey: 'email_body_rescheduled',
        defaultSubject: `Cita reprogramada para ${petName} 🔄`,
      },
    }

    const cfg = msgMap[(type as MsgType)] || msgMap.booking

    const subject = custom_subject
      ? replace(custom_subject)
      : (clinic?.[cfg.subjectKey] ? replace(String(clinic[cfg.subjectKey])) : cfg.defaultSubject)

    const html = custom_body
      ? `<p style="font-family:Arial;color:#333;line-height:1.7">${replace(custom_body).replace(/\n/g, '<br>')}</p>`
      : (clinic?.[cfg.bodyKey]
        ? `<p style="font-family:Arial;color:#333;line-height:1.7">${replace(String(clinic[cfg.bodyKey])).replace(/\n/g, '<br>')}</p>`
        : `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><style>
            body{font-family:Arial,sans-serif;background:#f0f9ff;margin:0;padding:20px}
            .c{background:#fff;border-radius:16px;padding:32px;max-width:560px;margin:0 auto;border:1px solid #bae6fd}
            h1{color:${cfg.color};font-size:20px;margin:8px 0 0;text-align:center}p{color:#333;line-height:1.7}
            .box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:18px 24px;margin:20px 0}
            .box ul{list-style:none;padding:0;margin:0}.box li{padding:5px 0;color:#444}
            .box li span{font-weight:bold;color:${cfg.color}}
            .ft{margin-top:28px;font-size:13px;color:#777;border-top:1px solid #bae6fd;padding-top:20px}
          </style></head><body><div class="c">
            <div style="text-align:center;font-size:40px;margin-bottom:8px">${cfg.icon}</div>
            <h1>${clinicName} — ${cfg.title}</h1>
            <p>Estimado/a <strong>${guardianName}</strong>,</p>
            <p>${cfg.bodyLine}</p>
            <div class="box"><ul>
              <li>🐾 <span>Mascota:</span> ${petName}</li>
              <li>🩺 <span>Servicio:</span> ${serviceName}</li>
              <li>📅 <span>Fecha:</span> ${formattedDate}</li>
              <li>⏰ <span>Hora:</span> ${formattedTime}</li>
              ${apt.notes ? `<li>📝 <span>Motivo:</span> ${apt.notes}</li>` : ''}
            </ul></div>
            <p>Para modificar tu cita contáctanos con al menos 24 horas de anticipación.</p>
            <div class="ft"><p>Atentamente,<br><strong>${clinicName}</strong><br>Email: ${smtpEmail}</p></div>
          </div></body></html>`)

    // 3. Enviar vía Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpEmail, pass: smtpPass },
    })

    await transporter.sendMail({
      from: `"${clinicName}" <${smtpEmail}>`,
      to: guardianEmail,
      subject,
      html,
    })

    return new Response(JSON.stringify({ success: true, sent_to: guardianEmail }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('Error confirm-booking:', err)
    return new Response(JSON.stringify({ error: err.message ?? 'Error desconocido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
