import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const proPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
    const scalePriceId = Deno.env.get("STRIPE_SCALE_PRICE_ID");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found, setting free tier");
      await supabaseAdmin.from("subscriptions").update({
        tier: "free",
        status: "active",
        current_period_start: null,
        current_period_end: null,
      }).eq("user_id", user.id);

      return new Response(JSON.stringify({ subscribed: false, tier: "free" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription, setting free tier");
      await supabaseAdmin.from("subscriptions").update({
        tier: "free",
        status: "active",
        current_period_start: null,
        current_period_end: null,
      }).eq("user_id", user.id);

      return new Response(JSON.stringify({ subscribed: false, tier: "free" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const currentPriceId = subscription.items.data[0]?.price?.id;
    let tier = "free";
    if (currentPriceId === proPriceId) tier = "pro";
    else if (currentPriceId === scalePriceId) tier = "scale";
    else tier = "pro"; // fallback for unknown price

    // Safe date conversion: handle both unix timestamps and ISO strings
    const safeDateConvert = (val: unknown): string | null => {
      try {
        if (val == null) return null;
        if (typeof val === "number") return new Date(val * 1000).toISOString();
        if (typeof val === "string") return new Date(val).toISOString();
        return null;
      } catch { return null; }
    };

    const subscriptionEnd = safeDateConvert(subscription.current_period_end);
    const subscriptionStart = safeDateConvert(subscription.current_period_start);

    logStep("Active subscription found", { tier, subscriptionEnd });

    await supabaseAdmin.from("subscriptions").update({
      tier,
      status: "active",
      current_period_start: subscriptionStart,
      current_period_end: subscriptionEnd,
    }).eq("user_id", user.id);

    return new Response(JSON.stringify({
      subscribed: true,
      tier,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
