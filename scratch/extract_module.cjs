const fs = require('fs');
const path = require('path');

const distDir = 'd:\\CBSV\\dist\\assets';
const outputFile = 'd:\\CBSV\\scratch\\extracted_dangkychuyen.js';

function extract() {
  if (!fs.existsSync(distDir)) {
    console.log('Dist directory does not exist.');
    return;
  }
  const files = fs.readdirSync(distDir);
  const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
  if (!jsFile) {
    console.log('No index js bundle found.');
    return;
  }
  const filePath = path.join(distDir, jsFile);
  console.log('Reading bundle:', jsFile);
  const code = fs.readFileSync(filePath, 'utf8');

  // Let's find occurrences of strings unique to DangKyChuyen, like "Cấu hình chuyển sinh hoạt" or "dangky_213" (wait, it's not 213, it's "chuyen_sinh_hoat")
  // Let's search for "Danh mục biểu mẫu của hồ sơ" or "Đăng ký làm hồ sơ chuyển sinh hoạt"
  const marker = 'Đăng ký làm hồ sơ chuyển sinh hoạt';
  const index = code.indexOf(marker);
  if (index === -1) {
    console.log('Marker not found in bundle.');
    return;
  }

  console.log('Found marker at index:', index);
  // Let's write a window around the index to inspect it
  const start = Math.max(0, index - 20000);
  const end = Math.min(code.length, index + 30000);
  const snippet = code.substring(start, end);
  
  fs.writeFileSync(outputFile, snippet, 'utf8');
  console.log('Extracted snippet written to scratch/extracted_dangkychuyen.js');
}

extract();
