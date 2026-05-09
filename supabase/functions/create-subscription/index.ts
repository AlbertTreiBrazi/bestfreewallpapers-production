import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

interface RequestBody {
  planType: 'premium' | 'sixmonth' | 'annual'
  customerEmail: string
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

    // Parse request body
    const { planType, customerEmail }: RequestBody = await req.json()

    if (!planType || !customerEmail) {
      throw new Error('Missing required fields: planType or customerEmail')
    }

    // Validate planType
    const validPlanTypes = ['premium', 'sixmonth', 'annual']
    if (!validPlanTypes.includes(planType)) {
      throw new Error(`Invalid planType: ${planType}. Must be one of: ${validPlanTypes.join(', ')}`)
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Query bfw_plans table to get the price_id for this plan
    const plansResponse = await fetch(`${supabaseUrl}/rest/v1/bfw_plans?plan_type=eq.${planType}&select=price_id`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!plansResponse.ok) {
      const errorText = await plansResponse.text()
      throw new Error(`Failed to query bfw_plans table: ${errorText}`)
    }

    const plans = await plansResponse.json()

    if (!plans || plans.length === 0) {
      throw new Error(`No plan found for planType: ${planType}`)
    }

    const priceId = plans[0].price_id

    console.log(`Creating subscription for plan: ${planType}, price_id: ${priceId}, customer: ${customerEmail}`)

    // Create or retrieve Stripe customer
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1
    })

    let customer
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
      console.log(`Found existing customer: ${customer.id}`)
    } else {
      customer = await stripe.customers.create({
        email: customerEmail,
        metadata: {
          plan_type: planType
        }
      })
      console.log(`Created new customer: ${customer.id}`)
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin') || 'https://p1frfwiol73l.space.minimax.io'}/premium?subscription=success`,
      cancel_url: `${req.headers.get('origin') || 'https://p1frfwiol73l.space.minimax.io'}/upgrade?subscription=cancelled`,
      automatic_tax: {
        enabled: true,
      },
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
      },
      metadata: {
        plan_type: planType,
        customer_email: customerEmail,
      },
    })

    console.log(`Checkout session created: ${session.id}, url: ${session.url}`)

    return new Response(
      JSON.stringify({
        data: {
          checkoutUrl: session.url,
          sessionId: session.id,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error in create-subscription:', error)
    return new Response(
      JSON.stringify({
        error: {
          code: 'SUBSCRIPTION_ERROR',
          message: error.message || 'Failed to create subscription',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
