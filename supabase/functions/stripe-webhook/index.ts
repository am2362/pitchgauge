import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { securityHeaders } from '../_shared/security.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  ...securityHeaders,
};

const safeLog = (step: string, details?: Record<string, unknown>) => {
  // Redact sensitive fields
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    const sensitiveFields = ['customerId', 'customer_id', 'email', 'priceId', 'price_id', 'subscriptionId', 'subscription_id'];
    for (const field of sensitiveFields) {
      if (field in safeDetails) {
        safeDetails[field] = '[redacted]';
      }
    }
  }
  console.log(`[STRIPE-WEBHOOK] ${step}${safeDetails ? ` - ${JSON.stringify(safeDetails)}` : ''}`);
};

function safeDate(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number") return new Date(value * 1000).toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    safeLog("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey) throw new Error("Service configuration error");
    if (!webhookSecret) throw new Error("Service configuration error");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      safeLog("Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      safeLog("Webhook signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    safeLog("Event verified", { type: event.type });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const proPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
    const scalePriceId = Deno.env.get("STRIPE_SCALE_PRICE_ID");

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const tierFromMeta = session.metadata?.tier;

      if (!userId) {
        safeLog("No user_id in session metadata, skipping");
        return new Response(JSON.stringify({ received: true }), { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      safeLog("Checkout completed");

      // Retrieve the full subscription to get period dates and price
      const subscriptionId = session.subscription as string;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const currentPriceId = subscription.items.data[0]?.price?.id;

        let tier = tierFromMeta || "pro";
        if (currentPriceId === scalePriceId) tier = "scale";
        else if (currentPriceId === proPriceId) tier = "pro";

        const periodStart = safeDate(subscription.current_period_start);
        const periodEnd = safeDate(subscription.current_period_end);

        safeLog("Updating subscription", { tier });

        const { error } = await supabaseAdmin.from("subscriptions").update({
          tier,
          status: "active",
          current_period_start: periodStart,
          current_period_end: periodEnd,
        }).eq("user_id", userId);

        if (error) safeLog("DB update error");
        else safeLog("Subscription updated successfully");
      }
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Find user by looking up their email from Stripe customer
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        safeLog("Customer deleted, skipping");
        return new Response(JSON.stringify({ received: true }), { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const email = (customer as Stripe.Customer).email;
      if (!email) {
        safeLog("No email on customer, skipping");
        return new Response(JSON.stringify({ received: true }), { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find user in profiles by email
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (profile) {
        safeLog("Resetting to free tier");
        await supabaseAdmin.from("subscriptions").update({
          tier: "free",
          status: "active",
          current_period_start: null,
          current_period_end: null,
        }).eq("user_id", profile.id);
      }
    } else if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        return new Response(JSON.stringify({ received: true }), { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const email = (customer as Stripe.Customer).email;
      if (!email) {
        return new Response(JSON.stringify({ received: true }), { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (profile) {
        const currentPriceId = subscription.items.data[0]?.price?.id;
        let tier = "pro";
        if (currentPriceId === scalePriceId) tier = "scale";
        else if (currentPriceId === proPriceId) tier = "pro";

        const status = subscription.status === "active" ? "active" : subscription.status;
        const periodStart = safeDate(subscription.current_period_start);
        const periodEnd = safeDate(subscription.current_period_end);

        safeLog("Updating subscription from webhook", { tier, status });
        await supabaseAdmin.from("subscriptions").update({
          tier,
          status,
          current_period_start: periodStart,
          current_period_end: periodEnd,
        }).eq("user_id", profile.id);
      }
    } else {
      safeLog("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    safeLog("Error occurred");
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
