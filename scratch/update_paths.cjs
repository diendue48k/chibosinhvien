const fs = require('fs');

let content = fs.readFileSync('src/services/docGeneratorService.js', 'utf8');

// Replace specific generation methods
content = content.replace(/'\/CHUYỂN SINH HOẠT\/1\. Mẫu 1\. Don xin chuyen dang\.docx'/g, "'/CHUYEN_SINH_HOAT/mau_1.docx'");
content = content.replace(/'\/CHUYỂN SINH HOẠT\/2\. Mau 2\. Don xin chuyen dang tam thoi\.docx'/g, "'/CHUYEN_SINH_HOAT/mau_2.docx'");
content = content.replace(/'\/CHUYỂN SINH HOẠT\/3\. Mẫu 3\. Bản nhận xét Đảng viên dự bị ĐTN\.docx'/g, "'/CHUYEN_SINH_HOAT/mau_3.docx'");
content = content.replace(/'\/CHUYỂN SINH HOẠT\/4\. Mẫu 5\. Bản nhận xét Đảng viên dự bị Chuyển SHĐ ĐVHD\.docx'/g, "'/CHUYEN_SINH_HOAT/mau_5.docx'");
content = content.replace(/'\/CHUYỂN SINH HOẠT\/5\. Mẫu 4\. Kiem diem chuyen dang 2026\.docx'/g, "'/CHUYEN_SINH_HOAT/mau_4.docx'");

// Also replace in generateTransferDocumentsZip
content = content.replace(/'\/CHUYỂN SINH HOẠT\/1\. Mẫu 1\. Don xin chuyen dang\.docx'/g, "'/CHUYEN_SINH_HOAT/mau_1.docx'");
content = content.replace(/'\/CHUYỂN SINH HOẠT\/2\. Mau 2\. Don xin chuyen dang tam thoi\.docx'/g, "'/CHUYEN_SINH_HOAT/mau_2.docx'");
content = content.replace(/'\/CHUYỂN SINH HOẠT\/3\. Mẫu 3\. Bản nhận xét Đảng viên dự bị ĐTN\.docx'/g, "'/CHUYEN_SINH_HOAT/mau_3.docx'");
content = content.replace(/'\/CHUYỂN SINH HOẠT\/4\. Mẫu 5\. Bản nhận xét Đảng viên dự bị Chuyển SHĐ ĐVHD\.docx'/g, "'/CHUYEN_SINH_HOAT/mau_5.docx'");
content = content.replace(/'\/CHUYỂN SINH HOẠT\/5\. Mẫu 4\. Kiem diem chuyen dang 2026\.docx'/g, "'/CHUYEN_SINH_HOAT/mau_4.docx'");

fs.writeFileSync('src/services/docGeneratorService.js', content, 'utf8');
console.log("Updated paths in docGeneratorService.js");
