import fs from 'fs';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import path from 'path';

const outputDir = 'd:/CBSV/test_output';
const files = [
  '1_Ban_Tu_Kiem_Diem.docx',
  '5_Nghi_Quyet_Chi_Doan.docx',
  '6_Bien_Ban_Chi_Doan.docx',
  '7_Bien_Ban_Hop_Lop.docx'
];

async function check() {
  for (const filename of files) {
    const filePath = path.join(outputDir, filename);
    if (!fs.existsSync(filePath)) continue;
    
    const buffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file('word/document.xml').async('string');
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(docXml, 'text/xml');
    
    console.log(`\n==================================================`);
    console.log(`FILE: ${filename}`);
    
    // Find paragraphs containing "Ưu điểm" or "Khuyết điểm" and subsequent paragraphs
    const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
    
    let foundUuDiem = false;
    let count = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const text = Array.from(p.getElementsByTagName('w:t')).map(t => t.textContent).join('');
      
      if (text.includes('Ưu điểm') || text.includes('Khuyết điểm') || foundUuDiem) {
        if (text.includes('Ưu điểm') || text.includes('Khuyết điểm')) {
          foundUuDiem = true;
          count = 0;
        }
        
        if (foundUuDiem) {
          // Print paragraph details
          const pPr = p.getElementsByTagName('w:pPr')[0];
          const hasBold = pPr && pPr.getElementsByTagName('w:b').length > 0;
          const firstLine = pPr && pPr.getElementsByTagName('w:ind')[0]?.getAttribute('w:firstLine');
          const spacingBefore = pPr && pPr.getElementsByTagName('w:spacing')[0]?.getAttribute('w:before');
          const spacingAfter = pPr && pPr.getElementsByTagName('w:spacing')[0]?.getAttribute('w:after');
          
          console.log(`P[${count}]: "${text}"`);
          console.log(`  Props: bold=${!!hasBold}, firstLine=${firstLine || 'none'}, spacingBefore=${spacingBefore || 'none'}, spacingAfter=${spacingAfter || 'none'}`);
          
          count++;
          if (count > 5) {
            foundUuDiem = false; // stop printing after a few paragraphs
          }
        }
      }
    }
  }
}

check().catch(console.error);
