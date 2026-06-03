import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const outputDir = 'd:/CBSV/test_output';

async function scanFile(filename) {
  const filePath = path.join(outputDir, filename);
  if (!filePath.endsWith('.docx')) return;
  
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml').async('string');
  
  const regex = /\{\{[^}]+\}\}/g;
  const matches = docXml.match(regex) || [];
  
  if (matches.length > 0) {
    console.log(`❌ FILE: ${filename} still has unreplaced placeholders:`, [...new Set(matches)]);
  } else {
    console.log(`✅ FILE: ${filename} is clean!`);
  }
}

async function run() {
  const files = fs.readdirSync(outputDir);
  for (const file of files) {
    await scanFile(file);
  }
}

run().catch(console.error);
