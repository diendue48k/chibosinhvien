const domains = [
  'qlysinhvien.onrender.com',
  'qlysinhvien-api.onrender.com',
  'qlysinhvien-server.onrender.com',
  'qlysinhvien-backend.onrender.com',
  'qlycbsv.onrender.com',
  'qlycbsv-api.onrender.com',
  'qlycbsv-server.onrender.com',
  'qlycbsv-backend.onrender.com',
  'cbsv.onrender.com'
];

async function probe() {
  for (const domain of domains) {
    const url = `https://${domain}/api/verify`;
    console.log(`Probing ${url}...`);
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      console.log(`  Status: ${res.status}`);
      const text = await res.text();
      console.log(`  Headers:`, JSON.stringify(Object.fromEntries(res.headers.entries())));
      console.log(`  Snippet: ${text.substring(0, 150)}`);
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
    console.log('-----------------------------------');
  }
}

probe();
