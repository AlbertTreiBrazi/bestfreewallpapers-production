import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    // Get environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing')
    }

    // Get user ID from authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify user with Supabase Auth
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseServiceKey
      }
    })

    if (!userResponse.ok) {
      throw new Error('Unauthorized: Invalid token')
    }

    const user = await userResponse.json()
    const userId = user.id

    // Query bfw_subscriptions to get stripe_customer_id
    const subscriptionResponse = await fetch(
      `${supabaseUrl}/rest/v1/bfw_subscriptions?user_id=eq.${userId}&status=eq.active&select=stripe_customer_id`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!subscriptionResponse.ok) {
      const errorText = await subscriptionResponse.text()
      throw new Error(`Failed to query bfw_subscriptions: ${errorText}`)
    }

    const subscriptions = await subscriptionResponse.json()

    if (!subscriptions || subscriptions.length === 0) {
      throw new Error('No active subscription found for this user')
    }

    const stripeCustomerId = subscriptions[0].stripe_customer_id

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Create Stripe Customer Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${req.headers.get('origin') || 'https://p1frfwiol73l.space.minimax.io'}/premium`,
    })

    console.log(`Portal session created for customer: ${stripeCustomerId}`)

    return new Response(
      JSON.stringify({
        data: {
          portalUrl: session.url,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error in create-portal-session:', error)
    return new Response(
      JSON.stringify({
        error: {
          code: 'PORTAL_ERROR',
          message: error.message || 'Failed to create portal session',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
