import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { validateBulkComparisonInput, sanitizeErrorMessage } from '../_shared/validation.ts';
import { corsHeaders, secureJsonResponse, secureErrorResponse, safeLog, getUserTier, isAdminUser, isDemoAccountEmail } from '../_shared/security.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    safeLog("BULK-COMPARISON", "Function started");

    // Bulk comparison payloads can be large (100 results with full metrics).
    // Use a generous 2MB limit instead of the default 50KB.
    const MAX_COMPARISON_PAYLOAD = 2 * 1024 * 1024;
    const contentLength = req.headers.get("content-length");
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (!isNaN(size) && size > MAX_COMPARISON_PAYLOAD) {
        return secureErrorResponse("Request payload too large", 413);
      }
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

    safeLog("BULK-COMPARISON", "User authenticated");

    // Subscription tier enforcement - require Scale tier (admin/demo users bypass)
    if (SERVICE_ROLE_KEY) {
      const userEmail = userData?.user?.email;
      const admin = await isAdminUser(userId, SUPABASE_URL!, SERVICE_ROLE_KEY);
      if (!admin && !isDemoAccountEmail(userEmail)) {
        let tier = await getUserTier(userId, SUPABASE_URL!, SERVICE_ROLE_KEY);

        // Fallback to the authenticated lookup used by bulk analysis to avoid false 403s.
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

          if (authTier === 'scale') tier = 'scale';
        }

        if (tier !== 'scale') {
          return secureErrorResponse('This feature requires a Scale subscription.', 403);
        }
      } else {
        safeLog("BULK-COMPARISON", admin ? "Admin user - bypassing tier check" : "Demo user - bypassing tier check");
      }

      // Skip per-request rate limiting for bulk comparison — Scale/demo check is sufficient.
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('Service configuration error');
    }

    // Parse and validate input using schema validation
    const bodyText = await req.text();
    if (bodyText.length > MAX_COMPARISON_PAYLOAD) {
      return secureErrorResponse("Request payload too large", 413);
    }

    const body = JSON.parse(bodyText);
    const validation = validateBulkComparisonInput(body, 200);
    
    if (!validation.success) {
      return secureErrorResponse(validation.error || 'Invalid input', 400);
    }

    const { results } = validation.data!;

    // Normalize overall score to be the average of the 5 displayed integer metric scores
    results.forEach((r: any) => {
      if (r?.scores) {
        const s = r.scores;
        const vals = [s.market, s.product, s.traction, s.businessModel, s.funding]
          .map((v: any) => Math.round(Number(v) || 0));
        s.overall = Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
      }
    });

    safeLog("BULK-COMPARISON", "Generating report", { count: results.length });

    // Sort by overall score
    const sortedResults = [...results].sort((a, b) => b.scores.overall - a.scores.overall);

    // Generate investment rankings
    const investmentRankings = sortedResults.slice(0, 20).map((r, idx) => ({
      rank: idx + 1,
      startupName: r.startupName,
      overallScore: r.scores.overall,
      topStrengths: identifyStrengths(r),
      recommendation: generateRecommendation(r.scores.overall)
    }));

    // Generate score comparison table
    const scoreComparison = {
      headers: ['Startup', 'Team', 'Product', 'Market', 'Traction', 'Funding', 'BizModel', 'Overall'],
      rows: sortedResults.map(r => [
        r.startupName,
        r.scores.team,
        r.scores.product,
        r.scores.market,
        r.scores.traction,
        r.scores.funding,
        r.scores.businessModel,
        r.scores.overall
      ])
    };

    // Sector breakdown
    const sectorBreakdown: Record<string, number> = {};
    results.forEach(r => {
      sectorBreakdown[r.sector] = (sectorBreakdown[r.sector] || 0) + 1;
    });

    // Strengths and weaknesses
    const strengthsAndWeaknesses: Record<string, { strengths: string[]; weaknesses: string[] }> = {};
    results.forEach(r => {
      strengthsAndWeaknesses[r.startupName] = {
        strengths: identifyStrengths(r),
        weaknesses: identifyWeaknesses(r)
      };
    });

    // Generate overall recommendation using AI
    const overallRecommendation = await generateOverallRecommendation(
      investmentRankings.slice(0, 10),
      sectorBreakdown,
      LOVABLE_API_KEY
    );

    const comparisonReport = {
      investmentRankings,
      overallRecommendation,
      scoreComparison,
      strengthsAndWeaknesses,
      sectorBreakdown
    };

    safeLog("BULK-COMPARISON", "Report generated");
    return secureJsonResponse({ comparisonReport });

  } catch (error) {
    safeLog("BULK-COMPARISON", "Error occurred");
    
    // Sanitize error message before returning to client
    const userMessage = sanitizeErrorMessage(error);
    
    return secureErrorResponse(userMessage, 500);
  }
});

