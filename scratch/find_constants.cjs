const fs = require('fs');
const content = fs.readFileSync('d:\\CBSV\\src\\pages\\Profile.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('DAN_TOC') || line.includes('TON_GIAO') || line.includes('KHOA')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
