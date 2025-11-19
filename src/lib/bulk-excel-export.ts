import * as XLSX from 'xlsx';
import { BulkAnalysisResult, ComparisonReport } from '@/types/bulk-analysis';

interface CellStyle {
  fill?: {
    fgColor: { rgb: string };
  };
  font?: {
    color: { rgb: string };
    bold?: boolean;
  };
}

export function exportBulkAnalysisToExcel(
  results: BulkAnalysisResult[],
  comparisonReport: ComparisonReport | null,
  batchName: string
): void {
  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Detailed Results
  const resultsData = [
    [
      'Startup Name',
      'Sector',
      'Tags',
      'Team Score',
      'Product Score',
      'Market Score',
      'Traction Score',
      'Funding Score',
      'Business Model Score',
      'Overall Score',
      'Summary',
      'Team Metrics',
      'Product Metrics',
      'Market Metrics',
      'Traction Metrics',
      'Funding Metrics',
      'Business Model Metrics'
    ],
    ...results.map(r => [
      r.startupName,
      r.sector,
      r.tags.join(', '),
      r.scores.team,
      r.scores.product,
      r.scores.market,
      r.scores.traction,
      r.scores.funding,
      r.scores.businessModel,
      r.scores.overall,
      r.summary,
      r.metrics.team,
      r.metrics.product,
      r.metrics.market,
      r.metrics.traction,
      r.metrics.funding,
      r.metrics.businessModel
    ])
  ];

  const resultsSheet = XLSX.utils.aoa_to_sheet(resultsData);

  // Apply color coding to score columns (columns D-J: indices 3-9)
  const scoreColumns = [3, 4, 5, 6, 7, 8, 9]; // Team, Product, Market, Traction, Funding, BizModel, Overall
  
  for (let row = 1; row < resultsData.length; row++) {
    scoreColumns.forEach(col => {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const score = resultsData[row][col] as number;
      
      if (!resultsSheet[cellAddress]) return;
      
      let fillColor = 'FFFFFF';
      let fontColor = '000000';
      
      if (score >= 8) {
        fillColor = '166534'; // Dark Green
        fontColor = 'FFFFFF';
      } else if (score >= 6) {
        fillColor = '86EFAC'; // Light Green
        fontColor = '000000';
      } else if (score >= 4) {
        fillColor = 'FDE047'; // Yellow
        fontColor = '000000';
      } else if (score >= 1) {
        fillColor = 'DC2626'; // Red
        fontColor = 'FFFFFF';
      }
      
      resultsSheet[cellAddress].s = {
        fill: { fgColor: { rgb: fillColor } },
        font: { color: { rgb: fontColor }, bold: true }
      };
    });
  }

  // Set column widths
  resultsSheet['!cols'] = [
    { wch: 20 },  // Startup Name
    { wch: 15 },  // Sector
    { wch: 30 },  // Tags
    { wch: 12 },  // Team Score
    { wch: 13 },  // Product Score
    { wch: 13 },  // Market Score
    { wch: 14 },  // Traction Score
    { wch: 13 },  // Funding Score
    { wch: 18 },  // Business Model Score
    { wch: 13 },  // Overall Score
    { wch: 60 },  // Summary
    { wch: 40 },  // Team Metrics
    { wch: 40 },  // Product Metrics
    { wch: 40 },  // Market Metrics
    { wch: 40 },  // Traction Metrics
    { wch: 40 },  // Funding Metrics
    { wch: 40 }   // Business Model Metrics
  ];

  XLSX.utils.book_append_sheet(workbook, resultsSheet, 'Detailed Results');

  // Sheet 2: Investment Rankings (if comparison report exists)
  if (comparisonReport?.investmentRankings) {
    const rankingsData = [
      ['Rank', 'Startup Name', 'Overall Score', 'Top Strengths', 'Recommendation'],
      ...comparisonReport.investmentRankings.map(r => [
        r.rank,
        r.startupName,
        r.overallScore,
        r.topStrengths.join('; '),
        r.recommendation
      ])
    ];

    const rankingsSheet = XLSX.utils.aoa_to_sheet(rankingsData);
    rankingsSheet['!cols'] = [
      { wch: 8 },   // Rank
      { wch: 20 },  // Startup Name
      { wch: 13 },  // Overall Score
      { wch: 50 },  // Top Strengths
      { wch: 40 }   // Recommendation
    ];

    XLSX.utils.book_append_sheet(workbook, rankingsSheet, 'Investment Rankings');
  }

  // Sheet 3: Score Comparison
  if (comparisonReport?.scoreComparison) {
    const comparisonSheet = XLSX.utils.aoa_to_sheet([
      comparisonReport.scoreComparison.headers,
      ...comparisonReport.scoreComparison.rows
    ]);

    comparisonSheet['!cols'] = [
      { wch: 20 },  // Startup name
      ...Array(7).fill({ wch: 12 })  // Score columns
    ];

    XLSX.utils.book_append_sheet(workbook, comparisonSheet, 'Score Comparison');
  }

  // Sheet 4: Sector Breakdown
  if (comparisonReport?.sectorBreakdown) {
    const sectorData = [
      ['Sector', 'Number of Startups'],
      ...Object.entries(comparisonReport.sectorBreakdown).map(([sector, count]) => [sector, count])
    ];

    const sectorSheet = XLSX.utils.aoa_to_sheet(sectorData);
    sectorSheet['!cols'] = [
      { wch: 20 },  // Sector
      { wch: 20 }   // Count
    ];

    XLSX.utils.book_append_sheet(workbook, sectorSheet, 'Sector Breakdown');
  }

  // Sheet 5: Strengths & Weaknesses
  if (comparisonReport?.strengthsAndWeaknesses) {
    const swData = [
      ['Startup Name', 'Strengths', 'Weaknesses'],
      ...Object.entries(comparisonReport.strengthsAndWeaknesses).map(([name, data]) => [
        name,
        data.strengths.join('; '),
        data.weaknesses.join('; ')
      ])
    ];

    const swSheet = XLSX.utils.aoa_to_sheet(swData);
    swSheet['!cols'] = [
      { wch: 20 },  // Startup Name
      { wch: 60 },  // Strengths
      { wch: 60 }   // Weaknesses
    ];

    XLSX.utils.book_append_sheet(workbook, swSheet, 'Strengths & Weaknesses');
  }

  // Sheet 6: Summary
  if (comparisonReport?.overallRecommendation) {
    const summaryData = [
      ['Overall Recommendation'],
      [comparisonReport.overallRecommendation]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 100 }];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  }

  // Download file
  const fileName = `${batchName.replace(/[^a-z0-9]/gi, '_')}_analysis_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
