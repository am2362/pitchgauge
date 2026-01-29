

# PDF Upload and Text Extraction for Startup Pitch Analysis

## Overview
Enable PDF document upload for startup pitch analysis by implementing server-side PDF parsing using the `pdfjs-serverless` library in a Deno Edge Function, then feeding the extracted text into the existing AI analysis pipeline.

## Current State
- The Index page has a PDF upload UI section that accepts `.pdf` files
- The `handleFileChange` function attempts to parse PDFs client-side using `document-parser.ts`
- `document-parser.ts` currently throws an error: "PDF parsing is currently being implemented"
- The `analyze-startup` edge function rejects `multipart/form-data` requests

## Solution Architecture

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Upload PDF    │────▶│  parse-pdf       │────▶│ analyze-startup │
│   (Frontend)    │     │  Edge Function   │     │ Edge Function   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                        ┌──────┴──────┐
                        │ pdfjs-      │
                        │ serverless  │
                        └─────────────┘
```

## Implementation Steps

### Step 1: Create PDF Parsing Edge Function
Create a new edge function `parse-pdf` that:
- Accepts PDF file uploads via `multipart/form-data`
- Uses `pdfjs-serverless` library to extract text from all pages
- Returns the extracted text content
- Includes file size validation (max 20MB)
- Handles authentication

### Step 2: Update Frontend PDF Handler
Modify `src/pages/Index.tsx` to:
- Show a clear loading state during PDF extraction
- Call the `parse-pdf` edge function with the uploaded file
- Display extraction progress messages
- Populate the text area with extracted content
- Then allow the user to trigger analysis (or auto-trigger)

### Step 3: Remove Client-Side Parser
Update `src/lib/document-parser.ts` to:
- Remove the throwing error implementation
- Export a function that calls the edge function instead

### Step 4: Add Edge Function Configuration
Update `supabase/config.toml` to:
- Register the new `parse-pdf` function

## Technical Details

### New Files

**supabase/functions/parse-pdf/index.ts**
- Import `pdfjs-serverless` from `https://esm.sh/pdfjs-serverless`
- Parse multipart form data to extract the PDF file
- Convert file to Uint8Array
- Use `getDocument()` to load PDF
- Iterate through pages and extract text content using `getTextContent()`
- Return JSON with extracted text

### Modified Files

**src/pages/Index.tsx**
- Update `handleFileChange` to call the edge function
- Add progress states: "Uploading PDF...", "Extracting text...", "Ready for analysis"
- Handle errors gracefully with user-friendly messages
- After text extraction, allow user to click "Generate Analysis" or auto-analyze

**src/lib/document-parser.ts**
- Rewrite to call the `parse-pdf` edge function
- Handle the FormData upload
- Return the extracted text

**supabase/config.toml**
- Add `[functions.parse-pdf]` section with `verify_jwt = false`

### Error Handling
- File size limit: 20MB (validated on both client and server)
- Empty PDF detection
- Corrupted/invalid PDF detection
- Password-protected PDF detection
- Network/timeout errors

### UI/UX Flow
1. User clicks the PDF upload area
2. File picker opens, user selects a PDF
3. Loading spinner appears with "Uploading and extracting text..."
4. On success: Text populates in textarea, toast confirms extraction
5. On error: Toast shows error message, upload area resets
6. User reviews extracted text and clicks "Generate Analysis"
7. Normal analysis flow proceeds

## Security Considerations
- Validate file MIME type on server
- Limit file size to 20MB
- Authenticate user before processing
- Use `pdfjs-serverless` which is a trusted, widely-used library
- Sanitize extracted text before passing to AI

## Estimated Changes
- **1 new edge function** (~80 lines)
- **2 modified files** (Index.tsx, document-parser.ts)
- **1 config update** (config.toml)

