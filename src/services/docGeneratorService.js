import JSZip from 'jszip';
import dayjs from 'dayjs';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { getTemplateUrl } from './templateStorageService';

// ============================================================
// HELPER: Split Date
// ============================================================
const splitDate = (dateStr) => {
  if (!dateStr) return { d: '', m: '', y: dayjs().format('YYYY') };
  const dObj = dayjs(dateStr);
  if (!dObj.isValid()) return { d: '', m: '', y: dayjs().format('YYYY') };
  return {
    d: dObj.format('DD'),
    m: dObj.format('MM'),
    y: dObj.format('YYYY')
  };
};

// ============================================================
// HELPER: Prepare Template Data
// ============================================================
const prepareTemplateData = (data) => {
  // Safe helper to extract parts of critical dates (like birthday, party admission)
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
    
    // Critical personal dates - strictly populated or shown as dots
    ngay_sinh_d: getD(data.ngay_sinh),
    ngay_sinh_m: getM(data.ngay_sinh),
    ngay_sinh_y: getY(data.ngay_sinh, false),
    
    ngay_vao_dang_d: getD(data.ngay_vao_dang),
    ngay_vao_dang_m: getM(data.ngay_vao_dang),
    ngay_vao_dang_y: getY(data.ngay_vao_dang, false),
    ngay_vao_dang_formatted: formatFullDate(data.ngay_vao_dang),
    
    // Signature Date - strictly dots for all parts if empty
    ngay_ky_d: data.ngay_ky ? dayjs(data.ngay_ky).format('DD') : '',
    ngay_ky_m: data.ngay_ky ? dayjs(data.ngay_ky).format('MM') : '',
    ngay_ky_y: data.ngay_ky ? dayjs(data.ngay_ky).format('YYYY') : '',
    
    // Meeting Dates - day and month ALWAYS dots, year falls back to current year if empty
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
    
    // Meeting voting / attendance
    tan_thanh_lcd: data.tong_so_uy_vien_lcd || 11,
    ti_le_lcd: 100,
    khong_tan_thanh_lcd: 0,
    
    tan_thanh_chi_doan: 3, // default Chi đoàn BCH votes
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

    // Đoàn Trường vote rate (always 100% by default)
    ti_le_doan_truong: 100,
    khong_tan_thanh_doan_truong: data.khong_tan_thanh_doan_truong || 0,
  };
};

