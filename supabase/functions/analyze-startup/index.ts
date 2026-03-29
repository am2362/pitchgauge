import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { validatePitchInput, sanitizeErrorMessage } from '../_shared/validation.ts';
import { corsHeaders, secureJsonResponse, secureErrorResponse, checkRateLimit, recordRateLimitEvent, safeLog, getUserTier, checkDailyLimit } from '../_shared/security.ts';

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
      const tier = await getUserTier(userId, SUPABASE_URL!, SERVICE_ROLE_KEY);

      const dailyCheck = await checkDailyLimit(userId, tier, 'single_analysis', SUPABASE_URL!, SERVICE_ROLE_KEY);
      if (!dailyCheck.allowed) {
        safeLog("ANALYZE-STARTUP", "Daily limit reached", { tier, current: dailyCheck.current, limit: dailyCheck.limit });
        return secureErrorResponse('Daily limit reached. Resets at midnight UTC.', 429);
      }

      // Rate limiting
      const rateCheck = await checkRateLimit(userId, SUPABASE_URL!, SERVICE_ROLE_KEY);
      if (!rateCheck.allowed) {
        safeLog("ANALYZE-STARTUP", "Rate limit exceeded");
        return secureErrorResponse('Rate limit exceeded. Please try again later.', 429);
      }
      await recordRateLimitEvent(userId, 'analyze_startup', SUPABASE_URL!, SERVICE_ROLE_KEY);
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

    // Call Lovable AI Gateway with Gemini
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AI_GATEWAY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 16000,
        temperature: 0.1,
        top_p: 1,
        messages: [
          {
            role: "system",
            content: `You are a consistent startup evaluation AI. Always apply the same scoring criteria strictly. Do not vary scores based on writing style or tone — evaluate only on substance. A pitch with identical facts must always receive identical scores.

You are a deterministic startup pitch analysis engine. Your output MUST be consistent for the same input pitch.

CRITICAL: Return ONLY valid JSON. NO markdown. NO code blocks. Start with { and end with }.

SYSTEM RULES:
- Be factual and consistent
- Do NOT introduce randomness or creativity
- Do NOT add emojis, bullets, or unnecessary formatting
- Maintain the same evaluation criteria for all pitches

Return this exact JSON structure:

{
  "startupName": "REQUIRED: Extract company name from pitch. Look in first few lines. Infer from context if needed. Return null only if impossible.",
  "memo": "A 2-3 sentence executive summary of the startup's overall investment potential. Cover the strongest aspect, the biggest risk, and whether the startup is worth further diligence. Do NOT repeat individual category scores here.",
  "scorecard": {
    "team": { "score": 1-10, "reasoning": "1 factual sentence", "detailedExplanation": "2 factual sentences" },
    "marketSize": { "score": 1-10, "reasoning": "1 factual sentence", "detailedExplanation": "2 factual sentences" },
    "traction": { "score": 1-10, "reasoning": "1 factual sentence", "detailedExplanation": "2 factual sentences" },
    "productDifferentiation": { "score": 1-10, "reasoning": "1 factual sentence", "detailedExplanation": "2 factual sentences" },
    "businessModel": { "score": 1-10, "reasoning": "1 factual sentence", "detailedExplanation": "2 factual sentences" },
    "competitiveLandscape": { "score": 1-10, "reasoning": "1 factual sentence", "detailedExplanation": "2 factual sentences" }
  },
  "redFlags": [
    { "severity": "critical|high|medium", "issue": "Brief title", "explanation": "1 factual sentence" }
  ],
  "followUpQuestions": {
    "team": ["factual question 1", "factual question 2"],
    "market": ["factual question 1", "factual question 2"],
    "product": ["factual question 1", "factual question 2"],
    "financials": ["factual question 1", "factual question 2"],
    "legal": ["factual question 1"]
  },
  "investmentThesis": {
    "bullCase": "2-3 factual sentences",
    "bearCase": "2-3 factual sentences"
  },
  "benchmarking": {
    "overallPercentile": "e.g., Top 25%",
    "stageContext": "1 factual sentence",
    "comparisonNotes": "1 factual sentence"
  }
}

SCORING RUBRIC (1-10, integers only, apply consistently):

General Scale:
- 1-3: Critical weakness / missing / fatal flaw (high risk of failure)
- 4-6: Mediocre / average / partial (uncompelling; needs major fixes)
- 7-8: Strong / good evidence (attractive, competitive)
- 9-10: Outstanding / exceptional (top decile, clear advantage)

Category-Specific Anchoring:
- Team Quality: 1-3 no info/inexperienced/red flags; 4-6 some experience but gaps; 7/10 requires at minimum 2 founders with relevant domain experience and one prior startup or notable company background; 5/10 means founders have general business experience but no direct domain expertise or startup track record; 9-10 exceptional track record (serial founders with exits, deep domain authority)
- Market Size: 1-3 tiny TAM (<$500M)/shrinking; 4-6 decent but slow growth; 7/10 requires explicit mention of TAM >$10B with evidence of growth; 5/10 means market is $1B-$10B with no strong growth signals; 9-10 massive ($50B+ with tailwinds)
- Product Differentiation: 1-3 generic/no moat; 4-6 some features, easily replicable; 7/10 requires a clearly articulated unique value proposition with some form of defensibility (IP, data moat, network effects); 5/10 means the product solves a real problem but could be easily replicated; 9-10 defensible moat (patents, strong network effects, proprietary data)
- Traction: 1-3 none/anecdotal; 4-6 early signals, not scaling; 7/10 requires demonstrated revenue or significant user growth with specific numbers; 5/10 means some early users or pilots but no clear growth trajectory; 9-10 explosive/validated PMF with strong unit economics
- Business Model: 1-3 unclear/unsustainable; 4-6 viable but thin margins; 7/10 requires a clearly scalable monetization strategy with evidence of unit economics; 5/10 means monetization path exists but margins or scalability are unproven; 9-10 proven, recurring, capital-efficient
- Competitive Landscape: 1-3 saturated/no barriers; 4-6 competitive but some edge; 7/10 requires clear differentiation from named competitors with defensible positioning; 5/10 means some competitive awareness but no strong moat; 9-10 minimal competition or dominant potential

MISSING DATA RULE: If the pitch provides NO information about a category, score it 1 with reasoning "No information provided in pitch." Do NOT infer, assume, or guess. Only score based on what is explicitly stated.

ALWAYS include reasoning explaining the exact score (e.g., why 5 not 6). Be brutally honest for early-stage pitches.`
          },
          {
            role: "user",
            content: pitchText
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorStatus = response.status;
      safeLog("ANALYZE-STARTUP", "AI API error", { status: errorStatus });
      
      if (errorStatus === 429) {
        return secureErrorResponse('Rate limit exceeded. Please try again in a moment.', 429);
      }
      if (errorStatus === 402) {
        return secureErrorResponse('AI usage limit reached. Please try again later.', 402);
      }
      
      throw new Error("AI service error");
    }

    const data = await response.json();
    safeLog("ANALYZE-STARTUP", "AI response received");

    // Extract the content from Gemini's response
    const content = data.choices?.[0]?.message?.content as string | undefined;
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response from Gemini with robust error handling
    let analysisResult: any;
    try {
      // Remove markdown fences and trim
      let text = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      // Find the first balanced JSON object { ... }
      const start = text.indexOf('{');
      if (start === -1) throw new Error('No JSON object found');
      let depth = 0;
      let end = -1;
      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) { end = i; break; }
        }
      }
      if (end === -1) end = text.lastIndexOf('}');
      let jsonCandidate = text.slice(start, end + 1);

      // Sanitize common JSON issues
      jsonCandidate = jsonCandidate
        // smart quotes
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        // trailing commas
        .replace(/,\s*([}\]])/g, '$1')
        // stray control chars
        .replace(/[\u0000-\u001F]/g, ' ')
        .trim();

      analysisResult = JSON.parse(jsonCandidate);
    } catch (parseError) {
      safeLog("ANALYZE-STARTUP", "JSON parse error, attempting repair");

      // Fallback: ask AI to repair JSON strictly
      try {
        const repairResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${AI_GATEWAY_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You fix malformed JSON. Return STRICT valid JSON only. No markdown, no commentary." },
              { role: "user", content: `Repair this to strict JSON following this shape (keys must match):\n{\n  memo: string | { Problem: string; Solution: string; Market: string; Traction: string; Business Model: string; Risks: string },\n  scorecard: { team: {score:number, reasoning:string, detailedExplanation?:string}, marketSize: {score:number, reasoning:string, detailedExplanation?:string}, traction: {score:number, reasoning:string, detailedExplanation?:string}, productDifferentiation: {score:number, reasoning:string, detailedExplanation?:string}, businessModel: {score:number, reasoning:string, detailedExplanation?:string}, competitiveLandscape: {score:number, reasoning:string, detailedExplanation?:string} },\n  redFlags: Array<{ severity: 'critical'|'high'|'medium', issue: string, explanation: string }>,\n  followUpQuestions: { team:string[]; market:string[]; product:string[]; financials:string[]; legal:string[] },\n  investmentThesis: { bullCase:string; bearCase:string },\n  benchmarking: { overallPercentile:string; stageContext:string; comparisonNotes:string }\n}\n\nInput to repair:\n${content}` }
            ]
          })
        });

        if (repairResp.ok) {
          const r = await repairResp.json();
          const repaired = (r.choices?.[0]?.message?.content || "").replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
          analysisResult = JSON.parse(repaired);
        }
      } catch (repairError) {
        safeLog("ANALYZE-STARTUP", "Repair attempt failed");
      }

      if (!analysisResult) {
        throw new Error('Failed to parse response. Please try with a shorter pitch.');
      }
    }

    // Normalize structure for frontend compatibility
    if (analysisResult?.scorecard) {
      const sc = analysisResult.scorecard;
      if (!sc.productDifferentiation && sc.product) {
        sc.productDifferentiation = sc.product;
        delete sc.product;
      }
      if (!sc.competitiveLandscape && sc.defensibility) {
        sc.competitiveLandscape = sc.defensibility;
        delete sc.defensibility;
      }
    }

    if (!analysisResult.memo || !analysisResult.scorecard) {
      throw new Error('Invalid response structure');
    }

    safeLog("ANALYZE-STARTUP", "Analysis complete");
    return secureJsonResponse(analysisResult);

  } catch (error) {
    safeLog("ANALYZE-STARTUP", "Error occurred");
    
    // Sanitize error message before returning to client
    const userMessage = sanitizeErrorMessage(error);
    
    return secureErrorResponse(userMessage, 500);
  }
});
