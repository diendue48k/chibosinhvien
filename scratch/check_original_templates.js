import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const publicDir = 'd:/CBSV/public';
const files = [
  '1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx',
  '1. Nghị quyết LCĐ.docx',
  '1. Nghị quyết Đoàn Trường (02 bản).docx',
  '3. Biên bản họp Liên chi Đoàn.docx',
  '4. Nghị quyết Chi Đoàn.docx',
  '5. Biên bản họp Chi Đoàn.docx',
  '6. Biên bản họp lớp.docx'
];

async function checkFile(filename) {
  const filePath = path.join(publicDir, filename);
  try {
    const buffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buffer);
    console.log(`[OK] Original template is healthy: ${filename}`);
  } catch (e) {
    console.error(`[ERROR] Original template is corrupt: ${filename}`, e);
  }
}

async function run() {
  for (const file of files) {
    await checkFile(file);
  }
}

run().catch(console.error);
