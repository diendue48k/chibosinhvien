import React, { useState, useEffect, useMemo } from 'react';
import { 
  Table, Typography, message, Space, Input, Button, Modal, Form, 
  Select, DatePicker, Popconfirm, Tag, Row, Col, Alert, Card, Badge, Tooltip, Switch, Upload,
  Drawer, Timeline, Popover, Tabs, Radio, Divider, Checkbox
} from 'antd';
import { 
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, 
  InfoCircleOutlined, DownloadOutlined, CloseOutlined, FilterOutlined, 
  UploadOutlined, TableOutlined, UnlockOutlined, MailOutlined, CalendarOutlined,
  HistoryOutlined, SendOutlined, UserAddOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { dbMain, dbStudent } from '../firebase';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import debounce from 'lodash/debounce';
import ProfileDrawer from '../components/ProfileDrawer';

const { Title, Text } = Typography;
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
  
  { key: 'ngay_vao_dang', label: 'Ngày kết nạp', group: 'party', isDate: true },
  { key: 'ngay_chinh_thuc', label: 'Ngày ký quyết định', group: 'party', isDate: true },
  { key: 'so_the_dang', label: 'Số quyết định kết nạp', group: 'party' },
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

const BCH_CONTACTS = {
  "Kế toán": [
    { name: "LCĐ Khoa Kế toán", email: "lcd.khoaketoan.dhkt.dhdn@due.edu.vn" }
  ],
  "Du lịch": [
    { name: "LCĐ Khoa Du lịch", email: "khoadulich.bchlcd@gmail.com" }
  ],
  "Ngân hàng": [
    { name: "LCĐ Khoa Ngân hàng", email: "pbtlcdknh@gmail.com" }
  ],
  "Tài chính": [
    { name: "LCĐ Khoa Tài chính", email: "lcd.khoataichinh@gmail.com" }
  ],
  "Luật": [
    { name: "LCĐ Khoa Luật", email: "bchlcdkhoaluat@gmail.com" }
  ],
  "Kinh tế": [
    { name: "LCĐ Khoa Kinh tế", email: "khoakinhte.due@gmail.com" }
  ],
  "Quản trị kinh doanh": [
    { name: "LCĐ Khoa Quản trị kinh doanh", email: "youthdba@due.edu.vn" }
  ],
  "Marketing": [
    { name: "LCĐ Khoa Marketing", email: "youth.marketingdue@gmail.com" }
  ],
  "Kinh doanh quốc tế": [
    { name: "LCĐ Khoa Kinh doanh quốc tế", email: "lcdkhoakinhdoanhquocte@gmail.com" }
  ],
  "Thống kê - Tin học": [
    { name: "LCĐ Khoa Thống kê - Tin học", email: "lcd.khoathongketinhoc@gmail.com" }
  ],
  "Lý luận chính trị": [
    { name: "LCĐ Khoa Lý luận chính trị", email: "lcd.khoallct.due@gmail.com" }
  ],
  "Thương mại điện tử": [
    { name: "LCĐ Khoa Thương mại điện tử", email: "phobithu.tmdt@gmail.com" }
  ],
  "Trung tâm đào tạo quốc tế": [
    { name: "LCĐ Trung tâm đào tạo quốc tế", email: "lcd.cie@due.edu.vn" }
  ]
};

const DEFAULT_BCH_CONTACTS = [
  { name: "Liên Chi Đoàn Khoa", email: "" }
];

const PROVINCES = [
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
];

const KHOA_LIST = [
  "P.CTSV", "Quản trị Kinh doanh", "Trung tâm Đào tạo Quốc tế", "Du lịch", "Marketing", "Tài chính", "Ngân hàng", "Kinh tế", "Kế toán", "Luật", "Thống kê - Tin học", "Thương mại điện tử", "Kinh doanh quốc tế", "Lý luận chính trị", "Khác"
];

const normalizeKhoa = (val) => {
  if (!val) return "Khác";
  let clean = String(val).trim();
  if (clean.toLowerCase().startsWith("khoa ")) {
    clean = clean.substring(5).trim();
  }
  const lower = clean.toLowerCase();
  
  let match = KHOA_LIST.find(k => k.toLowerCase() === lower);
  if (match) return match;
  
  match = KHOA_LIST.find(k => k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase()));
  if (match) return match;
  
  return "Khác";
};

const validateAllHoSoRows = (rows, dbList) => {
  const existingMssvMap = new Map();
  dbList.forEach(item => {
    if (item.mssv) existingMssvMap.set(item.mssv.toString().trim(), item);
  });

  const mssvCounts = {};
  rows.forEach(r => {
    if (r.mssv) {
      const cleanM = r.mssv.toString().trim();
      mssvCounts[cleanM] = (mssvCounts[cleanM] || 0) + 1;
    }
  });

  return rows.map(mappedRow => {
    let errorMsg = "";
    let isUpdate = false;
    let docId = null;
    const cleanMssv = mappedRow.mssv ? mappedRow.mssv.toString().trim() : "";

    if (!mappedRow.hoten) {
      errorMsg = "Thiếu Họ tên";
    } else if (cleanMssv) {
      if (mssvCounts[cleanMssv] > 1) {
        errorMsg = "Trùng MSSV trong chính file Excel";
      } else {
        const existingMssvRec = existingMssvMap.get(cleanMssv);
        if (existingMssvRec) {
          isUpdate = true;
          docId = existingMssvRec.id;
        }
      }
    }

    return {
      ...mappedRow,
      hasError: !!errorMsg,
      errorMsg: errorMsg,
      isUpdate: isUpdate,
      docId: docId
    };
  });
};

