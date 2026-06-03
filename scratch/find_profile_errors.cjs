const fs = require('fs');
const content = fs.readFileSync('d:\\CBSV\\src\\pages\\Profile.jsx', 'utf8');
const lines = content.split('\n');

console.log('=== Checking imports in Profile.jsx ===');
lines.slice(0, 50).forEach((line, idx) => {
  if (line.trim().startsWith('import')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});

console.log('=== Searching for case-insensitive address or ward or district in Profile.jsx ===');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('address') || line.toLowerCase().includes('ward') || line.toLowerCase().includes('district') || line.toLowerCase().includes('tinh') || line.toLowerCase().includes('huyen') || line.toLowerCase().includes('xa')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
