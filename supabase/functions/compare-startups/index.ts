import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { validateCompareInput, sanitizeErrorMessage } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Authenticated user: ${userId}`);

    // Parse and validate input using schema validation
    const body = await req.json();
    const validation = validateCompareInput(body, 10);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { analyses, startupNames } = validation.data!;

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('Service configuration error');
    }

    console.log('Comparing startups:', startupNames);

    // Build comparison prompt
    const comparisonPrompt = `You are a venture capital analyst. Compare the following startup analyses and provide insights.

SCORING CONTEXT (use this rubric when interpreting and comparing scores):
- 1-3: Critical weakness / missing / fatal flaw (high risk of failure)
- 4-6: Mediocre / average / partial (uncompelling; needs major fixes)
- 7-8: Strong / good evidence (attractive, competitive)
- 9-10: Outstanding / exceptional (top decile, clear advantage)

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

Provide a comprehensive comparison in the following JSON structure:
{
  "rankings": [
    {
      "startupName": "Name",
      "rank": 1,
      "reasoning": "Why this startup ranks here (2-3 sentences)"
    }
  ],
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
            content: 'You are a venture capital analyst. Provide comparative analysis in valid JSON format only.'
          },
          {
            role: 'user',
            content: comparisonPrompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('AI service error');
    }

    const data = await response.json();
    let comparisonText = data.choices?.[0]?.message?.content || '';

    console.log('AI response received');

    // Clean and parse JSON
    comparisonText = comparisonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let comparisonInsights;
    try {
      comparisonInsights = JSON.parse(comparisonText);
    } catch (parseError) {
      console.error('JSON parse error');
      throw new Error('Failed to parse response. Please try again.');
    }

    // Validate structure
    if (!comparisonInsights.rankings || !comparisonInsights.comparativeInsights) {
      throw new Error('Invalid response structure');
    }

    return new Response(
      JSON.stringify(comparisonInsights),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in compare-startups:', error);
    
    // Sanitize error message before returning to client
    const userMessage = sanitizeErrorMessage(error);
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