const HoSoDaKetNap = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isProfileDrawerVisible, setIsProfileDrawerVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form] = Form.useForm();
  
  // Custom Export States
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [exportRange, setExportRange] = useState('filtered'); // 'filtered', 'all', 'selected'
  const [selectedExportFields, setSelectedExportFields] = useState(EXPORT_FIELDS.map(f => f.key));
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  
  // Edit & Lookup states
  const [editingId, setEditingId] = useState(null);
  const [isEditable, setIsEditable] = useState(true); // Controls readonly override
  const [sourceType, setSourceType] = useState('manual');

  // Excel import editing states
  const [selectedImportDetailRow, setSelectedImportDetailRow] = useState(null);
  const [isImportDetailOpen, setIsImportDetailOpen] = useState(false);
  const [dbHoSoList, setDbHoSoList] = useState([]);
  const [importDetailForm] = Form.useForm();

  // Invitation Modal states
  const [isInvitationModalVisible, setIsInvitationModalVisible] = useState(false);
  const [invitationRecord, setInvitationRecord] = useState(null);
  const [invitationForm] = Form.useForm();
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBodyText, setEmailBodyText] = useState("");
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [invitationType, setInvitationType] = useState('khoa'); // 'khoa' | 'doan_truong'
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [facultyStudentOptions, setFacultyStudentOptions] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);
  const [activeTab, setActiveTab] = useState('send'); // 'send' | 'history'
  const [invitationHistory, setInvitationHistory] = useState([]);

  useEffect(() => {
    if (selectedImportDetailRow) {
      importDetailForm.setFieldsValue({
        ...selectedImportDetailRow,
        ngaysinh: selectedImportDetailRow.ngaysinh ? dayjs(selectedImportDetailRow.ngaysinh) : null,
        ngayvaodang: selectedImportDetailRow.ngayvaodang ? dayjs(selectedImportDetailRow.ngayvaodang) : null,
        ngaykiqd: selectedImportDetailRow.ngaykiqd ? dayjs(selectedImportDetailRow.ngaykiqd) : null,
      });
    }
  }, [selectedImportDetailRow]);

  const handleSaveImportDetailRow = (values) => {
    const updatedRow = {
      ...selectedImportDetailRow,
      ...values,
      ngaysinh: values.ngaysinh ? values.ngaysinh.format('YYYY-MM-DD') : null,
      ngayvaodang: values.ngayvaodang ? values.ngayvaodang.format('YYYY-MM-DD') : null,
      ngaykiqd: values.ngaykiqd ? values.ngaykiqd.format('YYYY-MM-DD') : null,
    };

    const updatedList = importPreviewData.map(r => r.key === selectedImportDetailRow.key ? updatedRow : r);
    const revalidated = validateAllHoSoRows(updatedList, dbHoSoList);
    
    setImportPreviewData(revalidated);
    setImportSelectedKeys(revalidated.filter(d => !d.hasError).map(d => d.key));
    
    message.success("Đã cập nhật dòng dữ liệu.");
    setIsImportDetailOpen(false);
    setSelectedImportDetailRow(null);
  };

  // Filters
  const [searchText, setSearchText] = useState("");
  const [filterKhoa, setFilterKhoa] = useState(null);
  const [filterNam, setFilterNam] = useState(null);

  // Import Excel Modal states
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importFileList, setImportFileList] = useState([]);
  const [importPreviewData, setImportPreviewData] = useState([]);
  const [importSelectedKeys, setImportSelectedKeys] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  // Dropdown list student search
  const [studentOptions, setStudentOptions] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleDownloadTemplate = () => {
    const templateData = [{
      "STT": 1,
      "MSSV": "251123028135",
      "HỌ VÀ TÊN": "Hoàng Thị Quỳnh Như",
      "LỚP": "48K07.2",
      "NGÀY SINH": "15/05/2004",
      "KHOA": "Khoa Ngân hàng",
      "ĐVHD": "Lê Vĩnh Diện",
      "NGÀY KẾT NẠP": "25/06/2026",
      "SỐ QĐ": "123-QĐ/ĐHĐN",
      "NGÀY KÍ ": "24/06/2026",
      "QUÊ QUÁN": "Quảng Nam",
      "Link Facebook": "facebook.com/quynhnhu",
      "SĐT": "0777565953"
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_DaKetNap");
    XLSX.writeFile(wb, "HoSoDaKetNap_Template.xlsx");
    message.success("Đã tải xuống file mẫu thành công!");
  };

  const handleImportUpload = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      setIsImporting(true);
      try {
        const snapshot = await getDocs(collection(dbMain, "ho_so_ket_nap"));
        const existingData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDbHoSoList(existingData);

        const dataBytes = new Uint8Array(e.target.result);
        const workbook = XLSX.read(dataBytes, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJsonData = XLSX.utils.sheet_to_json(worksheet);
        // Lọc bỏ các dòng trống hoàn toàn (không có MSSV và không có Họ tên)
        const jsonData = rawJsonData.filter(row => {
          const mssvVal = row["MSSV"]?.toString().trim();
          const hotenVal = row["HỌ VÀ TÊN"] || row["Họ và tên"] || row["Họ tên"] || row["Họ tên"] || "";
          return !!mssvVal || !!hotenVal;
        });

        const parseExcelDate = (val) => {
          if (!val) return null;
          if (val instanceof Date) {
            return dayjs(val).format('YYYY-MM-DD');
          }
          if (typeof val === 'number') {
            const date = new Date((val - 25569) * 86400 * 1000);
            const parsed = dayjs(date);
            return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
          }
          const str = String(val).trim();
          if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
              const day = parts[0].padStart(2, '0');
              const month = parts[1].padStart(2, '0');
              const year = parts[2];
              return `${year}-${month}-${day}`;
            }
          }
          if (str.includes('-')) {
            const parts = str.split('-');
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                return str;
              } else {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                return `${year}-${month}-${day}`;
              }
            }
          }
          const parsed = dayjs(str);
          return parsed.isValid() ? parsed.format('YYYY-MM-DD') : str;
        };

        const parsed = jsonData.map((row, index) => {
          const mssvVal = row["MSSV"]?.toString().trim();
          const hotenVal = row["HỌ VÀ TÊN"] || row["Họ và tên"] || row["Họ tên"] || row["Họ tên"] || "";

          return {
            key: index.toString(),
            mssv: mssvVal,
            hoten: hotenVal,
            lop: row["LỚP"] || row["Lớp"] || "",
            khoa: normalizeKhoa(row["KHOA"] || row["Khoa"] || ""),
            ngaysinh: parseExcelDate(row["NGÀY SINH"] || row["Ngày sinh"]),
            gioitinh: row["Giới tính"] || row["GIỚI TÍNH"] || "Nam",
            cccd: row["CCCD"]?.toString() || "",
            quequan: row["QUÊ QUÁN"] || row["Quê quán"] || "",
            email: row["Email"] || row["EMAIL"] || "",
            sdt: row["SĐT"]?.toString() || row["SĐt"]?.toString() || row["Số điện thoại"]?.toString() || "",
            link_fb: row["Link Facebook"] || row["Link facebook"] || row["Facebook"] || "",
            dangvienhuongdan: row["ĐVHD"] || row["Đảng viên hướng dẫn"] || "",
            ngaynhanhoso: null,
            trangthai: 8,
            ngayvaodang: parseExcelDate(row["NGÀY KẾT NẠP"] || row["Ngày kết nạp"] || row["Ngày vào Đảng"]),
            soqd: row["SỐ QĐ"] || row["Số quyết định"] || row["Số QĐ"] || "",
            ngaykiqd: parseExcelDate(row["NGÀY KÍ "] || row["NGÀY KÍ"] || row["Ngày ký quyết định"] || row["Ngày kí"] || row["NGÀY KÝ"]),
            nguon_du_lieu: 'auto'
          };
        });

        const validated = validateAllHoSoRows(parsed, existingData);

        // Đưa các dòng có lỗi lên đầu để người dùng dễ kiểm tra
        const sortedData = [...validated].sort((a, b) => {
          if (a.hasError && !b.hasError) return -1;
          if (!a.hasError && b.hasError) return 1;
          return 0;
        });
        setImportPreviewData(sortedData);
        setImportSelectedKeys(sortedData.filter(d => !d.hasError).map(d => d.key));
      } catch (err) {
        message.error("Lỗi khi đọc file Excel: " + err.message);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleConfirmImport = async () => {
    if (importSelectedKeys.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 dòng hợp lệ để import');
      return;
    }
    setIsImporting(true);
    let successCount = 0;
    
    try {
      const dataToImport = importPreviewData.filter(d => importSelectedKeys.includes(d.key));
      const promises = [];

      for (const row of dataToImport) {
        const cleanData = { ...row };
        delete cleanData.key;
        delete cleanData.hasError;
        delete cleanData.errorMsg;
        delete cleanData.isUpdate;
        delete cleanData.docId;
        
        Object.keys(cleanData).forEach(key => {
          if (cleanData[key] === undefined) {
            delete cleanData[key];
          }
        });
        
        if (row.isUpdate && row.docId) {
          cleanData.updated_at = new Date().toISOString();
          promises.push(updateDoc(doc(dbMain, "ho_so_ket_nap", row.docId), cleanData));
        } else {
          cleanData.created_at = new Date().toISOString();
          promises.push(addDoc(collection(dbMain, "ho_so_ket_nap"), cleanData));
        }
        
        successCount++;
      }
      
      await Promise.all(promises);
      
      message.success(`Đã import thành công ${successCount} hồ sơ đã kết nạp.`);
      setImportFileList([]);
      setImportPreviewData([]);
      setIsImportModalVisible(false);
      fetchData();
    } catch (error) {
      console.error(error);
      message.error("Đã xảy ra lỗi khi import: " + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Generate Email Content helper
  const generateEmailBody = (values, selectedStudentsList = []) => {
    const { ten_khoa, thoi_gian, dia_diem, trang_phuc, han_phan_hoi } = values;
    
    let timeStr = '___';
    if (thoi_gian) {
      const dt = dayjs(thoi_gian);
      if (dt.isValid()) {
        const daysOfWeek = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
        const dayName = daysOfWeek[dt.day()];
        timeStr = `${dt.format('HH')} giờ ${dt.format('mm')} phút ngày ${dt.format('D')} tháng ${dt.format('M')} năm ${dt.format('YYYY')} (${dayName})`;
      }
    }

    let deadlineStr = '___';
    if (han_phan_hoi) {
      const dt = dayjs(han_phan_hoi);
      if (dt.isValid()) {
        deadlineStr = `${dt.format('HH')}h${dt.format('mm')} ngày ${dt.format('DD/MM/YYYY')}`;
      }
    }

    const studentCount = selectedStudentsList.length;
    const countStr = studentCount.toString().padStart(2, '0');
    const studentsDetails = selectedStudentsList.map(s => `${s.hoten || '___'} - ${s.lop || '___'}`).join(', ');
    const studentsDetailsText = studentCount > 0 
      ? `${countStr} Đoàn viên - Sinh viên (${studentsDetails})`
      : '___ Đoàn viên - Sinh viên (___)';
    const studentsPlaceholder = `<strong style="background-color: #ffee58; color: #333333; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${studentsDetailsText}</strong>`;
    
    const chiBo = `<strong style="color: #b71c1c;">Chi bộ Sinh viên</strong>`;
    const bchKhoa = `<strong style="color: #096dd9;">BCH Liên Chi Đoàn Khoa ${ten_khoa || '___'}</strong>`;
    const tenKhoa = `<strong style="color: #096dd9;">Khoa ${ten_khoa || '___'}</strong>`;
    
    const deadlineHighlight = `<strong style="background-color: #ffee58; color: #333333; padding: 2px 6px; border-radius: 4px; font-weight: bold;">trước ${deadlineStr}</strong>`;
    
    return `<i>Thân gửi ${bchKhoa}!</i>\n\n` +
      `Đầu tiên, ${chiBo} xin gửi đến ${bchKhoa} lời chúc sức khỏe và lời chào trân trọng nhất.\n\n` +
      `Công tác phát triển Đảng viên trong sinh viên luôn được xác định là một nhiệm vụ đặc biệt quan trọng, nhận được sự quan tâm sâu sắc của Đảng bộ. Trên cơ sở ghi nhận những nỗ lực không ngừng trong học tập, rèn luyện và tích cực tham gia các phong trào thanh niên của sinh viên Trường Đại học Kinh tế, Đảng bộ UBND Thành phố Đà Nẵng và Đảng ủy Đại học Đà Nẵng đã đánh giá cao và tạo điều kiện kết nạp những sinh viên ưu tú của Nhà trường vào Đảng Cộng sản Việt Nam.\n\n` +
      `Được sự cho phép của Đảng ủy cấp trên, ${chiBo} sẽ tiến hành làm Lễ Kết nạp Đảng viên cho các Đoàn viên – Sinh viên ưu tú, trong đó có ${studentsPlaceholder} đang theo học tại ${tenKhoa}. Để buổi lễ được diễn ra trọn vẹn cảm xúc nhất, hy vọng đại diện ${bchKhoa} có thể đến tham dự, chứng kiến và chúc mừng các bạn Tân Đảng viên trong giây phút đầy tự hào này.\n\n` +
      `${chiBo} gửi đến ${bchKhoa} tin về buổi lễ như sau:\n` +
      `<div style="margin: 16px 0; padding: 14px 20px; border-left: 4px solid #b71c1c; background-color: #fff9f9; border-radius: 0 8px 8px 0; color: #b71c1c; font-weight: bold; line-height: 1.8;">` +
      `• Thời gian: ${timeStr}<br />` +
      `• Địa điểm: ${dia_diem || '___'}<br />` +
      `• Trang phục: ${trang_phuc || '___'}</div>\n` +
      `Mong nhận được sự phản hồi của ${bchKhoa} (Thông tin người tham dự, chức vụ) ${deadlineHighlight} để ${chiBo} có những sắp xếp chu đáo nhất.\n\n` +
      `Sự hiện diện của ${bchKhoa} là sự hân hạnh của các Đảng viên và của cả ${chiBo}. Rất hân hạnh được đón tiếp!`;
  };

  // Generate Email Content for Đoàn Trường
  const generateEmailBodyDoanTruong = (values, selectedStudentsList = []) => {
    const { thoi_gian, dia_diem, han_phan_hoi } = values;
    
    let timeStr = '___';
    if (thoi_gian) {
      const dt = dayjs(thoi_gian);
      if (dt.isValid()) {
        const daysOfWeek = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
        const dayName = daysOfWeek[dt.day()];
        timeStr = `${dt.format('HH')} giờ ${dt.format('mm')} phút ngày ${dt.format('D')} tháng ${dt.format('M')} năm ${dt.format('YYYY')} (${dayName})`;
      }
    }

    let deadlineStr = '___';
    if (han_phan_hoi) {
      const dt = dayjs(han_phan_hoi);
      if (dt.isValid()) {
        deadlineStr = `${dt.format('HH')}h${dt.format('mm')} ngày ${dt.format('DD/MM/YYYY')}`;
      }
    }

    const studentCount = selectedStudentsList.length;
    const countStr = studentCount > 0 ? studentCount.toString().padStart(2, '0') : '___';
    
    const chiBo = `<strong style="color: #b71c1c;">Chi bộ Sinh viên</strong>`;
    const bchDoan = `<strong style="color: #096dd9;">BCH Đoàn Thanh niên - Hội Sinh viên Trường Đại học Kinh tế</strong>`;
    const deadlineHighlight = `<strong style="background-color: #ffee58; color: #333333; padding: 2px 6px; border-radius: 4px; font-weight: bold;">trước ${deadlineStr}</strong>`;
    
    return `<i>Thân gửi ${bchDoan} !</i>\n\n` +
      `Đầu tiên, ${chiBo} xin gửi đến ${bchDoan} lời chúc sức khỏe và lời chào trân trọng nhất.\n\n` +
      `Công tác phát triển Đảng viên trong sinh viên được coi là một nội dung hết sức quan trọng và luôn nhận được sự quan tâm của Đảng bộ. Căn cứ những nỗ lực trong học tập, rèn luyện và tham gia phong trào Thanh niên của các Sinh viên Trường Đại học Kinh tế - Đại học Đà Nẵng, Đảng bộ UBND Thành phố Đà Nẵng, Đảng uỷ Đại học Đà Nẵng đã ghi nhận thành tích và cho phép kết nạp những Sinh viên ưu tú của Nhà trường vào Đảng Cộng sản Việt Nam.\n\n` +
      `Được sự cho phép của Đảng ủy cấp trên, ${chiBo} sẽ tiến hành làm Lễ Kết nạp Đảng viên cho ${countStr} Đoàn viên – Sinh viên ưu tú. Để buổi lễ được diễn ra trọn vẹn cảm xúc nhất, hy vọng đại diện ${bchDoan} có thể đến tham dự, chứng kiến và chúc mừng các bạn Tân Đảng viên trong giây phút đầy tự hào này.\n\n` +
      `${chiBo} gửi đến ${bchDoan} tin về buổi lễ như sau:\n` +
      `<div style="margin: 16px 0; padding: 14px 20px; border-left: 4px solid #b71c1c; background-color: #fff9f9; border-radius: 0 8px 8px 0; color: #b71c1c; font-weight: bold; line-height: 1.8;">` +
      `• Thời gian: ${timeStr}<br />` +
      `• Địa điểm: ${dia_diem || '___'}<br />` +
      `• Chi tiết về chương trình buổi lễ (Xem chi tiết tại file đính kèm)</div>\n` +
      `Mong nhận được sự phản hồi của ${bchDoan} (Thông tin người tham dự, chức vụ) ${deadlineHighlight} để ${chiBo} có những sắp xếp chu đáo nhất.\n\n` +
      `Sự hiện diện của ${bchDoan} là sự hân hạnh của các Đảng viên và của cả ${chiBo}. Rất hân hạnh được đón tiếp!`;
  };

  const generateEmailSubject = (selectedStudentsList = []) => {
    return 'CHI BỘ SINH VIÊN - THƯ MỜI THAM DỰ LỄ KẾT NẠP ĐẢNG';
  };

  const fetchInvitationHistory = async (studentId) => {
    try {
      const q = query(
        collection(dbMain, "le_ket_nap_invitations"),
        where("student_id", "==", studentId)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
      setInvitationHistory(list);
    } catch (e) {
      console.error("Lỗi khi tải lịch sử gửi thư mời:", e);
    }
  };

  const handlePrepareInvitation = (record) => {
    setInvitationRecord(record);
    const faculty = record.khoa || '';
    const contacts = BCH_CONTACTS[faculty] || DEFAULT_BCH_CONTACTS;
    
    setRecipientOptions(contacts);
    const defaultEmails = contacts.map(c => c.email);
    setSelectedRecipients(defaultEmails);

    const sameFacultyStudents = data.filter(item => {
      if (item.da_chuyen_sinh_hoat) return false;
      if (item.khoa !== faculty) return false;
      if (!item.ngayvaodang) return true;
      const admissionDate = dayjs(item.ngayvaodang);
      if (!admissionDate.isValid()) return true;
      const diffDays = dayjs().diff(admissionDate, 'day');
      return diffDays <= 30;
    });
    setFacultyStudentOptions(sameFacultyStudents);
    setSelectedStudentIds([record.id]);
    
    const defaultTime = dayjs();
    const defaultValues = {
      ten_khoa: faculty,
      thoi_gian: defaultTime,
      dia_diem: 'Hội trường E, Trường Đại học Kinh tế, Đại học Đà Nẵng',
      trang_phuc: 'Áo sơ mi trắng, quần/chân váy sẫm màu',
      han_phan_hoi: defaultTime.subtract(12, 'hour')
    };
    
    invitationForm.setFieldsValue(defaultValues);
    setEmailSubject(generateEmailSubject([record]));
    setEmailBodyText(generateEmailBody(defaultValues, [record]));
    setIsEditingPreview(false);
    setActiveTab("send");
    
    fetchInvitationHistory(record.id);
    setIsInvitationModalVisible(true);
  };

  const handleInvitationFormChange = (_, allValues) => {
    if (!isEditingPreview) {
      const selectedStudentsList = facultyStudentOptions.filter(opt => selectedStudentIds.includes(opt.id));
      const bodyFn = invitationType === 'doan_truong' ? generateEmailBodyDoanTruong : generateEmailBody;
      setEmailBodyText(bodyFn(allValues, selectedStudentsList));
      setEmailSubject(generateEmailSubject(selectedStudentsList));
    }
  };

  const handleResendInvitation = (historyRecord) => {
    invitationForm.setFieldsValue({
      ten_khoa: historyRecord.khoa || '',
      thoi_gian: historyRecord.details?.thoi_gian ? dayjs(historyRecord.details.thoi_gian) : null,
      dia_diem: historyRecord.details?.dia_diem || '',
      trang_phuc: historyRecord.details?.trang_phuc || '',
      han_phan_hoi: historyRecord.details?.han_phan_hoi ? dayjs(historyRecord.details.han_phan_hoi) : null
    });

    const faculty = historyRecord.khoa || '';
    const sameFacultyStudents = data.filter(item => item.khoa === faculty);
    setFacultyStudentOptions(sameFacultyStudents);
    
    let matchedIds = [];
    if (historyRecord.details?.student_ids) {
      matchedIds = historyRecord.details.student_ids;
    } else {
      const match = sameFacultyStudents.find(s => s.hoten === historyRecord.hoten);
      if (match) matchedIds = [match.id];
    }
    setSelectedStudentIds(matchedIds);
    
    setSelectedRecipients(historyRecord.recipients || []);
    setEmailSubject(historyRecord.subject || '');
    setEmailBodyText(historyRecord.body || '');
    setIsEditingPreview(true);
    setActiveTab("send");
    message.info("Đã tải lại thông tin thư mời cũ. Bạn có thể chỉnh sửa và gửi lại.");
  };

  const handleSendInvitation = async () => {
    if (selectedRecipients.length === 0) {
      message.error("Vui lòng chọn hoặc nhập ít nhất một địa chỉ email nhận!");
      return;
    }
    
    setIsSendingInvitation(true);
    try {
      const formattedBodyText = emailBodyText.replace(/\n/g, '<br />');
      const htmlBody = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Thư mời Lễ kết nạp Đảng viên mới</title>
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
                <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'SVN-Gilroy', 'Inter', sans-serif;">THƯ MỜI THAM DỰ LỄ KẾT NẠP ĐẢNG VIÊN MỚI</h2>
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
                      <img src="http://localhost:5173/logo.png" alt="Logo Chi Bộ Sinh Viên" height="70" style="display: block; margin-bottom: 8px;" />
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
      
      const response = await fetch('https://chibosinhvien.onrender.com/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bcc: [...selectedRecipients, 'chibosinhvien@due.edu.vn'].join(', '),
          subject: emailSubject,
          html: htmlBody
        })
      });
      
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Gửi email không thành công.");
      }
      
      const formValues = invitationForm.getFieldsValue();
      const selectedStudents = facultyStudentOptions.filter(opt => selectedStudentIds.includes(opt.id));
      const firstStudent = invitationRecord || selectedStudents[0] || {};
      await addDoc(collection(dbMain, "le_ket_nap_invitations"), {
        student_id: firstStudent.id || '',
        mssv: firstStudent.mssv || '',
        hoten: firstStudent.hoten || '',
        khoa: formValues.ten_khoa || '',
        sent_at: new Date().toISOString(),
        recipients: selectedRecipients,
        status: "success",
        subject: emailSubject,
        body: emailBodyText,
        details: {
          dia_diem: formValues.dia_diem || '',
          trang_phuc: formValues.trang_phuc || '',
          thoi_gian: formValues.thoi_gian ? formValues.thoi_gian.toISOString() : null,
          han_phan_hoi: formValues.han_phan_hoi ? formValues.han_phan_hoi.toISOString() : null,
          student_ids: selectedStudentIds,
          students: selectedStudents.map(s => ({ id: s.id, hoten: s.hoten, lop: s.lop }))
        }
      });
      
      message.success("Đã gửi thư mời thành công đến các thành viên BCH!");
      setIsInvitationModalVisible(false);
    } catch (err) {
      console.error(err);
      
      try {
        const formValues = invitationForm.getFieldsValue();
        const selectedStudents = facultyStudentOptions.filter(opt => selectedStudentIds.includes(opt.id));
        const firstStudent = invitationRecord || selectedStudents[0] || {};
        await addDoc(collection(dbMain, "le_ket_nap_invitations"), {
          student_id: firstStudent.id || '',
          mssv: firstStudent.mssv || '',
          hoten: firstStudent.hoten || '',
          khoa: formValues.ten_khoa || '',
          sent_at: new Date().toISOString(),
          recipients: selectedRecipients,
          status: "failed",
          subject: emailSubject,
          body: emailBodyText,
          error_message: err.message || 'Lỗi không xác định',
          details: {
            dia_diem: formValues.dia_diem || '',
            trang_phuc: formValues.trang_phuc || '',
            thoi_gian: formValues.thoi_gian ? formValues.thoi_gian.toISOString() : null,
            han_phan_hoi: formValues.han_phan_hoi ? formValues.han_phan_hoi.toISOString() : null,
            student_ids: selectedStudentIds,
            students: selectedStudents.map(s => ({ id: s.id, hoten: s.hoten, lop: s.lop }))
          }
        });
      } catch (logErr) {
        console.error("Lỗi khi ghi nhận lịch sử thất bại:", logErr);
      }
      
      message.error("Gửi thư mời thất bại: " + err.message);
    } finally {
      setIsSendingInvitation(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(dbMain, "ho_so_ket_nap"), where("trangthai", "in", [8, "8"]));
      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setData(records);
    } catch (error) {
      message.error("Lỗi khi tải danh sách hồ sơ đã kết nạp");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const uniqueYears = useMemo(() => {
    const years = data.map(item => {
      const dateStr = item.ngayvaodang || item.ngaynhanhoso || item.created_at;
      if (dateStr) {
        const yr = dayjs(dateStr).format('YYYY');
        if (yr && yr !== 'Invalid Date') return yr;
      }
      return 'Chưa rõ';
    }).filter(Boolean);
    return [...new Set(years)].sort((a, b) => b.localeCompare(a));
  }, [data]);

  const filteredData = useMemo(() => {
    const result = data.filter(item => {
      const matchSearch = item.mssv?.toLowerCase().includes(searchText.toLowerCase()) || 
                          item.hoten?.toLowerCase().includes(searchText.toLowerCase());
      const matchKhoa = filterKhoa ? item.khoa === filterKhoa : true;
      
      let matchNam = true;
      if (filterNam) {
        const itemYear = item.ngayvaodang 
          ? dayjs(item.ngayvaodang).format('YYYY') 
          : (item.ngaynhanhoso ? dayjs(item.ngaynhanhoso).format('YYYY') : (item.created_at ? dayjs(item.created_at).format('YYYY') : 'Chưa rõ'));
        matchNam = itemYear === filterNam;
      }

      return matchSearch && matchKhoa && matchNam;
    });

    result.sort((a, b) => (b.ngayvaodang || '').localeCompare(a.ngayvaodang || ''));
    return result;
  }, [data, searchText, filterKhoa, filterNam]);

  const uniqueKhoa = useMemo(() => {
    return [...new Set(data.map(d => d.khoa).filter(Boolean))].sort();
  }, [data]);

  const handleSearch = debounce((e) => {
    setSearchText(e.target.value);
  }, 300);

  const resetFilters = () => {
    setSearchText("");
    setFilterKhoa(null);
    setFilterNam(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const handleSearchStudents = useMemo(() => {
    return debounce(async (value) => {
      const searchVal = value ? value.trim() : "";
      if (!searchVal || searchVal.length < 2) {
        setStudentOptions([]);
        return;
      }
      setSearching(true);
      try {
        const qMaSV = query(
          collection(dbStudent, "students"), 
          where("MaSV", ">=", searchVal), 
          where("MaSV", "<=", searchVal + "\uf8ff")
        );
        const snapshotMaSV = await getDocs(qMaSV);
        let list = snapshotMaSV.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const capitalizedSearch = searchVal.replace(/\b\w/g, c => c.toUpperCase());
        const qHoTen = query(
          collection(dbStudent, "students"),
          where("HoTen", ">=", capitalizedSearch),
          where("HoTen", "<=", capitalizedSearch + "\uf8ff")
        );
        const snapshotHoTen = await getDocs(qHoTen);
        const listHoTen = snapshotHoTen.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const merged = [...list];
        listHoTen.forEach(item => {
          if (!merged.some(m => m.MaSV === item.MaSV)) {
            merged.push(item);
          }
        });

        setStudentOptions(merged.slice(0, 15));
      } catch (err) {
        console.error("Lỗi tìm kiếm sinh viên:", err);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleSelectStudent = (svData) => {
    message.success(`Đã lấy thông tin sinh viên: ${svData.HoTen || svData.hoten}`);
    
    let birthDate = null;
    const rawBirthDate = svData.NgaySinh || svData.ngay_sinh || svData.ngaysinh;
    if (rawBirthDate) {
      if (typeof rawBirthDate === 'string') {
        if (rawBirthDate.includes('/')) {
          birthDate = dayjs(rawBirthDate, 'DD/MM/YYYY');
        } else {
          birthDate = dayjs(rawBirthDate);
        }
      } else {
        birthDate = dayjs(rawBirthDate);
      }
    }

    form.setFieldsValue({
      mssv: svData.MaSV || svData.mssv || '',
      hoten: svData.HoTen || svData.ho_ten || svData.hoten || '',
      lop: svData.Lop || svData.lop || '',
      khoa: svData.Khoa || svData.khoa || '',
      ngaysinh: birthDate && birthDate.isValid() ? birthDate : null,
      gioitinh: svData.GioiTinh || svData.gioi_tinh || svData.gioitinh || 'Nam',
      quequan: svData.QueQuan || svData.que_quan || svData.quequan || '',
      email: svData.Email || svData.email || '',
      sdt: svData.SoDienThoai || svData.so_dien_thoai || svData.sdt || '',
      link_fb: svData.Facebook || svData.facebook || svData.link_fb || '',
      cccd: svData.SoCCCD || svData.cccd || '',
      nguon_du_lieu: 'auto'
    });

    setSourceType('auto');
    setIsEditable(false);
    setStudentOptions([]);
  };

  const findDocByMssv = async (colName, mStr) => {
    if (!mStr) return null;
    const mNum = Number(mStr);
    try {
      const q1 = query(collection(dbMain, colName), where("mssv", "==", mStr));
      const s1 = await getDocs(q1);
      if (!s1.empty) return s1.docs[0];

      const q2 = query(collection(dbMain, colName), where("MSSV", "==", mStr));
      const s2 = await getDocs(q2);
      if (!s2.empty) return s2.docs[0];

      if (!isNaN(mNum)) {
        const q3 = query(collection(dbMain, colName), where("mssv", "==", mNum));
        const s3 = await getDocs(q3);
        if (!s3.empty) return s3.docs[0];

        const q4 = query(collection(dbMain, colName), where("MSSV", "==", mNum));
        const s4 = await getDocs(q4);
        if (!s4.empty) return s4.docs[0];
      }
    } catch (e) {
      console.error("Error in findDocByMssv:", e);
    }
    return null;
  };

  const handleAdd = () => {
    setEditingId(null);
    setSourceType('manual');
    setIsEditable(true);
    form.resetFields();
    form.setFieldsValue({
      nguon_du_lieu: 'manual',
      trangthai: 8
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setSelectedRecord(record);
    setIsProfileDrawerVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const formatted = {
        mssv: values.mssv || '',
        cccd: values.cccd || '',
        hoten: values.hoten,
        lop: values.lop || '',
        khoa: values.khoa || '',
        ngaysinh: values.ngaysinh ? values.ngaysinh.format('YYYY-MM-DD') : null,
        gioitinh: values.gioitinh || 'Nam',
        quequan: values.quequan || '',
        email: values.email || '',
        link_fb: values.link_fb || '',
        sdt: values.sdt || '',
        nguon_du_lieu: sourceType || 'manual',
        dangvienhuongdan: values.dangvienhuongdan || '',
        trangthai: 8,
        ngayvaodang: values.ngayvaodang ? values.ngayvaodang.format('YYYY-MM-DD') : null,
        soqd: values.soqd || '',
        ngaykiqd: values.ngaykiqd ? values.ngaykiqd.format('YYYY-MM-DD') : null,
        updated_at: new Date().toISOString()
      };

      const mssvStr = String(values.mssv || '').trim();
      if (mssvStr) {
        const existingKetNapDoc = await findDocByMssv("ho_so_ket_nap", mssvStr);
        if (existingKetNapDoc && existingKetNapDoc.id !== editingId) {
          message.error("MSSV này đã tồn tại trong danh sách!");
          setLoading(false);
          return;
        }
      }

      if (editingId) {
        await updateDoc(doc(dbMain, "ho_so_ket_nap", editingId), formatted);
        message.success("Cập nhật hồ sơ kết nạp thành công");
      } else {
        formatted.created_at = new Date().toISOString();
        await addDoc(collection(dbMain, "ho_so_ket_nap"), formatted);
        message.success("Thêm mới hồ sơ kết nạp thành công");
      }

      setIsModalVisible(false);
      fetchData();
    } catch (error) {
      console.error(error);
      if (!error.errorFields) message.error("Lỗi khi lưu thông tin");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await deleteDoc(doc(dbMain, "ho_so_ket_nap", id));
      message.success("Xóa hồ sơ kết nạp thành công");
      fetchData();
    } catch (e) {
      message.error("Lỗi khi xóa hồ sơ");
      setLoading(false);
    }
  };

  const handleTransferToActive = async (record) => {
    if (!record.mssv) {
      message.error("Hồ sơ này không có MSSV, không thể chuyển!");
      return;
    }

    try {
      setLoading(true);
      
      // 1. Check for duplicate in "dang_vien" collection (where mssv === record.mssv)
      const qDangVien = query(collection(dbMain, "dang_vien"), where("mssv", "==", record.mssv));
      const querySnapshot = await getDocs(qDangVien);
      
      if (!querySnapshot.empty) {
        Modal.warning({
          title: 'Đảng viên đã tồn tại!',
          content: `Đồng chí ${record.hoten} (MSSV: ${record.mssv}) đã tồn tại trong danh sách Đảng viên đang sinh hoạt. Hệ thống sẽ đánh dấu hồ sơ này là Đã chuyển để tránh nhầm lẫn.`,
          okText: 'Xác nhận đồng bộ',
          onOk: async () => {
            // Mark as transferred
            await updateDoc(doc(dbMain, "ho_so_ket_nap", record.id), {
              da_chuyen_sinh_hoat: true,
              updated_at: new Date().toISOString()
            });
            fetchData();
          }
        });
        setLoading(false);
        return;
      }

      // 2. Check if the admission year is older than current year
      const currentYear = dayjs().year();
      const admissionDate = record.ngayvaodang ? dayjs(record.ngayvaodang) : null;
      const admissionYear = admissionDate && admissionDate.isValid() ? admissionDate.year() : null;

      const performTransfer = async () => {
        try {
          setLoading(true);
          // Prepare new dang_vien doc
          const newDangVien = {
            mssv: record.mssv,
            ho_ten: record.hoten,
            lop: record.lop || '',
            khoa: record.khoa || '',
            cccd: record.cccd || '',
            sdt: record.sdt || '',
            email: record.email || '',
            ngay_sinh: record.ngaysinh || null,
            que_quan: record.quequan || '',
            ngay_vao_dang: record.ngayvaodang || null,
            noi_chuyen_di: 'Chi bộ Sinh viên DUE',
            ngay_chuyen_vao: record.ngayvaodang || null,
            dvhd: record.dangvienhuongdan || '',
            trang_thai: 'dang_sinh_hoat',
            dang_vien_du_bi: true, // newly admitted is always Preparatory (Dự bị)
            loai_dang_vien: 'Dự bị',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          if (record.xa_phuong_qq) newDangVien.xa_phuong_qq = record.xa_phuong_qq;
          if (record.tinh_tp_qq) newDangVien.tinh_tp_qq = record.tinh_tp_qq;

          // Add to "dang_vien" collection
          await addDoc(collection(dbMain, "dang_vien"), newDangVien);

          // Update "ho_so_ket_nap" collection to mark as transferred
          await updateDoc(doc(dbMain, "ho_so_ket_nap", record.id), {
            da_chuyen_sinh_hoat: true,
            updated_at: new Date().toISOString()
          });

          // Add updates log
          await addDoc(collection(dbMain, "lich_su_cap_nhat"), {
            mssv: record.mssv,
            ho_ten: record.hoten,
            updated_by: "Hệ thống (Chuyển sinh hoạt)",
            updated_at: new Date().toISOString(),
            action: "chuyen_sinh_hoat",
            changes: [{ field: "dang_vien_du_bi", from: "Hồ sơ kết nạp", to: "Đang sinh hoạt (Dự bị)" }]
          });

          message.success(`Đã chuyển đồng chí ${record.hoten} sang danh sách Đảng viên đang sinh hoạt thành công!`);
          fetchData();
        } catch (err) {
          console.error("Lỗi khi chuyển sinh hoạt:", err);
          message.error("Lỗi khi chuyển sinh hoạt: " + err.message);
        } finally {
          setLoading(false);
        }
      };

      if (admissionYear && admissionYear < currentYear) {
        Modal.confirm({
          title: 'Quyết định kết nạp thuộc năm cũ!',
          content: `Quyết định kết nạp của đồng chí ${record.hoten} thuộc năm cũ (${admissionYear}). Bạn có chắc chắn muốn chuyển sang danh sách Đang sinh hoạt không? (Có thể đồng chí này đã được thêm từ trước để đồng bộ)`,
          okText: 'Vẫn chuyển',
          cancelText: 'Hủy bỏ',
          okButtonProps: { style: { backgroundColor: '#fa8c16', borderColor: '#fa8c16' } },
          onOk: () => performTransfer()
        });
        setLoading(false);
      } else {
        await performTransfer();
      }

    } catch (err) {
      console.error(err);
      message.error("Lỗi kiểm tra dữ liệu: " + err.message);
      setLoading(false);
    }
  };

  const handleBulkTransferToActive = async () => {
    if (selectedRowKeys.length === 0) return;

    const selectedRecords = filteredData.filter(item => selectedRowKeys.includes(item.id));
    const eligibleRecords = selectedRecords.filter(r => !r.da_chuyen_sinh_hoat);
    
    if (eligibleRecords.length === 0) {
      message.warning("Tất cả hồ sơ được chọn đã được chuyển sang danh sách Đang sinh hoạt rồi!");
      return;
    }

    try {
      setLoading(true);
      const hideProgress = message.loading(`Đang kiểm tra ${eligibleRecords.length} hồ sơ...`, 0);

      const activeSnapshot = await getDocs(collection(dbMain, "dang_vien"));
      const activeMembers = activeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const activeMssvs = new Set(activeMembers.map(m => m.mssv).filter(Boolean));

      const duplicates = [];
      const oldYears = [];
      const readyToTransfer = [];

      const currentYear = dayjs().year();

      eligibleRecords.forEach(record => {
        if (!record.mssv) return;

        if (activeMssvs.has(record.mssv)) {
          duplicates.push(record);
        } else {
          const admissionDate = record.ngayvaodang ? dayjs(record.ngayvaodang) : null;
          const admissionYear = admissionDate && admissionDate.isValid() ? admissionDate.year() : null;
          
          if (admissionYear && admissionYear < currentYear) {
            oldYears.push({ record, year: admissionYear });
          } else {
            readyToTransfer.push(record);
          }
        }
      });

      hideProgress();

      const runBatchTransfer = async (transferList, duplicateList) => {
        setLoading(true);
        const hideLoading = message.loading(`Đang tiến hành chuyển ${transferList.length} Đảng viên...`, 0);
        let countSuccess = 0;
        let countSync = 0;

        try {
          const transferPromises = transferList.map(async (record) => {
            const newDangVien = {
              mssv: record.mssv,
              ho_ten: record.hoten,
              lop: record.lop || '',
              khoa: record.khoa || '',
              cccd: record.cccd || '',
              sdt: record.sdt || '',
              email: record.email || '',
              ngay_sinh: record.ngaysinh || null,
              que_quan: record.quequan || '',
              ngay_vao_dang: record.ngayvaodang || null,
              noi_chuyen_di: 'Chi bộ Sinh viên DUE',
              ngay_chuyen_vao: record.ngayvaodang || null,
              dvhd: record.dangvienhuongdan || '',
              trang_thai: 'dang_sinh_hoat',
              dang_vien_du_bi: true,
              loai_dang_vien: 'Dự bị',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            if (record.xa_phuong_qq) newDangVien.xa_phuong_qq = record.xa_phuong_qq;
            if (record.tinh_tp_qq) newDangVien.tinh_tp_qq = record.tinh_tp_qq;

            await addDoc(collection(dbMain, "dang_vien"), newDangVien);
            
            await updateDoc(doc(dbMain, "ho_so_ket_nap", record.id), {
              da_chuyen_sinh_hoat: true,
              updated_at: new Date().toISOString()
            });

            await addDoc(collection(dbMain, "lich_su_cap_nhat"), {
              mssv: record.mssv,
              ho_ten: record.hoten,
              updated_by: "Hệ thống (Chuyển sinh hoạt hàng loạt)",
              updated_at: new Date().toISOString(),
              action: "chuyen_sinh_hoat",
              changes: [{ field: "dang_vien_du_bi", from: "Hồ sơ kết nạp", to: "Đang sinh hoạt (Dự bị)" }]
            });

            countSuccess++;
          });

          const duplicatePromises = duplicateList.map(async (record) => {
            await updateDoc(doc(dbMain, "ho_so_ket_nap", record.id), {
              da_chuyen_sinh_hoat: true,
              updated_at: new Date().toISOString()
            });
            countSync++;
          });

          await Promise.all([...transferPromises, ...duplicatePromises]);
          
          Modal.success({
            title: 'Hoàn tất chuyển sinh hoạt hàng loạt!',
            content: `Đã chuyển thành công ${countSuccess} Đảng viên mới sang danh sách Đảng viên đang sinh hoạt. Đồng thời đồng bộ trạng thái cho ${countSync} Đảng viên đã tồn tại trước đó.`,
            onOk: () => {
              setSelectedRowKeys([]);
              fetchData();
            }
          });
        } catch (err) {
          console.error("Lỗi chuyển hàng loạt:", err);
          message.error("Lỗi khi chuyển hàng loạt: " + err.message);
        } finally {
          hideLoading();
          setLoading(false);
        }
      };

      let modalContent = `Bạn đang chuẩn bị chuyển hàng loạt ${eligibleRecords.length} hồ sơ sang danh sách Đảng viên đang sinh hoạt.`;
      
      if (duplicates.length > 0) {
        modalContent += `\n- Có ${duplicates.length} hồ sơ trùng MSSV với danh sách hiện tại (sẽ tự động đồng bộ trạng thái Đã chuyển sinh hoạt mà không tạo trùng).`;
      }
      if (oldYears.length > 0) {
        modalContent += `\n- Có ${oldYears.length} hồ sơ thuộc quyết định năm cũ (từ ${currentYear - 1} trở về trước).`;
      }

      Modal.confirm({
        title: 'Xác nhận chuyển sinh hoạt hàng loạt',
        content: <div style={{ whiteSpace: 'pre-line' }}>{modalContent}</div>,
        okText: 'Xác nhận chuyển',
        cancelText: 'Hủy bỏ',
        width: 500,
        okButtonProps: { style: { backgroundColor: '#c62828', borderColor: '#c62828' } },
        onOk: () => {
          const allToTransfer = [...readyToTransfer, ...oldYears.map(oy => oy.record)];
          runBatchTransfer(allToTransfer, duplicates);
        }
      });

      setLoading(false);
    } catch (err) {
      console.error(err);
      message.error("Lỗi kiểm tra CSDL: " + err.message);
      setLoading(false);
    }
  };

  const handleOpenExportModal = () => {
    setSelectedExportFields(EXPORT_FIELDS.map(f => f.key));
    setExportRange('filtered');
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
      message.warning("Không có dữ liệu để xuất!");
      return;
    }

    const mappedData = dataToExport.map(item => {
      // Normalize ho_so_ket_nap fields to standard dang_vien fields
      const normItem = {
        ...item,
        ho_ten: item.hoten || '',
        so_dien_thoai: item.sdt || '',
        ngay_sinh: item.ngaysinh || null,
        que_quan: item.quequan || '',
        ngay_vao_dang: item.ngayvaodang || null,
        dvhd: item.dangvienhuongdan || '',
        so_the_dang: item.soqd || '',
        ngay_chinh_thuc: item.ngaykiqd || null,
        dang_vien_du_bi: true,
        trang_thai: 'dang_sinh_hoat',
        facebook: item.link_fb || '',
      };

      const row = {};
      EXPORT_FIELDS.forEach(field => {
        if (selectedExportFields.includes(field.key)) {
          if (field.isDate) {
            row[field.label] = normItem[field.key] ? dayjs(normItem[field.key]).format('DD/MM/YYYY') : '';
          } else if (field.isSpecial === 'type') {
            row[field.label] = normItem.dang_vien_du_bi ? "Dự bị" : "Chính thức";
          } else if (field.isSpecial === 'status') {
            row[field.label] = normItem.trang_thai === 'dang_sinh_hoat' ? 'Đang sinh hoạt' :
                               normItem.trang_thai === 'da_chuyen' ? 'Đã chuyển ra' :
                               normItem.trang_thai === 'cho_ket_nap' ? 'Chờ kết nạp' :
                               normItem.trang_thai === 'dang_xet_chinh_thuc' ? 'Đang xét chính thức' : 'Đang sinh hoạt';
          } else {
            row[field.label] = normItem[field.key] || "";
          }
        }
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(mappedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DaKetNap");
    XLSX.writeFile(wb, "DanhSachDangVienDaKetNap_TuyChinh.xlsx");
    
    setIsExportModalVisible(false);
    message.success(`Xuất Excel thành công ${dataToExport.length} dòng!`);
  };

  const columns = [
    { title: 'STT', key: 'stt', width: 60, render: (_, __, index) => index + 1 },
    { title: 'MSSV', dataIndex: 'mssv', key: 'mssv', sorter: (a, b) => (a.mssv || '').localeCompare(b.mssv || '') },
    { 
      title: 'Họ tên', 
      dataIndex: 'hoten', 
      key: 'hoten',
      sorter: (a, b) => (a.hoten || '').localeCompare(b.hoten || ''),
      render: (text, record) => (
        <Text style={{ color: '#1890ff', cursor: 'pointer', fontWeight: 500 }} onClick={() => handleEdit(record)}>
          {text}
        </Text>
      )
    },
    { title: 'Lớp', dataIndex: 'lop', key: 'lop', sorter: (a, b) => (a.lop || '').localeCompare(b.lop || '') },
    { title: 'Khoa', dataIndex: 'khoa', key: 'khoa', sorter: (a, b) => (a.khoa || '').localeCompare(b.khoa || '') },
    { 
      title: 'Số quyết định', 
      dataIndex: 'soqd', 
      key: 'soqd',
      render: (val) => val ? <Tag color="success" style={{ fontWeight: 600 }}>{val}</Tag> : '--'
    },
    { 
      title: 'Ngày kết nạp', 
      dataIndex: 'ngayvaodang', 
      key: 'ngayvaodang',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '--'
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 195,
      render: (_, record) => (
        <Space size="middle">
          {record.da_chuyen_sinh_hoat ? (
            <Tooltip title="Đã chuyển sang Đảng viên đang sinh hoạt">
              <span style={{ display: 'inline-flex', padding: '4px', cursor: 'default' }}>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
              </span>
            </Tooltip>
          ) : (
            <Button 
              type="text" 
              icon={<UserAddOutlined style={{ color: '#fa8c16' }} />} 
              onClick={() => handleTransferToActive(record)} 
              title="Chuyển sang Đảng viên Đang sinh hoạt" 
            />
          )}
          {!record.da_chuyen_sinh_hoat && (
            <Button type="text" icon={<MailOutlined style={{ color: '#52c41a' }} />} onClick={() => handlePrepareInvitation(record)} title="Soạn thư mời" />
          )}
          <Button type="text" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleEdit(record)} title="Xem/Sửa" />
          <Popconfirm title="Xóa hồ sơ kết nạp này khỏi hệ thống?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
            <Button type="text" icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />} danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '4px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
          <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.3px' }}>
            Hồ sơ đã kết nạp Đảng (Đồng bộ số liệu)
          </Title>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {selectedRowKeys.length > 0 && (
            <Space>
              <Button 
                type="primary" 
                icon={<UserAddOutlined />} 
                onClick={handleBulkTransferToActive}
                style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16', borderRadius: '6px', fontWeight: 500 }}
              >
                Chuyển sinh hoạt ({selectedRowKeys.length})
              </Button>
              <Popconfirm
                title={`Xóa vĩnh viễn ${selectedRowKeys.length} hồ sơ đã chọn?`}
                onConfirm={async () => {
                  try {
                    setLoading(true);
                    await Promise.all(selectedRowKeys.map(id => deleteDoc(doc(dbMain, "ho_so_ket_nap", id))));
                    message.success(`Đã xóa ${selectedRowKeys.length} hồ sơ thành công`);
                    setSelectedRowKeys([]);
                    fetchData();
                  } catch(e) {
                    message.error("Lỗi khi xóa hàng loạt");
                    setLoading(false);
                  }
                }}
              >
                <Button danger type="primary" icon={<DeleteOutlined />}>
                  Xóa ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            </Space>
          )}

          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={{ backgroundColor: '#c62828', borderRadius: '6px', fontWeight: 500 }}>
            Thêm hồ sơ kết nạp
          </Button>

          <Button
            icon={<MailOutlined />}
            onClick={() => {
              setInvitationRecord(null);
              const defaultTime = dayjs();
              const defaultValues = {
                ten_khoa: '',
                thoi_gian: defaultTime,
                dia_diem: 'Hội trường E, Trường Đại học Kinh tế, Đại học Đà Nẵng',
                trang_phuc: 'Áo sơ mi trắng, quần/chân váy sẫm màu',
                han_phan_hoi: defaultTime.subtract(12, 'hour')
              };
              invitationForm.setFieldsValue(defaultValues);
              setFacultyStudentOptions(data.filter(item => {
                if (item.da_chuyen_sinh_hoat) return false;
                if (!item.ngayvaodang) return true;
                const admissionDate = dayjs(item.ngayvaodang);
                if (!admissionDate.isValid()) return true;
                const diffDays = dayjs().diff(admissionDate, 'day');
                return diffDays <= 30;
              }));
              setSelectedStudentIds([]);
              setSelectedRecipients([]);
              setEmailSubject(generateEmailSubject([]));
              setEmailBodyText(generateEmailBody(defaultValues, []));
              setIsEditingPreview(false);
              setActiveTab('send');
              setInvitationHistory([]);
              setIsInvitationModalVisible(true);
            }}
            style={{ borderRadius: '6px', fontWeight: 500, color: '#c62828', borderColor: '#c62828' }}
          >
            Soạn thư mời Lễ kết nạp
          </Button>

          <Button 
            icon={<UploadOutlined />} 
            onClick={() => setIsImportModalVisible(true)} 
            style={{ borderRadius: '6px', fontWeight: 500, color: '#555555' }}
          >
            Nhập từ Excel
          </Button>

          <Button icon={<DownloadOutlined />} onClick={handleOpenExportModal} style={{ borderRadius: '6px', fontWeight: 500 }}>
            Xuất Excel
          </Button>
        </div>
      </div>

      {/* Filters ribbon */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: 16, 
        background: '#fafafa', 
        padding: '10px 16px', 
        borderRadius: '8px', 
        border: '1px solid #f0f0f0',
        flexWrap: 'wrap',
        width: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8c8c8c', fontSize: '13px', marginRight: '4px', fontWeight: 500, flexShrink: 0 }}>
          <FilterOutlined style={{ color: '#c62828' }} /> <span>Bộ lọc:</span>
        </div>
        
        <div style={{ flex: 1.5, minWidth: '200px' }}>
          <Input 
            placeholder="Tìm kiếm mã số, họ tên..." 
            onChange={handleSearch}
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
            filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            {uniqueKhoa.map(k => <Option key={k} value={k}>{k}</Option>)}
          </Select>
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <Select 
            placeholder="Chọn Năm kết nạp" 
            style={{ width: '100%' }} 
            allowClear 
            value={filterNam} 
            onChange={setFilterNam}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            {uniqueYears.map(y => (
              <Option key={y} value={y}>{y === 'Chưa rõ' ? 'Chưa rõ năm' : `Năm ${y}`}</Option>
            ))}
          </Select>
        </div>

        {(filterKhoa || filterNam || searchText) && (
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

      {/* Main Table */}
      <Table 
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys
        }}
        columns={columns} 
        dataSource={filteredData} 
        loading={loading}
        rowKey="id"
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20', '50'],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} hồ sơ đã kết nạp`
        }}
      />

      {/* Drawer Details Form */}
      <Drawer
        title={
          <span style={{ color: '#c62828', fontWeight: 'bold', fontSize: '18px' }}>
            {editingId ? "Chi tiết Hồ sơ đã kết nạp Đảng" : "Thêm mới Hồ sơ đã kết nạp Đảng"}
          </span>
        }
        open={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        width={1000}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '10px 16px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
            <Button onClick={() => setIsModalVisible(false)}>Hủy</Button>
            <Button type="primary" onClick={handleSave} style={{ backgroundColor: '#c62828', borderColor: '#c62828' }} loading={loading}>Lưu</Button>
          </div>
        }
      >
        <Form form={form} layout="vertical">
          
          {!editingId && (
            <Card style={{ marginBottom: 16, backgroundColor: '#fdfdfd', border: '1px dashed #d9d9d9', borderRadius: '8px' }} size="small">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 600, color: '#c62828', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <SearchOutlined /> Tra cứu sinh viên hệ thống để tự điền:
                </span>
                <Select
                  showSearch
                  placeholder="Nhập MSSV hoặc Họ tên để tự động điền..."
                  defaultActiveFirstOption={false}
                  showArrow={true}
                  filterOption={false}
                  onSearch={handleSearchStudents}
                  onChange={(id) => {
                    const sv = studentOptions.find(o => o.id === id);
                    if (sv) handleSelectStudent(sv);
                  }}
                  notFoundContent={searching ? 'Đang tìm...' : 'Không tìm thấy dữ liệu'}
                  style={{ flex: 1 }}
                  loading={searching}
                  allowClear
                  onClear={() => {
                    form.resetFields();
                    setSourceType('manual');
                    setIsEditable(true);
                  }}
                >
                  {studentOptions.map(sv => (
                    <Option key={sv.id} value={sv.id}>
                      <strong>{sv.MaSV || sv.mssv}</strong> - {sv.HoTen || sv.hoten} ({sv.Lop})
                    </Option>
                  ))}
                </Select>
              </div>
            </Card>
          )}

          {(editingId || sourceType === 'auto') && (
            <div style={{ marginBottom: 16 }}>
              {sourceType === 'auto' ? (
                <Alert
                  message={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        <Badge status="success" style={{ marginRight: 8 }} />
                        <strong>Dữ liệu hệ thống (AUTO):</strong> Hồ sơ được lấy từ danh mục sinh viên. Các trường lý lịch đang khóa.
                      </span>
                      <Space>
                        {!isEditable && (
                          <Button 
                            type="dashed" 
                            icon={<UnlockOutlined />} 
                            size="small" 
                            onClick={() => {
                              setIsEditable(true);
                              message.info("Đã cho phép chỉnh sửa thủ công!");
                            }}
                            style={{ color: '#d46b08', borderColor: '#d46b08' }}
                          >
                            Cho phép chỉnh sửa
                          </Button>
                        )}
                      </Space>
                    </div>
                  }
                  type="success"
                  showIcon
                />
              ) : (
                <Alert
                  message={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        <Badge status="warning" style={{ marginRight: 8 }} />
                        <strong>Nhập thủ công (MANUAL):</strong> Không tìm thấy sinh viên trong hệ thống. Tự nhập tay thông tin.
                      </span>
                    </div>
                  }
                  type="warning"
                  showIcon
                />
              )}
            </div>
          )}

          <Row gutter={16}>
            {/* THÔNG TIN SINH VIÊN */}
            <Col span={14}>
              <Card title="Thông tin Sinh viên" size="small" style={{ marginBottom: 16, borderRadius: '8px' }}>
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item name="mssv" label="MSSV">
                      <Input disabled={editingId ? (sourceType === 'auto' ? !isEditable : false) : !isEditable} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="hoten" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ và tên' }]}>
                      <Input disabled={!isEditable} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="cccd" label="CCCD">
                      <Input disabled={!isEditable} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item name="lop" label="Lớp">
                      <Input disabled={!isEditable} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="khoa" label="Khoa">
                      <Select 
                        showSearch 
                        disabled={!isEditable} 
                        placeholder="Chọn Khoa"
                        optionFilterProp="children"
                        filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                        dropdownStyle={{ borderRadius: '6px' }}
                      >
                        {KHOA_LIST.map(k => <Option key={k} value={k}>{k}</Option>)}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="gioitinh" label="Giới tính">
                      <Select disabled={!isEditable}>
                        <Option value="Nam">Nam</Option>
                        <Option value="Nữ">Nữ</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="ngaysinh" label="Ngày sinh">
                      <DatePicker 
                        disabled={!isEditable} 
                        format={['DD/MM/YYYY', 'DDMMYYYY']} 
                        placeholder="DD/MM/YYYY" 
                        style={{ width: '100%' }} 
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="quequan" label="Quê quán (Tỉnh/TP)">
                      <Select 
                        showSearch 
                        disabled={!isEditable} 
                        placeholder="Chọn Tỉnh/TP Quê quán"
                        optionFilterProp="children"
                        dropdownStyle={{ borderRadius: '6px' }}
                      >
                        {PROVINCES.map(p => <Option key={p} value={p}>{p}</Option>)}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item name="sdt" label="Số điện thoại">
                      <Input disabled={!isEditable} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
                      <Input disabled={!isEditable} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="link_fb" label="Facebook Link">
                      <Input disabled={!isEditable} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* QUYẾT ĐỊNH KẾT NẠP */}
            <Col span={10}>
              <Card title="Quyết định kết nạp Đảng" size="small" style={{ marginBottom: 16, borderRadius: '8px' }}>
                <Form.Item name="dangvienhuongdan" label="Đảng viên hướng dẫn">
                  <Input placeholder="Tên Đảng viên hướng dẫn" />
                </Form.Item>

                <Form.Item 
                  name="ngayvaodang" 
                  label="Ngày vào Đảng" 
                  rules={[{ required: true, message: 'Bắt buộc nhập ngày vào Đảng!' }]}
                >
                  <DatePicker format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item 
                  name="soqd" 
                  label="Số quyết định kết nạp" 
                  rules={[{ required: true, message: 'Bắt buộc nhập Số quyết định!' }]}
                >
                  <Input placeholder="Nhập Số Quyết định" />
                </Form.Item>

                <Form.Item 
                  name="ngaykiqd" 
                  label="Ngày ký quyết định" 
                  rules={[{ required: true, message: 'Bắt buộc nhập Ngày kí quyết định!' }]}
                >
                  <DatePicker format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
                </Form.Item>
              </Card>
            </Col>
          </Row>
        </Form>
      </Drawer>

      {/* Import Excel Modal */}
      <Modal
        title={
          <span style={{ color: '#c62828', fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadOutlined />
            Nhập dữ liệu hồ sơ kết nạp từ Excel
          </span>
        }
        open={isImportModalVisible}
        onCancel={() => {
          setImportFileList([]);
          setImportPreviewData([]);
          setIsImportModalVisible(false);
        }}
        width={950}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setImportFileList([]);
              setImportPreviewData([]);
              setIsImportModalVisible(false);
            }}
          >
            Hủy
          </Button>,
          <Button 
            key="import" 
            type="primary" 
            loading={isImporting} 
            onClick={handleConfirmImport} 
            style={{ backgroundColor: '#c62828', borderColor: '#c62828' }}
          >
            Import Data
          </Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%', marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Upload
              beforeUpload={handleImportUpload}
              fileList={importFileList}
              onChange={({ fileList }) => setImportFileList(fileList)}
              maxCount={1}
              accept=".xlsx,.xls"
            >
              <Button icon={<UploadOutlined />}>Chọn file Excel</Button>
            </Upload>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              Tải file mẫu (Template)
            </Button>
          </div>
          
          {importPreviewData.length > 0 && (
            <>
              <Alert 
                message={
                  <div>
                    Tìm thấy <strong>{importPreviewData.length}</strong> dòng dữ liệu. 
                    {importPreviewData.some(d => d.hasError) ? (
                      <span>
                        {" "}Trong đó có <strong style={{ color: '#52c41a' }}>{importPreviewData.filter(d => !d.hasError).length}</strong> dòng hợp lệ và <strong style={{ color: '#ff4d4f' }}>{importPreviewData.filter(d => d.hasError).length}</strong> dòng bị lỗi (đã tự động bỏ qua).
                      </span>
                    ) : (
                      " Tất cả các dòng đều hợp lệ."
                    )}
                  </div>
                } 
                type={importPreviewData.some(d => d.hasError) ? "warning" : "success"}
                showIcon 
              />
              <Table
                rowSelection={{
                  selectedRowKeys: importSelectedKeys,
                  onChange: setImportSelectedKeys,
                  getCheckboxProps: (record) => ({
                    disabled: record.hasError,
                  }),
                }}
                columns={[
                  { title: 'MSSV', dataIndex: 'mssv', key: 'mssv' },
                  { title: 'Họ tên', dataIndex: 'hoten', key: 'hoten' },
                  { title: 'Lớp', dataIndex: 'lop', key: 'lop' },
                  { title: 'Khoa', dataIndex: 'khoa', key: 'khoa' },
                  { title: 'Số quyết định', dataIndex: 'soqd', key: 'soqd' },
                  { title: 'Ngày kết nạp', dataIndex: 'ngayvaodang', key: 'ngayvaodang', render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '--' },
                  { 
                    title: 'Trạng thái đồng bộ', 
                    key: 'status',
                    render: (_, record) => {
                      if (record.hasError) return <span style={{color: 'red', fontWeight: 500}}>{record.errorMsg}</span>;
                      if (record.isUpdate) return <span style={{color: '#d46b08', fontWeight: 500}}>Cập nhật thông tin</span>;
                      return <span style={{color: 'green', fontWeight: 500}}>Thêm mới</span>;
                    }
                  }
                ]}
                dataSource={importPreviewData}
                pagination={{
                  defaultPageSize: 5,
                  showSizeChanger: true,
                  pageSizeOptions: ['5', '10', '20', '50', '100'],
                  showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} dòng`
                }}
                size="small"
                onRow={(record) => {
                  return {
                    onClick: (e) => {
                      if (e.target.closest('.ant-checkbox-wrapper') || e.target.closest('.ant-checkbox')) {
                        return;
                      }
                      setSelectedImportDetailRow(record);
                      setIsImportDetailOpen(true);
                    },
                    style: { cursor: 'pointer' }
                  };
                }}
              />
            </>
          )}
        </Space>
      </Modal>

      {/* Edit Import Row Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '20px', backgroundColor: '#c62828', borderRadius: '2px' }} />
            <span style={{ fontWeight: 800, fontSize: '16px', color: '#1a1a1a' }}>
              Chỉnh sửa dòng dữ liệu Excel - {selectedImportDetailRow?.hoten}
            </span>
          </div>
        }
        open={isImportDetailOpen}
        onCancel={() => {
          setIsImportDetailOpen(false);
          setSelectedImportDetailRow(null);
        }}
        width={850}
        footer={[
          <Button key="cancel" onClick={() => { setIsImportDetailOpen(false); setSelectedImportDetailRow(null); }}>
            Hủy
          </Button>,
          <Button key="save" type="primary" onClick={() => importDetailForm.submit()} style={{ backgroundColor: '#c62828', borderColor: '#c62828' }}>
            Lưu thay đổi
          </Button>
        ]}
      >
        <Form form={importDetailForm} layout="vertical" onFinish={handleSaveImportDetailRow}>
          {selectedImportDetailRow && selectedImportDetailRow.hasError && (
            <Alert 
              message={`Lỗi dòng dữ liệu: ${selectedImportDetailRow.errorMsg}`} 
              type="error" 
              showIcon 
              style={{ marginBottom: 16 }} 
            />
          )}
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="hoten" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ và tên' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="mssv" label="MSSV" rules={[{ required: true, message: 'Nhập MSSV' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="cccd" label="CCCD">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="ngaysinh" label="Ngày sinh">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="gioitinh" label="Giới tính">
                <Select>
                  <Option value="Nam">Nam</Option>
                  <Option value="Nữ">Nữ</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="lop" label="Lớp">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="khoa" label="Khoa">
                <Select showSearch optionFilterProp="children" placeholder="Chọn Khoa...">
                  {KHOA_LIST.map(k => <Option key={k} value={k}>{k}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="sdt" label="Số điện thoại">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="email" label="Email">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="link_fb" label="Facebook Link">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="quequan" label="Quê quán (Tỉnh/TP)">
                <Select showSearch>
                  {PROVINCES.map(p => <Option key={p} value={p}>{p}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="dangvienhuongdan" label="Đảng viên hướng dẫn">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="ngayvaodang" label="Ngày vào Đảng">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="soqd" label="Số quyết định">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Invitation Modal */}
      <Modal
        title={
          <span style={{ color: '#c62828', fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MailOutlined />
            Gửi email mời tham dự Lễ Kết nạp Đảng
          </span>
        }
        open={isInvitationModalVisible}
        onCancel={() => setIsInvitationModalVisible(false)}
        width={1100}
        footer={[
          <Button key="close" onClick={() => setIsInvitationModalVisible(false)}>
            Đóng
          </Button>,
          activeTab === "send" && (
            <Button 
              key="send" 
              type="primary" 
              icon={<SendOutlined />} 
              loading={isSendingInvitation}
              onClick={handleSendInvitation}
              style={{ backgroundColor: '#c62828', borderColor: '#c62828' }}
            >
              Gửi email mời
            </Button>
          )
        ]}
        destroyOnClose
      >
        {isInvitationModalVisible && (
          <div style={{ marginTop: '12px' }}>
            <Alert
              message={
                invitationRecord ? (
                  <div>
                    Đang lập thư mời cho quần chúng ưu tú: <strong>{invitationRecord.hoten}</strong> (MSSV: {invitationRecord.mssv}, Lớp: {invitationRecord.lop}) thuộc <strong>{invitationRecord.khoa}</strong>.
                  </div>
                ) : (
                  <div>Soạn thư mời tham dự Lễ Kết nạp Đảng viên mới. Vui lòng chọn Khoa và các sinh viên bên dưới.</div>
                )
              }
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab} 
              type="card"
              items={[
                {
                  key: 'send',
                  label: <span><CalendarOutlined />Tạo & Gửi thư mời</span>,
                  children: (
                    <Row gutter={24}>
                  {/* Left Column: Form Details */}
                  <Col span={11}>
                    <Card title="Chi tiết thư mời" size="small" style={{ borderRadius: '8px' }}>
                      <Form 
                        form={invitationForm} 
                        layout="vertical"
                        onValuesChange={handleInvitationFormChange}
                      >
                        <Form.Item label="Loại thư mời" required>
                          <Select
                            value={invitationType}
                            onChange={(val) => {
                              setInvitationType(val);
                              if (val === 'doan_truong') {
                                setRecipientOptions([{ name: 'BCH Đoàn TN - Hội SV Trường', email: 'doanthanhnien@due.edu.vn' }]);
                                setSelectedRecipients(['doanthanhnien@due.edu.vn']);
                                setFacultyStudentOptions(data.filter(item => {
                                  if (!item.ngayvaodang) return true;
                                  const admissionDate = dayjs(item.ngayvaodang);
                                  if (!admissionDate.isValid()) return true;
                                  return dayjs().diff(admissionDate, 'day') <= 30;
                                }));
                                setSelectedStudentIds([]);
                                invitationForm.setFieldsValue({ ten_khoa: undefined });
                              } else {
                                setSelectedRecipients([]);
                                setRecipientOptions([]);
                                setFacultyStudentOptions([]);
                                setSelectedStudentIds([]);
                                invitationForm.setFieldsValue({ ten_khoa: undefined });
                              }
                              const currentValues = invitationForm.getFieldsValue();
                              const selectedStudentsList = [];
                              const bodyFn = val === 'doan_truong' ? generateEmailBodyDoanTruong : generateEmailBody;
                              setEmailBodyText(bodyFn(currentValues, selectedStudentsList));
                            }}
                          >
                            <Option value="khoa">Thư mời BCH Liên Chi Đoàn Khoa</Option>
                            <Option value="doan_truong">Thư mời BCH Đoàn Thanh niên - Hội Sinh viên Trường</Option>
                          </Select>
                        </Form.Item>

                        <Form.Item label={invitationType === 'khoa' ? "Người nhận (BCH Liên Chi Đoàn Khoa)" : "Người nhận (BCH Đoàn TN - Hội SV)"} required>
                          <Select
                            mode="tags"
                            style={{ width: '100%' }}
                            placeholder="Chọn hoặc nhập email người nhận"
                            value={selectedRecipients}
                            onChange={setSelectedRecipients}
                            tokenSeparators={[',', ' ']}
                            dropdownStyle={{ borderRadius: '6px' }}
                          >
                            {recipientOptions.map(opt => (
                              <Option key={opt.email} value={opt.email}>
                                {opt.name} ({opt.email})
                              </Option>
                            ))}
                          </Select>
                          <Text type="secondary" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                            * Có thể chọn nhiều người nhận từ danh sách hoặc tự nhập email mới rồi ấn Enter.
                          </Text>
                        </Form.Item>

                        <Row gutter={12}>
                          {invitationType === 'khoa' && (
                            <Col span={8}>
                              <Form.Item name="ten_khoa" label="Chọn Khoa" rules={[{ required: true, message: 'Chọn Khoa' }]}>
                                <Select
                                  placeholder="Chọn Khoa..."
                                  showSearch
                                  allowClear
                                  onChange={(val) => {
                                    const filtered = data.filter(item => {
                                      if (val && item.khoa !== val) return false;
                                      if (!item.ngayvaodang) return true;
                                      const admissionDate = dayjs(item.ngayvaodang);
                                      if (!admissionDate.isValid()) return true;
                                      const diffDays = dayjs().diff(admissionDate, 'day');
                                      return diffDays <= 30;
                                    });
                                    setFacultyStudentOptions(filtered);
                                    setSelectedStudentIds([]);
                                    const contacts = BCH_CONTACTS[val] || DEFAULT_BCH_CONTACTS;
                                    setRecipientOptions(contacts);
                                    setSelectedRecipients(contacts.map(c => c.email));
                                    const currentValues = invitationForm.getFieldsValue();
                                    currentValues.ten_khoa = val;
                                    setEmailBodyText(generateEmailBody(currentValues, []));
                                  }}
                                >
                                  {[...new Set(data.map(d => d.khoa).filter(Boolean))].sort().map(k => (
                                    <Option key={k} value={k}>{k}</Option>
                                  ))}
                                </Select>
                              </Form.Item>
                            </Col>
                          )}
                          <Col span={invitationType === 'khoa' ? 16 : 24}>
                            <Form.Item label="Danh sách sinh viên được kết nạp" required>
                              <Select
                                mode="multiple"
                                style={{ width: '100%' }}
                                placeholder="Chọn các sinh viên được kết nạp"
                                value={selectedStudentIds}
                                onChange={(ids) => {
                                  setSelectedStudentIds(ids);
                                  const selectedStudentsList = facultyStudentOptions.filter(opt => ids.includes(opt.id));
                                  const currentValues = invitationForm.getFieldsValue();
                                  if (!isEditingPreview) {
                                    const bodyFn = invitationType === 'doan_truong' ? generateEmailBodyDoanTruong : generateEmailBody;
                                    setEmailBodyText(bodyFn(currentValues, selectedStudentsList));
                                    setEmailSubject(generateEmailSubject(selectedStudentsList));
                                  }
                                }}
                                dropdownStyle={{ borderRadius: '6px' }}
                              >
                                {facultyStudentOptions.filter(opt => opt.hoten).map(opt => (
                                  <Select.Option key={opt.id} value={opt.id}>
                                    {opt.hoten} ({opt.lop || '--'})
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={12}>
                          <Col span={12}>
                            <Form.Item name="thoi_gian" label="Thời gian diễn ra" rules={[{ required: true, message: 'Chọn thời gian' }]}>
                              <DatePicker 
                                showTime={{ format: 'HH:mm' }}
                                format="DD/MM/YYYY HH:mm"
                                placeholder="Chọn ngày và giờ"
                                style={{ width: '100%' }}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="han_phan_hoi" label="Hạn phản hồi tham dự" rules={[{ required: true, message: 'Chọn hạn phản hồi' }]}>
                              <DatePicker 
                                showTime={{ format: 'HH:mm' }}
                                format="DD/MM/YYYY HH:mm"
                                placeholder="Chọn ngày và giờ"
                                style={{ width: '100%' }}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Form.Item name="dia_diem" label="Địa điểm tổ chức" rules={[{ required: true, message: 'Nhập địa điểm' }]}>
                          <Input placeholder="Nhập địa điểm tổ chức" />
                        </Form.Item>

                        <Form.Item name="trang_phuc" label="Trang phục yêu cầu" rules={[{ required: true, message: 'Nhập trang phục' }]}>
                          <Input placeholder="Trang phục tham dự" />
                        </Form.Item>
                      </Form>
                    </Card>
                  </Col>

                  {/* Right Column: Preview and Edit */}
                  <Col span={13}>
                    <Card 
                      title="Xem trước nội dung email" 
                      size="small" 
                      style={{ borderRadius: '8px' }}
                      extra={
                        <Space>
                          <span style={{ fontSize: '12px', fontWeight: 'normal' }}>Chỉnh sửa trực tiếp:</span>
                          <Switch 
                            checked={isEditingPreview} 
                            onChange={(checked) => {
                              setIsEditingPreview(checked);
                              if (!checked) {
                                // Reset to template using current form values
                                const currentValues = invitationForm.getFieldsValue();
                                const selectedStudentsList = facultyStudentOptions.filter(opt => selectedStudentIds.includes(opt.id));
                                setEmailBodyText(generateEmailBody(currentValues, selectedStudentsList));
                                setEmailSubject(generateEmailSubject(selectedStudentsList));
                              }
                            }} 
                            size="small"
                          />
                        </Space>
                      }
                    >
                      <div style={{ marginBottom: '12px' }}>
                        <Text strong style={{ display: 'block', marginBottom: '4px' }}>Tiêu đề Email:</Text>
                        <Input 
                          value={emailSubject} 
                          onChange={(e) => setEmailSubject(e.target.value)} 
                          placeholder="Nhập tiêu đề email..."
                          style={{ borderRadius: '6px' }}
                        />
                      </div>

                      <Text strong style={{ display: 'block', marginBottom: '4px' }}>Nội dung Email:</Text>
                      {isEditingPreview ? (
                        <Input.TextArea
                          value={emailBodyText}
                          onChange={(e) => setEmailBodyText(e.target.value)}
                          rows={14}
                          style={{ 
                            fontFamily: 'monospace', 
                            fontSize: '13px', 
                            borderRadius: '6px',
                            backgroundColor: '#fafafa' 
                          }}
                        />
                      ) : (
                        <div 
                          style={{
                            maxHeight: '400px',
                            overflowY: 'auto',
                            padding: '12px',
                            backgroundColor: '#f0f2f5',
                            borderRadius: '8px',
                            border: '1px solid #d9d9d9'
                          }}
                        >
                          <div style={{
                            fontFamily: "'SVN-Gilroy', 'Helvetica Neue', Helvetica, Arial, sans-serif",
                            maxWidth: '100%',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                            textAlign: 'justify'
                          }}>
                            {/* Header Banner */}
                            <div style={{
                              backgroundColor: '#b71c1c',
                              background: 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)',
                              padding: '20px 16px',
                              textAlign: 'center',
                              borderBottom: '4px solid #fbc02d'
                            }}>
                              <p style={{ color: '#ffffff', margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chi bộ Sinh viên - Đảng bộ Trường Đại học Kinh tế, ĐHĐN</p>
                              <h2 style={{ color: '#ffffff', margin: 0, fontSize: '18px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>THƯ MỜI THAM DỰ LỄ KẾT NẠP ĐẢNG VIÊN MỚI</h2>
                            </div>
                            
                            {/* Content Body */}
                            <div style={{
                              padding: '24px 20px',
                              lineHeight: '1.8',
                              color: '#333333',
                              fontSize: '14px',
                              backgroundColor: '#ffffff',
                              textAlign: 'justify'
                            }}>
                              <div 
                                style={{ whiteSpace: 'pre-wrap', fontSize: '14px', color: '#333333', textAlign: 'justify', lineHeight: '1.8' }}
                                dangerouslySetInnerHTML={{ __html: emailBodyText.replace(/\n/g, '<br />') }}
                              />
                            </div>
                            
                            {/* Footer */}
                            <div style={{ backgroundColor: '#ffffff', padding: '24px 20px', borderTop: '1.5px solid #e0e0e0', fontFamily: "'SVN-Gilroy', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                              <table cellPadding="0" cellSpacing="0" border="0" width="100%">
                                <tbody>
                                  <tr>
                                    {/* Left Side: Logo & Name */}
                                    <td width="42%" align="center" style={{ verticalAlign: 'middle', paddingRight: '15px' }}>
                                      <img src="/logo.png" alt="Logo Chi Bộ Sinh Viên" height="70" style={{ display: 'block', margin: '0 auto 8px' }} />
                                      <div style={{ color: '#b71c1c', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontFamily: "'SVN-Gilroy', Arial, sans-serif" }}>CHI BỘ SINH VIÊN</div>
                                      <div style={{ color: '#610c0c', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', fontFamily: "'SVN-Gilroy', Arial, sans-serif" }}>ĐẢNG BỘ TRƯỜNG ĐẠI HỌC KINH TẾ</div>
                                    </td>
                                    
                                    {/* Divider Line */}
                                    <td width="3%" align="center" style={{ verticalAlign: 'middle' }}>
                                      <div style={{ borderLeft: '1.5px solid #b71c1c', height: '95px', width: '1px' }}></div>
                                    </td>
                                    
                                    {/* Right Side: Contacts */}
                                    <td width="55%" style={{ verticalAlign: 'middle', paddingLeft: '15px', textAlign: 'left', fontSize: '12px', color: '#333333', lineHeight: '1.5' }}>
                                      <div style={{ marginBottom: '4px' }}>
                                        <strong style={{ color: '#b71c1c' }}>Fanpage:</strong> <a href="https://fb.com/chibosinhvienDUE" target="_blank" rel="noopener noreferrer" style={{ color: '#096dd9', textDecoration: 'underline' }}>fb.com/chibosinhvienDUE</a>
                                      </div>
                                      <div style={{ marginBottom: '4px' }}>
                                        <strong style={{ color: '#b71c1c' }}>Website:</strong> <a href="https://chibosinhvien.vn/" target="_blank" rel="noopener noreferrer" style={{ color: '#096dd9', textDecoration: 'underline' }}>chibosinhvien.vn/</a>
                                      </div>
                                      <div style={{ marginBottom: '6px' }}>
                                        <strong style={{ color: '#b71c1c' }}>Email:</strong> <a href="mailto:chibosinhvien@due.edu.vn" style={{ color: '#096dd9', textDecoration: 'underline' }}>chibosinhvien@due.edu.vn</a>
                                      </div>
                                      <div style={{ marginTop: '4px', borderTop: '1px dashed #e0e0e0', paddingTop: '4px' }}>
                                        <strong style={{ color: '#b71c1c' }}>Liên hệ:</strong><br />
                                        TS. Bùi Trung Hiệp - Bí thư Chi bộ<br />
                                        <a href="mailto:hiepbt@due.edu.vn" style={{ color: '#096dd9', textDecoration: 'underline' }}>hiepbt@due.edu.vn</a> &nbsp;|&nbsp; <span style={{ color: '#096dd9', textDecoration: 'underline' }}>0935.743.555</span>
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  </Col>
                    </Row>
                  )
                },
                {
                  key: 'history',
                  label: <span><HistoryOutlined />Lịch sử thư mời</span>,
                  children: (
                    <Table
                  dataSource={invitationHistory}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 5 }}
                  columns={[
                    {
                      title: 'Thời gian gửi',
                      dataIndex: 'sent_at',
                      key: 'sent_at',
                      render: (val) => dayjs(val).format('DD/MM/YYYY HH:mm:ss')
                    },
                    {
                      title: 'Người nhận (Emails)',
                      dataIndex: 'recipients',
                      key: 'recipients',
                      render: (emails) => (
                        <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Tooltip title={emails.join(', ')}>
                            {emails.join(', ')}
                          </Tooltip>
                        </div>
                      )
                    },
                    {
                      title: 'Trạng thái',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status) => (
                        <Tag color={status === 'success' ? 'green' : 'red'}>
                          {status === 'success' ? 'Thành công' : 'Thất bại'}
                        </Tag>
                      )
                    },
                    {
                      title: 'Hành động',
                      key: 'action',
                      render: (_, record) => (
                        <Space>
                          <Button 
                            type="link" 
                            size="small" 
                            onClick={() => {
                              Modal.info({
                                title: 'Nội dung email đã gửi',
                                width: 700,
                                content: (
                                  <div style={{ marginTop: '12px' }}>
                                    <p><strong>Tiêu đề:</strong> {record.subject}</p>
                                    <div style={{ 
                                      whiteSpace: 'pre-wrap', 
                                      padding: '12px', 
                                      background: '#f5f5f5', 
                                      borderRadius: '4px',
                                      maxHeight: '400px',
                                      overflowY: 'auto',
                                      fontSize: '12px'
                                    }}>
                                      {record.body}
                                    </div>
                                  </div>
                                ),
                                okText: 'Đóng'
                              });
                            }}
                          >
                            Xem lại
                          </Button>
                          <Button 
                            type="link" 
                            size="small" 
                            style={{ color: '#faad14' }}
                            onClick={() => handleResendInvitation(record)}
                          >
                            Gửi lại
                          </Button>
                        </Space>
                      )
                    }
                  ]}
                />
                  )
                }
              ]}
            />
          </div>
        )}
      </Modal>
      
      <ProfileDrawer 
        open={isProfileDrawerVisible} 
        onClose={() => setIsProfileDrawerVisible(false)} 
        data={selectedRecord} 
        collectionName="ho_so_ket_nap"
        onUpdate={fetchData} 
      />
      <ProfileDrawer 
        open={isProfileDrawerVisible} 
        onClose={() => setIsProfileDrawerVisible(false)} 
        data={selectedRecord} 
        collectionName="ho_so_ket_nap"
        onUpdate={fetchData} 
      />

      {/* Custom Export Modal */}
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

          {exportRange === 'filtered' && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              marginTop: '-12px'
            }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FilterOutlined style={{ color: '#c62828' }} />
                <span>Cấu hình Bộ Lọc Dữ Liệu Xuất (Thay đổi sẽ cập nhật trực tiếp):</span>
              </div>
              <Row gutter={[12, 12]}>
                <Col span={8}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Tìm kiếm từ khóa:</div>
                  <Input 
                    placeholder="MSSV, Họ tên..." 
                    value={searchText} 
                    onChange={e => setSearchText(e.target.value)} 
                    style={{ borderRadius: '6px' }}
                    allowClear
                  />
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Khoa:</div>
                  <Select 
                    placeholder="Chọn Khoa" 
                    value={filterKhoa} 
                    onChange={setFilterKhoa} 
                    style={{ width: '100%' }}
                    allowClear
                    dropdownStyle={{ borderRadius: '6px' }}
                  >
                    {KHOA_LIST.map(k => <Option key={k} value={k}>{k}</Option>)}
                  </Select>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Năm kết nạp:</div>
                  <Select 
                    placeholder="Chọn Năm" 
                    value={filterNam} 
                    onChange={setFilterNam} 
                    style={{ width: '100%' }}
                    allowClear
                    dropdownStyle={{ borderRadius: '6px' }}
                  >
                    {uniqueYears.map(year => (
                      <Option key={year} value={year}>{year === 'Chưa rõ' ? 'Chưa rõ năm' : `Năm ${year}`}</Option>
                    ))}
                  </Select>
                </Col>
              </Row>
            </div>
          )}

          <Divider style={{ margin: '16px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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

          <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
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
                          style={{ fontSize: '12px', fontWeight: 600, color: '#c62828' }}
                        >
                          {allSelected ? "Hủy chọn nhóm" : "Chọn cả nhóm"}
                        </Button>
                      }
                    >
                      <Row gutter={[8, 12]}>
                        {groupFields.map(field => {
                          const isSelected = selectedExportFields.includes(field.key);
                          return (
                            <Col span={8} key={field.key}>
                              <div 
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedExportFields(prev => prev.filter(k => k !== field.key));
                                  } else {
                                    setSelectedExportFields(prev => [...prev, field.key]);
                                  }
                                }}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: isSelected ? '1px solid #ffa39e' : '1px solid #d9d9d9',
                                  backgroundColor: isSelected ? '#fff1f0' : '#fff',
                                  color: isSelected ? '#c62828' : '#595959',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontWeight: isSelected ? 600 : 400,
                                  transition: 'all 0.15s ease',
                                  userSelect: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}
                              >
                                <span>{field.label}</span>
                                {isSelected && <span style={{ color: '#c62828', fontWeight: 800 }}>✓</span>}
                              </div>
                            </Col>
                          );
                        })}
                      </Row>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default HoSoDaKetNap;
