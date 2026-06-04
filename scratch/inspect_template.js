import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inspect() {
  const filePath = path.join(__dirname, '..', 'public', '1. Mẫu 1. Don xin chuyen dang.docx');
  const arrayBuffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(arrayBuffer);
  const content = await zip.file('word/document.xml').async('string');
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
  
  console.log("--- Paragraphs ---");
  paragraphs.forEach((p, idx) => {
    const tNodes = Array.from(p.getElementsByTagName('w:t'));
    const text = tNodes.map(t => t.textContent || '').join('');
    if (text.includes('Đảng') || text.includes('Vĩnh') || text.includes('chuyển') || text.includes('26/') || text.includes('.....')) {
      console.log(`[Line ${idx}]: "${text}"`);
      // Also show run details if it contains dots or dates or chuyển sinh hoạt
      if (text.includes('vào') || text.includes('chính') || text.includes('sinh hoạt') || text.includes('chuyển')) {
        console.log("  Runs:", tNodes.map(t => `"${t.textContent}"`).join(' | '));
      }
    }
  });
}

inspect().catch(console.error);
