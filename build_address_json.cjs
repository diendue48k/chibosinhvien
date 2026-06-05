const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Parse Old Address (3 levels)
const workbookCu = xlsx.readFile('D:\\CBSV\\public\\hanh_chinh.xlsx');
const sheetCu = workbookCu.Sheets[workbookCu.SheetNames[0]];
const dataCu = xlsx.utils.sheet_to_json(sheetCu);

const addressDataCu = {};
dataCu.forEach(row => {
    const province = row['Tỉnh Thành Phố'];
    const district = row['Quận Huyện'];
    const ward = row['Phường Xã'];
    
    if (!province || !district || !ward) return;
    
    if (!addressDataCu[province]) {
        addressDataCu[province] = {};
    }
    if (!addressDataCu[province][district]) {
        addressDataCu[province][district] = [];
    }
    if (!addressDataCu[province][district].includes(ward)) {
        addressDataCu[province][district].push(ward);
    }
});
fs.writeFileSync('D:\\CBSV\\src\\data\\addressDataCu.json', JSON.stringify(addressDataCu, null, 2));

// Parse New Address (2 levels)
const workbookMoi = xlsx.readFile('D:\\CBSV\\public\\Hành chính mới.xlsx');
const sheetMoi = workbookMoi.Sheets[workbookMoi.SheetNames[0]];
const dataMoi = xlsx.utils.sheet_to_json(sheetMoi);

const addressDataMoi = {};
dataMoi.forEach(row => {
    const province = row['Tỉnh mới'];
    const ward = row['Phường/xã mới'];
    
    if (!province || !ward) return;
    
    if (!addressDataMoi[province]) {
        addressDataMoi[province] = [];
    }
    if (!addressDataMoi[province].includes(ward)) {
        addressDataMoi[province].push(ward);
    }
});
fs.writeFileSync('D:\\CBSV\\src\\data\\addressDataMoi.json', JSON.stringify(addressDataMoi, null, 2));

console.log('Successfully generated JSON files.');
