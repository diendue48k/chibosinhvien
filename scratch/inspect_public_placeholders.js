import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const publicDir = 'd:/CBSV/public';

async function inspectAll() {
  const files = fs.readdirSync(publicDir);
  for (const filename of files) {
    if (!filename.endsWith('.docx') && !filename.endsWith('.doc')) continue;
    
    const filePath = path.join(publicDir, filename);
    const buffer = fs.readFileSync(filePath);
    
    try {
      const zip = await JSZip.loadAsync(buffer);
      const docFile = zip.file('word/document.xml');
      if (!docFile) {
        console.log(`\n==================================================`);
        console.log(`FILE: ${filename}`);
        console.log("Status: FAILED - missing word/document.xml");
        continue;
      }
      
      const docXml = await docFile.async('string');
      const regex = /\{\{[^}]+\}\}/g;
      const matches = docXml.match(regex) || [];
      console.log(`\n==================================================`);
      console.log(`FILE: ${filename}`);
      console.log(`Found placeholders:`, [...new Set(matches)]);
    } catch (e) {
      console.log(`\n==================================================`);
      console.log(`FILE: ${filename}`);
      console.log(`Status: FAILED to parse zip:`, e.message);
    }
  }
}

inspectAll().catch(console.error);
