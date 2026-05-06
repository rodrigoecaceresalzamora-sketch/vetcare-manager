import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { planId, userId, userEmail, clinicId } = await req.json()
    
    // Configurar precios (en CLP)
    // Puedes ajustar estos valores según tus planes reales
    const price = planId === 'pro' ? 24990 : 14990
    const planName = planId === 'pro' ? 'Plan Pro Ilimitado' : 'Plan Básico'

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado en Supabase')
    }

    console.log(`Creando preferencia para usuario ${userId} - Plan ${planId}`)

    // Llamada a la API de Mercado Pago para crear la preferencia
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            title: `Vetxora - ${planName}`,
            quantity: 1,
            unit_price: price,
            currency_id: "CLP",
            description: "Gestión Veterinaria Profesional"
          }
        ],
        payer: {
          email: userEmail
        },
        back_urls: {
          success: `https://vetcare-manager.vercel.app/dashboard?payment=success`,
          failure: `https://vetcare-manager.vercel.app/planes?payment=failure`,
          pending: `https://vetcare-manager.vercel.app/dashboard?payment=pending`
        },
        auto_return: "approved",
        notification_url: `https://xqoqxhxenouicictkodm.functions.supabase.co/mercadopago-webhook`, // Cambiar por tu URL de proyecto real
        metadata: {
          user_id: userId,
          clinic_id: clinicId,
          plan_id: planId
        },
        external_reference: userId // Referencia externa para rastreo
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Error de Mercado Pago:', data)
      throw new Error(data.message || 'Error al crear la preferencia de pago')
    }

    return new Response(
      JSON.stringify({ url: data.init_point }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
