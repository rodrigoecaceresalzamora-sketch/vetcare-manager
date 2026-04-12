// ============================================================
// VetCare Manager — Edge Function: send-vaccine-reminder
// Envía recordatorio de vacunación usando Resend API
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
    const { vaccination_id, custom_subject, custom_body } = body

    if (!vaccination_id) {
      return new Response(JSON.stringify({ error: 'vaccination_id requerido' }), {
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

    // Cargar vacuna + paciente + tutor
    const { data: vacc, error: vaccErr } = await supabase
      .from('vaccinations')
      .select(`
        *,
        patient:patients (
          name,
          species,
          guardian:guardians (name, email)
        )
      `)
      .eq('id', vaccination_id)
      .single()

    if (vaccErr || !vacc) {
      return new Response(JSON.stringify({ error: 'Vacuna no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cargar config de clínica
    const { data: clinic } = await supabase
      .from('clinic_config')
      .select('clinic_name, smtp_email, contact_email')
      .eq('clinic_id', vacc.clinic_id)
      .single()

    const clinicName   = clinic?.clinic_name || 'VetCare Manager'
    const fromEmail    = clinic?.smtp_email || clinic?.contact_email || 'onboarding@resend.dev'
    const petName      = vacc.patient?.name ?? 'tu mascota'
    const guardianName = vacc.patient?.guardian?.name ?? 'Estimado/a tutor/a'
    const guardianEmail = vacc.patient?.guardian?.email
    const vaccineName  = vacc.vaccine_name ?? 'refuerzo de vacuna'
    const dueDate      = vacc.next_due_date

    if (!guardianEmail) {
      return new Response(JSON.stringify({ error: 'El tutor no tiene email registrado' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const formattedDate = new Date(dueDate + 'T12:00:00').toLocaleDateString('es-CL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    const subject = custom_subject || `Recordatorio: Próxima vacunación de ${petName} 🐾`

    const html = custom_body ? `<p>${custom_body.replace(/\n/g, '<br>')}</p>` : `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><style>
  body{font-family:Arial,sans-serif;background:#fdf2f7;margin:0;padding:20px}
  .c{background:#fff;border-radius:16px;padding:32px;max-width:560px;margin:0 auto;border:1px solid #f7bfd8}
  h1{color:#c8799f;font-size:20px;margin:8px 0 0;text-align:center}
  p{color:#333;line-height:1.7}
  .box{background:#fdf2f7;border:1px solid #f7bfd8;border-radius:12px;padding:18px 24px;margin:20px 0}
  .box ul{list-style:none;padding:0;margin:0}
  .box li{padding:5px 0;color:#444}
  .box li span{font-weight:bold;color:#c8799f}
  .ft{margin-top:28px;font-size:13px;color:#777;border-top:1px solid #f7bfd8;padding-top:20px}
</style></head><body><div class="c">
  <div style="text-align:center;font-size:40px;margin-bottom:8px">🐾</div>
  <h1>${clinicName} — Recordatorio de Vacuna</h1>
  <p>Estimado/a <strong>${guardianName}</strong>,</p>
  <p>Te recordamos que próximamente corresponde aplicar el refuerzo de vacuna de tu compañero/a.</p>
  <div class="box"><ul>
    <li>🐶 <span>Mascota:</span> ${petName}</li>
    <li>💉 <span>Vacuna:</span> ${vaccineName}</li>
    <li>📅 <span>Fecha sugerida:</span> ${formattedDate}</li>
  </ul></div>
  <p>Contáctanos para agendar tu cita respondiendo este correo o vía WhatsApp.</p>
  <div class="ft"><p>Atentamente,<br><strong>${clinicName}</strong></p></div>
</div></body></html>`

    await sendEmail({
      resendKey,
      from: `${clinicName} <${fromEmail}>`,
      to: guardianEmail,
      subject,
      html,
    })

    // Marcar reminder_sent = true
    await supabase.from('vaccinations').update({ reminder_sent: true }).eq('id', vaccination_id)

    return new Response(JSON.stringify({ success: true, sent_to: guardianEmail }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('Error en send-vaccine-reminder:', err)
    return new Response(JSON.stringify({ error: err.message ?? 'Error desconocido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
