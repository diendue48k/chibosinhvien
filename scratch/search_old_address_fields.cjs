const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        searchDir(fullPath, query);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes(query.toLowerCase())) {
        console.log(`Found in: ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(query.toLowerCase())) {
            console.log(`  Line ${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

console.log('Searching for "thường trú cũ"...');
searchDir('d:\\CBSV\\src', 'thường trú cũ');
console.log('Searching for "quê quán cũ"...');
searchDir('d:\\CBSV\\src', 'quê quán cũ');
