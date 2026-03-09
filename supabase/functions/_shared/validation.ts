// Shared validation utilities for edge functions
// Using zod-like validation patterns for Deno environment

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Safe error messages for client responses
const USER_FRIENDLY_ERRORS: Record<string, string> = {
  'Rate limit': 'Rate limit exceeded. Please try again in a moment.',
  'AI usage limit': 'AI usage limit reached. Please try again later.',
  'LOVABLE_API_KEY': 'Service configuration error. Please contact support.',
  'GEMINI_API_KEY': 'Service configuration error. Please contact support.',
  'parse': 'Failed to process the response. Please try with a shorter input.',
  'truncated': 'The response was too long. Please try with a shorter input.',
  'Invalid': 'Invalid request format. Please check your input.',
  'Unauthorized': 'Unauthorized access. Please log in and try again.',
  'payload too large': 'Request is too large. Please reduce the input size.',
  'File size': 'File is too large. Please use a smaller file.',
};

export function sanitizeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  
  // Check for known safe error patterns
  for (const [pattern, userMessage] of Object.entries(USER_FRIENDLY_ERRORS)) {
    if (message.toLowerCase().includes(pattern.toLowerCase())) {
      return userMessage;
    }
  }
  
  // Default to generic error for unknown errors (don't leak internal details)
  return 'An error occurred processing your request. Please try again.';
}

// Strip HTML tags from text (for sanitization)
export function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>?/gm, '');
}

// Validation helpers
export function isNonEmptyString(value: unknown, maxLength?: number): value is string {
  return typeof value === 'string' && 
         value.trim().length > 0 && 
         (maxLength === undefined || value.length <= maxLength);
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function isValidArray<T>(
  value: unknown, 
  itemValidator: (item: unknown) => item is T,
  minLength = 0,
  maxLength = Infinity
): value is T[] {
  return Array.isArray(value) && 
         value.length >= minLength && 
         value.length <= maxLength &&
         value.every(itemValidator);
}

// Pitch text validation (max 10,000 characters for frontend, 50,000 for backend processing)
export interface PitchInput {
  text: string;
  startupName?: string;
}

export function validatePitchInput(body: unknown, maxLength = 50000): ValidationResult<PitchInput> {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Invalid request body' };
  }
  
  const obj = body as Record<string, unknown>;
  
  if (!isNonEmptyString(obj.text, maxLength)) {
    if (typeof obj.text === 'string' && obj.text.length > maxLength) {
      return { success: false, error: `Pitch text exceeds maximum length of ${maxLength} characters` };
    }
    return { success: false, error: 'Pitch text is required and must be non-empty' };
  }
  
  // Sanitize the text by stripping HTML tags
  const sanitizedText = stripHtmlTags(obj.text).trim();
  
  const result: PitchInput = { text: sanitizedText };
  
  if (obj.startupName !== undefined) {
    if (!isNonEmptyString(obj.startupName, 200)) {
      return { success: false, error: 'Startup name must be a non-empty string under 200 characters' };
    }
    result.startupName = stripHtmlTags(obj.startupName).trim();
  }
  
  return { success: true, data: result };
}

// Bulk startup validation
export interface StartupEntry {
  name: string;
  pitch: string;
}

export interface BulkAnalysisInput {
  batchId?: string;
  startups: StartupEntry[];
  batchSize?: number;
  appendResults?: boolean;
}

export function validateBulkAnalysisInput(
  body: unknown, 
  maxStartups = 100,
  maxPitchLength = 50000,
  maxNameLength = 200
): ValidationResult<BulkAnalysisInput> {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Invalid request body' };
  }
  
  const obj = body as Record<string, unknown>;
  
  // Validate startups array
  if (!Array.isArray(obj.startups) || obj.startups.length === 0) {
    return { success: false, error: 'Invalid or empty startups array' };
  }
  
  if (obj.startups.length > maxStartups) {
    return { success: false, error: `Maximum ${maxStartups} startups per batch allowed` };
  }
  
  const validatedStartups: StartupEntry[] = [];
  
  for (let i = 0; i < obj.startups.length; i++) {
    const startup = obj.startups[i];
    
    if (!startup || typeof startup !== 'object') {
      return { success: false, error: `Invalid startup data at index ${i}` };
    }
    
    const s = startup as Record<string, unknown>;
    
    if (!isNonEmptyString(s.name, maxNameLength)) {
      return { success: false, error: `Invalid or missing startup name at index ${i}` };
    }
    
    if (!isNonEmptyString(s.pitch, maxPitchLength)) {
      if (typeof s.pitch === 'string' && s.pitch.length > maxPitchLength) {
        return { success: false, error: `Pitch text too long for startup "${s.name}"` };
      }
      return { success: false, error: `Invalid or missing pitch for startup "${s.name}"` };
    }
    
    // Sanitize inputs
    validatedStartups.push({ 
      name: stripHtmlTags(s.name).trim(), 
      pitch: stripHtmlTags(s.pitch).trim() 
    });
  }
  
  const result: BulkAnalysisInput = { startups: validatedStartups };
  
  // Optional batchId validation (UUID format)
  if (obj.batchId !== undefined) {
    if (typeof obj.batchId !== 'string' || !isValidUUID(obj.batchId)) {
      return { success: false, error: 'Invalid batch ID format' };
    }
    result.batchId = obj.batchId;
  }
  
  // Optional batchSize validation
  if (obj.batchSize !== undefined) {
    if (!isPositiveInteger(obj.batchSize) || obj.batchSize > 10) {
      return { success: false, error: 'Batch size must be a positive integer between 1 and 10' };
    }
    result.batchSize = obj.batchSize;
  }
  
  return { success: true, data: result };
}

