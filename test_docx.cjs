const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

try {
  const content = fs.readFileSync('D:/CBSV/public/2. Mau 11_KND_nhan xet dang vien giup do_DHKT_2025.docx', 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render({
    ho_ten: "Nguyễn Văn A",
    dvhd_ho_so: "Trần Văn B",
    nam_vao_chi_bo_dvhd: "2022"
  });

  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
  fs.writeFileSync('D:/CBSV/test_output.docx', buf);
  console.log('Render successful, saved to test_output.docx');
} catch (error) {
  function replaceErrors(key, value) {
    if (value instanceof Error) {
      return Object.getOwnPropertyNames(value).reduce(function(error, key) {
        error[key] = value[key];
        return error;
      }, {});
    }
    return value;
  }
  console.log('Error rendering document:');
  console.log(JSON.stringify({error: error}, replaceErrors, 2));
}
