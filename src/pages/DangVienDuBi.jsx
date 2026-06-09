import { useState, useEffect, useMemo } from 'react';
import { 
  Table, Typography, Card, Row, Col, Space, Input, Button, Modal, 
  Form, Select, DatePicker, message, Badge, Tooltip, Drawer, Popconfirm, Steps, Divider,
  Radio, Progress, Dropdown, Tag, Alert, Tabs, Checkbox
} from 'antd';
import { 
  PlusOutlined, EditOutlined, 
  CheckCircleOutlined, EyeOutlined, MailOutlined,
  UserOutlined, EnvironmentOutlined, HomeOutlined, PhoneOutlined, FlagOutlined,
  ExportOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined, FilterOutlined, SearchOutlined, CloseOutlined,
  TableOutlined, FullscreenOutlined, FullscreenExitOutlined, SettingOutlined
} from '@ant-design/icons';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { dbMain as db } from '../firebase';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../config';
import ImportExcel from '../components/ImportExcel';
import ProfileDrawer from '../components/ProfileDrawer';
import { useAuth } from '../contexts/AuthContext';

const { Title } = Typography;
const { Option } = Select;

const EXPORT_FIELDS = [
  { key: 'ho_ten', label: 'Họ tên', group: 'basic' },
  { key: 'mssv', label: 'MSSV', group: 'basic' },
  { key: 'ngay_sinh', label: 'Ngày sinh', group: 'basic', isDate: true },
  { key: 'gioi_tinh', label: 'Giới tính', group: 'basic' },
  { key: 'cccd', label: 'CCCD', group: 'basic' },
  { key: 'dan_toc', label: 'Dân tộc', group: 'basic' },
  { key: 'ton_giao', label: 'Tôn giáo', group: 'basic' },
  { key: 'anh_ca_nhan', label: 'Link ảnh cá nhân', group: 'basic' },
  
  { key: 'lop', label: 'Lớp', group: 'org' },
  { key: 'khoa', label: 'Khoa', group: 'org' },
  { key: 'nhom', label: 'Nhóm sinh hoạt', group: 'org' },
  
  { key: 'so_dien_thoai', label: 'SĐT', group: 'contact' },
  { key: 'email', label: 'Email cá nhân', group: 'contact' },
  { key: 'email_sv', label: 'Email sinh viên', group: 'contact' },
  { key: 'facebook', label: 'Facebook', group: 'contact' },
  { key: 'dia_chi_tam_tru', label: 'Địa chỉ tạm trú', group: 'contact' },
  
  { key: 'chi_tiet_dc', label: 'Chi tiết ĐC thường trú', group: 'address' },
  { key: 'xa_phuong_tt', label: 'Xã/phường thường trú', group: 'address' },
  { key: 'tinh_tp_tt', label: 'Tỉnh/TP thường trú', group: 'address' },
  { key: 'xa_phuong_qq', label: 'Xã/phường quê quán', group: 'address' },
  { key: 'tinh_tp_qq', label: 'Tỉnh/TP quê quán', group: 'address' },
  
  { key: 'ngay_vao_dang', label: 'Ngày vào Đảng', group: 'party', isDate: true },
  { key: 'ngay_chinh_thuc', label: 'Ngày chính thức', group: 'party', isDate: true },
  { key: 'so_the_dang', label: 'Số thẻ Đảng', group: 'party' },
  { key: 'dang_vien_du_bi', label: 'Loại Đảng viên', group: 'party', isSpecial: 'type' },
  { key: 'trang_thai', label: 'Trạng thái sinh hoạt', group: 'party', isSpecial: 'status' },
  { key: 'dvhd', label: 'Đảng viên hướng dẫn', group: 'party' },
  
  { key: 'ho_ten_nguoi_than', label: 'Họ tên người thân', group: 'family' },
  { key: 'sdt_nguoi_than', label: 'SĐT người thân', group: 'family' }
];

const FIELD_GROUPS = {
  basic: { label: "Thông tin cơ bản", color: "blue" },
  org: { label: "Học tập & Tổ chức", color: "geekblue" },
  contact: { label: "Liên hệ & Tạm trú", color: "cyan" },
  address: { label: "Thường trú & Quê quán", color: "purple" },
  party: { label: "Thông tin Đảng tịch", color: "red" },
  family: { label: "Gia đình", color: "orange" }
};

const HO_SO_STEPS = {
  1: "Đã liên hệ và phân công Đảng viên hướng dẫn",
  2: "Đang chuẩn bị các giấy tờ khác",
  3: "Đang xin nhận xét cư trú",
  4: "Đang hoàn thành hồ sơ và thông qua chi bộ",
  5: "Đã nộp hồ sơ lên VPĐU",
  6: "Đã nộp hồ sơ lên Đảng ủy ĐHĐN"
};

const SHORT_STEPS = {
  1: "Phân công ĐVHD",
  2: "Chuẩn bị giấy tờ",
  3: "Nhận xét cư trú",
  4: "Thông qua chi bộ",
  5: "Nộp VPĐU",
  6: "Nộp ĐHĐN"
};

const KHOA_LIST = [
  "P.CTSV", "Quản trị Kinh doanh", "Trung tâm Đào tạo Quốc tế", "Du lịch", "Marketing", 
  "Tài chính", "Ngân hàng", "Kinh tế", "Kế toán", "Luật", "Thống kê - Tin học", 
  "Thương mại điện tử", "Kinh doanh quốc tế", "Lý luận chính trị", "Khác"
];