// Compare startups validation
export interface CompareInput {
  analyses: unknown[];
  startupNames: string[];
}

export function validateCompareInput(
  body: unknown,
  maxStartups = 10
): ValidationResult<CompareInput> {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Invalid request body' };
  }
  
  const obj = body as Record<string, unknown>;
  
  if (!Array.isArray(obj.analyses) || !Array.isArray(obj.startupNames)) {
    return { success: false, error: 'Invalid analyses or startupNames format' };
  }
  
  if (obj.analyses.length === 0 || obj.startupNames.length === 0) {
    return { success: false, error: 'At least one startup required for comparison' };
  }
  
  if (obj.analyses.length > maxStartups || obj.startupNames.length > maxStartups) {
    return { success: false, error: `Maximum ${maxStartups} startups can be compared at once` };
  }
  
  if (obj.analyses.length !== obj.startupNames.length) {
    return { success: false, error: 'Mismatch between analyses and startupNames count' };
  }
  
  // Validate startup names
  const validatedNames: string[] = [];
  for (let i = 0; i < obj.startupNames.length; i++) {
    if (!isNonEmptyString(obj.startupNames[i], 200)) {
      return { success: false, error: `Invalid startup name at index ${i}` };
    }
    validatedNames.push(stripHtmlTags(obj.startupNames[i] as string).trim());
  }
  
  // Validate each analysis has required scorecard structure
  for (let i = 0; i < obj.analyses.length; i++) {
    const analysis = obj.analyses[i] as Record<string, unknown>;
    if (!analysis?.scorecard || typeof analysis.scorecard !== 'object') {
      return { success: false, error: `Invalid analysis structure for startup at index ${i}` };
    }
    
    const scorecard = analysis.scorecard as Record<string, unknown>;
    if (!scorecard.team || !scorecard.marketSize) {
      return { success: false, error: `Missing required scorecard fields for startup at index ${i}` };
    }
  }
  
  return { 
    success: true, 
    data: { analyses: obj.analyses, startupNames: validatedNames } 
  };
}

// Bulk comparison validation
export interface BulkComparisonResult {
  startupName: string;
  sector: string;
  scores: {
    team: number;
    product: number;
    market: number;
    traction: number;
    funding: number;
    businessModel: number;
    overall: number;
  };
}

export interface BulkComparisonInput {
  results: BulkComparisonResult[];
}

export function validateBulkComparisonInput(
  body: unknown,
  maxResults = 200
): ValidationResult<BulkComparisonInput> {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Invalid request body' };
  }
  
  const obj = body as Record<string, unknown>;
  
  if (!Array.isArray(obj.results) || obj.results.length === 0) {
    return { success: false, error: 'Invalid or empty results array' };
  }
  
  if (obj.results.length > maxResults) {
    return { success: false, error: `Maximum ${maxResults} results can be processed at once` };
  }
  
  // Validate each result has required structure
  for (let i = 0; i < obj.results.length; i++) {
    const result = obj.results[i] as Record<string, unknown>;
    
    if (!result?.startupName || typeof result.startupName !== 'string') {
      return { success: false, error: `Missing startup name at index ${i}` };
    }
    
    if (!result?.scores || typeof result.scores !== 'object') {
      return { success: false, error: `Missing scores for startup at index ${i}` };
    }
    
    const scores = result.scores as Record<string, unknown>;
    if (typeof scores.overall !== 'number') {
      return { success: false, error: `Invalid overall score for startup at index ${i}` };
    }
  }
  
  return { success: true, data: { results: obj.results as BulkComparisonResult[] } };
}

// UUID validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
