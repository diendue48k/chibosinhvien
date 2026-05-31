import fs from 'fs';
import JSZip from 'jszip';

async function checkAfterHeaders() {
  const filePath = 'd:/CBSV/public/1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx';
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml').async('string');
  
  // Find where "Ưu điểm" is and print the next 2000 characters
  const idxUu = docXml.indexOf('Ưu điểm');
  if (idxUu !== -1) {
    console.log("=== XML AFTER 'Ưu điểm' ===");
    console.log(docXml.substring(idxUu, idxUu + 2000));
  }
  
  // Find where "Khuyết điểm" is and print the next 2000 characters
  const idxKhuyet = docXml.indexOf('Khuyết điểm');
  if (idxKhuyet !== -1) {
    console.log("\n=== XML AFTER 'Khuyết điểm' ===");
    console.log(docXml.substring(idxKhuyet, idxKhuyet + 2000));
  }
}

checkAfterHeaders().catch(console.error);
