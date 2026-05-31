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

async function inspectSplitting(filename) {
  const filePath = path.join(publicDir, filename);
  if (!fs.existsSync(filePath)) return;
  
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml').async('string');
  
  // We want to search for the pattern where "{" and "}" are split by tags like </w:t>...<w:t>
  // A clean placeholder is "{{key}}"
  // A split placeholder might be "{" + "</w:t>...<w:t>" + "{" + "</w:t>...<w:t>" + "key" + ...
  
  console.log(`\n--- INSPECTING SPLITTING FOR: ${filename} ---`);
  
  // Let's search if any expected key is NOT found literally, but exists in a split format
  const expectedKeys = [
    'ho_ten', 'lop', 'khoa', 'uu_diem', 'khuyet_diem', 'bien_phap_khac_phuc', 
    'ngay_sinh_d', 'ngay_sinh_m', 'ngay_sinh_y', 'ngay_vao_dang_formatted',
    'chi_bo_sinh_hoat', 'chi_bo_ket_nap', 'co_quan_cong_tac'
  ];
  
  for (const key of expectedKeys) {
    const literalMatch = docXml.includes(`{{${key}}}`);
    if (literalMatch) {
      console.log(`  [OK] Literal placeholder found: {{${key}}}`);
    } else {
      // Check if the key itself is in the XML
      const keyFound = docXml.includes(key);
      if (keyFound) {
        console.log(`  [WARNING] Key "${key}" exists in XML, but literal "{{${key}}}" does NOT! This tag is SPLIT!`);
        
        // Find the index and print surrounding XML to see the split structure
        let index = docXml.indexOf(key);
        console.log(`  Split XML context around "${key}":`);
        console.log(`  ${docXml.substring(index - 60, index + key.length + 60)}`);
      } else {
        // The key is just not in this template (which is normal if the template doesn't use it)
      }
    }
  }
}

async function run() {
  for (const file of files) {
    await inspectSplitting(file);
  }
}

run().catch(console.error);
