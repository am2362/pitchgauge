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

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
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

      // Append results incrementally using the new DB function (keeps payloads small).
      if (batchId && batchResults.length > 0) {
        const { error: appendErr } = await supabaseAuth.rpc('append_bulk_analysis_results', {
          p_batch_id: batchId,
          p_results: batchResults
        });
        if (appendErr) {
          console.error('append_bulk_analysis_results error', appendErr);
        }
      }

      // Add a small delay between batches to reduce rate-limit pressure.
      // Keep per-invocation sleeps small so the whole request doesn't time out.
      // Frontend handles longer cooldowns between invocations.
      if (i + batchSize < startups.length) {
        await new Promise(resolve => setTimeout(resolve, useGeminiDirect ? 200 : 250));
      }
    }

    // Return only the newly-analysed results (frontend tracks cumulative count via polling/state).
    return new Response(
      JSON.stringify({ results: allResults, totalProcessed: allResults.length }),
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

async function analyzeStartup(name: string, pitch: string, apiKey: string, useGeminiDirect = false, retryCount = 0): Promise<any> {
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

3. SCORES (1-10 integer, apply consistently):

SCORING RUBRIC:
General Scale:
- 1-3: Critical weakness / missing / fatal flaw (high risk of failure)
- 4-6: Mediocre / average / partial (uncompelling; needs major fixes)
- 7-8: Strong / good evidence (attractive, competitive)
- 9-10: Outstanding / exceptional (top decile, clear advantage)

Category-Specific:
- Team: 1-3 no info/inexperienced/red flags; 4-6 some experience but gaps; 7-8 proven founders (exits, domain expertise); 9-10 exceptional track record
- Product: 1-3 generic/no moat; 4-6 some features, easily replicable; 7-8 clear unique value/IP; 9-10 defensible moat (patents, network effects)
- Market: 1-3 tiny TAM (<$500M)/shrinking; 4-6 decent ($1B-$10B)/slow growth; 7-8 large/growing ($10B+); 9-10 massive ($50B+ with tailwinds)
- Traction: 1-3 none/anecdotal; 4-6 early signals, not scaling; 7-8 strong metrics (growing revenue/users); 9-10 explosive/validated PMF
- Funding: 1-3 no funding/unclear use; 4-6 some funding but concerns; 7-8 well-funded with clear plan; 9-10 strong investors, efficient capital use
- Business Model: 1-3 unclear/unsustainable; 4-6 viable but thin margins; 7-8 scalable, high-margin potential; 9-10 proven, recurring, capital-efficient

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
    const snippet = errorText ? errorText.slice(0, 800) : '(no body)';
    console.error('AI API error:', response.status, snippet);

    // Retry with exponential backoff on 429 (rate limit)
    if (response.status === 429) {
      const retryAttempt = (retryCount ?? 0);
      if (retryAttempt < 3) {
        const backoffMs = Math.pow(2, retryAttempt + 1) * 1000; // 2s, 4s, 8s
        console.log(`Rate limited for ${name}, retry ${retryAttempt + 1}/3 after ${backoffMs}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return analyzeStartup(name, pitch, apiKey, useGeminiDirect, retryAttempt + 1);
      }
      throw new RateLimitError('Rate limited after 3 retries');
    }

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
