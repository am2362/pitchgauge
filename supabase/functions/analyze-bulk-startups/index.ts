import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { validateBulkAnalysisInput, sanitizeErrorMessage } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
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

    // Verify user using anon key (respects RLS)
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

    // Prefer the Lovable AI gateway for stability.
    // GEMINI_API_KEY may be missing/expired and can cause full-batch failures.
    // (We keep the direct Gemini path available for future use, but default to gateway.)
    const useGeminiDirect = false;
    
    if (!useGeminiDirect && !LOVABLE_API_KEY) {
      console.error('Neither GEMINI_API_KEY nor LOVABLE_API_KEY is configured');
      throw new Error('Service configuration error');
    }

    // Parse and validate input using schema validation
    const body = await req.json();
    const validation = validateBulkAnalysisInput(body, 100, 50000, 200);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { batchId, startups, batchSize = useGeminiDirect ? 3 : 1, appendResults = false } = validation.data!;

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
        return new Response(
          JSON.stringify({ error: 'Batch not found or unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If appending, get existing results
      if (appendResults && batch.results) {
        existingResults = batch.results as any[];
        console.log(`Append mode: ${existingResults.length} existing results`);
      }
    }

    console.log(`Processing ${startups.length} startups in batches of ${batchSize}`);

    // Use authenticated client throughout - RLS policies enforce ownership
    const allResults: any[] = [];

    // Process in batches to avoid rate limits
    for (let i = 0; i < startups.length; i += batchSize) {
      const batch = startups.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: startups ${i + 1}-${Math.min(i + batchSize, startups.length)}`);

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
          console.error(`Error analyzing ${startup.name}:`, error);
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

      // Update progress in database - RLS policies ensure user can only update their own records
      if (batchId) {
        const combinedResults = [...existingResults, ...allResults];
        await supabaseAuth
          .from('bulk_analyses')
          .update({
            completed_startups: combinedResults.length,
            results: combinedResults
          })
          .eq('id', batchId);
      }

      // Add a small delay between batches to reduce rate-limit pressure.
      // Keep per-invocation sleeps small so the whole request doesn't time out.
      // Frontend handles longer cooldowns between invocations.
      if (i + batchSize < startups.length) {
        await new Promise(resolve => setTimeout(resolve, useGeminiDirect ? 200 : 250));
      }
    }

    // Combine results and return (don't mark as completed - frontend handles final status)
    const combinedResults = [...existingResults, ...allResults];

    return new Response(
      JSON.stringify({ results: allResults, totalProcessed: combinedResults.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Bulk analysis error:', error);
    
    // Sanitize error message before returning to client
    const userMessage = sanitizeErrorMessage(error);
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

class RateLimitError extends Error {
  kind = 'rate_limited' as const;
  status = 429;
  constructor(message = 'Rate limited') {
    super(message);
  }
}

async function analyzeStartup(name: string, pitch: string, apiKey: string, useGeminiDirect = false): Promise<any> {
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
          temperature: 0,
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
        temperature: 0,
        top_p: 1
      }),
    });
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    // Log a short, safe snippet to help debugging without blowing up logs.
    const snippet = errorText ? errorText.slice(0, 800) : '(no body)';
    console.error('AI API error:', response.status, snippet);

    // IMPORTANT: Do not do long sleeps/retries inside a single request.
    // That causes whole-chunk timeouts and looks like "random" failures.
    if (response.status === 429) {
      throw new RateLimitError('Rate limited');
    }

    // If Gemini is misconfigured / model access is denied / key invalid, fall back to Lovable AI.
    // This prevents "all analyses failed" when GEMINI_API_KEY exists but is not usable.
    if (useGeminiDirect && (response.status === 400 || response.status === 401 || response.status === 403)) {
      const fallbackKey = Deno.env.get('LOVABLE_API_KEY');
      if (fallbackKey) {
        console.log(`Falling back to Lovable AI gateway for ${name} after Gemini ${response.status}`);
        return analyzeStartup(name, pitch, fallbackKey, false);
      }
    }
    
    throw new Error('AI service error');
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
    console.error('No content in AI response');
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
