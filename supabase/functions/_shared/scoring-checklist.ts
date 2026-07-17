// Deterministic checklist-based scoring.
// Each metric has exactly 12 binary questions. Score = clamp(round(yes/12 * 10), 1, 10).
// The model NEVER picks a number — it only answers yes/no per question with a short evidence quote.

export type MetricKey =
  | "team"
  | "marketSize"
  | "productDifferentiation"
  | "traction"
  | "businessModel"
  | "competitiveLandscape";

export const METRIC_KEYS: MetricKey[] = [
  "team",
  "marketSize",
  "productDifferentiation",
  "traction",
  "businessModel",
  "competitiveLandscape",
];

export const METRIC_LABELS: Record<MetricKey, string> = {
  team: "Team Quality",
  marketSize: "Market Size",
  productDifferentiation: "Product Differentiation",
  traction: "Traction",
  businessModel: "Business Model",
  competitiveLandscape: "Competitive Landscape",
};

export const CHECKLISTS: Record<MetricKey, string[]> = {
  team: [
    "At least one founder is named by full name.",
    "A founder has previously started another company.",
    "A founder has had a prior startup exit (acquisition or IPO).",
    "A founder has explicit domain experience in the startup's industry.",
    "There are at least 2 co-founders.",
    "A technical co-founder or CTO is identified.",
    "A business / GTM / commercial co-founder is identified.",
    "A relevant academic credential or specialized training is stated.",
    "A founder previously worked at a notable/well-known company.",
    "Advisors, mentors, or board members are named.",
    "Founders are stated to be working on the startup full-time.",
    "The team is described as having complementary skills (not all same background).",
  ],
  marketSize: [
    "A TAM figure is stated with a specific number.",
    "The stated TAM is greater than $1B.",
    "The stated TAM is greater than $10B.",
    "The stated TAM is greater than $50B.",
    "A market growth rate (CAGR or %) is cited.",
    "A source or citation is given for the market size figure.",
    "SAM or SOM (serviceable / obtainable market) is stated.",
    "A geographic scope (global, US, EU, etc.) is defined.",
    "A specific target customer segment is named.",
    "A market tailwind, trend, or 'why now' is cited.",
    "The market is described as currently growing (not flat or shrinking).",
    "The regulatory environment for this market is addressed.",
  ],
  productDifferentiation: [
    "A unique value proposition is explicitly stated.",
    "Differentiation from named competitors is described.",
    "Defensible technology, IP, or proprietary approach is cited.",
    "A patent or proprietary dataset is mentioned.",
    "Network effects are claimed with a specific mechanism.",
    "Customer switching costs are mentioned.",
    "A brand or distribution advantage is claimed.",
    "A first-mover or timing advantage is claimed with evidence.",
    "A working product exists today (not just concept or idea).",
    "A live demo, screenshots, or product link is referenced.",
    "A product roadmap or upcoming features are stated.",
    "Integrations or platform lock-in are described.",
  ],
  traction: [
    "A number of users or customers is cited.",
    "A revenue figure is cited.",
    "MRR or ARR is explicitly stated.",
    "A growth rate is cited with both a % and a time period.",
    "Retention or churn is stated with a number.",
    "Named customer logos or references are listed.",
    "Paid vs. free users are distinguished.",
    "A signed pilot or LOI is mentioned.",
    "Named partnerships are listed.",
    "Unit economics (CAC, LTV, or payback) are stated with numbers.",
    "An engagement metric (DAU/MAU, session, usage) is stated.",
    "A quantified waitlist or pre-order figure is given.",
  ],
  businessModel: [
    "Pricing is explicitly stated.",
    "The model is a recurring / subscription revenue model.",
    "Gross margin is stated or directly inferable.",
    "More than one revenue stream is described.",
    "Customer acquisition cost (CAC) is stated.",
    "Customer lifetime value (LTV) is stated.",
    "The sales channel is defined (self-serve, inside sales, enterprise, etc.).",
    "Self-serve vs. sales-led motion is explicitly stated.",
    "Contract length or ACV is stated.",
    "An upsell, expansion, or cross-sell mechanism is described.",
    "Capital efficiency or burn is addressed.",
    "A path to profitability or breakeven is discussed.",
  ],
  competitiveLandscape: [
    "Specific competitors are named.",
    "A competitive comparison or matrix is presented.",
    "A moat is explicitly stated.",
    "A barrier to entry is named.",
    "The market structure (fragmented / consolidated) is described.",
    "Risk from incumbents is addressed.",
    "Switching costs vs. incumbents are described.",
    "A regulatory moat is cited.",
    "A data moat is cited.",
    "A distribution moat is cited.",
    "A brand moat is cited.",
    "A 'why now' relative to competitors is cited.",
  ],
};

export const CHECKLIST_SIZE = 12;

export function deriveScore(yesCount: number): number {
  const clamped = Math.max(0, Math.min(CHECKLIST_SIZE, yesCount));
  const raw = Math.round((clamped / CHECKLIST_SIZE) * 10);
  return Math.max(1, Math.min(10, raw));
}

export type ChecklistResponse = {
  checklist: boolean[];
  evidence: string[];
};

