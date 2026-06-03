const fs = require('fs');
const content = fs.readFileSync('d:\\CBSV\\src\\components\\ProfileDrawer.jsx', 'utf8');
const lines = content.split('\n');

console.log('=== Checking Field component definition in ProfileDrawer ===');
lines.forEach((line, idx) => {
  if (idx > 120 && idx < 170) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
