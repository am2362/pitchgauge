import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { validateBulkAnalysisInput, sanitizeErrorMessage } from '../_shared/validation.ts';
import { corsHeaders, secureJsonResponse, secureErrorResponse, safeLog, getUserTier, checkDailyLimit } from '../_shared/security.ts';

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

    // Subscription tier enforcement - bulk analysis requires scale tier
    if (SERVICE_ROLE_KEY) {
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

      // Parse body early to determine if this is a new batch or a continuation chunk.
      // We peek at appendResults — daily limit only applies to NEW batch starts (first chunk).
      // This prevents the limit from triggering 50+ times within a single batch run.
    }

    // Prefer the Lovable AI gateway for stability
    const useGeminiDirect = false;
    
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
    if (!appendResults && SERVICE_ROLE_KEY) {
      const dailyCheck = await checkDailyLimit(userId, 'scale', 'bulk_analysis', SUPABASE_URL!, SERVICE_ROLE_KEY);
      if (!dailyCheck.allowed) {
        safeLog("BULK-ANALYSIS", "Daily limit reached", { current: dailyCheck.current, limit: dailyCheck.limit });
        return secureErrorResponse('Daily limit reached. Resets at midnight UTC.', 429);
      }

      // Record this bulk job as one usage event (only on first chunk)
      const supabaseAdmin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });
      await supabaseAdmin.from('usage_tracking').insert({
        user_id: userId,
        action_type: 'bulk_analysis',
      });
      safeLog("BULK-ANALYSIS", "Recorded bulk_analysis usage");
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

async function analyzeStartup(name: string, pitch: string, apiKey: string, useGeminiDirect = false): Promise<any> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await attemptAnalysis(name, pitch, apiKey, useGeminiDirect);
      return result;
    } catch (error) {
      const status = (error as any)?.status;
      const isRetryable = [429, 500, 502, 503].includes(status) ||
        (error as Error)?.message?.includes('No content') ||
        (error as Error)?.message?.includes('No valid JSON') ||
        (error as Error)?.message?.includes('JSON');
      
      if (attempt < MAX_RETRIES && isRetryable) {
        const delay = RETRY_BACKOFF_MS[attempt] || 48000;
        safeLog("BULK-ANALYSIS", "Retrying", { startup: name, attempt: attempt + 1, delay });
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // On non-retryable errors or exhausted retries, try Lovable gateway fallback
      if (useGeminiDirect) {
        const fallbackKey = Deno.env.get('LOVABLE_API_KEY');
        if (fallbackKey) {
          safeLog("BULK-ANALYSIS", "Falling back to Lovable AI gateway");
          return analyzeStartup(name, pitch, fallbackKey, false);
        }
      }
      
      throw error;
    }
  }
  throw new Error('Max retries exhausted');
}

