import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const filePath = 'd:/CBSV/public/1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx';

async function run() {
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml').async('string');
  
  // Find where "ho_ten" is in the XML
  const index = docXml.indexOf('ho_ten');
  if (index !== -1) {
    console.log("Found 'ho_ten' at index", index);
    // Print 200 characters before and after
    console.log("Surrounding XML:\n", docXml.substring(index - 150, index + 150));
  } else {
    console.log("Could not find 'ho_ten' literal in XML!");
  }
}

run().catch(console.error);
