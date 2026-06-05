const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));
let count = 0;
files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content.replace(/pageSizeOptions:\s*\[([^\]]+)\]/g, (match, p1) => {
    const matches = p1.match(/\d+/g);
    if (!matches) return match;
    const nums = matches.map(Number);
    if (!nums.includes(1000)) nums.push(1000);
    return 'pageSizeOptions: [' + nums.map(n => "'" + n + "'").join(', ') + ']';
  });
  
  // Also fix safeFormatDate in DangVien if present or add try catch
  if (file === 'DangVien.jsx') {
    if (newContent.includes('const exportExcel = () => {') && !newContent.includes('safeDayjs')) {
       // Wait, I should do this manually using multi_replace_file_content.
    }
  }

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    count++;
    console.log('Updated', file);
  }
});
console.log('Total files updated:', count);
