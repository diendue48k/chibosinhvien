const fs = require('fs');

let content = fs.readFileSync('src/pages/HoSoChuyenRa.jsx', 'utf8');

content = content.replace(/ngay_sinh: record.ngay_sinh \? dayjs\(record.ngay_sinh\) : null,/g, 'ngay_sinh: safeDate(record.ngay_sinh),');
content = content.replace(/ngay_vao_dang: record.ngay_vao_dang \? dayjs\(record.ngay_vao_dang\) : null,/g, 'ngay_vao_dang: safeDate(record.ngay_vao_dang),');
content = content.replace(/ngay_chinh_thuc: record.ngay_chinh_thuc \? dayjs\(record.ngay_chinh_thuc\) : null,/g, 'ngay_chinh_thuc: safeDate(record.ngay_chinh_thuc),');
content = content.replace(/dvhd_ngay_sinh: record.dvhd_ngay_sinh \? dayjs\(record.dvhd_ngay_sinh\) : null,/g, 'dvhd_ngay_sinh: safeDate(record.dvhd_ngay_sinh),');
content = content.replace(/dvhd_ngay_vao_dang: record.dvhd_ngay_vao_dang \? dayjs\(record.dvhd_ngay_vao_dang\) : null,/g, 'dvhd_ngay_vao_dang: safeDate(record.dvhd_ngay_vao_dang),');
content = content.replace(/dvhd_ngay_chinh_thuc: record.dvhd_ngay_chinh_thuc \? dayjs\(record.dvhd_ngay_chinh_thuc\) : null,/g, 'dvhd_ngay_chinh_thuc: safeDate(record.dvhd_ngay_chinh_thuc),');
content = content.replace(/ngay_phan_cong: record.ngay_phan_cong \? dayjs\(record.ngay_phan_cong\) : null,/g, 'ngay_phan_cong: safeDate(record.ngay_phan_cong),');

fs.writeFileSync('src/pages/HoSoChuyenRa.jsx', content, 'utf8');
console.log("Fixed date parsing safely.");
