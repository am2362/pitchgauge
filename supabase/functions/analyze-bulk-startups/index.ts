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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { batchId, startups, batchSize = 5 } = await req.json();

    if (!Array.isArray(startups) || startups.length === 0) {
      throw new Error('Invalid startups array');
    }

    console.log(`Processing ${startups.length} startups in batches of ${batchSize}`);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const allResults: any[] = [];

    // Process in batches to avoid rate limits
    for (let i = 0; i < startups.length; i += batchSize) {
      const batch = startups.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: startups ${i + 1}-${Math.min(i + batchSize, startups.length)}`);

      const batchPromises = batch.map(async (startup: { name: string; pitch: string }) => {
        try {
          const result = await analyzeStartup(startup.name, startup.pitch, LOVABLE_API_KEY);
          return result;
        } catch (error) {
          console.error(`Error analyzing ${startup.name}:`, error);
          return {
            startupName: startup.name,
            error: error instanceof Error ? error.message : 'Unknown error',
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

      // Update progress in database
      if (batchId) {
        await supabase
          .from('bulk_analyses')
          .update({
            completed_startups: allResults.length,
            results: allResults
          })
          .eq('id', batchId);
      }

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < startups.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Mark as completed
    if (batchId) {
      await supabase
        .from('bulk_analyses')
        .update({
          status: 'completed',
          completed_startups: allResults.length,
          results: allResults
        })
        .eq('id', batchId);
    }

    return new Response(
      JSON.stringify({ results: allResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Bulk analysis error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeStartup(name: string, pitch: string, apiKey: string): Promise<any> {
  const systemPrompt = `You are analyzing a startup pitch. Extract structured information and be objective, concise, and deterministic.

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

3. SCORES (0-10 integer, be objective):
   - Team, Product, Market, Traction, Funding, Business Model, Overall

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

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Startup Name: ${name}\n\nPitch:\n${pitch}` }
      ],
      temperature: 0,
      top_p: 1
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

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
