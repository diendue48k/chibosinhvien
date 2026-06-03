const fs = require('fs');
const content = fs.readFileSync('d:\\CBSV\\src\\pages\\DangVien.jsx', 'utf8');
const lines = content.split('\n');

console.log('=== Checking save/update in DangVien.jsx ===');
lines.forEach((line, idx) => {
  if (line.includes('addDoc') || line.includes('updateDoc') || line.includes('onSave') || line.includes('handleAdd') || line.includes('handleEdit') || line.includes('setFieldsValue')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