// ============================================================
// CORE: Fetch, replace placeholders, and generate docx
// ============================================================
const mergeXMLWithDOM = (xmlString, data) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  
  // Find all <w:t> elements inside document.xml / headers / footers
  const textElements = Array.from(doc.getElementsByTagName('w:t'));
  
  for (const textElem of textElements) {
    let textContent = textElem.textContent || '';
    
    // Check if this element contains any placeholders like {{key}}
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    let match;
    
    while ((match = placeholderRegex.exec(textContent)) !== null) {
      const key = match[1];
      if (data[key] !== undefined) {
        const val = String(data[key] === null || data[key] === undefined ? '' : data[key]);
        
        if (val.includes('\n')) {
          const lines = val.split('\n');
          
          // Find the parent paragraph (<w:p>) that encapsulates this text node
          let paragraph = textElem;
          while (paragraph && paragraph.tagName !== 'w:p') {
            paragraph = paragraph.parentNode;
          }
          
          if (paragraph) {
            // Line 1: Replace placeholder directly in the existing <w:t> node
            // This preserves any prefix (e.g., "Ưu điểm: ") and keeps it on the same line
            textElem.textContent = textContent.replace(`{{${key}}}`, lines[0]);
            
            // Lines 2+: Clone the parent paragraph (<w:p>) to ensure ALL fonts (Times New Roman),
            // margin spacing, indentation, and alignment attributes are inherited exactly.
            let currentParagraph = paragraph;
            for (let i = 1; i < lines.length; i++) {
              const clonedParagraph = paragraph.cloneNode(true);
              
              // Clean up paragraph properties of the cloned paragraph to ensure normal, non-bold text
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
              
              // 4. Set the text content for the cloned paragraph
              const clonedTextElements = Array.from(clonedParagraph.getElementsByTagName('w:t'));
              // Tìm node chứa placeholder gốc (paragraph gốc vẫn còn {{key}} khi clone)
              const targetClonedText = clonedTextElements.find(t =>
                t.textContent.includes(`{{${key}}}`)
              ) || clonedTextElements.find(t => t.textContent.includes(lines[0]))
                || clonedTextElements[clonedTextElements.length - 1];
              
              if (targetClonedText) {
                // Thay thế placeholder hoặc nội dung dòng đầu bằng nội dung dòng i
                targetClonedText.textContent = targetClonedText.textContent
                  .replace(`{{${key}}}`, lines[i])
                  .replace(lines[0], lines[i]);
                
                // Clear all other text elements in the cloned paragraph to prevent prefix/suffix duplication
                for (const t of clonedTextElements) {
                  if (t !== targetClonedText) {
                    t.textContent = '';
                  }
                }
              }
              
              // Insert the cloned paragraph right after currentParagraph
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
        
        // Refresh textContent for the next matches in this element
        textContent = textElem.textContent || '';
        placeholderRegex.lastIndex = 0;
      }
    }
  }
  
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
};

const replaceTagsInDocx = async (defaultPath, rawData, docType) => {
  const data = prepareTemplateData(rawData);
  
  // 1. Xác định URL/path sẽ dùng — ưu tiên custom template từ Firebase nếu có
  let fetchUrl = defaultPath;
  if (docType) {
    try {
      const customUrl = await getTemplateUrl(docType);
      if (customUrl) fetchUrl = customUrl;
    } catch {
      // Nếu lỗi Firebase thì dùng file mặc định
    }
  }
  
  // 2. Fetch template as arraybuffer
  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`Không thể tải file biểu mẫu template tại: ${fetchUrl}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  
  // 3. Load zip file
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // 4. Process all XML files inside the zip using our DOM Merger
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
  
  // 5. Generate packed blob
  const outputBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  
  return outputBlob;
};

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

// ============================================================
// HELPER: Replace text inside a paragraph containing split runs
// ============================================================
const replaceTextInParagraph = (pNode, searchText, replaceText) => {
  const tNodes = Array.from(pNode.getElementsByTagName('w:t'));
  if (tNodes.length === 0) return false;
  
  let fullText = '';
  const nodeIndices = [];
  
  for (const node of tNodes) {
    const text = node.textContent || '';
    const start = fullText.length;
    fullText += text;
    const end = fullText.length;
    nodeIndices.push({ node, start, end });
  }
  
  let index = fullText.indexOf(searchText);
  let replaced = false;
  
  while (index !== -1) {
    replaced = true;
    const matchStart = index;
    const matchEnd = index + searchText.length;
    
    let firstNodeInfo = null;
    const nodesToClear = [];
    
    for (const info of nodeIndices) {
      const overlapStart = Math.max(info.start, matchStart);
      const overlapEnd = Math.min(info.end, matchEnd);
      
      if (overlapStart < overlapEnd) {
        if (!firstNodeInfo) {
          firstNodeInfo = info;
        } else {
          nodesToClear.push(info.node);
        }
      }
    }
    
    if (firstNodeInfo) {
      const node = firstNodeInfo.node;
      const originalText = node.textContent || '';
      const relativeStart = matchStart - firstNodeInfo.start;
      const relativeEnd = matchEnd - firstNodeInfo.start;
      
      const prefix = originalText.substring(0, relativeStart);
      const suffix = relativeEnd < originalText.length ? originalText.substring(relativeEnd) : '';
      
      node.textContent = prefix + replaceText + suffix;
      node.setAttribute('xml:space', 'preserve');
      
      for (const clearNode of nodesToClear) {
        clearNode.textContent = '';
      }
    }
    
    // Rebuild indexes for subsequent occurrences
    fullText = '';
    nodeIndices.length = 0;
    for (const node of tNodes) {
      const text = node.textContent || '';
      const start = fullText.length;
      fullText += text;
      const end = fullText.length;
      nodeIndices.push({ node, start, end });
    }
    
    index = fullText.indexOf(searchText);
  }
  
  return replaced;
};

// ============================================================
// CORE: Extract plain text paragraphs from DOCX
// ============================================================
const extractTextFromDocx = async (arrayBuffer) => {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const filename = "word/document.xml";
  if (!zip.file(filename)) return [];
  
  const content = await zip.file(filename).async("string");
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
  
  const lines = [];
  for (const p of paragraphs) {
    const tNodes = Array.from(p.getElementsByTagName('w:t'));
    const text = tNodes.map(t => t.textContent || '').join('');
    if (text.trim().length > 0) {
      lines.push(text.trim());
    }
  }
  
  return lines;
};

// ============================================================
// CORE: Inject placeholders into raw DOCX based on visual mapping
// ============================================================
const processTemplateAndInjectPlaceholders = async (arrayBuffer, mappings) => {
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // Lọc và sắp xếp các ánh xạ theo độ dài từ khóa giảm dần (tránh lỗi đè chữ ngắn lên chữ dài)
  const sortedMappings = Object.entries(mappings)
    .filter(([key, val]) => val && String(val).trim().length > 0)
    .map(([key, val]) => ({ key, val: String(val).trim() }))
    .sort((a, b) => b.val.length - a.val.length);
    
  if (sortedMappings.length === 0) {
    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  }
  
  const files = Object.keys(zip.files);
  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  
  for (const filename of files) {
    if (
      filename.endsWith(".xml") && 
      (filename === "word/document.xml" || filename.startsWith("word/header") || filename.startsWith("word/footer"))
    ) {
      let content = await zip.file(filename).async("string");
      const doc = parser.parseFromString(content, 'text/xml');
      const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
      
      let docModified = false;
      for (const p of paragraphs) {
        for (const mapping of sortedMappings) {
          const didReplace = replaceTextInParagraph(p, mapping.val, mapping.key);
          if (didReplace) {
            docModified = true;
          }
        }
      }
      
      if (docModified) {
        const newXmlStr = serializer.serializeToString(doc);
        zip.file(filename, newXmlStr);
      }
    }
  }
  
  const outputBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  
  return outputBlob;
};

// ============================================================
// SERVICE
// ============================================================
export const docGeneratorService = {
  prepareTemplateData,
  extractTextFromDocx,
  processTemplateAndInjectPlaceholders,
  
  
  async generateBanTuKiemDiem(data) {
    const blob = await replaceTagsInDocx('/1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx', data, 'ban_tu_kiem_diem');
    downloadBlob(blob, `1_Ban_Tu_Kiem_Diem_${data.mssv || 'DVDB'}.docx`);
  },
  
  async generateNghiQuyetDoanTruong(data) {
    const blob = await replaceTagsInDocx('/2. Nghị quyết Đoàn Trường (02 bản).docx', data, 'nghi_quyet_doan_truong');
    downloadBlob(blob, `2_Nghi_Quyet_Doan_Truong_${data.mssv || 'DVDB'}.docx`);
  },
  
  async generateNghiQuyetLCD(data) {
    const blob = await replaceTagsInDocx('/3. Nghị quyết LCĐ.docx', data, 'nghi_quyet_lcd');
    downloadBlob(blob, `3_Nghi_Quyet_LCD_${data.mssv || 'DVDB'}.docx`);
  },
  
  async generateBienBanLCD(data) {
    const blob = await replaceTagsInDocx('/3. Biên bản họp Liên chi Đoàn.docx', data, 'bien_ban_lcd');
    downloadBlob(blob, `4_Bien_Ban_LCD_${data.mssv || 'DVDB'}.docx`);
  },
  
  async generateNghiQuyetChiDoan(data) {
    const blob = await replaceTagsInDocx('/4. Nghị quyết Chi Đoàn.docx', data, 'nghi_quyet_chi_doan');
    downloadBlob(blob, `5_Nghi_Quyet_Chi_Doan_${data.mssv || 'DVDB'}.docx`);
  },
  
  async generateBienBanChiDoan(data) {
    const blob = await replaceTagsInDocx('/5. Biên bản họp Chi Đoàn.docx', data, 'bien_ban_chi_doan');
    downloadBlob(blob, `6_Bien_Ban_Chi_Doan_${data.mssv || 'DVDB'}.docx`);
  },
  
  async generateBienBanHopLop(data) {
    const blob = await replaceTagsInDocx('/6. Biên bản họp lớp.docx', data, 'bien_ban_hop_lop');
    downloadBlob(blob, `7_Bien_Ban_Hop_Lop_${data.mssv || 'DVDB'}.docx`);
  },
  
  async generateAllDocumentsZip(data) {
    const zip = new JSZip();
    
    const addFileToZip = async (defaultPath, zipFileName, docType) => {
      try {
        const blob = await replaceTagsInDocx(defaultPath, data, docType);
        zip.file(zipFileName, blob);
      } catch (e) {
        console.error(`Lỗi khi tạo file ${zipFileName}:`, e);
        throw e;
      }
    };
    
    await Promise.all([
      addFileToZip('/1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx', `1_Ban_Tu_Kiem_Diem_${data.mssv || 'DVDB'}.docx`, 'ban_tu_kiem_diem'),
      addFileToZip('/2. Nghị quyết Đoàn Trường (02 bản).docx', `2_Nghi_Quyet_Doan_Truong_${data.mssv || 'DVDB'}.docx`, 'nghi_quyet_doan_truong'),
      addFileToZip('/3. Nghị quyết LCĐ.docx', `3_Nghi_Quyet_LCD_${data.mssv || 'DVDB'}.docx`, 'nghi_quyet_lcd'),
      addFileToZip('/3. Biên bản họp Liên chi Đoàn.docx', `4_Bien_Ban_LCD_${data.mssv || 'DVDB'}.docx`, 'bien_ban_lcd'),
      addFileToZip('/4. Nghị quyết Chi Đoàn.docx', `5_Nghi_Quyet_Chi_Doan_${data.mssv || 'DVDB'}.docx`, 'nghi_quyet_chi_doan'),
      addFileToZip('/5. Biên bản họp Chi Đoàn.docx', `6_Bien_Ban_Chi_Doan_${data.mssv || 'DVDB'}.docx`, 'bien_ban_chi_doan'),
      addFileToZip('/6. Biên bản họp lớp.docx', `7_Bien_Ban_Hop_Lop_${data.mssv || 'DVDB'}.docx`, 'bien_ban_hop_lop')
    ]);
    
    const content = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/zip'
    });
    downloadBlob(content, `Ho_So_Dang_Vien_Chinh_Thuc_${data.ho_ten || 'DVDB'}_${data.mssv || ''}.zip`);
  }
};
