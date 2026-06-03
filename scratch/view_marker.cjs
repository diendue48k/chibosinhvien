const fs = require('fs');
const code = fs.readFileSync('d:\\CBSV\\scratch\\extracted_dangkychuyen.js', 'utf8');

const marker = 'Đăng ký làm hồ sơ chuyển sinh hoạt';
const index = code.indexOf(marker);
if (index !== -1) {
  console.log('Snippet around marker:');
  console.log(code.substring(index - 500, index + 3500));
} else {
  console.log('Marker not found!');
}
