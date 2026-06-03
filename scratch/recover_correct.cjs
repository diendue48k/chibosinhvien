const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\5b83cefd-a0c5-4bec-b842-cc72df95c2aa\\.system_generated\\logs\\transcript.jsonl';
const targetPath = 'd:\\CBSV\\src\\pages\\DangKyChuyen.jsx';

async function recover() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          if (tc.name === 'write_to_file' && tc.args.TargetFile && tc.args.TargetFile.includes('DangKyChuyen.jsx')) {
            console.log('Found writing step in log at index:', obj.step_index);
            let content = tc.args.CodeContent;
            
            // If the content is wrapped in escaped quotes, parse it
            if (content.startsWith('"') && content.endsWith('"')) {
              try {
                content = JSON.parse(content);
              } catch (e) {
                // If parsing fails, try manually stripping
                content = content.substring(1, content.length - 1);
              }
            }
            
            // Unescape escaped characters like \n, \t, \"
            // A simple regex replacement for standard JS escapes:
            const unescaped = content
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
              
            fs.writeFileSync(targetPath, unescaped, 'utf8');
            console.log('Successfully recovered DangKyChuyen.jsx!');
            return;
          }
        }
      }
    } catch (e) {
      // Ignore parse errors on truncated lines
    }
  }
  console.log('Could not find recovery content in log.');
}

recover().catch(console.error);
