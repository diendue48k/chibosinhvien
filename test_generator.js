import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import dayjs from 'dayjs';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const publicDir = 'd:/CBSV/public';
const outputDir = 'd:/CBSV/test_output';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Mock formatted data matching getFormattedValues
const mockData = {
  ho_ten: 'Nguyễn Văn A',
  mssv: '12345678',
  lop: 'Lớp 51K28',
  khoa: 'Marketing',
  ngay_sinh: '2004-05-15',
  ngay_vao_dang: '2025-05-30',
  que_quan: 'Hải Châu, Đà Nẵng',
  dia_chi_thuong_tru: '123 Hùng Vương, Đà Nẵng',
  dia_chi_tam_tru: 'Kí túc xá Trường ĐHKT',
  dvhd: 'Trần Thị B',
  
  chi_bo_ket_nap: 'Chi bộ Sinh viên 1',
  co_quan_cong_tac: 'Trường Đại học Kinh tế - ĐHĐN',
  chi_bo_sinh_hoat: 'Chi bộ Sinh viên 1',
  uu_diem: '- Điểm trung bình học tập xuất sắc.\n- Tích cực tham gia các hoạt động tình nguyện của chi đoàn.\n- Bản lĩnh chính trị vững vàng.',
  khuyet_diem: 'Chưa có nhiều kinh nghiệm tổ chức các hoạt động quy mô lớn.',
  bien_phap_khac_phuc: 'Tích cực đăng ký tham gia các khóa đào tạo kỹ năng lãnh đạo.',
  ngay_ky: '2026-05-30',
  
  ngay_hop_lop: '2026-05-10',
  gvcn: 'ThS. Nguyễn Văn C',
  chu_tri_lop: 'Lớp trưởng',
  thu_ky_lop: 'Bí thư Chi đoàn',
  tong_so_sv_lop: 45,
  tham_gia_lop: 42,
  vang_lop: 3,
  
  ngay_hop_chi_doan: '2026-05-12',
  bi_thu_chi_doan: 'Nguyễn Văn D',
  chu_tri_chi_doan: 'Bí thư Chi đoàn',
  thu_ky_chi_doan: 'Phó Bí thư Chi đoàn',
  tong_so_dv_chi_doan: 28,
  tham_gia_chi_doan: 26,
  vang_chi_doan: 2,
  ly_do_vang_chi_doan: 'Có lịch học quân sự',
  
  ngay_hop_lcd: '2026-05-15',
  dia_diem_hop_lcd: 'Trường Đại học Kinh tế',
  chu_tri_lcd: 'Trần Thị Lan Trinh',
  thu_ky_lcd: 'Nguyễn Thị Xuân Hòa',
  tong_so_uy_vien_lcd: 11,
  tham_gia_lcd: 11,
  vang_lcd: 0,
  
  so_nq_doan_truong: '15-NQ/ĐHKT-ĐTN',
  ngay_hop_doan_truong: '2026-05-20',
  tan_thanh_doan_truong: 11,
  bi_thu_doan_truong: 'Nguyễn Văn E'
};

