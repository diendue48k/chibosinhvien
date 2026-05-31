const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function cleanProvinceName(name) {
  if (!name) return "";
  let cleaned = name.trim();
  cleaned = cleaned.replace(/^(Thành phố|Tỉnh|Thành Phố|tỉnh|thành phố)\s+/, "");
  cleaned = cleaned.replace(/^(TP\.|TP)\s+/, "");
  return cleaned.trim();
}

console.log("Reading hanh_chinh.xlsx...");
const workbook = XLSX.readFile('D:\\CBSV\\public\\hanh_chinh.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);

console.log(`Successfully parsed ${rows.length} rows from Excel.`);

const addressMap = {};

rows.forEach((row, idx) => {
  const provinceRaw = row['Tỉnh Thành Phố'] || row['Tỉnh Thành phố'] || row['tinh_thanh_pho'] || row['Tỉnh/Thành phố'];
  const districtRaw = row['Quận Huyện'] || row['Quận/Huyện'] || row['quan_huyen'];
  const wardRaw = row['Phường Xã'] || row['Phường/Xã'] || row['phuong_xa'];

  if (!provinceRaw || !districtRaw || !wardRaw) return;

  const province = cleanProvinceName(String(provinceRaw));
  const district = String(districtRaw).trim();
  const ward = String(wardRaw).trim();

  if (!addressMap[province]) {
    addressMap[province] = {};
  }
  if (!addressMap[province][district]) {
    addressMap[province][district] = new Set();
  }
  addressMap[province][district].add(ward);
});

console.log("\nConverting sets to sorted arrays for 3-level structure...");
const finalJson = {};
const provinces = Object.keys(addressMap).sort();

provinces.forEach(prov => {
  finalJson[prov] = {};
  const districts = Object.keys(addressMap[prov]).sort();
  districts.forEach(dist => {
    finalJson[prov][dist] = Array.from(addressMap[prov][dist]).sort();
  });
  console.log(`- ${prov}: ${districts.length} quận/huyện`);
});

const outputPath = 'd:\\CBSV\\src\\data\\addressData.json';
console.log(`\nWriting to output file: ${outputPath}`);
fs.writeFileSync(outputPath, JSON.stringify(finalJson, null, 2), 'utf8');

console.log("SUCCESSFULLY GENERATED 3-LEVEL addressData.json!");
