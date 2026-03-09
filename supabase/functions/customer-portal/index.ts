import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { sanitizeErrorMessage } from '../_shared/validation.ts';
import { corsHeaders, secureJsonResponse, secureErrorResponse, checkRateLimit, recordRateLimitEvent, safeLog } from '../_shared/security.ts';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    safeLog("CUSTOMER-PORTAL", "Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Service configuration error");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(
      SUPABASE_URL,
      SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return secureErrorResponse('Unauthorized', 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error('Authentication error');
    const user = userData.user;
    if (!user?.email) throw new Error('User not authenticated');
    
    safeLog("CUSTOMER-PORTAL", "User authenticated");

    // Rate limiting
    const rateCheck = await checkRateLimit(user.id, SUPABASE_URL, SERVICE_ROLE_KEY);
    if (!rateCheck.allowed) {
      safeLog("CUSTOMER-PORTAL", "Rate limit exceeded");
      return secureErrorResponse('Rate limit exceeded. Please try again later.', 429);
    }
    await recordRateLimitEvent(user.id, 'customer_portal', SUPABASE_URL, SERVICE_ROLE_KEY);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return secureErrorResponse("No subscription found. You may not have an active subscription.", 400);
    }

    const customerId = customers.data[0].id;
    safeLog("CUSTOMER-PORTAL", "Found Stripe customer");

    const requestOrigin = req.headers.get("origin");
    const ALLOWED_ORIGINS = [
      "https://pitchgauge.lovable.app",
      "https://pitchgauge.com"
    ];

    if (!requestOrigin || (!ALLOWED_ORIGINS.includes(requestOrigin) && !requestOrigin.endsWith(".lovable.app") && !requestOrigin.startsWith("http://localhost:"))) {
      return secureErrorResponse("Forbidden: Invalid Origin", 403);
    }

    const baseUrl = "https://pitchgauge.lovable.app";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/billing`,
    });

    safeLog("CUSTOMER-PORTAL", "Portal session created");

    return secureJsonResponse({ url: portalSession.url });
  } catch (error) {
    safeLog("CUSTOMER-PORTAL", "Error occurred");
    const userMessage = sanitizeErrorMessage(error);
    return secureErrorResponse(userMessage, 500);
  }
});
