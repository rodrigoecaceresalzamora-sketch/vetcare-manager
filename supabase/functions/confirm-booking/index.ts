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
    const { appointment_id } = await req.json()

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

    // Cargamos la cita
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

    const { data: clinicConfig } = await supabase
      .from('clinic_config')
      .select('*')
      .eq('clinic_id', apt.clinic_id)
      .single()

    const smtpEmail    = clinicConfig?.smtp_email || Deno.env.get('GMAIL_USER')
    const smtpPass     = clinicConfig?.smtp_password || Deno.env.get('GMAIL_PASS')
    const clinicName   = clinicConfig?.clinic_name || 'VetCare Manager'

    const petName       = apt.pet_name            ?? 'tu mascota'
    const guardianName  = apt.guardian_name       ?? 'Estimado/a tutor/a'
    const guardianEmail = apt.guardian_email
    const serviceName   = apt.service             ?? 'Consulta'
    const scheduledAt   = apt.scheduled_at

    // Formatear fecha en español
    const dateObj = new Date(scheduledAt)
    const formattedDate = dateObj.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const formattedTime = dateObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })

    if (!guardianEmail) {
      return new Response(JSON.stringify({ error: 'El tutor no tiene email registrado' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const subject = clinicConfig?.email_subject_booking
        ? clinicConfig.email_subject_booking.replace(/{mascota}/g, petName).replace(/{tutor}/g, guardianName).replace(/{servicio}/g, serviceName).replace(/{fecha}/g, formattedDate).replace(/{hora}/g, formattedTime)
        : `Confirmación: Hora médica para ${petName} 🐾`

    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #e0f2fe; margin: 0; padding: 20px; }
    .container { background: white; border-radius: 16px; padding: 32px; max-width: 560px; margin: 0 auto; border: 1px solid #bae6fd; }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 40px; }
    h1 { color: #0284c7; font-size: 20px; margin: 8px 0 0; }
    p { color: #333; line-height: 1.7; }
    .detail-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 18px 24px; margin: 20px 0; }
    .detail-box ul { list-style: none; padding: 0; margin: 0; }
    .detail-box li { padding: 5px 0; color: #444; }
    .detail-box li span { font-weight: bold; color: #0284c7; }
    .footer { margin-top: 28px; font-size: 13px; color: #777; border-top: 1px solid #bae6fd; padding-top: 20px; }
    .footer strong { color: #0284c7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">✅</div>
      <h1>${clinicName} — Confirmación de Reserva</h1>
    </div>

    <p>Estimado/a <strong>${guardianName}</strong>,</p>

    <p>Te escribimos de parte de <strong>${clinicName}</strong> para confirmar exitosamente que hemos agendado tu próxima visita. ¡Te esperamos!</p>

    <div class="detail-box">
      <strong style="color:#0284c7">Detalles de la cita:</strong>
      <ul>
        <li>🐶 <span>Mascota:</span> ${petName}</li>
        <li>🩺 <span>Motivo:</span> ${serviceName}</li>
        <li>📅 <span>Fecha:</span> ${formattedDate}</li>
        <li>⏰ <span>Hora:</span> ${formattedTime}</li>
      </ul>
    </div>

    <p>Si necesitas modificar o cancelar esta hora, por favor contáctanos con al menos 24 horas de anticipación respondiendo a este correo o vía WhatsApp.</p>

    <div class="footer">
      <p>Atentamente,<br>
      <strong>${clinicName}</strong><br>
      Email: ${smtpEmail}</p>
    </div>
  </div>
</body>
</html>
`

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
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
