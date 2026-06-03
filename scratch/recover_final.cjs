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
            
            console.log('Original content starts with:', JSON.stringify(content.substring(0, 20)));
            console.log('Original content ends with:', JSON.stringify(content.substring(content.length - 20)));
            
            // Clean up: if it starts with quote, strip it. If it ends with quote, strip it.
            if (content.startsWith('"')) {
              content = content.substring(1);
            }
            if (content.endsWith('"')) {
              content = content.substring(0, content.length - 1);
            }
            
            // Also unescape newlines and double quotes
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