async function attemptAnalysis(name: string, pitch: string, apiKey: string, useGeminiDirect = false): Promise<any> {
  const systemPrompt = `You are a consistent startup evaluation AI. Always apply the same scoring criteria strictly. Do not vary scores based on writing style or tone — evaluate only on substance. A pitch with identical facts must always receive identical scores.

You are analyzing a startup pitch. Extract structured information and be objective, concise, and deterministic.

EXTRACT:
1. KEY METRICS (be specific and factual):
   - Team: background, experience, relevant expertise
   - Product: stage, uniqueness, problem solved
   - Market: target size, TAM/SAM, growth potential
   - Traction: users, revenue, partnerships, growth metrics
   - Funding: amounts raised, investors, runway
   - Business Model: monetization strategy, pricing, scalability

2. SECTOR IDENTIFICATION:
   - Primary sector (FinTech, HealthTech, EdTech, E-commerce, SaaS, etc.)
   - Sub-sector/technology tags (AI, B2B, Mobile, Blockchain, etc.)

3. SCORES (1-10 integer, apply consistently):

SCORING RUBRIC:
General Scale:
- 1-3: Critical weakness / missing / fatal flaw (high risk of failure)
- 4-6: Mediocre / average / partial (uncompelling; needs major fixes)
- 7-8: Strong / good evidence (attractive, competitive)
- 9-10: Outstanding / exceptional (top decile, clear advantage)

Category-Specific Anchoring:
- Team: 1-3 no info/inexperienced/red flags; 4-6 some experience but gaps; 7/10 requires at minimum 2 founders with relevant domain experience and one prior startup or notable company background; 5/10 means founders have general business experience but no direct domain expertise or startup track record; 9-10 exceptional track record (serial founders with exits, deep domain authority)
- Product: 1-3 generic/no moat; 4-6 some features, easily replicable; 7/10 requires a clearly articulated unique value proposition with some form of defensibility (IP, data moat, network effects); 5/10 means the product solves a real problem but could be easily replicated; 9-10 defensible moat (patents, strong network effects, proprietary data)
- Market: 1-3 tiny TAM (<$500M)/shrinking; 4-6 decent but slow growth; 7/10 requires explicit mention of TAM >$10B with evidence of growth; 5/10 means market is $1B-$10B with no strong growth signals; 9-10 massive ($50B+ with tailwinds)
- Traction: 1-3 none/anecdotal; 4-6 early signals, not scaling; 7/10 requires demonstrated revenue or significant user growth with specific numbers; 5/10 means some early users or pilots but no clear growth trajectory; 9-10 explosive/validated PMF with strong unit economics
- Funding: 1-3 no funding/unclear use; 4-6 some funding but concerns; 7-8 well-funded with clear plan; 9-10 strong investors, efficient capital use
- Business Model: 1-3 unclear/unsustainable; 4-6 viable but thin margins; 7/10 requires a clearly scalable monetization strategy with evidence of unit economics; 5/10 means monetization path exists but margins or scalability are unproven; 9-10 proven, recurring, capital-efficient

MISSING DATA RULE: If the pitch provides NO information about a category, score it 1 with reasoning "No information provided in pitch." Do NOT infer, assume, or guess. Only score based on what is explicitly stated.

ALWAYS include reasoning explaining the exact score (e.g., why 5 not 6). Be brutally honest.

4. SUMMARY (1-3 sentences):
   - What they do + problem solved
   - Target market/users
   - Key differentiator

Return ONLY valid JSON with this structure:
{
  "startupName": "string",
  "sector": "string",
  "tags": ["tag1", "tag2"],
  "metrics": {
    "team": "string",
    "product": "string",
    "market": "string",
    "traction": "string",
    "funding": "string",
    "businessModel": "string"
  },
  "scores": {
    "team": 0-10,
    "product": 0-10,
    "market": 0-10,
    "traction": 0-10,
    "funding": 0-10,
    "businessModel": 0-10,
    "overall": 0-10
  },
  "summary": "1-3 sentence summary"
}`;

  let response;
  
  if (useGeminiDirect) {
    // Direct Google Gemini API call
    const prompt = `${systemPrompt}\n\nStartup Name: ${name}\n\nPitch:\n${pitch}`;
    
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          topP: 1,
        }
      }),
    });
  } else {
    // Lovable AI Gateway (fallback)
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
          { role: 'user', content: `Startup Name: ${name}\n\nPitch:\n${pitch}` }
        ],
        max_tokens: 2000,
        temperature: 0.1,
        top_p: 1
      }),
    });
  }

  if (!response.ok) {
    const errorStatus = response.status;
    safeLog("BULK-ANALYSIS", "AI API error", { status: errorStatus });
    const err = new Error(`AI service error: ${errorStatus}`);
    (err as any).status = errorStatus;
    throw err;
  }

  const data = await response.json();
  
  // Parse response based on API type
  let content: string;
  if (useGeminiDirect) {
    content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  } else {
    content = data.choices?.[0]?.message?.content;
  }

  if (!content) {
    throw new Error('No content in AI response');
  }

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in response');
  }

  const result = JSON.parse(jsonMatch[0]);
  
  // Ensure startupName matches input
  result.startupName = name;
  
  return result;
}
