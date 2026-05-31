import fs from 'fs';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import path from 'path';

const outputDir = 'd:/CBSV/test_output';
const files = [
  '1_Ban_Tu_Kiem_Diem.docx',
  '2_Nghi_Quyet_Doan_Truong.docx',
  '3_Nghi_Quyet_LCD.docx'
];

async function inspectGenerated() {
  for (const filename of files) {
    const filePath = path.join(outputDir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`${filename} does not exist!`);
      continue;
    }
    
    const buffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file('word/document.xml').async('string');
    
    // Find if there are any remaining placeholders like {{...}} in the generated file
    const regex = /\{\{[^}]+\}\}/g;
    const placeholders = docXml.match(regex) || [];
    
    // Check if the mock data like 'Nguyễn Văn A' or '12345678' exists in the document
    const hasNewName = docXml.includes('Nguyễn Văn A');
    const hasOldName = docXml.includes('Nguyễn Hữu Ái Quốc');
    
    console.log(`\n==================================================`);
    console.log(`FILE: ${filename}`);
    console.log(`Remaining placeholders:`, [...new Set(placeholders)]);
    console.log(`Contains NEW name 'Nguyễn Văn A'?:`, hasNewName);
    console.log(`Contains OLD name 'Nguyễn Hữu Ái Quốc'?:`, hasOldName);
    
    // Print a snippet of the document around the name
    if (hasNewName) {
      const idx = docXml.indexOf('Nguyễn Văn A');
      console.log("Snippet around new name:", docXml.substring(idx - 100, idx + 100));
    }
  }
}

inspectGenerated().catch(console.error);
