import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';

async function run() {
  const filePath = 'd:/CBSV/test_output/1_Ban_Tu_Kiem_Diem.docx';
  if (!fs.existsSync(filePath)) {
    console.error("Output file not found!");
    return;
  }
  
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml').async('string');
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, 'text/xml');
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
  
  console.log("=== PARAGRAPHS IN GENERATED DOCX ===");
  let printActive = false;
  for (const p of paragraphs) {
    const tNodes = Array.from(p.getElementsByTagName('w:t'));
    const text = tNodes.map(t => t.textContent || '').join('');
    if (text.includes('Ưu điểm')) {
      printActive = true;
    }
    if (printActive) {
      console.log(`- TEXT: "${text}"`);
    }
    if (text.includes('Biện pháp')) {
      printActive = false;
    }
  }
}

run().catch(console.error);
