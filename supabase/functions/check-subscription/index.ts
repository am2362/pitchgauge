import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { sanitizeErrorMessage } from '../_shared/validation.ts';
import { corsHeaders, secureJsonResponse, secureErrorResponse, checkRateLimit, recordRateLimitEvent, safeLog } from '../_shared/security.ts';

type Tier = "free" | "pro" | "scale";

type SubscriptionPayload = {
  tier: Tier;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
};

const PRO_MONTHLY_FLOOR = 3900; // $39.00 in cents
const SCALE_MONTHLY_FLOOR = 9900; // $99.00 in cents

const toMonthlyAmount = (price: Stripe.Price | null | undefined): number | null => {
  if (!price?.unit_amount || !price.recurring?.interval) return null;

  const amount = price.unit_amount;
  const interval = price.recurring.interval;
  const intervalCount = price.recurring.interval_count || 1;

  if (interval === "month") return amount / intervalCount;
  if (interval === "year") return amount / (12 * intervalCount);
  if (interval === "week") return amount * (52 / 12) / intervalCount;
  if (interval === "day") return amount * (365 / 12) / intervalCount;
  return null;
};

const inferTierFromText = (value: string | null | undefined): Tier | null => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized.includes("scale") || normalized.includes("enterprise")) return "scale";
  if (normalized.includes("pro") || normalized.includes("premium")) return "pro";
  return null;
};

const inferTierFromPriceMetadata = async (
  stripe: Stripe,
  currentPrice: Stripe.Price | undefined,
): Promise<Tier | null> => {
  if (!currentPrice?.id) return null;

  try {
    const hydrated = await stripe.prices.retrieve(currentPrice.id, { expand: ["product"] });
    const product = typeof hydrated.product === "object" ? hydrated.product : null;

    const candidates = [
      hydrated.lookup_key,
      hydrated.nickname,
      hydrated.metadata?.tier,
      product?.name,
      product?.metadata?.tier,
    ];

    for (const candidate of candidates) {
      const tier = inferTierFromText(candidate);
      if (tier) return tier;
    }
  } catch {
    safeLog("CHECK-SUBSCRIPTION", "Unable to infer tier from Stripe price metadata");
  }

  return null;
};

const resolveTier = async (
  stripe: Stripe,
  currentPrice: Stripe.Price | undefined,
  proPriceId: string | undefined,
  scalePriceId: string | undefined,
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<Tier> => {
  if (!currentPrice?.id) return "free";

  // Direct ID match first
  if (scalePriceId && currentPrice.id === scalePriceId) return "scale";
  if (proPriceId && currentPrice.id === proPriceId) return "pro";

  // Metadata/name lookup fallback to support legacy or renamed pricing setups
  const inferredTier = await inferTierFromPriceMetadata(stripe, currentPrice);
  if (inferredTier) return inferredTier;

  // Load configured canonical prices for robust matching (product + amount)
  let proPrice: Stripe.Price | null = null;
  let scalePrice: Stripe.Price | null = null;

  try {
    const [proResult, scaleResult] = await Promise.all([
      proPriceId ? stripe.prices.retrieve(proPriceId) : Promise.resolve(null),
      scalePriceId ? stripe.prices.retrieve(scalePriceId) : Promise.resolve(null),
    ]);
    proPrice = proResult;
    scalePrice = scaleResult;
  } catch {
    safeLog("CHECK-SUBSCRIPTION", "Failed to load canonical Stripe prices");
  }

  const currentProduct = typeof currentPrice.product === "string" ? currentPrice.product : null;
  const proProduct = proPrice && typeof proPrice.product === "string" ? proPrice.product : null;
  const scaleProduct = scalePrice && typeof scalePrice.product === "string" ? scalePrice.product : null;

  // Product-level match handles multiple price IDs (monthly/annual/legacy) for same tier
  if (scaleProduct && currentProduct && currentProduct === scaleProduct) return "scale";
  if (proProduct && currentProduct && currentProduct === proProduct) return "pro";

  // Amount fallback (normalized to monthly) for legacy or migrated products
  const currentMonthly = toMonthlyAmount(currentPrice);
  const scaleMonthly = toMonthlyAmount(scalePrice);
  const proMonthly = toMonthlyAmount(proPrice);

  if (currentMonthly !== null && scaleMonthly !== null && currentMonthly >= scaleMonthly) return "scale";
  if (currentMonthly !== null && proMonthly !== null && currentMonthly >= proMonthly) return "pro";

  // Plan-floor fallback (independent from configured Stripe price IDs)
  // Prevents misclassification when env price IDs are outdated or point to legacy prices.
  if (currentMonthly !== null && currentMonthly >= SCALE_MONTHLY_FLOOR) return "scale";
  if (currentMonthly !== null && currentMonthly >= PRO_MONTHLY_FLOOR) return "pro";

  // Final fallback: preserve stored tier if already elevated
  const { data: existingSub } = await supabaseAdmin
    .from("subscriptions")
    .select("tier")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingSub?.tier === "scale") return "scale";
  if (existingSub?.tier === "pro") return "pro";
  return "pro";
};

