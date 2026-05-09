import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!stripeSecretKey || !stripeWebhookSecret) {
      throw new Error('Stripe configuration is missing')
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing')
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Get the raw body for signature verification
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      throw new Error('Missing stripe-signature header')
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(
        JSON.stringify({ error: { message: `Webhook Error: ${err.message}` } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Received webhook event: ${event.type}, id: ${event.id}`)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`Checkout session completed: ${session.id}`)

        // Get subscription details
        const subscriptionId = session.subscription as string
        const customerId = session.customer as string
        const customerEmail = session.customer_email || session.customer_details?.email

        if (!subscriptionId || !customerId) {
          console.error('Missing subscription or customer ID in checkout session')
          break
        }

        // Retrieve the subscription to get price_id
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0]?.price.id

        if (!priceId) {
          console.error('Missing price_id in subscription')
          break
        }

        // Find user by email
        const userResponse = await fetch(
          `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(customerEmail || '')}`,
          {
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!userResponse.ok) {
          console.error('Failed to find user by email')
          break
        }

        const usersData = await userResponse.json()
        const users = usersData.users || []

        if (users.length === 0) {
          console.error(`No user found with email: ${customerEmail}`)
          break
        }

        const userId = users[0].id

        // Insert subscription record into bfw_subscriptions
        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/bfw_subscriptions`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            price_id: priceId,
            status: subscription.status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        })

        if (!insertResponse.ok) {
          const errorText = await insertResponse.text()
          console.error(`Failed to insert subscription: ${errorText}`)
        } else {
          console.log(`Subscription created for user ${userId}: ${subscriptionId}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`)

        // Update subscription status in database
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/bfw_subscriptions?stripe_subscription_id=eq.${subscription.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              status: subscription.status,
              updated_at: new Date().toISOString()
            })
          }
        )

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text()
          console.error(`Failed to update subscription: ${errorText}`)
        } else {
          console.log(`Subscription ${subscription.id} updated to status: ${subscription.status}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`Subscription deleted: ${subscription.id}`)

        // Mark subscription as cancelled in database
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/bfw_subscriptions?stripe_subscription_id=eq.${subscription.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
          }
        )

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text()
          console.error(`Failed to mark subscription as cancelled: ${errorText}`)
        } else {
          console.log(`Subscription ${subscription.id} marked as cancelled`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error in stripe-webhook:', error)
    return new Response(
      JSON.stringify({
        error: {
          code: 'WEBHOOK_ERROR',
          message: error.message || 'Webhook processing failed',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
