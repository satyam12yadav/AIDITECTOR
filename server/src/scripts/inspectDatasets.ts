import fs from 'fs';
import path from 'path';
import xlsxPkg from 'xlsx';

const XLSX = (xlsxPkg as any).default || xlsxPkg;

const root = process.cwd();
console.log('Root:', root);

function inspectXlsx(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.log('File does not exist:', filePath);
    return;
  }
  const buf = fs.readFileSync(filePath);
  const workbook = XLSX.read(buf, { type: 'buffer' });
  console.log('\n========================================');
  console.log('Workbook sheets for', path.basename(filePath), ':', workbook.SheetNames);
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);
    console.log(`Sheet "${sheetName}" row count:`, data.length);
    if (data.length > 0) {
      console.log('Sample row columns:', Object.keys(data[0] as object));
      console.log('Sample first 3 rows:', JSON.stringify(data.slice(0, 3), null, 2));
    }
  }
}

inspectXlsx(path.join(root, 'Book1.xlsx'));
inspectXlsx(path.join(root, 'data/sources.xlsx'));
