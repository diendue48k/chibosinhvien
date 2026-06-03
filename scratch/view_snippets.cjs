const fs = require('fs');
const code = fs.readFileSync('d:\\CBSV\\scratch\\extracted_dangkychuyen.js', 'utf8');

function findSnippet(keyword, linesAround = 60) {
  const index = code.indexOf(keyword);
  if (index === -1) {
    console.log(`Keyword "${keyword}" not found.`);
    return;
  }
  console.log(`\n================ SNIPPET FOR: ${keyword} ================`);
  const start = Math.max(0, index - 500);
  const end = Math.min(code.length, index + 3500);
  console.log(code.substring(start, end));
}

findSnippet('downloadSingleDoc');
findSnippet('downloadAllAsZip');
findSnippet('documentList');
