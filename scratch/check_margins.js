import fs from 'fs';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';

const files = [
  'd:/CBSV/public/1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx',
  'd:/CBSV/public/2. Nghị quyết Đoàn Trường (02 bản).docx',
  'd:/CBSV/public/3. Biên bản họp Liên chi Đoàn.docx'
];

async function checkMargins() {
  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue;
    const buffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file('word/document.xml').async('string');
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(docXml, 'text/xml');
    
    console.log(`\n==================================================`);
    console.log(`FILE: ${filePath.split('/').pop()}`);
    
    // Check Page Margins
    const pgMar = doc.getElementsByTagName('w:pgMar')[0];
    if (pgMar) {
      console.log("Page Margins attributes:");
      console.log(`  Left: ${pgMar.getAttribute('w:left')} (dxa) -> ${Math.round(pgMar.getAttribute('w:left') / 14.4) / 100} cm`);
      console.log(`  Right: ${pgMar.getAttribute('w:right')} (dxa) -> ${Math.round(pgMar.getAttribute('w:right') / 14.4) / 100} cm`);
      console.log(`  Top: ${pgMar.getAttribute('w:top')} (dxa) -> ${Math.round(pgMar.getAttribute('w:top') / 14.4) / 100} cm`);
      console.log(`  Bottom: ${pgMar.getAttribute('w:bottom')} (dxa) -> ${Math.round(pgMar.getAttribute('w:bottom') / 14.4) / 100} cm`);
    } else {
      console.log("No w:pgMar tag found!");
    }
    
    // Check line spacing of normal paragraphs
    const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
    console.log("Sample paragraph line spacing properties:");
    let sampleCount = 0;
    for (const p of paragraphs) {
      const spacing = p.getElementsByTagName('w:spacing')[0];
      const text = Array.from(p.getElementsByTagName('w:t')).map(t => t.textContent).join('');
      if (spacing && text.length > 20 && sampleCount < 3) {
        console.log(`  P[${sampleCount}] text: "${text.substring(0, 40)}..."`);
        console.log(`    before: ${spacing.getAttribute('w:before') || 'none'}`);
        console.log(`    after: ${spacing.getAttribute('w:after') || 'none'}`);
        console.log(`    line: ${spacing.getAttribute('w:line') || 'none'}`);
        console.log(`    lineRule: ${spacing.getAttribute('w:lineRule') || 'none'}`);
        sampleCount++;
      }
    }
  }
}

checkMargins().catch(console.error);
