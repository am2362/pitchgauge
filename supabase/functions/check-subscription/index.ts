import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { sanitizeErrorMessage } from '../_shared/validation.ts';
import { corsHeaders, secureJsonResponse, secureErrorResponse, checkRateLimit, recordRateLimitEvent, safeLog } from '../_shared/security.ts';

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
    safeLog("CHECK-SUBSCRIPTION", "Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Service configuration error");

    const proPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
    const scalePriceId = Deno.env.get("STRIPE_SCALE_PRICE_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return secureErrorResponse('Unauthorized', 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error('Authentication error');
    const user = userData.user;
    if (!user?.email) throw new Error('User not authenticated');
    
    safeLog("CHECK-SUBSCRIPTION", "User authenticated");

    // Rate limiting
    const rateCheck = await checkRateLimit(user.id, SUPABASE_URL, SERVICE_ROLE_KEY);
    if (!rateCheck.allowed) {
      safeLog("CHECK-SUBSCRIPTION", "Rate limit exceeded");
      return secureErrorResponse('Rate limit exceeded. Please try again later.', 429);
    }
    await recordRateLimitEvent(user.id, 'check_subscription', SUPABASE_URL, SERVICE_ROLE_KEY);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      safeLog("CHECK-SUBSCRIPTION", "No Stripe customer found, setting free tier");
      await supabaseAdmin.from("subscriptions").update({
        tier: "free",
        status: "active",
        current_period_start: null,
        current_period_end: null,
      }).eq("user_id", user.id);

      return secureJsonResponse({ subscribed: false, tier: "free" });
    }

    const customerId = customers.data[0].id;
    safeLog("CHECK-SUBSCRIPTION", "Found Stripe customer");

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      safeLog("CHECK-SUBSCRIPTION", "No active subscription, setting free tier");
      await supabaseAdmin.from("subscriptions").update({
        tier: "free",
        status: "active",
        current_period_start: null,
        current_period_end: null,
      }).eq("user_id", user.id);

      return secureJsonResponse({ subscribed: false, tier: "free" });
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

    safeLog("CHECK-SUBSCRIPTION", "Active subscription found", { tier });

    await supabaseAdmin.from("subscriptions").update({
      tier,
      status: "active",
      current_period_start: subscriptionStart,
      current_period_end: subscriptionEnd,
    }).eq("user_id", user.id);

    return secureJsonResponse({
      subscribed: true,
      tier,
      subscription_end: subscriptionEnd,
    });
  } catch (error) {
    safeLog("CHECK-SUBSCRIPTION", "Error occurred");
    const userMessage = sanitizeErrorMessage(error);
    return secureErrorResponse(userMessage, 500);
  }
});
