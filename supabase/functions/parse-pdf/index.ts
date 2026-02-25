import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { getDocument } from "https://esm.sh/pdfjs-serverless";
import { sanitizeErrorMessage } from '../_shared/validation.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

interface CleanedPitchResult {
  pitchSummary: string;
  cleanedText: string;
  slides: Array<{
    slideNumber: number;
    heading?: string;
    content: string;
  }>;
}

/**
 * AI-powered text cleaning to de-noise and structure extracted text
 */
async function cleanExtractedText(rawText: string, apiKey: string): Promise<CleanedPitchResult | null> {
  try {
    console.log("Starting AI text cleaning...");
    
    const cleaningResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a pitch deck text cleaner. Given raw extracted text from a PDF pitch deck, clean and structure it.

RULES:
1. REMOVE NOISE:
   - Repeated company names used as watermarks
   - Page numbers and navigation elements (e.g., "1", "2/10")
   - Meaningless symbols (e.g., "000000", "S", "L", stray single letters)
   - Repeated headers/footers
   - Random characters from graphics

2. STRUCTURE BY SLIDE:
   - Identify slide boundaries from context changes
   - Extract headings/titles for each slide
   - Group fragmented text into coherent sentences
   - Combine related bullet points

3. OUTPUT FORMAT:
   Return ONLY valid JSON with this structure:
   {
     "pitchSummary": "A 2-3 paragraph executive summary of the entire pitch deck",
     "slides": [
       {
         "slideNumber": 1,
         "heading": "Title/Company Overview",
         "content": "Full cleaned text from this slide as coherent sentences..."
       }
     ],
     "cleanedText": "All cleaned slide content concatenated with 'Slide X:' markers"
   }

CRITICAL: Return ONLY JSON. No markdown. No code blocks. Start with { and end with }.`
          },
          {
            role: "user",
            content: `Clean and structure this raw PDF text extraction:\n\n${rawText.slice(0, 15000)}`
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    if (!cleaningResponse.ok) {
      console.error("AI cleaning request failed:", cleaningResponse.status);
      return null;
    }

    const data = await cleaningResponse.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("No content in cleaning response");
      return null;
    }

    // Parse the JSON response
    let cleaned = content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // Find balanced JSON
    const start = cleaned.indexOf('{');
    if (start === -1) throw new Error('No JSON found');
    
    let depth = 0;
    let end = -1;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    
    if (end === -1) end = cleaned.lastIndexOf('}');
    const jsonStr = cleaned.slice(start, end + 1);
    
    const result = JSON.parse(jsonStr) as CleanedPitchResult;
    console.log(`AI cleaning successful: ${result.slides?.length || 0} slides identified`);
    
    return result;
  } catch (error) {
    console.error("AI cleaning failed:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`Authenticated user: ${userId}`);

    // Parse multipart form data
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Expected multipart/form-data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file uploaded" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return new Response(
        JSON.stringify({ error: "Only PDF files are supported" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "File size exceeds 20MB limit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing PDF: ${file.name}, size: ${file.size} bytes`);

    // Read file as ArrayBuffer and convert to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const pdfData = new Uint8Array(arrayBuffer);

    // Load PDF to get page count and try text extraction first
    const doc = await getDocument(pdfData).promise;
    const numPages = doc.numPages;
    console.log(`PDF has ${numPages} pages`);

    // First, try standard text extraction
    const textParts: string[] = [];
    let hasEmbeddedText = false;
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .filter((item: any) => typeof item.str === 'string')
        .map((item: any) => item.str)
        .join(" ")
        .trim();
      
      if (pageText.length > 10) {
        hasEmbeddedText = true;
      }
      textParts.push(`--- Page ${pageNum} ---\n${pageText}`);
    }

    let rawExtractedText = textParts.join("\n\n").trim();
    let extractionMethod: "text_extraction" | "vision_ai" = "text_extraction";
    
    // If standard extraction failed, use Vision AI on the PDF
    if (!hasEmbeddedText || rawExtractedText.length < 100) {
      console.log("Standard text extraction yielded little content, using Vision AI...");
      extractionMethod = "vision_ai";
      
      // Convert PDF to base64 for Vision AI (chunked to avoid stack overflow)
      let base64Pdf = '';
      const chunkSize = 8192;
      for (let i = 0; i < pdfData.length; i += chunkSize) {
        const chunk = pdfData.subarray(i, Math.min(i + chunkSize, pdfData.length));
        base64Pdf += String.fromCharCode.apply(null, chunk as unknown as number[]);
      }
      base64Pdf = btoa(base64Pdf);
      const pdfDataUrl = `data:application/pdf;base64,${base64Pdf}`;
      
      // Use Gemini Vision to extract text from the PDF
      const visionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
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
                  text: `You are a document text extractor. Extract ALL text content from this PDF document, including:
- All headings and titles
- All body text and paragraphs
- Text in images, graphics, icons, or charts
- Numbers and statistics
- Bullet points and lists
- Any text in diagrams or infographics

Format the output as clean, readable text organized by page. Do not add any commentary or descriptions - just extract the raw text content exactly as it appears.

If there are charts or graphs, describe what data they show (e.g., "Chart showing revenue growth from $1M to $5M over 2020-2023").

Start with "--- Page 1 ---" for each new page.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: pdfDataUrl
                  }
                }
              ]
            }
          ],
          max_tokens: 8000,
        }),
      });

      if (!visionResponse.ok) {
        const errorText = await visionResponse.text();
        console.error("Vision AI error:", visionResponse.status, errorText);
        
        if (visionResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "AI service is busy. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: "Failed to process PDF with AI vision" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const visionData = await visionResponse.json();
      rawExtractedText = visionData.choices?.[0]?.message?.content || "";

      if (!rawExtractedText) {
        return new Response(
          JSON.stringify({ error: "Could not extract any text from the PDF. The document may be empty or unreadable." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Vision AI extracted ${rawExtractedText.length} characters from PDF`);
    } else {
      console.log(`Standard extraction got ${rawExtractedText.length} characters`);
    }

    // Step 2: AI-powered cleaning and structuring
    const cleanedResult = await cleanExtractedText(rawExtractedText, LOVABLE_API_KEY);
    
    if (cleanedResult) {
      console.log(`Returning cleaned result with ${cleanedResult.slides.length} slides`);
      return new Response(
        JSON.stringify({ 
          text: rawExtractedText,
          cleanedText: cleanedResult.cleanedText,
          pitchSummary: cleanedResult.pitchSummary,
          slides: cleanedResult.slides,
          pages: numPages,
          fileName: file.name,
          method: extractionMethod
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: return raw text if cleaning failed
    console.log("AI cleaning failed, returning raw text");
    return new Response(
      JSON.stringify({ 
        text: rawExtractedText,
        pages: numPages,
        fileName: file.name,
        method: extractionMethod
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error parsing PDF:", error);
    
    // Check for specific PDF parsing errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes("password") || errorMessage.includes("encrypted")) {
      return new Response(
        JSON.stringify({ error: "This PDF is password-protected. Please upload an unprotected PDF." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (errorMessage.includes("Invalid PDF")) {
      return new Response(
        JSON.stringify({ error: "Invalid or corrupted PDF file. Please try another file." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userMessage = sanitizeErrorMessage(error);
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
