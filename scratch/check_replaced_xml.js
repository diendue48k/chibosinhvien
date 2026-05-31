import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const filePath = 'd:/CBSV/test_output/1_Ban_Tu_Kiem_Diem.docx';

async function run() {
  if (!fs.existsSync(filePath)) {
    console.log("File not found!");
    return;
  }
  
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml').async('string');
  
  // Find where "Ưu điểm" or the replaced text starts in the XML
  // The mock uu_diem starts with "- Điểm trung bình"
  const index = docXml.indexOf('Điểm trung bình');
  if (index !== -1) {
    console.log("Found 'Điểm trung bình' at index", index);
    // Print 300 characters before and after to inspect the XML tags
    console.log("Surrounding XML:\n", docXml.substring(index - 100, index + 350));
  } else {
    console.log("Could not find replaced 'uu_diem' content in XML!");
  }
}

run().catch(console.error);
