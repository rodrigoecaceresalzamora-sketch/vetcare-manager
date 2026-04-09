import { loadStripe } from '@stripe/stripe-js'

// Reemplazar con tu propia Public Key de Stripe desde el Dashboard de Stripe
// Se recomienda usar variables de entorno: import.meta.env.VITE_STRIPE_PUBLIC_KEY
export const stripePromise = loadStripe('pk_test_sample_key_replace_me')

export const STRIPE_PLANS = {
  BASIC: {
    id: 'price_basic_id', // Reemplazar con ID de producto de Stripe
    name: 'Atención Básica',
    price: 6000,
    interval: 'mensual'
  },
  PRO: {
    id: 'price_pro_id',    // Reemplazar con ID de producto de Stripe
    name: 'Clínica Pro',
    price: 15000,
    interval: 'mensual',
    annualPrice: 150000
  }
}
