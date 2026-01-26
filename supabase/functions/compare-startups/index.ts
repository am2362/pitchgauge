import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

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

    const { analyses, startupNames } = await req.json();

    // Input validation
    const MAX_STARTUPS_TO_COMPARE = 10;
    if (!Array.isArray(analyses) || !Array.isArray(startupNames)) {
      return new Response(
        JSON.stringify({ error: 'Invalid analyses or startupNames format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (analyses.length === 0 || startupNames.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one startup required for comparison' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (analyses.length > MAX_STARTUPS_TO_COMPARE || startupNames.length > MAX_STARTUPS_TO_COMPARE) {
      return new Response(
        JSON.stringify({ error: `Maximum ${MAX_STARTUPS_TO_COMPARE} startups can be compared at once` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (analyses.length !== startupNames.length) {
      return new Response(
        JSON.stringify({ error: 'Mismatch between analyses and startupNames count' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate each analysis has required scorecard structure
    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i];
      if (!analysis?.scorecard?.team || !analysis?.scorecard?.marketSize) {
        return new Response(
          JSON.stringify({ error: `Invalid analysis structure for startup at index ${i}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Comparing startups:', startupNames);

    // Build comparison prompt
    const comparisonPrompt = `You are a venture capital analyst. Compare the following startup analyses and provide insights.

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
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    let comparisonText = data.choices?.[0]?.message?.content || '';

    console.log('AI Response:', comparisonText);

    // Clean and parse JSON
    comparisonText = comparisonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let comparisonInsights;
    try {
      comparisonInsights = JSON.parse(comparisonText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw text:', comparisonText);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate structure
    if (!comparisonInsights.rankings || !comparisonInsights.comparativeInsights) {
      throw new Error('Invalid comparison insights structure');
    }

    return new Response(
      JSON.stringify(comparisonInsights),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in compare-startups:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
