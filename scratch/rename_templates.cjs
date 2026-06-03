const fs = require('fs');
const path = require('path');

const oldDir = 'd:/CBSV/public/CHUYỂN SINH HOẠT';
const newDir = 'd:/CBSV/public/CHUYEN_SINH_HOAT';

// Rename directory first
if (fs.existsSync(oldDir)) {
  fs.renameSync(oldDir, newDir);
  console.log('Renamed directory');
} else {
  console.log('Old directory not found');
}

// Rename files
const files = fs.readdirSync(newDir);
files.forEach(f => {
  let newName = '';
  if (f.includes('Mẫu 1')) newName = 'mau_1.docx';
  else if (f.includes('Mau 2')) newName = 'mau_2.docx';
  else if (f.includes('Mẫu 3')) newName = 'mau_3.docx';
  else if (f.includes('Mẫu 4')) newName = 'mau_4.docx';
  else if (f.includes('Mẫu 5')) newName = 'mau_5.docx';
  
  if (newName) {
    fs.renameSync(path.join(newDir, f), path.join(newDir, newName));
    console.log(`Renamed ${f} -> ${newName}`);
  }
});
