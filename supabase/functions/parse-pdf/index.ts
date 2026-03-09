import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { getDocument } from "https://esm.sh/pdfjs-serverless";
import { sanitizeErrorMessage } from '../_shared/validation.ts';
import { corsHeaders, secureJsonResponse, secureErrorResponse, checkRateLimit, recordRateLimitEvent, safeLog, sanitizeText } from '../_shared/security.ts';

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
    safeLog("PARSE-PDF", "Starting AI text cleaning");
    
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
      safeLog("PARSE-PDF", "AI cleaning request failed", { status: cleaningResponse.status });
      return null;
    }

    const data = await cleaningResponse.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      safeLog("PARSE-PDF", "No content in cleaning response");
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
    safeLog("PARSE-PDF", "AI cleaning successful", { slideCount: result.slides?.length || 0 });
    
    return result;
  } catch (error) {
    safeLog("PARSE-PDF", "AI cleaning failed");
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    safeLog("PARSE-PDF", "Function started");

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      return secureErrorResponse("AI service not configured", 500);
    }

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
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return secureErrorResponse('Unauthorized', 401);
    }

    safeLog("PARSE-PDF", "User authenticated");

    // Rate limiting
    if (SERVICE_ROLE_KEY) {
      const rateCheck = await checkRateLimit(userId, SUPABASE_URL!, SERVICE_ROLE_KEY);
      if (!rateCheck.allowed) {
        safeLog("PARSE-PDF", "Rate limit exceeded");
        return secureErrorResponse('Rate limit exceeded. Please try again later.', 429);
      }
      await recordRateLimitEvent(userId, 'parse_pdf', SUPABASE_URL!, SERVICE_ROLE_KEY);
    }

    // Parse multipart form data
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return secureErrorResponse("Expected multipart/form-data", 400);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return secureErrorResponse("No file uploaded", 400);
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return secureErrorResponse("Only PDF files are supported", 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return secureErrorResponse("File size exceeds 20MB limit", 400);
    }

    safeLog("PARSE-PDF", "Processing PDF", { size: file.size });

    // Read file as ArrayBuffer and convert to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const pdfData = new Uint8Array(arrayBuffer);

    // Load PDF to get page count and try text extraction first
    const doc = await getDocument(pdfData).promise;
    const numPages = doc.numPages;
    safeLog("PARSE-PDF", "PDF loaded", { pages: numPages });

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
      safeLog("PARSE-PDF", "Using Vision AI for extraction");
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
        const errorStatus = visionResponse.status;
        safeLog("PARSE-PDF", "Vision AI error", { status: errorStatus });
        
        if (errorStatus === 429) {
          return secureErrorResponse("AI service is busy. Please try again in a moment.", 429);
        }
        
        return secureErrorResponse("Failed to process PDF with AI vision", 500);
      }

      const visionData = await visionResponse.json();
      rawExtractedText = visionData.choices?.[0]?.message?.content || "";

      if (!rawExtractedText) {
        return secureErrorResponse("Could not extract any text from the PDF. The document may be empty or unreadable.", 400);
      }

      safeLog("PARSE-PDF", "Vision AI extraction complete", { textLength: rawExtractedText.length });
    } else {
      safeLog("PARSE-PDF", "Standard extraction complete", { textLength: rawExtractedText.length });
    }

    // Sanitize extracted text before returning
    const sanitizedRawText = sanitizeText(rawExtractedText, 100000);

    // Step 2: AI-powered cleaning and structuring
    const cleanedResult = await cleanExtractedText(sanitizedRawText, LOVABLE_API_KEY);
    
    if (cleanedResult) {
      safeLog("PARSE-PDF", "Returning cleaned result", { slideCount: cleanedResult.slides.length });
      return secureJsonResponse({ 
        text: sanitizedRawText,
        cleanedText: sanitizeText(cleanedResult.cleanedText, 100000),
        pitchSummary: sanitizeText(cleanedResult.pitchSummary, 5000),
        slides: cleanedResult.slides,
        pages: numPages,
        fileName: file.name,
        method: extractionMethod
      });
    }

    // Fallback: return raw text if cleaning failed
    safeLog("PARSE-PDF", "AI cleaning failed, returning raw text");
    return secureJsonResponse({ 
      text: sanitizedRawText,
      pages: numPages,
      fileName: file.name,
      method: extractionMethod
    });

  } catch (error) {
    safeLog("PARSE-PDF", "Error occurred");
    
    // Check for specific PDF parsing errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes("password") || errorMessage.includes("encrypted")) {
      return secureErrorResponse("This PDF is password-protected. Please upload an unprotected PDF.", 400);
    }
    
    if (errorMessage.includes("Invalid PDF")) {
      return secureErrorResponse("Invalid or corrupted PDF file. Please try another file.", 400);
    }

    const userMessage = sanitizeErrorMessage(error);
    
    return secureErrorResponse(userMessage, 500);
  }
});
