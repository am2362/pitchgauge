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
        max_tokens: 8000,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `CRITICAL: Return ONLY valid JSON. NO markdown. NO code blocks. Start with { and end with }.

You are a venture analyst AI. Analyze the pitch and return this JSON structure:

{
  "memo": "Investment memo with sections: Problem, Solution, Market, Traction, Business Model, Risks, Recommendation. Keep each section 2-3 sentences.",
  "scorecard": {
    "team": { "score": 0-10, "reasoning": "1-2 sentences", "detailedExplanation": "3-4 sentences with specific examples from the pitch. What was evaluated, why the score, what would improve it." },
    "marketSize": { "score": 0-10, "reasoning": "1-2 sentences", "detailedExplanation": "3-4 sentences with specific market data and TAM analysis." },
    "product": { "score": 0-10, "reasoning": "1-2 sentences", "detailedExplanation": "3-4 sentences about differentiation, technology, and competitive advantage." },
    "traction": { "score": 0-10, "reasoning": "1-2 sentences", "detailedExplanation": "3-4 sentences with specific metrics, growth rates, and milestones." },
    "businessModel": { "score": 0-10, "reasoning": "1-2 sentences", "detailedExplanation": "3-4 sentences about monetization, unit economics, and scalability." },
    "defensibility": { "score": 0-10, "reasoning": "1-2 sentences", "detailedExplanation": "3-4 sentences about moats, IP, network effects, and barriers to entry." }
  },
  "redFlags": [
    { "severity": "critical|high|medium", "issue": "Brief title", "explanation": "1-2 sentences" }
  ],
  "followUpQuestions": {
    "team": ["question 1", "question 2"],
    "market": ["question 1", "question 2"],
    "product": ["question 1", "question 2"],
    "financials": ["question 1", "question 2"],
    "legal": ["question 1", "question 2"]
  },
  "investmentThesis": {
    "bullCase": "3-4 sentences max",
    "bearCase": "3-4 sentences max"
  },
  "benchmarking": {
    "overallPercentile": "e.g., Top 25% of seed-stage startups",
    "stageContext": "1-2 sentences",
    "comparisonNotes": "1-2 sentences"
  }
}

KEEP ALL TEXT CONCISE. Return ONLY JSON. Be honest with 0-10 scores.`
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
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response from Gemini with robust error handling
    let analysisResult;
    try {
      // Remove all possible markdown artifacts
      let cleanContent = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .replace(/^[^{]*/, "")  // Remove any text before first {
        .replace(/[^}]*$/, "")  // Remove any text after last }
        .trim();

      // Validate it starts with JSON
      if (!cleanContent.startsWith('{')) {
        console.error("Response doesn't start with JSON. First 200 chars:", content.slice(0, 200));
        throw new Error("AI returned non-JSON response. Please try again.");
      }

      analysisResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Content length:", content.length);
      console.error("First 500 chars:", content.slice(0, 500));
      console.error("Last 500 chars:", content.slice(-500));
      throw new Error("Failed to parse AI response. The response may have been truncated. Please try with a shorter pitch.");
    }

    // Validate the structure
    if (!analysisResult.memo || !analysisResult.scorecard) {
      throw new Error("Invalid response structure from AI");
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
