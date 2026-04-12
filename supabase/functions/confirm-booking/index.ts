// ============================================================
// VetCare Manager — Edge Function: confirm-booking
// Envía correo de confirmación/notificación de cita usando Resend
// Acepta: appointment_id, type ('booking'|'confirmation'|'cancellation'|'rescheduled')
// Secrets requeridos: RESEND_API_KEY
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendEmail(opts: {
  resendKey: string
  from: string
  to: string
  subject: string
  html: string
}) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${opts.resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || JSON.stringify(data))
  return data
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

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY no configurado')

    // Cargar cita
    const { data: apt, error: aptErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointment_id)
      .single()

    if (aptErr || !apt) {
      return new Response(JSON.stringify({ error: 'Reserva no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cargar config clínica
    const { data: clinic } = await supabase
      .from('clinic_config')
      .select('*')
      .eq('clinic_id', apt.clinic_id)
      .single()

    const clinicName   = clinic?.clinic_name || 'VetCare Manager'
    // Resend requiere dominio verificado. Usar onboarding@resend.dev en plan gratuito.
    const fromEmail    = 'onboarding@resend.dev'
    const petName      = apt.pet_name ?? 'tu mascota'
    const guardianName = apt.guardian_name ?? 'Estimado/a tutor/a'
    const guardianEmail = apt.guardian_email

    if (!guardianEmail) {
      return new Response(JSON.stringify({ error: 'El tutor no tiene email registrado' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const dateObj = new Date(apt.scheduled_at)
    const formattedDate = dateObj.toLocaleDateString('es-CL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const formattedTime = dateObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    const serviceName = apt.service ?? 'Consulta'

    // ── Configurar por tipo de mensaje ─────────────────────────
    const configs: Record<string, { icon: string; color: string; title: string; defaultSubject: string; bodyLine: string }> = {
      booking: {
        icon: '📅',
        color: '#0284c7',
        title: 'Reserva Recibida',
        defaultSubject: `Reserva recibida para ${petName} 📅`,
        bodyLine: 'Hemos recibido tu solicitud de hora. Quedará <strong>pendiente</strong> hasta ser confirmada por la veterinaria.',
      },
      confirmation: {
        icon: '✅',
        color: '#16a34a',
        title: 'Hora Confirmada',
        defaultSubject: `¡Hora confirmada para ${petName}! ✅`,
        bodyLine: '¡Tu cita ha sido <strong>confirmada</strong>! Te esperamos puntualmente.',
      },
      cancellation: {
        icon: '❌',
        color: '#dc2626',
        title: 'Cita Cancelada',
        defaultSubject: `Cita cancelada para ${petName}`,
        bodyLine: 'Lamentamos informarte que tu cita ha sido <strong>cancelada</strong>. Por favor contáctanos para reagendar.',
      },
      rescheduled: {
        icon: '🔄',
        color: '#d97706',
        title: 'Cita Reprogramada',
        defaultSubject: `Cita reprogramada para ${petName} 🔄`,
        bodyLine: 'Tu cita ha sido <strong>reprogramada</strong> para una nueva fecha y hora.',
      },
    }

    const cfg = configs[type] || configs.booking
    const subject = custom_subject || cfg.defaultSubject

    const html = custom_body ? `<p>${custom_body.replace(/\n/g, '<br>')}</p>` : `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><style>
  body{font-family:Arial,sans-serif;background:#f0f9ff;margin:0;padding:20px}
  .c{background:#fff;border-radius:16px;padding:32px;max-width:560px;margin:0 auto;border:1px solid #bae6fd}
  h1{color:${cfg.color};font-size:20px;margin:8px 0 0;text-align:center}
  p{color:#333;line-height:1.7}
  .box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:18px 24px;margin:20px 0}
  .box ul{list-style:none;padding:0;margin:0}
  .box li{padding:5px 0;color:#444}
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
  <p>Para modificar o cancelar tu cita, por favor contáctanos con al menos 24 horas de anticipación.</p>
  <div class="ft"><p>Atentamente,<br><strong>${clinicName}</strong></p></div>
</div></body></html>`

    await sendEmail({
      resendKey,
      from: `${clinicName} <${fromEmail}>`,
      to: guardianEmail,
      subject,
      html,
    })

    return new Response(JSON.stringify({ success: true, sent_to: guardianEmail }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('Error en confirm-booking:', err)
    return new Response(JSON.stringify({ error: err.message ?? 'Error desconocido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
