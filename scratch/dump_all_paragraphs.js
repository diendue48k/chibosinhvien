import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';

const publicDir = 'd:/CBSV/public/CHUYỂN SINH HOẠT';
const files = [
  '1. Mẫu 1. Don xin chuyen dang.docx',
  '2. Mau 2. Don xin chuyen dang tam thoi.docx',
  '3. Mẫu 3. Bản nhận xét Đảng viên dự bị ĐTN.docx',
  '4. Mẫu 5. Bản nhận xét Đảng viên dự bị Chuyển SHĐ ĐVHD.docx',
  '5. Mẫu 4. Kiem diem chuyen dang 2026.docx'
];

async function inspectFile(filename) {
  const filePath = path.join(publicDir, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filename}`);
    return;
  }
  
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  
  const docXml = await zip.file('word/document.xml').async('string');
  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, 'text/xml');
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
  
  console.log(`\n==================================================`);
  console.log(`FILE: ${filename}`);
  
  const lines = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const tNodes = Array.from(p.getElementsByTagName('w:t'));
    const text = tNodes.map(t => t.textContent || '').join('');
    if (text.trim().length > 0) {
      lines.push(`${i}: ${text.trim()}`);
    }
  }
  console.log(lines.join('\n'));
}

async function run() {
  for (const file of files) {
    await inspectFile(file);
  }
}

run().catch(console.error);
