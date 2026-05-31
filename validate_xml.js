import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';

const outputDir = 'd:/CBSV/test_output';
const files = [
  '1_Ban_Tu_Kiem_Diem.docx',
  '2_Nghi_Quyet_Doan_Truong.docx',
  '3_Nghi_Quyet_LCD.docx',
  '4_Bien_Ban_LCD.docx',
  '5_Nghi_Quyet_Chi_Doan.docx',
  '6_Bien_Ban_Chi_Doan.docx',
  '7_Bien_Ban_Hop_Lop.docx'
];

async function validateFile(filename) {
  const filePath = path.join(outputDir, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filename}`);
    return;
  }
  
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  
  const docXml = await zip.file('word/document.xml').async('string');
  
  const parser = new DOMParser({
    onError: (level, msg) => {
      console.error(`XML ${level} in ${filename}: ${msg}`);
    }
  });
  
  try {
    parser.parseFromString(docXml, 'text/xml');
    console.log(`XML validation PASSED for ${filename}`);
  } catch (e) {
    console.error(`XML validation FAILED for ${filename}:`, e);
  }
}

async function run() {
  for (const file of files) {
    await validateFile(file);
  }
}

run().catch(console.error);