function identifyStrengths(result: any): string[] {
  const strengths: string[] = [];
  const scores = result.scores;

  if (scores.team >= 8) strengths.push('Strong team with relevant expertise');
  if (scores.product >= 8) strengths.push('Innovative and well-differentiated product');
  if (scores.market >= 8) strengths.push('Large addressable market opportunity');
  if (scores.traction >= 8) strengths.push('Impressive traction and growth metrics');
  if (scores.funding >= 8) strengths.push('Well-funded with strong investor backing');
  if (scores.businessModel >= 8) strengths.push('Scalable and proven business model');

  return strengths.length > 0 ? strengths.slice(0, 3) : ['Needs further evaluation'];
}

function identifyWeaknesses(result: any): string[] {
  const weaknesses: string[] = [];
  const scores = result.scores;

  if (scores.team < 5) weaknesses.push('Team lacks relevant experience or track record');
  if (scores.product < 5) weaknesses.push('Product differentiation unclear or weak');
  if (scores.market < 5) weaknesses.push('Limited market size or unclear TAM');
  if (scores.traction < 5) weaknesses.push('Minimal traction or growth metrics');
  if (scores.funding < 5) weaknesses.push('Underfunded or unclear runway');
  if (scores.businessModel < 5) weaknesses.push('Business model needs validation');

  return weaknesses.length > 0 ? weaknesses : ['No significant weaknesses identified'];
}

function generateRecommendation(overallScore: number): string {
  if (overallScore >= 8) return 'Strong investment opportunity - High priority for further due diligence';
  if (overallScore >= 6) return 'Promising startup - Worth deeper evaluation';
  if (overallScore >= 4) return 'Moderate potential - Requires significant improvement in key areas';
  return 'High risk - Does not meet investment criteria at this stage';
}

async function generateOverallRecommendation(
  topRankings: any[],
  sectorBreakdown: Record<string, number>,
  apiKey: string
): Promise<string> {
  const prompt = `Based on this startup analysis data, provide a concise overall investment recommendation (3-5 sentences):

Top 10 Startups:
${topRankings.map(r => `${r.rank}. ${r.startupName} (Score: ${r.overallScore}/10)`).join('\n')}

Sector Distribution:
${Object.entries(sectorBreakdown).map(([sector, count]) => `${sector}: ${count} startups`).join('\n')}

Provide: 
1. Which startups show the most promise
2. Key patterns or trends across the batch
3. Investment focus recommendation`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an investment analyst providing concise recommendations.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      safeLog("BULK-COMPARISON", "AI API error in recommendation");
      throw new Error('AI service error');
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Analysis complete. Review top-ranked startups for investment opportunities.';
  } catch (error) {
    safeLog("BULK-COMPARISON", "Error generating recommendation");
    const totalStartups = Object.values(sectorBreakdown).reduce((a: number, b: number) => a + b, 0);
    return `Analysis of ${totalStartups} startups complete. Top performers show strong potential across ${Object.keys(sectorBreakdown).length} sectors. Focus on highest-ranked startups for detailed due diligence.`;
  }
}
