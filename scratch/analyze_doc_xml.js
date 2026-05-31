import fs from 'fs';
import JSZip from 'jszip';

async function analyze() {
  const filePath = 'd:/CBSV/public/1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx';
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml').async('string');
  
  // Let's print sections of XML containing key text to see how they are structured
  const searchTerms = [
    'Nguyễn Hữu Ái Quốc',
    '22/01/2007',
    'Xã Thạch Hà',
    '150 Ngũ Hành Sơn',
    'Anh-Địa-GDTC',
    'Hiện đang sinh hoạt tại',
    'Ưu điểm',
    'Khuyết điểm',
    'Biện pháp khắc phục'
  ];
  
  console.log("=== XML STRUCTURE ANALYSES ===");
  for (const term of searchTerms) {
    const idx = docXml.indexOf(term);
    if (idx !== -1) {
      console.log(`\nFound term "${term}" at index ${idx}:`);
      const start = Math.max(0, idx - 150);
      const end = Math.min(docXml.length, idx + term.length + 150);
      console.log(docXml.substring(start, end));
    } else {
      console.log(`\nTerm "${term}" NOT found!`);
    }
  }
}

analyze().catch(console.error);
