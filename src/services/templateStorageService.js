import { ref, uploadBytes, getDownloadURL, deleteObject, listAll, getMetadata } from 'firebase/storage';
import { storage } from '../firebase';

// Đường dẫn thư mục trên Firebase Storage
const TEMPLATES_PATH = 'templates/bieu_mau';

// Danh sách 7 biểu mẫu với thông tin đầy đủ
export const DOCUMENT_TYPES = [
  {
    key: 'ban_tu_kiem_diem',
    label: '1. Bản tự kiểm điểm',
    defaultPath: '/1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx',
    outputName: '1_Ban_Tu_Kiem_Diem',
  },
  {
    key: 'nghi_quyet_doan_truong',
    label: '2. Nghị quyết Đoàn Trường',
    defaultPath: '/2. Nghị quyết Đoàn Trường (02 bản).docx',
    outputName: '2_Nghi_Quyet_Doan_Truong',
  },
  {
    key: 'nghi_quyet_lcd',
    label: '3. Nghị quyết LCĐ',
    defaultPath: '/3. Nghị quyết LCĐ.docx',
    outputName: '3_Nghi_Quyet_LCD',
  },
  {
    key: 'bien_ban_lcd',
    label: '4. Biên bản họp Liên chi Đoàn',
    defaultPath: '/3. Biên bản họp Liên chi Đoàn.docx',
    outputName: '4_Bien_Ban_LCD',
  },
  {
    key: 'nghi_quyet_chi_doan',
    label: '5. Nghị quyết Chi Đoàn',
    defaultPath: '/4. Nghị quyết Chi Đoàn.docx',
    outputName: '5_Nghi_Quyet_Chi_Doan',
  },
  {
    key: 'bien_ban_chi_doan',
    label: '6. Biên bản họp Chi Đoàn',
    defaultPath: '/5. Biên bản họp Chi Đoàn.docx',
    outputName: '6_Bien_Ban_Chi_Doan',
  },
  {
    key: 'bien_ban_hop_lop',
    label: '7. Biên bản họp lớp',
    defaultPath: '/6. Biên bản họp lớp.docx',
    outputName: '7_Bien_Ban_Hop_Lop',
  },
  {
    key: 'nghi_quyet_chi_bo',
    label: '8. Nghị quyết đề nghị chính thức chi bộ',
    defaultPath: '/8. Mau 13_KND_Nghi quyet de nghi chinh thuc chi bo.docx',
    outputName: '8_Nghi_Quyet_Chi_Bo',
  },
  {
    key: 'tong_hop_nhan_xet_mau12',
    label: '9. Tổng hợp nhận xét đoàn thể',
    defaultPath: '/7. Mau 12_KND_Tong hop nhan xet cuadoan the dv dang vien du bi.docx',
    outputName: '9_Tong_Hop_Nhan_Xet',
  },
  {
    key: 'nhan_xet_dang_vien_giup_do_mau11',
    label: '10. Nhận xét đảng viên giúp đỡ',
    defaultPath: '/2. Mau 11_KND_nhan xet dang vien giup do_DHKT_2025.docx',
    outputName: '10_Nhan_Xet_Dang_Vien_Giup_Do',
  }
];

