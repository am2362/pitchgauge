import type { } from "@/integrations/supabase/types";
import type { BulkAnalysisResult, ComparisonReport } from "@/types/bulk-analysis";

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

// ============================================================
// PDF DEMO ANALYSIS RESULT
// ============================================================
export const DEMO_PDF_ANALYSIS_RESULT = {
  startupName: "EcoTrack",
  memo: {
    "Executive Summary": "EcoTrack addresses the rapidly growing enterprise demand for carbon tracking and ESG compliance tools. The team brings strong domain expertise in sustainability and enterprise SaaS. Their platform automates carbon accounting across complex supply chains, reducing compliance costs by up to 60%.",
    "Key Strengths": "Strong domain expertise in sustainability SaaS. Large addressable market driven by ESG regulation. Product automates complex supply chain carbon accounting. Potential for significant cost savings for enterprise customers.",
    "Primary Concerns": "Early stage traction with limited revenue. Crowded market with well-funded incumbents like Watershed and Persefoni. Enterprise sales cycles of 6-12 months may strain runway.",
    "Investment Recommendation": "EcoTrack is a promising early-stage opportunity in a structurally growing market. Recommend monitoring for another quarter of traction data before committing capital. The team and market thesis are strong, but revenue proof points need to strengthen.",
  },
  scorecard: {
    team: { score: 7, reasoning: "Strong domain expertise in sustainability and enterprise SaaS. Founding team has relevant industry experience but lacks a proven track record of scaling a startup to Series B+.", detailedExplanation: "The team has deep knowledge of the carbon tracking space and enterprise sales, but would benefit from a seasoned CRO or VP Sales hire." },
    marketSize: { score: 9, reasoning: "The ESG compliance and carbon tracking market is projected to exceed $60B by 2030, driven by regulatory mandates across US and EU. Strong structural tailwinds.", detailedExplanation: "Regulatory pressure from SEC, EU CSRD, and corporate net-zero commitments create a massive and growing TAM. The mid-market segment alone represents tens of thousands of potential customers." },
    productDifferentiation: { score: 7, reasoning: "Automated supply chain carbon accounting is a meaningful differentiator. However, the core technology is replicable by well-funded competitors.", detailedExplanation: "The 60% cost reduction claim is compelling but needs third-party validation. API-first architecture is a strength for enterprise integration." },
    traction: { score: 6, reasoning: "Early stage with $12k MRR and a handful of pilot customers. Product-market fit signals are emerging but not yet proven at scale.", detailedExplanation: "The company has secured several pilot agreements with mid-market enterprises, but conversion to paid contracts is still in progress. Pipeline looks promising but revenue is pre-inflection." },
    businessModel: { score: 8, reasoning: "SaaS model with tiered pricing and strong potential for land-and-expand within enterprise accounts. Gross margins expected above 80%.", detailedExplanation: "The pricing model is well-structured for mid-market buyers. Expansion revenue potential is high as customers add more supply chain data sources." },
    competitiveLandscape: { score: 7, reasoning: "Competitive market with well-funded players (Watershed, Persefoni, Normative). EcoTrack's mid-market focus provides differentiation but the moat is shallow.", detailedExplanation: "Incumbents are focused on enterprise, leaving a gap in mid-market. However, downmarket expansion by larger players is a real risk within 12-18 months." },
  },
  redFlags: [
    { severity: "medium" as const, issue: "Early stage traction with limited revenue", explanation: "$12k MRR is pre-product-market-fit for a Series A raise. Need to see acceleration in the next 2 quarters." },
    { severity: "high" as const, issue: "Crowded market with well-funded incumbents", explanation: "Watershed ($100M+), Persefoni ($100M+), and Normative are all well-capitalized. Risk of feature parity erosion." },
    { severity: "medium" as const, issue: "Enterprise sales cycle risk", explanation: "Enterprise procurement can take 6-12 months. This creates cash flow uncertainty and extends time to meaningful ARR." },
  ],
  followUpQuestions: {
    team: ["What is your unfair advantage in winning enterprise contracts?", "Plans to hire a CRO or VP Sales?"],
    market: ["How do you plan to differentiate from Watershed and Persefoni?", "What regulatory timelines are you betting on?"],
    product: ["What does your data integration process look like for complex supply chains?", "How do you validate the 60% cost reduction claim?"],
    financials: ["What is your current pipeline and average contract value?", "What is your burn rate and runway?"],
    legal: ["What are your gross margins and payback period?", "Any IP or patent filings?"],
  },
  investmentThesis: {
    bullCase: "ESG compliance becomes mandatory globally, creating a massive tailwind. EcoTrack's automation moat deepens with more integrations. Land and expand strategy drives strong net revenue retention.",
    bearCase: "Larger players like Salesforce or SAP build native carbon tracking. Regulatory timelines slip, reducing urgency. Enterprise sales cycles drain runway before product-market fit is achieved.",
  },
  benchmarking: {
    overallPercentile: "72nd percentile overall",
    stageContext: "Series A stage. Scores above average for market size and business model, below average for traction compared to Series A peers.",
    comparisonNotes: "Scores above average for market size and business model, below average for traction compared to Series A peers. Team score is in line with median for climate-tech startups at this stage.",
  },
};

