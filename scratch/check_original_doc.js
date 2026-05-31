import fs from 'fs';
import JSZip from 'jszip';

async function check() {
  const filePath = 'd:/CBSV/public/1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.doc';
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  console.log("Original .doc zip files list:");
  console.log(Object.keys(zip.files));
}

check().catch(console.error);