// Danh sách placeholder hợp lệ để tham khảo khi tạo mẫu mới
export const VALID_PLACEHOLDERS = [
  // Thông tin cá nhân
  { key: '{{ho_ten}}', desc: 'Họ và tên đảng viên dự bị' },
  { key: '{{mssv}}', desc: 'Mã số sinh viên' },
  { key: '{{lop}}', desc: 'Lớp học' },
  { key: '{{khoa}}', desc: 'Khoa (viết thường)' },
  { key: '{{khoa_caps}}', desc: 'Khoa (VIẾT HOA)' },
  { key: '{{ngay_sinh_d}}', desc: 'Ngày sinh (dd)' },
  { key: '{{ngay_sinh_m}}', desc: 'Tháng sinh (mm)' },
  { key: '{{ngay_sinh_y}}', desc: 'Năm sinh (yyyy)' },
  { key: '{{que_quan}}', desc: 'Quê quán' },
  { key: '{{dia_chi_thuong_tru}}', desc: 'Địa chỉ thường trú' },
  { key: '{{dia_chi_tam_tru}}', desc: 'Địa chỉ tạm trú' },
  { key: '{{cccd}}', desc: 'Số CCCD' },
  { key: '{{gioi_tinh}}', desc: 'Giới tính' },
  { key: '{{sdt}}', desc: 'Số điện thoại' },
  { key: '{{email}}', desc: 'Email' },
  { key: '{{dvhd}}', desc: 'Đảng viên hướng dẫn' },
  // Đảng
  { key: '{{ngay_vao_dang_d}}', desc: 'Ngày kết nạp Đảng (dd)' },
  { key: '{{ngay_vao_dang_m}}', desc: 'Tháng kết nạp Đảng (mm)' },
  { key: '{{ngay_vao_dang_y}}', desc: 'Năm kết nạp Đảng (yyyy)' },
  { key: '{{ngay_vao_dang_formatted}}', desc: 'Ngày kết nạp dạng đầy đủ (ngày dd tháng mm năm yyyy)' },
  { key: '{{chi_bo_ket_nap}}', desc: 'Chi bộ kết nạp' },
  { key: '{{chi_bo_sinh_hoat}}', desc: 'Chi bộ đang sinh hoạt' },
  { key: '{{co_quan_cong_tac}}', desc: 'Cơ quan / đơn vị công tác' },
  { key: '{{so_quyet_dinh_dvct}}', desc: 'Số quyết định chính thức' },
  { key: '{{ngay_ky_quyet_dinh_dvct_formatted}}', desc: 'Ngày ký quyết định chính thức' },
  // Tự kiểm điểm
  { key: '{{uu_diem}}', desc: 'Ưu điểm (hỗ trợ xuống dòng)' },
  { key: '{{khuyet_diem}}', desc: 'Khuyết điểm (hỗ trợ xuống dòng)' },
  { key: '{{bien_phap_khac_phuc}}', desc: 'Biện pháp khắc phục' },
  // Ngày ký
  { key: '{{ngay_ky_d}}', desc: 'Ngày ký (dd)' },
  { key: '{{ngay_ky_m}}', desc: 'Tháng ký (mm)' },
  { key: '{{ngay_ky_y}}', desc: 'Năm ký (yyyy)' },
  // Họp lớp
  { key: '{{ngay_hop_lop_d}}', desc: 'Ngày họp lớp (dd)' },
  { key: '{{ngay_hop_lop_m}}', desc: 'Tháng họp lớp (mm)' },
  { key: '{{ngay_hop_lop_y}}', desc: 'Năm họp lớp (yyyy)' },
  { key: '{{tong_so_sv_lop}}', desc: 'Tổng số SV lớp' },
  { key: '{{tham_gia_lop}}', desc: 'Số SV tham dự họp lớp' },
  { key: '{{vang_lop}}', desc: 'Số SV vắng họp lớp' },
  { key: '{{ti_le_bb_lop}}', desc: 'Tỉ lệ % tham dự họp lớp' },
  { key: '{{gvcn}}', desc: 'Giáo viên chủ nhiệm' },
  { key: '{{chu_tri_lop}}', desc: 'Người chủ trì họp lớp' },
  { key: '{{thu_ky_lop}}', desc: 'Thư ký họp lớp' },
  // Họp Chi đoàn
  { key: '{{ngay_hop_chi_doan_d}}', desc: 'Ngày họp Chi đoàn (dd)' },
  { key: '{{ngay_hop_chi_doan_m}}', desc: 'Tháng họp Chi đoàn (mm)' },
  { key: '{{ngay_hop_chi_doan_y}}', desc: 'Năm họp Chi đoàn (yyyy)' },
  { key: '{{tong_so_dv_chi_doan}}', desc: 'Tổng số đoàn viên chi đoàn' },
  { key: '{{tham_gia_chi_doan}}', desc: 'Số đoàn viên tham dự' },
  { key: '{{ti_le_bb_chi_doan}}', desc: 'Tỉ lệ % tham dự họp Chi đoàn' },
  { key: '{{bi_thu_chi_doan}}', desc: 'Bí thư Chi đoàn' },
  { key: '{{chu_tri_chi_doan}}', desc: 'Chủ trì họp Chi đoàn' },
  { key: '{{thu_ky_chi_doan}}', desc: 'Thư ký họp Chi đoàn' },
  // Liên chi Đoàn
  { key: '{{ngay_hop_lcd_d}}', desc: 'Ngày họp LCĐ (dd)' },
  { key: '{{ngay_hop_lcd_m}}', desc: 'Tháng họp LCĐ (mm)' },
  { key: '{{ngay_hop_lcd_y}}', desc: 'Năm họp LCĐ (yyyy)' },
  { key: '{{tong_so_uy_vien_lcd}}', desc: 'Tổng số ủy viên LCĐ' },
  { key: '{{tham_gia_lcd}}', desc: 'Số ủy viên LCĐ tham dự' },
  { key: '{{tan_thanh_lcd}}', desc: 'Số tán thành (LCĐ)' },
  { key: '{{ti_le_lcd}}', desc: 'Tỉ lệ % tán thành (LCĐ)' },
  { key: '{{bi_thu_lcd}}', desc: 'Bí thư Liên chi Đoàn' },
  { key: '{{chu_tri_lcd}}', desc: 'Chủ trì họp LCĐ' },
  { key: '{{thu_ky_lcd}}', desc: 'Thư ký họp LCĐ' },
  // Đoàn Trường
  { key: '{{ngay_hop_doan_truong_d}}', desc: 'Ngày họp Đoàn Trường (dd)' },
  { key: '{{ngay_hop_doan_truong_m}}', desc: 'Tháng họp Đoàn Trường (mm)' },
  { key: '{{ngay_hop_doan_truong_y}}', desc: 'Năm họp Đoàn Trường (yyyy)' },
  { key: '{{so_nq_doan_truong}}', desc: 'Số nghị quyết Đoàn Trường' },
  { key: '{{tan_thanh_doan_truong}}', desc: 'Số tán thành (Đoàn Trường)' },
  { key: '{{ti_le_doan_truong}}', desc: 'Tỉ lệ % tán thành (Đoàn Trường)' },
  { key: '{{bi_thu_doan_truong}}', desc: 'Bí thư Đoàn Trường' },
];

