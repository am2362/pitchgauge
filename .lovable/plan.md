

## Fix: Excel Download Not Triggering

### Problem
The `downloadXlsx` helper in `src/lib/bulk-excel-export.ts` creates an anchor element and clicks it without appending it to the DOM. In sandboxed/iframe environments (like the Lovable preview), this doesn't trigger the browser's download. The toast says "Export Complete" but no file actually downloads.

### Fix
**File**: `src/lib/bulk-excel-export.ts` (lines 14-19)

Append the anchor to `document.body` before clicking, then remove it after:

```typescript
function downloadXlsx(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

This is a 2-line addition to the existing function. Same fix pattern should be checked in other export utilities (JSON export in `ExtractedPitchSummary.tsx`, demo Excel in `DemoBulk.tsx`) for consistency.

### Files to Modify
1. **`src/lib/bulk-excel-export.ts`** — append/remove anchor in `downloadXlsx`
2. **`src/pages/DemoBulk.tsx`** — same fix in `handleExcelDownload` (line ~131)
3. **`src/components/ExtractedPitchSummary.tsx`** — same fix in `handleExportJSON` (line ~30)

