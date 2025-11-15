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

    // Handle PDF upload or text input
    if (contentType.includes("multipart/form-data")) {
      // For PDF files, we'll extract text (simplified for demo)
      // In production, you'd use a proper PDF parsing library
      const formData = await req.formData();
      const file = formData.get("file") as File;
      
      if (!file) {
        throw new Error("No file uploaded");
      }

      // For demo purposes, we'll inform that PDF parsing is simplified
      pitchText = `[PDF Upload Detected: ${file.name}]\n\nNote: In this demo, please use the text input for detailed analysis. PDF parsing requires additional server-side libraries.`;
    } else {
      const body = await req.json();
      pitchText = body.text || "";
    }

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
        messages: [
          {
            role: "system",
            content: `You are a seasoned venture analyst AI with years of experience evaluating startups. Think step-by-step like a top-tier VC partner.

When given a startup pitch, generate a comprehensive analysis with:

1) STRUCTURED INVESTMENT MEMO with these sections:
   - Problem: What problem does the startup solve?
   - Solution: How does the product/service address this?
   - Market: Target market size and opportunity
   - Traction: Current metrics, customers, revenue
   - Business Model: How they make money
   - Risks: Key concerns and challenges
   - Recommendation: Investment stance (Pass/Maybe/Invest)

2) VC SCORECARD with scores 0-10 AND detailed reasoning for each:
   - Team: Experience and execution capability
   - Market Size: TAM and growth potential
   - Product: Quality and differentiation
   - Traction: Current momentum and metrics
   - Business Model: Revenue clarity and scalability
   - Defensibility: Competitive moats and barriers

3) RED FLAGS DETECTOR - Identify 3-6 critical concerns with severity:
   - "critical" (deal breakers like fraud, legal issues)
   - "high" (major risks like saturated market, weak unit economics)
   - "medium" (concerns like inexperienced team, unproven model)

4) FOLLOW-UP QUESTIONS - Generate 6-8 intelligent due diligence questions categorized by:
   - Team, Market, Product, Financials, Legal/Compliance

5) INVESTMENT THESIS - One compelling paragraph each:
   - Bull Case: Why this could be a 10x return
   - Bear Case: Why this might fail

6) BENCHMARKING - Compare against industry standards:
   - Overall percentile (e.g., "Top 15% of seed-stage startups")
   - Stage-appropriate insights (Pre-seed/Seed/Series A context)

Return your response as a JSON object with this EXACT structure:
{
  "memo": "Full investment memo text with clear section headers",
  "scorecard": {
    "team": { "score": 7, "reasoning": "Strong technical background but lacks go-to-market experience..." },
    "marketSize": { "score": 8, "reasoning": "TAM of $50B growing at 15% CAGR..." },
    "product": { "score": 6, "reasoning": "MVP shows promise but UX needs refinement..." },
    "traction": { "score": 5, "reasoning": "100 early users engaged but no revenue yet..." },
    "businessModel": { "score": 7, "reasoning": "Clear SaaS model with predictable revenue..." },
    "defensibility": { "score": 6, "reasoning": "Network effects emerging but no IP protection..." }
  },
  "redFlags": [
    { "severity": "high", "issue": "No clear differentiation from competitors", "explanation": "..." },
    { "severity": "medium", "issue": "Burn rate unsustainable", "explanation": "..." }
  ],
  "followUpQuestions": {
    "team": ["What is your customer acquisition cost?", "..."],
    "market": ["Who are your top 3 competitors and how do you differ?", "..."],
    "product": ["What is your product roadmap for next 12 months?", "..."],
    "financials": ["What are your unit economics?", "..."],
    "legal": ["Do you have any pending legal issues?", "..."]
  },
  "investmentThesis": {
    "bullCase": "One paragraph explaining why this could be a massive success...",
    "bearCase": "One paragraph explaining the main failure scenarios..."
  },
  "benchmarking": {
    "overallPercentile": "Top 25% of seed-stage startups",
    "stageContext": "For a seed-stage company, strong product-market fit indicators...",
    "comparisonNotes": "Team score is above average for first-time founders..."
  }
}

Be brutally honest - use the full 0-10 range. Make insights specific and actionable.`
          },
          {
            role: "user",
            content: pitchText
          }
        ],
        temperature: 0.7,
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

    // Parse the JSON response from Gemini
    let analysisResult;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysisResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response. Please try again.");
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
