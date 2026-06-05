const xlsx = require('xlsx');

function readExcel(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`\n=== File: ${filePath} ===`);
    console.log("Headers:", data[0]);
    console.log("Row 1:", data[1]);
    console.log("Row 2:", data[2]);
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
  }
}

readExcel('D:\\CBSV\\public\\Hành chính mới.xlsx');
readExcel('D:\\CBSV\\public\\hanh_chinh.xlsx');
