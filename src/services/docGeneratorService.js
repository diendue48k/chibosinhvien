import JSZip from 'jszip';
import dayjs from 'dayjs';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { getTemplateUrl } from './templateStorageService';

// ============================================================
// HELPER: Safe date parser — handles Firestore Timestamps, dayjs objects, Date objects, and strings
// ============================================================
const safeParse = (val) => {
  if (!val) return null;
  try {
    // dayjs object
    if (dayjs.isDayjs(val)) return val.isValid() ? val : null;
    // Firestore Timestamp (has .seconds)
    if (typeof val === 'object' && val.seconds !== undefined) {
      return dayjs(new Date(val.seconds * 1000));
    }
    // Firestore Timestamp (has .toDate())
    if (typeof val === 'object' && typeof val.toDate === 'function') {
      return dayjs(val.toDate());
    }
    // Native Date object
    if (val instanceof Date) return dayjs(val);
    // String
    const d = dayjs(val);
    return d.isValid() ? d : null;
  } catch {
    return null;
  }
};

const formatVietnameseDate = (dStr) => {
  const dObj = safeParse(dStr);
  if (!dObj) return '      tháng      năm ......';
  return `${dObj.format('D')} tháng ${dObj.format('M')} năm ${dObj.format('YYYY')}`;
};

