const fs = require('fs');
const content = fs.readFileSync('d:\\CBSV\\src\\pages\\Profile.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('watchAvatar') || line.includes('avatar') || line.includes('Avatar')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
