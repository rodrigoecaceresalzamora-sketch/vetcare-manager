import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar preflight de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Obtener la data de la notificación
    // Mercado Pago envía notificaciones de diferentes tipos
    const query = new URL(req.url).searchParams
    const topic = query.get('topic') || query.get('type')
    const id = query.get('id') || query.get('data.id')

    console.log(`Webhook recibido: Tipo=${topic}, ID=${id}`)

    if (topic === 'payment' && id) {
      const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

      if (!accessToken || !supabaseUrl || !supabaseServiceKey) {
        throw new Error('Variables de entorno no configuradas')
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // 2. Consultar el estado real del pago en Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      })

      if (!mpResponse.ok) {
        throw new Error('No se pudo validar el pago con Mercado Pago')
      }

      const payment = await mpResponse.json()
      
      console.log(`Estado del pago: ${payment.status}, Detalle: ${payment.status_detail}`)

      // 3. Si el pago está aprobado, activar la suscripción
      if (payment.status === 'approved') {
        const { user_id, clinic_id, plan_id } = payment.metadata
        console.log(`Activando plan ${plan_id} para usuario ${user_id} en clínica ${clinic_id}`)

        if (clinic_id) {
          // Actualizar clínica existente
          const { error: updateError } = await supabase
            .from('clinics')
            .update({ 
              is_paid: true, 
              plan_type: plan_id,
              updated_at: new Date().toISOString() 
            })
            .eq('id', clinic_id)

          if (updateError) throw updateError
          console.log('Clínica actualizada con éxito')
        } else {
          // Si por alguna razón no venía clinic_id, podríamos crear una por defecto
          // o buscar la clínica del usuario
          const { data: userClinic } = await supabase
            .from('clinics')
            .select('id')
            .eq('owner_id', user_id)
            .single()

          if (userClinic) {
            await supabase
              .from('clinics')
              .update({ is_paid: true, plan_type: plan_id })
              .eq('id', userClinic.id)
            console.log('Clínica encontrada y actualizada')
          } else {
            // Crear nueva clínica básica
            const { data: newClinic } = await supabase
              .from('clinics')
              .insert({
                owner_id: user_id,
                name: 'Mi Clínica Veterinaria',
                plan_type: plan_id,
                is_paid: true
              })
              .select()
              .single()
            
            console.log('Nueva clínica creada con éxito:', newClinic.id)
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error en Webhook:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
