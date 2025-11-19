import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let pitchText = "";
    const contentType = req.headers.get("content-type") || "";

    // Handle text input only (PDF parsing not supported)
    if (contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ 
          error: "PDF upload is not currently supported. Please copy and paste the text content of your pitch instead." 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const body = await req.json();
    pitchText = body.text || "";

    if (!pitchText) {
      throw new Error("No pitch text provided");
    }

    console.log("Analyzing startup pitch with Gemini...");

    // Call Lovable AI Gateway with Gemini
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 16000,
        temperature: 0,
        top_p: 1,
        messages: [
          {
            role: "system",
            content: `You are a deterministic startup pitch analysis engine. Your output MUST be consistent for the same input pitch.

CRITICAL: Return ONLY valid JSON. NO markdown. NO code blocks. Start with { and end with }.

SYSTEM RULES:
- Be factual and consistent
- Do NOT introduce randomness or creativity
- Do NOT add emojis, bullets, or unnecessary formatting
- Maintain the same evaluation criteria for all pitches

Return this exact JSON structure:

{
  "startupName": "REQUIRED: Extract company name from pitch. Look in first few lines. Infer from context if needed. Return null only if impossible.",
  "memo": "Format as:\n\nTeam Quality\nX/10\n[one factual sentence]\n\nMarket Size\nX/10\n[one factual sentence]\n\nProduct Differentiation\nX/10\n[one factual sentence]\n\nTraction\nX/10\n[one factual sentence]\n\nBusiness Model\nX/10\n[one factual sentence]\n\nCompetitive Landscape\nX/10\n[one factual sentence]",
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

SCORING CRITERIA (use consistently):
- Team Quality: founder experience, domain expertise, execution capability
- Market Size: TAM/SAM/SOM, growth potential, market dynamics
- Product Differentiation: unique value proposition, innovation, technical moats
- Traction: revenue, users, growth metrics, customer validation
- Business Model: revenue streams, unit economics, scalability
- Competitive Landscape: market positioning, barriers to entry, competitive advantages

Round all scores to nearest integer (1-10). Be consistent and factual.`
          },
          {
            role: "user",
            content: pitchText
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (response.status === 402) {
        throw new Error("AI usage limit reached. Please add credits to continue.");
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Gemini response received");

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

      console.log('Attempting to parse JSON, length:', jsonCandidate.length);
      analysisResult = JSON.parse(jsonCandidate);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Content length:', content.length);
      console.error('First 500 chars:', content.slice(0, 500));
      console.error('Last 500 chars:', content.slice(-500));

      // Fallback: ask AI to repair JSON strictly
      try {
        const repairResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
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
          console.log("Trying repaired JSON parse, length:", repaired.length);
          analysisResult = JSON.parse(repaired);
        }
      } catch (repairError) {
        console.error('Repair attempt failed:', repairError);
      }

      if (!analysisResult) {
        throw new Error('Failed to parse AI response. The response may have been truncated. Please try with a shorter pitch.');
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
      throw new Error('Invalid response structure from AI');
    }

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-startup function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
