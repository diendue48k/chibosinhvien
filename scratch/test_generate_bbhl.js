import fs from 'fs';
import JSZip from 'jszip';
import dayjs from 'dayjs';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

// Copying helper and preparation functions from docGeneratorService.js
const formatVietnameseDate = (dStr) => {
  if (!dStr) return 'ngày      tháng      năm ......';
  const dObj = dayjs(dStr);
  if (!dObj.isValid()) return 'ngày      tháng      năm ......';
  return `${dObj.format('DD')} tháng ${dObj.format('MM')} năm ${dObj.format('YYYY')}`;
};

const prepareTemplateData = (data) => {
  const getD = (dStr) => dStr ? dayjs(dStr).format('DD') : '';
  const getM = (dStr) => dStr ? dayjs(dStr).format('MM') : '';
  const getY = (dStr, fallbackToCurrentYear = false) => {
    if (dStr) return dayjs(dStr).format('YYYY');
    return fallbackToCurrentYear ? dayjs().format('YYYY') : '';
  };
  const formatFullDate = (dStr) => {
    if (!dStr) return 'ngày        tháng        năm         ';
    const dObj = dayjs(dStr);
    if (!dObj.isValid()) return 'ngày        tháng        năm         ';
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
    ngay_ky_d: data.ngay_ky ? dayjs(data.ngay_ky).format('DD') : '',
    ngay_ky_m: data.ngay_ky ? dayjs(data.ngay_ky).format('MM') : '',
    ngay_ky_y: data.ngay_ky ? dayjs(data.ngay_ky).format('YYYY') : '',
    ngay_hop_lop_d: '',
    ngay_hop_lop_m: '',
    ngay_hop_lop_y: getY(data.ngay_hop_lop, true),
    ngay_hop_chi_doan_d: '',
    ngay_hop_chi_doan_m: '',
    ngay_hop_chi_doan_y: getY(data.ngay_hop_chi_doan, true),
    ngay_hop_lcd_d: '',
    ngay_hop_lcd_m: '',
    ngay_hop_lcd_y: getY(data.ngay_hop_lcd, true),
    ngay_hop_doan_truong_d: '',
    ngay_hop_doan_truong_m: '',
    ngay_hop_doan_truong_y: getY(data.ngay_hop_doan_truong, true),
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
            textElem.textContent = textContent.replace(`{{${key}}}`, lines[0]);
            let currentParagraph = paragraph;
            for (let i = 1; i < lines.length; i++) {
              const clonedParagraph = paragraph.cloneNode(true);
              const boldElems = Array.from(clonedParagraph.getElementsByTagName('w:b'));
              for (const b of boldElems) {
                b.parentNode.removeChild(b);
              }
              const boldCsElems = Array.from(clonedParagraph.getElementsByTagName('w:bCs'));
              for (const b of boldCsElems) {
                b.parentNode.removeChild(b);
              }
              
              const clonedTextElements = Array.from(clonedParagraph.getElementsByTagName('w:t'));
              const targetClonedText = clonedTextElements.find(t =>
                t.textContent.includes(`{{${key}}}`)
              ) || clonedTextElements.find(t => t.textContent.includes(lines[0]))
                || clonedTextElements[clonedTextElements.length - 1];
              
              if (targetClonedText) {
                targetClonedText.textContent = targetClonedText.textContent
                  .replace(`{{${key}}}`, lines[i])
                  .replace(lines[0], lines[i]);
                
                for (const t of clonedTextElements) {
                  if (t !== targetClonedText) {
                    t.textContent = '';
                  }
                }
              }
              
              const parent = paragraph.parentNode;
              const nextSibling = currentParagraph.nextSibling;
              if (nextSibling) {
                parent.insertBefore(clonedParagraph, nextSibling);
              } else {
                parent.appendChild(clonedParagraph);
              }
              currentParagraph = clonedParagraph;
            }
          }
        } else {
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

async function testGenerate() {
  const filePath = 'd:/CBSV/public/6. Biên bản họp lớp.docx';
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  
  const mockData = {
    ho_ten: 'Hà Thị Ngọc Anh',
    lop: '51K31.3',
    khoa: 'Marketing',
    ngay_sinh: '2004-05-16',
    ngay_vao_dang: '2026-05-26',
    ngay_ky: '2026-06-03',
    uu_diem: 'Ưu điểm dòng 1\nƯu điểm dòng 2\nƯu điểm dòng 3',
    khuyet_diem: 'Khuyết điểm dòng 1\nKhuyết điểm dòng 2'
  };
  
  const preparedData = prepareTemplateData(mockData);
  console.log("Prepared Data 'uu_diem':", JSON.stringify(preparedData.uu_diem));
  
  let docXml = await zip.file('word/document.xml').async('string');
  const mergedXml = mergeXMLWithDOM(docXml, preparedData);
  
  const idxUuDiem = mergedXml.indexOf('Ưu điểm dòng 1');
  const idxPlaceholder = mergedXml.indexOf('{{uu_diem}}');
  
  console.log("Index of 'Ưu điểm dòng 1' in merged XML:", idxUuDiem);
  console.log("Index of '{{uu_diem}}' in merged XML:", idxPlaceholder);
  
  if (idxPlaceholder !== -1) {
    const start = Math.max(0, idxPlaceholder - 100);
    const end = Math.min(mergedXml.length, idxPlaceholder + 100);
    console.log("XML around remaining placeholder:", mergedXml.substring(start, end));
  } else {
    console.log("Placeholder replaced successfully!");
  }
}

testGenerate().catch(console.error);