const persistSubscription = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  payload: SubscriptionPayload,
) => {
  const { data: updatedRows, error: updateError } = await supabaseAdmin
    .from("subscriptions")
    .update(payload)
    .eq("user_id", userId)
    .select("id")
    .limit(1);

  if (updateError) throw updateError;
  if (updatedRows && updatedRows.length > 0) return;

  const { error: insertError } = await supabaseAdmin.from("subscriptions").insert({
    user_id: userId,
    ...payload,
  });

  if (insertError) throw insertError;
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

    // No rate limiting for check-subscription — it's a read-only polling endpoint

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 100 });

    if (customers.data.length === 0) {
      safeLog("CHECK-SUBSCRIPTION", "No Stripe customer found, setting free tier");
      await persistSubscription(supabaseAdmin, user.id, {
        tier: "free",
        status: "active",
        current_period_start: null,
        current_period_end: null,
      });

      return secureJsonResponse({ subscribed: false, tier: "free" });
    }

    safeLog("CHECK-SUBSCRIPTION", "Found Stripe customers", { customerCount: customers.data.length });

    const subscriptionLists = await Promise.all(
      customers.data.map((customer) =>
        stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 10,
        }),
      ),
    );

    const activeSubscriptions = subscriptionLists.flatMap((entry) => entry.data);

    if (activeSubscriptions.length === 0) {
      safeLog("CHECK-SUBSCRIPTION", "No active subscription, setting free tier");
      await persistSubscription(supabaseAdmin, user.id, {
        tier: "free",
        status: "active",
        current_period_start: null,
        current_period_end: null,
      });

      return secureJsonResponse({ subscribed: false, tier: "free" });
    }

    const tierRank: Record<Tier, number> = { free: 0, pro: 1, scale: 2 };
    let best: { tier: Tier; subscription: Stripe.Subscription } | null = null;

    for (const subscription of activeSubscriptions) {
      const currentPrice = subscription.items.data[0]?.price;
      const resolvedTier = await resolveTier(
        stripe,
        currentPrice,
        proPriceId ?? undefined,
        scalePriceId ?? undefined,
        supabaseAdmin,
        user.id,
      );

      if (!best) {
        best = { tier: resolvedTier, subscription };
        continue;
      }

      const isHigherTier = tierRank[resolvedTier] > tierRank[best.tier];
      const isSameTierWithLaterPeriod =
        tierRank[resolvedTier] === tierRank[best.tier] &&
        (subscription.current_period_end ?? 0) > (best.subscription.current_period_end ?? 0);

      if (isHigherTier || isSameTierWithLaterPeriod) {
        best = { tier: resolvedTier, subscription };
      }
    }

    const tier = best?.tier ?? "free";
    const selectedSubscription = best?.subscription ?? activeSubscriptions[0];

    const { data: existingSubscription } = await supabaseAdmin
      .from("subscriptions")
      .select("tier")
      .eq("user_id", user.id)
      .maybeSingle();

    const existingTier = (existingSubscription?.tier as Tier | undefined) ?? "free";
    const persistedTier =
      tierRank[existingTier] > tierRank[tier] ? existingTier : tier;

    // Safe date conversion: handle both unix timestamps and ISO strings
    const safeDateConvert = (val: unknown): string | null => {
      try {
        if (val == null) return null;
        if (typeof val === "number") return new Date(val * 1000).toISOString();
        if (typeof val === "string") return new Date(val).toISOString();
        return null;
      } catch { return null; }
    };

    const subscriptionEnd = safeDateConvert(selectedSubscription.current_period_end);
    const subscriptionStart = safeDateConvert(selectedSubscription.current_period_start);

    safeLog("CHECK-SUBSCRIPTION", "Active subscription found", {
      resolvedTier: tier,
      persistedTier,
    });

    await persistSubscription(supabaseAdmin, user.id, {
      tier: persistedTier,
      status: "active",
      current_period_start: subscriptionStart,
      current_period_end: subscriptionEnd,
    });

    return secureJsonResponse({
      subscribed: true,
      tier: persistedTier,
      subscription_end: subscriptionEnd,
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    safeLog("CHECK-SUBSCRIPTION", "Error occurred", { message: rawMessage });
    const userMessage = sanitizeErrorMessage(error);
    return secureErrorResponse(userMessage, 500);
  }
});