const prepareTemplateData = (data) => {
  const getD = (dStr) => dStr ? dayjs(dStr).format('DD') : '.....';
  const getM = (dStr) => dStr ? dayjs(dStr).format('MM') : '.....';
  const getY = (dStr, fallbackToCurrentYear = false) => {
    if (dStr) return dayjs(dStr).format('YYYY');
    return fallbackToCurrentYear ? dayjs().format('YYYY') : '.....';
  };

  const formatFullDate = (dStr) => {
    if (!dStr) return 'ngày ..... tháng ..... năm ......';
    const dObj = dayjs(dStr);
    if (!dObj.isValid()) return 'ngày ..... tháng ..... năm ......';
    return `ngày ${dObj.format('DD')} tháng ${dObj.format('MM')} năm ${dObj.format('YYYY')}`;
  };

  return {
    ...data,
    khoa_caps: (data.khoa || '').toUpperCase(),
    dang_uy_truong: 'Trường Đại học Kinh tế',
    tinh_tp: 'Đà Nẵng',
    
    ngay_sinh_d: getD(data.ngay_sinh),
    ngay_sinh_m: getM(data.ngay_sinh),
    ngay_sinh_y: getY(data.ngay_sinh, false),
    
    ngay_vao_dang_d: getD(data.ngay_vao_dang),
    ngay_vao_dang_m: getM(data.ngay_vao_dang),
    ngay_vao_dang_y: getY(data.ngay_vao_dang, false),
    ngay_vao_dang_formatted: formatFullDate(data.ngay_vao_dang),
    
    ngay_ky_d: data.ngay_ky ? dayjs(data.ngay_ky).format('DD') : '.....',
    ngay_ky_m: data.ngay_ky ? dayjs(data.ngay_ky).format('MM') : '.....',
    ngay_ky_y: data.ngay_ky ? dayjs(data.ngay_ky).format('YYYY') : '.....',
    
    ngay_hop_lop_d: '.....',
    ngay_hop_lop_m: '.....',
    ngay_hop_lop_y: getY(data.ngay_hop_lop, true),
    
    ngay_hop_chi_doan_d: '.....',
    ngay_hop_chi_doan_m: '.....',
    ngay_hop_chi_doan_y: getY(data.ngay_hop_chi_doan, true),
    
    ngay_hop_lcd_d: '.....',
    ngay_hop_lcd_m: '.....',
    ngay_hop_lcd_y: getY(data.ngay_hop_lcd, true),
    
    ngay_hop_doan_truong_d: '.....',
    ngay_hop_doan_truong_m: '.....',
    ngay_hop_doan_truong_y: getY(data.ngay_hop_doan_truong, true),
    
    tan_thanh_lcd: data.tong_so_uy_vien_lcd || 11,
    ti_le_lcd: 100,
    khong_tan_thanh_lcd: 0,
    
    tan_thanh_chi_doan: 3,
    ti_le_chi_doan: 100,
    khong_tan_thanh_chi_doan: 0,
    
    khong_tan_thanh_bb_chi_doan: 0,
    ly_do_khong_tan_thanh_chi_doan: '',
    
    khong_tan_thanh_bb_lop: 0,
    ly_do_khong_tan_thanh_bb_lop: '',
    
    ti_le_bb_chi_doan: data.tong_so_dv_chi_doan && data.tham_gia_chi_doan
      ? Math.round((data.tham_gia_chi_doan / data.tong_so_dv_chi_doan) * 100)
      : 100,
      
    ti_le_bb_lop: data.tong_so_sv_lop && data.tham_gia_lop
      ? Math.round((data.tham_gia_lop / data.tong_so_sv_lop) * 100)
      : 100,

    ti_le_doan_truong: 100,
    khong_tan_thanh_doan_truong: data.khong_tan_thanh_doan_truong || 0,
  };
};

