import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Card, Form, Input, Button, Select, InputNumber, DatePicker, 
  message, Row, Col, Typography, Tabs, Spin, Avatar, Divider, Modal, Popover, Tag, Tooltip
} from 'antd';
import { 
  FileWordOutlined, UserOutlined, AuditOutlined, TeamOutlined, 
  SettingOutlined, CheckCircleOutlined, BookOutlined, StarOutlined, EyeOutlined, FileZipOutlined
} from '@ant-design/icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../services/permissionService';
import { docGeneratorService } from '../services/docGeneratorService';
import { uploadTemplate, deleteTemplate, getTemplateMeta, hasCustomTemplate, DOCUMENT_TYPES, VALID_PLACEHOLDERS } from '../services/templateStorageService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Phân nhóm placeholder liên quan đến từng biểu mẫu để hiển thị trực quan
const RELATED_PLACEHOLDERS = {
  ban_tu_kiem_diem: [
    '{{ho_ten}}', '{{mssv}}', '{{lop}}', '{{khoa}}', 
    '{{ngay_sinh_d}}', '{{ngay_sinh_m}}', '{{ngay_sinh_y}}',
    '{{que_quan}}', '{{dia_chi_thuong_tru}}', '{{dia_chi_tam_tru}}',
    '{{cccd}}', '{{gioi_tinh}}', '{{sdt}}', '{{email}}', '{{dvhd}}',
    '{{ngay_vao_dang_d}}', '{{ngay_vao_dang_m}}', '{{ngay_vao_dang_y}}',
    '{{chi_bo_ket_nap}}', '{{chi_bo_sinh_hoat}}', '{{co_quan_cong_tac}}',
    '{{uu_diem}}', '{{khuyet_diem}}', '{{bien_phap_khac_phuc}}',
    '{{ngay_ky_d}}', '{{ngay_ky_m}}', '{{ngay_ky_y}}'
  ],
  nghi_quyet_doan_truong: [
    '{{ho_ten}}', '{{mssv}}', '{{lop}}', '{{khoa}}',
    '{{ngay_sinh_d}}', '{{ngay_sinh_m}}', '{{ngay_sinh_y}}',
    '{{ngay_vao_dang_formatted}}',
    '{{uu_diem}}', '{{khuyet_diem}}',
    '{{ngay_hop_doan_truong_d}}', '{{ngay_hop_doan_truong_m}}', '{{ngay_hop_doan_truong_y}}',
    '{{so_nq_doan_truong}}', '{{tan_thanh_doan_truong}}', '{{ti_le_doan_truong}}', '{{bi_thu_doan_truong}}'
  ],
  nghi_quyet_lcd: [
    '{{ho_ten}}', '{{lop}}', '{{khoa}}',
    '{{ngay_vao_dang_formatted}}',
    '{{uu_diem}}', '{{khuyet_diem}}',
    '{{ngay_hop_lcd_d}}', '{{ngay_hop_lcd_m}}', '{{ngay_hop_lcd_y}}',
    '{{tong_so_uy_vien_lcd}}', '{{tan_thanh_lcd}}', '{{ti_le_lcd}}', '{{bi_thu_lcd}}'
  ],
  bien_ban_lcd: [
    '{{ho_ten}}', '{{lop}}', '{{khoa}}',
    '{{uu_diem}}', '{{khuyet_diem}}',
    '{{ngay_hop_lcd_d}}', '{{ngay_hop_lcd_m}}', '{{ngay_hop_lcd_y}}',
    '{{tong_so_uy_vien_lcd}}', '{{tham_gia_lcd}}',
    '{{chu_tri_lcd}}', '{{thu_ky_lcd}}', '{{tan_thanh_lcd}}', '{{ti_le_lcd}}'
  ],
  nghi_quyet_chi_doan: [
    '{{ho_ten}}', '{{lop}}', '{{khoa}}',
    '{{ngay_vao_dang_formatted}}',
    '{{uu_diem}}', '{{khuyet_diem}}',
    '{{ngay_hop_chi_doan_d}}', '{{ngay_hop_chi_doan_m}}', '{{ngay_hop_chi_doan_y}}',
    '{{bi_thu_chi_doan}}', '{{tan_thanh_chi_doan}}', '{{ti_le_chi_doan}}'
  ],
  bien_ban_chi_doan: [
    '{{ho_ten}}', '{{lop}}', '{{khoa}}',
    '{{uu_diem}}', '{{khuyet_diem}}',
    '{{ngay_hop_chi_doan_d}}', '{{ngay_hop_chi_doan_m}}', '{{ngay_hop_chi_doan_y}}',
    '{{tong_so_dv_chi_doan}}', '{{tham_gia_chi_doan}}', '{{ti_le_bb_chi_doan}}',
    '{{chu_tri_chi_doan}}', '{{thu_ky_chi_doan}}'
  ],
  bien_ban_hop_lop: [
    '{{ho_ten}}', '{{lop}}', '{{khoa}}',
    '{{uu_diem}}', '{{khuyet_diem}}',
    '{{ngay_hop_lop_d}}', '{{ngay_hop_lop_m}}', '{{ngay_hop_lop_y}}',
    '{{tong_so_sv_lop}}', '{{tham_gia_lop}}', '{{vang_lop}}', '{{ti_le_bb_lop}}',
    '{{gvcn}}', '{{chu_tri_lop}}', '{{thu_ky_lop}}'
  ]
};

const PLACEHOLDER_DESCS = {};
VALID_PLACEHOLDERS.forEach(p => {
  PLACEHOLDER_DESCS[p.key] = p.desc;
});

