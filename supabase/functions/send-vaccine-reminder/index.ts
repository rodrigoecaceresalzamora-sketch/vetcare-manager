// ============================================================
// VetCare Manager — Edge Function: send-vaccine-reminder
// Envía recordatorio de vacunación por correo al tutor
// usando Gmail SMTP vía nodemailer.
//
// Secrets requeridos en Supabase (Project Settings → Secrets):
//   GMAIL_USER     → Scaceresalzamora@gmail.com
//   GMAIL_PASS     → Contraseña de aplicación de 16 letras (NO la normal)
//   SUPABASE_URL   → (automática en edge functions)
//   SUPABASE_SERVICE_ROLE_KEY → (automática en edge functions)
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
    const { vaccination_id } = await req.json()

    if (!vaccination_id) {
      return new Response(JSON.stringify({ error: 'vaccination_id requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 1. Conectar a Supabase y cargar los datos ──────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Cargamos la vacuna y los datos del tutor
    const { data: vacc, error: vaccErr } = await supabase
      .from('vaccinations')
      .select(`
        *,
        patient:patients (
          name,
          species,
          guardian:guardians (
            name,
            email
          )
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

    const { data: clinicConfig } = await supabase
      .from('clinic_config')
      .select('*')
      .eq('clinic_id', vacc.clinic_id)
      .single()

    const smtpEmail    = clinicConfig?.smtp_email || Deno.env.get('GMAIL_USER')
    const smtpPass     = clinicConfig?.smtp_password || Deno.env.get('GMAIL_PASS')
    const clinicName   = clinicConfig?.clinic_name || 'VetCare Manager'

    const petName       = vacc.patient?.name            ?? 'tu mascota'
    const guardianName  = vacc.patient?.guardian?.name  ?? 'Estimado/a tutor/a'
    const guardianEmail = vacc.patient?.guardian?.email
    const vaccineName   = vacc.vaccine_name             ?? 'refuerzo de vacuna'
    const dueDate       = vacc.next_due_date

    // Formatear fecha en español
    const formattedDate = new Date(dueDate + 'T12:00:00').toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    if (!guardianEmail) {
      return new Response(JSON.stringify({ error: 'El tutor no tiene email registrado' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Construir el correo ─────────────────────────────────
    const subject = clinicConfig?.email_subject_reminder
        ? clinicConfig.email_subject_reminder.replace(/{mascota}/g, petName).replace(/{tutor}/g, guardianName).replace(/{vacuna}/g, vaccineName).replace(/{fecha}/g, formattedDate)
        : `Recordatorio: Próxima vacunación de ${petName} 🐾`

    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #fdf2f7; margin: 0; padding: 20px; }
    .container { background: white; border-radius: 16px; padding: 32px; max-width: 560px; margin: 0 auto; border: 1px solid #f7bfd8; }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 40px; }
    h1 { color: #c8799f; font-size: 20px; margin: 8px 0 0; }
    p { color: #333; line-height: 1.7; }
    .detail-box { background: #fdf2f7; border: 1px solid #f7bfd8; border-radius: 12px; padding: 18px 24px; margin: 20px 0; }
    .detail-box ul { list-style: none; padding: 0; margin: 0; }
    .detail-box li { padding: 5px 0; color: #444; }
    .detail-box li span { font-weight: bold; color: #c8799f; }
    .footer { margin-top: 28px; font-size: 13px; color: #777; border-top: 1px solid #f7bfd8; padding-top: 20px; }
    .footer strong { color: #c8799f; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🐾</div>
      <h1>${clinicName} — Recordatorio</h1>
    </div>

    <p>Estimado/a <strong>${guardianName}</strong>,</p>

    <p>Te escribimos de parte de <strong>${clinicName}</strong> para recordarte que próximamente corresponde aplicar el refuerzo de la vacuna de tu compañero/a.</p>

    <div class="detail-box">
      <strong style="color:#c8799f">Detalles de la cita:</strong>
      <ul>
        <li>🐶 <span>Mascota:</span> ${petName}</li>
        <li>💉 <span>Vacuna:</span> ${vaccineName}</li>
        <li>📅 <span>Fecha sugerida:</span> ${formattedDate}</li>
      </ul>
    </div>

    <p>Si deseas agendar tu cita, contáctanos respondiendo a este correo o vía WhatsApp.</p>

    <div class="footer">
      <p>Atentamente,<br>
      <strong>${clinicName}</strong><br>
      Email: ${smtpEmail}</p>
    </div>
  </div>
</body>
</html>
`

    // ── 3. Enviar por SMTP configurado ────────────────────────
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Gmail port 465
      auth: {
        user: smtpEmail,
        pass: smtpPass,
      },
    })

    await transporter.sendMail({
      from: `"${clinicName} — VetCare" <${smtpEmail}>`,
      to: guardianEmail,
      subject,
      html: htmlBody,
    })

    // ── 4. Marcar reminder_sent = true ────────────────────────
    await supabase
      .from('vaccinations')
      .update({ reminder_sent: true })
      .eq('id', vaccination_id)

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