const DangVienDuBi = () => {
  const { currentUser } = useAuth();
  const [data, setData] = useState([]);
  const [allOfficialMembers, setAllOfficialMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  
  // Filter states
  const [filterKhoa, setFilterKhoa] = useState(null);
  const [filterLop, setFilterLop] = useState(null);
  const [filterIntake, setFilterIntake] = useState(null);
  const [filterHocLop, setFilterHocLop] = useState(null);
  const [filterHanXet, setFilterHanXet] = useState(null);
  const [filterThangXet, setFilterThangXet] = useState(null);
  
  // Drawer/Modal state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const [chuyenChinhThucForm] = Form.useForm();
  const [isChuyenChinhThucModalVisible, setIsChuyenChinhThucModalVisible] = useState(false);
  const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
  const [emailRecord, setEmailRecord] = useState(null);
  const [isNextStepModalVisible, setIsNextStepModalVisible] = useState(false);
  const [nextStepNote, setNextStepNote] = useState('');
  const [nextStepLoading, setNextStepLoading] = useState(false);
  
  // === DETAIL MODAL STATE ===
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const handleViewDetail = (record) => {
    setSelectedRecord(record);
    setIsDetailVisible(true);
  };
  
  // Email editor states
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBodyText, setEmailBodyText] = useState("");

  // Custom export states
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [exportRange, setExportRange] = useState('filtered');
  const [selectedExportFields, setSelectedExportFields] = useState(EXPORT_FIELDS.map(f => f.key));

  // Email config states
  const [configLinkHoSo, setConfigLinkHoSo] = useState("https://huongdan.chibosinhvien.edu.vn/ho-so-chinh-thuc");
  const [configGroupName, setConfigGroupName] = useState("Nhóm Hỗ trợ Phát triển Đảng");
  const [configGroupLink, setConfigGroupLink] = useState("https://zalo.me/g/cbsv_hotro");

  // Bulk selections
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  // Spreadsheet view and inline editing states
  const [isAllInfoVisible, setIsAllInfoVisible] = useState(false);
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { id, dataIndex }
  const [editValue, setEditValue] = useState(null);

  // CSV Import/Export
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importStep, setImportStep] = useState(0); // 0: upload/download template, 1: preview & resolve, 2: processing
  const [parsedData, setParsedData] = useState([]);
  const [importConflictStrategy, setImportConflictStrategy] = useState("overwrite"); // default to overwrite (update changes)
  const [importProgress, setImportProgress] = useState(null); // { current, total, success, error }

  // Bulk Emails
  // eslint-disable-next-line no-unused-vars
  const [bulkEmailModalVisible, setBulkEmailModalVisible] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [bulkEmailSubject, setBulkEmailSubject] = useState("Nhắc chuẩn bị hồ sơ xét công nhận Đảng viên chính thức");
  // eslint-disable-next-line no-unused-vars
  const [bulkEmailTemplate, setBulkEmailTemplate] = useState(
    `Kính gửi đồng chí {ho_ten},\n\n` +
    `Chi bộ Sinh viên xin thông báo về việc chuẩn bị hồ sơ xét công nhận Đảng viên chính thức của đồng chí với các thông tin sau:\n` +
    `- MSSV: {mssv}\n` +
    `- Ngày vào Đảng: {ngay_vao_dang}\n\n` +
    `Đồng chí hiện {han_xet} để hoàn thiện hồ sơ xét công nhận Đảng viên chính thức.\n\n` +
    `Vui lòng khẩn trương chuẩn bị đầy đủ hồ sơ theo hướng dẫn tại link sau:\n` +
    `https://huongdan.chibosinhvien.edu.vn/ho-so-chinh-thuc\n\n` +
    `Đảng viên hướng dẫn theo dõi: {dvhd_theo_doi}\n` +
    `Đảng viên hướng dẫn làm hồ sơ: {dvhd_ho_so}\n\n` +
    `Mọi thắc mắc vui lòng liên hệ: Nhóm Hỗ trợ Phát triển Đảng (https://zalo.me/g/cbsv_hotro)\n\n` +
    `Trân trọng,\nChi bộ Sinh viên`
  );
  // eslint-disable-next-line no-unused-vars
  const [bulkEmailProgress, setBulkEmailProgress] = useState(null);
  const [, setBulkEmailing] = useState(false);

  const fetchDangVienDuBi = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "dang_vien"));
      const snapshot = await getDocs(q);
      
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter those who are probationary
      const probationary = members.filter(member => 
        member.loai_dang_vien === "Dự bị" || member.dang_vien_du_bi === true
      );
      
      // Filter those who are official members to be guides (DVHD)
      const official = members.filter(member => 
        member.ho_ten && 
        !(member.loai_dang_vien === "Dự bị" || member.dang_vien_du_bi === true)
      );

      setData(probationary);
      setAllOfficialMembers(official);
    } catch (error) {
      console.error(error);
      message.error("Lỗi khi tải danh sách Đảng viên dự bị");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDangVienDuBi(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const CSV_HEADER_MAP = {
    'MSSV': 'mssv', 'mã số sinh viên': 'mssv', 'mssv': 'mssv', 'mssv (mã số sinh viên)': 'mssv',
    'Họ tên': 'ho_ten', 'Họ và tên': 'ho_ten', 'ho ten': 'ho_ten', 'ho_ten': 'ho_ten',
    'Số CCCD': 'cccd', 'cccd': 'cccd', 'số cccd': 'cccd',
    'Ngày sinh': 'ngay_sinh', 'ngay sinh': 'ngay_sinh', 'ngay_sinh': 'ngay_sinh',
    'Khoa': 'khoa', 'khoa': 'khoa',
    'Lớp': 'lop', 'Lớp sinh hoạt': 'lop', 'lop': 'lop',
    'Xã Phường Quê Quán': 'xa_phuong_qq', 'Xã/Phường QQ': 'xa_phuong_qq', 'xa_phuong_qq': 'xa_phuong_qq',
    'Tỉnh TP Quê Quán': 'tinh_tp_qq', 'Tỉnh/Thành phố QQ': 'tinh_tp_qq', 'tinh_tp_qq': 'tinh_tp_qq',
    'Xã Phường Thường Trú': 'xa_phuong_tt', 'Xã/Phường TT': 'xa_phuong_tt', 'xa_phuong_tt': 'xa_phuong_tt',
    'Tỉnh TP Thường Trú': 'tinh_tp_tt', 'Tỉnh/Thành phố TT': 'tinh_tp_tt', 'tinh_tp_tt': 'tinh_tp_tt',
    'Địa chỉ thường trú chi tiết': 'chi_tiet_dc', 'Địa chỉ chi tiết': 'chi_tiet_dc', 'chi_tiet_dc': 'chi_tiet_dc',
    'Số điện thoại': 'sdt', 'sdt': 'sdt', 'SĐT': 'sdt',
    'Email': 'email', 'Địa chỉ Email': 'email', 'email': 'email',
    'Địa chỉ tạm trú': 'dia_chi_tam_tru', 'Tạm trú': 'dia_chi_tam_tru', 'dia_chi_tam_tru': 'dia_chi_tam_tru',
    'Ngày vào Đảng': 'ngay_vao_dang', 'Ngay vao dang': 'ngay_vao_dang', 'ngay_vao_dang': 'ngay_vao_dang',
    'Đảng viên hướng dẫn': 'dvhd', 'ĐVHD': 'dvhd', 'dvhd': 'dvhd',
    'Học lớp Đảng viên mới': 'hoc_lop_dv_moi', 'Lớp ĐVM': 'hoc_lop_dv_moi', 'hoc_lop_dv_moi': 'hoc_lop_dv_moi'
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const parsed = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (parsed.length === 0) {
        message.error("File Excel trống hoặc sai định dạng!");
        return;
      }
      
      const validated = parsed.map((row, index) => {
        const item = {};
        Object.keys(row).forEach(header => {
          const key = CSV_HEADER_MAP[header.trim()];
          if (key) {
            item[key] = row[header];
          }
        });
        
        item.stt = index + 1;
        item.ho_so_status = 1;
        
        const errors = [];
        if (!item.mssv) errors.push("Thiếu MSSV");
        if (!item.ho_ten) errors.push("Thiếu Họ tên");
        if (!item.ngay_vao_dang) {
          errors.push("Thiếu Ngày vào Đảng");
        } else {
          const d = dayjs(item.ngay_vao_dang, ['DD/MM/YYYY', 'YYYY-MM-DD']);
          if (!d.isValid()) {
            errors.push("Ngày vào Đảng không đúng định dạng (DD/MM/YYYY)");
          } else {
            item.ngay_vao_dang = d.format('YYYY-MM-DD');
          }
        }
        
        if (item.ngay_sinh) {
          const d = dayjs(item.ngay_sinh, ['DD/MM/YYYY', 'YYYY-MM-DD']);
          if (d.isValid()) {
            item.ngay_sinh = d.format('YYYY-MM-DD');
          } else {
            item.ngay_sinh = null;
          }
        }
        
        if (typeof item.hoc_lop_dv_moi === 'string') {
          const l = item.hoc_lop_dv_moi.toLowerCase().trim();
          item.hoc_lop_dv_moi = l === 'đã học' || l === 'da hoc' || l === 'yes' || l === 'true' || l === 'x';
        } else {
          item.hoc_lop_dv_moi = !!item.hoc_lop_dv_moi;
        }
        
        const isLocalDuplicate = parsed.filter(r => {
          const m = r['MSSV'] || r['mã số sinh viên'] || r['mssv'];
          return m && String(m).trim() === String(item.mssv).trim();
        }).length > 1;
        
        if (isLocalDuplicate) {
          errors.push("Trùng MSSV trong chính file CSV");
        }
        
        const dbConflict = data.find(d => String(d.mssv).trim() === String(item.mssv).trim());
        
        return {
          ...item,
          errors,
          dbConflict: !!dbConflict,
          existingRecordId: dbConflict ? dbConflict.id : null,
          existingRecordData: dbConflict || null
        };
      });
      
      setParsedData(validated);
      setImportStep(1);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "MSSV", "Họ tên", "Số CCCD", "Ngày sinh", "Khoa", "Lớp",
      "Xã Phường Quê Quán", "Tỉnh TP Quê Quán", "Xã Phường Thường Trú", "Tỉnh TP Thường Trú",
      "Địa chỉ thường trú chi tiết", "Số điện thoại", "Email", "Địa chỉ tạm trú",
      "Ngày vào Đảng", "Đảng viên hướng dẫn", "Học lớp Đảng viên mới"
    ];
    const sampleRow = [
      "22112211", "Nguyễn Văn A", "048204012345", "15/08/2004", "Quản trị kinh doanh", "48K01.1",
      "Hòa Hải", "Đà Nẵng", "Khuê Mỹ", "Đà Nẵng", "123 Ngũ Hành Sơn", "0905123456",
      "nguyenvana@gmail.com", "Ký túc xá DUE", "19/05/2025", "Trần Thị B", "Chưa học"
    ];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "Template_Nhap_Dang_Vien_Du_Bi.xlsx");
  };

  const handleCommitImport = async () => {
    setImportStep(2);
    setImportProgress({ current: 0, total: parsedData.length, success: 0, error: 0 });
    
    let currentCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (const record of parsedData) {
      currentCount++;
      if (record.errors && record.errors.length > 0) {
        errorCount++;
        setImportProgress(p => ({ ...p, current: currentCount, error: errorCount }));
        continue;
      }
      
      try {
        if (record.dbConflict) {
          const updateFields = {};
          if (record.mssv) updateFields.mssv = record.mssv;
          if (record.ho_ten) updateFields.ho_ten = record.ho_ten;
          if (record.cccd) updateFields.cccd = record.cccd;
          if (record.ngay_sinh) updateFields.ngay_sinh = record.ngay_sinh;
          if (record.khoa) updateFields.khoa = record.khoa;
          if (record.lop) updateFields.lop = record.lop;
          if (record.xa_phuong_qq) updateFields.xa_phuong_qq = record.xa_phuong_qq;
          if (record.tinh_tp_qq) updateFields.tinh_tp_qq = record.tinh_tp_qq;
          if (record.xa_phuong_tt) updateFields.xa_phuong_tt = record.xa_phuong_tt;
          if (record.tinh_tp_tt) updateFields.tinh_tp_tt = record.tinh_tp_tt;
          if (record.chi_tiet_dc) updateFields.chi_tiet_dc = record.chi_tiet_dc;
          if (record.sdt) updateFields.sdt = record.sdt;
          if (record.email) updateFields.email = record.email;
          if (record.dia_chi_tam_tru) updateFields.dia_chi_tam_tru = record.dia_chi_tam_tru;
          if (record.ngay_vao_dang) updateFields.ngay_vao_dang = record.ngay_vao_dang;
          if (record.dvhd) updateFields.dvhd = record.dvhd;
          
          if (Object.prototype.hasOwnProperty.call(record, 'hoc_lop_dv_moi')) {
            updateFields.hoc_lop_dv_moi = !!record.hoc_lop_dv_moi;
          }
          if (record.ho_so_status !== undefined && record.ho_so_status !== "") {
            updateFields.ho_so_status = Number(record.ho_so_status) || 1;
          }

          updateFields.updated_at = new Date().toISOString();

          if (updateFields.dvhd) {
            const matchedGuide = allOfficialMembers.find(m => m.ho_ten === updateFields.dvhd);
            if (matchedGuide) updateFields.dvhd_email = matchedGuide.email;
          }

          if (importConflictStrategy === 'overwrite') {
            await updateDoc(doc(db, "dang_vien", record.existingRecordId), updateFields);
            successCount++;
          } else {
            errorCount++;
          }
        } else {
          const docData = {
            mssv: record.mssv,
            ho_ten: record.ho_ten,
            cccd: record.cccd || null,
            ngay_sinh: record.ngay_sinh || null,
            khoa: record.khoa || null,
            lop: record.lop || null,
            xa_phuong_qq: record.xa_phuong_qq || null,
            tinh_tp_qq: record.tinh_tp_qq || null,
            xa_phuong_tt: record.xa_phuong_tt || null,
            tinh_tp_tt: record.tinh_tp_tt || null,
            chi_tiet_dc: record.chi_tiet_dc || null,
            sdt: record.sdt || null,
            email: record.email || null,
            dia_chi_tam_tru: record.dia_chi_tam_tru || null,
            ngay_vao_dang: record.ngay_vao_dang,
            dvhd: record.dvhd || null,
            hoc_lop_dv_moi: !!record.hoc_lop_dv_moi,
            loai_dang_vien: "Dự bị",
            dang_vien_du_bi: true,
            ho_so_status: record.ho_so_status || 1,
            ho_so_history: record.ho_so_history || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          if (docData.dvhd) {
            const matchedGuide = allOfficialMembers.find(m => m.ho_ten === docData.dvhd);
            if (matchedGuide) docData.dvhd_email = matchedGuide.email;
          }

          await addDoc(collection(db, "dang_vien"), docData);
          successCount++;
        }
      } catch (err) {
        console.error("Lỗi khi import dòng:", record, err);
        errorCount++;
      }
      
      setImportProgress({
        current: currentCount,
        total: parsedData.length,
        success: successCount,
        error: errorCount
      });
    }
    
    message.success(`Hoàn thành nhập danh sách! Thành công: ${successCount}, Bỏ qua/Lỗi: ${errorCount}`);
    setImportModalVisible(false);
    setImportStep(0);
    setParsedData([]);
    fetchDangVienDuBi();
  };

  const handleOpenExportModal = () => {
    setExportRange(selectedRowKeys.length > 0 ? 'selected' : 'filtered');
    setSelectedExportFields(EXPORT_FIELDS.map(f => f.key));
    setIsExportModalVisible(true);
  };

  const exportExcel = () => {
    let dataToExport = [];
    if (exportRange === 'selected') {
      dataToExport = filteredData.filter(item => selectedRowKeys.includes(item.id));
    } else if (exportRange === 'all') {
      dataToExport = data;
    } else {
      dataToExport = filteredData;
    }

    if (dataToExport.length === 0) {
      message.warning("Không có dữ liệu Đảng viên dự bị nào để xuất!");
      return;
    }

    const mappedData = dataToExport.map((item, index) => {
      const row = { 'STT': index + 1 };
      EXPORT_FIELDS.forEach(field => {
        if (selectedExportFields.includes(field.key)) {
          if (field.isDate) {
            row[field.label] = item[field.key] ? (item[field.key]?.toDate ? dayjs(item[field.key].toDate()).format('DD/MM/YYYY') : (item[field.key]?.seconds ? dayjs(item[field.key].seconds * 1000).format('DD/MM/YYYY') : dayjs(item[field.key]).format('DD/MM/YYYY'))) : "";
          } else if (field.isSpecial === 'type') {
            row[field.label] = "Dự bị";
          } else if (field.isSpecial === 'status') {
            row[field.label] = `B${item.ho_so_status || 1}: ${HO_SO_STEPS[item.ho_so_status || 1]}`;
          } else {
            let val = item[field.key];
            if (field.key === 'so_dien_thoai') {
              val = item.so_dien_thoai || item.sdt;
            } else if (field.key === 'email') {
              val = item.email || item.email_sv;
            } else if (field.key === 'que_quan') {
              val = item.que_quan || item.quequan;
            } else if (field.key === 'tinh_tp_qq') {
              val = item.tinh_tp_qq || item.tinh_tp_qq_cu;
            } else if (field.key === 'xa_phuong_qq') {
              val = item.xa_phuong_qq || item.xa_phuong_qq_cu;
            } else if (field.key === 'tinh_tp_tt') {
              val = item.tinh_tp_tt || item.tinh_tp_tt_cu;
            } else if (field.key === 'xa_phuong_tt') {
              val = item.xa_phuong_tt || item.xa_phuong_tt_cu;
            }
            row[field.label] = val || "";
          }
        }
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(mappedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DangVienDuBi");
    XLSX.writeFile(wb, `DanhSachDangVienDuBi_TuyChinh_${dayjs().format('YYYYMMDD')}.xlsx`);
    
    setIsExportModalVisible(false);
    message.success(`Xuất Excel thành công ${dataToExport.length} Đảng viên dự bị!`);
  };

  const handleBulkEmail = () => {
    const eligible = selectedRows.filter(r => {
      const status = r.ho_so_status || 1;
      const han = calculateHanXet(r.ngay_vao_dang);
      const daysLeft = han ? han.daysLeft : null;
      return status < 5 && daysLeft !== null && daysLeft <= 30;
    });

    if (eligible.length === 0) {
      message.warning("Không có Đảng viên nào được chọn thỏa mãn điều kiện gửi email (Bước < 5 và còn hạn/quá hạn ≤ 30 ngày)!");
      return;
    }

    setBulkEmailModalVisible(true);
    setBulkEmailProgress(null);
    setBulkEmailing(false);
  };

  // eslint-disable-next-line no-unused-vars
  const handleSendBulkEmails = async () => {
    const eligible = selectedRows.filter(r => {
      const status = r.ho_so_status || 1;
      const han = calculateHanXet(r.ngay_vao_dang);
      const daysLeft = han ? han.daysLeft : null;
      return status < 5 && daysLeft !== null && daysLeft <= 30;
    });

    setBulkEmailing(true);
    setBulkEmailProgress({ current: 0, total: eligible.length, success: 0, error: 0 });

    let current = 0;
    let success = 0;
    let error = 0;

    for (const record of eligible) {
      current++;
      const targetEmail = record.dvhd_ho_so_email || record.dvhd_theo_doi_email || record.email;
      if (!targetEmail) {
        error++;
        setBulkEmailProgress({ current, total: eligible.length, success, error });
        continue;
      }

      const han = calculateHanXet(record.ngay_vao_dang);
      const daysLeft = han ? han.daysLeft : 0;

      let body = bulkEmailTemplate
        .replace(/{ho_ten}/g, record.ho_ten || "")
        .replace(/{mssv}/g, record.mssv || "")
        .replace(/{ngay_vao_dang}/g, record.ngay_vao_dang ? dayjs(record.ngay_vao_dang).format('DD/MM/YYYY') : "")
        .replace(/{han_xet}/g, daysLeft >= 0 ? `còn ${daysLeft} ngày` : `đã quá hạn ${Math.abs(daysLeft)} ngày`)
        .replace(/{dvhd_theo_doi}/g, record.dvhd_theo_doi || "Chưa phân công")
        .replace(/{dvhd_ho_so}/g, record.dvhd_ho_so || "Chưa phân công");

      try {
        const formattedBodyText = body.replace(/\n/g, '<br />');
        const htmlBody = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${bulkEmailSubject}</title>
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
              <link href="https://fonts.cdnfonts.com/css/svn-gilroy" rel="stylesheet">
              <style>
                body, table, td, p, a, div, h2 {
                  font-family: 'SVN-Gilroy', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                }
                @media only screen and (max-width: 600px) {
                  body { padding: 0 !important; background-color: #ffffff !important; }
                  .email-container { width: 100% !important; max-width: 100% !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; }
                  .email-header { padding: 20px 15px !important; }
                  .email-header h2 { font-size: 18px !important; }
                  .email-body { padding: 20px 15px !important; }
                }
              </style>
            </head>
            <body style="margin: 0; padding: 20px; background-color: #f4f6f8;">
              <div class="email-container" style="font-family: 'SVN-Gilroy', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align: justify; background-color: #ffffff;">
                <div class="email-header" style="background-color: #b71c1c; background: linear-gradient(135deg, #c62828 0%, #b71c1c 100%); padding: 24px; text-align: center; border-bottom: 4px solid #fbc02d;">
                  <p style="color: #ffffff; margin: 0 0 8px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Chi bộ Sinh viên - Đảng bộ Trường Đại học Kinh tế, ĐHĐN</p>
                  <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">THƯ NHẮC NHỞ HOÀN THIỆN HỒ SƠ CHÍNH THỨC</h2>
                </div>
                <div class="email-body" style="padding: 30px 24px; line-height: 1.8; color: #333333; font-size: 14px; background-color: #ffffff; text-align: justify;">
                  <div style="font-size: 14px; color: #333333; text-align: justify; line-height: 1.8;">
                    ${formattedBodyText}
                  </div>
                </div>
                <div style="background-color: #ffffff; padding: 24px 20px; border-top: 1.5px solid #e0e0e0;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td class="footer-cell-left" width="42%" align="center" style="vertical-align: middle; padding-right: 15px;">
                        <img src="https://chibosinhvien.vercel.app/logo.png" alt="Logo" height="70" style="display: block; margin-bottom: 8px;" />
                        <div style="color: #b71c1c; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">CHI BỘ SINH VIÊN</div>
                        <div style="color: #610c0c; font-size: 9px; font-weight: bold; text-transform: uppercase;">ĐẢNG BỘ TRƯỜNG ĐẠI HỌC KINH TẾ</div>
                      </td>
                      <td class="footer-cell-divider" width="3%" align="center" style="vertical-align: middle;">
                        <div style="border-left: 1.5px solid #b71c1c; height: 95px; width: 1px;"></div>
                      </td>
                      <td class="footer-cell-right" width="55%" style="vertical-align: middle; padding-left: 15px; text-align: left; font-size: 12px; color: #333333; line-height: 1.5;">
                        <div style="margin-bottom: 4px;"><strong style="color: #b71c1c;">Fanpage:</strong> <a href="https://fb.com/chibosinhvienDUE" target="_blank" style="color: #096dd9;">fb.com/chibosinhvienDUE</a></div>
                        <div style="margin-bottom: 4px;"><strong style="color: #b71c1c;">Website:</strong> <a href="https://chibosinhvien.vn/" target="_blank" style="color: #096dd9;">chibosinhvien.vn/</a></div>
                        <div style="margin-bottom: 6px;"><strong style="color: #b71c1c;">Email:</strong> <a href="mailto:chibosinhvien@due.edu.vn" style="color: #096dd9;">chibosinhvien@due.edu.vn</a></div>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
            </body>
          </html>
        `;

        const response = await fetch(`${API_BASE_URL}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: targetEmail, subject: bulkEmailSubject, html: htmlBody })
        });

        if (response.ok) {
          await updateDoc(doc(db, "dang_vien", record.id), {
            last_email_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          success++;
        } else {
          error++;
        }
      } catch (err) {
        console.error(err);
        error++;
      }

      setBulkEmailProgress({ current, total: eligible.length, success, error });
    }

    message.success(`Đã hoàn tất gửi email hàng loạt! Thành công: ${success}, Thất bại: ${error}`);
    setBulkEmailing(false);
    setBulkEmailModalVisible(false);
    setSelectedRowKeys([]);
    setSelectedRows([]);
    fetchDangVienDuBi();
  };

  const handleBulkStepUpdate = async (targetStep) => {
    setLoading(true);
    try {
      let count = 0;
      for (const record of selectedRows) {
        const newHistory = [...(record.ho_so_history || []), {
          from: record.ho_so_status || 1,
          to: targetStep,
          time: new Date().toISOString(),
          updated_by: "Hệ thống (Hàng loạt)"
        }];
        await updateDoc(doc(db, "dang_vien", record.id), {
          ho_so_status: targetStep,
          ho_so_history: newHistory,
          updated_at: new Date().toISOString()
        });
        count++;
      }
      message.success(`Đã cập nhật hàng loạt ${count} Đảng viên sang Bước ${targetStep}: ${HO_SO_STEPS[targetStep]}!`);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      fetchDangVienDuBi();
    } catch (error) {
      console.error(error);
      message.error("Lỗi khi cập nhật bước hồ sơ hàng loạt");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkClassUpdate = async (status) => {
    setLoading(true);
    try {
      let count = 0;
      for (const record of selectedRows) {
        await updateDoc(doc(db, "dang_vien", record.id), {
          hoc_lop_dv_moi: status,
          updated_at: new Date().toISOString()
        });
        count++;
      }
      message.success(`Đã cập nhật lớp Đảng viên mới thành công cho ${count} đồng chí!`);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      fetchDangVienDuBi();
    } catch (error) {
      console.error(error);
      message.error("Lỗi khi cập nhật lớp học hàng loạt");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      let count = 0;
      for (const record of selectedRows) {
        await deleteDoc(doc(db, "dang_vien", record.id));
        count++;
      }
      message.success(`Đã xóa vĩnh viễn thành công ${count} tài khoản khỏi hệ thống!`);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      fetchDangVienDuBi();
    } catch (error) {
      console.error(error);
      message.error("Lỗi khi xóa hàng loạt");
    } finally {
      setLoading(false);
    }
  };

  const calculateHanXet = (ngayVaoDang) => {
    if (!ngayVaoDang) return null;
    const ngayVao = dayjs(ngayVaoDang);
    if (!ngayVao.isValid()) return null;
    
    const hanXet = ngayVao.add(12, 'month');
    const today = dayjs();
    const daysLeft = hanXet.diff(today, 'day');
    
    return {
      hanXetDate: hanXet.format('DD/MM/YYYY'),
      daysLeft
    };
  };

  const getStatusBadge = (daysLeft, status) => {
    if (status === 5 || status === 6) {
      return <Badge status="success" text="Đã nộp đúng hạn" />;
    }
    if (daysLeft === null) return <Badge status="default" text="Chưa xác định" />;
    
    if (daysLeft > 30) {
      return <Badge status="success" text={`Còn ${daysLeft} ngày`} />;
    } else if (daysLeft > 0) {
      return <Badge status="warning" text={`Sắp đến hạn (${daysLeft} ngày)`} />;
    } else {
      return <Badge status="error" text={`Quá hạn (${Math.abs(daysLeft)} ngày)`} />;
    }
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (text, record, index) => index + 1
    },
    { 
      title: 'Họ tên & MSSV', 
      key: 'ho_ten',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <a 
            style={{ fontWeight: 500, color: '#1890ff' }} 
            onClick={() => {
              setEditingRecord(record);
              form.setFieldsValue({
                ...record,
                dvhd_theo_doi: record.dvhd_theo_doi || record.dvhd || undefined,
                dvhd_ho_so: record.dvhd_ho_so || record.dvhd || undefined,
                ngay_sinh: record.ngay_sinh ? dayjs(record.ngay_sinh) : null,
                ngay_vao_dang: record.ngay_vao_dang ? dayjs(record.ngay_vao_dang) : null,
                ngay_cong_nhan_dvct: record.ngay_cong_nhan_dvct ? dayjs(record.ngay_cong_nhan_dvct) : null,
                ngay_ky_quyet_dinh_dvct: record.ngay_ky_quyet_dinh_dvct ? dayjs(record.ngay_ky_quyet_dinh_dvct) : null
              });
              setDrawerVisible(true);
            }}
          >
            {record.ho_ten}
          </a>
          <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.mssv}</span>
        </div>
      )
    },
    { 
      title: 'Chi đoàn / Khoa', 
      key: 'chi_doan',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 500 }}>{record.lop}</span>
          <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.khoa}</span>
        </div>
      )
    },
    { 
      title: 'Ngày vào Đảng', 
      dataIndex: 'ngay_vao_dang', 
      key: 'ngay_vao_dang',
      render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : ''
    },
    { title: 'ĐVHD', dataIndex: 'dvhd_ho_so', key: 'dvhd_ho_so' },
    {
      title: 'Lớp ĐVM',
      dataIndex: 'hoc_lop_dv_moi',
      key: 'hoc_lop_dv_moi',
      render: (val) => val ? <Badge status="success" text="Đã học" /> : <Badge status="error" text="Chưa học" />
    },
    {
      title: 'Trạng thái & Hạn xét',
      key: 'trang_thai_han_xet',
      render: (_, record) => {
        const status = record.ho_so_status || 1;
        let badgeColor = '#bfbfbf'; // Xám
        if (status === 1 || status === 2) badgeColor = '#1890ff'; // Xanh nhạt
        if (status === 3 || status === 4) badgeColor = '#faad14'; // Vàng
        if (status === 5 || status === 6) badgeColor = '#52c41a'; // Xanh lá
        
        const han = calculateHanXet(record.ngay_vao_dang);
        const daysLeft = han ? han.daysLeft : null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>
              <Badge color={badgeColor} text={`B${status}: ${SHORT_STEPS[status]}`} />
            </div>
            {han && (
              <div>
                <Tooltip title={status >= 5 ? "Hồ sơ đã được nộp thành công lên VPĐU/ĐHĐN" : `Hạn xét: ${han.hanXetDate}`}>
                  {getStatusBadge(daysLeft, status)}
                </Tooltip>
              </div>
            )}
          </div>
        );
      }
    }
  ];

  const handlePrepareEmail = (record, daysLeft, isUrgent) => {
    const targetEmail = record.dvhd_email || record.email;
    if (!targetEmail || !configLinkHoSo) {
      message.error("Thiếu thông tin để gửi email (Yêu cầu có email và link hồ sơ)!");
      return;
    }
    
    const status = record.ho_so_status || 1;
    const defaultSubject = "Nhắc chuẩn bị hồ sơ xét công nhận Đảng viên chính thức";
    const defaultBody = 
      `Kính gửi đồng chí ${record.ho_ten},\n\n` +
      `Chi bộ Sinh viên xin thông báo về việc chuẩn bị hồ sơ xét công nhận Đảng viên chính thức của đồng chí với các thông tin sau:\n` +
      `- MSSV: ${record.mssv || 'Chưa cập nhật'}\n` +
      `- Ngày vào Đảng: ${dayjs(record.ngay_vao_dang).format('DD/MM/YYYY')}\n\n` +
      (daysLeft >= 0 ? `Đảng viên còn ${daysLeft} ngày` : `Đảng viên đã quá hạn ${Math.abs(daysLeft)} ngày`) + ` để hoàn thiện hồ sơ xét công nhận Đảng viên chính thức.\n` +
      (isUrgent ? `⚠️ Thời gian rất gấp, đề nghị khẩn trương hoàn thiện!\n\n` : `\n`) +
      (status <= 3 && daysLeft <= 30 ? `Hiện hồ sơ đang ở bước: Bước ${status} - ${HO_SO_STEPS[status]}\n\n` : '') +
      `Hồ sơ cần chuẩn bị:\n` +
      `Vui lòng chuẩn bị đầy đủ hồ sơ theo hướng dẫn tại link sau:\n` +
      `${configLinkHoSo}\n\n` +
      `Đảng viên hướng dẫn:\n` +
      `- Họ tên: ${record.dvhd || 'Chưa cập nhật'}\n` +
      `- Email: ${targetEmail}\n\n` +
      `Thông tin liên hệ Hỗ trợ:\n` +
      `- ${configGroupName}\n` +
      `- Link tham gia: ${configGroupLink}\n\n` +
      `Đề nghị đồng chí chủ động liên hệ và hoàn thiện hồ sơ đúng thời hạn.\n\n` +
      `Trân trọng,\nChi bộ Sinh viên`;

    setEmailRecord({ ...record, daysLeft, isUrgent, targetEmail });
    setEmailSubject(defaultSubject);
    setEmailBodyText(defaultBody);
    setIsEmailModalVisible(true);
  };

  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleConfirmSendEmail = async () => {
    if (!emailRecord) return;
    setIsSendingEmail(true);
    
    try {
      const formattedBodyText = emailBodyText.replace(/\n/g, '<br />');
      const htmlBody = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nhắc chuẩn bị hồ sơ xét công nhận Đảng viên chính thức</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
            <link href="https://fonts.cdnfonts.com/css/svn-gilroy" rel="stylesheet">
            <style>
              body, table, td, p, a, div, h2 {
                font-family: 'SVN-Gilroy', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
              }
              @media only screen and (max-width: 600px) {
                body {
                  padding: 0 !important;
                  background-color: #ffffff !important;
                }
                .email-container {
                  width: 100% !important;
                  max-width: 100% !important;
                  border: none !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                }
                .email-header {
                  padding: 20px 15px !important;
                }
                .email-header h2 {
                  font-size: 18px !important;
                }
                .email-header p {
                  font-size: 11px !important;
                }
                .email-body {
                  padding: 20px 15px !important;
                }
                .footer-cell-left {
                  display: block !important;
                  width: 100% !important;
                  padding-right: 0 !important;
                  padding-bottom: 20px !important;
                  text-align: center !important;
                }
                .footer-cell-left img {
                  margin: 0 auto 8px auto !important;
                }
                .footer-cell-divider {
                  display: none !important;
                }
                .footer-cell-right {
                  display: block !important;
                  width: 100% !important;
                  padding-left: 0 !important;
                  text-align: center !important;
                }
                .footer-cell-right div {
                  text-align: center !important;
                }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 20px; background-color: #f4f6f8;">
            <div class="email-container" style="font-family: 'SVN-Gilroy', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align: justify; background-color: #ffffff;">
              <!-- Header Banner -->
              <div class="email-header" style="background-color: #b71c1c; background: linear-gradient(135deg, #c62828 0%, #b71c1c 100%); padding: 24px; text-align: center; border-bottom: 4px solid #fbc02d;">
                <p style="color: #ffffff; margin: 0 0 8px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'SVN-Gilroy', 'Inter', sans-serif;">Chi bộ Sinh viên - Đảng bộ Trường Đại học Kinh tế, ĐHĐN</p>
                <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'SVN-Gilroy', 'Inter', sans-serif;">THƯ NHẮC NHỞ HOÀN THIỆN HỒ SƠ CHÍNH THỨC</h2>
              </div>
          
              <!-- Content Body -->
              <div class="email-body" style="padding: 30px 24px; line-height: 1.8; color: #333333; font-size: 14px; background-color: #ffffff; text-align: justify; font-family: 'SVN-Gilroy', 'Inter', sans-serif;">
                <div style="font-size: 14px; color: #333333; text-align: justify; line-height: 1.8;">
                  ${formattedBodyText}
                </div>
              </div>
          
              <!-- Brand Signature Footer -->
              <div style="background-color: #ffffff; padding: 24px 20px; border-top: 1.5px solid #e0e0e0; font-family: 'SVN-Gilroy', 'Inter', sans-serif;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <!-- Left Side: Logo & Name -->
                    <td class="footer-cell-left" width="42%" align="center" style="vertical-align: middle; padding-right: 15px;">
                      <img src="https://chibosinhvien.vercel.app/logo.png" alt="Logo Chi Bộ Sinh Viên" height="70" style="display: block; margin-bottom: 8px;" />
                      <div style="color: #b71c1c; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-family: 'SVN-Gilroy', 'Inter', Arial, sans-serif;">CHI BỘ SINH VIÊN</div>
                      <div style="color: #610c0c; font-size: 9px; font-weight: bold; text-transform: uppercase; font-family: 'SVN-Gilroy', 'Inter', Arial, sans-serif;">ĐẢNG BỘ TRƯỜNG ĐẠI HỌC KINH TẾ</div>
                    </td>
                    
                    <!-- Divider Line -->
                    <td class="footer-cell-divider" width="3%" align="center" style="vertical-align: middle;">
                      <div style="border-left: 1.5px solid #b71c1c; height: 95px; width: 1px;"></div>
                    </td>
                    
                    <!-- Right Side: Contacts -->
                    <td class="footer-cell-right" width="55%" style="vertical-align: middle; padding-left: 15px; text-align: left; font-size: 12px; color: #333333; line-height: 1.5;">
                      <div style="margin-bottom: 4px;">
                        <strong style="color: #b71c1c;">Fanpage:</strong> <a href="https://fb.com/chibosinhvienDUE" target="_blank" style="color: #096dd9; text-decoration: underline;">fb.com/chibosinhvienDUE</a>
                      </div>
                      <div style="margin-bottom: 4px;">
                        <strong style="color: #b71c1c;">Website:</strong> <a href="https://chibosinhvien.vn/" target="_blank" style="color: #096dd9; text-decoration: underline;">chibosinhvien.vn/</a>
                      </div>
                      <div style="margin-bottom: 6px;">
                        <strong style="color: #b71c1c;">Email:</strong> <a href="mailto:chibosinhvien@due.edu.vn" style="color: #096dd9; text-decoration: underline;">chibosinhvien@due.edu.vn</a>
                      </div>
                      <div style="margin-top: 4px; border-top: 1px dashed #e0e0e0; padding-top: 4px;">
                        <strong style="color: #b71c1c;">Liên hệ:</strong><br />
                        TS. Bùi Trung Hiệp - Bí thư Chi bộ<br />
                        <a href="mailto:hiepbt@due.edu.vn" style="color: #096dd9; text-decoration: underline;">hiepbt@due.edu.vn</a> &nbsp;|&nbsp; <span style="color: #096dd9; text-decoration: underline;">0935.743.555</span>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            </div>
          </body>
        </html>
      `;

      // 1. Gửi request tới Node.js Backend Server
      const response = await fetch(`${API_BASE_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailRecord.targetEmail,
          subject: emailSubject,
          html: htmlBody
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lỗi không xác định từ Server gửi mail.');
      }

      // 2. Update Database to prevent spam/mark as sent
      await updateDoc(doc(db, "dang_vien", emailRecord.id), {
        last_email_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      message.success("Đã tự động gửi email thành công!");
      setIsEmailModalVisible(false);
      fetchDangVienDuBi();
    } catch (error) {
      console.error(error);
      message.error(error.message || "Lỗi khi gửi email! Đảm bảo bạn đã chạy Server Node.js.");
    } finally {
      setIsSendingEmail(false);
    }
  };



  const handleSaveDetails = async () => {
    try {
      const values = await form.validateFields();
      
      // Auto-populate dvhd emails from the selected guide names
      const selectedTheoDoiGuide = allOfficialMembers.find(m => m.ho_ten === values.dvhd_theo_doi);
      const dvhd_theo_doi_email = selectedTheoDoiGuide ? selectedTheoDoiGuide.email : null;
      
      const selectedHoSoGuide = allOfficialMembers.find(m => m.ho_ten === values.dvhd_ho_so);
      const dvhd_ho_so_email = selectedHoSoGuide ? selectedHoSoGuide.email : null;

      const formatted = {
        ...values,
        dvhd_theo_doi_email: dvhd_theo_doi_email || null,
        dvhd_ho_so_email: dvhd_ho_so_email || null,
        ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : null,
        ngay_vao_dang: values.ngay_vao_dang ? values.ngay_vao_dang.format('YYYY-MM-DD') : null,
        updated_at: new Date().toISOString()
      };

      // Loại bỏ các giá trị undefined để tránh lỗi Firestore
      const cleaned = {};
      Object.keys(formatted).forEach(key => {
        cleaned[key] = formatted[key] === undefined ? null : formatted[key];
      });

      if (editingRecord && editingRecord.id) {
        await updateDoc(doc(db, "dang_vien", editingRecord.id), cleaned);
        message.success("Cập nhật thông tin thành công!");
      } else {
        cleaned.loai_dang_vien = "Dự bị";
        cleaned.dang_vien_du_bi = true;
        cleaned.ho_so_status = 1;
        cleaned.ho_so_history = [];
        cleaned.created_at = new Date().toISOString();
        
        // Ensure MSSV is unique
        const q = query(collection(db, "dang_vien"), where("mssv", "==", values.mssv));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          message.error("MSSV đã tồn tại trong hệ thống!");
          return;
        }

        await addDoc(collection(db, "dang_vien"), cleaned);
        message.success("Thêm Đảng viên dự bị thành công!");
      }

      setDrawerVisible(false);
      fetchDangVienDuBi();
    } catch (error) {
      console.error(error);
      if (!error.errorFields) message.error("Lỗi khi lưu thông tin");
    }
  };

  const handleChuyenChinhThuc = async () => {
    try {
      const values = await chuyenChinhThucForm.validateFields();
      
      if (!editingRecord) return;

      const formatted = {
        loai_dang_vien: "Chính thức",
        dang_vien_du_bi: false,
        ngay_cong_nhan_dvct: editingRecord.ngay_vao_dang ? dayjs(editingRecord.ngay_vao_dang).add(1, 'year').format('YYYY-MM-DD') : null,
        ngay_ky_quyet_dinh_dvct: values.ngay_ky_quyet_dinh_dvct.format('YYYY-MM-DD'),
        so_quyet_dinh_dvct: values.so_quyet_dinh_dvct,
        updated_at: new Date().toISOString()
      };

      await updateDoc(doc(db, "dang_vien", editingRecord.id), formatted);
      message.success("Chuyển Đảng viên chính thức thành công!");
      
      setIsChuyenChinhThucModalVisible(false);
      fetchDangVienDuBi();
    } catch (error) {
      console.error(error);
      if (error.errorFields) {
        message.error("Phải nhập ngày ký và số quyết định");
      }
    }
  };

  const handleNextStep = async () => {
    const currentStep = editingRecord?.ho_so_status || 1;
    if (currentStep >= 6) return;

    if (currentStep === 1) {
      const currentDvhd = form.getFieldValue('dvhd_ho_so') || editingRecord?.dvhd_ho_so;
      if (!currentDvhd || !currentDvhd.trim()) {
        message.error("Bắt buộc phải phân công Đảng viên hướng dẫn mới được chuyển sang Bước 2!");
        return;
      }
    }

    setIsNextStepModalVisible(true);
    setNextStepNote('');
  };

  const submitNextStep = async () => {
    const currentStep = editingRecord?.ho_so_status || 1;
    setNextStepLoading(true);
    try {
      const newHistory = [...(editingRecord?.ho_so_history || []), {
        from: currentStep,
        to: currentStep + 1,
        time: new Date().toISOString(),
        note: nextStepNote || "",
        updated_by: currentUser?.email || currentUser?.username || "Admin"
      }];

      const updateData = {
        ho_so_status: currentStep + 1,
        ho_so_history: newHistory,
        updated_at: new Date().toISOString()
      };

      await updateDoc(doc(db, "dang_vien", editingRecord.id), updateData);
      message.success(`Đã chuyển sang Bước ${currentStep + 1}: ${HO_SO_STEPS[currentStep + 1]}`);
      
      setEditingRecord({ ...editingRecord, ...updateData });
      setIsNextStepModalVisible(false);
      setNextStepNote('');
      fetchDangVienDuBi();
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi chuyển bước hồ sơ!");
    } finally {
      setNextStepLoading(false);
    }
  };

  const uniqueIntakes = useMemo(() => {
    const intakes = data.map(item => {
      const lop = item.lop || "";
      const match = lop.match(/^(\d+K)/) || lop.match(/^(\d+)/);
      return match ? match[1] : null;
    }).filter(Boolean);
    return [...new Set(intakes)].sort();
  }, [data]);

  const resetFilters = () => {
    setSearchText('');
    setFilterKhoa(null);
    setFilterLop(null);
    setFilterIntake(null);
    setFilterHocLop(null);
    setFilterHanXet(null);
    setFilterThangXet(null);
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (searchText && !(
        item.mssv?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.ho_ten?.toLowerCase().includes(searchText.toLowerCase())
      )) {
        return false;
      }
      if (filterKhoa && item.khoa !== filterKhoa) return false;
      if (filterLop && item.lop !== filterLop) return false;
      if (filterIntake) {
        const lop = item.lop || "";
        const match = lop.match(/^(\d+K)/) || lop.match(/^(\d+)/);
        const intake = match ? match[1] : null;
        if (intake !== filterIntake) return false;
      }
      if (filterHocLop !== null && (item.hoc_lop_dv_moi || false) !== filterHocLop) return false;
      if (filterHanXet) {
        const han = calculateHanXet(item.ngay_vao_dang);
        if (!han) return false;
        if (filterHanXet === 'chuadenhan' && han.daysLeft <= 30) return false;
        if (filterHanXet === 'danglam' && (han.daysLeft <= 0 || han.daysLeft > 30)) return false;
        if (filterHanXet === 'quahan' && han.daysLeft > 0) return false;
      }
      if (filterThangXet) {
        const han = calculateHanXet(item.ngay_vao_dang);
        if (!han) return false;
        const hanDate = dayjs(han.hanXetDate, 'DD/MM/YYYY');
        if (hanDate.month() !== filterThangXet.month() || hanDate.year() !== filterThangXet.year()) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      const hanA = calculateHanXet(a.ngay_vao_dang);
      const hanB = calculateHanXet(b.ngay_vao_dang);
      const daysA = hanA ? hanA.daysLeft : Infinity;
      const daysB = hanB ? hanB.daysLeft : Infinity;
      return daysA - daysB;
    });
  }, [data, searchText, filterKhoa, filterLop, filterIntake, filterHocLop, filterHanXet, filterThangXet]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys, rows) => {
      setSelectedRowKeys(keys);
      setSelectedRows(rows);
    }
  };

  const startCellEdit = (id, dataIndex, val) => {
    setEditingCell({ id, dataIndex });
    setEditValue(val);
  };

  const cancelCellEdit = () => {
    setEditingCell(null);
    setEditValue(null);
  };

  const saveCellEdit = async (id, dataIndex, newVal) => {
    const record = data.find(item => item.id === id);
    if (!record) {
      cancelCellEdit();
      return;
    }

    if (newVal === record[dataIndex]) {
      cancelCellEdit();
      return;
    }

    const hideMessage = message.loading('Đang cập nhật dữ liệu...', 0);
    try {
      const updateData = {
        [dataIndex]: newVal === undefined ? null : newVal,
        updated_at: new Date().toISOString()
      };

      await updateDoc(doc(db, "dang_vien", id), updateData);
      
      setData(prevData => prevData.map(item => {
        if (item.id === id) {
          return { ...item, ...updateData };
        }
        return item;
      }));

      message.success('Đã cập nhật thành công!');
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi cập nhật dữ liệu: ' + err.message);
    } finally {
      hideMessage();
      cancelCellEdit();
    }
  };

  const columnTypes = {
    mssv: { type: 'text' },
    ho_ten: { type: 'text' },
    gioi_tinh: { type: 'select', options: [{ value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }] },
    ngay_sinh: { type: 'date' },
    lop: { type: 'text' },
    khoa: { type: 'select', options: KHOA_LIST.map(k => ({ value: k, label: k })) },
    sdt: { type: 'text' },
    email: { type: 'text' },
    cccd: { type: 'text' },
    xa_phuong_qq: { type: 'text' },
    tinh_tp_qq: { type: 'text' },
    chi_tiet_dc: { type: 'text' },
    xa_phuong_tt: { type: 'text' },
    tinh_tp_tt: { type: 'text' },
    dia_chi_tam_tru: { type: 'text' },
    ngay_vao_dang: { type: 'date' },
    dvhd_theo_doi: { type: 'text' },
    dvhd_ho_so: { type: 'text' },
    hoc_lop_dv_moi: { type: 'select', options: [{ value: true, label: 'Đã học' }, { value: false, label: 'Chưa học' }] },
    ho_so_status: {
      type: 'select',
      options: Object.keys(HO_SO_STEPS).map(k => ({ value: Number(k), label: `Bước ${k}: ${SHORT_STEPS[k]}` }))
    }
  };

  const wrapEditableColumn = (col, type = 'text', options = []) => {
    const dataIndex = col.dataIndex || col.key;
    if (!dataIndex || dataIndex === 'stt' || col.key === 'actions') {
      return col;
    }

    const originalRender = col.render;

    col.render = (text, record, index) => {
      const isEditing = editingCell && editingCell.id === record.id && editingCell.dataIndex === dataIndex;
      const value = record[dataIndex];

      if (isEditing) {
        if (type === 'select') {
          return (
            <Select
              value={editValue}
              onChange={(val) => {
                setEditValue(val);
                saveCellEdit(record.id, dataIndex, val);
              }}
              onBlur={() => cancelCellEdit()}
              autoFocus
              defaultOpen
              size="small"
              style={{ width: '100%', minWidth: '90px' }}
            >
              {options.map(opt => (
                <Option key={String(opt.value)} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          );
        } else if (type === 'date') {
          return (
            <DatePicker
              value={editValue ? dayjs(editValue) : null}
              onChange={(date) => {
                const val = date ? date.format('YYYY-MM-DD') : null;
                saveCellEdit(record.id, dataIndex, val);
              }}
              onBlur={() => {
                setTimeout(() => cancelCellEdit(), 200);
              }}
              autoFocus
              defaultOpen
              size="small"
              format="DD/MM/YYYY"
              style={{ width: '100%', minWidth: '110px' }}
            />
          );
        } else {
          return (
            <Input
              value={editValue || ''}
              onChange={e => setEditValue(e.target.value)}
              onPressEnter={() => saveCellEdit(record.id, dataIndex, editValue)}
              onKeyDown={e => {
                if (e.key === 'Escape') cancelCellEdit();
              }}
              onBlur={() => saveCellEdit(record.id, dataIndex, editValue)}
              autoFocus
              size="small"
              style={{ width: '100%' }}
            />
          );
        }
      }

      const displayVal = originalRender ? originalRender(text, record, index) : (text !== undefined && text !== null ? String(text) : '--');
      
      return (
        <div 
          onDoubleClick={(e) => {
            e.stopPropagation();
            startCellEdit(record.id, dataIndex, value);
          }}
          title="Nhấp đúp chuột để sửa nhanh"
          style={{ 
            minHeight: '22px', 
            width: '100%', 
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: '4px',
            border: '1px transparent solid',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
            e.currentTarget.style.borderColor = '#d9d9d9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          {displayVal}
        </div>
      );
    };

    return col;
  };

  const getUniqueColumnFilters = (dataSource, field) => {
    if (!dataSource || !Array.isArray(dataSource)) return [];
    const uniqueVals = [...new Set(dataSource.map(item => item && item[field]).filter(Boolean))];
    uniqueVals.sort((a, b) => String(a).localeCompare(String(b)));
    return uniqueVals.map(val => ({ text: String(val), value: val }));
  };

  const getColumnSearchProps = (dataIndex, title) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onClick={e => e.stopPropagation()}>
        <Input
          placeholder={`Tìm ${title}`}
          value={selectedKeys[0]}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block', borderRadius: '4px' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90, borderRadius: '4px', backgroundColor: '#c62828', borderColor: '#c62828' }}
          >
            Tìm
          </Button>
          <Button 
            onClick={() => { clearFilters(); confirm(); }} 
            size="small" 
            style={{ width: 90, borderRadius: '4px' }}
          >
            Đặt lại
          </Button>
        </Space>
      </div>
    ),
    filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
    onFilter: (value, record) =>
      record[dataIndex]
        ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase())
        : false,
  });

  const allInfoColumns = useMemo(() => {
    const rawCols = [
      {
        title: 'STT',
        key: 'stt',
        width: 60,
        fixed: 'left',
        render: (_, __, index) => index + 1
      },
      {
        title: 'Chi tiết',
        key: 'actions',
        width: 70,
        fixed: 'left',
        align: 'center',
        render: (_, record) => (
          <Tooltip title="Xem chi tiết hồ sơ">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: '#1890ff', fontSize: '16px' }} />}
              onClick={(e) => {
                e.stopPropagation();
                setEditingRecord(record);
                form.setFieldsValue({
                  ...record,
                  dvhd_theo_doi: record.dvhd_theo_doi || record.dvhd || undefined,
                  dvhd_ho_so: record.dvhd_ho_so || record.dvhd || undefined,
                  ngay_sinh: record.ngay_sinh ? dayjs(record.ngay_sinh) : null,
                  ngay_vao_dang: record.ngay_vao_dang ? dayjs(record.ngay_vao_dang) : null,
                  ngay_cong_nhan_dvct: record.ngay_cong_nhan_dvct ? dayjs(record.ngay_cong_nhan_dvct) : null,
                  ngay_ky_quyet_dinh_dvct: record.ngay_ky_quyet_dinh_dvct ? dayjs(record.ngay_ky_quyet_dinh_dvct) : null
                });
                setDrawerVisible(true);
              }}
              style={{ padding: 0, height: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </Tooltip>
        )
      },
      { 
        title: 'MSSV', 
        dataIndex: 'mssv', 
        key: 'mssv', 
        width: 120, 
        fixed: 'left',
        sorter: (a, b) => (a.mssv || '').localeCompare(b.mssv || ''),
        ...getColumnSearchProps('mssv', 'MSSV')
      },
      { 
        title: 'Họ tên', 
        dataIndex: 'ho_ten', 
        key: 'ho_ten', 
        width: 180, 
        fixed: 'left',
        sorter: (a, b) => (a.ho_ten || '').localeCompare(b.ho_ten || ''),
        ...getColumnSearchProps('ho_ten', 'Họ tên')
      },
      { 
        title: 'Giới tính', 
        dataIndex: 'gioi_tinh', 
        key: 'gioi_tinh', 
        width: 100,
        filters: [
          { text: 'Nam', value: 'Nam' },
          { text: 'Nữ', value: 'Nữ' }
        ],
        onFilter: (value, record) => record.gioi_tinh === value,
      },
      { 
        title: 'Ngày sinh', 
        dataIndex: 'ngay_sinh', 
        key: 'ngay_sinh', 
        width: 120,
        render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : ''
      },
      { 
        title: 'Lớp', 
        dataIndex: 'lop', 
        key: 'lop', 
        width: 120,
        filters: getUniqueColumnFilters(data, 'lop'),
        onFilter: (value, record) => record.lop === value,
      },
      { 
        title: 'Khoa', 
        dataIndex: 'khoa', 
        key: 'khoa', 
        width: 180,
        filters: KHOA_LIST.map(k => ({ text: k, value: k })),
        onFilter: (value, record) => record.khoa === value,
      },
      { 
        title: 'Số điện thoại', 
        dataIndex: 'sdt', 
        key: 'sdt', 
        width: 130,
        render: (text, record) => record.so_dien_thoai || record.sdt || '--',
        ...getColumnSearchProps('sdt', 'Số điện thoại')
      },
      { 
        title: 'Email', 
        dataIndex: 'email', 
        key: 'email', 
        width: 200,
        ...getColumnSearchProps('email', 'Email')
      },
      { 
        title: 'Số CCCD', 
        dataIndex: 'cccd', 
        key: 'cccd', 
        width: 130,
        ...getColumnSearchProps('cccd', 'Số CCCD')
      },
      { 
        title: 'Quê quán',
        key: 'que_quan',
        width: 200,
        render: (_, r) => {
          const parts = [];
          if (r.xa_phuong_qq) parts.push(r.xa_phuong_qq);
          if (r.tinh_tp_qq) parts.push(r.tinh_tp_qq);
          return parts.join(', ') || '--';
        }
      },
      {
        title: 'Xã/Phường quê quán',
        dataIndex: 'xa_phuong_qq',
        key: 'xa_phuong_qq',
        width: 180,
        filters: getUniqueColumnFilters(data, 'xa_phuong_qq'),
        onFilter: (value, record) => record.xa_phuong_qq === value,
      },
      {
        title: 'Tỉnh/TP quê quán',
        dataIndex: 'tinh_tp_qq',
        key: 'tinh_tp_qq',
        width: 180,
        filters: getUniqueColumnFilters(data, 'tinh_tp_qq'),
        onFilter: (value, record) => record.tinh_tp_qq === value,
      },
      {
        title: 'Địa chỉ thường trú',
        dataIndex: 'chi_tiet_dc',
        key: 'chi_tiet_dc',
        width: 250,
      },
      {
        title: 'Xã/Phường thường trú',
        dataIndex: 'xa_phuong_tt',
        key: 'xa_phuong_tt',
        width: 180,
        filters: getUniqueColumnFilters(data, 'xa_phuong_tt'),
        onFilter: (value, record) => record.xa_phuong_tt === value,
      },
      {
        title: 'Tỉnh/TP thường trú',
        dataIndex: 'tinh_tp_tt',
        key: 'tinh_tp_tt',
        width: 180,
        filters: getUniqueColumnFilters(data, 'tinh_tp_tt'),
        onFilter: (value, record) => record.tinh_tp_tt === value,
      },
      {
        title: 'Địa chỉ tạm trú',
        dataIndex: 'dia_chi_tam_tru',
        key: 'dia_chi_tam_tru',
        width: 250,
      },
      { 
        title: 'Ngày vào Đảng', 
        dataIndex: 'ngay_vao_dang', 
        key: 'ngay_vao_dang', 
        width: 130,
        render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : ''
      },
      { 
        title: 'ĐVHD theo dõi', 
        dataIndex: 'dvhd_theo_doi', 
        key: 'dvhd_theo_doi', 
        width: 180,
        ...getColumnSearchProps('dvhd_theo_doi', 'ĐVHD theo dõi')
      },
      { 
        title: 'ĐVHD làm hồ sơ', 
        dataIndex: 'dvhd_ho_so', 
        key: 'dvhd_ho_so', 
        width: 180,
        ...getColumnSearchProps('dvhd_ho_so', 'ĐVHD làm hồ sơ')
      },
      { 
        title: 'Lớp Đảng viên mới', 
        dataIndex: 'hoc_lop_dv_moi', 
        key: 'hoc_lop_dv_moi', 
        width: 150,
        filters: [
          { text: 'Đã học', value: true },
          { text: 'Chưa học', value: false }
        ],
        onFilter: (value, record) => record.hoc_lop_dv_moi === value,
        render: (val) => val ? <Tag color="green">Đã học</Tag> : <Tag color="red">Chưa học</Tag>
      },
      {
        title: 'Bước hồ sơ',
        dataIndex: 'ho_so_status',
        key: 'ho_so_status',
        width: 250,
        filters: Object.keys(SHORT_STEPS).map(key => ({ text: `Bước ${key}: ${SHORT_STEPS[key]}`, value: Number(key) })),
        onFilter: (value, record) => (record.ho_so_status || 1) === value,
        render: (status) => `Bước ${status || 1}: ${SHORT_STEPS[status || 1]}`
      }
    ];

    return rawCols.map(col => {
      const dataIndex = col.dataIndex || col.key;
      const config = columnTypes[dataIndex];
      if (config) {
        return wrapEditableColumn(col, config.type, config.options);
      }
      return col;
    });
  }, [filteredData, editingCell, editValue]);

  return (
    <div style={{ padding: '4px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
          <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.3px' }}>
            Hồ sơ Đảng viên chính thức
          </Title>
        </div>
        
        <Space>
          <Button icon={<ExportOutlined />} onClick={handleOpenExportModal} style={{ borderRadius: '6px', fontWeight: 500 }}>Xuất Excel</Button>
          
          <Button 
            type="dashed"
            icon={<TableOutlined style={{ color: '#52c41a' }} />} 
            onClick={() => setIsAllInfoVisible(true)}
            style={{ borderRadius: '6px', fontWeight: 500, borderColor: '#52c41a', color: '#52c41a' }}
          >
            Xem toàn bộ thông tin
          </Button>

          <Button type="primary" ghost icon={<UploadOutlined />} onClick={() => setImportModalVisible(true)} style={{ borderRadius: '6px', fontWeight: 500, borderColor: '#c62828', color: '#c62828' }}>Nhập & Cập nhật từ Excel</Button>
          <Button type="primary" icon={<PlusOutlined />} style={{ backgroundColor: '#c62828', borderRadius: '6px', fontWeight: 500 }} onClick={() => { setEditingRecord(null); form.resetFields(); setDrawerVisible(true); }}>Thêm Đảng viên</Button>
        </Space>
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8c8c8c', fontSize: '13px', marginRight: '4px', fontWeight: 500, flexShrink: 0 }}>
          <FilterOutlined style={{ color: '#c62828' }} /> <span>Bộ lọc:</span>
        </div>
        
        <div style={{ flex: 1.5, minWidth: '200px' }}>
          <Input 
            placeholder="Tìm kiếm MSSV, họ tên..." 
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            style={{ width: '100%', borderRadius: '6px' }} 
            allowClear
          />
        </div>
        
        <div style={{ flex: 1, minWidth: '150px' }}>
          <Select 
            showSearch
            placeholder="Chọn Khoa" 
            style={{ width: '100%' }} 
            allowClear 
            value={filterKhoa} 
            onChange={setFilterKhoa}
            optionFilterProp="children"
            dropdownStyle={{ borderRadius: '6px' }}
          >
            {KHOA_LIST.map(k => <Option key={k} value={k}>{k}</Option>)}
          </Select>
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <Select 
            showSearch
            placeholder="Chọn Lớp" 
            style={{ width: '100%' }} 
            allowClear 
            value={filterLop} 
            onChange={setFilterLop}
            optionFilterProp="children"
            dropdownStyle={{ borderRadius: '6px' }}
          >
            {[...new Set(data.map(d => d.lop).filter(Boolean))].map(lop => (
              <Option key={lop} value={lop}>{lop}</Option>
            ))}
          </Select>
        </div>

        <div style={{ flex: 1, minWidth: '120px' }}>
          <Select 
            placeholder="Khóa" 
            style={{ width: '100%' }} 
            allowClear 
            value={filterIntake} 
            onChange={setFilterIntake}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            {uniqueIntakes.map(k => (
              <Option key={k} value={k}>{k}</Option>
            ))}
          </Select>
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <Select 
            placeholder="Lớp ĐVM (Đã học / Chưa)" 
            style={{ width: '100%' }} 
            allowClear 
            value={filterHocLop} 
            onChange={setFilterHocLop}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            <Option value={true}>Đã học</Option>
            <Option value={false}>Chưa học</Option>
          </Select>
        </div>

        <div style={{ flex: 1, minWidth: '180px' }}>
          <Select 
            placeholder="Trạng thái hồ sơ" 
            style={{ width: '100%' }} 
            allowClear 
            value={filterHanXet} 
            onChange={setFilterHanXet}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            <Option value="quahan">Quá hạn (&lt; -30 ngày)</Option>
            <Option value="danglam">Đang làm hồ sơ (± 30 ngày)</Option>
            <Option value="chuadenhan">Chưa đến hạn (&gt; 30 ngày)</Option>
          </Select>
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <DatePicker 
            picker="month"
            placeholder="Tháng xét duyệt" 
            style={{ width: '100%', borderRadius: '6px' }} 
            allowClear 
            value={filterThangXet} 
            onChange={setFilterThangXet}
            format="MM/YYYY"
          />
        </div>

        {(searchText || filterKhoa || filterLop || filterIntake || filterHocLop !== null || filterHanXet || filterThangXet) && (
          <div style={{ flexShrink: 0 }}>
            <Button 
              type="text" 
              danger 
              onClick={resetFilters} 
              icon={<CloseOutlined />}
              style={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}
              size="small"
            >
              Xóa lọc
            </Button>
          </div>
        )}
      </div>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Table 
          rowSelection={rowSelection}
          columns={columns} 
          dataSource={filteredData} 
          rowKey="id" 
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50', '100', '1000'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} Đảng viên dự bị`
          }}
        />
      </Card>

      {/* Floating Bulk Actions Panel */}
      {selectedRowKeys.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(198, 40, 40, 0.95)',
          boxShadow: '0 8px 32px rgba(198, 40, 40, 0.3)',
          borderRadius: '16px',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          animation: 'slideUp 0.3s ease',
          color: '#fff'
        }}>
          <span style={{ fontWeight: 800 }}>Đã chọn {selectedRowKeys.length} đồng chí</span>
          <Divider type="vertical" style={{ borderColor: 'rgba(255,255,255,0.3)', height: 20 }} />
          <Space>
            <Button 
              type="text" 
              icon={<MailOutlined />} 
              style={{ color: '#fff', fontWeight: 700 }}
              onClick={handleBulkEmail}
            >
              Gửi email nhắc nhở
            </Button>
            <Dropdown
              menu={{
                items: Object.keys(HO_SO_STEPS).map(key => ({
                  key,
                  label: `B${key}: ${SHORT_STEPS[key]}`,
                  onClick: () => handleBulkStepUpdate(Number(key))
                }))
              }}
              trigger={['click']}
            >
              <Button type="text" icon={<CheckCircleOutlined />} style={{ color: '#fff', fontWeight: 700 }}>
                Cập nhật bước
              </Button>
            </Dropdown>
            <Dropdown
              menu={{
                items: [
                  { key: 'true', label: 'Đã học lớp ĐVM', onClick: () => handleBulkClassUpdate(true) },
                  { key: 'false', label: 'Chưa học lớp ĐVM', onClick: () => handleBulkClassUpdate(false) }
                ]
              }}
              trigger={['click']}
            >
              <Button type="text" icon={<EditOutlined />} style={{ color: '#fff', fontWeight: 700 }}>
                Cập nhật lớp ĐVM
              </Button>
            </Dropdown>
            <Popconfirm
              title="Xác nhận xóa hàng loạt?"
              description="Toàn bộ thông tin các đảng viên được chọn sẽ bị xóa vĩnh viễn khỏi hệ thống."
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={handleBulkDelete}
            >
              <Button type="text" danger icon={<DeleteOutlined />} style={{ color: '#ffeb3b', fontWeight: 700 }}>
                Xóa
              </Button>
            </Popconfirm>
            <Button 
              size="small" 
              style={{ borderRadius: '6px', fontWeight: 600 }}
              onClick={() => { setSelectedRowKeys([]); setSelectedRows([]); }}
            >
              Bỏ chọn
            </Button>
          </Space>
        </div>
      )}

      {/* Excel Import Modal */}
      <ImportExcel 
        open={importModalVisible} 
        onCancel={() => setImportModalVisible(false)} 
        onSuccess={() => { setImportModalVisible(false); fetchDangVienDuBi(); }} 
      />

      {/* Drawer for View/Edit Detail */}
      <Drawer
        title={editingRecord ? "Chi tiết Đảng viên dự bị" : "Thêm mới Đảng viên dự bị"}
        width={720}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              {editingRecord && (
                <>
                  <Button 
                    icon={<MailOutlined />} 
                    onClick={() => {
                      const han = calculateHanXet(editingRecord.ngay_vao_dang);
                      handlePrepareEmail(editingRecord, han ? han.daysLeft : null, han && han.daysLeft <= 7);
                    }}
                  >
                    Gửi email
                  </Button>
                  <Button 
                    icon={<CheckCircleOutlined />}
                    onClick={() => {
                      chuyenChinhThucForm.resetFields();
                      setIsChuyenChinhThucModalVisible(true);
                    }}
                  >
                    Chuyển chính thức
                  </Button>
                </>
              )}
            </Space>
            <Space>
              <Button onClick={() => setDrawerVisible(false)}>Đóng</Button>
              <Button type="primary" onClick={handleSaveDetails} style={{ backgroundColor: '#c62828' }}>Lưu thay đổi</Button>
            </Space>
          </div>
        }
      >
        {editingRecord && (
          <div style={{ marginBottom: 24, padding: '20px', background: '#fafafa', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: '8px' }}>
              <Title level={5} style={{ margin: 0, flex: '1 1 auto', minWidth: '220px' }}>Tiến độ hồ sơ xét chuyển chính thức</Title>
              <Tag color="blue" style={{ fontSize: 13, padding: '4px 8px' }}>Bước {editingRecord.ho_so_status || 1}: {HO_SO_STEPS[editingRecord.ho_so_status || 1]}</Tag>
            </div>
            <Steps
              current={(editingRecord.ho_so_status || 1) - 1}
              size="small"
              progressDot
              items={Object.keys(SHORT_STEPS).map(key => ({
                title: `B${key}`,
                description: SHORT_STEPS[key]
              }))}
            />
            <Divider style={{ margin: '16px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <strong>Trạng thái: </strong>
                <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                  Bước {editingRecord.ho_so_status || 1}: {HO_SO_STEPS[editingRecord.ho_so_status || 1]}
                </span>
              </div>
              {(editingRecord.ho_so_status || 1) < 6 && (
                <Button 
                  type="primary" 
                  style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
                  onClick={handleNextStep}
                >
                  Chuyển bước tiếp theo 👉
                </Button>
              )}
            </div>
            
            {editingRecord.ho_so_history && editingRecord.ho_so_history.length > 0 && (
              <div style={{ marginTop: 16, background: '#f5f5f5', padding: '10px 16px', borderRadius: '8px' }}>
                <span style={{ fontSize: 12, fontWeight: 'bold', color: '#595959', display: 'block', marginBottom: 6 }}>
                  📜 Lịch sử chuyển bước:
                </span>
                <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: '#8c8c8c' }}>
                  {editingRecord.ho_so_history.map((log, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>
                      Chuyển từ <strong>Bước {log.from}</strong> → <strong>Bước {log.to}</strong> ({dayjs(log.time).format('DD/MM/YYYY HH:mm')} bởi {log.updated_by || 'Hệ thống'})
                      {log.note && <div style={{ color: '#555', fontStyle: 'italic', paddingLeft: 8 }}>Ghi chú: {log.note}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <Form form={form} layout="vertical">
          {/* Section: Thông tin cá nhân & Học tập */}
          <div style={{ 
            padding: '16px', 
            border: '1px solid #e8e8e8', 
            borderRadius: '12px', 
            backgroundColor: '#fbfbfb', 
            marginBottom: '20px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#b71c1c', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #f0f0f0', paddingBottom: '6px' }}>
              <UserOutlined style={{ fontSize: '16px' }} /> Thông tin cá nhân & Học tập
            </span>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="mssv" label="MSSV (Mã số sinh viên)" rules={[{ required: true, message: 'Vui lòng nhập MSSV!' }]}>
                  <Input disabled={!!editingRecord} placeholder="Nhập MSSV..." style={{ borderRadius: '6px' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="ho_ten" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}>
                  <Input placeholder="Nhập họ và tên..." style={{ borderRadius: '6px' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="cccd" label="Số CCCD">
                  <Input placeholder="Nhập số căn cước công dân..." style={{ borderRadius: '6px' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="ngay_sinh" label="Ngày sinh">
                  <DatePicker style={{ width: '100%', borderRadius: '6px' }} format="DD/MM/YYYY" placeholder="Chọn ngày sinh..." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="khoa" label="Khoa">
                  <Select 
                    showSearch 
                    optionFilterProp="children" 
                    placeholder="Chọn Khoa..." 
                    style={{ borderRadius: '6px' }}
                  >
                    {KHOA_LIST.map(k => <Option key={k} value={k}>{k}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="lop" label="Lớp sinh hoạt">
                  <Input placeholder="Nhập tên lớp..." style={{ borderRadius: '6px' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Section: Quê Quán */}
          <div style={{ 
            padding: '16px', 
            border: '1px solid #e8e8e8', 
            borderRadius: '12px', 
            backgroundColor: '#fbfbfb', 
            marginBottom: '20px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#b71c1c', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #f0f0f0', paddingBottom: '6px' }}>
              <EnvironmentOutlined style={{ fontSize: '16px' }} /> Quê quán
            </span>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="xa_phuong_qq" label="Xã/Phường" style={{ marginBottom: 0 }}>
                  <Input placeholder="Nhập xã/phường quê quán..." style={{ borderRadius: '6px' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="tinh_tp_qq" label="Tỉnh/Thành phố" style={{ marginBottom: 0 }}>
                  <Input placeholder="Nhập tỉnh/thành phố quê quán..." style={{ borderRadius: '6px' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Section: Thường Trú */}
          <div style={{ 
            padding: '16px', 
            border: '1px solid #e8e8e8', 
            borderRadius: '12px', 
            backgroundColor: '#fbfbfb', 
            marginBottom: '20px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#b71c1c', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #f0f0f0', paddingBottom: '6px' }}>
              <HomeOutlined style={{ fontSize: '16px' }} /> Hộ khẩu thường trú
            </span>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="xa_phuong_tt" label="Xã/Phường" style={{ marginBottom: 0 }}>
                  <Input placeholder="Xã/Phường..." style={{ borderRadius: '6px' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="tinh_tp_tt" label="Tỉnh/Thành phố" style={{ marginBottom: 0 }}>
                  <Input placeholder="Tỉnh/Thành phố..." style={{ borderRadius: '6px' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="chi_tiet_dc" label="Địa chỉ chi tiết" style={{ marginBottom: 0 }}>
                  <Input placeholder="Số nhà, tên đường, tổ..." style={{ borderRadius: '6px' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Section: Liên lạc & Tạm trú */}
          <div style={{ 
            padding: '16px', 
            border: '1px solid #e8e8e8', 
            borderRadius: '12px', 
            backgroundColor: '#fbfbfb', 
            marginBottom: '20px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#b71c1c', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #f0f0f0', paddingBottom: '6px' }}>
              <PhoneOutlined style={{ fontSize: '16px' }} /> Thông tin liên lạc & Tạm trú
            </span>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="sdt" label="Số điện thoại">
                  <Input placeholder="Nhập số điện thoại..." style={{ borderRadius: '6px' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="email" label="Địa chỉ Email">
                  <Input placeholder="Nhập địa chỉ email liên hệ..." style={{ borderRadius: '6px' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: '16px' }}>
              <Col span={24} style={{ marginBottom: 0 }}>
                <Form.Item name="dia_chi_tam_tru" label="Địa chỉ tạm trú (Chi tiết)" style={{ marginBottom: 0 }}>
                  <Input placeholder="Nhập số nhà, tên đường, tổ/phường nơi tạm trú..." style={{ borderRadius: '6px' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Section: Thông tin Đảng */}
          <div style={{ 
            padding: '16px', 
            border: '1px solid #e8e8e8', 
            borderRadius: '12px', 
            backgroundColor: '#fbfbfb', 
            marginBottom: '10px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#b71c1c', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #f0f0f0', paddingBottom: '6px' }}>
              <FlagOutlined style={{ fontSize: '16px' }} /> Thông tin Đảng
            </span>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="ngay_vao_dang" label="Ngày vào Đảng" rules={[{ required: true, message: 'Vui lòng chọn ngày vào Đảng!' }]}>
                  <DatePicker style={{ width: '100%', borderRadius: '6px' }} format="DD/MM/YYYY" placeholder="Chọn ngày vào Đảng..." />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="hoc_lop_dv_moi" label="Học lớp Đảng viên mới">
                  <Select style={{ width: '100%', borderRadius: '6px' }}>
                    <Option value={true}>Đã học</Option>
                    <Option value={false}>Chưa học</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="dvhd_theo_doi" label="ĐVHD theo dõi (từ lúc vào chi bộ)">
                  <Select
                    showSearch
                    placeholder="Chọn Đảng viên hướng dẫn"
                    optionFilterProp="children"
                    allowClear
                    style={{ width: '100%', borderRadius: '6px' }}
                  >
                    {allOfficialMembers.map(member => (
                      <Option key={member.id} value={member.ho_ten}>
                        {member.ho_ten} ({member.lop || member.khoa || 'Chính thức'})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="dvhd_ho_so" label="ĐVHD làm hồ sơ công nhận ĐVCT">
                  <Select
                    showSearch
                    placeholder="Chọn Đảng viên hướng dẫn làm hồ sơ"
                    optionFilterProp="children"
                    allowClear
                    style={{ width: '100%', borderRadius: '6px' }}
                  >
                    {allOfficialMembers.map(member => (
                      <Option key={member.id} value={member.ho_ten}>
                        {member.ho_ten} ({member.lop || member.khoa || 'Chính thức'})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: '16px' }}>
              <Col span={24}>
                <Form.Item name="ghi_chu" label="Ghi chú hồ sơ" style={{ marginBottom: 0 }}>
                  <Input.TextArea rows={3} placeholder="Ghi chú về tiến độ hồ sơ, các giấy tờ còn thiếu, v.v..." style={{ borderRadius: '6px' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

        </Form>
      </Drawer>

      {/* Modal Chuyển Chính Thức */}
      <Modal
        title="Chuyển Đảng viên Chính thức"
        open={isChuyenChinhThucModalVisible}
        onOk={handleChuyenChinhThuc}
        onCancel={() => setIsChuyenChinhThucModalVisible(false)}
        okText="Xác nhận"
        cancelText="Hủy"
        okButtonProps={{ style: { backgroundColor: '#c62828' } }}
      >
        <Form form={chuyenChinhThucForm} layout="vertical">
          <Form.Item 
            name="ngay_ky_quyet_dinh_dvct" 
            label="Ngày ký quyết định" 
            rules={[{ required: true, message: 'Phải nhập ngày ký quyết định' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item 
            name="so_quyet_dinh_dvct" 
            label="Số quyết định" 
            rules={[{ required: true, message: 'Phải nhập số quyết định' }]}
          >
            <Input placeholder="Nhập số quyết định..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Chuyển bước kèm ghi chú */}
      <Modal
        title={`Chuyển sang Bước ${(editingRecord?.ho_so_status || 1) + 1}`}
        open={isNextStepModalVisible}
        onOk={submitNextStep}
        onCancel={() => {
          setIsNextStepModalVisible(false);
          setNextStepNote('');
        }}
        okText="Chuyển bước"
        cancelText="Hủy"
        confirmLoading={nextStepLoading}
        okButtonProps={{ style: { backgroundColor: '#c62828' } }}
      >
        <div style={{ marginBottom: 12 }}>
          {editingRecord?.ho_so_status === 3 && (
            <Alert 
              message="Lưu ý khi chuyển sang Bước 4" 
              description="Đảm bảo bạn đã nhận được Nhận xét cư trú của Đảng viên này và đã chuẩn bị các bản tự kiểm điểm liên quan." 
              type="info" 
              showIcon 
              style={{ marginBottom: 12 }}
            />
          )}
          {editingRecord?.ho_so_status === 5 && (
            <Alert 
              message="Lưu ý khi chuyển sang Bước 6" 
              description="Đảm bảo đã có đầy đủ Biên nhận / Minh chứng nộp hồ sơ lên VPĐU Trường trước khi chuyển tiếp." 
              type="warning" 
              showIcon 
              style={{ marginBottom: 12 }}
            />
          )}
          <p>Nhập ghi chú cho bước chuyển này (không bắt buộc):</p>
        </div>
        <Input.TextArea 
          rows={3} 
          placeholder="Nhập ghi chú chi tiết..." 
          value={nextStepNote} 
          onChange={e => setNextStepNote(e.target.value)} 
          style={{ borderRadius: '6px' }}
        />
      </Modal>

      <Modal
        title={<b>Soạn Thảo & Cấu Hình Email Nhắc Nhở</b>}
        open={isEmailModalVisible}
        onOk={handleConfirmSendEmail}
        onCancel={() => setIsEmailModalVisible(false)}
        okText="Gửi email"
        cancelText="Hủy"
        confirmLoading={isSendingEmail}
        okButtonProps={{ style: { backgroundColor: '#c62828' }, icon: <MailOutlined /> }}
        width={850}
        style={{ top: 40 }}
      >
        {emailRecord && (
          <Tabs defaultActiveKey="compose" style={{ marginTop: -8 }}>
            <Tabs.TabPane tab={<span><EditOutlined />Soạn thảo & Cấu hình</span>} key="compose">
              {/* Configuration Inputs */}
              <div style={{ backgroundColor: '#fafafa', padding: 12, borderRadius: 8, border: '1px solid #f0f0f0', marginBottom: 16 }}>
                <div style={{ fontWeight: 'bold', fontSize: 13, color: '#c62828', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SettingOutlined /> CẤU HÌNH THÔNG TIN CHUNG (Trong nội dung email)
                </div>
                <Row gutter={12}>
                  <Col span={8}>
                    <label style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Tên nhóm hỗ trợ:</label>
                    <Input size="small" value={configGroupName} onChange={e => setConfigGroupName(e.target.value)} style={{ marginTop: 4, borderRadius: 4 }} />
                  </Col>
                  <Col span={8}>
                    <label style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Link nhóm Zalo hỗ trợ:</label>
                    <Input size="small" value={configGroupLink} onChange={e => setConfigGroupLink(e.target.value)} style={{ marginTop: 4, borderRadius: 4 }} />
                  </Col>
                  <Col span={8}>
                    <label style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Link Hướng dẫn hồ sơ:</label>
                    <Input size="small" value={configLinkHoSo} onChange={e => setConfigLinkHoSo(e.target.value)} style={{ marginTop: 4, borderRadius: 4 }} />
                  </Col>
                </Row>
              </div>
              
              {/* Compose Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Tiêu đề email:</label>
                  <Input 
                    value={emailSubject} 
                    onChange={e => setEmailSubject(e.target.value)} 
                    placeholder="Nhập tiêu đề email..." 
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Nội dung email:</label>
                  <Input.TextArea 
                    value={emailBodyText} 
                    onChange={e => setEmailBodyText(e.target.value)} 
                    rows={12} 
                    placeholder="Soạn nội dung email nhắc nhở..." 
                  />
                </div>
              </div>
            </Tabs.TabPane>
            
            <Tabs.TabPane tab={<span><EyeOutlined />Xem trước email gửi đi thực tế</span>} key="preview">
              <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 16, backgroundColor: '#f4f6f8', maxHeight: '500px', overflowY: 'auto' }}>
                {/* Visual HTML Email Preview Box */}
                <div style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e8e8e8' }}>
                  {/* Email Header Banner */}
                  <div style={{ backgroundColor: '#c62828', padding: '24px 20px', textAlign: 'center', color: '#ffffff' }}>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '0.5px' }}>CHI BỘ SINH VIÊN</h2>
                    <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8, fontWeight: 500 }}>TRƯỜNG ĐẠI HỌC KINH TẾ - ĐHĐN</div>
                  </div>
                  
                  {/* Email Body Content */}
                  <div style={{ padding: '30px 24px', lineHeight: '1.8', color: '#333333', fontSize: '14px', fontFamily: '-apple-system, BlinkMacSystemFont, Arial, sans-serif' }}>
                    {emailBodyText.split('\n').map((para, idx) => {
                      if (!para.trim()) return <div key={idx} style={{ height: 14 }} />;
                      return <p key={idx} style={{ margin: '0 0 10px 0', textAlign: 'justify' }}>{para}</p>;
                    })}
                  </div>
                  
                  {/* Email Footer */}
                  <div style={{ backgroundColor: '#fafafa', padding: '20px 24px', borderTop: '1px solid #eeeeee', textAlign: 'center', color: '#888888', fontSize: '12px' }}>
                    Đây là email tự động nhắc nhở quy trình quản lý hồ sơ của Chi bộ Sinh viên.<br />
                    Vui lòng không phản hồi trực tiếp email này.
                  </div>
                </div>
              </div>
            </Tabs.TabPane>
          </Tabs>
        )}
      </Modal>

      {/* Cấu hình Xuất dữ liệu Excel (.xlsx) */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
            <span style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a1a' }}>
              Cấu hình Xuất dữ liệu Excel (.xlsx)
            </span>
          </div>
        }
        open={isExportModalVisible}
        onOk={exportExcel}
        onCancel={() => setIsExportModalVisible(false)}
        okText="XUẤT FILE EXCEL"
        cancelText="HỦY BỎ"
        width={850}
        style={{ top: 40 }}
        okButtonProps={{ style: { backgroundColor: '#c62828', borderColor: '#c62828', height: 40, fontWeight: 700, borderRadius: '6px' } }}
        cancelButtonProps={{ style: { height: 40, borderRadius: '6px' } }}
      >
        <div style={{ padding: '0 8px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#262626', marginBottom: 12 }}>
            1. Chọn Phạm vi Dữ liệu xuất:
          </div>
          <Radio.Group 
            value={exportRange} 
            onChange={e => setExportRange(e.target.value)} 
            size="large" 
            style={{ marginBottom: 24, width: '100%' }}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Radio.Button value="filtered" style={{ width: '100%', textAlign: 'center', borderRadius: '6px', height: '42px', lineHeight: '40px', fontWeight: 600 }}>
                  Theo bộ lọc ({filteredData.length} dòng)
                </Radio.Button>
              </Col>
              <Col span={8}>
                <Radio.Button value="all" style={{ width: '100%', textAlign: 'center', borderRadius: '6px', height: '42px', lineHeight: '40px', fontWeight: 600 }}>
                  Toàn bộ danh sách ({data.length} dòng)
                </Radio.Button>
              </Col>
              <Col span={8}>
                <Radio.Button 
                  value="selected" 
                  disabled={selectedRowKeys.length === 0} 
                  style={{ width: '100%', textAlign: 'center', borderRadius: '6px', height: '42px', lineHeight: '40px', fontWeight: 600 }}
                >
                  Dòng đã chọn ({selectedRowKeys.length} dòng)
                </Radio.Button>
              </Col>
            </Row>
          </Radio.Group>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#262626' }}>
              2. Chọn các Trường Thông tin cần xuất:
            </div>
            <Space>
              <Button 
                size="small" 
                onClick={() => setSelectedExportFields(EXPORT_FIELDS.map(f => f.key))}
                style={{ borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}
              >
                Chọn tất cả
              </Button>
              <Button 
                size="small" 
                danger 
                onClick={() => setSelectedExportFields([])}
                style={{ borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}
              >
                Hủy chọn tất cả
              </Button>
            </Space>
          </div>

          <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '8px' }}>
            <Row gutter={[16, 16]}>
              {Object.keys(FIELD_GROUPS).map(groupKey => {
                const groupFields = EXPORT_FIELDS.filter(f => f.group === groupKey);
                const allSelected = groupFields.map(f => f.key).every(k => selectedExportFields.includes(k));
                
                return (
                  <Col span={24} key={groupKey}>
                    <Card 
                      size="small" 
                      style={{ 
                        borderRadius: '8px', 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        border: '1px solid #f0f0f0'
                      }}
                      headStyle={{ 
                        backgroundColor: '#fafafa', 
                        borderBottom: '1px solid #f0f0f0',
                        fontWeight: 700,
                        fontSize: '13px'
                      }}
                      title={
                        <Space>
                          <span style={{ 
                            display: 'inline-block', 
                            width: '3px', 
                            height: '12px', 
                            backgroundColor: '#c62828', 
                            borderRadius: '1px' 
                          }} />
                          {FIELD_GROUPS[groupKey].label}
                        </Space>
                      }
                      extra={
                        <Button 
                          type="link" 
                          size="small" 
                          onClick={() => {
                            const keys = groupFields.map(f => f.key);
                            if (allSelected) {
                              setSelectedExportFields(prev => prev.filter(k => !keys.includes(k)));
                            } else {
                              setSelectedExportFields(prev => [...new Set([...prev, ...keys])]);
                            }
                          }}
                          style={{ fontSize: '12px', padding: 0 }}
                        >
                          {allSelected ? "Hủy chọn nhóm" : "Chọn nhóm"}
                        </Button>
                      }
                    >
                      <Row gutter={[12, 12]}>
                        {groupFields.map(field => (
                          <Col xs={12} sm={8} key={field.key}>
                            <Checkbox 
                              checked={selectedExportFields.includes(field.key)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedExportFields(prev => [...prev, field.key]);
                                } else {
                                  setSelectedExportFields(prev => prev.filter(k => k !== field.key));
                                }
                              }}
                              style={{ fontSize: '13px' }}
                            >
                              {field.label}
                            </Checkbox>
                          </Col>
                        ))}
                      </Row>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>
        </div>
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
              <span style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a1a' }}>
                Bảng Tổng Hợp Chi Tiết Toàn Bộ Hồ Sơ Đảng Viên Chính Thức (Dự Bị) ({filteredData.length} đồng chí)
              </span>
            </div>
            <Button
              type="text"
              icon={isTableFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={() => setIsTableFullscreen(!isTableFullscreen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title={isTableFullscreen ? "Thu nhỏ" : "Phóng to toàn màn hình"}
            />
          </div>
        }
        open={isAllInfoVisible}
        onCancel={() => setIsAllInfoVisible(false)}
        footer={null}
        width={isTableFullscreen ? "100vw" : "95vw"}
        style={isTableFullscreen ? { top: 0, margin: 0, padding: 0, maxWidth: '100vw' } : { top: 20 }}
        bodyStyle={isTableFullscreen ? { padding: '12px 24px', height: 'calc(100vh - 60px)', overflow: 'hidden' } : { padding: '12px 24px', overflow: 'hidden' }}
      >
        {/* Excel Grid Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: 'normal' }}>
            💡 Nhấp đúp chuột (Double click) vào ô để sửa trực tiếp. Thay đổi sẽ được cập nhật tự động vào hệ thống.
          </span>
        </div>

        <Table
          columns={allInfoColumns}
          dataSource={filteredData}
          loading={loading}
          rowKey="id"
          size="small"
          scroll={{ x: 4200, y: isTableFullscreen ? 'calc(100vh - 155px)' : 'calc(80vh - 135px)' }}
          bordered
          pagination={{
            defaultPageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100', '1000'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} Đảng viên dự bị`
          }}
        />
      </Modal>

      <ProfileDrawer 
        open={isDetailVisible} 
        onClose={() => setIsDetailVisible(false)} 
        data={selectedRecord} 
        onUpdate={fetchDangVienDuBi} 
      />

    </div>
  );
};

export default DangVienDuBi;
