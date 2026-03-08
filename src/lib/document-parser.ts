import { supabase } from "@/integrations/supabase/client";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export interface SlideContent {
  slideNumber: number;
  heading?: string;
  content: string;
}

export interface ParseResult {
  text: string;
  cleanedText?: string;
  pitchSummary?: string;
  slides?: SlideContent[];
  pages?: number;
  fileName?: string;
  method?: "text_extraction" | "vision_ai";
}

/**
 * Parse a PDF document using the server-side parse-pdf edge function
 * Returns both raw and AI-cleaned/structured text
 */
export default async function parseDocument(file: File): Promise<ParseResult> {
  // Client-side validation
  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are supported");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 20MB limit");
  }

  // Create form data with the file
  const formData = new FormData();
  formData.append("file", file);

  // Get the current session for authentication
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session) {
    throw new Error("You must be logged in to upload files");
  }

  // Call the edge function
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-pdf`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to parse PDF (${response.status})`);
  }

  const result = await response.json();
  
  if (!result.text) {
    throw new Error("No text was extracted from the PDF");
  }

  return {
    text: result.text,
    cleanedText: result.cleanedText,
    pitchSummary: result.pitchSummary,
    slides: result.slides,
    pages: result.pages,
    fileName: result.fileName,
    method: result.method,
  };
}