export type PerMetricResponse = Record<MetricKey, ChecklistResponse>;

function normalizeMetric(raw: any): ChecklistResponse {
  const checklist: boolean[] = Array.from({ length: CHECKLIST_SIZE }, (_, i) => {
    const v = raw?.checklist?.[i];
    return v === true || v === "true" || v === 1 || v === "yes";
  });
  const evidence: string[] = Array.from({ length: CHECKLIST_SIZE }, (_, i) => {
    const v = raw?.evidence?.[i];
    return typeof v === "string" ? v.trim() : "";
  });
  return { checklist, evidence };
}

export function normalizeRun(raw: any): PerMetricResponse {
  const out = {} as PerMetricResponse;
  for (const key of METRIC_KEYS) {
    out[key] = normalizeMetric(raw?.[key]);
  }
  return out;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/**
 * Aggregate 1–3 runs by taking the median yes-count per checklist item across runs
 * (so a single-run outlier can't flip a bit). Evidence is taken from any run that
 * marked the item true, preferring the first run.
 */
export function aggregateRuns(runs: PerMetricResponse[]): PerMetricResponse {
  const valid = runs.filter(Boolean);
  if (valid.length === 0) throw new Error("No successful scoring runs");

  const out = {} as PerMetricResponse;
  for (const key of METRIC_KEYS) {
    const checklist: boolean[] = [];
    const evidence: string[] = [];
    for (let i = 0; i < CHECKLIST_SIZE; i++) {
      const bits = valid.map((r) => (r[key].checklist[i] ? 1 : 0));
      const m = median(bits) >= 1; // majority-of-runs true
      checklist.push(m);
      let ev = "";
      if (m) {
        for (const r of valid) {
          if (r[key].checklist[i] && r[key].evidence[i]) {
            ev = r[key].evidence[i];
            break;
          }
        }
      }
      evidence.push(ev);
    }
    out[key] = { checklist, evidence };
  }
  return out;
}

export function scoresFromAggregate(agg: PerMetricResponse): Record<MetricKey, number> {
  const out = {} as Record<MetricKey, number>;
  for (const key of METRIC_KEYS) {
    const yes = agg[key].checklist.filter(Boolean).length;
    out[key] = deriveScore(yes);
  }
  return out;
}

export function reasoningFromAggregate(agg: PerMetricResponse): Record<MetricKey, string> {
  const out = {} as Record<MetricKey, string>;
  for (const key of METRIC_KEYS) {
    const c = agg[key].checklist;
    const yes = c.filter(Boolean).length;
    const label = METRIC_LABELS[key];
    if (yes === 0) {
      out[key] = `${label}: 0/12 checklist items met. No qualifying information provided in the pitch.`;
      continue;
    }
    const bullets: string[] = [];
    for (let i = 0; i < CHECKLIST_SIZE && bullets.length < 4; i++) {
      if (c[i] && agg[key].evidence[i]) {
        bullets.push(agg[key].evidence[i].replace(/\s+/g, " ").trim());
      }
    }
    const missCount = CHECKLIST_SIZE - yes;
    out[key] = `${label}: ${yes}/12 checklist items met (${missCount} missing). Evidence: ${bullets.join(" | ")}`;
  }
  return out;
}

export function buildChecklistPromptSection(): string {
  const parts: string[] = [];
  for (const key of METRIC_KEYS) {
    parts.push(`\n[${key}] ${METRIC_LABELS[key]} — 12 items:`);
    CHECKLISTS[key].forEach((q, i) => parts.push(`  ${i + 1}. ${q}`));
  }
  return parts.join("\n");
}

export const CHECKLIST_SYSTEM_INSTRUCTION = `You are a deterministic evaluator. For each metric below you will answer a fixed list of 12 YES/NO questions about the startup pitch. You DO NOT assign scores or numbers of any kind — the caller computes scores from your yes-count.

RULES:
- Answer each question strictly true or false based ONLY on what is explicitly stated in the pitch.
- Do NOT infer, guess, assume, or extrapolate. If the pitch is silent on an item, answer false.
- For every item, provide a short evidence string: if true, quote the exact phrase from the pitch (max ~20 words); if false, use "not stated".
- Same pitch text must always produce the same answers.

CHECKLIST:${buildChecklistPromptSection()}

Return ONLY valid JSON in exactly this shape (no markdown, no commentary):
{
  "team":                  { "checklist": [12 booleans], "evidence": [12 strings] },
  "marketSize":            { "checklist": [12 booleans], "evidence": [12 strings] },
  "productDifferentiation":{ "checklist": [12 booleans], "evidence": [12 strings] },
  "traction":              { "checklist": [12 booleans], "evidence": [12 strings] },
  "businessModel":         { "checklist": [12 booleans], "evidence": [12 strings] },
  "competitiveLandscape":  { "checklist": [12 booleans], "evidence": [12 strings] }
}`;

export function extractJson(text: string): any {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("No JSON object found");
  let depth = 0;
  let end = -1;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) throw new Error("Unbalanced JSON");
  const candidate = cleaned.slice(start, end + 1)
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\u0000-\u001F]/g, " ");
  return JSON.parse(candidate);
}
