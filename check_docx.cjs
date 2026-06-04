const JSZip = require('jszip');
const fs = require('fs');

async function checkDocx() {
  const content = fs.readFileSync('d:/CBSV/public/1. Mẫu 1. Don xin chuyen dang.docx');
  const zip = await JSZip.loadAsync(content);
  const xml = await zip.file('word/document.xml').async('string');
  console.log(xml.includes('{{'));
  console.log(xml.substring(0, 500));
}
checkDocx();
