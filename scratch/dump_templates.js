const JSZip = require('jszip');
const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

async function dumpTemplateTexts(filePath) {
  console.log(`\n=== FILE: ${filePath} ===`);
  try {
    const content = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(content);
    const xml = await zip.file('word/document.xml').async('string');
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const paragraphs = doc.getElementsByTagName('w:p');
    
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      let text = '';
      const rNodes = p.getElementsByTagName('w:t');
      for (let j = 0; j < rNodes.length; j++) {
        text += rNodes[j].textContent;
      }
      if (text.includes('Quê quán') || text.includes('vào Đảng') || text.includes('chính thức') || text.includes('thẻ Đảng') || text.includes('ở hiện nay') || text.includes('thoại')) {
        console.log(`[Line ${i}]: ${text}`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  await dumpTemplateTexts('d:/CBSV/public/1. Mẫu 1. Don xin chuyen dang.docx');
  await dumpTemplateTexts('d:/CBSV/public/2. Mau 2. Don xin chuyen dang tam thoi.docx');
  await dumpTemplateTexts('d:/CBSV/public/5. Mẫu 4. Kiem diem chuyen dang 2026.docx');
}
run();
