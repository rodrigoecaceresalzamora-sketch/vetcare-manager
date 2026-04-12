// ============================================================
// VetCare Manager — Edge Function: send-vaccine-reminder
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

    const { data: vacc, error: vaccErr } = await supabase
      .from('vaccinations')
      .select(`*, patient:patients(name, species, guardian:guardians(name, email))`)
      .eq('id', vaccination_id)
      .single()

    if (vaccErr || !vacc) {
      return new Response(JSON.stringify({ error: 'Vacuna no encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: clinic } = await supabase
      .from('clinic_config')
      .select('clinic_name, smtp_email, smtp_password, email_subject_reminder, email_body_reminder')
      .eq('clinic_id', vacc.clinic_id)
      .single()

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
      port: 465, // Usamos port 465 + secure true para mayor compatibilidad
      secure: true,
      auth: { user: smtpEmail, pass: smtpPass },
      pool: false // Evitamos pooling en Edge Functions
    })

    const petName       = vacc.patient?.name            ?? 'tu mascota'
    const guardianName  = vacc.patient?.guardian?.name  ?? 'Estimado/a tutor/a'
    const guardianEmail = vacc.patient?.guardian?.email
    const vaccineName   = vacc.vaccine_name             ?? 'refuerzo de vacuna'
    const dueDate       = vacc.next_due_date

    const formattedDate = new Date(dueDate + 'T12:00:00').toLocaleDateString('es-CL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    const replace = (str: string) => str
      .replace(/{tutor}/g, guardianName).replace(/{mascota}/g, petName)
      .replace(/{vacuna}/g, vaccineName).replace(/{fecha}/g, formattedDate)

    const subject = custom_subject ? replace(custom_subject) : `Recordatorio de Vacuna: ${petName} 🐾`

    const html = custom_body ? `<p>${replace(custom_body).replace(/\n/g,'<br>')}</p>` : `
      <div style="font-family:Arial;padding:20px;max-width:500px;border:1px solid #eee;border-radius:10px">
        <h2 style="color:#c8799f">${clinicName}</h2>
        <p>Hola <strong>${guardianName}</strong>,</p>
        <p>Te recordamos la vacuna para <strong>${petName}</strong>:</p>
        <ul>
          <li>💉 <strong>Vacuna:</strong> ${vaccineName}</li>
          <li>📅 <strong>Fecha suggerida:</strong> ${formattedDate}</li>
        </ul>
        <p>Contáctanos para agendar.</p>
      </div>`

    await transporter.sendMail({
      from: `"${clinicName}" <${smtpEmail}>`,
      to: guardianEmail,
      subject,
      html,
    })

    await supabase.from('vaccinations').update({ reminder_sent: true }).eq('id', vaccination_id)

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
