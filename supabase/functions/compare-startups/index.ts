import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { validateCompareInput, sanitizeErrorMessage } from '../_shared/validation.ts';
import { corsHeaders, secureJsonResponse, secureErrorResponse, isPayloadTooLarge, checkRateLimit, recordRateLimitEvent, safeLog, getUserTier, checkDailyLimit } from '../_shared/security.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    safeLog("COMPARE-STARTUPS", "Function started");

    // Check payload size
    const contentLength = req.headers.get("content-length");
    if (isPayloadTooLarge(contentLength)) {
      return secureErrorResponse("Request payload too large", 413);
    }

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

    safeLog("COMPARE-STARTUPS", "User authenticated");

    // Subscription tier enforcement - compare requires pro or scale + daily limits
    if (SERVICE_ROLE_KEY) {
      const tier = await getUserTier(userId, SUPABASE_URL!, SERVICE_ROLE_KEY);
      if (tier === 'free') {
        safeLog("COMPARE-STARTUPS", "Free tier denied");
        return secureErrorResponse('This feature requires a Pro or Scale subscription.', 403);
      }

      const dailyCheck = await checkDailyLimit(userId, tier, 'comparison_analysis', SUPABASE_URL!, SERVICE_ROLE_KEY);
      if (!dailyCheck.allowed) {
        safeLog("COMPARE-STARTUPS", "Daily limit reached", { tier, current: dailyCheck.current, limit: dailyCheck.limit });
        return secureErrorResponse('Daily limit reached. Resets at midnight UTC.', 429);
      }

      // Record comparison_analysis usage for daily limit tracking
      const supabaseAdmin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });
      await supabaseAdmin.from('usage_tracking').insert({
        user_id: userId,
        action_type: 'comparison_analysis',
      });

      // Rate limiting
      const rateCheck = await checkRateLimit(userId, SUPABASE_URL!, SERVICE_ROLE_KEY);
      if (!rateCheck.allowed) {
        safeLog("COMPARE-STARTUPS", "Rate limit exceeded");
        return secureErrorResponse('Rate limit exceeded. Please try again later.', 429);
      }
      await recordRateLimitEvent(userId, 'compare_startups', SUPABASE_URL!, SERVICE_ROLE_KEY);
    }

    // Parse and validate input using schema validation
    const bodyText = await req.text();
    if (isPayloadTooLarge(null, bodyText)) {
      return secureErrorResponse("Request payload too large", 413);
    }

    const body = JSON.parse(bodyText);
    const validation = validateCompareInput(body, 10);
    
    if (!validation.success) {
      return secureErrorResponse(validation.error || 'Invalid input', 400);
    }

    const { analyses, startupNames } = validation.data!;

    if (!LOVABLE_API_KEY) {
      throw new Error('Service configuration error');
    }

    safeLog("COMPARE-STARTUPS", "Comparing startups", { count: startupNames.length });

    // Calculate rankings mathematically from scores
    const scoreKeys = ['team', 'marketSize', 'traction', 'productDifferentiation', 'businessModel', 'competitiveLandscape'];
    const startupScores = analyses.map((analysis: any, idx: number) => {
      const avg = scoreKeys.reduce((sum, key) => sum + (analysis.scorecard[key]?.score || 0), 0) / scoreKeys.length;
      return { name: startupNames[idx], avg: Math.round(avg * 10) / 10 };
    });
    startupScores.sort((a: any, b: any) => b.avg - a.avg);

    // Build comparison prompt - no ranking instructions for AI
    const comparisonPrompt = `You are a venture capital analyst. Compare the following startup analyses and provide qualitative insights only. Do NOT determine rankings yourself. Do NOT include any ranking or rank field. Rankings will be calculated automatically from scores.

Startups being compared: ${startupNames.join(', ')}

${analyses.map((analysis: any, idx: number) => `
=== ${startupNames[idx]} ===
Team Score: ${analysis.scorecard.team.score}/10 - ${analysis.scorecard.team.reasoning}
Market Size: ${analysis.scorecard.marketSize.score}/10 - ${analysis.scorecard.marketSize.reasoning}
Traction: ${analysis.scorecard.traction.score}/10 - ${analysis.scorecard.traction.reasoning}
Product: ${analysis.scorecard.productDifferentiation.score}/10 - ${analysis.scorecard.productDifferentiation.reasoning}
Business Model: ${analysis.scorecard.businessModel.score}/10 - ${analysis.scorecard.businessModel.reasoning}
Competition: ${analysis.scorecard.competitiveLandscape.score}/10 - ${analysis.scorecard.competitiveLandscape.reasoning}

