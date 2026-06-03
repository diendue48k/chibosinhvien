const fs = require('fs');
const content = fs.readFileSync('d:\\CBSV\\src\\components\\ProfileDrawer.jsx', 'utf8');
const lines = content.split('\n');

console.log('=== Checking save/update in ProfileDrawer ===');
lines.forEach((line, idx) => {
  if (line.includes('updateDoc') || line.includes('formatted') || line.includes('onFinish') || line.includes('handleSave') || line.includes('setFieldsValue')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