// ============================================================
// HELPER: Prepare Template Data
// ============================================================
const prepareTemplateData = (data, docType) => {
  // Safe helper to extract parts of critical dates (like birthday, party admission)
  const getD = (dStr) => { const d = safeParse(dStr); return d ? d.format('DD') : ''; };
  const getM = (dStr) => { const d = safeParse(dStr); return d ? d.format('MM') : ''; };
  const getY = (dStr, fallbackToCurrentYear = false) => {
    const d = safeParse(dStr);
    if (d) return d.format('YYYY');
    return fallbackToCurrentYear ? dayjs().format('YYYY') : '';
  };

  const formatFullDate = (dStr) => {
    const dObj = safeParse(dStr);
    if (!dObj) return 'ngày        tháng        năm         ';
    return `ngày ${dObj.format('D')} tháng ${dObj.format('M')} năm ${dObj.format('YYYY')}`;
  };

  const isTransfer = docType && docType.startsWith('transfer_');
  const ngayVaoDangFormatted = isTransfer
    ? (safeParse(data.ngay_vao_dang) ? safeParse(data.ngay_vao_dang).format('DD/MM/YYYY') : '....................')
    : formatFullDate(data.ngay_vao_dang);

  const baseData = {
    ...data,
    khoa_caps: (data.khoa || '').toUpperCase(),
    dang_uy_truong: 'Trường Đại học Kinh tế',
    tinh_tp: data.tinh_tp || 'Đà Nẵng',
    chi_bo_sinh_hoat: data.chi_bo_sinh_hoat || 'Sinh viên',

    
    // Critical personal dates - strictly populated or shown as dots
    ngay_sinh_d: getD(data.ngay_sinh),
    ngay_sinh_m: getM(data.ngay_sinh),
    ngay_sinh_y: getY(data.ngay_sinh, false),
    
    ngay_vao_dang_d: getD(data.ngay_vao_dang),
    ngay_vao_dang_m: getM(data.ngay_vao_dang),
    ngay_vao_dang_y: getY(data.ngay_vao_dang, false),
    ngay_vao_dang_formatted: ngayVaoDangFormatted,
    
    // Signature Date - strictly dots for all parts if empty
    ngay_ky_d: safeParse(data.ngay_ky) ? safeParse(data.ngay_ky).format('DD') : '',
    ngay_ky_m: safeParse(data.ngay_ky) ? safeParse(data.ngay_ky).format('MM') : '',
    ngay_ky_y: docType === 'nhan_xet_dang_vien_giup_do_mau11' && getY(data.ngay_vao_dang, false)
      ? String(Number(getY(data.ngay_vao_dang, false)) + 1)
      : (safeParse(data.ngay_ky) ? safeParse(data.ngay_ky).format('YYYY') : ''),
    
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
    
    ti_le_bb_chi_doan: 100,
      
    ti_le_bb_lop: 100,

    // Chi bộ voting results (Mẫu 13)
    tan_thanh_chi_bo: data.tong_so_dv_chinh_thuc ? Number(data.tong_so_dv_chinh_thuc) : 0,
    khong_tan_thanh_chi_bo: 0,
    ti_le_chi_bo: 100,

    // Đoàn Trường vote rate (always 100% by default)
    ti_le_doan_truong: 100,
    khong_tan_thanh_doan_truong: 0,

    // Transfer fields
    ngay_sinh_formatted: safeParse(data.ngay_sinh) ? safeParse(data.ngay_sinh).format('DD/MM/YYYY') : '....................',
    ngay_chinh_thuc_formatted: (data.dang_vien_du_bi === true || data.loai_dang_vien === 'Dự bị' || data.loai_dang_vien === 'dubi')
      ? '....................'
      : (safeParse(data.ngay_chinh_thuc || data.ngay_cong_nhan_dvct || data.ngaychinhthuc) ? safeParse(data.ngay_chinh_thuc || data.ngay_cong_nhan_dvct || data.ngaychinhthuc).format('DD/MM/YYYY') : '....................'),
    ngay_ky_quyet_dinh_dvct_formatted: safeParse(data.ngay_ky_quyet_dinh_dvct || data.ngayqd_chinh_thuc || data.ngay_ky_qd_chinh_thuc)
      ? safeParse(data.ngay_ky_quyet_dinh_dvct || data.ngayqd_chinh_thuc || data.ngay_ky_qd_chinh_thuc).format('DD/MM/YYYY')
      : '....................',
    nam_sinh: safeParse(data.ngay_sinh) ? safeParse(data.ngay_sinh).format('YYYY') : '........',
    ngay_vao_dang_formatted_vietnamese: formatVietnameseDate(data.ngay_vao_dang),
    ngay_chinh_thuc_formatted_vietnamese: formatVietnameseDate(data.ngay_chinh_thuc),
    
    // Guider details
    dvhd: data.dvhd || '',
    dvhd_ngay_sinh_formatted: safeParse(data.dvhd_ngay_sinh) ? safeParse(data.dvhd_ngay_sinh).format('DD/MM/YYYY') : '....................',
    dvhd_ngay_vao_dang: safeParse(data.dvhd_ngay_vao_dang) ? safeParse(data.dvhd_ngay_vao_dang).format('DD/MM/YYYY') : '....................',
    dvhd_ngay_chinh_thuc: safeParse(data.dvhd_ngay_chinh_thuc) ? safeParse(data.dvhd_ngay_chinh_thuc).format('DD/MM/YYYY') : '....................',
    ngay_phan_cong: formatVietnameseDate(data.ngay_phan_cong),

    // Chi bộ templates specific mapping additions
    dang_uy_truong_caps: (data.dang_uy_truong || 'Trường Đại học Kinh tế').toUpperCase(),
    chi_bo_sinh_hoat_caps: (data.chi_bo_sinh_hoat || 'Sinh viên').toUpperCase(),
    khong_tan_thanh_ctxh: 0,
    
    ngay_phan_cong_d: getD(data.ngay_phan_cong),
    ngay_phan_cong_m: getM(data.ngay_phan_cong),
    ngay_phan_cong_y: getY(data.ngay_phan_cong, false),
    
    ngay_hop_chi_bo_d: getD(data.ngay_hop_chi_bo || data.ngay_hop),
    ngay_hop_chi_bo_m: getM(data.ngay_hop_chi_bo || data.ngay_hop),
    ngay_hop_chi_bo_y: getY(data.ngay_hop_chi_bo || data.ngay_hop, true),
    
    vang_chi_bo: data.vang_chi_bo !== undefined && data.vang_chi_bo !== null && data.vang_chi_bo !== '' ? Number(data.vang_chi_bo) : 0,
    vang_chinh_thuc_chi_bo: data.vang_chinh_thuc_chi_bo !== undefined && data.vang_chinh_thuc_chi_bo !== null && data.vang_chinh_thuc_chi_bo !== '' ? Number(data.vang_chinh_thuc_chi_bo) : 0,
    vang_du_bi_chi_bo: data.vang_du_bi_chi_bo !== undefined && data.vang_du_bi_chi_bo !== null && data.vang_du_bi_chi_bo !== '' ? Number(data.vang_du_bi_chi_bo) : 0,
    ti_le_khong_tan_thanh_chi_bo: data.tong_so_dv_chinh_thuc && data.khong_tan_thanh_chi_bo !== undefined && data.khong_tan_thanh_chi_bo !== null && data.khong_tan_thanh_chi_bo !== ''
      ? Math.round((Number(data.khong_tan_thanh_chi_bo) / Number(data.tong_so_dv_chinh_thuc)) * 100)
      : 0,
  };

  // Add user-friendly Vietnamese keys for custom template editors
  const vietnameseFriendlyKeys = {
    'Họ và tên Đảng viên': data.ho_ten,
    'Họ và tên': data.ho_ten,
    'Họ và tên Đảng viên dự bị': data.ho_ten,
    'Năm sinh': baseData.nam_sinh,
    'Sinh ngày': baseData.ngay_sinh_formatted,
    'Ngày tháng năm sinh của Đảng viên': baseData.ngay_sinh_formatted,
    'Ngày vào Đảng': baseData.ngay_vao_dang_formatted,
    'Ngày vào Đảng của Đảng viên': baseData.ngay_vao_dang_formatted,
    'Ngày kết nạp của Đảng viên dự bị': baseData.ngay_vao_dang_formatted,
    'ngày kết nạp của Đảng viên dự bị': baseData.ngay_vao_dang_d,
    'tháng kết nạp của Đảng viên dự bị': baseData.ngay_vao_dang_m,
    'năm kết nạp của Đảng viên dự bị': baseData.ngay_vao_dang_y,
    'Ngày chính thức nếu có': baseData.ngay_chinh_thuc_formatted,
    'Ngày chính thức': baseData.ngay_chinh_thuc_formatted,
    'Ngày chính thức của Đảng viên nếu có': baseData.ngay_chinh_thuc_formatted,
    'Số quyết định chính thức': data.so_quyet_dinh_dvct || data.soqd_chinh_thuc || data.so_qd_chinh_thuc || '',
    'Ngày ký quyết định chính thức': baseData.ngay_ky_quyet_dinh_dvct_formatted,
    'Nhiệm vụ Đảng được giao': data.nhiem_vu_dang,
    'Giới tính': data.gioi_tinh,
    'Giới tính của Đảng viên': data.gioi_tinh,
    'Quê quán': data.que_quan,
    'Nơi ở hiện nay': data.dia_chi,
    'Số thẻ Đảng': data.so_the_dang,
    'Số điện thoại': data.so_dien_thoai,
    'Khoa': data.khoa,
    'Chi Đoàn': data.lop,
    'Lớp': data.lop,
    'Nơi chuyển đến': data.noi_chuyen_den,
    'Ưu điểm': data.uu_diem,
    'Khuyết điểm': data.khuyet_diem,
    
    // ĐVHD specific
    'tên đảng viên hướng dẫn': data.dvhd || '',
    'ngày sinh đảng viên hướng dẫn': safeParse(data.dvhd_ngay_sinh) ? safeParse(data.dvhd_ngay_sinh).format('DD') : '..',
    'tháng sinh đảng viên hướng dẫn': safeParse(data.dvhd_ngay_sinh) ? safeParse(data.dvhd_ngay_sinh).format('MM') : '..',
    'năm sinh đảng viên hướng dẫn': safeParse(data.dvhd_ngay_sinh) ? safeParse(data.dvhd_ngay_sinh).format('YYYY') : '....',
    'ngày vào Đảng của đảng viên hướng dẫn': baseData.dvhd_ngay_vao_dang,
    'ngày chính thức của đảng viên hướng dẫn': baseData.dvhd_ngay_chinh_thuc,
    'ngày kết nạp của Đảng viên dự bị ': baseData.ngay_vao_dang_d,
    'tháng kết nạp của Đảng viên dự bị ': baseData.ngay_vao_dang_m,
    'năm kết nạp của Đảng viên dự bị ': baseData.ngay_vao_dang_y,
  };

  // Convert keys to case-insensitive support
  const caseInsensitiveKeys = {};
  for (const [k, v] of Object.entries(vietnameseFriendlyKeys)) {
    caseInsensitiveKeys[k] = v;
    caseInsensitiveKeys[k.toLowerCase()] = v;
  }

  return { ...baseData, ...caseInsensitiveKeys };
};

