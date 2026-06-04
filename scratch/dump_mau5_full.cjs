const JSZip = require('jszip');
const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

async function dumpAllParagraphs(filePath) {
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
      if (text.trim()) {
        console.log(`[Line ${i}]: ${text.trim()}`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  await dumpAllParagraphs('d:/CBSV/public/4. Mẫu 5. Bản nhận xét Đảng viên dự bị Chuyển SHĐ ĐVHD.docx');
}
run();
