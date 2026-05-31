import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';

const publicDir = 'd:/CBSV/public';
const files = [
  '1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx',
  '5. Biên bản họp Chi Đoàn.docx',
  '6. Biên bản họp lớp.docx'
];

async function inspect() {
  for (const filename of files) {
    const filePath = path.join(publicDir, filename);
    if (!fs.existsSync(filePath)) continue;
    
    const buffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file('word/document.xml').async('string');
    
    console.log(`\n==================================================`);
    console.log(`FILE: ${filename}`);
    
    for (const key of ['uu_diem', 'khuyet_diem']) {
      const idx = docXml.indexOf(`{{${key}}}`);
      if (idx !== -1) {
        // Find the containing <w:p> ... </w:p>
        const pStart = docXml.lastIndexOf('<w:p ', idx);
        const pEnd = docXml.indexOf('</w:p>', idx) + 6;
        if (pStart !== -1 && pEnd !== -1) {
          console.log(`--- Context for {{${key}}} ---`);
          console.log(docXml.substring(pStart, pEnd));
        }
      }
    }
  }
}

inspect().catch(console.error);
