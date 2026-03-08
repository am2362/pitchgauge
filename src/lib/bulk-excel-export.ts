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

  // Sheet 1: Startup Rankings (matches demo format)
  const resultsSheet = workbook.addWorksheet('Startup Rankings');

  resultsSheet.columns = [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'Startup Name', key: 'name', width: 20 },
    { header: 'Sector', key: 'sector', width: 18 },
    { header: 'Team Quality', key: 'team', width: 14 },
    { header: 'Team Reasoning', key: 'teamReasoning', width: 50 },
    { header: 'Market Size', key: 'market', width: 14 },
    { header: 'Market Reasoning', key: 'marketReasoning', width: 50 },
    { header: 'Product Differentiation', key: 'product', width: 22 },
    { header: 'Product Reasoning', key: 'productReasoning', width: 50 },
    { header: 'Traction', key: 'traction', width: 12 },
    { header: 'Traction Reasoning', key: 'tractionReasoning', width: 50 },
    { header: 'Business Model', key: 'businessModel', width: 16 },
    { header: 'Business Model Reasoning', key: 'businessModelReasoning', width: 50 },
    { header: 'Competitive Landscape', key: 'competitive', width: 22 },
    { header: 'Competitive Reasoning', key: 'competitiveReasoning', width: 50 },
    { header: 'Overall Score', key: 'overall', width: 14 },
  ];

  // Style header row
  resultsSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
  });

  results.forEach((r, idx) => {
    resultsSheet.addRow({
      rank: idx + 1,
      name: r.startupName,
      sector: r.sector,
      team: r.scores.team,
      teamReasoning: r.metrics.team || '',
      market: r.scores.market,
      marketReasoning: r.metrics.market || '',
      product: r.scores.product,
      productReasoning: r.metrics.product || '',
      traction: r.scores.traction,
      tractionReasoning: r.metrics.traction || '',
      businessModel: r.scores.businessModel,
      businessModelReasoning: r.metrics.businessModel || '',
      competitive: r.scores.funding,
      competitiveReasoning: r.metrics.funding || '',
      overall: r.scores.overall,
    });
  });

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
