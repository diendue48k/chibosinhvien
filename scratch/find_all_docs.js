import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        results = results.concat(walk(fullPath));
      }
    } else {
      if (file.endsWith('.docx') || file.endsWith('.doc')) {
        results.push({ path: fullPath, size: stat.size });
      }
    }
  });
  return results;
}

console.log("All .docx and .doc files in workspace:");
console.log(walk('d:/CBSV'));
