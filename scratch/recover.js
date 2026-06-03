const fs = require('fs');
const readline = require('readline');
const path = require('path');

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
            // Found the creation step!
            console.log('Found writing step in log at index:', obj.step_index);
            const content = tc.args.CodeContent;
            // Decode the string literal if it's double-escaped or just JSON string
            const cleaned = JSON.parse(`"${content.replace(/^"|"$/g, '')}"`);
            fs.writeFileSync(targetPath, cleaned, 'utf8');
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
