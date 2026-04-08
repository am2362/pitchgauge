// Shared security utilities for edge functions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

// Security response headers
export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

// CORS headers combined with security headers
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  ...securityHeaders,
};

// Maximum request payload size (50KB)
export const MAX_PAYLOAD_SIZE = 50 * 1024;

// Rate limit: 60 requests per user per hour
export const RATE_LIMIT_PER_HOUR = 60;

/**
 * Check if request payload exceeds maximum size
 * Returns true if payload is too large
 */
export function isPayloadTooLarge(contentLength: string | null, body?: string): boolean {
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!isNaN(size) && size > MAX_PAYLOAD_SIZE) {
      return true;
    }
  }
  if (body && body.length > MAX_PAYLOAD_SIZE) {
    return true;
  }
  return false;
}

/**
 * Create a JSON response with security headers
 */
export function secureJsonResponse(
  data: unknown,
  status = 200,
  additionalHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...additionalHeaders,
    },
  });
}

/**
 * Create an error response with security headers
 */
export function secureErrorResponse(
  message: string,
  status = 500
): Response {
  return secureJsonResponse({ error: message }, status);
}

/**
 * Strip HTML tags from text and limit length
 * Used to sanitize user input before processing
 */
export function sanitizeText(text: string, maxLength = 10000): string {
  // Remove HTML/XML tags
  let sanitized = text.replace(/<[^>]*>?/gm, '');
  // Remove script content that might have been inside tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  return sanitized.trim();
}

/**
 * Check rate limit for a user using the usage_tracking table
 * Returns true if user is within rate limit, false if exceeded
 */
export async function checkRateLimit(
  userId: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<{ allowed: boolean; count: number }> {
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Count requests in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { count, error } = await supabaseAdmin
      .from('usage_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo)
      .not('action_type', 'like', 'rate_limit_%');

    if (error) {
      // On error, allow the request but log
      console.error('[RATE-LIMIT] Error checking rate limit');
      return { allowed: true, count: 0 };
    }

    const currentCount = count || 0;
    return {
      allowed: currentCount < RATE_LIMIT_PER_HOUR,
      count: currentCount,
    };
  } catch (error) {
    // On error, allow the request
    console.error('[RATE-LIMIT] Exception checking rate limit');
    return { allowed: true, count: 0 };
  }
}

/**
 * Record a rate limit event for a user
 */
export async function recordRateLimitEvent(
  userId: string,
  actionType: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<void> {
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    await supabaseAdmin.from('usage_tracking').insert({
      user_id: userId,
      action_type: `rate_limit_${actionType}`,
    });
  } catch (error) {
    // Silent fail for rate limit recording
    console.error('[RATE-LIMIT] Failed to record event');
  }
}

/**
 * Redact sensitive information from logs
 */
export function redactSensitive(value: string | undefined | null): string {
  if (!value) return '[none]';
  if (value.length <= 8) return '[redacted]';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

/**
 * Safe logging function that redacts sensitive data
 */
export function safeLog(prefix: string, step: string, details?: Record<string, unknown>): void {
  const safeDetails = details ? { ...details } : undefined;
  
  // Redact known sensitive fields
  if (safeDetails) {
    const sensitiveFields = ['email', 'customerId', 'customer_id', 'priceId', 'price_id', 'userId', 'user_id'];
    for (const field of sensitiveFields) {
      if (field in safeDetails) {
        safeDetails[field] = '[redacted]';
      }
    }
  }
  
  console.log(`[${prefix}] ${step}${safeDetails ? ` - ${JSON.stringify(safeDetails)}` : ''}`);
}

/**
 * Check user subscription tier server-side.
 * Returns the tier string or null if lookup fails.
 */
export async function getUserTier(
  userId: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<string> {
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('tier,status,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) return 'free';

    const normalizeTier = (value: unknown): 'free' | 'pro' | 'scale' => {
      if (typeof value !== 'string') return 'free';
      const normalized = value.trim().toLowerCase();
      if (normalized === 'scale' || normalized === 'pro' || normalized === 'free') {
        return normalized;
      }
      return 'free';
    };

    const active = data.find((row) => row.status === 'active');
    return normalizeTier((active ?? data[0])?.tier);
  } catch {
    return 'free';
  }
}

/**
 * Check if a user is an admin by looking up their email in the admin_users table.
 * Uses the service role to bypass RLS.
 */
export async function isAdminUser(
  userId: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<boolean> {
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Get user email from auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData?.user?.email) return false;

    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('email', userData.user.email)
      .maybeSingle();

    if (error) return false;
    return data !== null;
  } catch {
    return false;
  }
}

/**
 * Get monthly usage count for a user and action type (server-side).
 */
export async function getMonthlyUsageCount(
  userId: string,
  actionType: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<number> {
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const { count, error } = await supabaseAdmin
      .from('usage_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action_type', actionType)
      .gte('created_at', monthStart.toISOString());

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Get daily usage count for a user and action type (server-side).
 * Counts from midnight UTC of the current day.
 */
export async function getDailyUsageCount(
  userId: string,
  actionType: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<number> {
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count, error } = await supabaseAdmin
      .from('usage_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action_type', actionType)
      .gte('created_at', todayStart.toISOString());

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Daily usage limits per tier per feature.
 */
export const DAILY_LIMITS: Record<string, Record<string, number>> = {
  free:  { single_analysis: 3,   comparison_analysis: 0,  bulk_analysis: 0 },
  pro:   { single_analysis: 50,  comparison_analysis: 10, bulk_analysis: 0 },
  scale: { single_analysis: 100, comparison_analysis: 20, bulk_analysis: 3 },
};

/**
 * Check if a user has exceeded their daily limit for a given action type.
 * Returns { allowed, current, limit }.
 */
export async function checkDailyLimit(
  userId: string,
  tier: string,
  actionType: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const tierLimits = DAILY_LIMITS[tier] || DAILY_LIMITS['free'];
  const limit = tierLimits[actionType] ?? 0;

  if (limit === 0) {
    return { allowed: false, current: 0, limit: 0 };
  }

  const current = await getDailyUsageCount(userId, actionType, supabaseUrl, serviceRoleKey);
  return { allowed: current < limit, current, limit };
}