// ============================================================
// COMPARISON DEMO DATA
// ============================================================
export const DEMO_COMPARISON_PITCHES = [
  {
    id: 1,
    name: "EcoTrack",
    text: "EcoTrack is a B2B carbon tracking SaaS platform that automates Scope 1, 2, and 3 emissions reporting for mid-market enterprises. $12k MRR, 5 pilot customers, strong ESG regulatory tailwind.",
  },
  {
    id: 2,
    name: "FinFlow",
    text: "FinFlow is a B2B payments infrastructure platform that enables businesses to embed payment processing, invoicing, and reconciliation into their existing workflows. Founded by ex-Stripe and Plaid engineers. $180k MRR, 120+ business customers, processing $45M monthly volume.",
  },
  {
    id: 3,
    name: "MediSync",
    text: "MediSync is an AI-powered healthcare diagnostics platform that uses computer vision and NLP to assist radiologists in detecting early-stage cancers. Founded by a team of Stanford Medical School researchers. 3 hospital pilot partnerships, pending FDA 510(k) clearance.",
  },
];

export const DEMO_COMPARISON_RESULTS = [
  {
    startupName: "EcoTrack",
    memo: { "Executive Summary": "Strong market thesis in ESG compliance. Early traction but large TAM.", "Key Strengths": "Large addressable market, strong regulatory tailwinds, automated compliance tooling.", "Primary Concerns": "Early revenue, competitive market, long sales cycles.", "Investment Recommendation": "High potential watch for next round." },
    scorecard: {
      team: { score: 7, reasoning: "Strong domain expertise in sustainability and enterprise SaaS." },
      marketSize: { score: 9, reasoning: "ESG compliance market projected to exceed $60B by 2030." },
      productDifferentiation: { score: 7, reasoning: "Automated supply chain carbon accounting is differentiated but replicable." },
      traction: { score: 6, reasoning: "Early stage with $12k MRR and pilot customers." },
      businessModel: { score: 8, reasoning: "Tiered SaaS with 80%+ gross margins and expansion potential." },
      competitiveLandscape: { score: 7, reasoning: "Mid-market focus differentiates from enterprise incumbents." },
    },
    redFlags: [
      { severity: "medium" as const, issue: "Early traction", explanation: "Limited revenue base for Series A." },
      { severity: "medium" as const, issue: "Long enterprise sales cycles", explanation: "6-12 month procurement timelines." },
    ],
    followUpQuestions: { team: ["Hiring plans?"], market: ["Regulatory timeline dependency?"], product: ["Integration complexity?"], financials: ["Burn rate?"], legal: ["SOC 2 status?"] },
    investmentThesis: { bullCase: "ESG mandates create massive tailwind.", bearCase: "Incumbents move downmarket." },
    benchmarking: { overallPercentile: "72nd percentile", stageContext: "Series A", comparisonNotes: "Above average market, below average traction." },
  },
  {
    startupName: "FinFlow",
    memo: { "Executive Summary": "FinFlow is a high-traction payments infrastructure play with proven team and scalable model.", "Key Strengths": "Ex-Stripe/Plaid founding team, $180k MRR, 120+ customers, high processing volume.", "Primary Concerns": "Highly competitive fintech space, regulatory complexity across markets.", "Investment Recommendation": "Strongest investment opportunity in this cohort. Proceed to term sheet." },
    scorecard: {
      team: { score: 9, reasoning: "Exceptional founding team with Stripe and Plaid alumni. Deep payments domain expertise and proven ability to ship enterprise-grade infrastructure." },
      marketSize: { score: 9, reasoning: "Global B2B payments market exceeds $120T annually. Even capturing a tiny fraction represents a massive opportunity." },
      productDifferentiation: { score: 8, reasoning: "Embedded payments with unified invoicing and reconciliation. Developer-first API approach with superior documentation." },
      traction: { score: 8, reasoning: "$180k MRR with 120+ business customers and $45M monthly processing volume. Strong growth trajectory." },
      businessModel: { score: 9, reasoning: "Transaction-based revenue with SaaS floor. Take rate of 0.4% on volume plus platform fees. Net revenue retention above 130%." },
      competitiveLandscape: { score: 7, reasoning: "Competitive space (Stripe, Adyen, Square) but strong differentiation in mid-market B2B vertical." },
    },
    redFlags: [
      { severity: "medium" as const, issue: "Competitive fintech landscape", explanation: "Well-funded incumbents with deep moats." },
      { severity: "low" as const, issue: "Regulatory complexity", explanation: "Multi-market licensing requirements." },
    ],
    followUpQuestions: { team: ["VP Sales hire timeline?"], market: ["Geographic expansion plans?"], product: ["Compliance automation roadmap?"], financials: ["Unit economics by cohort?"], legal: ["Money transmitter licenses?"] },
    investmentThesis: { bullCase: "B2B payments digitization accelerates. FinFlow becomes the default mid-market infrastructure.", bearCase: "Stripe launches competing embedded product. Margins compress." },
    benchmarking: { overallPercentile: "91st percentile", stageContext: "Series A", comparisonNotes: "Top decile for traction and team quality." },
  },
  {
    startupName: "MediSync",
    memo: { "Executive Summary": "MediSync is a high-potential AI diagnostics platform with strong IP and clinical validation path, but faces significant regulatory and commercialisation hurdles.", "Key Strengths": "Strong Stanford Medical School founding team, proprietary computer vision models, clear clinical validation pathway.", "Primary Concerns": "FDA clearance timeline uncertainty, slow hospital sales cycles, unclear reimbursement model.", "Investment Recommendation": "Requires regulatory clarity before committing capital. Monitor for FDA progress." },
    scorecard: {
      team: { score: 8, reasoning: "Experienced medical AI team from Stanford Medical School. Strong research credentials and clinical network. Needs commercial leadership." },
      marketSize: { score: 8, reasoning: "AI medical diagnostics market projected at $45B by 2030. Radiology AI segment growing 30%+ annually." },
      productDifferentiation: { score: 8, reasoning: "Proprietary computer vision models with published clinical accuracy data. Strong IP position with 3 patent applications." },
      traction: { score: 5, reasoning: "3 hospital pilot partnerships but no revenue. Pending FDA 510(k) clearance. Clinical validation in progress." },
      businessModel: { score: 6, reasoning: "Per-scan SaaS model planned but reimbursement pathway unclear. Hospital procurement cycles of 12-18 months." },
      competitiveLandscape: { score: 6, reasoning: "Growing field with funded competitors (Viz.ai, Aidoc). Differentiation through cancer-specific focus." },
    },
    redFlags: [
      { severity: "high" as const, issue: "Regulatory approval risk", explanation: "FDA 510(k) clearance timeline is uncertain and could take 12-24 months." },
      { severity: "high" as const, issue: "No revenue", explanation: "Pre-revenue with only pilot partnerships. Long path to commercial traction." },
      { severity: "medium" as const, issue: "Unclear reimbursement model", explanation: "Healthcare reimbursement for AI diagnostics is still evolving." },
    ],
    followUpQuestions: { team: ["Plans for commercial leadership?"], market: ["Reimbursement strategy?"], product: ["FDA submission timeline?"], financials: ["Burn rate and runway?"], legal: ["Patent status?"] },
    investmentThesis: { bullCase: "FDA approval triggers rapid hospital adoption. AI diagnostics becomes standard of care.", bearCase: "Regulatory delays drain runway. Larger imaging companies build competing AI." },
    benchmarking: { overallPercentile: "58th percentile", stageContext: "Pre-Series A / Series A", comparisonNotes: "Strong team and product IP, below average on traction and business model clarity." },
  },
];

