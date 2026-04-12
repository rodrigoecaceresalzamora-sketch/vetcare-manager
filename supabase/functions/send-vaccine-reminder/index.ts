// ============================================================
// VetCare Manager — Edge Function: send-vaccine-reminder
// Usa Resend API (HTTP puro, sin nodemailer)
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
    const { vaccination_id, custom_subject, custom_body } = body

    if (!vaccination_id) {
      return new Response(JSON.stringify({ error: 'vaccination_id requerido' }), {
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

    // Cargar vacuna
    const { data: vacc, error: vaccErr } = await supabase
      .from('vaccinations')
      .select('*, patient:patients(name, guardian:guardians(name, email))')
      .eq('id', vaccination_id)
      .single()

    if (vaccErr || !vacc) {
      return new Response(JSON.stringify({ error: `Vacuna no encontrada: ${vaccErr?.message}` }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: clinic } = await supabase
      .from('clinic_config')
      .select('clinic_name, smtp_email, email_subject_reminder, email_body_reminder')
      .eq('clinic_id', vacc.clinic_id)
      .single()

    const clinicName   = clinic?.clinic_name || 'VetCare Manager'
    const replyTo      = clinic?.smtp_email  || undefined
    const petName      = vacc.patient?.name ?? 'tu mascota'
    const guardianName = vacc.patient?.guardian?.name ?? 'Estimado/a tutor/a'
    const guardianEmail = vacc.patient?.guardian?.email
    const vaccineName  = vacc.vaccine_name ?? 'refuerzo de vacuna'
    const dueDate      = vacc.next_due_date

    if (!guardianEmail) {
      return new Response(JSON.stringify({ error: 'El tutor no tiene email registrado' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const formattedDate = new Date(dueDate + 'T12:00:00').toLocaleDateString('es-CL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    const replace = (s: string) => s
      .replace(/{tutor}/g, guardianName).replace(/{mascota}/g, petName)
      .replace(/{vacuna}/g, vaccineName).replace(/{fecha}/g, formattedDate)

    const subject = custom_subject
      ? replace(custom_subject)
      : (clinic?.email_subject_reminder ? replace(clinic.email_subject_reminder) : `Recordatorio de vacuna para ${petName} 🐾`)

    const html = custom_body
      ? `<p style="font-family:Arial;line-height:1.7">${replace(custom_body).replace(/\n/g, '<br>')}</p>`
      : `<!DOCTYPE html><html><body style="font-family:Arial;background:#fdf2f7;padding:20px">
          <div style="background:#fff;border-radius:16px;padding:32px;max-width:560px;margin:0 auto;border:1px solid #f7bfd8">
            <div style="text-align:center;font-size:36px;margin-bottom:8px">🐾</div>
            <h2 style="color:#c8799f;text-align:center;margin:0 0 20px">${clinicName} — Recordatorio de Vacuna</h2>
            <p>Estimado/a <strong>${guardianName}</strong>,</p>
            <p>Te recordamos que se acerca la fecha del refuerzo de vacuna para tu compañero/a.</p>
            <div style="background:#fdf2f7;border:1px solid #f7bfd8;border-radius:12px;padding:16px;margin:20px 0">
              <p style="margin:4px 0">🐶 <strong>Mascota:</strong> ${petName}</p>
              <p style="margin:4px 0">💉 <strong>Vacuna:</strong> ${vaccineName}</p>
              <p style="margin:4px 0">📅 <strong>Fecha sugerida:</strong> ${formattedDate}</p>
            </div>
            <p>Contáctanos para agendar tu hora.</p>
            <p style="color:#999;font-size:12px;border-top:1px solid #f7bfd8;padding-top:12px;margin-top:20px">
              Atentamente, <strong>${clinicName}</strong>
            </p>
          </div>
        </body></html>`

    // Enviar vía Resend
    const emailPayload: any = {
      from: `${clinicName} <onboarding@resend.dev>`,
      to: [guardianEmail],
      subject,
      html,
    }
    if (replyTo) emailPayload.reply_to = replyTo

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      return new Response(JSON.stringify({ error: `Resend error: ${resendData.message || JSON.stringify(resendData)}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Marcar reminder_sent = true
    await supabase.from('vaccinations').update({ reminder_sent: true }).eq('id', vaccination_id)

    return new Response(JSON.stringify({ success: true, sent_to: guardianEmail, resend_id: resendData.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('send-vaccine-reminder crashed:', err)
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
