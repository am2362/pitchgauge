import type { } from "@/integrations/supabase/types";

export const DEMO_STARTUP_NAME = "EcoTrack";

export const DEMO_PITCH_TEXT = `EcoTrack — B2B Carbon Tracking SaaS

Problem: Mid-market enterprises (500–5,000 employees) face increasing regulatory pressure to report Scope 1, 2, and 3 carbon emissions. Current solutions are either enterprise-priced (Persefoni, Watershed at $100K+/yr) or spreadsheet-based — leaving a massive gap.

Solution: EcoTrack is a self-serve carbon accounting platform that connects to ERP, travel, and procurement systems via API to auto-calculate emissions across all three scopes. Our proprietary emission-factor engine covers 14,000+ activity types and updates in real time as regulations change.

Market: The carbon accounting software market is projected to reach $64.4B by 2030 (Allied Market Research). Our ICP — mid-market companies in manufacturing, logistics, and professional services — represents ~120,000 firms in North America alone.

Traction: Launched 11 months ago. 47 paying customers, $620K ARR, growing 22% MoM. NPS of 72. Average contract value $13.2K/yr. Logo retention 96%.

Team: CEO Sarah Chen — ex-VP Product at Salesforce Sustainability Cloud, 15 years enterprise SaaS. CTO Marcus Rivera — PhD Climate Science, MIT; built emissions modelling at Carbon Trust. COO James Park — ex-McKinsey, led operational scale at two Series B climate-tech startups.

Business Model: Tiered SaaS — $499/mo (Starter), $1,299/mo (Growth), custom Enterprise. 82% gross margin. Land-and-expand: average customer increases spend 2.3x within 12 months.

Competitive Landscape: Persefoni (enterprise, $100M+ raised), Watershed (enterprise), Normative (EU-focused). No strong mid-market-native player. Our onboarding is 3 days vs. 3 months for incumbents.

Ask: Raising $8M Series A to expand sales team (6 → 18 AEs), build EU regulatory module, and achieve SOC 2 Type II.`;

