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

async function checkMergeFields(filename) {
  const filePath = path.join(publicDir, filename);
  if (!fs.existsSync(filePath)) return;
  
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml').async('string');
  
  const hasMergeField = docXml.includes('MERGEFIELD') || docXml.includes('w:instrText');
  console.log(`FILE: ${filename}`);
  console.log(`  Contains 'MERGEFIELD': ${docXml.includes('MERGEFIELD')}`);
  console.log(`  Contains 'w:instrText': ${docXml.includes('w:instrText')}`);
  
  if (docXml.includes('MERGEFIELD')) {
    // Extract some mergefield instructions
    const regex = /MERGEFIELD\s+([^\s"]+)/g;
    const matches = [];
    let match;
    while ((match = regex.exec(docXml)) !== null) {
      matches.push(match[1]);
    }
    console.log(`  Found Native Word MERGEFIELDs:`, [...new Set(matches)]);
  }
}

async function run() {
  for (const file of files) {
    await checkMergeFields(file);
  }
}

run().catch(console.error);
