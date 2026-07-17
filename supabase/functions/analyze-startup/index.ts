import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { validatePitchInput, sanitizeErrorMessage } from '../_shared/validation.ts';
import { corsHeaders, secureJsonResponse, secureErrorResponse, checkRateLimit, recordRateLimitEvent, safeLog, getUserTier, checkDailyLimit, isAdminUser } from '../_shared/security.ts';
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    safeLog("ANALYZE-STARTUP", "Function started");

    // Check payload size — use higher limit (500KB) for analysis payloads
    const ANALYSIS_MAX_PAYLOAD = 500 * 1024;
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > ANALYSIS_MAX_PAYLOAD) {
      return secureErrorResponse("Request payload too large", 413);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const AI_GATEWAY_KEY = LOVABLE_API_KEY || GEMINI_API_KEY;
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

    safeLog("ANALYZE-STARTUP", "User authenticated");

    // Subscription tier enforcement + daily limits
    if (SERVICE_ROLE_KEY) {
      // Admin users bypass all limits
      const admin = await isAdminUser(userId, SUPABASE_URL!, SERVICE_ROLE_KEY);
      if (!admin) {
        const tier = await getUserTier(userId, SUPABASE_URL!, SERVICE_ROLE_KEY);
        const userEmail = userData?.user?.email;

        const dailyCheck = await checkDailyLimit(userId, tier, 'single_analysis', SUPABASE_URL!, SERVICE_ROLE_KEY, userEmail);
        if (!dailyCheck.allowed) {
          safeLog("ANALYZE-STARTUP", "Daily limit reached", { tier, current: dailyCheck.current, limit: dailyCheck.limit });
          return secureErrorResponse('Daily limit reached. Resets at midnight UTC.', 429);
        }

        // Record single_analysis usage for daily limit tracking
        const supabaseAdmin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY, {
          auth: { persistSession: false },
        });
        await supabaseAdmin.from('usage_tracking').insert({
          user_id: userId,
          action_type: 'single_analysis',
        });

        // Rate limiting
        const rateCheck = await checkRateLimit(userId, SUPABASE_URL!, SERVICE_ROLE_KEY);
        if (!rateCheck.allowed) {
          safeLog("ANALYZE-STARTUP", "Rate limit exceeded");
          return secureErrorResponse('Rate limit exceeded. Please try again later.', 429);
        }
        await recordRateLimitEvent(userId, 'analyze_startup', SUPABASE_URL!, SERVICE_ROLE_KEY);
      } else {
        safeLog("ANALYZE-STARTUP", "Admin user - bypassing all limits");
      }
    }

    if (!AI_GATEWAY_KEY) {
      throw new Error("Service configuration error");
    }

    const contentType = req.headers.get("content-type") || "";

    // Handle text input only (PDF parsing not supported)
    if (contentType.includes("multipart/form-data")) {
      return secureErrorResponse(
        "PDF upload is not currently supported. Please copy and paste the text content of your pitch instead.",
        400
      );
    }
    
    // Parse and validate input using schema validation
    const bodyText = await req.text();
    if (bodyText.length > ANALYSIS_MAX_PAYLOAD) {
      return secureErrorResponse("Request payload too large", 413);
    }

    const body = JSON.parse(bodyText);
    const validation = validatePitchInput(body, 50000);
    
    if (!validation.success) {
      return secureErrorResponse(validation.error || 'Invalid input', 400);
    }

    const { text: pitchText } = validation.data!;
    safeLog("ANALYZE-STARTUP", "Analyzing pitch", { textLength: pitchText.length });

    // ==========================================================
    // Deterministic scoring: 3 parallel checklist runs (temp=0)
    // + 1 qualitative run for memo / redFlags / follow-ups / etc.
    // Scores are derived server-side from median checklist yes-counts.
    // ==========================================================
    const RUNS_PER_PITCH = 3;

    const runChecklist = async (): Promise<PerMetricResponse | null> => {
      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${AI_GATEWAY_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            max_tokens: 3000,
            temperature: 0,
            top_p: 1,
            messages: [
              { role: "system", content: CHECKLIST_SYSTEM_INSTRUCTION },
              { role: "user", content: pitchText },
            ],
          }),
        });
        if (!resp.ok) {
          const err = new Error(`AI service error: ${resp.status}`);
          (err as any).status = resp.status;
          throw err;
        }
        const j = await resp.json();
        const content = j.choices?.[0]?.message?.content as string | undefined;
        if (!content) return null;
        return normalizeRun(extractJson(content));
      } catch (e) {
        safeLog("ANALYZE-STARTUP", "Checklist run failed", { msg: (e as Error)?.message });
        return null;
      }
    };

    const qualitativePrompt = `You are a deterministic startup pitch analysis engine. Return ONLY valid JSON — no markdown.

Return this exact JSON shape (do NOT include any score numbers — scoring is handled separately):
{
  "startupName": "Extract the company name from the pitch. Use null only if impossible.",
  "memo": "2-3 sentence executive summary: strongest aspect, biggest risk, whether worth diligence.",
  "detailedExplanations": {
    "team": "2 factual sentences about the team based ONLY on the pitch.",
    "marketSize": "2 factual sentences about the market based ONLY on the pitch.",
    "traction": "2 factual sentences about traction based ONLY on the pitch.",
    "productDifferentiation": "2 factual sentences about product differentiation.",
    "businessModel": "2 factual sentences about the business model.",
    "competitiveLandscape": "2 factual sentences about competitive landscape."
  },
  "redFlags": [ { "severity": "critical|high|medium", "issue": "Brief title", "explanation": "1 factual sentence" } ],
  "followUpQuestions": {
    "team": ["question 1", "question 2"],
    "market": ["question 1", "question 2"],
    "product": ["question 1", "question 2"],
    "financials": ["question 1", "question 2"],
    "legal": ["question 1"]
  },
  "investmentThesis": { "bullCase": "2-3 factual sentences", "bearCase": "2-3 factual sentences" },
  "benchmarking": { "overallPercentile": "e.g., Top 25%", "stageContext": "1 sentence", "comparisonNotes": "1 sentence" }
}

RULES: factual, no invention, no emojis, no bullets, no scores.`;

    const runQualitative = async (): Promise<any> => {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${AI_GATEWAY_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          max_tokens: 6000,
          temperature: 0,
          top_p: 1,
          messages: [
            { role: "system", content: qualitativePrompt },
            { role: "user", content: pitchText },
          ],
        }),
      });
      if (!resp.ok) {
        const err = new Error(`AI service error: ${resp.status}`);
        (err as any).status = resp.status;
        throw err;
      }
      const j = await resp.json();
      const content = j.choices?.[0]?.message?.content as string | undefined;
      if (!content) throw new Error("No content in AI response");
      return extractJson(content);
    };

    const [checklistRuns, qualitativeResult] = await Promise.all([
      Promise.all(Array.from({ length: RUNS_PER_PITCH }, runChecklist)),
      runQualitative(),
    ]);

    const successfulRuns = checklistRuns.filter((r): r is PerMetricResponse => r !== null);
    if (successfulRuns.length === 0) {
      safeLog("ANALYZE-STARTUP", "All checklist runs failed");
      return secureErrorResponse('Failed to analyze pitch. Please try again.', 500);
    }

    const aggregate = aggregateRuns(successfulRuns);
    const scores = scoresFromAggregate(aggregate);
    const reasoning = reasoningFromAggregate(aggregate);

    const detailed = qualitativeResult?.detailedExplanations || {};
    const scorecard: Record<string, { score: number; reasoning: string; detailedExplanation: string }> = {} as any;
    for (const key of METRIC_KEYS) {
      scorecard[key] = {
        score: scores[key],
        reasoning: reasoning[key],
        detailedExplanation: typeof detailed[key] === 'string' ? detailed[key] : '',
      };
    }

    const analysisResult = {
      startupName: qualitativeResult?.startupName ?? null,
      memo: qualitativeResult?.memo ?? '',
      scorecard,
      redFlags: Array.isArray(qualitativeResult?.redFlags) ? qualitativeResult.redFlags : [],
      followUpQuestions: qualitativeResult?.followUpQuestions ?? {
        team: [], market: [], product: [], financials: [], legal: [],
      },
      investmentThesis: qualitativeResult?.investmentThesis ?? { bullCase: '', bearCase: '' },
      benchmarking: qualitativeResult?.benchmarking ?? {
        overallPercentile: '', stageContext: '', comparisonNotes: '',
      },
    };

    if (!analysisResult.memo || !analysisResult.scorecard) {
      throw new Error('Invalid response structure');
    }

    safeLog("ANALYZE-STARTUP", "Analysis complete", { runs: successfulRuns.length });
    return secureJsonResponse(analysisResult);

  } catch (error) {
    safeLog("ANALYZE-STARTUP", "Error occurred");
    const status = (error as any)?.status;
    if (status === 429) return secureErrorResponse('Rate limit exceeded. Please try again in a moment.', 429);
    if (status === 402) return secureErrorResponse('AI usage limit reached. Please try again later.', 402);
    const userMessage = sanitizeErrorMessage(error);
    return secureErrorResponse(userMessage, 500);
  }
});
