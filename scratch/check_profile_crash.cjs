const fs = require('fs');
const content = fs.readFileSync('d:\\CBSV\\src\\pages\\Profile.jsx', 'utf8');
console.log('Profile.jsx length:', content.length);

// Let's search for typical address variables or imports in Profile.jsx
const addressData = require('d:\\CBSV\\src\\data\\addressData.json');
console.log('addressData keys sample:', Object.keys(addressData).slice(0, 5));

// Check if there are any parts of Profile.jsx that try to map or filter something from addressData that might be missing or throwing undefined errors
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('addressData') || line.includes('wards') || line.includes('districts') || line.includes('que_quan')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
