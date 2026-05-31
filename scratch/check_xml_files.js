import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';

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

async function check() {
  for (const filename of files) {
    const filePath = path.join(outputDir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`${filename}: does not exist!`);
      continue;
    }
    
    const buffer = fs.readFileSync(filePath);
    try {
      const zip = await JSZip.loadAsync(buffer);
      const docFile = zip.file('word/document.xml');
      if (docFile) {
        console.log(`${filename}: OK (has word/document.xml)`);
      } else {
        console.log(`${filename}: FAILED - missing word/document.xml!`);
        console.log("Contents inside ZIP:", Object.keys(zip.files));
      }
    } catch (e) {
      console.log(`${filename}: FAILED to load zip:`, e.message);
    }
  }
}

check().catch(console.error);
