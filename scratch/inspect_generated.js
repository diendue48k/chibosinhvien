import fs from 'fs';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';

async function inspect() {
  const buffer = fs.readFileSync('d:/CBSV/test_output/1_Ban_Tu_Kiem_Diem.docx');
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml').async('string');
  
  // Find where Nguyễn Văn A or uu_diem is replaced
  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, 'text/xml');
  const textElements = Array.from(doc.getElementsByTagName('w:t'));
  
  console.log("Checking some text elements:");
  for (const t of textElements) {
    const txt = t.textContent;
    if (txt.includes('Điểm trung bình') || txt.includes('Nguyễn Văn') || txt.includes('&')) {
      console.log(`XML Content:`, t.toString());
      console.log(`Text Content:`, txt);
    }
  }
}

inspect().catch(console.error);
