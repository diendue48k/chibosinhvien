const fs = require('fs');
const content = fs.readFileSync('d:\\CBSV\\src\\pages\\Profile.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('Form.useForm') || line.includes('useForm') || line.includes('const form')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
