let Parser;
try {
  // json2csv v5 and some v6-alpha builds
  ({ Parser } = require('json2csv'));
} catch {
  // json2csv v6 final moved Parser to a sub-module
  try {
    Parser = require('@json2csv/plainjs').Parser;
  } catch {
    Parser = require('json2csv/lib/JSON2CSVParser');
  }
}
const ExcelJS = require('exceljs');

/**
 * Generate CSV buffer from array of objects
 */
const generateCSV = (data, fields) => {
  const parser = new Parser({ fields });
  return parser.parse(data);
};

/**
 * Generate Excel buffer from array of objects
 */
const generateExcel = async (data, columns, sheetName = 'Sheet1') => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns; // [{ header: 'Name', key: 'name', width: 20 }, ...]

  // Style header row
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD97706' },
  };

  data.forEach((row) => sheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = { generateCSV, generateExcel };
