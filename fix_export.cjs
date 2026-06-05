const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'pages');

fs.readdir(directoryPath, function (err, files) {
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 
    files.forEach(function (file) {
        if (!file.endsWith('.jsx')) return;
        
        const fullPath = path.join(directoryPath, file);
        let content = fs.readFileSync(fullPath, 'utf8');
        let changed = false;

        // Fix 1: formatDate function
        const oldFormatDate = `const formatDate = (dateString) => {
    if (!dateString) return '';
    return dayjs(dateString).format('DD/MM/YYYY');
  };`;
        const newFormatDate = `const formatDate = (dateString) => {
    if (!dateString) return '';
    if (dateString.toDate) return dayjs(dateString.toDate()).format('DD/MM/YYYY');
    if (dateString.seconds) return dayjs(dateString.seconds * 1000).format('DD/MM/YYYY');
    return dayjs(dateString).format('DD/MM/YYYY');
  };`;
        if (content.includes(oldFormatDate)) {
          content = content.replace(oldFormatDate, newFormatDate);
          changed = true;
        }

        // Fix 2: Inline dayjs formatting (e.g. DangVienDuBi.jsx)
        const inlineDayjsRegex = /dayjs\(item\[field\.key\]\)\.format\('DD\/MM\/YYYY'\)/g;
        if (inlineDayjsRegex.test(content)) {
          content = content.replace(inlineDayjsRegex, "(item[field.key]?.toDate ? dayjs(item[field.key].toDate()).format('DD/MM/YYYY') : (item[field.key]?.seconds ? dayjs(item[field.key].seconds * 1000).format('DD/MM/YYYY') : dayjs(item[field.key]).format('DD/MM/YYYY')))");
          changed = true;
        }

        // Fix 3: Add STT to mappedData
        const mapRegex = /const mappedData = dataToExport\.map\(item => {\s*const row = {};/g;
        if (mapRegex.test(content)) {
          content = content.replace(mapRegex, `const mappedData = dataToExport.map((item, index) => {\n      const row = { 'STT': index + 1 };`);
          changed = true;
        }

        if (changed) {
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`Updated ${file}`);
        }
    });
});
