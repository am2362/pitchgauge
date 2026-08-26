import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { validateBulkAnalysisInput, sanitizeErrorMessage } from '../_shared/validation.ts';
import { corsHeaders, secureJsonResponse, secureErrorResponse, safeLog, getUserTier, checkDailyLimit, isAdminUser, isDemoAccountEmail } from '../_shared/security.ts';
import {
  CHECKLIST_SYSTEM_INSTRUCTION,
  METRIC_KEYS,
  aggregateRuns,
  extractJson,
  normalizeRun,
  reasoningFromAggregate,
  scoresFromAggregate,
  type PerMetricResponse,
} from '../_shared/scoring-checklist.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    safeLog("BULK-ANALYSIS", "Function started");

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return secureErrorResponse('Unauthorized', 401);
    }

    // Verify token claims
    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    const userId = userData?.user?.id;

    if (userError || !userId) {
      return secureErrorResponse('Unauthorized', 401);
    }

    safeLog("BULK-ANALYSIS", "User authenticated");

    const userEmail = userData?.user?.email;
    const isDemo = isDemoAccountEmail(userEmail);

    // Subscription tier enforcement - bulk analysis requires scale tier (demo accounts bypass)
    if (SERVICE_ROLE_KEY) {
      const admin = await isAdminUser(userId, SUPABASE_URL!, SERVICE_ROLE_KEY);
      if (!admin && !isDemo) {
        let tier = await getUserTier(userId, SUPABASE_URL!, SERVICE_ROLE_KEY);

        // Fallback to authenticated lookup to avoid false 403s from admin-side lookup edge cases.
        if (tier !== 'scale') {
          const { data: ownSubscription } = await supabaseAuth
            .from('subscriptions')
            .select('tier, status, updated_at')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const authTier = typeof ownSubscription?.tier === 'string'
            ? ownSubscription.tier.trim().toLowerCase()
            : 'free';

          if (authTier === 'scale') {
            tier = 'scale';
          }
        }

        if (tier !== 'scale') {
          safeLog("BULK-ANALYSIS", "Non-scale tier denied");
          return secureErrorResponse('This feature requires a Scale subscription.', 403);
        }
      } else {
        safeLog("BULK-ANALYSIS", admin ? "Admin user - bypassing tier check" : "Demo user - bypassing tier check");
      }

      // Parse body early to determine if this is a new batch or a continuation chunk.
      // We peek at appendResults — daily limit only applies to NEW batch starts (first chunk).
      // This prevents the limit from triggering 50+ times within a single batch run.
    }

    // Prefer the Lovable AI gateway for stability
    const useGeminiDirect = true;
    
    if (!useGeminiDirect && !LOVABLE_API_KEY) {
      throw new Error('Service configuration error');
    }

    // Parse and validate input using schema validation
    const body = await req.json();
    const validation = validateBulkAnalysisInput(body, 100, 50000, 200);
    
    if (!validation.success) {
      return secureErrorResponse(validation.error || 'Invalid input', 400);
    }

    const { batchId, startups, batchSize = useGeminiDirect ? 3 : 1, appendResults = false } = validation.data!;

    // Daily limit check: only for the FIRST chunk of a new batch (appendResults=false).
    // Continuation chunks (appendResults=true) are part of an already-counted job.
    // Admin users bypass daily limits entirely.
    if (!appendResults && SERVICE_ROLE_KEY) {
      const adminForLimit = await isAdminUser(userId, SUPABASE_URL!, SERVICE_ROLE_KEY);
      if (!adminForLimit) {
        const dailyCheck = await checkDailyLimit(userId, 'scale', 'bulk_analysis', SUPABASE_URL!, SERVICE_ROLE_KEY, userEmail);
        if (!dailyCheck.allowed) {
          safeLog("BULK-ANALYSIS", "Daily limit reached", { current: dailyCheck.current, limit: dailyCheck.limit });
          return secureErrorResponse('Daily limit reached. Resets at midnight UTC.', 429);
        }

        // Record this bulk job as one usage event (only on first chunk)
        const supabaseAdminClient = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY, {
          auth: { persistSession: false },
        });
        await supabaseAdminClient.from('usage_tracking').insert({
          user_id: userId,
          action_type: 'bulk_analysis',
        });
        safeLog("BULK-ANALYSIS", "Recorded bulk_analysis usage");
      }
    }

    // Verify batch ownership before processing
    let existingResults: any[] = [];
    if (batchId) {
      const { data: batch, error: batchError } = await supabaseAuth
        .from('bulk_analyses')
        .select('id, user_id, results')
        .eq('id', batchId)
        .eq('user_id', userId)
        .single();

      if (batchError || !batch) {
        return secureErrorResponse('Batch not found or unauthorized', 403);
      }

      // If appending, get existing results
      if (appendResults && batch.results) {
        existingResults = batch.results as any[];
        safeLog("BULK-ANALYSIS", "Append mode", { existingCount: existingResults.length });
      }
    }

    safeLog("BULK-ANALYSIS", "Processing startups", { count: startups.length, batchSize });

    // Use authenticated client throughout - RLS policies enforce ownership
    const allResults: any[] = [];

    // Process in batches to avoid rate limits
    for (let i = 0; i < startups.length; i += batchSize) {
      const batch = startups.slice(i, i + batchSize);
      safeLog("BULK-ANALYSIS", "Processing batch", { batchNum: Math.floor(i / batchSize) + 1 });

      const batchPromises = batch.map(async (startup) => {
        try {
          const result = await analyzeStartup(
            startup.name,
            startup.pitch,
            useGeminiDirect ? GEMINI_API_KEY! : LOVABLE_API_KEY!,
            useGeminiDirect,
          );
          return result;
        } catch (error) {
          safeLog("BULK-ANALYSIS", "Startup analysis failed", { startup: startup.name });
          const kind = (error as any)?.kind;
          const status = (error as any)?.status;
          return {
            startupName: startup.name,
            errorType: kind === 'rate_limited' ? 'rate_limited' : 'ai_error',
            errorStatus: typeof status === 'number' ? status : null,
            errorMessage: kind === 'rate_limited' ? 'Rate limited' : 'Analysis failed',
            error: 'Analysis failed',
            sector: 'Unknown',
            tags: [],
            metrics: {
              team: 'Analysis failed',
              product: 'Analysis failed',
              market: 'Analysis failed',
              traction: 'Analysis failed',
              funding: 'Analysis failed',
              businessModel: 'Analysis failed'
            },
            scores: {
              team: 0,
              product: 0,
              market: 0,
              traction: 0,
              funding: 0,
              businessModel: 0,
              overall: 0
            },
            summary: 'Failed to analyze this startup'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults);

      // Append results incrementally using the new DB function
      if (batchId && batchResults.length > 0) {
        const { error: appendErr } = await supabaseAuth.rpc('append_bulk_analysis_results', {
          p_batch_id: batchId,
          p_results: batchResults
        });
        if (appendErr) {
          safeLog("BULK-ANALYSIS", "Append results error");
        }
      }

      // Add delay between batches to reduce rate-limit pressure
      if (i + batchSize < startups.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    safeLog("BULK-ANALYSIS", "Processing complete", { totalProcessed: allResults.length });

    return secureJsonResponse({ results: allResults, totalProcessed: allResults.length });

  } catch (error) {
    safeLog("BULK-ANALYSIS", "Error occurred");
    
    // Sanitize error message before returning to client
    const userMessage = sanitizeErrorMessage(error);
    
    return secureErrorResponse(userMessage, 500);
  }
});

const MAX_RETRIES = 5;
const RETRY_BACKOFF_MS = [3000, 6000, 12000, 24000, 48000];
const RUNS_PER_PITCH = 3;

const BULK_META_INSTRUCTION = `You are also extracting minimal metadata about the pitch. In addition to the checklist JSON, include these top-level fields:
- "sector": primary sector (e.g., "FinTech", "HealthTech", "SaaS")
- "tags": array of 1-4 short technology/segment tags
- "summary": 1-3 sentence factual summary (what they do, target market, key differentiator)

Return ONLY one JSON object combining the checklist output and these metadata fields.`;

async function analyzeStartup(name: string, pitch: string, apiKey: string, useGeminiDirect = false): Promise<any> {
  // Fire RUNS_PER_PITCH parallel runs; aggregate checklists by median.
  const runPromises = Array.from({ length: RUNS_PER_PITCH }, () =>
    attemptAnalysis(name, pitch, apiKey, useGeminiDirect).catch((e) => ({ __error: e })),
  );
  const settled = await Promise.all(runPromises);

  const successful = settled.filter((r: any) => r && !r.__error);
  if (successful.length === 0) {
    // All failed — retry the first one with backoff to trigger existing retry policy.
    throw (settled[0] as any)?.__error ?? new Error('All scoring runs failed');
  }

  const runs: PerMetricResponse[] = successful.map((r: any) => r.perMetric);
  const aggregate = aggregateRuns(runs);
  const scoresByKey = scoresFromAggregate(aggregate);
  const reasoningByKey = reasoningFromAggregate(aggregate);

  // Take metadata from the first successful run.
  const first: any = successful[0];

  // Map internal metric keys → bulk output shape (funding = competitiveLandscape).
  const scores = {
    team: scoresByKey.team,
    market: scoresByKey.marketSize,
    product: scoresByKey.productDifferentiation,
    traction: scoresByKey.traction,
    businessModel: scoresByKey.businessModel,
    funding: scoresByKey.competitiveLandscape,
    overall: 0,
  };
  const vals = [scores.team, scores.market, scores.product, scores.traction, scores.businessModel, scores.funding];
  scores.overall = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);

  const metrics = {
    team: reasoningByKey.team,
    market: reasoningByKey.marketSize,
    product: reasoningByKey.productDifferentiation,
    traction: reasoningByKey.traction,
    businessModel: reasoningByKey.businessModel,
    funding: reasoningByKey.competitiveLandscape,
  };

  return {
    startupName: name,
    sector: typeof first.sector === 'string' && first.sector.trim() ? first.sector.trim() : 'Unknown',
    tags: Array.isArray(first.tags) ? first.tags.slice(0, 4).map((t: any) => String(t)) : [],
    metrics,
    scores,
    summary: typeof first.summary === 'string' ? first.summary : '',
  };
}

async function attemptAnalysis(name: string, pitch: string, apiKey: string, useGeminiDirect = false): Promise<any> {
  const systemPrompt = `${CHECKLIST_SYSTEM_INSTRUCTION}\n\n${BULK_META_INSTRUCTION}`;

  let response: Response | null = null;
  let lastError: any = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (useGeminiDirect) {
        const prompt = `${systemPrompt}\n\nStartup Name: ${name}\n\nPitch:\n${pitch}`;
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, topP: 1 },
          }),
        });
      } else {
        response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Startup Name: ${name}\n\nPitch:\n${pitch}` },
            ],
            max_tokens: 2500,
            temperature: 0,
            top_p: 1,
          }),
        });
      }

      if (!response.ok) {
        const status = response.status;
        const err = new Error(`AI service error: ${status}`);
        (err as any).status = status;
        (err as any).kind = status === 429 ? 'rate_limited' : 'ai_error';
        throw err;
      }

      const data = await response.json();
      const responseParts = useGeminiDirect ? (data.candidates?.[0]?.content?.parts || []) : [];
      const content = useGeminiDirect
        ? responseParts.find((p: any) => !p.thought)?.text
        : data.choices?.[0]?.message?.content;

      if (!content) throw new Error('No content in AI response');

      const parsed = extractJson(content);
      const perMetric = normalizeRun(parsed);

      // Sanity: require at least one metric to have parsed checklist bits.
      const hasAny = METRIC_KEYS.some((k) => perMetric[k].checklist.length === 12);
      if (!hasAny) throw new Error('No valid checklist in response');

      return {
        perMetric,
        sector: parsed.sector,
        tags: parsed.tags,
        summary: parsed.summary,
      };
    } catch (error) {
      lastError = error;
      const status = (error as any)?.status;
      const isRetryable = [429, 500, 502, 503].includes(status) ||
        (error as Error)?.message?.includes('No content') ||
        (error as Error)?.message?.includes('JSON') ||
        (error as Error)?.message?.includes('checklist');

      if (attempt < MAX_RETRIES && isRetryable) {
        const delay = RETRY_BACKOFF_MS[attempt] || 48000;
        safeLog("BULK-ANALYSIS", "Retrying", { startup: name, attempt: attempt + 1, delay });
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error('Max retries exhausted');
}