export const DEMO_COMPARISON_INSIGHTS = {
  rankings: [
    { rank: 1, name: "FinFlow", overallScore: 8.3, topStrengths: ["Exceptional team (Stripe/Plaid alumni)", "Strong traction at $180k MRR", "Scalable transaction-based model"] },
    { rank: 2, name: "EcoTrack", overallScore: 7.3, topStrengths: ["Massive ESG market tailwind", "Strong business model", "Mid-market positioning"] },
    { rank: 3, name: "MediSync", overallScore: 6.8, topStrengths: ["Strong IP and clinical validation", "Experienced medical team", "Large addressable market"] },
  ],
  overallRecommendation: "FinFlow presents the strongest investment opportunity with proven traction and a scalable business model. EcoTrack is a high potential watch for next round. MediSync requires regulatory clarity before committing capital.",
  strengthsWeaknesses: {
    "FinFlow": {
      strengths: ["Strong founding team with Stripe and Plaid alumni", "Clear monetisation with transaction-based revenue", "Strong traction at $180k MRR with 120+ customers"],
      weaknesses: ["Highly competitive space with well-funded incumbents", "Regulatory risk across multiple markets"],
    },
    "EcoTrack": {
      strengths: ["Large TAM with strong ESG tailwind", "Automated compliance tooling", "Strong business model with expansion revenue"],
      weaknesses: ["Early traction with limited revenue ($12k MRR)", "Long enterprise sales cycles of 6-12 months"],
    },
    "MediSync": {
      strengths: ["Strong IP with patent applications", "Experienced medical team from Stanford", "Clear clinical validation path"],
      weaknesses: ["Regulatory approval risk (FDA 510(k) pending)", "Slow hospital sales cycles", "Unclear reimbursement model"],
    },
  },
};

