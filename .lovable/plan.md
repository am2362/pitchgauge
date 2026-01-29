

# Fix PDF Extraction - Import & Promise Issue

## Problem Identified
The `parse-pdf` edge function fails to boot with error:
```
The requested module 'https://esm.sh/pdfjs-serverless@0.6.0' does not provide an export named 'getDocument'
```

## Root Causes
1. **Version-specific import issue**: The `@0.6.0` version may have a different export structure
2. **Missing `.promise`**: Even if the import worked, the code is missing the required `.promise` call on `getDocument()`

## Solution

### Update `supabase/functions/parse-pdf/index.ts`

**Change 1 - Fix import (remove version pinning)**:
```typescript
// FROM:
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.6.0";

// TO:
import { getDocument } from "https://esm.sh/pdfjs-serverless";
```

**Change 2 - Add `.promise` to getDocument call**:
```typescript
// FROM:
const doc = await getDocument(pdfData);

// TO:
const doc = await getDocument(pdfData).promise;
```

## Technical Details

The `pdfjs-serverless` library follows the PDF.js pattern where `getDocument()` returns a `PDFDocumentLoadingTask` object. To get the actual document, you must await its `.promise` property.

From the official documentation:
```typescript
const doc = await getDocument(data).promise;
```

## Files to Modify
- `supabase/functions/parse-pdf/index.ts` (2 line changes)

## After Fix
The edge function should:
1. Boot successfully without import errors
2. Parse PDFs correctly and extract text
3. Return the extracted text to the frontend for analysis

