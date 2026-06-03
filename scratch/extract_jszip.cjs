const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const dir = 'd:/CBSV/public/CHUYỂN SINH HOẠT';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));

async function extract() {
  for (const f of files) {
    const data = fs.readFileSync(path.join(dir, f));
    const zip = await JSZip.loadAsync(data);
    
    let matches = [];
    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (relativePath === 'word/document.xml' || relativePath.startsWith('word/header') || relativePath.startsWith('word/footer')) {
        const text = await zipEntry.async('string');
        // Because Word breaks up text with XML tags, we first remove all tags to find the raw text!
        const rawText = text.replace(/<[^>]+>/g, '');
        const m = rawText.match(/\{\{[^\}]+\}\}/g);
        if (m) matches.push(...m);
      }
    }
    
    if (matches.length > 0) {
      const unique = [...new Set(matches)];
      console.log(`\n--- ${f} ---`);
      console.log(unique.join(', '));
    } else {
      console.log(`\n--- ${f} ---`);
      console.log("No placeholders found.");
    }
  }
}

extract();
