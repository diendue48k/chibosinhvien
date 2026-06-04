const JSZip = require('jszip');
const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

async function dumpFullTexts(filePath) {
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
  await dumpFullTexts('d:/CBSV/public/1. Mẫu 1. Don xin chuyen dang.docx');
  await dumpFullTexts('d:/CBSV/public/2. Mau 2. Don xin chuyen dang tam thoi.docx');
}
run();