export const DEMO_ANALYSIS_RESULT = {
  startupName: "EcoTrack",
  memo: {
    "Executive Summary": "EcoTrack is a compelling B2B SaaS opportunity targeting the underserved mid-market segment of carbon accounting. With $620K ARR growing 22% MoM after just 11 months, the company demonstrates strong product-market fit in a regulatory-tailwind market projected to reach $64B by 2030.",
    "Key Strengths": "The founding team is exceptionally strong — deep domain expertise in sustainability SaaS (Salesforce), climate science (MIT/Carbon Trust), and operational scaling (McKinsey). The 96% logo retention and NPS of 72 signal genuine product-market fit. The mid-market positioning is strategically sound: incumbents are priced out of this segment, and EcoTrack's 3-day onboarding vs. 3-month enterprise cycles is a meaningful moat.",
    "Primary Concerns": "22% MoM growth is impressive but the base is still small ($620K ARR). The $8M ask implies ~13x forward revenue multiple which is reasonable for the category. Scope 3 emissions tracking is notoriously complex and accuracy claims should be validated. EU regulatory expansion adds execution risk alongside the core NA growth.",
    "Investment Recommendation": "EcoTrack merits serious consideration for a Series A investment. The combination of a massive TAM, strong team pedigree, early but meaningful traction, and clear competitive whitespace in the mid-market makes this one of the more compelling climate-tech SaaS deals. Recommend proceeding to deep-dive due diligence focused on Scope 3 data accuracy and unit economics by cohort.",
  },
  scorecard: {
    team: {
      score: 9,
      reasoning: "Exceptional founding team with directly relevant experience. CEO from Salesforce Sustainability Cloud, CTO with PhD Climate Science from MIT and Carbon Trust background, COO with McKinsey pedigree and prior climate-tech scaling experience. Complementary skill sets across product, science, and operations.",
      detailedExplanation: "This is a rare team where every founder brings domain-specific expertise. Sarah Chen's VP-level experience at Salesforce Sustainability Cloud means she understands enterprise SaaS go-to-market and the carbon accounting buyer persona intimately. Marcus Rivera's academic credentials combined with industry application at Carbon Trust provide deep technical credibility for the emission-factor engine. James Park adds the operational rigor needed to scale from $620K to $10M+ ARR."
    },
    marketSize: {
      score: 8,
      reasoning: "TAM of $64.4B by 2030 is large and growing, driven by regulatory tailwinds (SEC climate disclosure rules, EU CSRD). The mid-market ICP of ~120,000 firms in NA alone provides a substantial serviceable market.",
      detailedExplanation: "The carbon accounting market benefits from a rare combination of regulatory mandate and enterprise digital transformation. The mid-market segment is particularly attractive because it's large enough to build a significant business but underserved by current enterprise-focused solutions. Risk: market size projections in climate-tech can be aggressive — the $64B figure likely includes adjacent categories."
    },
    traction: {
      score: 7,
      reasoning: "47 paying customers and $620K ARR in 11 months is solid early traction. 22% MoM growth, 96% logo retention, and NPS of 72 all point to strong product-market fit. However, the absolute numbers are still early-stage.",
      detailedExplanation: "The metrics tell a cohesive story: customers are signing up (22% MoM growth), staying (96% retention), happy (72 NPS), and expanding (2.3x within 12 months). The $13.2K ACV is healthy for mid-market SaaS. The 7 rather than 8 reflects that $620K ARR, while growing fast, is still a relatively small base — the next 6 months of growth consistency will be crucial."
    },
    productDifferentiation: {
      score: 7,
      reasoning: "Proprietary emission-factor engine covering 14,000+ activity types and 3-day onboarding vs. 3-month enterprise alternatives are meaningful differentiators. API-first integration approach adds stickiness.",
      detailedExplanation: "The product differentiation is primarily in go-to-market positioning (mid-market native) and implementation speed rather than fundamental technology moats. The emission-factor engine is valuable but could be replicated. The real moat will develop through data network effects as more customers onboard and through regulatory compliance certifications."
    },
    businessModel: {
      score: 8,
      reasoning: "Tiered SaaS model with 82% gross margins and strong land-and-expand (2.3x within 12 months) is textbook excellent. $499–$1,299/mo pricing is accessible for mid-market budgets while maintaining healthy economics.",
      detailedExplanation: "The business model is well-designed for the target market. The pricing tiers create a natural upgrade path, and the 2.3x expansion rate suggests the product delivers measurable value. 82% gross margins are strong for B2B SaaS and leave room for investment in sales and R&D. The key question is CAC payback period, which wasn't disclosed."
    },
    competitiveLandscape: {
      score: 7,
      reasoning: "Well-identified competitive gap in mid-market. Incumbents (Persefoni, Watershed) are enterprise-focused. However, this gap will attract more competition as the market grows, and incumbents may move downmarket.",
      detailedExplanation: "EcoTrack has correctly identified a positioning gap, but the competitive moat is not yet deep. Persefoni ($100M+ raised) and Watershed could build mid-market products. Normative's EU focus leaves NA open for now. The 3-day vs. 3-month onboarding difference is the strongest competitive narrative. Score of 7 reflects solid current positioning but moderate long-term defensibility."
    },
  },
  redFlags: [
    {
      severity: "medium" as const,
      issue: "Small revenue base",
      explanation: "$620K ARR is encouraging for 11 months but still early. Growth rate consistency over the next 2–3 quarters will be critical to validate whether 22% MoM is sustainable or reflects initial launch momentum."
    },
    {
      severity: "medium" as const,
      issue: "Scope 3 accuracy claims",
      explanation: "Scope 3 emissions tracking is notoriously difficult and data-intensive. The claim of covering 14,000+ activity types should be validated with customer references. Inaccurate reporting could create legal liability for customers."
    },
    {
      severity: "medium" as const,
      issue: "Dual expansion risk",
      explanation: "Simultaneously expanding the sales team from 6 to 18 AEs while building an EU regulatory module is ambitious. Attempting both with $8M may stretch resources thin. Consider phased execution."
    },
  ],
  followUpQuestions: {
    team: [
      "What is the equity split among co-founders?",
      "Are there plans to hire a VP Sales with mid-market SaaS experience?",
      "What is the current team size and planned headcount growth?",
    ],
    market: [
      "What is the breakdown of customers by industry vertical?",
      "How dependent is growth on specific regulatory timelines (e.g., SEC disclosure rules)?",
      "What is the competitive response from Persefoni/Watershed in the mid-market?",
    ],
    product: [
      "What is the accuracy rate of Scope 3 calculations vs. manual audits?",
      "How many ERP/procurement system integrations are currently live?",
      "What is the product roadmap for EU CSRD compliance?",
    ],
    financials: [
      "What is the blended CAC and CAC payback period?",
      "What does the cohort retention curve look like at 6 and 12 months?",
      "What is the current monthly burn rate and implied runway?",
    ],
    legal: [
      "Any pending SOC 2 Type II timeline?",
      "How are data privacy regulations (GDPR) handled for EU expansion?",
      "Are there liability protections if reported emissions data proves inaccurate?",
    ],
  },
  investmentThesis: {
    bullCase: "EcoTrack is positioned at the intersection of regulatory mandate and technology disruption, targeting a large and underserved mid-market segment with a product that demonstrably reduces time-to-compliance from months to days. If the 22% MoM growth sustains through the Series A period, the company could reach $3–5M ARR within 12 months — putting it in strong position for a $30–50M Series B. The team's pedigree de-risks execution considerably, and the 2.3x expansion rate suggests a path to net dollar retention above 130%.",
    bearCase: "The $620K ARR base is small enough that growth rates could be misleading — a few large deals can skew MoM numbers. Scope 3 tracking accuracy is unproven at scale. The carbon accounting market, while growing, is subject to regulatory timing risk (SEC rules could be delayed or weakened). Enterprise incumbents with $100M+ in funding could move downmarket with simplified products. The dual focus on NA sales scaling and EU product development with $8M is aggressive.",
  },
  benchmarking: {
    overallPercentile: "Top 15% of Series A climate-tech SaaS",
    stageContext: "For an 11-month-old B2B SaaS at Series A, $620K ARR with 22% MoM growth places EcoTrack well above median. Typical Series A climate-tech companies show $300–500K ARR with 10–15% MoM growth. The team quality and retention metrics further differentiate this from peer set.",
    comparisonNotes: "Comparable to Watershed's early metrics (pre-Series A) but targeting a different market segment. Growth trajectory similar to Persefoni's first year but at a lower ACV and higher volume — consistent with mid-market positioning. NPS of 72 exceeds B2B SaaS median of ~40.",
  },
};