const DocumentGenerator = () => {
  const { currentUser } = useAuth();
  const [form] = Form.useForm();

  // Role permissions
  const isManager = useMemo(() => {
    if (!currentUser) return false;
    return [
      ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, 
      ROLES.OFFICIAL_MANAGER, ROLES.KIEMTRA
    ].includes(currentUser.role);
  }, [currentUser]);

  // Chỉ ADMIN mới được quản lý biểu mẫu
  const isAdmin = currentUser?.role === ROLES.ADMIN;

  // States
  const [probationaryList, setProbationaryList] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [exporting, setExporting] = useState(null); // name of document currently exporting
  const [exportingAll, setExportingAll] = useState(false);
  const [activeTab, setActiveTab] = useState('ban_tu_kiem_diem');
  
  // Preview States
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewDocType, setPreviewDocType] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  // Template Manager States
  const [templateMetas, setTemplateMetas] = useState(() => {
    const metas = {};
    DOCUMENT_TYPES.forEach(d => {
      metas[d.key] = getTemplateMeta(d.key);
    });
    return metas;
  });
  const [uploadingTemplate, setUploadingTemplate] = useState(null);
  const [deletingTemplate, setDeletingTemplate] = useState(null);

  // Direct Mail-Merge Mapping States
  const [mappingVisible, setMappingVisible] = useState(false);
  const [mappingDocType, setMappingDocType] = useState(null);
  const [mappingFile, setMappingFile] = useState(null);
  const [extractedLines, setExtractedLines] = useState([]);
  const [mappingSearchQuery, setMappingSearchQuery] = useState('');
  const [processingMapping, setProcessingMapping] = useState(false);
  // assignments: { '{{ho_ten}}': 'Nguyễn Văn A', '{{mssv}}': '12345678', ... }
  const [assignments, setAssignments] = useState({});
  // Which line index is showing the placeholder picker popover
  const [activeLineIdx, setActiveLineIdx] = useState(null);
  // Text selection within a line
  const [selectedText, setSelectedText] = useState('');
  const textContainerRef = useRef(null);

  // Lấy danh sách placeholder khả dụng (chưa được gán) cho docType hiện tại
  const getAvailablePlaceholders = useCallback(() => {
    const relKeys = RELATED_PLACEHOLDERS[mappingDocType] || [];
    return relKeys.filter(key => !assignments[key]);
  }, [mappingDocType, assignments]);

  // Gán một cụm text vào placeholder
  const assignPlaceholder = useCallback((placeholderKey, text) => {
    setAssignments(prev => ({ ...prev, [placeholderKey]: text }));
    setActiveLineIdx(null);
    setSelectedText('');
    const desc = PLACEHOLDER_DESCS[placeholderKey] || placeholderKey;
    message.success({ content: `✓ Đã gán "${text.length > 25 ? text.substring(0, 25) + '…' : text}" → ${desc}`, duration: 2 });
  }, []);

  // Xóa một ánh xạ
  const removeAssignment = useCallback((placeholderKey) => {
    setAssignments(prev => {
      const next = { ...prev };
      delete next[placeholderKey];
      return next;
    });
  }, []);

  // Trích xuất text và mở Modal
  const handleSelectFileForMapping = async (docType, file) => {
    if (!file.name.endsWith('.docx')) {
      message.error('Chỉ chấp nhận file .docx');
      return false;
    }
    
    setMappingDocType(docType);
    setMappingFile(file);
    
    const hideLoading = message.loading('Đang phân tích file Word...', 0);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const lines = await docGeneratorService.extractTextFromDocx(arrayBuffer);
      setExtractedLines(lines);
      hideLoading();
      
      // Khôi phục ánh xạ đã lưu trước đó nếu có
      const cachedMapping = localStorage.getItem(`template_mapping_v2_${docType}`);
      if (cachedMapping) {
        try {
          setAssignments(JSON.parse(cachedMapping));
        } catch (e) {
          setAssignments({});
        }
      } else {
        setAssignments({});
      }
      
      setActiveLineIdx(null);
      setSelectedText('');
      setMappingSearchQuery('');
      setMappingVisible(true);
    } catch (e) {
      hideLoading();
      console.error(e);
      message.error('Lỗi khi đọc file Word: ' + e.message);
    }
    
    return false;
  };

  // Xử lý khi user bấm vào một dòng text hoặc bôi đen text
  const handleTextLineClick = useCallback((lineIdx) => {
    const selection = window.getSelection();
    const selText = selection?.toString()?.trim() || '';
    
    if (selText.length > 0) {
      setSelectedText(selText);
    } else {
      // Nếu không bôi đen gì, lấy toàn bộ dòng
      setSelectedText(extractedLines[lineIdx] || '');
    }
    setActiveLineIdx(lineIdx);
  }, [extractedLines]);

  // Tiến hành thay thế chuỗi và upload lên Firebase
  const handleSaveAndUploadMappedTemplate = async () => {
    const assignedCount = Object.keys(assignments).length;
    if (assignedCount === 0) {
      message.warning('Bạn chưa gán placeholder nào. Hãy bấm vào các cụm từ trong văn bản và chọn trường tương ứng.');
      return;
    }
    
    setProcessingMapping(true);
    const hideLoading = message.loading('Đang chèn placeholder vào file Word...', 0);
    try {
      // Lưu lại để tái sử dụng lần sau
      localStorage.setItem(`template_mapping_v2_${mappingDocType}`, JSON.stringify(assignments));
      
      const arrayBuffer = await mappingFile.arrayBuffer();
      const processedBlob = await docGeneratorService.processTemplateAndInjectPlaceholders(arrayBuffer, assignments);
      
      const processedFile = new File([processedBlob], mappingFile.name, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      
      const meta = await uploadTemplate(mappingDocType, processedFile);
      setTemplateMetas(prev => ({ ...prev, [mappingDocType]: meta }));
      
      const label = DOCUMENT_TYPES.find(d => d.key === mappingDocType)?.label || mappingDocType;
      hideLoading();
      message.success(`Đã ánh xạ ${assignedCount} trường và tải biểu mẫu "${label}" lên thành công!`);
      
      setMappingVisible(false);
      setMappingFile(null);
      setMappingDocType(null);
      setAssignments({});
    } catch (e) {
      hideLoading();
      console.error(e);
      message.error('Lỗi khi xử lý biểu mẫu: ' + e.message);
    } finally {
      setProcessingMapping(false);
    }
  };

  // Kiểm tra xem 1 dòng text có chứa cụm đã được gán chưa
  const getAssignmentsForLine = useCallback((lineText) => {
    const result = [];
    Object.entries(assignments).forEach(([key, val]) => {
      if (val && lineText.includes(val)) {
        result.push({ key, val, desc: PLACEHOLDER_DESCS[key] || key });
      }
    });
    return result;
  }, [assignments]);

  // Load probationary list or profile
  const loadData = async () => {
    setLoadingProfile(true);
    try {
      if (isManager) {
        // Query members who are probationary
        const q1 = query(collection(db, "dang_vien"), where("dang_vien_du_bi", "==", true));
        const s1 = await getDocs(q1);
        const list1 = s1.docs.map(d => ({ id: d.id, ...d.data() }));

        const q2 = query(collection(db, "dang_vien"), where("loai_dang_vien", "==", "Dự bị"));
        const s2 = await getDocs(q2);
        const list2 = s2.docs.map(d => ({ id: d.id, ...d.data() }));

        // Merge by MSSV
        const merged = [...list1];
        list2.forEach(item => {
          if (!merged.some(m => m.mssv === item.mssv)) merged.push(item);
        });

        // Filter valid names
        const validList = merged.filter(m => m.ho_ten);
        setProbationaryList(validList);

        if (validList.length > 0) {
          setSelectedMember(validList[0]);
        } else {
          message.warning("Hiện tại không có Đảng viên dự bị nào trong hệ thống.");
        }
      } else {
        // Load logged-in user profile
        const myId = currentUser?.mssv || currentUser?.username || currentUser?.id;
        const q = query(collection(db, "dang_vien"), where("mssv", "==", myId));
        const s = await getDocs(q);
        if (!s.empty) {
          setSelectedMember({ id: s.docs[0].id, ...s.docs[0].data() });
        } else {
          // Fallback fields
          setSelectedMember({
            ho_ten: currentUser?.name || '',
            mssv: currentUser?.mssv || currentUser?.username || '',
            lop: currentUser?.lop || '',
            khoa: currentUser?.khoa || '',
            dia_chi_tam_tru: currentUser?.dia_chi_tam_tru || '',
            ngay_vao_dang: currentUser?.ngay_vao_dang || null,
            que_quan: currentUser?.quequan || currentUser?.que_quan || '',
            dia_chi_thuong_tru: currentUser?.chi_tiet_dc || currentUser?.tinh_tp_tt || '',
            cccd: currentUser?.cccd || '',
            gioi_tinh: currentUser?.gioi_tinh || 'Nam',
            so_dien_thoai: currentUser?.so_dien_thoai || '',
            email: currentUser?.email || '',
            dvhd: currentUser?.dvhd || currentUser?.dangvienhuongdan || ''
          });
        }
      }
    } catch (e) {
      console.error(e);
      message.error("Lỗi tải thông tin hồ sơ: " + e.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isManager, currentUser]);

  // Sync selectedMember to form fields
  useEffect(() => {
    if (selectedMember) {
      // Calculate defaults based on profile
      const defaultUuDiem = 
        "- Có phẩm chất chính trị tốt lập trường tư tưởng vững vàng, tuyệt đối trung thành với đường lối của Đảng, tác phong đứng đắn, mẫu mực.\n" +
        "- Có lối sống đạo đức trong sáng, giản dị, luôn có ý thức tu dưỡng và rèn luyện đạo đức, luôn là tấm gương sáng cho các thế hệ noi theo.\n" +
        "- Có năng lực công tác tốt, luôn tích cực tham gia các hoạt động của chi Đoàn, khoa, Đoàn trường.\n" +
        "- Tính tình vui vẻ, hòa đồng, luôn giúp đỡ mọi người.\n" +
        "- Luôn có thái độ cầu thị trong việc nhìn nhận, sửa chữa, khắc phục khuyết điểm.";

      const defaultKhuyetDiem = "Không có khuyết điểm gì lớn";

      form.setFieldsValue({
        ho_ten: selectedMember.ho_ten,
        mssv: selectedMember.mssv,
        lop: selectedMember.lop || '',
        khoa: selectedMember.khoa || '',
        ngay_sinh: selectedMember.ngay_sinh ? dayjs(selectedMember.ngay_sinh) : null,
        ngay_vao_dang: selectedMember.ngay_vao_dang ? dayjs(selectedMember.ngay_vao_dang) : null,
        que_quan: selectedMember.que_quan || selectedMember.tinh_tp_qq || '',
        dia_chi_thuong_tru: selectedMember.chi_tiet_dc || selectedMember.tinh_tp_tt || selectedMember.dia_chi_thuong_tru || '',
        dia_chi_tam_tru: selectedMember.dia_chi_tam_tru || '',
        dvhd: selectedMember.dvhd || selectedMember.dangvienhuongdan || '',
        cccd: selectedMember.cccd || '',
        gioi_tinh: selectedMember.gioi_tinh || 'Nam',
        sdt: selectedMember.so_dien_thoai || '',
        email: selectedMember.email || '',

        // Tab 1 defaults
        chi_bo_ket_nap: 'Chi bộ Sinh viên',
        co_quan_cong_tac: 'Trường Đại học Kinh tế - Đại học Đà Nẵng',
        chi_bo_sinh_hoat: 'Chi bộ Sinh viên',
        uu_diem: defaultUuDiem,
        khuyet_diem: defaultKhuyetDiem,
        bien_phap_khac_phuc: '',   // không bắt buộc, để trống
        ngay_ky: null,             // để trống, điền sau

        // Tab 2 defaults
        ngay_hop_lop: null,        // để trống, chỉ lấy năm khi xuất
        gvcn: '',
        chu_tri_lop: 'Lớp trưởng',
        thu_ky_lop: 'Bí thư Chi đoàn',
        tong_so_sv_lop: 45,
        tham_gia_lop: 45,
        vang_lop: 0,               // mặc định 0

        // Tab 3 defaults
        ngay_hop_chi_doan: null,   // để trống, chỉ lấy năm khi xuất
        chu_tri_chi_doan: 'Bí thư Chi đoàn',
        thu_ky_chi_doan: 'Phó Bí thư Chi đoàn',
        tong_so_dv_chi_doan: 28,
        tham_gia_chi_doan: 28,
        vang_chi_doan: 0,          // mặc định 0
        ly_do_vang_chi_doan: '',   // để trống
        bi_thu_chi_doan: selectedMember.ho_ten || '',

        // Tab 4 defaults
        ngay_hop_lcd: null,        // để trống, chỉ lấy năm khi xuất
        dia_diem_hop_lcd: 'Trường Đại học Kinh tế', // mặc định
        chu_tri_lcd: 'Trần Thị Lan Trinh',
        thu_ky_lcd: 'Nguyễn Thị Xuân Hòa',
        tong_so_uy_vien_lcd: 11,
        tham_gia_lcd: 11,
        vang_lcd: 0,
        bi_thu_lcd: 'Trần Thị Lan Trinh',

        // Tab 5 defaults
        so_nq_doan_truong: '     -NQ/ĐTN-ĐHKT',  // mặc định có khoảng trống phía trước
        ngay_hop_doan_truong: null,// để trống, chỉ lấy năm khi xuất
        tan_thanh_doan_truong: 28,
        khong_tan_thanh_doan_truong: 0,
        bi_thu_doan_truong: ''     // để trống, điền sau
      });
    }
  }, [selectedMember, form]);


  const getFieldsToValidate = (docType) => {
    switch (docType) {
      case 'ban_tu_kiem_diem':
        return ['chi_bo_ket_nap', 'co_quan_cong_tac', 'chi_bo_sinh_hoat', 'uu_diem', 'khuyet_diem'];
      case 'bien_ban_hop_lop':
        return ['chu_tri_lop', 'thu_ky_lop', 'tong_so_sv_lop', 'tham_gia_lop'];
      case 'bien_ban_chi_doan':
        return ['chu_tri_chi_doan', 'thu_ky_chi_doan', 'tong_so_dv_chi_doan', 'tham_gia_chi_doan'];
      case 'nghi_quyet_chi_doan':
        return ['bi_thu_chi_doan'];
      case 'bien_ban_lcd':
        return ['chu_tri_lcd', 'thu_ky_lcd', 'tong_so_uy_vien_lcd', 'tham_gia_lcd'];
      case 'nghi_quyet_lcd':
        return ['chu_tri_lcd'];
      case 'nghi_quyet_doan_truong':
        return ['tan_thanh_doan_truong'];
      case 'all':
        return [
          'chi_bo_ket_nap', 'co_quan_cong_tac', 'chi_bo_sinh_hoat', 'uu_diem', 'khuyet_diem',
          'chu_tri_lop', 'thu_ky_lop', 'tong_so_sv_lop', 'tham_gia_lop',
          'bi_thu_chi_doan', 'chu_tri_chi_doan', 'thu_ky_chi_doan', 'tong_so_dv_chi_doan', 'tham_gia_chi_doan',
          'chu_tri_lcd', 'thu_ky_lcd', 'tong_so_uy_vien_lcd', 'tham_gia_lcd',
          'tan_thanh_doan_truong'
        ];
      default:
        return [];
    }
  };

  // Process form values into formatted values
  const getFormattedValues = async (docType) => {
    const fields = getFieldsToValidate(docType);
    await form.validateFields(fields);
    const values = form.getFieldsValue();
    return {
      ...values,
      ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : '',
      ngay_vao_dang: values.ngay_vao_dang ? values.ngay_vao_dang.format('YYYY-MM-DD') : '',
      ngay_ky: values.ngay_ky ? values.ngay_ky.format('YYYY-MM-DD') : '',
      ngay_hop_lop: values.ngay_hop_lop ? values.ngay_hop_lop.format('YYYY-MM-DD') : '',
      ngay_hop_chi_doan: values.ngay_hop_chi_doan ? values.ngay_hop_chi_doan.format('YYYY-MM-DD') : '',
      ngay_hop_lcd: values.ngay_hop_lcd ? values.ngay_hop_lcd.format('YYYY-MM-DD') : '',
      ngay_hop_doan_truong: values.ngay_hop_doan_truong ? values.ngay_hop_doan_truong.format('YYYY-MM-DD') : ''
    };
  };

  // Handle Preview Document
  const handlePreview = async (docType) => {
    try {
      const formatted = await getFormattedValues(docType);
      const prepared = docGeneratorService.prepareTemplateData(formatted);
      setPreviewData(prepared);
      setPreviewDocType(docType);
      setPreviewVisible(true);
    } catch (e) {
      if (e.errorFields) {
        message.error("Vui lòng điền đầy đủ các thông tin bắt buộc trước khi xem trước.");
      } else {
        console.error(e);
        message.error("Lỗi chuẩn bị xem trước: " + e.message);
      }
    }
  };

  // Handle Export File
  const handleExport = async (docType) => {
    try {
      const formatted = await getFormattedValues(docType);
      setExporting(docType);
      
      switch(docType) {
        case 'ban_tu_kiem_diem':
          await docGeneratorService.generateBanTuKiemDiem(formatted);
          break;
        case 'bien_ban_hop_lop':
          await docGeneratorService.generateBienBanHopLop(formatted);
          break;
        case 'bien_ban_chi_doan':
          await docGeneratorService.generateBienBanChiDoan(formatted);
          break;
        case 'nghi_quyet_chi_doan':
          await docGeneratorService.generateNghiQuyetChiDoan(formatted);
          break;
        case 'bien_ban_lcd':
          await docGeneratorService.generateBienBanLCD(formatted);
          break;
        case 'nghi_quyet_lcd':
          await docGeneratorService.generateNghiQuyetLCD(formatted);
          break;
        case 'nghi_quyet_doan_truong':
          await docGeneratorService.generateNghiQuyetDoanTruong(formatted);
          break;
        default:
          message.error("Loại tài liệu không hợp lệ.");
      }
      message.success("Xuất biểu mẫu Word thành công.");
    } catch (e) {
      if (e.errorFields) {
        message.error("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      } else {
        console.error(e);
        message.error("Lỗi khi xuất tài liệu: " + e.message);
      }
    } finally {
      setExporting(null);
    }
  };

  // Handle Export All Files to ZIP
  const handleExportAll = async () => {
    try {
      const formatted = await getFormattedValues('all');
      setExportingAll(true);
      await docGeneratorService.generateAllDocumentsZip(formatted);
      message.success("Xuất trọn bộ hồ sơ ZIP thành công.");
    } catch (e) {
      if (e.errorFields) {
        message.error("Vui lòng điền đầy đủ các thông tin bắt buộc trên tất cả các tab trước khi xuất trọn bộ.");
      } else {
        console.error(e);
        message.error("Lỗi khi xuất bộ hồ sơ: " + e.message);
      }
    } finally {
      setExportingAll(false);
    }
  };

  // Handle Upload Custom Template
  const handleUploadTemplate = async (docType, file) => {
    if (!file.name.endsWith('.docx')) {
      message.error('Chỉ chấp nhận file .docx');
      return false;
    }
    setUploadingTemplate(docType);
    try {
      const meta = await uploadTemplate(docType, file);
      setTemplateMetas(prev => ({ ...prev, [docType]: meta }));
      const label = DOCUMENT_TYPES.find(d => d.key === docType)?.label || docType;
      message.success(`Đã tải lên template "${label}" thành công!`);
    } catch (e) {
      console.error(e);
      message.error('Lỗi khi tải lên: ' + e.message);
    } finally {
      setUploadingTemplate(null);
    }
    return false;
  };

  // Handle Delete Custom Template
  const handleDeleteTemplate = async (docType) => {
    setDeletingTemplate(docType);
    try {
      await deleteTemplate(docType);
      setTemplateMetas(prev => ({ ...prev, [docType]: null }));
      message.success('Đã xóa template tùy chỉnh, sẽ dùng lại file mặc định.');
    } catch (e) {
      console.error(e);
      message.error('Lỗi khi xóa: ' + e.message);
    } finally {
      setDeletingTemplate(null);
    }
  };

  const getAvatarUrl = (url) => {
    if (!url || typeof url !== 'string') return undefined;
    const driveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)\//;
    const match = url.match(driveRegex);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w500`;
    }
    return url;
  };

  // Render simulated A4 preview
  const renderDocPreview = () => {
    if (!previewData) return null;
    
    const dStyle = {
      width: '100%',
      minHeight: '297mm', // A4 aspect ratio
      padding: '20mm 15mm 20mm 20mm', // standard margin
      background: '#fff',
      color: '#000',
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: '13pt',
      lineHeight: '1.45',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      margin: '0 auto',
      position: 'relative',
      boxSizing: 'border-box'
    };

    const indentStyle = { textIndent: '24px', textAlign: 'justify', marginBottom: '8px' };

    switch(previewDocType) {
      case 'ban_tu_kiem_diem':
        return (
          <div style={dStyle}>
            {/* Header Table */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <div style={{ textAlign: 'center', width: '45%', fontWeight: 'bold', fontSize: '13pt' }}>
                ĐẢNG CỘNG SẢN VIỆT NAM
                <div style={{ fontWeight: 'normal', margin: '4px 0' }}>— — — — —</div>
              </div>
              <div style={{ textAlign: 'right', width: '50%', fontStyle: 'italic', fontSize: '11pt' }}>
                Mẫu 10-KND
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16pt', marginBottom: '25px', textTransform: 'uppercase' }}>
              BẢN TỰ KIỂM ĐIỂM
              <div style={{ fontSize: '13pt', fontWeight: 'bold', marginTop: '5px', textTransform: 'none' }}>của đảng viên dự bị</div>
            </div>

            {/* Recipient */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13pt', marginBottom: '30px' }}>
              Kính gửi: Chi uỷ {previewData.chi_bo_sinh_hoat || '..................'}<br />
              Đảng uỷ {previewData.dang_uy_truong || '..................'}
            </div>

            {/* Profile */}
            <div style={indentStyle}>
              Tôi là: <strong>{previewData.ho_ten}</strong>. Sinh ngày {previewData.ngay_sinh_d} tháng {previewData.ngay_sinh_m} năm {previewData.ngay_sinh_y}.
            </div>
            <div style={indentStyle}>
              Quê quán: {previewData.que_quan || '..................'}.
            </div>
            <div style={{ textAlign: 'justify', marginBottom: '6px', fontWeight: 'bold' }}>
              Nơi cư trú:
            </div>
            <div style={{ textIndent: '24px', textAlign: 'justify', marginBottom: '6px' }}>
              + Nơi thường trú: {previewData.dia_chi_thuong_tru || '..................'}.
            </div>
            <div style={{ textIndent: '24px', textAlign: 'justify', marginBottom: '10px' }}>
              + Nơi tạm trú: {previewData.dia_chi_tam_tru || '..................'}.
            </div>
            <div style={indentStyle}>
              Được kết nạp (hoặc kết nạp lại) vào Đảng ngày {previewData.ngay_vao_dang_d} tháng {previewData.ngay_vao_dang_m} năm {previewData.ngay_vao_dang_y}, tại Chi bộ {previewData.chi_bo_ket_nap || '..................'}.
            </div>
            <div style={indentStyle}>
              Cơ quan, đơn vị đang công tác: <strong>{previewData.co_quan_cong_tac || '..................'}</strong>.
            </div>
            <div style={{ ...indentStyle, marginBottom: '20px' }}>
              Đang sinh hoạt tại Chi bộ: <strong>{previewData.chi_bo_sinh_hoat || '..................'}</strong>.
            </div>

            <div style={{ ...indentStyle, fontStyle: 'italic', marginBottom: '15px' }}>
              Căn cứ tiêu chuẩn đảng viên, quá trình tu dưỡng, rèn luyện phấn đấu thực hiện nhiệm vụ đảng viên, tôi tự kiểm điểm như sau:
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Ưu điểm:</div>
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify', paddingLeft: '16px', marginBottom: '15px' }}>
              {previewData.uu_diem}
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Khuyết điểm:</div>
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify', paddingLeft: '16px', marginBottom: '15px' }}>
              {previewData.khuyet_diem}
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Biện pháp khắc phục khuyết điểm:</div>
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify', paddingLeft: '16px', marginBottom: '20px' }}>
              {previewData.bien_phap_khac_phuc}
            </div>

            <div style={indentStyle}>
              Tôi tự nhận thấy có đủ điều kiện trở thành đảng viên chính thức. Đề nghị Chi bộ xét, báo cáo cấp uỷ cấp trên quyết định công nhận tôi là đảng viên chính thức.
            </div>
            <div style={{ ...indentStyle, marginBottom: '40px' }}>
              Tôi xin hứa luôn phấn đấu thực hiện tốt nhiệm vụ đảng viên, xứng đáng là đảng viên tốt của Đảng.
            </div>

            {/* Signature block */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
              <div style={{ textAlign: 'center', width: '50%' }}>
                <div style={{ fontStyle: 'italic', marginBottom: '5px' }}>
                  {previewData.tinh_tp || 'Đà Nẵng'}, ngày {previewData.ngay_ky_d} tháng {previewData.ngay_ky_m} năm {previewData.ngay_ky_y}
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '80px' }}>NGƯỜI TỰ KIỂM ĐIỂM</div>
                <div style={{ fontWeight: 'bold' }}>{previewData.ho_ten}</div>
              </div>
            </div>
          </div>
        );

      case 'bien_ban_hop_lop':
        return (
          <div style={dStyle}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '1px solid #ddd', paddingBottom: '12px' }}>
              <div style={{ textAlign: 'center', width: '45%', fontSize: '11pt' }}>
                ĐẠI HỌC ĐÀ NẴNG
                <div style={{ fontWeight: 'bold' }}>TRƯỜNG ĐẠI HỌC KINH TẾ</div>
                <div>— — — — —</div>
              </div>
              <div style={{ textAlign: 'center', width: '50%', fontSize: '11pt' }}>
                <div style={{ fontWeight: 'bold' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div style={{ fontWeight: 'bold' }}>Độc lập - Tự do - Hạnh phúc</div>
                <div style={{ fontStyle: 'italic', marginTop: '4px' }}>Đà Nẵng, ngày {previewData.ngay_ky_d} tháng {previewData.ngay_ky_m} năm {previewData.ngay_ky_y}</div>
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15pt', marginBottom: '25px', textTransform: 'uppercase' }}>
              BIÊN BẢN
              <div style={{ fontSize: '13pt', fontWeight: 'bold', marginTop: '5px', textTransform: 'none' }}>Họp xét đề nghị công nhận đảng viên chính thức</div>
            </div>

            {/* Body */}
            <div style={indentStyle}>
              Hôm nay, ngày {previewData.ngay_hop_lop_d} tháng {previewData.ngay_hop_lop_m} năm {previewData.ngay_hop_lop_y} tại Trường Đại học Kinh tế - Đại học Đà Nẵng.
            </div>
            <div style={indentStyle}>
              Lớp <strong>{previewData.lop}</strong> thuộc khoa <strong>{previewData.khoa}</strong> Trường Đại học Kinh tế.
            </div>
            <div style={{ ...indentStyle, marginBottom: '20px' }}>
              Tổ chức họp lớp để xét đề nghị công nhận đảng viên chính thức cho sinh viên: <strong>{previewData.ho_ten}</strong>
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>I. THÀNH PHẦN THAM DỰ</div>
            <div style={{ paddingLeft: '16px', marginBottom: '6px' }}>
              1. Giảng viên chủ nhiệm: <strong>{previewData.gvcn}</strong>
            </div>
            <div style={{ paddingLeft: '16px', marginBottom: '6px' }}>
              2. Chủ trì cuộc họp: <strong>{previewData.chu_tri_lop}</strong>
            </div>
            <div style={{ paddingLeft: '16px', marginBottom: '6px' }}>
              3. Thư ký cuộc họp: <strong>{previewData.thu_ky_lop}</strong>
            </div>
            <div style={{ paddingLeft: '16px', marginBottom: '20px' }}>
              4. Tổng số sinh viên lớp: <strong>{previewData.tong_so_sv_lop}</strong>. Có mặt: <strong>{previewData.tham_gia_lop}</strong>. Vắng: <strong>{previewData.vang_lop}</strong>.
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>II. NỘI DUNG CUỘC HỌP</div>
            <div style={indentStyle}>
              Lớp {previewData.lop} đã tiến hành họp nhận xét về những ưu điểm, khuyết điểm chính của đảng viên dự bị <strong>{previewData.ho_ten}</strong> trong suốt quá trình phấn đấu học tập, công tác, rèn luyện tại lớp, cụ thể như sau:
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>1. Ưu điểm:</div>
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify', paddingLeft: '16px', marginBottom: '15px' }}>
              {previewData.uu_diem}
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>2. Khuyết điểm:</div>
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify', paddingLeft: '16px', marginBottom: '20px' }}>
              {previewData.khuyet_diem}
            </div>

            <div style={indentStyle}>
              Đối chiếu với các tiêu chuẩn và điều kiện chuyển đảng chính thức, tập thể lớp {previewData.lop} thuộc khoa {previewData.khoa} giới thiệu và kính đề nghị tổ chức Đoàn, tổ chức Đảng các cấp xem xét chuyển chính thức đúng thời hạn cho đảng viên dự bị <strong>{previewData.ho_ten}</strong>.
            </div>

            <div style={indentStyle}>
              Biểu quyết thông qua với sự tán thành của <strong>{previewData.tham_gia_lop}</strong> sinh viên (đạt <strong>{previewData.ti_le_bb_lop}%</strong>); số không tán thành: <strong>{previewData.khong_tan_thanh_bb_lop || 0}</strong> sinh viên.
            </div>

            <div style={{ ...indentStyle, marginBottom: '40px' }}>
              Tập thể lớp {previewData.lop} thuộc khoa {previewData.khoa} xin chịu hoàn toàn trách nhiệm về những nội dung giới thiệu nêu trên./.
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', fontSize: '11pt' }}>
              <div style={{ textAlign: 'center', width: '33%' }}>
                <div style={{ fontWeight: 'bold' }}>Giảng viên</div>
                <div style={{ fontWeight: 'bold', marginBottom: '80px' }}>chủ nhiệm lớp</div>
                <div style={{ fontWeight: 'bold' }}>{previewData.gvcn}</div>
              </div>
              <div style={{ textAlign: 'center', width: '33%' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '96px' }}>Thư ký</div>
                <div style={{ fontWeight: 'bold' }}>{previewData.thu_ky_lop}</div>
              </div>
              <div style={{ textAlign: 'center', width: '33%' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '96px' }}>Chủ tọa</div>
                <div style={{ fontWeight: 'bold' }}>{previewData.chu_tri_lop}</div>
              </div>
            </div>
          </div>
        );

      case 'bien_ban_chi_doan':
        return (
          <div style={dStyle}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <div style={{ textAlign: 'center', width: '50%', fontSize: '11pt' }}>
                LIÊN CHI ĐOÀN KHOA {previewData.khoa_caps || '...............'}<br />
                <div style={{ fontWeight: 'bold' }}>BCH CHI ĐOÀN {previewData.lop || '...............'}</div>
                <div>***</div>
              </div>
              <div style={{ textAlign: 'center', width: '45%', fontSize: '11pt' }}>
                <div style={{ fontWeight: 'bold' }}>ĐOÀN TNCS HỒ CHÍ MINH</div>
                <div style={{ fontStyle: 'italic', marginTop: '4px' }}>Đà Nẵng, ngày {previewData.ngay_ky_d} tháng {previewData.ngay_ky_m} năm {previewData.ngay_ky_y}</div>
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15pt', marginBottom: '25px', textTransform: 'uppercase' }}>
              BIÊN BẢN
              <div style={{ fontSize: '13pt', fontWeight: 'bold', marginTop: '5px', textTransform: 'none' }}>Họp xét đề nghị công nhận đảng viên chính thức</div>
            </div>

            {/* Body */}
            <div style={indentStyle}>
              Hôm nay, ngày {previewData.ngay_hop_chi_doan_d} tháng {previewData.ngay_hop_chi_doan_m} năm {previewData.ngay_hop_chi_doan_y} tại Trường Đại học Kinh tế - Đại học Đà Nẵng.
            </div>
            <div style={indentStyle}>
              Chi Đoàn <strong>{previewData.lop}</strong> thuộc Liên chi Đoàn khoa <strong>{previewData.khoa}</strong> trực thuộc Đoàn TNCS Hồ Chí Minh Trường Đại học Kinh tế, là tổ chức Đoàn giới thiệu và bảo đảm thứ 2 cho đồng chí <strong>{previewData.ho_ten}</strong> được kết nạp vào Đảng Cộng sản Việt Nam.
            </div>
            <div style={{ ...indentStyle, marginBottom: '20px' }}>
              Chi Đoàn {previewData.lop} tổ chức Hội nghị Chi Đoàn để xét đề nghị công nhận đảng viên chính thức cho đoàn viên <strong>{previewData.ho_ten}</strong>.
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>I. THÀNH PHẦN THAM DỰ</div>
            <div style={{ paddingLeft: '16px', marginBottom: '6px' }}>
              1. Chủ trì cuộc họp: <strong>{previewData.chu_tri_chi_doan}</strong>
            </div>
            <div style={{ paddingLeft: '16px', marginBottom: '6px' }}>
              2. Thư ký cuộc họp: <strong>{previewData.thu_ky_chi_doan}</strong>
            </div>
            <div style={{ paddingLeft: '16px', marginBottom: '6px' }}>
              3. Tổng số đoàn viên: <strong>{previewData.tong_so_dv_chi_doan}</strong>. Có mặt: <strong>{previewData.tham_gia_chi_doan}</strong>. Vắng: <strong>{previewData.vang_chi_doan}</strong>.
            </div>
            <div style={{ paddingLeft: '16px', marginBottom: '20px' }}>
              Lý do vắng: {previewData.ly_do_vang_chi_doan || '..................'}
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>II. NỘI DUNG CUỘC HỌP</div>
            <div style={indentStyle}>
              Chi Đoàn {previewData.lop} đã tiến hành họp nhận xét thông qua bản tự kiểm điểm của đồng chí <strong>{previewData.ho_ten}</strong> trong suốt thời gian dự bị.
            </div>
            <div style={indentStyle}>
              Hội nghị nhất trí nhận xét về những ưu điểm, khuyết điểm chính của đồng chí <strong>{previewData.ho_ten}</strong> trong suốt quá trình phấn đấu học tập, công tác, rèn luyện tại Chi Đoàn, cụ thể như sau:
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>1. Ưu điểm:</div>
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify', paddingLeft: '16px', marginBottom: '15px' }}>
              {previewData.uu_diem}
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>2. Khuyết điểm:</div>
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify', paddingLeft: '16px', marginBottom: '20px' }}>
              {previewData.khuyet_diem}
            </div>

            <div style={indentStyle}>
              Đối chiếu với tiêu chuẩn và điều kiện chuyển đảng chính thức, Chi Đoàn {previewData.lop} thuộc Liên chi Đoàn khoa {previewData.khoa} giới thiệu và kính đề nghị tổ chức Đoàn, tổ chức Đảng các cấp xem xét chuyển chính thức đúng thời hạn cho đồng chí <strong>{previewData.ho_ten}</strong>.
            </div>

            <div style={indentStyle}>
              Biểu quyết thông qua với sự tán thành của <strong>{previewData.tham_gia_chi_doan}</strong> đoàn viên (đạt <strong>{previewData.ti_le_bb_chi_doan}%</strong>); số không tán thành: <strong>{previewData.khong_tan_thanh_bb_chi_doan || 0}</strong> đồng chí.
            </div>

            <div style={{ ...indentStyle, marginBottom: '40px' }}>
              Tập thể Chi Đoàn {previewData.lop} thuộc Liên chi Đoàn khoa {previewData.khoa} xin chịu hoàn toàn trách nhiệm về những nội dung giới thiệu nêu trên./.
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '40px' }}>
              <div style={{ textAlign: 'center', width: '40%' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '80px' }}>Thư ký</div>
                <div style={{ fontWeight: 'bold' }}>{previewData.thu_ky_chi_doan}</div>
              </div>
              <div style={{ textAlign: 'center', width: '40%' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '80px' }}>Chủ tọa</div>
                <div style={{ fontWeight: 'bold' }}>{previewData.chu_tri_chi_doan}</div>
              </div>
            </div>
          </div>
        );

      case 'nghi_quyet_chi_doan':
        return (
          <div style={dStyle}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <div style={{ textAlign: 'center', width: '50%', fontSize: '11pt' }}>
                LIÊN CHI ĐOÀN KHOA {previewData.khoa_caps || '...............'}<br />
                <div style={{ fontWeight: 'bold' }}>BCH CHI ĐOÀN {previewData.lop || '...............'}</div>
                <div>***</div>
              </div>
              <div style={{ textAlign: 'center', width: '45%', fontSize: '11pt' }}>
                <div style={{ fontWeight: 'bold' }}>ĐOÀN TNCS HỒ CHÍ MINH</div>
                <div style={{ fontStyle: 'italic', marginTop: '4px' }}>Đà Nẵng, ngày {previewData.ngay_ky_d} tháng {previewData.ngay_ky_m} năm {previewData.ngay_ky_y}</div>
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15pt', marginBottom: '25px', textTransform: 'uppercase' }}>
              NGHỊ QUYẾT
              <div style={{ fontSize: '13pt', fontWeight: 'bold', marginTop: '5px', textTransform: 'none' }}>Đề nghị công nhận đảng viên chính thức</div>
            </div>

            {/* Recipient */}
            <div style={{ fontWeight: 'bold', fontSize: '13pt', marginBottom: '25px', textIndent: '24px' }}>
              Kính gửi: Ban Chấp hành Liên chi Đoàn khoa {previewData.khoa || '..................'}
            </div>

            {/* Body */}
            <div style={{ textAlign: 'justify', marginBottom: '8px' }}>
              - Căn cứ điều 5, Điều lệ Đảng Cộng sản Việt Nam.
            </div>
            <div style={{ textAlign: 'justify', marginBottom: '8px' }}>
              - Xét biên bản họp của lớp {previewData.lop}.
            </div>
            <div style={{ textAlign: 'justify', marginBottom: '15px' }}>
              - Xét biên bản họp của Chi Đoàn {previewData.lop}.
            </div>

            <div style={indentStyle}>
              Ban Chấp hành Chi Đoàn {previewData.lop} họp ngày {previewData.ngay_hop_chi_doan_d} tháng {previewData.ngay_hop_chi_doan_m} năm {previewData.ngay_hop_chi_doan_y} xét thấy:
            </div>

            <div style={indentStyle}>
              Đảng viên dự bị <strong>{previewData.ho_ten}</strong> thuộc Chi Đoàn <strong>{previewData.lop}</strong> được kết nạp vào Đảng ngày {previewData.ngay_vao_dang_formatted}, đã nỗ lực, phấn đấu trở thành đảng viên chính thức, nay Ban Chấp hành Chi Đoàn {previewData.lop} kính báo cáo Ban Chấp hành Liên chi Đoàn khoa {previewData.khoa} về những ưu điểm, khuyết điểm chính của đảng viên dự bị <strong>{previewData.ho_ten}</strong>, cụ thể như sau:
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>1. Ưu điểm:</div>
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify', paddingLeft: '16px', marginBottom: '15px' }}>
              {previewData.uu_diem}
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>2. Khuyết điểm:</div>
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify', paddingLeft: '16px', marginBottom: '20px' }}>
              {previewData.khuyet_diem}
            </div>

            <div style={indentStyle}>
              Đối chiếu với tiêu chuẩn và điều kiện chuyển đảng chính thức, Ban Chấp Chi Đoàn {previewData.lop} giới thiệu và kính đề nghị Ban Chấp hành Liên chi Đoàn khoa {previewData.khoa} xem xét đề nghị Ban Chấp hành Đoàn Trường Đại học Kinh tế giới thiệu đảng viên dự bị <strong>{previewData.ho_ten}</strong> trở thành đảng viên chính thức.
            </div>

            <div style={indentStyle}>
              Biểu quyết thông qua với sự tán thành của <strong>{previewData.tan_thanh_chi_doan}</strong> đồng chí Ủy viên Ban Chấp hành Chi Đoàn (đạt <strong>{previewData.ti_le_chi_doan}%</strong>); số không tán thành: <strong>{previewData.khong_tan_thanh_chi_doan || 0}</strong> đồng chí.
            </div>

            <div style={{ ...indentStyle, marginBottom: '40px' }}>
              Ban Chấp hành Chi Đoàn {previewData.lop} xin chịu hoàn toàn trách nhiệm về những nội dung giới thiệu nêu trên./.
            </div>

            {/* Signature */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
              <div style={{ textAlign: 'center', width: '55%' }}>
                <div style={{ fontWeight: 'bold' }}>TM. BAN CHẤP CHI ĐOÀN</div>
                <div style={{ fontWeight: 'bold', marginBottom: '80px' }}>BÍ THƯ</div>
                <div style={{ fontWeight: 'bold' }}>{previewData.bi_thu_chi_doan}</div>
              </div>
            </div>
          </div>
        );

      case 'bien_ban_lcd':
        return (
          <div style={dStyle}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <div style={{ textAlign: 'center', width: '50%', fontSize: '11pt' }}>
                ĐOÀN TRƯỜNG ĐẠI HỌC KINH TẾ<br />
                <div style={{ fontWeight: 'bold' }}>BCH LIÊN CHI ĐOÀN KHOA {previewData.khoa_caps || '...............'}</div>
                <div>***</div>
              </div>
              <div style={{ textAlign: 'center', width: '45%', fontSize: '11pt' }}>
                <div style={{ fontWeight: 'bold' }}>ĐOÀN TNCS HỒ CHÍ MINH</div>
                <div style={{ fontStyle: 'italic', marginTop: '4px' }}>Đà Nẵng, ngày {previewData.ngay_ky_d} tháng {previewData.ngay_ky_m} năm {previewData.ngay_ky_y}</div>
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15pt', marginBottom: '25px', textTransform: 'uppercase' }}>
              BIÊN BẢN
              <div style={{ fontSize: '13pt', fontWeight: 'bold', marginTop: '5px', textTransform: 'none' }}>Họp xét đề nghị công nhận đảng viên chính thức</div>
            </div>

            {/* Body */}
            <div style={indentStyle}>
              Hôm nay, ngày {previewData.ngay_hop_lcd_d} tháng {previewData.ngay_hop_lcd_m} năm {previewData.ngay_hop_lcd_y} tại {previewData.dia_diem_hop_lcd || 'Trường Đại học Kinh tế - Đại học Đà Nẵng.'}
            </div>
            <div style={{ ...indentStyle, marginBottom: '20px' }}>
              Ban Chấp hành Liên chi Đoàn khoa <strong>{previewData.khoa}</strong> trực thuộc Đoàn TNCS Hồ Chí Minh Trường Đại học Kinh tế tổ chức họp xét đề nghị công nhận đảng viên chính thức cho đoàn viên <strong>{previewData.ho_ten}</strong>.
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>I. THÀNH PHẦN THAM DỰ</div>
            <div style={{ paddingLeft: '16px', marginBottom: '6px' }}>
              1. Chủ trì cuộc họp: Đồng chí <strong>{previewData.chu_tri_lcd}</strong> - Bí thư Liên chi Đoàn.
            </div>
            <div style={{ paddingLeft: '16px', marginBottom: '6px' }}>
              2. Thư ký cuộc họp: Đồng chí <strong>{previewData.thu_ky_lcd}</strong>.
            </div>
            <div style={{ paddingLeft: '16px', marginBottom: '20px' }}>
              3. Tổng số ủy viên: <strong>{previewData.tong_so_uy_vien_lcd}</strong> đồng chí. Có mặt: <strong>{previewData.tham_gia_lcd}</strong> đồng chí. Vắng: <strong>{previewData.vang_lcd}</strong>.
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>II. NỘI DUNG CUỘC HỌP</div>
            <div style={indentStyle}>
              Ban Chấp hành Liên chi Đoàn khoa {previewData.khoa} đã tiến hành họp nhận xét thông qua bản nhận xét của Chi Đoàn {previewData.lop} thông qua bản tự kiểm điểm của đồng chí <strong>{previewData.ho_ten}</strong> trong suốt thời gian dự bị.
            </div>
            <div style={indentStyle}>
              Ban Chấp hành Liên chi Đoàn khoa {previewData.khoa} nhất trí nhận xét về những ưu điểm, khuyết điểm chính của đồng chí <strong>{previewData.ho_ten}</strong> trong suốt quá trình phấn đấu học tập, công tác, rèn luyện tại Chi Đoàn {previewData.lop}, cụ thể như sau:
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>1. Ưu điểm:</div>
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify', paddingLeft: '16px', marginBottom: '15px' }}>
              {previewData.uu_diem}
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>2. Khuyết điểm:</div>
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify', paddingLeft: '16px', marginBottom: '20px' }}>
              {previewData.khuyet_diem}
            </div>

            <div style={indentStyle}>
              Đối chiếu với tiêu chuẩn và điều kiện chuyển đảng chính thức, Ban Chấp hành Liên chi Đoàn khoa {previewData.khoa} giới thiệu và kính đề nghị Ban Chấp hành Đoàn Trường Đại học Kinh tế giới thiệu đồng chí <strong>{previewData.ho_ten}</strong> cho tổ chức Đảng các cấp xem xét chuyển chính thức đúng thời hạn.
            </div>

            <div style={indentStyle}>
              Biểu quyết thông qua với sự tán thành của <strong>{previewData.tan_thanh_lcd}</strong> đồng chí Ủy viên Ban Chấp hành Liên chi Đoàn (đạt <strong>{previewData.ti_le_lcd}%</strong>); số không tán thành: <strong>{previewData.khong_tan_thanh_lcd || 0}</strong> đồng chí.
            </div>

            <div style={{ ...indentStyle, marginBottom: '40px' }}>
              Ban Chấp hành Liên chi Đoàn khoa xin chịu hoàn toàn trách nhiệm về những nội dung giới thiệu nêu trên./.
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '40px' }}>
              <div style={{ textAlign: 'center', width: '40%' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '80px' }}>Thư ký</div>
                <div style={{ fontWeight: 'bold' }}>{previewData.thu_ky_lcd}</div>
              </div>
              <div style={{ textAlign: 'center', width: '40%' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '80px' }}>Chủ tọa</div>
                <div style={{ fontWeight: 'bold' }}>{previewData.chu_tri_lcd}</div>
              </div>
            </div>
          </div>
        );

      case 'nghi_quyet_lcd':
        return (
          <div style={dStyle}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <div style={{ textAlign: 'center', width: '50%', fontSize: '11pt' }}>
                ĐOÀN TRƯỜNG ĐẠI HỌC KINH TẾ<br />
                <div style={{ fontWeight: 'bold' }}>BCH LIÊN CHI ĐOÀN KHOA {previewData.khoa_caps || '...............'}</div>
                <div>***</div>
              </div>
              <div style={{ textAlign: 'center', width: '45%', fontSize: '11pt' }}>
                <div style={{ fontWeight: 'bold' }}>ĐOÀN TNCS HỒ CHÍ MINH</div>
                <div style={{ fontStyle: 'italic', marginTop: '4px' }}>Đà Nẵng, ngày {previewData.ngay_ky_d} tháng {previewData.ngay_ky_m} năm {previewData.ngay_ky_y}</div>
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15pt', marginBottom: '25px', textTransform: 'uppercase' }}>
              NGHỊ QUYẾT
              <div style={{ fontSize: '13pt', fontWeight: 'bold', marginTop: '5px', textTransform: 'none' }}>Đề nghị công nhận đảng viên chính thức</div>
            </div>

            {/* Recipient */}
            <div style={{ fontWeight: 'bold', fontSize: '13pt', marginBottom: '25px', textIndent: '24px' }}>
              Kính gửi: Ban Chấp hành Đoàn Trường Đại học Kinh tế.
            </div>

            {/* Body */}
            <div style={{ textAlign: 'justify', marginBottom: '8px' }}>
              - Căn cứ điều 5, Điều lệ Đảng Cộng sản Việt Nam
            </div>
            <div style={{ textAlign: 'justify', marginBottom: '8px' }}>
              - Xét biên bản họp của lớp {previewData.lop}
            </div>
            <div style={{ textAlign: 'justify', marginBottom: '15px' }}>
              - Xét nghị quyết, biên bản họp của Chi Đoàn {previewData.lop}
            </div>

            <div style={indentStyle}>
              Ban Chấp hành Liên chi Đoàn khoa {previewData.khoa} họp ngày {previewData.ngay_hop_lcd_d} tháng {previewData.ngay_hop_lcd_m} năm {previewData.ngay_hop_lcd_y} xét thấy:
            </div>

            <div style={indentStyle}>
              Đảng viên dự bị <strong>{previewData.ho_ten}</strong> Chi Đoàn <strong>{previewData.lop}</strong> được kết nạp vào Đảng ngày {previewData.ngay_vao_dang_formatted}, đã nỗ lực, phấn đấu trở thành đảng viên chính thức, nay Ban Chấp hành Liên chi Đoàn khoa {previewData.khoa} kính báo cáo Ban Chấp hành Đoàn Trường Đại học Kinh tế về những ưu điểm, khuyết điểm chính của đảng viên dự bị <strong>{previewData.ho_ten}</strong>, cụ thể như sau:
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>1. Ưu điểm:</div>
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify', paddingLeft: '16px', marginBottom: '15px' }}>
              {previewData.uu_diem}
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>2. Khuyết điểm:</div>
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify', paddingLeft: '16px', marginBottom: '20px' }}>
              {previewData.khuyet_diem}
            </div>

            <div style={indentStyle}>
              Đối chiếu với tiêu chuẩn và điều kiện chuyển đảng chính thức, Ban Chấp hành Liên chi Đoàn khoa {previewData.khoa} giới thiệu và kính đề nghị Ban Chấp hành Đoàn Trường Đại học Kinh tế - Đại học Đà Nẵng xem xét đề nghị tổ chức Đảng các cấp công nhận đảng viên dự bị <strong>{previewData.ho_ten}</strong> trở thành đảng viên chính thức
            </div>

            <div style={indentStyle}>
              Biểu quyết thông qua với sự tán thành của <strong>{previewData.tan_thanh_lcd}</strong> đồng chí Ủy viên Ban Chấp hành Liên chi Đoàn (đạt <strong>{previewData.ti_le_lcd}%</strong>); số không tán thành: <strong>{previewData.khong_tan_thanh_lcd || 0}</strong> đồng chí.
            </div>

            <div style={{ ...indentStyle, marginBottom: '40px' }}>
              Ban Chấp hành Liên chi Đoàn khoa {previewData.khoa} xin chịu hoàn toàn trách nhiệm về những nội dung giới thiệu nêu trên./.
            </div>

            {/* Signature */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
              <div style={{ textAlign: 'center', width: '55%' }}>
                <div style={{ fontWeight: 'bold' }}>TM. BAN CHẤP HÀNH LIÊN CHI ĐOÀN</div>
                <div style={{ fontWeight: 'bold', marginBottom: '80px' }}>BÍ THƯ</div>
                <div style={{ fontWeight: 'bold' }}>{previewData.bi_thu_lcd}</div>
              </div>
            </div>
          </div>
        );

      case 'nghi_quyet_doan_truong':
        return (
          <div style={dStyle}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <div style={{ textAlign: 'center', width: '50%', fontSize: '11pt' }}>
                ĐOÀN ĐẠI HỌC ĐÀ NẴNG<br />
                <div style={{ fontWeight: 'bold' }}>BCH ĐOÀN TRƯỜNG ĐH KINH TẾ</div>
                <div style={{ fontWeight: 'bold' }}>Số: {previewData.so_nq_doan_truong || '.......-NQ/ĐHKT-ĐTN'}</div>
                <div>***</div>
              </div>
              <div style={{ textAlign: 'center', width: '45%', fontSize: '11pt' }}>
                <div style={{ fontWeight: 'bold' }}>ĐOÀN TNCS HỒ CHÍ MINH</div>
                <div style={{ fontStyle: 'italic', marginTop: '4px' }}>Đà Nẵng, ngày {previewData.ngay_ky_d} tháng {previewData.ngay_ky_m} năm {previewData.ngay_ky_y}</div>
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15pt', marginBottom: '25px', textTransform: 'uppercase' }}>
              NGHỊ QUYẾT
              <div style={{ fontSize: '13pt', fontWeight: 'bold', marginTop: '5px', textTransform: 'none' }}>Đề nghị công nhận đảng viên chính thức</div>
            </div>

            {/* Recipient */}
            <div style={{ fontWeight: 'bold', fontSize: '13pt', marginBottom: '25px', textIndent: '24px' }}>
              Kính gửi: - Chi ủy Chi bộ Sinh viên;<br />
              <div style={{ paddingLeft: '57px' }}>- Đảng ủy Trường Đại học Kinh tế - Đại học Đà Nẵng.</div>
            </div>

            {/* Body */}
            <div style={{ textAlign: 'justify', marginBottom: '8px' }}>
              - Căn cứ điểm 5, Điều lệ Đảng Cộng sản Việt Nam
            </div>
            <div style={{ textAlign: 'justify', marginBottom: '8px' }}>
              - Xét biên bản họp của lớp {previewData.lop}
            </div>
            <div style={{ textAlign: 'justify', marginBottom: '8px' }}>
              - Xét nghị quyết, biên bản họp của Chi Đoàn {previewData.lop}
            </div>
            <div style={{ textAlign: 'justify', marginBottom: '15px' }}>
              - Xét nghị quyết, biên bản họp của Liên chi Đoàn khoa {previewData.khoa}
            </div>

            <div style={indentStyle}>
              Ban Chấp hành Đoàn TNCS Hồ Chí Minh Trường Đại học Kinh tế - Đại học Đà Nẵng họp ngày {previewData.ngay_hop_doan_truong_d} tháng {previewData.ngay_hop_doan_truong_m} năm {previewData.ngay_hop_doan_truong_y} xét thấy:
            </div>

            <div style={indentStyle}>
              Đảng viên dự bị <strong>{previewData.ho_ten}</strong> được kết nạp vào Đảng ngày {previewData.ngay_vao_dang_formatted}, đã nỗ lực, phấn đấu trở thành đảng viên chính thức, nay Ban Chấp hành Đoàn Trường Đại học Kinh tế kính báo cáo tổ chức Đảng các cấp về những ưu điểm, khuyết điểm chính của đoàn viên <strong>{previewData.ho_ten}</strong> trong suốt thời gian dự bị, cụ thể như sau:
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>1. Ưu điểm:</div>
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify', paddingLeft: '16px', marginBottom: '15px' }}>
              {previewData.uu_diem}
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>2. Khuyết điểm:</div>
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify', paddingLeft: '16px', marginBottom: '20px' }}>
              {previewData.khuyet_diem}
            </div>

            <div style={indentStyle}>
              Đối chiếu với tiêu chuẩn và điều kiện chuyển đảng chính thức, Ban Chấp hành Đoàn Trường Đại học Kinh tế giới thiệu và kính đề nghị Chi ủy Chi bộ Sinh viên, Đảng uỷ Trường Đại học Kinh tế xem xét, công nhận đảng viên dự bị <strong>{previewData.ho_ten}</strong> trở thành đảng viên chính thức.
            </div>

            <div style={indentStyle}>
              Biểu quyết thông qua với sự tán thành của <strong>{previewData.tan_thanh_doan_truong}</strong> đồng chí Ủy viên Ban Chấp hành Đoàn Trường (đạt <strong>{previewData.ti_le_doan_truong}%</strong>); số không tán thành: <strong>{previewData.khong_tan_thanh_doan_truong || 0}</strong> đồng chí.
            </div>

            <div style={{ ...indentStyle, marginBottom: '40px' }}>
              Ban Chấp hành Đoàn Trường Đại học Kinh tế xin hoàn toàn chịu trách nhiệm về những nội dung giới thiệu nói trên./.
            </div>

            {/* Signature */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', fontSize: '11pt' }}>
              <div style={{ width: '40%' }}>
                <div style={{ fontWeight: 'bold', fontStyle: 'italic' }}>Nơi nhận:</div>
                <div>- Như trên;</div>
                <div>- Lưu: VP.</div>
              </div>
              <div style={{ textAlign: 'center', width: '55%' }}>
                <div style={{ fontWeight: 'bold' }}>TM. BAN CHẤP HÀNH ĐOÀN TRƯỜNG</div>
                <div style={{ fontWeight: 'bold', marginBottom: '80px' }}>BÍ THƯ</div>
                <div style={{ fontWeight: 'bold' }}>{previewData.bi_thu_doan_truong}</div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ fontFamily: "'SVN-Gilroy','Inter',sans-serif", maxWidth: 1200, margin: '0 auto', padding: '12px 16px 32px 16px' }}>
      
      {/* Page Title Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20, 
        borderBottom: '1px solid #e2e8f0', 
        paddingBottom: 12, 
        flexWrap: 'wrap', 
        gap: 16 
      }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>
            Tạo Biểu Mẫu Hồ Sơ Chính Thức
          </Title>
          <Text type="secondary" style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
            Tự động điền dữ liệu và xuất 7 biểu mẫu hành chính chuyển Đảng chính thức chuẩn định dạng ban hành
          </Text>
        </div>
        
        {isManager && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="premium-input-wrapper">
            <Text style={{ fontWeight: 800, color: '#475569', fontSize: 12.5 }}>Chọn Đảng viên dự bị:</Text>
            <Select
              showSearch
              style={{ width: 230 }}
              placeholder="Tìm theo Tên hoặc MSSV..."
              optionFilterProp="children"
              value={selectedMember?.id}
              onChange={(val) => setSelectedMember(probationaryList.find(m => m.id === val))}
            >
              {probationaryList.map(m => (
                <Option key={m.id} value={m.id}>{m.ho_ten} ({m.mssv})</Option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {loadingProfile ? (
        <Card bordered={false} className="premium-card" style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" tip="Đang chuẩn bị dữ liệu hồ sơ..." />
        </Card>
      ) : (
        <>
          {/* TOP PROFILE HORIZONTAL PANEL */}
          {selectedMember && (
            <Card 
              bordered={false} 
              style={{ 
                borderRadius: '16px', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)', 
                marginBottom: 20, 
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #e2e8f0',
                overflow: 'hidden'
              }}
              bodyStyle={{ padding: '16px 20px' }}
            >
              <Row gutter={[24, 16]} align="middle">
                <Col xs={24} sm={12} md={6} style={{ display: 'flex', alignItems: 'center', gap: 14, borderRight: '1px solid #f1f5f9' }}>
                  <Avatar 
                    size={48} 
                    icon={<UserOutlined />} 
                    src={getAvatarUrl(selectedMember.anh_ca_nhan)} 
                    style={{ 
                      border: '2px solid #c62828', 
                      boxShadow: '0 4px 10px rgba(198, 40, 40, 0.1)',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 15, lineHeight: 1.2, letterSpacing: '-0.3px' }}>
                      {selectedMember.ho_ten}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginTop: 2 }}>
                      MSSV: {selectedMember.mssv}
                    </Text>
                  </div>
                </Col>
                
                <Col xs={12} sm={6} md={4} style={{ borderRight: '1px solid #f1f5f9' }}>
                  <Text type="secondary" style={{ fontSize: 9.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                    Chi đoàn
                  </Text>
                  <Text style={{ fontWeight: 700, color: '#334155', fontSize: 12.5 }}>
                    {selectedMember.lop || 'Chưa nhập'}
                  </Text>
                </Col>
                
                <Col xs={12} sm={6} md={5} style={{ borderRight: '1px solid #f1f5f9' }}>
                  <Text type="secondary" style={{ fontSize: 9.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                    Khoa chuyên môn
                  </Text>
                  <Text style={{ fontWeight: 700, color: '#334155', fontSize: 12.5 }}>
                    {selectedMember.khoa || 'Chưa nhập'}
                  </Text>
                </Col>
                
                <Col xs={12} sm={6} md={4} style={{ borderRight: '1px solid #f1f5f9' }}>
                  <Text type="secondary" style={{ fontSize: 9.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                    Ngày vào Đảng
                  </Text>
                  <Text style={{ fontWeight: 700, color: '#334155', fontSize: 12.5 }}>
                    {selectedMember.ngay_vao_dang ? dayjs(selectedMember.ngay_vao_dang).format('DD/MM/YYYY') : 'Chưa nhập'}
                  </Text>
                </Col>
                
                <Col xs={12} sm={6} md={5}>
                  <Text type="secondary" style={{ fontSize: 9.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                    Người hướng dẫn
                  </Text>
                  <Text style={{ fontWeight: 700, color: '#334155', fontSize: 12.5 }}>
                    {selectedMember.dvhd || 'Chưa nhập'}
                  </Text>
                </Col>
              </Row>
            </Card>
          )}

          {/* MAIN 2-COLUMN BOTTOM WORKSPACE */}
          {selectedMember ? (
            <Row gutter={20}>
              
              {/* COLUMN 1: LEFT DOCUMENT LIST MENU (span 9) */}
              <Col xs={24} md={10} lg={9} style={{ marginBottom: 20 }}>
                <Card bordered={false} className="premium-card" bodyStyle={{ padding: '16px' }}>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: 13.5, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AuditOutlined style={{ color: '#c62828', fontSize: 15 }} />
                    Danh sách & Thao tác biểu mẫu
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { key: 'ban_tu_kiem_diem', label: '1. Bản tự kiểm điểm', color: '#dc2626', desc: 'Mẫu 10-KND' },
                      { key: 'nghi_quyet_doan_truong', label: '2. NQ giới thiệu Đoàn Trường', color: '#b91c1c', desc: 'QĐ 02 bản' },
                      { key: 'nghi_quyet_lcd', label: '3. Nghị quyết LCĐ khoa', color: '#b91c1c', desc: 'Mẫu 1' },
                      { key: 'bien_ban_lcd', label: '4. Biên bản họp LCĐ khoa', color: '#2563eb', desc: 'Mẫu 3' },
                      { key: 'nghi_quyet_chi_doan', label: '5. Nghị quyết Chi Đoàn', color: '#b91c1c', desc: 'Mẫu 4' },
                      { key: 'bien_ban_chi_doan', label: '6. Biên bản họp Chi Đoàn', color: '#2563eb', desc: 'Mẫu 5' },
                      { key: 'bien_ban_hop_lop', label: '7. Biên bản họp lớp sinh hoạt', color: '#2563eb', desc: 'Mẫu 6' }
                    ].map((doc) => {
                      const isActive = activeTab === doc.key;
                      return (
                        <div 
                          key={doc.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '9px 12px',
                            background: isActive ? '#ffffff' : '#f8fafc',
                            borderRadius: '10px',
                            border: isActive ? '1px solid rgba(198, 40, 40, 0.2)' : '1px solid #e2e8f0',
                            boxShadow: isActive ? '0 4px 12px rgba(198, 40, 40, 0.05)' : 'none',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                        >
                          {/* Actions on the LEFT */}
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <Button 
                              icon={<EyeOutlined />} 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreview(doc.key);
                              }}
                              style={{ 
                                height: 26, 
                                width: 26, 
                                padding: 0, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                borderRadius: '5px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#475569'
                              }}
                              title="Xem trước bản in (A4)"
                            />
                            <Button 
                              icon={<FileWordOutlined />} 
                              size="small" 
                              loading={exporting === doc.key}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExport(doc.key);
                              }}
                              style={{ 
                                height: 26, 
                                width: 26, 
                                padding: 0, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                borderRadius: '5px',
                                background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                                border: 'none',
                                boxShadow: 'none',
                                color: '#ffffff'
                              }}
                              title="Tải file Word (.docx)"
                            />
                          </div>

                          {/* Text/Label - clicking switches active form */}
                          <div 
                            onClick={() => setActiveTab(doc.key)}
                            style={{ 
                              minWidth: 0, 
                              flex: 1, 
                              cursor: 'pointer',
                              padding: '2px 0'
                            }}
                          >
                            <div style={{ 
                              fontWeight: isActive ? 900 : 700, 
                              color: isActive ? '#c62828' : '#334155', 
                              fontSize: '12px',
                              lineHeight: 1.2,
                              transition: 'color 0.2s ease'
                            }}>
                              {doc.label}
                            </div>
                            <div style={{ 
                              fontSize: '9.5px', 
                              color: isActive ? '#ef4444' : '#64748b',
                              fontWeight: 600,
                              marginTop: 1
                            }}>
                              {doc.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <Divider style={{ margin: '12px 0' }} />
                  
                  <Button 
                    className="premium-btn-primary" 
                    icon={<FileZipOutlined />} 
                    size="large"
                    loading={exportingAll}
                    onClick={handleExportAll}
                    style={{ 
                      width: '100%',
                      height: 38, 
                      fontSize: 12.5,
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
                      border: 'none',
                      color: '#ffffff',
                      boxShadow: '0 3px 8px rgba(22, 101, 52, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    Xuất trọn bộ ZIP (.zip)
                  </Button>

                  {/* Nút chuyển sang tab quản lý biểu mẫu - CHỈ ADMIN */}
                  {isAdmin && (
                    <>
                      <Divider style={{ margin: '12px 0' }} />
                      <div
                        onClick={() => setActiveTab('quan_ly_bieu_mau')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '9px 12px',
                          background: activeTab === 'quan_ly_bieu_mau' ? '#eff6ff' : '#f8fafc',
                          borderRadius: '10px',
                          border: activeTab === 'quan_ly_bieu_mau' ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <SettingOutlined style={{ color: activeTab === 'quan_ly_bieu_mau' ? '#2563eb' : '#64748b', fontSize: 14 }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 12, color: activeTab === 'quan_ly_bieu_mau' ? '#1d4ed8' : '#334155' }}>
                            Quản lý biểu mẫu
                          </div>
                          <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 600 }}>
                            Upload / thay thế file mẫu .docx
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </Col>

              {/* COLUMN 2: RIGHT FORM WORKSPACE PANEL (span 15) */}
              <Col xs={24} md={14} lg={15} style={{ marginBottom: 20 }}>
                <Card bordered={false} className="premium-card" bodyStyle={{ padding: '20px 24px' }}>
                  <Form form={form} layout="vertical">

                    
                    {/* Hidden Sync Fields */}
                    <div style={{ display: 'none' }}>
                      <Form.Item name="ho_ten"><Input /></Form.Item>
                      <Form.Item name="mssv"><Input /></Form.Item>
                      <Form.Item name="lop"><Input /></Form.Item>
                      <Form.Item name="khoa"><Input /></Form.Item>
                      <Form.Item name="ngay_sinh"><DatePicker /></Form.Item>
                      <Form.Item name="ngay_vao_dang"><DatePicker /></Form.Item>
                      <Form.Item name="que_quan"><Input /></Form.Item>
                      <Form.Item name="dia_chi_thuong_tru"><Input /></Form.Item>
                      <Form.Item name="dia_chi_tam_tru"><Input /></Form.Item>
                      <Form.Item name="dvhd"><Input /></Form.Item>
                      <Form.Item name="cccd"><Input /></Form.Item>
                      <Form.Item name="gioi_tinh"><Input /></Form.Item>
                      <Form.Item name="sdt"><Input /></Form.Item>
                      <Form.Item name="email"><Input /></Form.Item>
                    </div>

                    <div className="premium-input-wrapper" style={{ minHeight: 460 }}>
                      
                      {/* TAB 1: BẢN TỰ KIỂM ĐIỂM */}
                      {activeTab === 'ban_tu_kiem_diem' && (
                        <div>
                          <div className="premium-info-banner" style={{ display: 'flex', gap: 12, padding: '10px 14px', borderRadius: '8px', background: '#fee2e2', marginBottom: 16 }}>
                            <AuditOutlined style={{ color: '#c62828', fontSize: 18, marginTop: 2 }} />
                            <div>
                              <div style={{ fontWeight: 800, color: '#c62828', fontSize: 13.5, marginBottom: 2 }}>Bản tự kiểm điểm (Mẫu 10-KND)</div>
                              <div style={{ fontSize: 12, color: '#450a0a', lineHeight: 1.4 }}>
                                Quá trình học tập và rèn luyện để đảng viên dự bị tự kiểm điểm đề nghị chuyển Đảng chính thức.
                              </div>
                            </div>
                          </div>

                          <Divider orientation="left" style={{ margin: '16px 0 12px 0' }}>
                            <span style={{ color: '#475569', fontWeight: 800, fontSize: 12 }}>
                              Đơn vị & Tổ chức Đảng
                            </span>
                          </Divider>

                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item name="chi_bo_ket_nap" label={<span className="premium-form-label">Chi bộ kết nạp <span style={{color:'#ef4444'}}>*</span></span>}>
                                <Input placeholder="Chi bộ Sinh viên" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name="co_quan_cong_tac" label={<span className="premium-form-label">Cơ quan công tác <span style={{color:'#ef4444'}}>*</span></span>}>
                                <Input placeholder="Trường Đại học Kinh tế - Đại học Đà Nẵng" />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item name="chi_bo_sinh_hoat" label={<span className="premium-form-label">Chi bộ sinh hoạt <span style={{color:'#ef4444'}}>*</span></span>}>
                                <Input placeholder="Chi bộ Sinh viên" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name="ngay_ky" label={<span className="premium-form-label">Ngày ký <span style={{fontWeight:500,color:'#94a3b8'}}>(để trống nếu chưa có)</span></span>}>
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Để trống - điền tay sau" />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Divider orientation="left" style={{ margin: '16px 0 12px 0' }}>
                            <span style={{ color: '#475569', fontWeight: 800, fontSize: 12 }}>
                              Đánh giá & Rèn luyện
                            </span>
                          </Divider>

                          <Form.Item name="uu_diem" label={<span className="premium-form-label">Ưu điểm nổi bật <span style={{color:'#ef4444'}}>*</span></span>}>
                            <TextArea rows={5} placeholder="Các ưu điểm chính về tư tưởng, đạo đức, học tập, rèn luyện..." />
                          </Form.Item>

                          <Form.Item name="khuyet_diem" label={<span className="premium-form-label">Khuyết điểm, hạn chế <span style={{color:'#ef4444'}}>*</span></span>}>
                            <TextArea rows={3} placeholder="Những mặt còn hạn chế cần cải thiện..." />
                          </Form.Item>

                          <Form.Item name="bien_phap_khac_phuc" label={<span className="premium-form-label">Biện pháp khắc phục khuyết điểm <span style={{fontWeight:500,color:'#94a3b8'}}>(không bắt buộc)</span></span>}>
                            <TextArea rows={3} placeholder="Hướng phấn đấu rèn luyện sửa đổi... (để trống nếu không cần)" />
                          </Form.Item>

                          {/* Action Buttons directly under the Form */}
                          <Divider style={{ margin: '20px 0 12px 0' }} />
                          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <Button
                              icon={<EyeOutlined />}
                              onClick={() => handlePreview('ban_tu_kiem_diem')}
                              style={{ borderRadius: '6px', fontWeight: 700 }}
                            >
                              Xem trước bản in
                            </Button>
                            <Button
                              type="primary"
                              icon={<FileWordOutlined />}
                              onClick={() => handleExport('ban_tu_kiem_diem')}
                              style={{ borderRadius: '6px', fontWeight: 700, backgroundColor: '#c62828', borderColor: '#c62828' }}
                            >
                              Tải file Word
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* TAB 2: NGHỊ QUYẾT ĐOÀN TRƯỜNG */}
                      {activeTab === 'nghi_quyet_doan_truong' && (
                        <div>
                          <div className="premium-info-banner" style={{ display: 'flex', gap: 12, padding: '10px 14px', borderRadius: '8px', background: '#fee2e2', marginBottom: 16 }}>
                            <SettingOutlined style={{ color: '#c62828', fontSize: 18, marginTop: 2 }} />
                            <div>
                              <div style={{ fontWeight: 800, color: '#c62828', fontSize: 13.5, marginBottom: 2 }}>Nghị quyết Đoàn Trường (Mẫu 1)</div>
                              <div style={{ fontSize: 12, color: '#450a0a', lineHeight: 1.4 }}>
                                Nghị quyết BCH Đoàn trường đề nghị lên Chi bộ xem xét và biểu quyết công nhận chính thức.
                              </div>
                            </div>
                          </div>

                          <Divider orientation="left" style={{ margin: '16px 0 12px 0' }}>
                            <span style={{ color: '#475569', fontWeight: 800, fontSize: 12 }}>
                              Thông tin Quyết nghị Đoàn Trường
                            </span>
                          </Divider>

                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item name="so_nq_doan_truong" label={<span className="premium-form-label">Số nghị quyết <span style={{fontWeight:500,color:'#94a3b8'}}>(điền số vào trước "-NQ/ĐTN-ĐHKT")</span></span>}>
                                <Input placeholder="Vd: 15-NQ/ĐTN-ĐHKT" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name="ngay_hop_doan_truong" label={<span className="premium-form-label">Ngày họp Đoàn Trường <span style={{fontWeight:500,color:'#94a3b8'}}>(để trống → chỉ in năm)</span></span>}>
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Để trống → chỉ in năm hiện tại" />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item name="tan_thanh_doan_truong" label={<span className="premium-form-label">Số ủy viên tán thành (100%) <span style={{color:'#ef4444'}}>*</span></span>}>
                                <InputNumber min={1} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name="bi_thu_doan_truong" label={<span className="premium-form-label">Bí thư Đoàn Trường ký NQ <span style={{fontWeight:500,color:'#94a3b8'}}>(để trống - điền sau)</span></span>}>
                                <Input placeholder="Để trống - điền tay sau" />
                              </Form.Item>
                            </Col>
                          </Row>

                          {/* Action Buttons directly under the Form */}
                          <Divider style={{ margin: '20px 0 12px 0' }} />
                          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <Button
                              icon={<EyeOutlined />}
                              onClick={() => handlePreview('nghi_quyet_doan_truong')}
                              style={{ borderRadius: '6px', fontWeight: 700 }}
                            >
                              Xem trước bản in
                            </Button>
                            <Button
                              type="primary"
                              icon={<FileWordOutlined />}
                              onClick={() => handleExport('nghi_quyet_doan_truong')}
                              style={{ borderRadius: '6px', fontWeight: 700, backgroundColor: '#c62828', borderColor: '#c62828' }}
                            >
                              Tải file Word
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* TAB 3 & 4: LIÊN CHI ĐOÀN KHOA */}
                      {(activeTab === 'nghi_quyet_lcd' || activeTab === 'bien_ban_lcd') && (
                        <div>
                          <div className="premium-info-banner" style={{ display: 'flex', gap: 12, padding: '10px 14px', borderRadius: '8px', background: '#fee2e2', marginBottom: 16 }}>
                            <StarOutlined style={{ color: '#c62828', fontSize: 18, marginTop: 2 }} />
                            <div>
                              <div style={{ fontWeight: 800, color: '#c62828', fontSize: 13.5, marginBottom: 2 }}>Liên chi Đoàn giới thiệu (Mẫu 1 & Mẫu 3)</div>
                              <div style={{ fontSize: 12, color: '#450a0a', lineHeight: 1.4 }}>
                                BCH Liên chi Đoàn khoa họp xét và quyết nghị giới thiệu Đảng viên chuyển chính thức.
                              </div>
                            </div>
                          </div>

                          <Divider orientation="left" style={{ margin: '16px 0 12px 0' }}>
                            <span style={{ color: '#475569', fontWeight: 800, fontSize: 12 }}>
                              Thông tin cuộc họp LCĐ khoa
                            </span>
                          </Divider>

                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item name="ngay_hop_lcd" label={<span className="premium-form-label">Ngày họp Liên chi Đoàn <span style={{fontWeight:500,color:'#94a3b8'}}>(để trống → chỉ in năm)</span></span>}>
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Để trống → chỉ in năm hiện tại" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name="dia_diem_hop_lcd" label={<span className="premium-form-label">Địa điểm họp</span>}>
                                <Input placeholder="Trường Đại học Kinh tế" />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item name="chu_tri_lcd" label={<span className="premium-form-label">Chủ trì (Bí thư LCĐ) <span style={{color:'#ef4444'}}>*</span></span>}>
                                <Input placeholder="Trần Thị Lan Trinh" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name="thu_ky_lcd" label={<span className="premium-form-label">Thư ký cuộc họp <span style={{color:'#ef4444'}}>*</span></span>}>
                                <Input placeholder="Nguyễn Thị Xuân Hòa" />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Divider orientation="left" style={{ margin: '16px 0 12px 0' }}>
                            <span style={{ color: '#475569', fontWeight: 800, fontSize: 12 }}>
                              Thành viên BCH LCĐ biểu quyết
                            </span>
                          </Divider>

                          <Row gutter={16}>
                            <Col span={8}>
                              <Form.Item name="tong_so_uy_vien_lcd" label={<span className="premium-form-label">Tổng số ủy viên <span style={{color:'#ef4444'}}>*</span></span>}>
                                <InputNumber min={1} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item name="tham_gia_lcd" label={<span className="premium-form-label">Ủy viên tham gia <span style={{color:'#ef4444'}}>*</span></span>}>
                                <InputNumber min={1} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item name="vang_lcd" label={<span className="premium-form-label">Ủy viên vắng</span>}>
                                <InputNumber min={0} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Row gutter={16}>
                            <Col span={24}>
                              <Form.Item name="bi_thu_lcd" label={<span className="premium-form-label">Bí thư Liên chi Đoàn ký NQ <span style={{color:'#ef4444'}}>*</span></span>}>
                                <Input placeholder="Tên Bí thư Liên chi Đoàn..." />
                              </Form.Item>
                            </Col>
                          </Row>

                          {/* Action Buttons directly under the Form */}
                          <Divider style={{ margin: '20px 0 12px 0' }} />
                          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <div style={{ marginRight: 'auto', display: 'flex', gap: 6 }}>
                              <Text style={{ fontWeight: 800, color: '#64748b', fontSize: 11.5 }}>Đang chọn:</Text>
                              <span style={{ fontWeight: 800, color: '#c62828', background: '#fee2e2', padding: '1px 8px', borderRadius: '12px', fontSize: 11 }}>
                                {activeTab === 'nghi_quyet_lcd' ? '3. Nghị quyết' : '4. Biên bản'}
                              </span>
                            </div>
                            <Button
                              icon={<EyeOutlined />}
                              onClick={() => handlePreview(activeTab)}
                              style={{ borderRadius: '6px', fontWeight: 700 }}
                            >
                              Xem trước
                            </Button>
                            <Button
                              type="primary"
                              icon={<FileWordOutlined />}
                              onClick={() => handleExport(activeTab)}
                              style={{ borderRadius: '6px', fontWeight: 700, backgroundColor: '#c62828', borderColor: '#c62828' }}
                            >
                              Tải file Word
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* TAB 5 & 6: CHI ĐOÀN CƠ SỞ */}
                      {(activeTab === 'nghi_quyet_chi_doan' || activeTab === 'bien_ban_chi_doan') && (
                        <div>
                          <div className="premium-info-banner" style={{ display: 'flex', gap: 12, padding: '10px 14px', borderRadius: '8px', background: '#fee2e2', marginBottom: 16 }}>
                            <BookOutlined style={{ color: '#c62828', fontSize: 18, marginTop: 2 }} />
                            <div>
                              <div style={{ fontWeight: 800, color: '#c62828', fontSize: 13.5, marginBottom: 2 }}>Chi đoàn giới thiệu (Mẫu 4 & Mẫu 5)</div>
                              <div style={{ fontSize: 12, color: '#450a0a', lineHeight: 1.4 }}>
                                Xét quyết nghị giới thiệu và Biên bản họp BCH Chi đoàn bảo đảm chuyển Đảng chính thức.
                              </div>
                            </div>
                          </div>

                          <Divider orientation="left" style={{ margin: '16px 0 12px 0' }}>
                            <span style={{ color: '#475569', fontWeight: 800, fontSize: 12 }}>
                              Thông tin cuộc họp Chi đoàn
                            </span>
                          </Divider>

                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item name="ngay_hop_chi_doan" label={<span className="premium-form-label">Ngày họp Chi đoàn <span style={{fontWeight:500,color:'#94a3b8'}}>(để trống → chỉ in năm)</span></span>}>
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Để trống → chỉ in năm hiện tại" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name="bi_thu_chi_doan" label={<span className="premium-form-label">Bí thư Chi đoàn ký NQ <span style={{color:'#ef4444'}}>*</span></span>}>
                                <Input placeholder="Tên Bí thư Chi đoàn..." />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item name="chu_tri_chi_doan" label={<span className="premium-form-label">Chủ trì cuộc họp <span style={{color:'#ef4444'}}>*</span></span>}>
                                <Input placeholder="Bí thư Chi đoàn" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name="thu_ky_chi_doan" label={<span className="premium-form-label">Thư ký cuộc họp <span style={{color:'#ef4444'}}>*</span></span>}>
                                <Input placeholder="Phó Bí thư Chi đoàn" />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Divider orientation="left" style={{ margin: '16px 0 12px 0' }}>
                            <span style={{ color: '#475569', fontWeight: 800, fontSize: 12 }}>
                              Hiện diện & Biểu quyết
                            </span>
                          </Divider>

                          <Row gutter={16}>
                            <Col span={6}>
                              <Form.Item name="tong_so_dv_chi_doan" label={<span className="premium-form-label">Tổng đoàn viên <span style={{color:'#ef4444'}}>*</span></span>}>
                                <InputNumber min={1} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item name="tham_gia_chi_doan" label={<span className="premium-form-label">Tham gia <span style={{color:'#ef4444'}}>*</span></span>}>
                                <InputNumber min={1} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item name="vang_chi_doan" label={<span className="premium-form-label">Vắng mặt</span>}>
                                <InputNumber min={0} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item name="ly_do_vang_chi_doan" label={<span className="premium-form-label">Lý do vắng</span>}>
                                <Input placeholder="Để trống nếu không vắng" />
                              </Form.Item>
                            </Col>
                          </Row>

                          {/* Action Buttons directly under the Form */}
                          <Divider style={{ margin: '20px 0 12px 0' }} />
                          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <div style={{ marginRight: 'auto', display: 'flex', gap: 6 }}>
                              <Text style={{ fontWeight: 800, color: '#64748b', fontSize: 11.5 }}>Đang chọn:</Text>
                              <span style={{ fontWeight: 800, color: '#c62828', background: '#fee2e2', padding: '1px 8px', borderRadius: '12px', fontSize: 11 }}>
                                {activeTab === 'nghi_quyet_chi_doan' ? '5. Nghị quyết' : '6. Biên bản'}
                              </span>
                            </div>
                            <Button
                              icon={<EyeOutlined />}
                              onClick={() => handlePreview(activeTab)}
                              style={{ borderRadius: '6px', fontWeight: 700 }}
                            >
                              Xem trước
                            </Button>
                            <Button
                              type="primary"
                              icon={<FileWordOutlined />}
                              onClick={() => handleExport(activeTab)}
                              style={{ borderRadius: '6px', fontWeight: 700, backgroundColor: '#c62828', borderColor: '#c62828' }}
                            >
                              Tải file Word
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* TAB 7: BIÊN BẢN HỌP LỚP */}
                      {activeTab === 'bien_ban_hop_lop' && (
                        <div>
                          <div className="premium-info-banner" style={{ display: 'flex', gap: 12, padding: '10px 14px', borderRadius: '8px', background: '#fee2e2', marginBottom: 16 }}>
                            <TeamOutlined style={{ color: '#c62828', fontSize: 18, marginTop: 2 }} />
                            <div>
                              <div style={{ fontWeight: 800, color: '#c62828', fontSize: 13.5, marginBottom: 2 }}>Biên bản họp lớp (Mẫu 6)</div>
                              <div style={{ fontSize: 12, color: '#450a0a', lineHeight: 1.4 }}>
                                Tập thể lớp sinh hoạt họp xét đề nghị công nhận đảng viên chính thức cho sinh viên.
                              </div>
                            </div>
                          </div>

                          <Divider orientation="left" style={{ margin: '16px 0 12px 0' }}>
                            <span style={{ color: '#475569', fontWeight: 800, fontSize: 12 }}>
                              Ban điều hành & Cuộc họp
                            </span>
                          </Divider>

                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item name="ngay_hop_lop" label={<span className="premium-form-label">Ngày họp lớp <span style={{fontWeight:500,color:'#94a3b8'}}>(để trống → chỉ in năm)</span></span>}>
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Để trống → chỉ in năm hiện tại" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name="gvcn" label={<span className="premium-form-label">Giảng viên chủ nhiệm</span>}>
                                <Input placeholder="ThS. Nguyễn Văn A" />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item name="chu_tri_lop" label={<span className="premium-form-label">Chủ trì cuộc họp <span style={{color:'#ef4444'}}>*</span></span>}>
                                <Input placeholder="Lớp trưởng" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name="thu_ky_lop" label={<span className="premium-form-label">Thư ký cuộc họp <span style={{color:'#ef4444'}}>*</span></span>}>
                                <Input placeholder="Bí thư Chi đoàn" />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Divider orientation="left" style={{ margin: '16px 0 12px 0' }}>
                            <span style={{ color: '#475569', fontWeight: 800, fontSize: 12 }}>
                              Số liệu Hiện diện & Biểu quyết
                            </span>
                          </Divider>

                          <Row gutter={16}>
                            <Col span={8}>
                              <Form.Item name="tong_so_sv_lop" label={<span className="premium-form-label">Tổng sinh viên <span style={{color:'#ef4444'}}>*</span></span>}>
                                <InputNumber min={1} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item name="tham_gia_lop" label={<span className="premium-form-label">Sinh viên tham gia <span style={{color:'#ef4444'}}>*</span></span>}>
                                <InputNumber min={1} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item name="vang_lop" label={<span className="premium-form-label">Sinh viên vắng</span>}>
                                <InputNumber min={0} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          </Row>

                          {/* Action Buttons directly under the Form */}
                          <Divider style={{ margin: '20px 0 12px 0' }} />
                          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <Button
                              icon={<EyeOutlined />}
                              onClick={() => handlePreview('bien_ban_hop_lop')}
                              style={{ borderRadius: '6px', fontWeight: 700 }}
                            >
                              Xem trước bản in
                            </Button>
                            <Button
                              type="primary"
                              icon={<FileWordOutlined />}
                              onClick={() => handleExport('bien_ban_hop_lop')}
                              style={{ borderRadius: '6px', fontWeight: 700, backgroundColor: '#c62828', borderColor: '#c62828' }}
                            >
                              Tải file Word
                            </Button>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* TAB: QUẢN LÝ BIỂU MẪU - CHỈ ADMIN */}
                    {isAdmin && activeTab === 'quan_ly_bieu_mau' && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                          <SettingOutlined style={{ color: '#2563eb', fontSize: 20 }} />
                          <div>
                            <div style={{ fontWeight: 900, fontSize: 15, color: '#1e293b' }}>Quản lý file mẫu (.docx)</div>
                            <div style={{ fontSize: 11.5, color: '#64748b' }}>Tải lên file mẫu bình thường — hệ thống sẽ tự động ánh xạ placeholder cho bạn</div>
                          </div>
                        </div>

                        {/* Danh sách 7 biểu mẫu */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {DOCUMENT_TYPES.map(doc => {
                            const meta = templateMetas[doc.key];
                            const isCustom = !!meta;
                            const isUploading = uploadingTemplate === doc.key;
                            const isDeleting = deletingTemplate === doc.key;

                            return (
                              <div key={doc.key} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '12px 16px',
                                background: isCustom ? '#f0fdf4' : '#f8fafc',
                                border: isCustom ? '1px solid #86efac' : '1px solid #e2e8f0',
                                borderRadius: 10,
                                transition: 'all 0.2s ease'
                              }}>
                                {/* Status dot */}
                                <div style={{
                                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                                  background: isCustom ? '#22c55e' : '#94a3b8',
                                  boxShadow: isCustom ? '0 0 6px rgba(34,197,94,0.5)' : 'none'
                                }} />

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: 12.5, color: '#1e293b' }}>{doc.label}</div>
                                  {isCustom ? (
                                    <div style={{ fontSize: 11, color: '#16a34a', marginTop: 1 }}>
                                      ✅ Đang dùng: <strong>{meta.fileName}</strong>
                                      <span style={{ color: '#64748b', marginLeft: 6 }}>
                                        (tải lên {dayjs(meta.uploadedAt).format('DD/MM/YYYY HH:mm')})
                                      </span>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                                      ⚪ Đang dùng file mặc định
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                  {/* Upload button — dùng input file ẩn */}
                                  <label style={{ cursor: 'pointer' }}>
                                    <input
                                      type="file"
                                      accept=".docx"
                                      style={{ display: 'none' }}
                                      onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) handleSelectFileForMapping(doc.key, file);
                                        e.target.value = '';
                                      }}
                                    />
                                    <Button
                                      size="small"
                                      loading={isUploading}
                                      as="span"
                                      style={{
                                        borderRadius: 6,
                                        fontWeight: 700,
                                        fontSize: 11,
                                        background: '#1d4ed8',
                                        border: 'none',
                                        color: '#fff',
                                        pointerEvents: 'none'
                                      }}
                                    >
                                      {isUploading ? 'Đang tải...' : (isCustom ? '🔄 Thay thế' : '⬆ Tải lên')}
                                    </Button>
                                  </label>

                                  {/* Delete button — chỉ hiện khi có custom template */}
                                  {isCustom && (
                                    <Button
                                      size="small"
                                      danger
                                      loading={isDeleting}
                                      onClick={() => handleDeleteTemplate(doc.key)}
                                      style={{ borderRadius: 6, fontWeight: 700, fontSize: 11 }}
                                    >
                                      Xóa
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div style={{ marginTop: 16, padding: '10px 14px', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 11.5, color: '#0369a1' }}>
                          <strong>💡 Lưu ý:</strong> File mẫu phải ở định dạng <code>.docx</code>. Khi bạn chọn tải lên, hệ thống sẽ mở trình ánh xạ thông minh để tự động nhận dạng và thay thế các từ khóa của bạn bằng các placeholder, giúp bạn không cần phải sửa đổi file Word thủ công.
                        </div>
                      </div>
                    )}

                  </Form>
                </Card>
              </Col>

            </Row>
          ) : (
            <Card bordered={false} className="premium-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <TeamOutlined style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 16 }} />
              <Text style={{ color: '#64748b', display: 'block', fontWeight: 600 }}>Chọn một Đảng viên dự bị để bắt đầu làm hồ sơ.</Text>
            </Card>
          )}
        </>
      )}

      {/* Document Preview Modal */}
      <Modal
        title={<span style={{ fontSize: 16, fontWeight: 900, color: '#c62828' }}>Xem trước văn bản hồ sơ chính thức</span>}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setPreviewVisible(false)} style={{ backgroundColor: '#c62828', borderColor: '#c62828', borderRadius: '8px', fontWeight: 700 }}>Đóng</Button>
        ]}
        width={850}
        style={{ top: 20 }}
        bodyStyle={{ padding: '20px', backgroundColor: '#f1f5f9', maxHeight: '72vh', overflowY: 'auto', borderRadius: '12px' }}
      >
        <div style={{ padding: '10px 0' }}>
          {renderDocPreview()}
        </div>
      </Modal>

      {/* Direct Mail-Merge Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <SettingOutlined style={{ color: '#1d4ed8', fontSize: 18 }} />
            <span style={{ fontSize: 15, fontWeight: 900, color: '#1e293b' }}>
              Chèn Mail Merge
            </span>
            <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
              {DOCUMENT_TYPES.find(d => d.key === mappingDocType)?.label || ''}
            </span>
          </div>
        }
        open={mappingVisible}
        onCancel={() => {
          if (!processingMapping) {
            setMappingVisible(false);
            setMappingFile(null);
            setMappingDocType(null);
            setAssignments({});
            setActiveLineIdx(null);
            setSelectedText('');
            setMappingSearchQuery('');
          }
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              {mappingFile && <><FileWordOutlined style={{ marginRight: 4 }} />{mappingFile.name} — {extractedLines.length} dòng — <strong style={{ color: '#16a34a' }}>{Object.keys(assignments).length}</strong> trường đã gán</>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button 
                onClick={() => {
                  setMappingVisible(false);
                  setMappingFile(null);
                  setMappingDocType(null);
                  setAssignments({});
                  setActiveLineIdx(null);
                  setSelectedText('');
                  setMappingSearchQuery('');
                }}
                disabled={processingMapping}
                style={{ borderRadius: 6, fontWeight: 700 }}
              >
                Hủy
              </Button>
              <Button 
                type="primary" 
                loading={processingMapping}
                onClick={handleSaveAndUploadMappedTemplate}
                disabled={Object.keys(assignments).length === 0}
                style={{ borderRadius: 6, fontWeight: 700, background: Object.keys(assignments).length > 0 ? '#16a34a' : undefined, borderColor: Object.keys(assignments).length > 0 ? '#16a34a' : undefined }}
              >
                ✓ Lưu & Tải lên ({Object.keys(assignments).length} trường)
              </Button>
            </div>
          </div>
        }
        width={1150}
        style={{ top: 20 }}
        bodyStyle={{ padding: '16px 20px', backgroundColor: '#f8fafc', borderRadius: '8px' }}
      >
        {/* Hướng dẫn ngắn gọn */}
        <div style={{ padding: '10px 14px', background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)', border: '1px solid #bfdbfe', borderRadius: 8, marginBottom: 14, fontSize: 12, color: '#1e40af', lineHeight: 1.5 }}>
          <strong>👆 Bấm vào cụm từ</strong> trong văn bản bên trái → <strong>chọn trường</strong> tương ứng từ menu hiện ra. Bạn cũng có thể <strong>bôi đen</strong> một phần text rồi bấm để gán chính xác hơn.
        </div>
        
        <Row gutter={16}>
          {/* CỘT TRÁI: VĂN BẢN - CLICK TO ASSIGN */}
          <Col span={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Input 
                placeholder="🔍 Tìm nhanh..." 
                value={mappingSearchQuery} 
                onChange={e => setMappingSearchQuery(e.target.value)}
                size="small"
                allowClear
                style={{ borderRadius: 6, flex: 1 }}
              />
              <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                {extractedLines.length} dòng
              </span>
            </div>
            <div 
              ref={textContainerRef}
              style={{ 
                height: 520, 
                overflowY: 'auto', 
                background: '#ffffff', 
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                padding: '6px 0',
              }}
            >
              {extractedLines.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 0', fontSize: 12 }}>
                  Không tìm thấy văn bản nào
                </div>
              ) : (
                (() => {
                  const q = mappingSearchQuery.toLowerCase().trim();
                  const linesToShow = q
                    ? extractedLines.map((line, idx) => ({ line, idx })).filter(item => item.line.toLowerCase().includes(q))
                    : extractedLines.map((line, idx) => ({ line, idx }));

                  if (linesToShow.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 0', fontSize: 12 }}>
                        Không tìm thấy kết quả
                      </div>
                    );
                  }

                  return linesToShow.map(({ line, idx }) => {
                    const lineAssigns = getAssignmentsForLine(line);
                    const hasAssignment = lineAssigns.length > 0;
                    const isActive = activeLineIdx === idx;
                    const availablePHs = getAvailablePlaceholders();

                    const lineContent = (
                      <div 
                        key={idx}
                        onClick={() => handleTextLineClick(idx)}
                        style={{ 
                          padding: '6px 12px', 
                          borderBottom: '1px solid #f1f5f9', 
                          fontSize: 12, 
                          lineHeight: 1.5,
                          color: '#1e293b',
                          background: isActive ? '#dbeafe' : hasAssignment ? '#f0fdf4' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          borderLeft: hasAssignment ? '3px solid #22c55e' : '3px solid transparent',
                          wordBreak: 'break-word',
                          position: 'relative',
                        }}
                        onMouseEnter={e => { if (!isActive && !hasAssignment) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={e => { if (!isActive && !hasAssignment) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div>{line}</div>
                        {/* Tag hiển thị các placeholder đã gán cho dòng này */}
                        {hasAssignment && (
                          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {lineAssigns.map(a => (
                              <Tag 
                                key={a.key}
                                color="green" 
                                closable 
                                onClose={(e) => { e.stopPropagation(); removeAssignment(a.key); }}
                                style={{ fontSize: 10, lineHeight: '18px', margin: 0, borderRadius: 4 }}
                              >
                                {a.desc}
                              </Tag>
                            ))}
                          </div>
                        )}
                      </div>
                    );

                    // Wrap dòng đang active trong Popover để chọn placeholder
                    if (isActive) {
                      return (
                        <Popover
                          key={`pop-${idx}`}
                          open={true}
                          onOpenChange={(open) => { if (!open) setActiveLineIdx(null); }}
                          trigger="click"
                          placement="rightTop"
                          overlayStyle={{ maxWidth: 320 }}
                          content={
                            <div style={{ maxHeight: 300, overflowY: 'auto', minWidth: 240 }}>
                              <div style={{ padding: '4px 8px', background: '#f0f9ff', borderRadius: 6, marginBottom: 8, fontSize: 11, color: '#0369a1' }}>
                                <strong>Đang gán:</strong> "{selectedText.length > 35 ? selectedText.substring(0, 35) + '…' : selectedText}"
                              </div>
                              {availablePHs.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '12px 0', fontSize: 11 }}>
                                  ✅ Đã gán hết tất cả trường
                                </div>
                              ) : (
                                availablePHs.map(phKey => {
                                  const desc = PLACEHOLDER_DESCS[phKey] || phKey;
                                  return (
                                    <div
                                      key={phKey}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        assignPlaceholder(phKey, selectedText);
                                      }}
                                      style={{
                                        padding: '7px 10px',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        fontSize: 12,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: 8,
                                        transition: 'background 0.15s',
                                        borderBottom: '1px solid #f1f5f9',
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <span style={{ fontWeight: 600, color: '#334155' }}>{desc}</span>
                                      <code style={{ fontSize: 9, color: '#94a3b8', background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>{phKey}</code>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          }
                        >
                          {lineContent}
                        </Popover>
                      );
                    }

                    return lineContent;
                  });
                })()
              )}
            </div>
          </Col>

          {/* CỘT PHẢI: TỔNG HỢP ÁNH XẠ */}
          <Col span={10}>
            <div style={{ fontWeight: 800, color: '#334155', fontSize: 12, marginBottom: 8 }}>
              📋 Trường đã gán ({Object.keys(assignments).length}/{(RELATED_PLACEHOLDERS[mappingDocType] || []).length})
            </div>
            <div style={{
              height: 520, 
              overflowY: 'auto', 
              background: '#ffffff',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              padding: '8px',
            }}>
              {/* Các trường đã gán */}
              {Object.keys(assignments).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 12px', color: '#94a3b8' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>👆</div>
                  <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                    Bấm vào cụm từ bên trái<br/>để bắt đầu gán placeholder
                  </div>
                </div>
              ) : (
                Object.entries(assignments).map(([key, val]) => {
                  const desc = PLACEHOLDER_DESCS[key] || key;
                  return (
                    <div 
                      key={key} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: 8, 
                        padding: '8px 10px', 
                        background: '#f0fdf4', 
                        border: '1px solid #bbf7d0', 
                        borderRadius: 8, 
                        marginBottom: 6,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <CheckCircleOutlined style={{ color: '#22c55e', marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 11.5, color: '#166534' }}>{desc}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, wordBreak: 'break-all' }}>
                          "{val.length > 50 ? val.substring(0, 50) + '…' : val}"
                        </div>
                      </div>
                      <Tooltip title="Xóa ánh xạ này">
                        <Button 
                          type="text" 
                          size="small" 
                          danger 
                          onClick={() => removeAssignment(key)} 
                          style={{ padding: '0 4px', height: 20, fontSize: 11, flexShrink: 0 }}
                        >
                          ✕
                        </Button>
                      </Tooltip>
                    </div>
                  );
                })
              )}

              {/* Divider + danh sách trường chưa gán */}
              {Object.keys(assignments).length > 0 && getAvailablePlaceholders().length > 0 && (
                <>
                  <Divider style={{ margin: '10px 0', fontSize: 11, color: '#94a3b8' }}>Chưa gán</Divider>
                  {getAvailablePlaceholders().map(key => {
                    const desc = PLACEHOLDER_DESCS[key] || key;
                    return (
                      <div 
                        key={key} 
                        style={{ 
                          padding: '6px 10px', 
                          background: '#f8fafc', 
                          border: '1px dashed #e2e8f0', 
                          borderRadius: 6, 
                          marginBottom: 4,
                          fontSize: 11,
                          color: '#94a3b8',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span>{desc}</span>
                        <code style={{ fontSize: 9 }}>{key}</code>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </Col>
        </Row>
      </Modal>

    </div>
  );
};

export default DocumentGenerator;