// ============================================================
// BULK DEMO DATA
// ============================================================
export const DEMO_BULK_RESULTS: BulkAnalysisResult[] = [
  { startupName: "FinFlow", sector: "Fintech", tags: ["B2B", "Payments", "Infrastructure"], metrics: { team: "Ex-Stripe/Plaid founders", product: "Embedded payments API", market: "$120T B2B payments", traction: "$180k MRR, 120+ customers", funding: "Series A, $10M", businessModel: "Transaction fees + SaaS" }, scores: { team: 9, product: 8, market: 9, traction: 8, funding: 8, businessModel: 9, overall: 8.3 }, summary: "High-traction payments infrastructure with proven team and scalable model." },
  { startupName: "EcoTrack", sector: "CleanTech", tags: ["B2B", "SaaS", "ESG"], metrics: { team: "Domain experts in sustainability", product: "Carbon tracking platform", market: "$64B carbon accounting", traction: "$12k MRR, 5 pilots", funding: "Series A, $8M", businessModel: "Tiered SaaS" }, scores: { team: 7, product: 7, market: 9, traction: 6, funding: 7, businessModel: 8, overall: 7.4 }, summary: "Strong market thesis with ESG regulatory tailwind. Early traction needs acceleration." },
  { startupName: "MediSync", sector: "HealthTech", tags: ["AI", "Diagnostics", "B2B"], metrics: { team: "Stanford Medical School researchers", product: "AI radiology diagnostics", market: "$45B AI diagnostics", traction: "3 hospital pilots, pre-revenue", funding: "Series A, $12M", businessModel: "Per-scan SaaS" }, scores: { team: 8, product: 8, market: 8, traction: 5, funding: 7, businessModel: 6, overall: 7.1 }, summary: "Strong IP and clinical validation path but faces regulatory and commercialisation hurdles." },
  { startupName: "DataPulse", sector: "SaaS Analytics", tags: ["B2B", "Analytics", "Data"], metrics: { team: "Ex-Datadog engineers", product: "Real-time analytics platform", market: "$30B analytics market", traction: "$85k MRR, 60 customers", funding: "Series A, $6M", businessModel: "Usage-based SaaS" }, scores: { team: 7, product: 7, market: 7, traction: 7, funding: 7, businessModel: 6, overall: 6.8 }, summary: "Solid analytics play with decent traction but faces stiff competition from established players." },
  { startupName: "ShipEase", sector: "Logistics", tags: ["B2B", "Logistics", "Marketplace"], metrics: { team: "Ex-Flexport operators", product: "SMB freight marketplace", market: "$25B SMB freight", traction: "$65k MRR, 200+ shippers", funding: "Series A, $7M", businessModel: "Take rate on transactions" }, scores: { team: 7, product: 6, market: 7, traction: 7, funding: 6, businessModel: 6, overall: 6.5 }, summary: "Growing SMB freight marketplace with good volume but thin margins." },
  { startupName: "NutriAI", sector: "FoodTech", tags: ["B2C", "AI", "Health"], metrics: { team: "Nutrition PhDs + ML engineers", product: "AI nutrition coaching app", market: "$15B digital health", traction: "50k downloads, $8k MRR", funding: "Seed+, $3M", businessModel: "Subscription" }, scores: { team: 6, product: 7, market: 6, traction: 6, funding: 6, businessModel: 6, overall: 6.2 }, summary: "Interesting B2C AI play but challenging unit economics and high churn risk." },
  { startupName: "LegalBot", sector: "LegalTech", tags: ["B2B", "AI", "Legal"], metrics: { team: "Ex-BigLaw + NLP researchers", product: "AI contract review tool", market: "$20B legal services", traction: "$30k MRR, 25 law firms", funding: "Series A, $5M", businessModel: "Per-seat SaaS" }, scores: { team: 7, product: 6, market: 6, traction: 6, funding: 6, businessModel: 5, overall: 6.0 }, summary: "Useful product in a notoriously slow-to-adopt industry. Needs to prove faster sales cycles." },
  { startupName: "BuildSmart", sector: "PropTech", tags: ["B2B", "Construction", "IoT"], metrics: { team: "Construction industry veterans", product: "IoT site monitoring platform", market: "$18B construction tech", traction: "$20k MRR, 12 sites", funding: "Seed, $2.5M", businessModel: "Hardware + SaaS" }, scores: { team: 6, product: 6, market: 6, traction: 5, funding: 6, businessModel: 6, overall: 5.8 }, summary: "Hardware-dependent model adds complexity. Interesting niche but slow adoption." },
  { startupName: "EduPath", sector: "EdTech", tags: ["B2B2C", "Education", "AI"], metrics: { team: "Former teachers + engineers", product: "AI tutoring platform", market: "$10B EdTech", traction: "2k students, $5k MRR", funding: "Seed, $1.5M", businessModel: "Subscription" }, scores: { team: 5, product: 6, market: 6, traction: 5, funding: 5, businessModel: 6, overall: 5.5 }, summary: "Early-stage EdTech with limited differentiation. Needs to find a sharper wedge." },
  { startupName: "RetailIQ", sector: "RetailTech", tags: ["B2B", "Retail", "Analytics"], metrics: { team: "Retail consultants", product: "In-store analytics dashboard", market: "$8B retail analytics", traction: "$3k MRR, 8 stores", funding: "Pre-seed, $800k", businessModel: "SaaS" }, scores: { team: 5, product: 5, market: 5, traction: 5, funding: 5, businessModel: 6, overall: 5.2 }, summary: "Very early stage with limited traction. Market is shifting to online — physical retail analytics is niche." },
];

