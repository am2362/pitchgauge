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
      const formData = await req.formData();
      const file = formData.get("file") as File;
      
      if (!file) {
        throw new Error("No file uploaded");
      }

      // Read PDF as base64 and send to Gemini with vision capabilities
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...uint8Array));
      
      // Send PDF to Gemini for text extraction
      const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract all text content from this PDF document. Return ONLY the extracted text, nothing else."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 4000,
        }),
      });

      if (!extractResponse.ok) {
        throw new Error("Failed to extract text from PDF");
      }

      const extractData = await extractResponse.json();
      pitchText = extractData.choices?.[0]?.message?.content || "";
      
      if (!pitchText) {
        throw new Error("Could not extract text from PDF");
      }
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
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `CRITICAL: You MUST respond with ONLY valid JSON. NO markdown. NO code blocks. NO explanations. Start with { and end with }.

You are a seasoned venture analyst AI. Analyze startups and return this EXACT JSON structure:

Analyze the startup pitch and return a JSON object with:

1) "memo": Investment memo covering Problem, Solution, Market, Traction, Business Model, Risks, and Recommendation (Pass/Maybe/Invest)

2) "scorecard": Scores 0-10 with reasoning for: team, marketSize, product, traction, businessModel, defensibility

3) "redFlags": Array of issues with severity ("critical"/"high"/"medium"), issue name, and explanation

4) "followUpQuestions": Object with arrays for: team, market, product, financials, legal

5) "investmentThesis": Object with "bullCase" and "bearCase" paragraphs

6) "benchmarking": Object with "overallPercentile", "stageContext", and "comparisonNotes"

EXACT JSON structure you MUST return:
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

Remember: Return ONLY the JSON object. No markdown, no code blocks, no extra text. Be brutally honest with scores (0-10 range).`
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