// ============================================================
// FIREBASE STORAGE OPERATIONS
// ============================================================

/**
 * Upload file mẫu .docx lên Firebase Storage
 * @param {string} docType - key của biểu mẫu (vd: 'ban_tu_kiem_diem')
 * @param {File} file - File object từ input
 * @returns {Promise<{url: string, uploadedAt: string, fileName: string}>}
 */
export const uploadTemplate = async (docType, file) => {
  const storageRef = ref(storage, `${TEMPLATES_PATH}/${docType}.docx`);
  
  const metadata = {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    }
  };
  
  await uploadBytes(storageRef, file, metadata);
  const url = await getDownloadURL(storageRef);
  
  // Lưu metadata vào localStorage để hiển thị nhanh mà không cần gọi Firebase
  const meta = {
    url,
    fileName: file.name,
    uploadedAt: new Date().toISOString(),
  };
  localStorage.setItem(`template_meta_${docType}`, JSON.stringify(meta));
  
  return meta;
};

/**
 * Lấy download URL của template tùy chỉnh
 * @param {string} docType
 * @returns {Promise<string|null>} URL hoặc null nếu chưa upload
 */
export const getTemplateUrl = async (docType) => {
  // Chỉ dùng localStorage cache — không gọi Firebase nếu chưa từng upload
  // Điều này tránh lỗi CORS / Storage Rules khi không có template tùy chỉnh
  const cached = localStorage.getItem(`template_meta_${docType}`);
  if (!cached) return null;
  try {
    const meta = JSON.parse(cached);
    return meta.url || null;
  } catch {
    return null;
  }
};

/**
 * Xóa template tùy chỉnh
 * @param {string} docType
 */
export const deleteTemplate = async (docType) => {
  const storageRef = ref(storage, `${TEMPLATES_PATH}/${docType}.docx`);
  await deleteObject(storageRef);
  localStorage.removeItem(`template_meta_${docType}`);
};

/**
 * Lấy metadata của template (tên file, ngày upload)
 * @param {string} docType
 * @returns {{fileName: string, uploadedAt: string}|null}
 */
export const getTemplateMeta = (docType) => {
  const cached = localStorage.getItem(`template_meta_${docType}`);
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
};

/**
 * Kiểm tra biểu mẫu đã có template tùy chỉnh chưa
 * @param {string} docType
 * @returns {boolean}
 */
export const hasCustomTemplate = (docType) => {
  return !!localStorage.getItem(`template_meta_${docType}`);
};
