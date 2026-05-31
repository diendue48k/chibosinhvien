import fs from 'fs';
import JSZip from 'jszip';

async function checkKhacPhuc() {
  const filePath = 'd:/CBSV/public/1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx';
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml').async('string');
  
  // Find where "khắc phục" is and print its context
  const idx = docXml.indexOf('khắc phục');
  if (idx !== -1) {
    console.log("=== XML Context for 'khắc phục' ===");
    console.log(docXml.substring(idx - 150, idx + 150));
  } else {
    console.log("'khắc phục' not found!");
  }
}

checkKhacPhuc().catch(console.error);
