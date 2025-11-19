import * as XLSX from 'xlsx';

export interface ParsedStartupData {
  name: string;
  pitch: string;
}

export interface ExcelParseResult {
  data: ParsedStartupData[];
  errors: string[];
  warnings: string[];
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_STARTUPS = 1000;

export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const result: ExcelParseResult = {
    data: [],
    errors: [],
    warnings: []
  };

  // Validate file type
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    '.xlsx',
    '.xls'
  ];
  
  const isValidType = validTypes.some(type => 
    file.type === type || file.name.toLowerCase().endsWith(type)
  );

  if (!isValidType) {
    result.errors.push('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
    return result;
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    result.errors.push(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    return result;
  }

  try {
    // Read file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Get first sheet
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      result.errors.push('No sheets found in Excel file');
      return result;
    }

    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

    if (jsonData.length === 0) {
      result.errors.push('Excel file is empty');
      return result;
    }

    // Parse data (skip header row if it exists)
    const startRow = jsonData[0]?.[0]?.toString().toLowerCase().includes('name') ? 1 : 0;
    const nameMap = new Map<string, number>();

    for (let i = startRow; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Skip empty rows
      if (!row || row.length === 0) continue;

      const name = row[0]?.toString().trim();
      const pitch = row[1]?.toString().trim();

      // Skip if either column is missing
      if (!name && !pitch) continue;

      if (!name) {
        result.warnings.push(`Row ${i + 1}: Missing startup name`);
        continue;
      }

      if (!pitch) {
        result.warnings.push(`Row ${i + 1}: Missing pitch text for "${name}"`);
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
        result.warnings.push(`Maximum ${MAX_STARTUPS} startups imported. Remaining rows ignored.`);
        break;
      }
    }

    if (result.data.length === 0) {
      result.errors.push('No valid data found. Ensure Column 1 has startup names and Column 2 has pitch text.');
    }

    // Add info about multiple sheets
    if (workbook.SheetNames.length > 1) {
      result.warnings.push(`File contains ${workbook.SheetNames.length} sheets. Only first sheet "${firstSheetName}" was imported.`);
    }

  } catch (error) {
    result.errors.push(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

export function createExcelTemplate(): void {
  // Create sample data
  const data = [
    ['Startup Name', 'Pitch'],
    ['TechCo', 'We\'re building AI-powered customer service automation that reduces response times by 80% while maintaining high satisfaction scores. Our platform integrates with existing CRM systems and uses natural language processing to handle complex customer inquiries.'],
    ['FinanceApp', 'Our platform enables small businesses to manage their finances with AI-driven insights. We provide real-time cash flow analysis, automated expense categorization, and predictive financial modeling to help businesses make better financial decisions.'],
  ];

  // Create workbook
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Startups');

  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 },  // Startup Name column
    { wch: 100 }  // Pitch column
  ];

  // Download
  XLSX.writeFile(workbook, 'startup_comparison_template.xlsx');
}

export function createBulkAnalysisTemplate(): void {
  // Create sample data with instructions
  const data = [
    ['Startup Name', 'Written Pitch'],
    ['Example Startup 1', 'Provide a detailed pitch describing the startup\'s product/service, target market, team background, traction metrics, funding history, and business model. Be as comprehensive as possible.'],
    ['Example Startup 2', 'Include information about the problem being solved, unique value proposition, competitive advantages, revenue model, growth metrics, and any notable achievements or partnerships.'],
  ];

  // Create workbook
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bulk Analysis');

  // Set column widths
  worksheet['!cols'] = [
    { wch: 25 },  // Startup Name column
    { wch: 120 }  // Written Pitch column (wider for detailed pitches)
  ];

  // Download
  XLSX.writeFile(workbook, 'bulk_startup_analysis_template.xlsx');
}
