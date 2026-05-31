const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        searchDir(fullPath, query);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(query)) {
        console.log(`Found "${query}" in: ${fullPath}`);
      }
    }
  }
}

console.log("Searching for 'giả lập' in src...");
searchDir('d:\\CBSV\\src', 'giả lập');
console.log("Searching for 'giả lập' in project root...");
searchDir('d:\\CBSV\\src', 'mock');
searchDir('d:\\CBSV\\src', 'giả lập đăng nhập');
searchDir('d:\\CBSV\\src', 'giả lập tài khoản');