// ============================================================
// HELPER: Replace text after a label (DOM String Matching like 213)
// ============================================================
function getElementsByLocalName(element, localName) {
  const results = [];
  const traverse = (node) => {
    if (node.nodeType === 1) { // Node.ELEMENT_NODE
      const name = node.nodeName.toLowerCase();
      if (name === localName || name.endsWith(':' + localName)) {
        results.push(node);
      }
    }
    for (let i = 0; i < node.childNodes.length; i++) {
      traverse(node.childNodes[i]);
    }
  };
  traverse(element);
  return results;
}

function replaceParagraphValue(p, label, newValue, customReplaceMode = false) {
  const tElements = getElementsByLocalName(p, 't');
  if (tElements.length === 0) return;

  if (customReplaceMode) {
    // For custom replace mode, replace exact string in the paragraph
    for (let i = 0; i < tElements.length; i++) {
      if (tElements[i].textContent.includes(label)) {
        tElements[i].textContent = newValue;
        for (let j = i + 1; j < tElements.length; j++) {
          tElements[j].textContent = '';
        }
        break;
      }
    }
    return;
  }

  let colonIdx = -1;
  let labelIdx = -1;
  
  // Attempt to find where the label occurs
  const pText = tElements.map(t => t.textContent).join('');
  if (!pText.includes(label)) return; // Label not found in this paragraph

  for (let i = 0; i < tElements.length; i++) {
    if (tElements[i].textContent.includes(':')) {
      colonIdx = i;
      break;
    }
  }

  // If colon exists, we replace everything after it
  if (colonIdx !== -1) {
    const text = tElements[colonIdx].textContent;
    const firstColonPos = text.indexOf(':');
    const beforeColon = text.substring(0, firstColonPos);
    const afterColon = text.substring(firstColonPos + 1).trim();
    
    if (afterColon.length > 0) {
      tElements[colonIdx].textContent = beforeColon + ': ' + (newValue || '....................');
      for (let i = colonIdx + 1; i < tElements.length; i++) {
        tElements[i].textContent = '';
      }
    } else {
      if (colonIdx + 1 < tElements.length) {
        tElements[colonIdx + 1].textContent = ' ' + (newValue || '....................');
        for (let i = colonIdx + 2; i < tElements.length; i++) {
          tElements[i].textContent = '';
        }
      } else {
        tElements[colonIdx].textContent = beforeColon + ': ' + (newValue || '....................');
      }
    }
  } else {
    // No colon, but label exists. E.g. "về Chi bộ trực thuộc thôn Đức Xá..."
    // We just replace the whole text after the label in a smart way.
    for (let i = 0; i < tElements.length; i++) {
      if (tElements[i].textContent.includes(label)) {
        const text = tElements[i].textContent;
        const idx = text.indexOf(label);
        tElements[i].textContent = text.substring(0, idx + label.length) + " " + (newValue || '....................');
        for (let j = i + 1; j < tElements.length; j++) {
          tElements[j].textContent = '';
        }
        break;
      }
    }
  }
}

