const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const dir = 'd:/CBSV/public/CHUYỂN SINH HOẠT';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));

files.forEach(f => {
  const zip = new AdmZip(path.join(dir, f));
  const docXml = zip.readAsText('word/document.xml');
  const matches = docXml.match(/\{\{[^\}]+\}\}/g);
  
  // Also check headers/footers
  const headerFooters = zip.getEntries().filter(e => e.entryName.startsWith('word/header') || e.entryName.startsWith('word/footer'));
  headerFooters.forEach(hf => {
    const text = zip.readAsText(hf);
    const m = text.match(/\{\{[^\}]+\}\}/g);
    if (m) matches.push(...m);
  });
  
  if (matches) {
    const unique = [...new Set(matches)];
    console.log(`\n--- ${f} ---`);
    console.log(unique.join(', '));
  }
});
