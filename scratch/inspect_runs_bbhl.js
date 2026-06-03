import fs from 'fs';
import JSZip from 'jszip';

async function checkTemplate() {
  const file = 'd:/CBSV/public/6. Biên bản họp lớp.docx';
  if (!fs.existsSync(file)) {
    console.log("File not found: " + file);
    return;
  }
  const buffer = fs.readFileSync(file);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml').async('string');
  
  const index = docXml.indexOf('uu_diem');
  if (index !== -1) {
    const start = Math.max(0, index - 500);
    const end = Math.min(docXml.length, index + 500);
    console.log("=== XML AROUND 'uu_diem' in 6. Biên bản họp lớp.docx ===");
    console.log(docXml.substring(start, end));
  } else {
    console.log("Could not find 'uu_diem' in XML!");
  }
}

checkTemplate().catch(console.error);
