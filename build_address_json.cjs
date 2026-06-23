const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = 'D:\\CBSV\\public\\BangChuyendoiĐVHCmoi_cu_final.xlsx';

function cleanName(str) {
  if (!str) return '';
  return String(str)
    .replace(/\s*\([^)]*\)/g, '') // remove parentheses and anything inside
    .replace(/\s+/g, ' ')         // normalize multiple spaces to a single space
    .trim();
}

try {
  console.log(`Reading Excel file: ${filePath}`);
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  const addressDataMoi = {};
  const addressDataCu = {};
  const addressMapping = {};

  data.forEach((row) => {
    const tinhMoiRaw = row['Tỉnh, thành phố mới'];
    const xaMoiRaw = row['Tên Xã mới'];
    const xaCuRaw = row['Tên Xã cũ'];
    const quanHuyenRaw = row['Quận/huyện'];
    const tinhCuRaw = row['Tỉnh cũ'];

    // Skip empty / header rows
    if (!tinhMoiRaw || !xaMoiRaw || !quanHuyenRaw || !tinhCuRaw) {
      return;
    }

    const tinhMoi = cleanName(tinhMoiRaw);
    const xaMoi = cleanName(xaMoiRaw);
    const xaCu = cleanName(xaCuRaw);
    const quanHuyen = cleanName(quanHuyenRaw);
    const tinhCu = cleanName(tinhCuRaw);

    // 1. Generate addressDataMoi (New Address: Province -> Wards list)
    if (!addressDataMoi[tinhMoi]) {
      addressDataMoi[tinhMoi] = [];
    }
    if (!addressDataMoi[tinhMoi].includes(xaMoi)) {
      addressDataMoi[tinhMoi].push(xaMoi);
    }

    // 2. Generate addressDataCu (Old Address: Province -> District -> Wards list)
    if (!addressDataCu[tinhCu]) {
      addressDataCu[tinhCu] = {};
    }
    if (!addressDataCu[tinhCu][quanHuyen]) {
      addressDataCu[tinhCu][quanHuyen] = [];
    }
    if (xaCu && !addressDataCu[tinhCu][quanHuyen].includes(xaCu)) {
      addressDataCu[tinhCu][quanHuyen].push(xaCu);
    }

    // 3. Generate addressMapping: key (tinhMoi + "|" + xaMoi) -> value (tinhCu, quanHuyen, xaCu)
    const mapKey = `${tinhMoi.toLowerCase().trim()}|${xaMoi.toLowerCase().trim()}`;
    if (!addressMapping[mapKey]) {
      addressMapping[mapKey] = {
        tinh_tp_cu: tinhCu,
        quan_huyen_cu: quanHuyen,
        xa_phuong_cu: xaCu
      };
    }
  });

  // Sort wards in addressDataMoi
  Object.keys(addressDataMoi).forEach(prov => {
    addressDataMoi[prov].sort((a, b) => a.localeCompare(b, 'vi'));
  });

  // Sort districts and wards in addressDataCu
  Object.keys(addressDataCu).forEach(prov => {
    const districts = addressDataCu[prov];
    Object.keys(districts).forEach(dist => {
      districts[dist].sort((a, b) => a.localeCompare(b, 'vi'));
    });
  });

  // Ensure directories exist
  const outputDir = 'D:\\CBSV\\src\\data';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write JSON files
  fs.writeFileSync(path.join(outputDir, 'addressDataMoi.json'), JSON.stringify(addressDataMoi, null, 2));
  fs.writeFileSync(path.join(outputDir, 'addressDataCu.json'), JSON.stringify(addressDataCu, null, 2));
  fs.writeFileSync(path.join(outputDir, 'addressMapping.json'), JSON.stringify(addressMapping, null, 2));

  console.log('Successfully generated JSON files.');
  console.log(`- New provinces: ${Object.keys(addressDataMoi).length}`);
  console.log(`- Old provinces: ${Object.keys(addressDataCu).length}`);
  console.log(`- Address mappings: ${Object.keys(addressMapping).length}`);

} catch (e) {
  console.error("Error reading or writing address data:", e);
}
