import fs from 'fs';
import JSZip from 'jszip';

async function checkTemplate() {
  const file = 'd:/CBSV/public/1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx';
  const buffer = fs.readFileSync(file);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml').async('string');
  
  // Let's find uu_diem and print the paragraph XML containing it
  const index = docXml.indexOf('{{uu_diem}}');
  if (index !== -1) {
    const start = Math.max(0, index - 500);
    const end = Math.min(docXml.length, index + 500);
    console.log("=== XML AROUND {{uu_diem}} ===");
    console.log(docXml.substring(start, end));
  } else {
    console.log("{{uu_diem}} not found as a literal string. Let's search for 'uu_diem'.");
    const index2 = docXml.indexOf('uu_diem');
    if (index2 !== -1) {
      const start = Math.max(0, index2 - 300);
      const end = Math.min(docXml.length, index2 + 300);
      console.log(docXml.substring(start, end));
    }
  }
}

checkTemplate().catch(console.error);
