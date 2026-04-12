// ============================================================
// VetCare Manager — Edge Function: confirm-booking
// Usa Resend API (HTTP puro, sin nodemailer)
// tipos: booking | confirmation | cancellation | rescheduled
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

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

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY no configurado en Supabase Secrets' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cargar cita
    const { data: apt, error: aptErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointment_id)
      .single()

    if (aptErr || !apt) {
      return new Response(JSON.stringify({ error: `Reserva no encontrada: ${aptErr?.message}` }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cargar config clínica
    const { data: clinic } = await supabase
      .from('clinic_config')
      .select('clinic_name, smtp_email, email_subject_booking, email_body_booking, email_subject_cancellation, email_body_cancellation, email_subject_rescheduled, email_body_rescheduled')
      .eq('clinic_id', apt.clinic_id)
      .single()

    const clinicName    = clinic?.clinic_name || 'VetCare Manager'
    const replyTo       = clinic?.smtp_email  || undefined
    const petName       = apt.pet_name        ?? 'tu mascota'
    const guardianName  = apt.guardian_name   ?? 'Estimado/a tutor/a'
    const guardianEmail = apt.guardian_email
    const serviceName   = apt.service         ?? 'Consulta'

    if (!guardianEmail) {
      return new Response(JSON.stringify({ error: 'El tutor no tiene email registrado' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const dateObj = new Date(apt.scheduled_at)
    const formattedDate = dateObj.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const formattedTime = dateObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })

    const replace = (s: string) => s
      .replace(/{tutor}/g, guardianName).replace(/{mascota}/g, petName)
      .replace(/{servicio}/g, serviceName).replace(/{fecha}/g, formattedDate)
      .replace(/{hora}/g, formattedTime)

    const typeMap: Record<string, { icon: string; color: string; title: string; bodyLine: string; dbSubject: any; dbBody: any; defaultSubject: string }> = {
      booking:      { icon: '📅', color: '#0284c7', title: 'Reserva Recibida',     bodyLine: 'Hemos recibido tu solicitud. Quedará <strong>pendiente</strong> hasta ser confirmada.',        dbSubject: clinic?.email_subject_booking,      dbBody: clinic?.email_body_booking,      defaultSubject: `Reserva recibida para ${petName} 📅` },
      confirmation: { icon: '✅', color: '#16a34a', title: 'Hora Confirmada',       bodyLine: '¡Tu cita ha sido <strong>confirmada</strong>! Te esperamos puntualmente.',                    dbSubject: clinic?.email_subject_booking,      dbBody: clinic?.email_body_booking,      defaultSubject: `¡Hora confirmada para ${petName}! ✅` },
      cancellation: { icon: '❌', color: '#dc2626', title: 'Cita Cancelada',        bodyLine: 'Lamentamos informarte que tu cita ha sido <strong>cancelada</strong>. Contáctanos si tienes dudas.', dbSubject: clinic?.email_subject_cancellation, dbBody: clinic?.email_body_cancellation, defaultSubject: `Cita cancelada para ${petName}` },
      rescheduled:  { icon: '🔄', color: '#d97706', title: 'Cita Reprogramada',     bodyLine: 'Tu cita ha sido <strong>reprogramada</strong> para una nueva fecha.',                          dbSubject: clinic?.email_subject_rescheduled,  dbBody: clinic?.email_body_rescheduled,  defaultSubject: `Cita reprogramada para ${petName} 🔄` },
    }

    const cfg = typeMap[type] || typeMap.booking
    const subject = custom_subject
      ? replace(custom_subject)
      : (cfg.dbSubject ? replace(cfg.dbSubject) : cfg.defaultSubject)

    const html = custom_body
      ? `<p style="font-family:Arial;line-height:1.7">${replace(custom_body).replace(/\n/g, '<br>')}</p>`
      : (cfg.dbBody
        ? `<p style="font-family:Arial;line-height:1.7">${replace(cfg.dbBody).replace(/\n/g, '<br>')}</p>`
        : `<!DOCTYPE html><html><body style="font-family:Arial;background:#f0f9ff;padding:20px">
            <div style="background:#fff;border-radius:16px;padding:32px;max-width:560px;margin:0 auto;border:1px solid #bae6fd">
              <div style="text-align:center;font-size:36px;margin-bottom:8px">${cfg.icon}</div>
              <h2 style="color:${cfg.color};text-align:center;margin:0 0 20px">${clinicName} — ${cfg.title}</h2>
              <p>Estimado/a <strong>${guardianName}</strong>,</p>
              <p>${cfg.bodyLine}</p>
              <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px;margin:20px 0">
                <p style="margin:4px 0">🐾 <strong>Mascota:</strong> ${petName}</p>
                <p style="margin:4px 0">🩺 <strong>Servicio:</strong> ${serviceName}</p>
                <p style="margin:4px 0">📅 <strong>Fecha:</strong> ${formattedDate}</p>
                <p style="margin:4px 0">⏰ <strong>Hora:</strong> ${formattedTime}</p>
                ${apt.notes ? `<p style="margin:4px 0">📝 <strong>Motivo:</strong> ${apt.notes}</p>` : ''}
              </div>
              <p>Para modificar tu cita contáctanos con al menos 24 horas de anticipación.</p>
              <p style="color:#999;font-size:12px;border-top:1px solid #bae6fd;padding-top:12px;margin-top:20px">
                Atentamente, <strong>${clinicName}</strong>
              </p>
            </div>
          </body></html>`)

    const emailPayload: any = {
      from: `${clinicName} <onboarding@resend.dev>`,
      to: [guardianEmail],
      subject,
      html,
    }
    if (replyTo) emailPayload.reply_to = replyTo

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      return new Response(JSON.stringify({ error: `Resend error: ${resendData.message || JSON.stringify(resendData)}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, sent_to: guardianEmail, resend_id: resendData.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('confirm-booking crashed:', err)
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