const mergeXMLWithDOM = (xmlString, data) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  
  const textElements = Array.from(doc.getElementsByTagName('w:t'));
  
  for (const textElem of textElements) {
    let textContent = textElem.textContent || '';
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    let match;
    
    while ((match = placeholderRegex.exec(textContent)) !== null) {
      const key = match[1];
      if (data[key] !== undefined) {
        const val = String(data[key] === null || data[key] === undefined ? '' : data[key]);
        
        if (val.includes('\n')) {
          const lines = val.split('\n');
          
          let paragraph = textElem;
          while (paragraph && paragraph.tagName !== 'w:p') {
            paragraph = paragraph.parentNode;
          }
          
          if (paragraph) {
            // Line 1: Replace placeholder directly in the existing <w:t> node of the original paragraph
            textElem.textContent = textContent.replace(`{{${key}}}`, lines[0]);
            
            let currentParagraph = paragraph;
            for (let i = 1; i < lines.length; i++) {
              const clonedParagraph = paragraph.cloneNode(true);
              
              // 1. Clean up paragraph properties of the cloned paragraph to ensure normal, non-bold text
              // We preserve all native indentation (w:ind) and paragraph spacing (w:spacing) so that
              // all lines align perfectly with the first line and retain standard academic line height/paragraph spacing.
              // Remove bold formatting (<w:b/> and <w:bCs/>) from cloned paragraph properties and run properties
              const boldElems = Array.from(clonedParagraph.getElementsByTagName('w:b'));
              for (const b of boldElems) {
                b.parentNode.removeChild(b);
              }
              
              const boldCsElems = Array.from(clonedParagraph.getElementsByTagName('w:bCs'));
              for (const b of boldCsElems) {
                b.parentNode.removeChild(b);
              }
              
              // 2. Set the text content for the cloned paragraph
              const clonedTextElements = Array.from(clonedParagraph.getElementsByTagName('w:t'));
              // Find the target text node that corresponds to the replaced placeholder
              const targetClonedText = clonedTextElements.find(t => 
                t.textContent.includes(`{{${key}}}`) || t.textContent.includes(lines[0])
              );
              
              if (targetClonedText) {
                targetClonedText.textContent = lines[i];
                
                // Clear all other text elements in the cloned paragraph to prevent prefix/suffix duplication
                for (const t of clonedTextElements) {
                  if (t !== targetClonedText) {
                    t.textContent = '';
                  }
                }
              }
              
              // 3. Insert the cloned paragraph right after currentParagraph
              const parent = paragraph.parentNode;
              const nextSibling = currentParagraph.nextSibling;
              if (nextSibling) {
                parent.insertBefore(clonedParagraph, nextSibling);
              } else {
                parent.appendChild(clonedParagraph);
              }
              
              currentParagraph = clonedParagraph;
            }
          } else {
            // Safe DOM-based fallback if paragraph is not found
            const parentNode = textElem.parentNode;
            const textParts = textContent.split(`{{${key}}}`);
            if (textParts.length > 1) {
              textElem.textContent = '';
              let curTextNode = textElem;
              curTextNode.textContent = textParts[0] + lines[0];
              
              for (let k = 1; k < lines.length; k++) {
                const br = doc.createElement('w:br');
                parentNode.insertBefore(br, curTextNode.nextSibling);
                
                const newT = doc.createElement('w:t');
                newT.setAttribute('xml:space', 'preserve');
                newT.textContent = lines[k];
                parentNode.insertBefore(newT, br.nextSibling);
                
                curTextNode = newT;
              }
              
              if (textParts[1]) {
                const tailT = doc.createElement('w:t');
                tailT.setAttribute('xml:space', 'preserve');
                tailT.textContent = textParts[1];
                parentNode.insertBefore(tailT, curTextNode.nextSibling);
              }
            }
          }
        } else {
          // Simple single-line replacement (plain text handles XML escaping automatically via DOM)
          textElem.textContent = textContent.replace(`{{${key}}}`, val);
        }
        
        textContent = textElem.textContent || '';
        placeholderRegex.lastIndex = 0;
      }
    }
  }
  
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
};

async function testReplace(templateName, outputName) {
  const filePath = path.join(publicDir, templateName);
  if (!fs.existsSync(filePath)) {
    console.log(`Template not found: ${templateName}`);
    return;
  }
  
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  
  const data = prepareTemplateData(mockData);
  const files = Object.keys(zip.files);
  
  for (const filename of files) {
    if (
      filename.endsWith(".xml") && 
      (filename === "word/document.xml" || filename.startsWith("word/header") || filename.startsWith("word/footer"))
    ) {
      let content = await zip.file(filename).async("string");
      content = mergeXMLWithDOM(content, data);
      zip.file(filename, content);
    }
  }
  
  const outputBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(outputDir, outputName), outputBuffer);
  console.log(`Generated: ${outputName}`);
}

async function run() {
  await testReplace('1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx', '1_Ban_Tu_Kiem_Diem.docx');
  await testReplace('2. Nghị quyết Đoàn Trường (02 bản).docx', '2_Nghi_Quyet_Doan_Truong.docx');
  await testReplace('3. Nghị quyết LCĐ.docx', '3_Nghi_Quyet_LCD.docx');
  await testReplace('3. Biên bản họp Liên chi Đoàn.docx', '4_Bien_Ban_LCD.docx');
  await testReplace('4. Nghị quyết Chi Đoàn.docx', '5_Nghi_Quyet_Chi_Doan.docx');
  await testReplace('5. Biên bản họp Chi Đoàn.docx', '6_Bien_Ban_Chi_Doan.docx');
  await testReplace('6. Biên bản họp lớp.docx', '7_Bien_Ban_Hop_Lop.docx');
}

run().catch(console.error);
