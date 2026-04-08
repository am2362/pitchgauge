import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { sanitizeErrorMessage } from '../_shared/validation.ts';
import { corsHeaders, secureJsonResponse, secureErrorResponse, isPayloadTooLarge, checkRateLimit, recordRateLimitEvent, safeLog, isAdminUser } from '../_shared/security.ts';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    safeLog("CREATE-CHECKOUT", "Function started");

    // Check payload size
    const contentLength = req.headers.get("content-length");
    if (isPayloadTooLarge(contentLength)) {
      return secureErrorResponse("Request payload too large", 413);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Service configuration error");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return secureErrorResponse('Unauthorized', 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error('Authentication error');
    const user = userData.user;
    if (!user?.email) throw new Error('User not authenticated');
    
    safeLog("CREATE-CHECKOUT", "User authenticated");

    // Rate limiting (skip for admins)
    const admin = await isAdminUser(user.id, SUPABASE_URL, SERVICE_ROLE_KEY);
    if (!admin) {
      const rateCheck = await checkRateLimit(user.id, SUPABASE_URL, SERVICE_ROLE_KEY);
      if (!rateCheck.allowed) {
        safeLog("CREATE-CHECKOUT", "Rate limit exceeded");
        return secureErrorResponse('Rate limit exceeded. Please try again later.', 429);
      }
      await recordRateLimitEvent(user.id, 'create_checkout', SUPABASE_URL, SERVICE_ROLE_KEY);
    }

    const bodyText = await req.text();
    if (isPayloadTooLarge(null, bodyText)) {
      return secureErrorResponse("Request payload too large", 413);
    }

    const { tier } = JSON.parse(bodyText);
    if (!tier || !["pro", "scale"].includes(tier)) {
      return secureErrorResponse("Invalid tier. Must be 'pro' or 'scale'.", 400);
    }

    const proPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
    const scalePriceId = Deno.env.get("STRIPE_SCALE_PRICE_ID");
    if (!proPriceId || !scalePriceId) throw new Error("Service configuration error");

    const priceId = tier === "pro" ? proPriceId : scalePriceId;
    safeLog("CREATE-CHECKOUT", "Creating checkout session", { tier });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      safeLog("CREATE-CHECKOUT", "Existing customer found");
    }

    const requestOrigin = req.headers.get("origin");
    const ALLOWED_ORIGINS = [
      "https://pitchgauge.lovable.app",
      "https://pitchgauge.com"
    ];

    if (!requestOrigin || (!ALLOWED_ORIGINS.includes(requestOrigin) && !requestOrigin.endsWith(".lovable.app") && !requestOrigin.startsWith("http://localhost:"))) {
      return secureErrorResponse("Forbidden: Invalid Origin", 403);
    }

    const baseUrl = "https://pitchgauge.lovable.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/billing`,
      metadata: { user_id: user.id, tier },
    });

    safeLog("CREATE-CHECKOUT", "Checkout session created");

    return secureJsonResponse({ url: session.url });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errType = error?.constructor?.name || 'Unknown';
    safeLog("CREATE-CHECKOUT", "Error occurred", { type: errType, message: errMsg });
    
    // Check for specific Stripe errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeErr = error as { type: string; code?: string; message?: string };
      safeLog("CREATE-CHECKOUT", "Stripe error details", { 
        stripeType: stripeErr.type, 
        stripeCode: stripeErr.code,
      });
    }
    
    const userMessage = sanitizeErrorMessage(error);
    return secureErrorResponse(userMessage, 500);
  }
});