Red Flags: ${analysis.redFlags?.map((rf: any) => rf.flag).join('; ') || 'None'}
`).join('\n')}

Provide qualitative comparison insights ONLY in the following JSON structure (no rankings):
{
  "comparativeInsights": {
    "strengths": {
      "StartupName": "Key strengths relative to others"
    },
    "weaknesses": {
      "StartupName": "Key weaknesses relative to others"
    },
    "relativePerspective": "Overall comparative analysis (3-4 sentences)"
  },
  "investmentRecommendation": "Which startup(s) to invest in and why (3-4 sentences)"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a consistent startup evaluation AI. Always apply the same scoring criteria strictly. Do not vary scores based on writing style or tone — evaluate only on substance. A pitch with identical facts must always receive identical scores.

You are a venture capital analyst. Provide comparative analysis in valid JSON format only.

SCORE ANCHORING CONTEXT (use when interpreting and comparing scores):
- Team Quality: 7/10 requires at minimum 2 founders with relevant domain experience and one prior startup or notable company background. 5/10 means founders have general business experience but no direct domain expertise or startup track record.
- Market Size: 7/10 requires explicit mention of TAM >$10B with evidence of growth. 5/10 means market is $1B-$10B with no strong growth signals.
- Product Differentiation: 7/10 requires a clearly articulated unique value proposition with some form of defensibility (IP, data moat, network effects). 5/10 means the product solves a real problem but could be easily replicated.
- Traction: 7/10 requires demonstrated revenue or significant user growth with specific numbers. 5/10 means some early users or pilots but no clear growth trajectory.
- Business Model: 7/10 requires a clearly scalable monetization strategy with evidence of unit economics. 5/10 means monetization path exists but margins or scalability are unproven.
- Competitive Landscape: 7/10 requires clear differentiation from named competitors with defensible positioning. 5/10 means some competitive awareness but no strong moat.`
          },
          {
            role: 'user',
            content: comparisonPrompt
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorStatus = response.status;
      safeLog("COMPARE-STARTUPS", "AI API error", { status: errorStatus });
      
      if (errorStatus === 429) {
        return secureErrorResponse('Rate limit exceeded. Please try again in a moment.', 429);
      }
      
      if (errorStatus === 402) {
        return secureErrorResponse('AI usage limit reached. Please try again later.', 402);
      }
      
      throw new Error('AI service error');
    }

    const data = await response.json();
    let comparisonText = data.choices?.[0]?.message?.content || '';

    safeLog("COMPARE-STARTUPS", "AI response received");

    // Clean and parse JSON
    comparisonText = comparisonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let comparisonInsights;
    try {
      comparisonInsights = JSON.parse(comparisonText);
    } catch (parseError) {
      safeLog("COMPARE-STARTUPS", "JSON parse error");
      throw new Error('Failed to parse response. Please try again.');
    }

    // Validate structure
    if (!comparisonInsights.comparativeInsights) {
      throw new Error('Invalid response structure');
    }

    // Inject mathematically calculated rankings
    comparisonInsights.rankings = startupScores.map((s: any, idx: number) => ({
      startupName: s.name,
      rank: idx + 1,
      overallScore: s.avg,
      reasoning: comparisonInsights.comparativeInsights?.strengths?.[s.name] || '',
    }));

    safeLog("COMPARE-STARTUPS", "Comparison complete");
    return secureJsonResponse(comparisonInsights);

  } catch (error) {
    safeLog("COMPARE-STARTUPS", "Error occurred");
    
    // Sanitize error message before returning to client
    const userMessage = sanitizeErrorMessage(error);
    
    return secureErrorResponse(userMessage, 500);
  }
});
