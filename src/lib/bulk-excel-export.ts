import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { BulkAnalysisResult, ComparisonReport } from '@/types/bulk-analysis';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function toArgb(rgb: string) {
  // ExcelJS uses ARGB (alpha + rgb)
  const cleaned = rgb.replace('#', '').toUpperCase();
  return cleaned.length === 6 ? `FF${cleaned}` : cleaned;
}

function downloadXlsx(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportBulkAnalysisToExcel(
  results: BulkAnalysisResult[],
  comparisonReport: ComparisonReport | null,
  batchName: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Detailed Results
  const resultsSheet = workbook.addWorksheet('Detailed Results');

  const header = [
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
  ];

  resultsSheet.addRow(header);
  results.forEach((r) => {
    resultsSheet.addRow([
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
    ]);
  });

  // Set column widths
  const widths = [20, 15, 30, 12, 13, 13, 14, 13, 18, 13, 60, 40, 40, 40, 40, 40, 40];
  widths.forEach((w, idx) => {
    resultsSheet.getColumn(idx + 1).width = w;
  });

  // Apply color coding to score columns (Team..Overall => columns 4-10)
  const scoreColumns = [4, 5, 6, 7, 8, 9, 10];
  for (let rowNumber = 2; rowNumber <= resultsSheet.rowCount; rowNumber++) {
    scoreColumns.forEach((colNumber) => {
      const cell = resultsSheet.getRow(rowNumber).getCell(colNumber);
      const score = Number(cell.value ?? 0);
      if (!Number.isFinite(score)) return;

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

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: toArgb(fillColor) }
      };
      cell.font = {
        ...(cell.font ?? {}),
        color: { argb: toArgb(fontColor) },
        bold: true
      };
    });
  }

  // Sheet 2: Investment Rankings (if comparison report exists)
  if (comparisonReport?.investmentRankings) {
    const rankingsSheet = workbook.addWorksheet('Investment Rankings');
    rankingsSheet.addRow(['Rank', 'Startup Name', 'Overall Score', 'Top Strengths', 'Recommendation']);

    comparisonReport.investmentRankings.forEach((r) => {
      rankingsSheet.addRow([
        r.rank,
        r.startupName,
        r.overallScore,
        r.topStrengths.join('; '),
        r.recommendation
      ]);
    });

    [8, 20, 13, 50, 40].forEach((w, idx) => {
      rankingsSheet.getColumn(idx + 1).width = w;
    });
  }

  // Sheet 3: Score Comparison
  if (comparisonReport?.scoreComparison) {
    const comparisonSheet = workbook.addWorksheet('Score Comparison');
    comparisonSheet.addRow(comparisonReport.scoreComparison.headers);
    comparisonReport.scoreComparison.rows.forEach((r) => comparisonSheet.addRow(r));

    comparisonSheet.getColumn(1).width = 20;
    for (let i = 2; i <= 8; i++) comparisonSheet.getColumn(i).width = 12;
  }

  // Sheet 4: Sector Breakdown
  if (comparisonReport?.sectorBreakdown) {
    const sectorSheet = workbook.addWorksheet('Sector Breakdown');
    sectorSheet.addRow(['Sector', 'Number of Startups']);
    Object.entries(comparisonReport.sectorBreakdown).forEach(([sector, count]) => {
      sectorSheet.addRow([sector, count]);
    });

    sectorSheet.getColumn(1).width = 20;
    sectorSheet.getColumn(2).width = 20;
  }

  // Sheet 5: Strengths & Weaknesses
  if (comparisonReport?.strengthsAndWeaknesses) {
    const swSheet = workbook.addWorksheet('Strengths & Weaknesses');
    swSheet.addRow(['Startup Name', 'Strengths', 'Weaknesses']);
    Object.entries(comparisonReport.strengthsAndWeaknesses).forEach(([name, data]) => {
      swSheet.addRow([name, data.strengths.join('; '), data.weaknesses.join('; ')]);
    });

    swSheet.getColumn(1).width = 20;
    swSheet.getColumn(2).width = 60;
    swSheet.getColumn(3).width = 60;
  }

  // Sheet 6: Summary
  if (comparisonReport?.overallRecommendation) {
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Overall Recommendation']);
    summarySheet.addRow([comparisonReport.overallRecommendation]);
    summarySheet.getColumn(1).width = 100;
  }

  // Download file
  const fileName = `${batchName.replace(/[^a-z0-9]/gi, '_')}_analysis_${new Date().toISOString().split('T')[0]}.xlsx`;
  const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
  downloadXlsx(buffer, fileName);
}
