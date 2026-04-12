// ============================================================
// VetCare Manager — Edge Function: send-vaccine-reminder
// Lee smtp_email / smtp_password de clinic_config en BD
// Fallback: secrets GMAIL_USER / GMAIL_PASS de Supabase
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

    // 1. Cargar vacuna + paciente + tutor
    const { data: vacc, error: vaccErr } = await supabase
      .from('vaccinations')
      .select(`*, patient:patients(name, species, guardian:guardians(name, email))`)
      .eq('id', vaccination_id)
      .single()

    if (vaccErr || !vacc) {
      return new Response(JSON.stringify({ error: 'Vacuna no encontrada', detail: vaccErr?.message }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Cargar configuración SMTP de la clínica
    const { data: clinic } = await supabase
      .from('clinic_config')
      .select('clinic_name, smtp_email, smtp_password, email_subject_reminder, email_body_reminder')
      .eq('clinic_id', vacc.clinic_id)
      .single()

    const smtpEmail  = clinic?.smtp_email  || Deno.env.get('GMAIL_USER') || ''
    const smtpPass   = clinic?.smtp_password || Deno.env.get('GMAIL_PASS') || ''
    const clinicName = clinic?.clinic_name || 'VetCare Manager'

    if (!smtpEmail || !smtpPass) {
      return new Response(JSON.stringify({ error: 'Credenciales SMTP no configuradas. Agrega smtp_email y smtp_password en Configuración.' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const petName       = vacc.patient?.name            ?? 'tu mascota'
    const guardianName  = vacc.patient?.guardian?.name  ?? 'Estimado/a tutor/a'
    const guardianEmail = vacc.patient?.guardian?.email
    const vaccineName   = vacc.vaccine_name             ?? 'refuerzo de vacuna'
    const dueDate       = vacc.next_due_date

    if (!guardianEmail) {
      return new Response(JSON.stringify({ error: 'El tutor no tiene email registrado' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const formattedDate = new Date(dueDate + 'T12:00:00').toLocaleDateString('es-CL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    const replace = (str: string) => str
      .replace(/{tutor}/g, guardianName)
      .replace(/{mascota}/g, petName)
      .replace(/{vacuna}/g, vaccineName)
      .replace(/{fecha}/g, formattedDate)

    const subject = custom_subject
      ? replace(custom_subject)
      : (clinic?.email_subject_reminder ? replace(clinic.email_subject_reminder) : `Recordatorio: Próxima vacunación de ${petName} 🐾`)

    const html = custom_body
      ? `<p style="font-family:Arial;color:#333;line-height:1.7">${replace(custom_body).replace(/\n/g,'<br>')}</p>`
      : `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><style>
          body{font-family:Arial,sans-serif;background:#fdf2f7;margin:0;padding:20px}
          .c{background:#fff;border-radius:16px;padding:32px;max-width:560px;margin:0 auto;border:1px solid #f7bfd8}
          h1{color:#c8799f;font-size:20px;margin:8px 0 0;text-align:center}p{color:#333;line-height:1.7}
          .box{background:#fdf2f7;border:1px solid #f7bfd8;border-radius:12px;padding:18px 24px;margin:20px 0}
          .box ul{list-style:none;padding:0;margin:0}.box li{padding:5px 0;color:#444}
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
          <div class="ft"><p>Atentamente,<br><strong>${clinicName}</strong><br>Email: ${smtpEmail}</p></div>
        </div></body></html>`

    // 3. Enviar vía Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: smtpEmail, pass: smtpPass },
    })

    await transporter.sendMail({
      from: `"${clinicName}" <${smtpEmail}>`,
      to: guardianEmail,
      subject,
      html,
    })

    // 4. Marcar reminder_sent = true
    await supabase.from('vaccinations').update({ reminder_sent: true }).eq('id', vaccination_id)

    return new Response(JSON.stringify({ success: true, sent_to: guardianEmail }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('Error send-vaccine-reminder:', err)
    return new Response(JSON.stringify({ error: err.message ?? 'Error desconocido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
