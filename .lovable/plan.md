

# Fix Stripe Price ID Secrets

## Problem
Both `STRIPE_PRO_PRICE_ID` and `STRIPE_SCALE_PRICE_ID` are currently set to Stripe **Product IDs** (`prod_...`) instead of **Price IDs** (`price_...`). Stripe Checkout requires `price_` prefixed IDs.

## How to Find Your Price IDs
1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click on your **Pro** product → scroll to the **Pricing** section → copy the ID starting with `price_`
3. Do the same for your **Scale** product

## Implementation
Once you have both `price_` IDs ready, I will:

1. Use the secret management tools to update **STRIPE_PRO_PRICE_ID** with your Pro price ID
2. Update **STRIPE_SCALE_PRICE_ID** with your Scale price ID

No code changes are needed — the edge functions already read these from environment variables.

## What I Need From You
Please share the two correct price IDs (starting with `price_`) for your Pro and Scale tiers.

