const fs = require('fs');
const content = fs.readFileSync('d:\\CBSV\\src\\components\\DangVienForm.jsx', 'utf8');
const lines = content.split('\n');

console.log('=== Checking setFieldsValue or prefill in DangVienForm ===');
lines.forEach((line, idx) => {
  if (line.includes('setFieldsValue') || line.includes('initialValues') || line.includes('initial') || line.includes('formatted') || line.includes('updateDoc') || line.includes('addDoc')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
