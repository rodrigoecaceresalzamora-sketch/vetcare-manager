// ============================================================
// VetCare Manager — Edge Function: send-vaccine-reminder
// Gmail SMTP (nodemailer) — Con Debug Detallado
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

    if (!vaccination_id) return new Response(JSON.stringify({ error: 'Falta ID' }), { status: 400, headers: corsHeaders })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: vacc } = await supabase.from('vaccinations').select('*, patient:patients(name, guardian:guardians(name, email))').eq('id', vaccination_id).single()
    const { data: clinic } = await supabase.from('clinic_config').select('*').eq('clinic_id', vacc.clinic_id).single()

    if (!clinic?.smtp_email || !clinic?.smtp_password) {
      return new Response(JSON.stringify({ error: 'No hay Gmail o Clave de App configurada' }), { status: 422, headers: corsHeaders })
    }

    // Configuración robusta para Gmail
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // TLS
      auth: { user: clinic.smtp_email, pass: clinic.smtp_password },
      connectionTimeout: 10000, // 10 seg
    })

    const petName = vacc.patient?.name || 'mascota'
    const guardianEmail = vacc.patient?.guardian?.email

    const html = custom_body ? `<p>${custom_body.replace(/\n/g,'<br>')}</p>` : `<p>Recordatorio de vacuna para ${petName}</p>`

    // Intento de envío
    try {
      await transporter.sendMail({
        from: `"${clinic.clinic_name}" <${clinic.smtp_email}>`,
        to: guardianEmail,
        subject: custom_subject || 'Recordatorio de Vacuna',
        html,
      })
    } catch (mailErr: any) {
      console.error('SMTP Failure:', mailErr)
      return new Response(JSON.stringify({ 
        error: 'Error de Gmail: ' + mailErr.message,
        code: mailErr.code,
        command: mailErr.command 
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await supabase.from('vaccinations').update({ reminder_sent: true }).eq('id', vaccination_id)

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
