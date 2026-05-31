import fs from 'fs';
import JSZip from 'jszip';

async function check() {
  const filePath = 'd:/CBSV/public/1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.doc';
  if (!fs.existsSync(filePath)) {
    console.log("File does not exist!");
    return;
  }
  
  const buffer = fs.readFileSync(filePath);
  try {
    const zip = await JSZip.loadAsync(buffer);
    console.log("SUCCESS: The .doc file is actually a valid ZIP (.docx) format!");
    console.log("Files inside:");
    console.log(Object.keys(zip.files).slice(0, 5));
  } catch (e) {
    console.log("FAILED: The .doc file is a binary format or corrupted zip:", e.message);
  }
}

check().catch(console.error);