export const DEMO_BULK_COMPARISON_REPORT: ComparisonReport = {
  investmentRankings: [
    { rank: 1, startupName: "FinFlow", overallScore: 8.3, topStrengths: ["Ex-Stripe/Plaid team", "$180k MRR", "Transaction-based revenue"], recommendation: "Strong invest — proceed to term sheet" },
    { rank: 2, startupName: "EcoTrack", overallScore: 7.4, topStrengths: ["$64B TAM", "ESG tailwind", "80%+ gross margins"], recommendation: "Watch for next round — monitor traction" },
    { rank: 3, startupName: "MediSync", overallScore: 7.1, topStrengths: ["Strong IP", "Stanford team", "Clinical validation"], recommendation: "Hold — await FDA clearance" },
    { rank: 4, startupName: "DataPulse", overallScore: 6.8, topStrengths: ["Ex-Datadog team", "Usage-based model", "60 customers"], recommendation: "Borderline — needs stronger differentiation" },
    { rank: 5, startupName: "ShipEase", overallScore: 6.5, topStrengths: ["200+ shippers", "Growing marketplace", "Flexport alumni"], recommendation: "Pass — thin margins, capital intensive" },
    { rank: 6, startupName: "NutriAI", overallScore: 6.2, topStrengths: ["AI-powered", "Growing health market", "50k downloads"], recommendation: "Pass — B2C unit economics challenging" },
    { rank: 7, startupName: "LegalBot", overallScore: 6.0, topStrengths: ["AI contract review", "25 law firms", "NLP expertise"], recommendation: "Pass — slow industry adoption" },
    { rank: 8, startupName: "BuildSmart", overallScore: 5.8, topStrengths: ["IoT monitoring", "Construction niche", "Industry veterans"], recommendation: "Pass — hardware dependency risk" },
    { rank: 9, startupName: "EduPath", overallScore: 5.5, topStrengths: ["AI tutoring", "Mission-driven", "Growing market"], recommendation: "Pass — too early, limited differentiation" },
    { rank: 10, startupName: "RetailIQ", overallScore: 5.2, topStrengths: ["Analytics dashboard", "Retail focus", "Low-cost entry"], recommendation: "Pass — niche market, limited upside" },
  ],
  overallRecommendation: "FinFlow is the standout investment opportunity in this batch with strong traction, exceptional team, and scalable business model. EcoTrack and MediSync warrant monitoring for future rounds. The remaining startups face significant challenges in their respective markets.",
  scoreComparison: {
    headers: ["Startup", "Team", "Product", "Market", "Traction", "Business Model", "Overall"],
    rows: [
      ["FinFlow", 9, 8, 9, 8, 9, 8.3],
      ["EcoTrack", 7, 7, 9, 6, 8, 7.4],
      ["MediSync", 8, 8, 8, 5, 6, 7.1],
      ["DataPulse", 7, 7, 7, 7, 6, 6.8],
      ["ShipEase", 7, 6, 7, 7, 6, 6.5],
      ["NutriAI", 6, 7, 6, 6, 6, 6.2],
      ["LegalBot", 7, 6, 6, 6, 5, 6.0],
      ["BuildSmart", 6, 6, 6, 5, 6, 5.8],
      ["EduPath", 5, 6, 6, 5, 6, 5.5],
      ["RetailIQ", 5, 5, 5, 5, 6, 5.2],
    ],
  },
  strengthsAndWeaknesses: {
    "FinFlow": { strengths: ["Ex-Stripe/Plaid team", "$180k MRR", "Net revenue retention >130%"], weaknesses: ["Competitive fintech space", "Multi-market regulatory risk"] },
    "EcoTrack": { strengths: ["$64B TAM", "ESG regulatory tailwind", "80%+ gross margins"], weaknesses: ["$12k MRR (early)", "Long enterprise sales cycles"] },
    "MediSync": { strengths: ["Strong IP", "Stanford Medical School team", "Clinical validation path"], weaknesses: ["Pre-revenue", "FDA clearance uncertainty", "Unclear reimbursement"] },
    "DataPulse": { strengths: ["Ex-Datadog team", "60 paying customers", "Usage-based pricing"], weaknesses: ["Crowded analytics space", "Limited differentiation"] },
    "ShipEase": { strengths: ["200+ shippers on platform", "Growing volume", "Flexport alumni"], weaknesses: ["Thin marketplace margins", "Capital intensive logistics"] },
    "NutriAI": { strengths: ["50k app downloads", "AI-powered personalisation", "Health market growth"], weaknesses: ["High B2C churn risk", "Challenging unit economics"] },
    "LegalBot": { strengths: ["AI contract review", "25 law firm clients", "NLP expertise"], weaknesses: ["Slow legal industry adoption", "Low willingness to pay"] },
    "BuildSmart": { strengths: ["IoT site monitoring", "Construction industry veterans"], weaknesses: ["Hardware dependency", "Slow construction tech adoption"] },
    "EduPath": { strengths: ["AI tutoring concept", "Mission-driven"], weaknesses: ["Very early stage", "Limited differentiation", "Small addressable segment"] },
    "RetailIQ": { strengths: ["Low-cost analytics tool", "Simple deployment"], weaknesses: ["Niche physical retail market", "Shift to e-commerce"] },
  },
  sectorBreakdown: {
    "Fintech": 1,
    "CleanTech": 1,
    "HealthTech": 1,
    "SaaS Analytics": 1,
    "Logistics": 1,
    "FoodTech": 1,
    "LegalTech": 1,
    "PropTech": 1,
    "EdTech": 1,
    "RetailTech": 1,
  },
};