// ============================================================
// CORE: Fetch, replace placeholders, and generate docx
// ============================================================
const mergeXMLWithDOM = (xmlString, data, docType) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  
  // Step 1: Pre-process paragraphs to de-split placeholders (e.g. {{key}})
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
  for (const paragraph of paragraphs) {
    const tNodes = Array.from(paragraph.getElementsByTagName('w:t'));
    const fullText = tNodes.map(t => t.textContent || '').join('');
    const placeholderRegex = /\{\{\s*([^}]+?)\s*\}\}/g;
    let match;
    const matches = [];
    while ((match = placeholderRegex.exec(fullText)) !== null) {
      matches.push(match[0]);
    }
    for (const placeholder of matches) {
      replaceTextInParagraph(paragraph, placeholder, placeholder);
    }
  }
  
  // Step 2: Handle {{key}} placeholders replacements
  const textElements = Array.from(doc.getElementsByTagName('w:t'));
  
  for (const textElem of textElements) {
    let textContent = textElem.textContent || '';
    
    // Check if this element contains any placeholders like {{key}}
    const placeholderRegex = /\{\{\s*([^}]+?)\s*\}\}/g;
    let match;
    
    while ((match = placeholderRegex.exec(textContent)) !== null) {
      const fullMatch = match[0]; // e.g. {{ ho_ten }}
      const key = match[1].trim();       // e.g. ho_ten
      let val = data[key];

      // If exact key doesn't exist, try lowercase version
      if (val === undefined) {
        val = data[key.toLowerCase()];
      }
      
      // Use empty string if value is null or undefined to clear placeholder
      val = (val === null || val === undefined) ? '' : String(val);
        
        if (val.includes('\n')) {
          const lines = val.split('\n');
          const parentNode = textElem.parentNode;
          const textParts = textContent.split(fullMatch);
          
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
        } else {
          // Simple single-line replacement
          textElem.textContent = textContent.replace(fullMatch, val);
        }
        
        // Refresh textContent for the next matches in this element (if multiple placeholders in one node)
        textContent = textElem.textContent || '';
        placeholderRegex.lastIndex = 0;
    }
  }

  // Step 2b: Handle «key» / <<key>> (merge field) placeholders replacements & MERGEFIELD instruction stripping
  const textElements2 = Array.from(doc.getElementsByTagName('w:t'));
  for (const textElem of textElements2) {
    let textContent = textElem.textContent || '';
    const chevronRegex = /[«<<]\s*([^»>]+?)\s*[»>>]/g;
    let match;
    while ((match = chevronRegex.exec(textContent)) !== null) {
      const fullMatch = match[0];
      const key = match[1].trim();
      let val = data[key];
      if (val === undefined) {
        val = data[key.toLowerCase()];
      }
      // Fallbacks for standard fields
      if (val === undefined) {
        if (key === 'Họ_tên' || key === 'ho_ten') val = data.ho_ten;
        else if (key === 'Ngày_sinh' || key === 'ngay_sinh') val = data.ngay_sinh_formatted || data.ngay_sinh;
        else if (key === 'Lớp' || key === 'lop') val = data.lop;
        else if (key === 'Khoa' || key === 'khoa') val = data.khoa;
        else if (key === 'Ngày_vào_Đảng' || key === 'ngay_vao_dang' || key === 'Ngày_vao_Đảng') {
          const dObj = safeParse(data.ngay_vao_dang);
          val = dObj ? `${dObj.format('D')} tháng ${dObj.format('M')} năm ${dObj.format('YYYY')}` : '....................';
        }
      }
      val = (val === null || val === undefined) ? '' : String(val);
      textElem.textContent = textContent.replace(fullMatch, val);
      textContent = textElem.textContent || '';
      chevronRegex.lastIndex = 0;
    }
  }

  const instrs = Array.from(doc.getElementsByTagName('w:instrText'));
  for (const instr of instrs) {
    if (instr.textContent.includes('MERGEFIELD')) {
      instr.textContent = '';
    }
  }


  // Step 3: Handle hardcoded DOM templates for Transfer documents (Mẫu 1, 2, 3, 5) and Mẫu 11, 12, 13
  if (docType && (docType.startsWith('transfer_') || docType.includes('mau11') || docType.includes('mau12') || docType.includes('mau13') || docType.includes('chi_bo'))) {
    const allParagraphs = getElementsByLocalName(doc, 'p');
    
    // Mapping of exact strings from the template to dynamic data
    const mappings = [];

    if (docType === 'transfer_nhan_xet_dvhd') {
      // Specific mappings for Mẫu 5 (Bản nhận xét ĐVHD)
      mappings.push(
        { find: 'Lê Vĩnh Diện', replace: data.dvhd || '' },
        { find: '01/04/2004', replace: data.dvhd_ngay_sinh_formatted || '....................' },
        { find: '26/07/2022', replace: data.dvhd_ngay_vao_dang || '....................' },
        { find: '26/07/2023', replace: data.dvhd_ngay_chinh_thuc || '....................' },
        { find: '26 tháng 07 năm 2026', replace: data.ngay_phan_cong },
        { find: 'Nguyễn Văn A', replace: data.ho_ten },
        { find: 'Đà Nẵng, ngày       tháng         năm 2026', replace: `Đà Nẵng, ngày       tháng         năm ${dayjs().format('YYYY')}` }
      );
    } else if (docType === 'transfer_nghi_quyet_chi_bo_mau8') {
      mappings.push(
        { find: 'ngày    tháng    năm 2026', replace: `ngày    tháng    năm ${dayjs().format('YYYY')}` },
        { find: 'Nguyễn Hữu Ái Quốc', replace: data.ho_ten },
        { find: 'ngày 30 tháng 5 năm 2026', replace: safeParse(data.ngay_vao_dang) ? 'ngày ' + data.ngay_vao_dang_formatted_vietnamese : 'ngày      tháng      năm ......' },
        { find: '378', replace: String(data.tong_so_dv || '') },
        { find: '234', replace: String(data.tong_so_dv_chinh_thuc || '') },
        { find: '144', replace: String(data.tong_so_dv_du_bi || '') },
        { find: 'Bùi Trung Hiệp', replace: data.chu_tri_chi_bo || '....................' },
        { find: 'Bí thư Chi bộ', replace: data.chuc_vu_chu_tri_chi_bo || '....................' },
        { find: 'Lê Vĩnh Diện', replace: data.thu_ky_chi_bo || '....................' }
      );
    } else if (docType === 'nghi_quyet_chi_bo_mau13') {
      mappings.push(
        { find: 'ngày    tháng    năm 2026', replace: `ngày    tháng    năm ${dayjs().format('YYYY')}` },
        { find: 'Nguyễn Hữu Ái Quốc', replace: data.ho_ten },
        { find: 'ngày 30 tháng 5 năm 2026', replace: safeParse(data.ngay_vao_dang) ? 'ngày ' + data.ngay_vao_dang_formatted_vietnamese : 'ngày      tháng      năm ......' },
        { find: '378', replace: String(data.tong_so_dv || '') },
        { find: '234', replace: String(data.tong_so_dv_chinh_thuc || '') },
        { find: '144', replace: String(data.tong_so_dv_du_bi || '') },
        { find: 'Bùi Trung Hiệp', replace: data.chu_tri_chi_bo || '....................' },
        { find: 'Bí thư Chi bộ', replace: data.chuc_vu_chu_tri_chi_bo || '....................' },
        { find: 'Lê Vĩnh Diện', replace: data.thu_ky_chi_bo || '....................' },
        { find: '234 đ/c (đạt 100%)', replace: `${data.tan_thanh_chi_bo} đ/c (đạt ${data.ti_le_chi_bo}%)` },
        { find: '234 đ/c (đạt 100% )', replace: `${data.tan_thanh_chi_bo} đ/c (đạt ${data.ti_le_chi_bo}%)` },
        { find: 'Số không tán thành: 0 đ/c', replace: `Số không tán thành: ${data.khong_tan_thanh_chi_bo} đ/c` },
        { find: 'Số không tán thành: 0đ/c', replace: `Số không tán thành: ${data.khong_tan_thanh_chi_bo} đ/c` }
      );
    } else if (docType === 'tong_hop_nhan_xet_mau12') {
      mappings.push(
        { find: 'ngày    tháng    năm 2026', replace: `ngày    tháng    năm ${dayjs().format('YYYY')}` },
        { find: 'Nguyễn Hữu Ái Quốc', replace: data.ho_ten },
        { find: 'ngày 30 tháng 5 năm 2025', replace: safeParse(data.ngay_vao_dang) ? 'ngày ' + data.ngay_vao_dang_formatted_vietnamese : 'ngày      tháng      năm ......' },
        { find: 'Quản trị kinh doanh', replace: data.khoa || '....................' },
        { find: '51K25.2', replace: data.lop || '....................' },
        { find: '43-44-45 An Thượng', replace: data.chi_uy_noi_cu_tru || '....................' },
        { find: '{chi_uy_noi_cu_tru}}', replace: data.chi_uy_noi_cu_tru || '....................' }
      );
    } else if (docType === 'nhan_xet_dang_vien_giup_do_mau11') {
      const ngayVaoDangY = data.ngay_vao_dang_y;
      const namKyMau11 = ngayVaoDangY ? String(Number(ngayVaoDangY) + 1) : '2026';
      mappings.push(
        { find: 'Lê Vĩnh Diện', replace: data.dvhd || '....................' },
        { find: '01/04/2004', replace: data.dvhd_ngay_sinh_formatted || '....................' },
        { find: 'vào Đảng ngày 26/07/2022', replace: `vào Đảng ngày ${data.dvhd_ngay_vao_dang || '....................'}` },
        { find: 'Chính thức ngày 26/07/2022', replace: `Chính thức ngày ${data.dvhd_ngay_chinh_thuc || '....................'}` },
        { find: 'Ngày vào Đảng: 26/07/2022', replace: `Ngày vào Đảng: ${data.dvhd_ngay_vao_dang || '....................'}` },
        { find: 'Ngày chính thức: 26/07/2022', replace: `Ngày chính thức: ${data.dvhd_ngay_chinh_thuc || '....................'}` },
        { find: '26/07/2022', replace: data.dvhd_ngay_vao_dang || '....................' },
        { find: 'ngày 30 tháng 5 năm 2025', replace: safeParse(data.ngay_vao_dang) ? 'ngày ' + data.ngay_vao_dang_formatted_vietnamese : 'ngày      tháng      năm ......' },
        { find: 'Nguyễn Hữu Ái Quốc', replace: data.ho_ten || '....................' },
        { find: 'năm 2026', replace: `năm ${namKyMau11}` },
        { find: '2026', replace: namKyMau11 }
      );
    } else {
      // Standard mappings for Mẫu 1, 2, 3, 4
      mappings.push(
        // Name & Personal details
        { find: 'Lê Vĩnh Diện', replace: data.ho_ten },
        { find: '01/04/2004', replace: data.ngay_sinh_formatted },
        { find: 'Xã Vĩnh Thủy, tỉnh Quảng Trị', replace: data.que_quan },
        { find: 'Thôn Đức Xá, Xã Vĩnh Thủy, tỉnh Quảng Trị', replace: data.dia_chi },
        { find: '0969754149', replace: data.so_dien_thoai },
        { find: '2004', replace: data.nam_sinh },
        { find: 'Nam', replace: data.gioi_tinh || 'Nam' },

        // Dates and Cards
        { find: '26/07/2022', replace: data.ngay_vao_dang_formatted },
        { find: '26/07/2023', replace: data.ngay_chinh_thuc_formatted || '....................' },
        { find: '045204008389', replace: data.so_the_dang || '....................' },
        
        // Duties
        { find: 'Đảng viên, Phó bí thư Chi bộ Sinh viên', replace: data.nhiem_vu_dang || 'Đảng viên' },
        
        // Reasons
        { find: 'Tôi đã hoàn thành chương trình học và đã tốt nghiệp ra trường. Cần chuyển đến tổ chức Đảng mới để tiếp tục hoàn thành nhiệm vụ Đảng viên.', replace: data.ly_do_chuyen || 'Tôi đã hoàn thành chương trình học và đã tốt nghiệp ra trường. Cần chuyển đến tổ chức Đảng mới để tiếp tục hoàn thành nhiệm vụ Đảng viên.' },
        { find: 'Tôi hiện đang đi thực tập ở quê nên cần phải chuyển sinh hoạt tạm thời về quê để đảm bảo sinh hoạt Đảng đầy đủ, đúng quy định.', replace: data.ly_do_chuyen || 'Tôi hiện đang đi thực tập ở quê nên cần phải chuyển sinh hoạt tạm thời về quê để đảm bảo sinh hoạt Đảng đầy đủ, đúng quy định.' },
        
        // Dynamic mapping for Destination parts from Mẫu 1 & 2
        { find: 'thôn Đức Xá thuộc Đảng bộ cơ sở xã Vĩnh Thủy, Đảng bộ cấp trên cơ sở tỉnh Quảng Trị', replace: (() => {
            const parts = (data.noi_chuyen_den || '').split(',');
            return `Chi bộ trực thuộc ${parts[0] ? parts[0].trim() : '....................'}, Đảng bộ cơ sở ${parts[1] ? parts[1].trim() : '....................'}, Đảng bộ cấp trên cơ sở ${parts.length > 2 ? parts.slice(2).join(', ').trim() : '....................'}`;
        })() },
        { find: 'Chi bộ trực thuộc thôn Đức Xá, Đảng bộ cơ sở xã Vĩnh Thủy, Đảng bộ cấp trên cơ sở tỉnh Quảng Trị', replace: (() => {
            const parts = (data.noi_chuyen_den || '').split(',');
            return `Chi bộ trực thuộc ${parts[0] ? parts[0].trim() : '....................'}, Đảng bộ cơ sở ${parts[1] ? parts[1].trim() : '....................'}, Đảng bộ cấp trên cơ sở ${parts.length > 2 ? parts.slice(2).join(', ').trim() : '....................'}`;
        })() },
        { find: 'thôn Đức Xá', replace: (() => {
            const parts = (data.noi_chuyen_den || '').split(',');
            return parts[0] ? parts[0].trim() : '....................';
        })() },
        { find: 'xã Vĩnh Thủy', replace: (() => {
            const parts = (data.noi_chuyen_den || '').split(',');
            return parts[1] ? parts[1].trim() : '....................';
        })() },
        { find: 'tỉnh Quảng Trị', replace: (() => {
            const parts = (data.noi_chuyen_den || '').split(',');
            if (parts.length > 2) {
               return parts.slice(2).map(p => p.trim()).join(', ');
            }
            return '....................';
        })() }
      );
    }

    // Generic shared mappings added for both modes if they exist in templates
    mappings.push(
      { find: 'Nguyễn Văn An', replace: data.ho_ten },
      { find: '16/5/2004', replace: data.ngay_sinh_formatted },
      { find: '48K27', replace: data.lop },
      { find: 'Lý luận chính trị', replace: data.khoa },
      { find: 'ngày 26 tháng 05 năm 2026', replace: safeParse(data.ngay_vao_dang) ? 'ngày ' + data.ngay_vao_dang_formatted_vietnamese : 'ngày      tháng      năm ......' },
      { find: '26 tháng 05 năm 2026', replace: data.ngay_vao_dang_formatted_vietnamese },
      { find: '26 tháng 5 năm 2026', replace: data.ngay_vao_dang_formatted_vietnamese },
      { find: 'Đà Nẵng, ngày     tháng      năm 2026', replace: `Đà Nẵng, ngày     tháng      năm ${dayjs().format('YYYY')}` },
      { find: 'Nguyễn Văn A', replace: data.ho_ten },
      { find: '26 tháng 07 năm 2026', replace: data.ngay_phan_cong },
      
      // Explicit mappings for Mẫu 1 curly brace placeholders as fallback replacement
      { find: '{{Họ và tên Đảng viên}}', replace: data.ho_ten },
      { find: '{{Giới tính của Đảng viên}}', replace: data.gioi_tinh || 'Nam' },
      { find: '{{Ngày tháng năm sinh của Đảng viên}}', replace: data.ngay_sinh_formatted },
      { find: '{{Quê quán của Đảng viên}}', replace: data.que_quan },
      { find: '{{Nơi ở hiện nay của Đảng viên}}', replace: data.dia_chi },
      { find: '{{Ngày vào Đảng của Đảng viên}}', replace: data.ngay_vao_dang_formatted },
      { find: '{{Ngày chính thức của Đảng viên nếu có}}', replace: data.ngay_chinh_thuc_formatted || '....................' },
      { find: '{{Số thẻ Đảng của Đảng viên nếu có}}', replace: data.so_the_dang || '....................' },
      { find: '{{Số điện thọai của Đảng viên}}', replace: data.so_dien_thoai },
      { find: '{{Nhiệm vụ Đảng được giao}}', replace: data.nhiem_vu_dang || 'Đảng viên' },
      
      // Explicit mappings for Mẫu 4
      { find: '{{Ngày vào Đảng}}', replace: data.ngay_vao_dang_formatted },
      { find: '{{Ngày chính thức nếu có}}', replace: data.ngay_chinh_thuc_formatted || '....................' }
    );

    // Sort by longest 'find' first to avoid partial string replacements
    mappings.sort((a, b) => b.find.length - a.find.length);

    for (const p of allParagraphs) {
      for (const m of mappings) {
        if (m.replace !== undefined && m.replace !== null) {
          replaceTextInParagraph(p, m.find, m.replace);
        }
      }
    }
  }
  
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
};

