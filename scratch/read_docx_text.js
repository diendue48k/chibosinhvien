import fs from 'fs';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';

async function check() {
  const filePath = 'd:/CBSV/public/1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx';
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml').async('string');
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, 'text/xml');
  const text = Array.from(doc.getElementsByTagName('w:t')).map(t => t.textContent).join(' ');
  
  console.log("Raw text of converted Ban tu kiem diem template (first 1000 chars):");
  console.log(text.substring(0, 1000));
}

check().catch(console.error);
