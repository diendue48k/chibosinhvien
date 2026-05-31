import fs from 'fs';
import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

async function convert() {
  const filePath = 'd:/CBSV/public/1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx';
  if (!fs.existsSync(filePath)) {
    console.log("Error: Converted .docx file not found!");
    return;
  }
  
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml').async('string');
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, 'text/xml');
  
  // 1. Replace plain text placeholders
  const textElements = Array.from(doc.getElementsByTagName('w:t'));
  
  for (const t of textElements) {
    let txt = t.textContent || '';
    
    // Replace Name
    if (txt.includes('Nguyễn Hữu Ái Quốc')) {
      t.textContent = txt.replace('Nguyễn Hữu Ái Quốc', '{{ho_ten}}');
    }
    // Replace Birth Date
    else if (txt.includes('22/01/2007')) {
      t.textContent = txt.replace('22/01/2007', '{{ngay_sinh_d}}/{{ngay_sinh_m}}/{{ngay_sinh_y}}');
    }
    // Replace Hometown
    else if (txt.includes('Xã Thạch Hà, tỉnh Hà Tĩnh (Trước đây là thị trấn Thạch Hà, huyện Thạch Hà, tỉnh Hà Tĩnh)')) {
      t.textContent = txt.replace('Xã Thạch Hà, tỉnh Hà Tĩnh (Trước đây là thị trấn Thạch Hà, huyện Thạch Hà, tỉnh Hà Tĩnh)', '{{que_quan}}');
    }
    // Replace Permanent Address
    else if (txt.includes('Xã Thạch Hà, tỉnh Hà Tĩnh (Trước đây là thị trấn Thạch Hà, huyện Thạch Hà, tỉnh Hà Tĩnh).')) {
      t.textContent = txt.replace('Xã Thạch Hà, tỉnh Hà Tĩnh (Trước đây là thị trấn Thạch Hà, huyện Thạch Hà, tỉnh Hà Tĩnh).', '{{dia_chi_thuong_tru}}');
    }
    // Replace Temporary Address
    else if (txt.includes('150 Ngũ Hành Sơn, phường Ngũ Hành Sơn, thành phố Đà Nẵng.')) {
      t.textContent = txt.replace('150 Ngũ Hành Sơn, phường Ngũ Hành Sơn, thành phố Đà Nẵng.', '{{dia_chi_tam_tru}}');
    }
    // Replace Admission Date and Branch
    else if (txt.includes('Được kết nạp vào Đảng ngày 30 tháng 05 năm 2025, tại Chi bộ Anh-Địa-GDTC')) {
      t.textContent = txt.replace('Được kết nạp vào Đảng ngày 30 tháng 05 năm 2025, tại Chi bộ Anh-Địa-GDTC', 'Được kết nạp vào Đảng ngày {{ngay_vao_dang_d}} tháng {{ngay_vao_dang_m}} năm {{ngay_vao_dang_y}}, tại Chi bộ {{chi_bo_ket_nap}}');
    }
    // Replace Org Unit
    else if (txt.includes('Trường Đại học Kinh tế - Đại học Đà Nẵng')) {
      t.textContent = txt.replace('Trường Đại học Kinh tế - Đại học Đà Nẵng', '{{co_quan_cong_tac}}');
    }
    // Replace Active Branch
    else if (txt.includes('Hiện đang sinh hoạt tại Chi bộ Sinh viên')) {
      t.textContent = txt.replace('Hiện đang sinh hoạt tại Chi bộ Sinh viên', 'Hiện đang sinh hoạt tại Chi bộ {{chi_bo_sinh_hoat}}');
    }
  }
  
  // 2. Replace multi-line Advantages (Ưu điểm) and Disadvantages (Khuyết điểm) using DOM
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
  
  let idxUuHeader = -1;
  let idxKhuyetHeader = -1;
  let idxEndParagraph = -1;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const text = Array.from(p.getElementsByTagName('w:t')).map(t => t.textContent).join('');
    
    if (text.includes('Ưu điểm') && text.includes(':')) {
      idxUuHeader = i;
    } else if (text.includes('Khuyết điểm') && text.includes(':')) {
      idxKhuyetHeader = i;
    } else if (text.includes('Tôi tự nhận thấy có đủ điều kiện')) {
      idxEndParagraph = i;
    }
  }
  
  console.log(`Indices found: UuHeader=${idxUuHeader}, KhuyetHeader=${idxKhuyetHeader}, End=${idxEndParagraph}`);
  
  if (idxUuHeader !== -1 && idxKhuyetHeader !== -1 && idxEndParagraph !== -1) {
    // Collect all paragraphs of advantages (from idxUuHeader + 1 to idxKhuyetHeader - 1)
    const uuParagraphs = paragraphs.slice(idxUuHeader + 1, idxKhuyetHeader);
    
    // We keep the first advantage paragraph, set its text to {{uu_diem}}, and remove the others
    if (uuParagraphs.length > 0) {
      const firstUuP = uuParagraphs[0];
      const uuTextElems = Array.from(firstUuP.getElementsByTagName('w:t'));
      if (uuTextElems.length > 0) {
        uuTextElems[0].textContent = '{{uu_diem}}';
        for (let j = 1; j < uuTextElems.length; j++) {
          uuTextElems[j].textContent = '';
        }
      }
      
      // Remove other advantage paragraphs
      for (let j = 1; j < uuParagraphs.length; j++) {
        uuParagraphs[j].parentNode.removeChild(uuParagraphs[j]);
      }
      console.log(`Converted advantages section: kept 1 paragraph, removed ${uuParagraphs.length - 1}`);
    }
    
    // Collect all paragraphs of disadvantages (from idxKhuyetHeader + 1 to idxEndParagraph - 1)
    const khuyetParagraphs = paragraphs.slice(idxKhuyetHeader + 1, idxEndParagraph);
    if (khuyetParagraphs.length > 0) {
      const firstKhuyetP = khuyetParagraphs[0];
      const khuyetTextElems = Array.from(firstKhuyetP.getElementsByTagName('w:t'));
      if (khuyetTextElems.length > 0) {
        khuyetTextElems[0].textContent = '{{khuyet_diem}}';
        for (let j = 1; j < khuyetTextElems.length; j++) {
          khuyetTextElems[j].textContent = '';
        }
      }
      
      // Remove other disadvantage paragraphs
      for (let j = 1; j < khuyetParagraphs.length; j++) {
        khuyetParagraphs[j].parentNode.removeChild(khuyetParagraphs[j]);
      }
      console.log(`Converted disadvantages section: kept 1 paragraph, removed ${khuyetParagraphs.length - 1}`);
    }
  }
  
  // Serialize back to string
  const serializer = new XMLSerializer();
  const outputXml = serializer.serializeToString(doc);
  zip.file('word/document.xml', outputXml);
  
  const outputBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(filePath, outputBuffer);
  console.log("SUCCESS: Re-generated template 1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx as a clean template with placeholders!");
}

convert().catch(console.error);
