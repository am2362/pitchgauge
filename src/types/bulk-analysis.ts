export interface BulkStartupMetrics {
  team: string;
  product: string;
  market: string;
  traction: string;
  funding: string;
  businessModel: string;
}

export interface BulkStartupScores {
  team: number;
  product: number;
  market: number;
  traction: number;
  funding: number;
  businessModel: number;
  overall: number;
}

export interface BulkAnalysisResult {
  startupName: string;
  sector: string;
  tags: string[];
  metrics: BulkStartupMetrics;
  scores: BulkStartupScores;
  summary: string;
  /** Optional diagnostics from backend functions */
  errorType?: string;
  errorStatus?: number | null;
  errorMessage?: string;
}

export interface ScoreComparisonTable {
  headers: string[];
  rows: (string | number)[][];
}

export interface ComparisonReport {
  investmentRankings: InvestmentRanking[];
  overallRecommendation: string;
  scoreComparison: ScoreComparisonTable;
  strengthsAndWeaknesses: Record<string, { strengths: string[]; weaknesses: string[] }>;
  sectorBreakdown: Record<string, number>;
}

export interface InvestmentRanking {
  rank: number;
  startupName: string;
  overallScore: number;
  topStrengths: string[];
  recommendation: string;
}

export interface BulkAnalysis {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  batch_name: string;
  total_startups: number;
  completed_startups: number;
  status: 'processing' | 'completed' | 'failed';
  results: BulkAnalysisResult[] | null;
  comparison_report: ComparisonReport | null;
  metadata: Record<string, any> | null;
}
