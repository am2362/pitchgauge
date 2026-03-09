import ExcelJS from 'exceljs/dist/exceljs.min.js';

export interface ParsedStartupData {
  name: string;
  pitch: string;
}

export interface ExcelParseResult {
  data: ParsedStartupData[];
  errors: string[];
  warnings: string[];
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (reduced from 20MB for security)
const MAX_STARTUPS = 100;

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function downloadXlsx(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Let the browser start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const result: ExcelParseResult = {
    data: [],
    errors: [],
    warnings: []
  };

  // Validate file type - only .xlsx allowed (not .xls)
  const isValidType =
    file.type === XLSX_MIME || file.name.toLowerCase().endsWith('.xlsx');

  if (!isValidType) {
    result.errors.push('Invalid file type. Please upload an Excel file (.xlsx only)');
    return result;
  }

  // Reject .xls files explicitly
  if (file.name.toLowerCase().endsWith('.xls') && !file.name.toLowerCase().endsWith('.xlsx')) {
    result.errors.push('Legacy .xls format is not supported. Please save as .xlsx and try again.');
    return result;
  }

  // Validate file size (5MB limit)
  if (file.size > MAX_FILE_SIZE) {
    result.errors.push(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    return result;
  }

  try {
    // Read file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Get first sheet
    const firstWorksheet = workbook.worksheets[0];
    if (!firstWorksheet) {
      result.errors.push('No sheets found in Excel file');
      return result;
    }

    const totalRows = firstWorksheet.rowCount;
    if (totalRows === 0) {
      result.errors.push('Excel file is empty');
      return result;
    }

    // Parse data (skip header row if it exists)
    const firstCellText = firstWorksheet.getRow(1).getCell(1).text?.toString().toLowerCase() ?? '';
    const startRow = firstCellText.includes('name') ? 2 : 1; // ExcelJS is 1-indexed
    const nameMap = new Map<string, number>();

    for (let rowNumber = startRow; rowNumber <= totalRows; rowNumber++) {
      const row = firstWorksheet.getRow(rowNumber);

      const name = row.getCell(1).text?.toString().trim();
      const pitch = row.getCell(2).text?.toString().trim();

      // Skip if either column is missing
      if (!name && !pitch) continue;

      if (!name) {
        result.warnings.push(`Row ${rowNumber}: Missing startup name`);
        continue;
      }

      if (!pitch) {
        result.warnings.push(`Row ${rowNumber}: Missing pitch text for "${name}"`);
        continue;
      }

      // Handle duplicate names
      let finalName = name;
      if (nameMap.has(name)) {
        const count = nameMap.get(name)! + 1;
        nameMap.set(name, count);
        finalName = `${name} (${count})`;
        result.warnings.push(`Duplicate name "${name}" renamed to "${finalName}"`);
      } else {
        nameMap.set(name, 1);
      }

      result.data.push({ name: finalName, pitch });

      // Stop if we've reached max startups
      if (result.data.length >= MAX_STARTUPS) {
        result.warnings.push(`Maximum ${MAX_STARTUPS} startups per batch. Please reduce your upload and try again.`);
        break;
      }
    }

    if (result.data.length === 0) {
      result.errors.push('No valid data found. Ensure Column 1 has startup names and Column 2 has pitch text.');
    }

    // Add info about multiple sheets
    if (workbook.worksheets.length > 1) {
      result.warnings.push(`File contains ${workbook.worksheets.length} sheets. Only the first sheet was imported.`);
    }

  } catch (error) {
    result.errors.push(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

export async function createExcelTemplate(): Promise<void> {
  // Create sample data
  const data = [
    ['Startup Name', 'Pitch'],
    ['TechCo', 'We\'re building AI-powered customer service automation that reduces response times by 80% while maintaining high satisfaction scores. Our platform integrates with existing CRM systems and uses natural language processing to handle complex customer inquiries.'],
    ['FinanceApp', 'Our platform enables small businesses to manage their finances with AI-driven insights. We provide real-time cash flow analysis, automated expense categorization, and predictive financial modeling to help businesses make better financial decisions.'],
  ];

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Startups');

  data.forEach((row) => worksheet.addRow(row));

  worksheet.getColumn(1).width = 20;
  worksheet.getColumn(2).width = 100;

  const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
  downloadXlsx(buffer, 'startup_comparison_template.xlsx');
}

export async function createBulkAnalysisTemplate(): Promise<void> {
  // Create sample data with instructions
  const data = [
    ['Startup Name', 'Written Pitch'],
    ['Example Startup 1', 'Provide a detailed pitch describing the startup\'s product/service, target market, team background, traction metrics, funding history, and business model. Be as comprehensive as possible.'],
    ['Example Startup 2', 'Include information about the problem being solved, unique value proposition, competitive advantages, revenue model, growth metrics, and any notable achievements or partnerships.'],
  ];

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Bulk Analysis');

  data.forEach((row) => worksheet.addRow(row));

  worksheet.getColumn(1).width = 25;
  worksheet.getColumn(2).width = 120;

  const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
  downloadXlsx(buffer, 'bulk_startup_analysis_template.xlsx');
}
