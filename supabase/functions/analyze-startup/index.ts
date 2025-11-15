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
            content: `You are a venture analyst AI. When given a startup pitch, generate:

1) A structured investment memo with these sections:
   - Problem: What problem does the startup solve?
   - Solution: How does the product/service address this?
   - Market: Target market size and opportunity
   - Traction: Current metrics, customers, revenue
   - Business Model: How they make money
   - Risks: Key concerns and challenges
   - Recommendation: Investment stance (Pass/Maybe/Invest)

2) A VC scorecard with scores from 0-10 for:
   - Team: Experience and execution capability
   - Market Size: TAM and growth potential
   - Product: Quality and differentiation
   - Traction: Current momentum and metrics
   - Business Model: Revenue clarity and scalability
   - Defensibility: Competitive moats and barriers

Return your response as a JSON object with this exact structure:
{
  "memo": "Full investment memo text with clear section headers",
  "scorecard": {
    "team": 7,
    "marketSize": 8,
    "product": 6,
    "traction": 5,
    "businessModel": 7,
    "defensibility": 6
  }
}

Make the memo detailed, structured, and professional. Be honest in scoring - use the full 0-10 range.`
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