const replaceTagsInDocx = async (defaultPath, rawData, docType) => {
  const data = prepareTemplateData(rawData, docType);
  
  // 1. Xác định URL/path sẽ dùng — ưu tiên custom template từ Firebase nếu có
  let fetchUrl = defaultPath;
  if (docType && docType !== 'tong_hop_nhan_xet_mau12') {
    try {
      const customUrl = await getTemplateUrl(docType);
      if (customUrl) fetchUrl = customUrl;
    } catch {
      // Nếu lỗi Firebase thì dùng file mặc định
    }
  }
  
  // 2. Fetch template as arraybuffer (Add cache busting to ensure we get the latest uploaded file)
  const bustCacheUrl = fetchUrl.includes('?') ? `${fetchUrl}&t=${new Date().getTime()}` : `${fetchUrl}?t=${new Date().getTime()}`;
  const response = await fetch(bustCacheUrl);
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
      content = mergeXMLWithDOM(content, data, docType);
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
function replaceTextInParagraph(pNode, searchText, replaceText) {
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
  
  let searchStartIndex = 0;
  let index = fullText.indexOf(searchText, searchStartIndex);
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
      
      // Preserve formatting by merging rPr (run properties) from cleared nodes
      const doc = node.ownerDocument;
      const firstRun = node.parentNode;
      if (doc && firstRun) {
        const runs = [firstRun];
        for (const clearNode of nodesToClear) {
          if (clearNode.parentNode && !runs.includes(clearNode.parentNode)) {
            runs.push(clearNode.parentNode);
          }
        }
        
        let bestRPr = null;
        for (const r of runs) {
          const rPrs = r.getElementsByTagName('w:rPr');
          if (rPrs.length > 0) {
            const rPr = rPrs[0];
            const hasSz = rPr.getElementsByTagName('w:sz').length > 0;
            const hasFonts = rPr.getElementsByTagName('w:rFonts').length > 0;
            if (hasSz || hasFonts) {
              bestRPr = rPr;
              break;
            }
            if (!bestRPr && rPr.childNodes.length > 0) {
              bestRPr = rPr;
            }
          }
        }
        
        if (bestRPr) {
          let firstRPrs = firstRun.getElementsByTagName('w:rPr');
          let firstRPr;
          if (firstRPrs.length === 0) {
            firstRPr = doc.createElement('w:rPr');
            firstRun.insertBefore(firstRPr, firstRun.firstChild);
          } else {
            firstRPr = firstRPrs[0];
          }
          
          if (bestRPr !== firstRPr) {
            const children = Array.from(bestRPr.childNodes);
            for (const child of children) {
              if (child.nodeType === 1) {
                const tagName = child.nodeName;
                const existing = firstRPr.getElementsByTagName(tagName);
                if (existing.length === 0) {
                  firstRPr.appendChild(child.cloneNode(true));
                }
              }
            }
          }
        }
      }
      
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
    
    searchStartIndex = index + replaceText.length;
    index = fullText.indexOf(searchText, searchStartIndex);
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
    .filter(([, val]) => val && String(val).trim().length > 0)
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
  
  async generateNhanXetDangVienGiupDoMau11(data) {
    const blob = await replaceTagsInDocx('/2. Mau 11_KND_nhan xet dang vien giup do_DHKT_2025.docx', data, 'nhan_xet_dang_vien_giup_do_mau11');
    downloadBlob(blob, `10_Nhan_Xet_Dang_Vien_Giup_Do_${data.mssv || 'DVDB'}.docx`);
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
      addFileToZip('/6. Biên bản họp lớp.docx', `7_Bien_Ban_Hop_Lop_${data.mssv || 'DVDB'}.docx`, 'bien_ban_hop_lop'),
      addFileToZip('/2. Mau 11_KND_nhan xet dang vien giup do_DHKT_2025.docx', `10_Nhan_Xet_Dang_Vien_Giup_Do_${data.mssv || 'DVDB'}.docx`, 'nhan_xet_dang_vien_giup_do_mau11'),
      addFileToZip('/7. Mau 12_KND_Tong hop nhan xet cuadoan the dv dang vien du bi.docx', `9_Tong_Hop_Nhan_Xet_Mau_12_${data.mssv || 'DVDB'}.docx`, 'tong_hop_nhan_xet_mau12'),
      addFileToZip('/8. Mau 13_KND_Nghi quyet de nghi chinh thuc chi bo.docx', `8_Nghi_Quyet_Chi_Bo_Mau_13_${data.mssv || 'DVDB'}.docx`, 'nghi_quyet_chi_bo_mau13')
    ]);
    
    const content = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/zip'
    });
    downloadBlob(content, `Ho_So_Dang_Vien_Chinh_Thuc_${data.ho_ten || 'DVDB'}_${data.mssv || ''}.zip`);
  },

  // ------------------------------------------------------------
  // TRANSFER SERVICE METHODS
  // ------------------------------------------------------------
  async generateDonXinChuyenDang(data) {
    const blob = await replaceTagsInDocx('/1. Mẫu 1. Don xin chuyen dang.docx', data, 'transfer_don_xin_chuyen');
    downloadBlob(blob, `1. Mẫu 1. Don xin chuyen dang - ${data.ho_ten || 'DV'}.docx`);
  },

  async generateDonXinChuyenDangTamThoi(data) {
    const blob = await replaceTagsInDocx('/2. Mau 2. Don xin chuyen dang tam thoi.docx', data, 'transfer_don_xin_chuyen_tam_thoi');
    downloadBlob(blob, `2. Mau 2. Don xin chuyen dang tam thoi - ${data.ho_ten || 'DV'}.docx`);
  },

  async generateNhanXetDangVienDuBiDTN(data) {
    const blob = await replaceTagsInDocx('/3. Mẫu 3. Bản nhận xét Đảng viên dự bị ĐTN.docx', data, 'transfer_nhan_xet_dtn');
    downloadBlob(blob, `3. Mẫu 3. Bản nhận xét Đảng viên dự bị ĐTN - ${data.ho_ten || 'DV'}.docx`);
  },

  async generateNhanXetDangVienDuBiDVHD(data) {
    const blob = await replaceTagsInDocx('/4. Mẫu 5. Bản nhận xét Đảng viên dự bị Chuyển SHĐ ĐVHD.docx', data, 'transfer_nhan_xet_dvhd');
    downloadBlob(blob, `4. Mẫu 5. Bản nhận xét Đảng viên dự bị Chuyển SHĐ ĐVHD - ${data.ho_ten || 'DV'}.docx`);
  },

  async generateKiemDiemChuyenDang(data) {
    const blob = await replaceTagsInDocx('/5. Mẫu 4. Kiem diem chuyen dang 2026.docx', data, 'transfer_kiem_diem_chuyen_dang');
    downloadBlob(blob, `5. Mẫu 4. Kiem diem chuyen dang 2026 - ${data.ho_ten || 'DV'}.docx`);
  },

  async generateNghiQuyetDeNghiChinhThuc(data) {
    const blob = await replaceTagsInDocx('/8. Mau 13_KND_Nghi quyet de nghi chinh thuc chi bo.docx', data, 'nghi_quyet_chi_bo_mau13');
    downloadBlob(blob, `8. Mẫu 13. Nghị quyết đề nghị chính thức chi bộ - ${data.ho_ten || 'DV'}.docx`);
  },

  async generateTongHopNhanXetMau12(data) {
    const blob = await replaceTagsInDocx('/7. Mau 12_KND_Tong hop nhan xet cuadoan the dv dang vien du bi.docx', data, 'tong_hop_nhan_xet_mau12');
    downloadBlob(blob, `9. Mẫu 12. Tổng hợp nhận xét đoàn thể - ${data.ho_ten || 'DV'}.docx`);
  },

  async generateTransferDocumentsZip(data, fileTypes) {
    const zip = new JSZip();
    
    const addFileToZip = async (defaultPath, zipFileName, docType) => {
      try {
        const blob = await replaceTagsInDocx(defaultPath, data, docType);
        zip.file(zipFileName, blob);
      } catch (e) {
        console.error(`Lỗi khi tạo file chuyển sinh hoạt ${zipFileName}:`, e);
        throw e;
      }
    };

    const jobs = [];
    if (fileTypes.includes('mau1')) {
      jobs.push(addFileToZip('/1. Mẫu 1. Don xin chuyen dang.docx', `1. Mẫu 1. Don xin chuyen dang - ${data.ho_ten || 'DV'}.docx`, 'transfer_don_xin_chuyen'));
    }
    if (fileTypes.includes('mau2')) {
      jobs.push(addFileToZip('/2. Mau 2. Don xin chuyen dang tam thoi.docx', `2. Mau 2. Don xin chuyen dang tam thoi - ${data.ho_ten || 'DV'}.docx`, 'transfer_don_xin_chuyen_tam_thoi'));
    }
    if (fileTypes.includes('mau3')) {
      jobs.push(addFileToZip('/3. Mẫu 3. Bản nhận xét Đảng viên dự bị ĐTN.docx', `3. Mẫu 3. Bản nhận xét Đảng viên dự bị ĐTN - ${data.ho_ten || 'DV'}.docx`, 'transfer_nhan_xet_dtn'));
    }
    if (fileTypes.includes('mau5') && data.dvhd) {
      jobs.push(addFileToZip('/4. Mẫu 5. Bản nhận xét Đảng viên dự bị Chuyển SHĐ ĐVHD.docx', `4. Mẫu 5. Bản nhận xét Đảng viên dự bị Chuyển SHĐ ĐVHD - ${data.ho_ten || 'DV'}.docx`, 'transfer_nhan_xet_dvhd'));
    }
    if (fileTypes.includes('mau4')) {
      jobs.push(addFileToZip('/5. Mẫu 4. Kiem diem chuyen dang 2026.docx', `5. Mẫu 4. Kiem diem chuyen dang 2026 - ${data.ho_ten || 'DV'}.docx`, 'transfer_kiem_diem_chuyen_dang'));
    }

    await Promise.all(jobs);
    
    const content = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/zip'
    });
    downloadBlob(content, `Ho_So_Chuyen_Sinh_Hoat_Dang_${data.ho_ten || 'DV'}_${data.mssv || ''}.zip`);
  }
};
