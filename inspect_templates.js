import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const publicDir = 'd:/CBSV/public';
const files = [
  '1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx',
  '1. Nghị quyết LCĐ.docx',
  '1. Nghị quyết Đoàn Trường (02 bản).docx',
  '3. Biên bản họp Liên chi Đoàn.docx',
  '4. Nghị quyết Chi Đoàn.docx',
  '5. Biên bản họp Chi Đoàn.docx',
  '6. Biên bản họp lớp.docx'
];

async function inspectFile(filename) {
  const filePath = path.join(publicDir, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filename}`);
    return;
  }
  
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  
  const docXml = await zip.file('word/document.xml').async('string');
  
  // Find all matches for placeholders like {{...}}
  const regex = /\{\{[^}]+\}\}/g;
  const matches = docXml.match(regex) || [];
  
  // Let's also check if there are split brackets like { { ... } } or similar
  const splitRegex = /\{[^{}]*\{[^{}]*\}[^{}]*\}/g;
  const splitMatches = docXml.match(splitRegex) || [];
  
  console.log(`\n==================================================`);
  console.log(`FILE: ${filename}`);
  console.log(`Found placeholders:`, [...new Set(matches)]);
  if (splitMatches.length > 0) {
    console.log(`Warning: Found potentially split tags:`, splitMatches);
  }
}

async function run() {
  for (const file of files) {
    await inspectFile(file);
  }
}

run().catch(console.error);
