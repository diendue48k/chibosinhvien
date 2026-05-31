const fs = require('fs');

const content = fs.readFileSync('d:\\CBSV\\src\\pages\\Users.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('giả lập') || line.includes('impersonate') || line.includes('đăng nhập')) {
    if (line.includes('giả lập')) {
      console.log(`\nLine ${idx + 1}: ${line.trim()}`);
      // print 10 lines before and after
      const start = Math.max(0, idx - 10);
      const end = Math.min(lines.length - 1, idx + 10);
      for (let i = start; i <= end; i++) {
        console.log(`${i + 1}: ${lines[i]}`);
      }
    }
  }
});
