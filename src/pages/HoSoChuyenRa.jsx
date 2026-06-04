import React, { useState, useEffect, useMemo } from 'react';
import { Table, Typography, message, Space, Input, Button, Modal, Form, Select, DatePicker, Popconfirm, Tag, Tooltip, Dropdown, Menu, Badge, Drawer, Alert, Empty, Row, Col, Card, Upload, Divider, Checkbox, Switch, Collapse, Radio, Steps } from 'antd';
import { 
  PlusOutlined, ArrowRightOutlined, CheckOutlined, DeleteOutlined, 
  SearchOutlined, FilterOutlined, CloseOutlined, CalendarOutlined, 
  DownloadOutlined, UploadOutlined, FileTextOutlined, FileZipOutlined, 
  StarOutlined, ExportOutlined, InfoCircleOutlined 
} from '@ant-design/icons';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ProfileDrawer from '../components/ProfileDrawer';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import DocumentPreview from '../components/DocumentPreview';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { docGeneratorService } from '../services/docGeneratorService';

const { Title, Text } = Typography;
const { Option } = Select;

const EXPORT_FIELDS = [
  { key: 'ho_ten', label: 'Họ tên', group: 'basic' },
  { key: 'mssv', label: 'MSSV', group: 'basic' },
  { key: 'ngay_sinh', label: 'Ngày sinh', group: 'basic', isDate: true },
  { key: 'cccd', label: 'CCCD', group: 'basic' },
  { key: 'nhom', label: 'Nhóm sinh hoạt', group: 'org' },
  { key: 'so_dien_thoai', label: 'SĐT', group: 'contact' },
  { key: 'email', label: 'Email cá nhân', group: 'contact' },
  { key: 'facebook', label: 'Facebook', group: 'contact' },
  { key: 'noi_thuong_tru', label: 'Chi tiết ĐC thường trú', group: 'address' },
  { key: 'noi_tam_tru', label: 'Địa chỉ tạm trú', group: 'contact' },
  { key: 'ngay_nop_ho_so', label: 'Ngày nộp hồ sơ', group: 'transfer', isDate: true },
  { key: 'buoc', label: 'Bước hiện tại', group: 'transfer', isSpecial: 'buoc' },
  { key: 'ho_ten_nguoi_than', label: 'Họ tên người thân', group: 'family' },
  { key: 'sdt_nguoi_than', label: 'SĐT người thân', group: 'family' }
];

const FIELD_GROUPS = {
  basic: { label: "Thông tin cơ bản", color: "blue" },
  org: { label: "Học tập & Tổ chức", color: "geekblue" },
  contact: { label: "Liên hệ & Tạm trú", color: "cyan" },
  address: { label: "Địa chỉ thường trú", color: "purple" },
  transfer: { label: "Tiến trình chuyển ra", color: "red" },
  family: { label: "Gia đình", color: "orange" }
};

const generateDefaultEmailTemplate = (record, values) => {
  if (!record) return { subject: '', html: '' };
  
  const isTamThoi = record.loai_chuyen === 'chuyen_tam_thoi';
  const nameUpper = (record.ho_ten || '').toUpperCase();
  const subject = isTamThoi 
    ? `THÔNG BÁO HOÀN TẤT THỦ TỤC CHUYỂN SINH HOẠT ĐẢNG TẠM THỜI - Đ/C ${nameUpper}`
    : `THÔNG BÁO HOÀN TẤT THỦ TỤC CHUYỂN SINH HOẠT ĐẢNG - Đ/C ${nameUpper}`;

  let html = '';
  
  if (isTamThoi) {
    const ngayChuyenStr = values.ngay_chuyen_tam_thoi ? dayjs(values.ngay_chuyen_tam_thoi).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY');
    const thoiGianVe = values.thoi_gian_ve || '[Thời gian dự kiến]';
    const noiChuyenStr = values.noi_chuyen_den_tam_thoi || '[Nơi sinh hoạt tạm thời]';
    const ghiChuStr = values.ghi_chu || '';

    html = `<div style="font-family: 'SVN-Gilroy', 'Inter', sans-serif; max-width: 650px; margin: 0 auto; color: #333; line-height: 1.6;">
  <div style="background: linear-gradient(135deg,#fa8c16,#d46b08); padding: 24px; text-align: center; border-radius: 10px 10px 0 0; font-family: inherit;">
    <h2 style="color: white; margin: 0 0 4px 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; font-family: inherit;">CHI BỘ SINH VIÊN</h2>
    <p style="color: #ffe7ba; margin: 0; font-size: 13px; font-family: inherit;">Trường Đại học Kinh tế - Đại học Đà Nẵng</p>
  </div>
  <div style="padding: 24px; border: 1px solid #e8e8e8; border-top: none; border-radius: 0 0 10px 10px; background: #fff; font-family: inherit;">
    <p style="font-size: 15px; margin-bottom: 6px; font-family: inherit;">Kính gửi Đồng chí <strong style="color:#d46b08">${record.ho_ten || ''}</strong>,</p>
    <p style="font-size: 14px; color:#555; text-align:justify; font-family: inherit;">Hồ sơ thủ tục chuyển sinh hoạt Đảng <strong>tạm thời</strong> của đồng chí đã được Chi bộ Sinh viên thực hiện xử lý hoàn thành và gửi nộp lên cấp trên thành công. Chi bộ xin gửi thông tin chi tiết quyết định chuyển sinh hoạt Đảng tạm thời như dưới đây:</p>
    <div style="background:#fffbe6; border:1px solid #ffe58f; border-radius:8px; padding:14px 18px; margin:16px 0; font-family: inherit;">
      <p style="margin:0 0 10px 0; font-weight:700; color:#d46b08; font-size:14px; font-family: inherit;">📍 Thông tin chuyển sinh hoạt Đảng tạm thời</p>
      <table style="width:100%; border-collapse:collapse; font-size:13px; font-family: inherit;">
        <tr><td style="padding:4px 0; color:#8c8c8c; width:150px; font-weight:600; font-family: inherit;">Ngày bắt đầu đi:</td><td style="font-weight:600; color:#333; font-family: inherit;">${ngayChuyenStr}</td></tr>
        <tr><td style="padding:4px 0; color:#8c8c8c; font-weight:600; font-family: inherit;">Thời gian dự kiến:</td><td style="font-weight:600; color:#333; font-family: inherit;">${thoiGianVe}</td></tr>
        <tr><td style="padding:4px 0; color:#8c8c8c; font-weight:600; font-family: inherit;">Nơi sinh hoạt tạm thời:</td><td style="font-weight:600; color:#333; font-family: inherit;">${noiChuyenStr}</td></tr>
        ${ghiChuStr ? `<tr><td style="padding:4px 0; color:#8c8c8c; font-weight:600; font-family: inherit;">Ghi chú:</td><td style="color:#333; font-family: inherit;">${ghiChuStr}</td></tr>` : ''}
      </table>
    </div>
    <p style="font-size:14px; margin-top:16px; text-align:justify; font-family: inherit;">Đồng chí vui lòng khẩn trương liên hệ trực tiếp với <strong>Văn phòng Đảng ủy Trường (Phòng H208)</strong> để nhận lại túi Hồ sơ Đảng tạm thời và thực hiện nộp về Đảng ủy mới theo đúng thời gian quy định. Sau khi hoàn thành đợt sinh hoạt tạm thời, đồng chí có trách nhiệm làm thủ tục chuyển sinh hoạt trở lại Chi bộ Sinh viên.</p>
    <p style="font-size:14px; margin-top:20px; font-weight:600; color:#555; font-family: inherit;">Trân trọng chúc đồng chí luôn hoàn thành tốt mọi nhiệm vụ học tập và công tác tại tổ chức Đảng mới./.</p>
    <hr style="border:none; border-top:1px solid #f0f0f0; margin:20px 0 12px 0; font-family: inherit;" />
    <p style="color:#999; font-size:11px; margin:0; text-align:center; font-family: inherit;">Email tự động từ Hệ thống quản lý Chi bộ Sinh viên - Trường ĐH Kinh tế ĐHĐN.</p>
  </div>
</div>`;
  } else {
    const ngayChuyenStr = values.ngay_chuyen_ra ? dayjs(values.ngay_chuyen_ra).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY');
    const noiChuyenStr = values.noi_chuyen_ra || '[Nơi chuyển đến]';
    const ghiChuStr = values.ghi_chu || '';

    html = `<div style="font-family: 'SVN-Gilroy', 'Inter', sans-serif; max-width: 650px; margin: 0 auto; color: #333; line-height: 1.6;">
  <div style="background: linear-gradient(135deg,#c62828,#b71c1c); padding: 24px; text-align: center; border-radius: 10px 10px 0 0; font-family: inherit;">
    <h2 style="color: white; margin: 0 0 4px 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; font-family: inherit;">CHI BỘ SINH VIÊN</h2>
    <p style="color: #ffcdd2; margin: 0; font-size: 13px; font-family: inherit;">Trường Đại học Kinh tế - Đại học Đà Nẵng</p>
  </div>
  <div style="padding: 24px; border: 1px solid #e8e8e8; border-top: none; border-radius: 0 0 10px 10px; background: #fff; font-family: inherit;">
    <p style="font-size: 15px; margin-bottom: 6px; font-family: inherit;">Kính gửi Đồng chí <strong style="color:#c62828">${record.ho_ten || ''}</strong>,</p>
    <p style="font-size: 14px; color:#555; text-align:justify; font-family: inherit;">Hồ sơ thủ tục chuyển sinh hoạt Đảng của đồng chí đã được Chi bộ Sinh viên thực hiện xử lý hoàn thành và chuyển nộp lên cấp trên thành công. Chi bộ xin gửi thông tin chi tiết quyết định chuyển sinh hoạt Đảng như dưới đây:</p>
    <div style="background:#f6ffed; border:1px solid #b7eb8f; border-radius:8px; padding:14px 18px; margin:16px 0; font-family: inherit;">
      <p style="margin:0 0 10px 0; font-weight:700; color:#52c41a; font-size:14px; font-family: inherit;">📍 Thông tin chuyển sinh hoạt Đảng chính thức</p>
      <table style="width:100%; border-collapse:collapse; font-size:13px; font-family: inherit;">
        <tr><td style="padding:4px 0; color:#8c8c8c; width:120px; font-weight:600; font-family: inherit;">Ngày chuyển đi:</td><td style="font-weight:600; color:#333; font-family: inherit;">${ngayChuyenStr}</td></tr>
        <tr><td style="padding:4px 0; color:#8c8c8c; font-weight:600; font-family: inherit;">Nơi chuyển đến:</td><td style="font-weight:600; color:#333; font-family: inherit;">${noiChuyenStr}</td></tr>
        ${ghiChuStr ? `<tr><td style="padding:4px 0; color:#8c8c8c; font-weight:600; font-family: inherit;">Ghi chú:</td><td style="color:#333; font-family: inherit;">${ghiChuStr}</td></tr>` : ''}
      </table>
    </div>
    <p style="font-size:14px; margin-top:16px; text-align:justify; font-family: inherit;">Đồng chí vui lòng chú ý điện thoại để nhận lại Hồ sơ Đảng viên và nộp cho Đơn vị mới. Cảm ơn đồng chí đã luôn đồng hành và gắn bó cùng Chi bộ Sinh viên trong suốt thời gian vừa qua.</p>
    <p style="font-size:14px; margin-top:20px; font-weight:600; color:#555; font-family: inherit;">Kính chúc đồng chí luôn hoàn thành tốt mọi nhiệm vụ được giao ở đơn vị mới. <br> Trân trọng</p>
    <hr style="border:none; border-top:1px solid #f0f0f0; margin:20px 0 12px 0; font-family: inherit;" />
    <p style="color:#999; font-size:11px; margin:0; text-align:center; font-family: inherit;">Email tự động từ Hệ thống quản lý Chi bộ Sinh viên - Trường ĐH Kinh tế ĐHĐN.</p>
  </div>
</div>`;
  }

  return { subject, html };
};

const HoSoChuyenRa = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Drawer visibility for profile detail view
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // === 3-STEP TRANSFER-OUT STATE ===
  const [activeProcesses, setActiveProcesses] = useState([]);
  const safeDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      // Handle Firestore Timestamp
      if (typeof dateStr === 'object' && dateStr.seconds) {
        return dayjs(new Date(dateStr.seconds * 1000));
      }
      if (typeof dateStr === 'object' && dateStr.toDate) {
        return dayjs(dateStr.toDate());
      }
      const d = dayjs(dateStr);
      return d.isValid() ? d : null;
    } catch (e) {
      return null;
    }
  };

  const [activeMembers, setActiveMembers] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isCompleteModalVisible, setIsCompleteModalVisible] = useState(false);
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  
  // Registration requests state
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  
  const [selectedProcessForCompletion, setSelectedProcessForCompletion] = useState(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [submittingComplete, setSubmittingComplete] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState("");
  const [filterStep, setFilterStep] = useState(null);
  const [filterNhom, setFilterNhom] = useState(null);
  const [filterLoaiChuyen, setFilterLoaiChuyen] = useState(null);
  const [filterIntake, setFilterIntake] = useState(null);

  // Step transition note states
  const [isStepModalVisible, setIsStepModalVisible] = useState(false);
  const [stepNote, setStepNote] = useState('');
  const [transitioningRecord, setTransitioningRecord] = useState(null);
  const [stepLoading, setStepLoading] = useState(false);
  
  // Custom Export States
  const [exportRange, setExportRange] = useState('filtered'); // 'filtered', 'all'
  const [selectedExportFields, setSelectedExportFields] = useState(EXPORT_FIELDS.map(f => f.key));

  // Excel Import States
  const [validationResults, setValidationResults] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [importing, setImporting] = useState(false);

  // Live Email Preview States
  const [sendEmailChecked, setSendEmailChecked] = useState(true);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailHtml, setEmailHtml] = useState("");
  const [isEmailEditedManually, setIsEmailEditedManually] = useState(false);

  const [addForm] = Form.useForm();
  const [completeForm] = Form.useForm();
  const [docForm] = Form.useForm();

  // Document Generator States
  const [isDocModalVisible, setIsDocModalVisible] = useState(false);
  const [docRecord, setDocRecord] = useState(null);
  const [transferType, setTransferType] = useState(null);
  const [isProbationary, setIsProbationary] = useState(false);
  const [guiderFound, setGuiderFound] = useState(null);
  const [generateGuiderDoc, setGenerateGuiderDoc] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewDocKey, setPreviewDocKey] = useState('mau4'); // Default preview

  // List of official party members for guider selection
  const officialMembers = useMemo(() => {
    return activeMembers.filter(m => 
      m.ho_ten && 
      (m.loai_dang_vien === 'Chính thức' || m.dang_vien_du_bi === false)
    ).sort((a, b) => a.ho_ten.localeCompare(b.ho_ten));
  }, [activeMembers]);

  const fetchActiveMembersAndProcesses = async () => {
    setLoading(true);
    try {
      const dvSnapshot = await getDocs(collection(db, "dang_vien"));
      const allMembersList = dvSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActiveMembers(allMembersList);

      const csSnapshot = await getDocs(collection(db, "chuyen_sinh_hoat"));
      const activeTransfers = csSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(t => t.status === 'processing');

      // Fetch pending registrations
      const dkSnapshot = await getDocs(collection(db, "dangky_chuyen_sinh_hoat"));
      const pendingRegs = dkSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(t => t.trang_thai === 'cho_duyet');
      setPendingRegistrations(pendingRegs);

      const merged = activeTransfers.map(transfer => {
        const member = allMembersList.find(m => m.id === transfer.dang_vien_id) || {};
        return {
          ...member,
          ...transfer,
          ho_ten: member.ho_ten || 'N/A',
          mssv: member.mssv || 'N/A',
          lop: member.lop || 'N/A',
          khoa: member.khoa || 'N/A',
          dang_vien_du_bi: member.dang_vien_du_bi || false,
          loai_chuyen: transfer.loai_chuyen || 'chuyen_ra'
        };
      });

      setActiveProcesses(merged);
      setSelectedRowKeys([]);
    } catch (error) {
      console.error("Lỗi khi tải tiến trình chuyển đi:", error);
      message.error("Lỗi khi tải dữ liệu chuyển sinh hoạt");
    } finally {
      setLoading(false);
    }
  };

  // Determine list of documents based on selected values in Modal
  const docModalDocumentList = useMemo(() => {
    if (!docRecord || !transferType) return [];

    const list = [];
    if (transferType === 'chuyen_ra') {
      list.push({ key: 'mau1', label: '1. Mẫu 1. Đơn xin chuyển sinh hoạt Đảng (chính thức)', code: 'Mẫu 1' });
      if (isProbationary) {
        list.push({ key: 'mau3', label: '2. Mẫu 3. Bản nhận xét Đảng viên dự bị của Đoàn Thanh niên', code: 'Mẫu 3' });
      }
    } else {
      list.push({ key: 'mau2', label: '1. Mẫu 2. Đơn xin chuyển sinh hoạt Đảng tạm thời', code: 'Mẫu 2' });
    }
    
    list.push({ 
      key: 'mau4', 
      label: `${transferType === 'chuyen_ra' ? (isProbationary ? '3' : '2') : '2'}. Mẫu 4. Bản tự kiểm điểm chuyển sinh hoạt Đảng`, 
      code: 'Mẫu 4' 
    });

    if (isProbationary && generateGuiderDoc) {
      list.push({ key: 'mau5', label: '4. Mẫu 5. Bản nhận xét Đảng viên dự bị của ĐVHD', code: 'Mẫu 5' });
    }

    return list;
  }, [docRecord, transferType, isProbationary, generateGuiderDoc]);

  const handleOpenDocModal = (record) => {
    setDocRecord(record);
    const isReserve = record.dang_vien_du_bi === true || record.loai_dang_vien === 'Dự bị' || record.loai_dang_vien === 'dubi';
    setIsProbationary(isReserve);
    
    const defaultType = record.loai_chuyen === 'chuyen_tam_thoi' ? 'chuyen_tam_thoi' : 'chuyen_ra';
    setTransferType(defaultType);
    setGenerateGuiderDoc(isReserve); // Enable by default for reserve members

    // Set initial form fields
    const defaultUuDiem = record.uu_diem || 
      "- Có phẩm chất chính trị tốt lập trường tư tưởng vững vàng, tuyệt đối trung thành với đường lối của Đảng, tác phong đứng đắn, mẫu mực.\n" +
      "- Có lối sống đạo đức trong sáng, giản dị, luôn có ý thức tu dưỡng và rèn luyện đạo đức, luôn là tấm gương sáng cho các thế hệ noi theo.\n" +
      "- Có năng lực công tác tốt, luôn tích cực tham gia các hoạt động của chi Đoàn, khoa, Đoàn trường.\n" +
      "- Tính tình vui vẻ, hòa đồng, luôn giúp đỡ mọi người.\n" +
      "- Luôn có thái độ cầu thị trong việc nhìn nhận, sửa chữa, khắc phục khuyết điểm.";

    const defaultKhuyetDiem = record.khuyet_diem || "Không có khuyết điểm gì lớn";

    const defaultReason = defaultType === 'chuyen_ra'
      ? "Tôi đã hoàn thành chương trình học và đã tốt nghiệp ra trường. Cần chuyển đến tổ chức Đảng mới để tiếp tục hoàn thành nhiệm vụ Đảng viên."
      : "Tôi hiện đang đi thực tập ở quê nên cần phải chuyển sinh hoạt tạm thời về quê để đảm bảo sinh hoạt Đảng đầy đủ, đúng quy định.";

    docForm.setFieldsValue({
      loai_chuyen_sh: defaultType,
      ho_ten: record.ho_ten,
      mssv: record.mssv,
      lop: record.lop || '',
      khoa: record.khoa || '',
      gioi_tinh: record.gioi_tinh || 'Nam',
      ngay_sinh: safeDate(record.ngay_sinh),
      ngay_vao_dang: safeDate(record.ngay_vao_dang),
      ngay_chinh_thuc: safeDate(record.ngay_chinh_thuc),
      que_quan: record.que_quan || record.tinh_tp_qq || '',
      dia_chi: record.chi_tiet_dc || record.tinh_tp_tt || record.dia_chi_thuong_tru || '',
      so_the_dang: record.so_the_dang || record.so_quyet_dinh_dvct || record.so_qd || '',
      so_dien_thoai: record.so_dien_thoai || record.sdt || '',
      nhiem_vu_dang: record.nhiem_vu_dang || 'Đảng viên',
      noi_chuyen_den: record.noi_chuyen_den || '',
      ly_do_chuyen: defaultReason,
      uu_diem: defaultUuDiem,
      khuyet_diem: defaultKhuyetDiem,
      dvhd_id: null,
      dvhd: record.dvhd || '',
      dvhd_ngay_sinh: null,
      dvhd_ngay_vao_dang: null,
      dvhd_ngay_chinh_thuc: null,
      tinh_tp: 'Đà Nẵng',
      ngay_ky: dayjs(),
      ngay_phan_cong: dayjs()
    });

    setGuiderFound(null);

    // Look up guider profile in official members
    if (isReserve && record.dvhd) {
      const guider = activeMembers.find(m => 
        m.ho_ten && m.ho_ten.trim().toLowerCase() === record.dvhd.trim().toLowerCase() && 
        (m.loai_dang_vien === "Chính thức" || m.dang_vien_du_bi === false)
      );
      if (guider) {
        docForm.setFieldsValue({
          dvhd_id: guider.id,
          dvhd_ngay_sinh: safeDate(guider.ngay_sinh),
          dvhd_ngay_vao_dang: safeDate(guider.ngay_vao_dang),
          dvhd_ngay_chinh_thuc: safeDate(guider.ngay_chinh_thuc),
        });
        setGuiderFound('found');
      } else {
        setGuiderFound('not_found');
      }
    }

    setIsDocModalVisible(true);
  };

  const handleDocTransferTypeChange = (type) => {
    setTransferType(type);
    docForm.setFieldsValue({
      loai_chuyen_sh: type
    });
    docForm.validateFields(['loai_chuyen_sh']);
    
    // Set default reason
    if (type === 'chuyen_ra') {
      docForm.setFieldsValue({
        ly_do_chuyen: "Tôi đã hoàn thành chương trình học và đã tốt nghiệp ra trường. Cần chuyển đến tổ chức Đảng mới để tiếp tục hoàn thành nhiệm vụ Đảng viên."
      });
    } else {
      docForm.setFieldsValue({
        ly_do_chuyen: "Tôi hiện đang đi thực tập ở quê nên cần phải chuyển sinh hoạt tạm thời về quê để đảm bảo sinh hoạt Đảng đầy đủ, đúng quy định."
      });
    }
  };

  const handleDocGuiderSelect = (guiderId) => {
    const guider = activeMembers.find(m => m.id === guiderId);
    if (!guider) return;

    docForm.setFieldsValue({
      dvhd: guider.ho_ten,
      dvhd_ngay_sinh: safeDate(guider.ngay_sinh),
      dvhd_ngay_vao_dang: safeDate(guider.ngay_vao_dang),
      dvhd_ngay_chinh_thuc: safeDate(guider.ngay_chinh_thuc),
    });
    setGuiderFound('found');
  };

  const getFormattedDocData = async () => {
    await docForm.validateFields();
    const values = docForm.getFieldsValue();
    
    return {
      ...docRecord,
      ...values,
      ho_ten: values.ho_ten || docRecord.ho_ten || '',
      mssv: values.mssv || docRecord.mssv || '',
      gioi_tinh: values.gioi_tinh || docRecord.gioi_tinh || 'Nam',
      lop: values.lop || docRecord.lop || '',
      khoa: values.khoa || docRecord.khoa || '',
      que_quan: values.que_quan || docRecord.que_quan || '',
      dia_chi: values.dia_chi || docRecord.chi_tiet_dc || docRecord.dia_chi_thuong_tru || '',
      so_the_dang: values.so_the_dang || docRecord.so_the_dang || '',
      so_dien_thoai: values.so_dien_thoai || docRecord.so_dien_thoai || '',
      nhiem_vu_dang: values.nhiem_vu_dang || docRecord.nhiem_vu_dang || 'Đảng viên',
      dvhd: values.dvhd || docRecord.dvhd || '',
      noi_chuyen_den: values.noi_chuyen_den || docRecord.noi_chuyen_den || '',
      uu_diem: values.uu_diem || docRecord.uu_diem || '',
      khuyet_diem: values.khuyet_diem || docRecord.khuyet_diem || '',
      loai_chuyen_sh: values.loai_chuyen_sh || docRecord.loai_chuyen || 'chuyen_ra',
      dang_vien_du_bi: docRecord.dang_vien_du_bi || false,
      loai_dang_vien: docRecord.loai_dang_vien || '',
      tinh_tp: values.tinh_tp || 'Đà Nẵng',
      // Override all date fields with formatted strings to prevent Timestamp objects
      ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : '',
      ngay_vao_dang: values.ngay_vao_dang ? values.ngay_vao_dang.format('YYYY-MM-DD') : '',
      ngay_chinh_thuc: values.ngay_chinh_thuc ? values.ngay_chinh_thuc.format('YYYY-MM-DD') : '',
      ngay_ky: values.ngay_ky ? values.ngay_ky.format('YYYY-MM-DD') : '',
      ngay_phan_cong: values.ngay_phan_cong ? values.ngay_phan_cong.format('YYYY-MM-DD') : '',
      dvhd_ngay_sinh: values.dvhd_ngay_sinh ? values.dvhd_ngay_sinh.format('YYYY-MM-DD') : '',
      dvhd_ngay_vao_dang: values.dvhd_ngay_vao_dang ? values.dvhd_ngay_vao_dang.format('YYYY-MM-DD') : '',
      dvhd_ngay_chinh_thuc: values.dvhd_ngay_chinh_thuc ? values.dvhd_ngay_chinh_thuc.format('YYYY-MM-DD') : '',
    };
  };

  const saveDocModalData = async () => {
    if (!docRecord) return null;
    try {
      await docForm.validateFields();
      const values = docForm.getFieldsValue();
      
      const isReserve = docRecord.dang_vien_du_bi === true || docRecord.loai_dang_vien === 'Dự bị' || docRecord.loai_dang_vien === 'dubi';

      // 1. Update dang_vien collection
      const memberRef = doc(db, "dang_vien", docRecord.dang_vien_id || docRecord.id);
      const memberUpdateData = {
        gioi_tinh: values.gioi_tinh || 'Nam',
        lop: values.lop || '',
        khoa: values.khoa || '',
        ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : '',
        so_dien_thoai: values.so_dien_thoai || '',
        que_quan: values.que_quan || '',
        dia_chi_thuong_tru: values.dia_chi || '',
        nhiem_vu_dang: values.nhiem_vu_dang || 'Đảng viên',
        uu_diem: values.uu_diem || '',
        khuyet_diem: values.khuyet_diem || '',
        updated_at: new Date().toISOString()
      };

      if (values.so_the_dang) memberUpdateData.so_the_dang = values.so_the_dang;
      if (values.ngay_vao_dang) memberUpdateData.ngay_vao_dang = values.ngay_vao_dang.format('YYYY-MM-DD');
      if (values.ngay_chinh_thuc && !isReserve) memberUpdateData.ngay_chinh_thuc = values.ngay_chinh_thuc.format('YYYY-MM-DD');
      if (values.dvhd) memberUpdateData.dvhd = values.dvhd;
      if (values.dvhd_ngay_sinh) memberUpdateData.dvhd_ngay_sinh = values.dvhd_ngay_sinh.format('YYYY-MM-DD');
      if (values.dvhd_ngay_vao_dang) memberUpdateData.dvhd_ngay_vao_dang = values.dvhd_ngay_vao_dang.format('YYYY-MM-DD');
      if (values.dvhd_ngay_chinh_thuc) memberUpdateData.dvhd_ngay_chinh_thuc = values.dvhd_ngay_chinh_thuc.format('YYYY-MM-DD');
      if (values.ngay_phan_cong) memberUpdateData.ngay_phan_cong = values.ngay_phan_cong.format('YYYY-MM-DD');

      await updateDoc(memberRef, memberUpdateData);

      // 2. Update chuyen_sinh_hoat collection
      const transferRef = doc(db, "chuyen_sinh_hoat", docRecord.id);
      const transferUpdateData = {
        ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : '',
        lop: values.lop || '',
        khoa: values.khoa || '',
        so_dien_thoai: values.so_dien_thoai || '',
        noi_thuong_tru: values.dia_chi || '',
        noi_chuyen_den: values.noi_chuyen_den || '',
        ly_do_chuyen: values.ly_do_chuyen || '',
        loai_chuyen: values.loai_chuyen_sh || 'chuyen_ra',
        ghi_chu: values.ghi_chu || '',
        updated_at: new Date().toISOString()
      };
      
      await updateDoc(transferRef, transferUpdateData);

      message.success("Đã lưu thông tin hồ sơ chuyển đi thành công!");
      await fetchActiveMembersAndProcesses();
      
      return {
        ...docRecord,
        ...values,
        ho_ten: values.ho_ten || docRecord.ho_ten || '',
        mssv: values.mssv || docRecord.mssv || '',
        gioi_tinh: values.gioi_tinh || docRecord.gioi_tinh || 'Nam',
        lop: values.lop || docRecord.lop || '',
        khoa: values.khoa || docRecord.khoa || '',
        que_quan: values.que_quan || docRecord.que_quan || '',
        dia_chi: values.dia_chi || docRecord.chi_tiet_dc || docRecord.dia_chi_thuong_tru || '',
        so_the_dang: values.so_the_dang || docRecord.so_the_dang || '',
        so_dien_thoai: values.so_dien_thoai || docRecord.so_dien_thoai || '',
        nhiem_vu_dang: values.nhiem_vu_dang || docRecord.nhiem_vu_dang || 'Đảng viên',
        noi_chuyen_den: values.noi_chuyen_den || docRecord.noi_chuyen_den || '',
        dvhd: values.dvhd || docRecord.dvhd || '',
        uu_diem: values.uu_diem || docRecord.uu_diem || '',
        khuyet_diem: values.khuyet_diem || docRecord.khuyet_diem || '',
        loai_chuyen_sh: values.loai_chuyen_sh || docRecord.loai_chuyen || 'chuyen_ra',
        ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : '',
        ngay_vao_dang: values.ngay_vao_dang ? values.ngay_vao_dang.format('YYYY-MM-DD') : '',
        ngay_chinh_thuc: values.ngay_chinh_thuc ? values.ngay_chinh_thuc.format('YYYY-MM-DD') : '',
        ngay_ky: values.ngay_ky ? values.ngay_ky.format('YYYY-MM-DD') : '',
        ngay_phan_cong: values.ngay_phan_cong ? values.ngay_phan_cong.format('YYYY-MM-DD') : '',
        dvhd_ngay_sinh: values.dvhd_ngay_sinh ? values.dvhd_ngay_sinh.format('YYYY-MM-DD') : '',
        dvhd_ngay_vao_dang: values.dvhd_ngay_vao_dang ? values.dvhd_ngay_vao_dang.format('YYYY-MM-DD') : '',
        dvhd_ngay_chinh_thuc: values.dvhd_ngay_chinh_thuc ? values.dvhd_ngay_chinh_thuc.format('YYYY-MM-DD') : '',
        dang_vien_du_bi: isReserve,
        tinh_tp: values.tinh_tp || 'Đà Nẵng'
      };
    } catch (e) {
      console.error(e);
      if (e.errorFields) {
        message.error("Vui lòng điền đầy đủ các thông tin bắt buộc trước khi lưu!");
      } else {
        message.error("Lỗi khi lưu thông tin: " + e.message);
      }
      return null;
    }
  };

  const downloadDocModalSingleDoc = async (key) => {
    setGenerating(true);
    try {
      const data = await saveDocModalData();
      if (!data) return;

      switch (key) {
        case 'mau1':
          await docGeneratorService.generateDonXinChuyenDang(data);
          break;
        case 'mau2':
          await docGeneratorService.generateDonXinChuyenDangTamThoi(data);
          break;
        case 'mau3':
          await docGeneratorService.generateNhanXetDangVienDuBiDTN(data);
          break;
        case 'mau5':
          await docGeneratorService.generateNhanXetDangVienDuBiDVHD(data);
          break;
        case 'mau4':
          await docGeneratorService.generateKiemDiemChuyenDang(data);
          break;
        default:
          message.error("Biểu mẫu không tồn tại");
      }
      message.success("Tải xuống biểu mẫu thành công!");
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi tạo biểu mẫu: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadDocModalAllAsZip = async () => {
    setGenerating(true);
    try {
      const data = await saveDocModalData();
      if (!data) return;

      const docKeys = docModalDocumentList.map(doc => doc.key);
      await docGeneratorService.generateTransferDocumentsZip(data, docKeys);
      message.success("Xuất trọn bộ hồ sơ chuyển sinh hoạt thành công!");
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi xuất bộ hồ sơ ZIP: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchActiveMembersAndProcesses();
  }, []);

  // === 3-STEP TRANSFER-OUT ACTIONS ===
  
  const handleAddTransferSubmit = async () => {
    try {
      const values = await addForm.validateFields();
      setSubmittingAdd(true);
      
      const member = activeMembers.find(m => m.id === values.dang_vien_select);
      if (!member) {
        message.error("Đảng viên không tồn tại trong danh sách!");
        return;
      }
      
      const isReserve = member.loai_dang_vien === "Dự bị" || member.dang_vien_du_bi === true || member.loai_dang_vien === "dubi";
      const fullAddressStr = values.dia_chi || '';
      
      const newRecord = {
        dang_vien_id: member.id,
        mssv: values.mssv || member.mssv || '',
        cccd: member.cccd || '',
        ho_ten: member.ho_ten || '',
        ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : (member.ngay_sinh || ''),
        nhom: member.nhom || '',
        so_dien_thoai: values.so_dien_thoai || member.so_dien_thoai || '',
        email: member.email || member.email_sv || '',
        facebook: member.facebook || '',
        noi_thuong_tru: fullAddressStr,
        noi_tam_tru: member.dia_chi_tam_tru || '',
        sdt_nguoi_than: member.sdt_nguoi_than || '',
        ho_ten_nguoi_than: member.ho_ten_nguoi_than || '',
        ngay_nop_ho_so: values.ngay_ky ? values.ngay_ky.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
        buoc: 1,
        loai_chuyen: values.loai_chuyen_sh || 'chuyen_ra',
        ghi_chu: values.ly_do_chuyen || '',
        status: 'processing',
        created_at: new Date().toISOString(),
        history: [{
          step: 1,
          time: new Date().toISOString(),
          note: "Khởi tạo tiến trình chuyển sinh hoạt",
          updated_by: currentUser?.email || currentUser?.username || "Admin"
        }]
      };

      await addDoc(collection(db, "chuyen_sinh_hoat"), newRecord);
      
      // Update Dang Vien profile with new info
      const memberUpdateData = {
        gioi_tinh: values.gioi_tinh || 'Nam',
        lop: values.lop || '',
        khoa: values.khoa || '',
        ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : '',
        so_dien_thoai: values.so_dien_thoai || '',
        que_quan: values.que_quan || '',
        dia_chi_thuong_tru: values.dia_chi || '',
        nhiem_vu_dang: values.nhiem_vu_dang || 'Đảng viên',
        uu_diem: values.uu_diem || '',
        khuyet_diem: values.khuyet_diem || '',
        updated_at: new Date().toISOString()
      };
      if (values.so_the_dang) memberUpdateData.so_the_dang = values.so_the_dang;
      if (values.ngay_vao_dang) memberUpdateData.ngay_vao_dang = values.ngay_vao_dang.format('YYYY-MM-DD');
      if (values.ngay_chinh_thuc && !isReserve) memberUpdateData.ngay_chinh_thuc = values.ngay_chinh_thuc.format('YYYY-MM-DD');
      
      await updateDoc(doc(db, "dang_vien", member.id), memberUpdateData);

      // 3. Update registration request if exists
      if (values._registrationId) {
        await updateDoc(doc(db, "dangky_chuyen_sinh_hoat", values._registrationId), {
          trang_thai: 'da_duyet',
          updated_at: new Date().toISOString()
        });
      }

      // Offer to generate docs
      Modal.confirm({
        title: 'Thành công',
        content: `Đã thêm ${member.ho_ten} vào quy trình. Bạn có muốn tải biểu mẫu hồ sơ ngay bây giờ không?`,
        okText: 'Tải ngay (ZIP)',
        cancelText: 'Đóng',
        onOk: async () => {
          try {
             // We reuse docForm logic or direct docGeneratorService
             const docData = {
                ...values,
                ho_ten: member.ho_ten,
                gioi_tinh: values.gioi_tinh || 'Nam',
                ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : '',
                ngay_vao_dang: values.ngay_vao_dang ? values.ngay_vao_dang.format('YYYY-MM-DD') : '',
                ngay_chinh_thuc: values.ngay_chinh_thuc ? values.ngay_chinh_thuc.format('YYYY-MM-DD') : '',
                ngay_ky: values.ngay_ky ? values.ngay_ky.format('YYYY-MM-DD') : '',
                ngay_phan_cong: values.ngay_phan_cong ? values.ngay_phan_cong.format('YYYY-MM-DD') : '',
                dvhd_ngay_sinh: values.dvhd_ngay_sinh ? values.dvhd_ngay_sinh.format('YYYY-MM-DD') : '',
                dvhd_ngay_vao_dang: values.dvhd_ngay_vao_dang ? values.dvhd_ngay_vao_dang.format('YYYY-MM-DD') : '',
                dvhd_ngay_chinh_thuc: values.dvhd_ngay_chinh_thuc ? values.dvhd_ngay_chinh_thuc.format('YYYY-MM-DD') : '',
             };
             
             const list = [];
             if (values.loai_chuyen_sh === 'chuyen_ra') {
               list.push('mau1');
               if (isReserve) list.push('mau3');
             } else {
               list.push('mau2');
             }
             list.push('mau4');
             if (isReserve && values.dvhd_ngay_sinh) list.push('mau5'); // Simple check

             await docGeneratorService.generateTransferDocumentsZip(docData, list);
             message.success("Đã tải biểu mẫu ZIP!");
          } catch(e) {
             message.error("Lỗi khi tải ZIP: " + e.message);
          }
        }
      });

      setIsAddModalVisible(false);
      addForm.resetFields();
      await fetchActiveMembersAndProcesses();
    } catch (e) {
      console.error("Lỗi khi thêm hồ sơ chuyển ra:", e);
      if (!e.errorFields) message.error("Lỗi khi thêm hồ sơ chuyển ra: " + e.message);
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleAdvanceStep = (record) => {
    setTransitioningRecord(record);
    setStepNote('');
    setIsStepModalVisible(true);
  };

  const submitAdvanceStep = async () => {
    if (!transitioningRecord) return;
    setStepLoading(true);
    try {
      const record = transitioningRecord;
      const nextBuoc = record.buoc + 1;
      
      const newHistory = [...(record.history || []), {
        step: nextBuoc,
        time: new Date().toISOString(),
        note: stepNote || "",
        updated_by: currentUser?.email || currentUser?.username || "Admin"
      }];

      const updateFields = {
        buoc: nextBuoc,
        history: newHistory,
        updated_at: new Date().toISOString()
      };

      if (nextBuoc === 2) {
        updateFields.ngay_hoan_thien_gui_vpdu = new Date().toISOString().split('T')[0];
      } else if (nextBuoc === 3) {
        updateFields.ngay_gui_dhdn = new Date().toISOString().split('T')[0];
      }

      await updateDoc(doc(db, "chuyen_sinh_hoat", record.id), updateFields);
      message.success(`Đã chuyển hồ sơ của đồng chí ${record.ho_ten} sang Bước ${nextBuoc}!`);
      setIsStepModalVisible(false);
      setTransitioningRecord(null);
      setStepNote('');
      await fetchActiveMembersAndProcesses();
    } catch (e) {
      console.error("Lỗi khi chuyển bước:", e);
      message.error("Lỗi khi chuyển bước: " + e.message);
    } finally {
      setStepLoading(false);
    }
  };

  const handleCompleteTransferSubmit = async () => {
    if (!selectedProcessForCompletion) return;
    try {
      const values = await completeForm.validateFields();
      setSubmittingComplete(true);
      
      const record = selectedProcessForCompletion;
      const isTamThoi = record.loai_chuyen === 'chuyen_tam_thoi';

      if (isTamThoi) {
        const ngayChuyenStr = values.ngay_chuyen_tam_thoi.format('YYYY-MM-DD');
        const thoiGianVeStr = values.thoi_gian_ve;
        const noiChuyenStr = values.noi_chuyen_den_tam_thoi;
        const ghiChuStr = values.ghi_chu || '';

        const newHistory = [...(record.history || []), {
          step: 4,
          time: new Date().toISOString(),
          note: ghiChuStr || "Hoàn tất thủ tục sinh hoạt tạm thời",
          updated_by: currentUser?.email || currentUser?.username || "Admin"
        }];

        // 1. Complete process record in chuyen_sinh_hoat
        await updateDoc(doc(db, "chuyen_sinh_hoat", record.id), {
          status: 'completed',
          buoc: 3,
          history: newHistory,
          ngay_chuyen: ngayChuyenStr,
          thoi_gian_ve: thoiGianVeStr,
          noi_chuyen: noiChuyenStr,
          ghi_chu: ghiChuStr,
          completed_at: new Date().toISOString()
        });

        // 2. Set temporary state of member to 'dang_di' in dang_vien
        await updateDoc(doc(db, "dang_vien", record.dang_vien_id), {
          trang_thai_tam_thoi: 'dang_di',
          updated_at: new Date().toISOString()
        });

        // 3. Create a record in chuyen_tam_thoi collection to display in ChuyenTamThoi.jsx
        const newTempRecord = {
          dang_vien_id: record.dang_vien_id,
          mssv: record.mssv || '',
          ho_ten: record.ho_ten || '',
          lop: record.lop || '',
          khoa: record.khoa || '',
          ngay_chuyen_tam_thoi: ngayChuyenStr,
          thoi_gian_ve: thoiGianVeStr,
          noi_chuyen_den_tam_thoi: noiChuyenStr,
          trang_thai: 'dang_di',
          ghi_chu: ghiChuStr,
          created_at: new Date().toISOString()
        };
        await addDoc(collection(db, "chuyen_tam_thoi"), newTempRecord);

        // Send Email for Temporary Transfer
        const to = record.email || '';
        if (sendEmailChecked && to) {
          try {
            await fetch(`${API_BASE_URL}/api/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to,
                subject: emailSubject,
                html: emailHtml
              })
            });
            message.success("Đã gửi email thông báo hoàn tất thủ tục chuyển sinh hoạt tạm thời!");
          } catch (emailErr) {
            console.warn("Không gửi được email:", emailErr);
            message.warning("Đã hoàn tất chuyển tạm thời nhưng gửi email thông báo thất bại!");
          }
        }

        message.success(`Đã hoàn tất chuyển sinh hoạt tạm thời cho đồng chí ${record.ho_ten} thành công!`);

      } else {
        const ngayChuyenStr = values.ngay_chuyen_ra.format('YYYY-MM-DD');
        const noiChuyenStr = values.noi_chuyen_ra;
        const ghiChuStr = values.ghi_chu || '';

        const newHistory = [...(record.history || []), {
          step: 4,
          time: new Date().toISOString(),
          note: ghiChuStr || "Hoàn tất thủ tục chuyển đi chính thức",
          updated_by: currentUser?.email || currentUser?.username || "Admin"
        }];

        // 1. Complete workflow process record in chuyen_sinh_hoat
        await updateDoc(doc(db, "chuyen_sinh_hoat", record.id), {
          status: 'completed',
          buoc: 3,
          history: newHistory,
          ngay_chuyen: ngayChuyenStr,
          noi_chuyen: noiChuyenStr,
          ghi_chu: ghiChuStr,
          completed_at: new Date().toISOString()
        });

        // 2. Set permanent state of member to 'da_chuyen' in dang_vien
        await updateDoc(doc(db, "dang_vien", record.dang_vien_id), {
          trang_thai: 'da_chuyen',
          ngay_chuyen_ra: ngayChuyenStr,
          noi_chuyen_ra: noiChuyenStr,
          ghi_chu_chuyen: ghiChuStr,
          updated_at: new Date().toISOString()
        });

        // Send Email for Permanent Transfer
        const to = record.email || '';
        if (sendEmailChecked && to) {
          try {
            await fetch(`${API_BASE_URL}/api/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to,
                subject: emailSubject,
                html: emailHtml
              })
            });
            message.success("Đã gửi email thông báo hoàn tất thủ tục chuyển sinh hoạt đảng chính thức!");
          } catch (emailErr) {
            console.warn("Không gửi được email:", emailErr);
            message.warning("Đã hoàn tất chuyển đi nhưng gửi email thông báo thất bại!");
          }
        }

        message.success(`Đã hoàn tất chuyển sinh hoạt và chuyển Đảng viên ${record.ho_ten} sang mục Đã chuyển ra thành công!`);
      }

      setIsCompleteModalVisible(false);
      setSelectedProcessForCompletion(null);
      completeForm.resetFields();
      await fetchActiveMembersAndProcesses();
    } catch (e) {
      console.error("Lỗi khi hoàn tất chuyển đi:", e);
      if (!e.errorFields) message.error("Lỗi khi hoàn tất chuyển đi: " + e.message);
    } finally {
      setSubmittingComplete(false);
    }
  };

  const handleCancelProcess = async (id) => {
    try {
      await deleteDoc(doc(db, "chuyen_sinh_hoat", id));
      message.success("Đã hủy quy trình chuyển sinh hoạt đảng thành công!");
      await fetchActiveMembersAndProcesses();
    } catch (e) {
      console.error("Lỗi khi hủy quy trình:", e);
      message.error("Lỗi khi hủy quy trình: " + e.message);
    }
  };

  const handleRowClick = (record) => {
    const memberId = record.dang_vien_id || record.id;
    const memberObj = activeMembers.find(m => m.id === memberId) || record;
    setSelectedRecord(memberObj);
    setIsDrawerVisible(true);
  };

  // Filtered processes to enable rich searching
  const uniqueIntakes = useMemo(() => {
    const intakes = activeProcesses.map(item => {
      const lop = item.lop || "";
      const match = lop.match(/^(\d+K)/) || lop.match(/^(\d+)/);
      return match ? match[1] : null;
    }).filter(Boolean);
    return [...new Set(intakes)].sort();
  }, [activeProcesses]);

  const filteredProcesses = useMemo(() => {
    return activeProcesses.filter(item => {
      const matchSearch = item.mssv?.toLowerCase().includes(searchText.toLowerCase()) || 
                          item.ho_ten?.toLowerCase().includes(searchText.toLowerCase());
      const matchStep = filterStep ? item.buoc === filterStep : true;
      const matchNhom = filterNhom ? item.nhom === filterNhom : true;
      const matchLoai = filterLoaiChuyen ? item.loai_chuyen === filterLoaiChuyen : true;
      if (filterIntake) {
        const lop = item.lop || "";
        const match = lop.match(/^(\d+K)/) || lop.match(/^(\d+)/);
        const intake = match ? match[1] : null;
        if (intake !== filterIntake) return false;
      }
      return matchSearch && matchStep && matchNhom && matchLoai;
    });
  }, [activeProcesses, searchText, filterStep, filterNhom, filterLoaiChuyen, filterIntake]);

  const availableMembers = useMemo(() => {
    const processingIds = activeProcesses.map(p => p.dang_vien_id);
    return activeMembers.filter(m => m.trang_thai !== 'da_chuyen' && !processingIds.includes(m.id));
  }, [activeMembers, activeProcesses]);

  const uniqueNhom = useMemo(() => {
    return [...new Set(activeProcesses.map(d => d.nhom).filter(Boolean))].sort();
  }, [activeProcesses]);

  const resetFilters = () => {
    setSearchText("");
    setFilterStep(null);
    setFilterNhom(null);
    setFilterLoaiChuyen(null);
    setFilterIntake(null);
  };

  // === EXCEL EXPORT ===
  const handleOpenExportModal = () => {
    setSelectedExportFields(EXPORT_FIELDS.map(f => f.key));
    setExportRange(selectedRowKeys.length > 0 ? 'selected' : 'filtered');
    setIsExportModalVisible(true);
  };

  const exportExcel = () => {
    let dataToExport = [];
    if (exportRange === 'selected') {
      dataToExport = activeProcesses.filter(item => selectedRowKeys.includes(item.id));
    } else if (exportRange === 'all') {
      dataToExport = activeProcesses;
    } else {
      dataToExport = filteredProcesses;
    }

    if (dataToExport.length === 0) {
      message.warning("Không có dữ liệu để xuất!");
      return;
    }

    const mappedData = dataToExport.map(item => {
      const row = {};
      EXPORT_FIELDS.forEach(field => {
        if (selectedExportFields.includes(field.key)) {
          if (field.isDate) {
            row[field.label] = item[field.key] ? dayjs(item[field.key]).format('DD/MM/YYYY') : '';
          } else if (field.isSpecial === 'buoc') {
            row[field.label] = item.buoc === 1 ? 'Bước 1: Đã nộp hồ sơ' :
                               item.buoc === 2 ? 'Bước 2: Gửi Văn phòng Đảng ủy' :
                               item.buoc === 3 ? 'Bước 3: Gửi Đại học Đà Nẵng' : 'Chưa rõ';
          } else {
            let val = item[field.key];
            if (field.key === 'so_dien_thoai') {
              val = item.so_dien_thoai || item.sdt;
            } else if (field.key === 'email') {
              val = item.email || item.email_sv;
            } else if (field.key === 'noi_thuong_tru') {
              val = item.noi_thuong_tru || [item.chi_tiet_dc || item.chi_tiet_dc_cu, item.xa_phuong_tt || item.xa_phuong_tt_cu, item.tinh_tp_tt || item.tinh_tp_tt_cu].filter(Boolean).join(', ');
            } else if (field.key === 'noi_tam_tru') {
              val = item.noi_tam_tru || item.dia_chi_tam_tru;
            } else if (field.key === 'sdt_nguoi_than') {
              val = item.sdt_nguoi_than || item.so_dien_thoai_nguoi_than;
            } else if (field.key === 'ho_ten_nguoi_than') {
              val = item.ho_ten_nguoi_than || item.ten_nguoi_than;
            }
            row[field.label] = val || "";
          }
        }
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(mappedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HoSoChuyenRa");
    XLSX.writeFile(wb, `DanhSachQuyTrinhChuyenRa_${dayjs().format('YYYYMMDD')}.xlsx`);
    
    setIsExportModalVisible(false);
    message.success(`Xuất Excel thành công ${dataToExport.length} dòng!`);
  };

  // === EXCEL IMPORT ===
  const handleDownloadTemplate = () => {
    const templateData = [
      { "MSSV": "1811223344", "Ngày nộp hồ sơ (DD/MM/YYYY)": "28/05/2026", "Bước hiện tại (1, 2 hoặc 3)": 1, "Loại chuyển (chuyen_ra hoặc chuyen_tam_thoi)": "chuyen_ra" },
      { "MSSV": "1811225566", "Ngày nộp hồ sơ (DD/MM/YYYY)": "28/05/2026", "Bước hiện tại (1, 2 hoặc 3)": 2, "Loại chuyển (chuyen_ra hoặc chuyen_tam_thoi)": "chuyen_tam_thoi" }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mau_HoSoChuyenRa");
    XLSX.writeFile(wb, "Mau_Ho_So_Chuyen_Ra.xlsx");
    message.success("Đã tải tệp mẫu Excel thành công!");
  };

  const handleImportExcel = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataBytes = new Uint8Array(e.target.result);
        const workbook = XLSX.read(dataBytes, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          message.warning("Tệp Excel không có dữ liệu!");
          return;
        }

        setIsValidating(true);

        const results = jsonData.map((row, idx) => {
          const getVal = (possibleKeys) => {
            const key = Object.keys(row).find(k => possibleKeys.includes(k.trim().toLowerCase()));
            return key ? row[key] : null;
          };

          const rawMssv = getVal(["mssv", "ma so sinh vien", "mã số sinh viên", "ma_so_sinh_vien", "mã sinh viên"]);
          const rawDate = getVal(["ngay nop", "ngay nop ho so", "ngày nộp", "ngày nộp hồ sơ", "ngay_nop_ho_so", "ngay_nop", "ngày nộp hồ sơ (dd/mm/yyyy)"]);
          const rawBuoc = getVal(["buoc", "bước", "buoc hien tai", "bước hiện tại", "buoc_hien_tai", "bước hiện tại (1, 2 hoặc 3)"]);
          const rawLoai = getVal(["loại chuyển", "loại chuyển sinh hoạt", "loại hình", "loai_chuyen", "loai", "loại", "loại chuyển (chuyen_ra hoặc chuyen_tam_thoi)"]);

          const mssvStr = rawMssv ? String(rawMssv).trim() : "";
          let buocNum = rawBuoc ? parseInt(String(rawBuoc).trim()) : 1;
          if (isNaN(buocNum) || buocNum < 1 || buocNum > 3) buocNum = 1;

          const loaiStr = rawLoai ? String(rawLoai).trim().toLowerCase() : "";
          const loaiChuyen = (loaiStr.includes("tạm thời") || loaiStr.includes("tam thoi") || loaiStr.includes("tam_thoi")) ? "chuyen_tam_thoi" : "chuyen_ra";

          let ngayNopStr = dayjs().format('YYYY-MM-DD');
          if (rawDate) {
            if (typeof rawDate === 'number') {
              const dateObj = XLSX.SSF.parse_date_code(rawDate);
              ngayNopStr = dayjs(new Date(dateObj.y, dateObj.m - 1, dateObj.d)).format('YYYY-MM-DD');
            } else {
              const parsed = dayjs(String(rawDate).trim(), ['DD/MM/YYYY', 'YYYY-MM-DD', 'D/M/YYYY', 'YYYY/MM/DD']);
              if (parsed.isValid()) {
                ngayNopStr = parsed.format('YYYY-MM-DD');
              }
            }
          }

          let status = "valid";
          let errorMsg = "";
          let member = null;

          if (!mssvStr) {
            status = "invalid";
            errorMsg = "Không có thông tin MSSV";
          } else {
            member = activeMembers.find(m => String(m.mssv).trim() === mssvStr);
            if (!member) {
              status = "invalid";
              errorMsg = "MSSV không tồn tại trong danh sách Đảng viên";
            } else if (member.trang_thai === 'da_chuyen') {
              status = "transferred";
              errorMsg = "Đảng viên đã chuyển đi chính thức rồi";
            } else {
              const inPipeline = activeProcesses.find(p => p.dang_vien_id === member.id);
              if (inPipeline) {
                status = "duplicate";
                errorMsg = "Đảng viên này đang trong quy trình chuyển đi rồi";
              }
            }
          }

          return {
            key: idx,
            mssv: mssvStr,
            ho_ten: member ? member.ho_ten : "Chưa xác định",
            ngay_nop_ho_so: ngayNopStr,
            buoc: buocNum,
            loai_chuyen: loaiChuyen,
            status,
            errorMsg,
            memberData: member
          };
        });

        setValidationResults(results);
      } catch (err) {
        console.error(err);
        message.error("Lỗi đọc file Excel: " + err.message);
      } finally {
        setIsValidating(false);
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // prevent upload trigger
  };

  const handleConfirmImport = async () => {
    const validRows = validationResults.filter(r => r.status === "valid");
    if (validRows.length === 0) {
      message.warning("Không có bản ghi hợp lệ nào để nhập!");
      return;
    }

    setImporting(true);
    try {
      let successCount = 0;
      await Promise.all(validRows.map(async (row) => {
        const member = row.memberData;
        const fullAddressStr = [member.chi_tiet_dc, member.xa_phuong_tt, member.tinh_tp_tt].filter(Boolean).join(', ');

        const newRecord = {
          dang_vien_id: member.id,
          mssv: member.mssv || '',
          cccd: member.cccd || '',
          ho_ten: member.ho_ten || '',
          ngay_sinh: member.ngay_sinh || '',
          nhom: member.nhom || '',
          so_dien_thoai: member.so_dien_thoai || '',
          email: member.email || member.email_sv || '',
          facebook: member.facebook || '',
          noi_thuong_tru: fullAddressStr || '',
          noi_tam_tru: member.dia_chi_tam_tru || '',
          sdt_nguoi_than: member.sdt_nguoi_than || '',
          ho_ten_nguoi_than: member.ho_ten_nguoi_than || '',
          ngay_nop_ho_so: row.ngay_nop_ho_so,
          buoc: row.buoc,
          loai_chuyen: row.loai_chuyen || 'chuyen_ra',
          status: 'processing',
          created_at: new Date().toISOString()
        };

        await addDoc(collection(db, "chuyen_sinh_hoat"), newRecord);
        successCount++;
      }));

      message.success(`Đã nhập thành công ${successCount} hồ sơ chuyển đi vào quy trình!`);
      setIsImportModalVisible(false);
      setValidationResults([]);
      await fetchActiveMembersAndProcesses();
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi nhập dữ liệu: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const activeProcessColumns = useMemo(() => [
    { 
      title: 'STT', 
      key: 'stt',
      width: 45,
      align: 'center',
      render: (_, __, index) => index + 1
    },
    { 
      title: 'MSSV', 
      dataIndex: 'mssv', 
      key: 'mssv',
      width: 90,
      sorter: (a, b) => (a.mssv || '').localeCompare(b.mssv || ''),
      render: (text) => <Text style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{text}</Text>
    },
    { 
      title: 'Họ tên', 
      dataIndex: 'ho_ten', 
      key: 'ho_ten',
      width: 140,
      sorter: (a, b) => (a.ho_ten || '').localeCompare(b.ho_ten || ''),
      render: (text, record) => (
        <span 
          style={{ color: '#1890ff', cursor: 'pointer', fontWeight: 600, transition: 'color 0.15s', whiteSpace: 'nowrap' }} 
          onClick={() => handleRowClick(record)}
          className="hover-underline"
        >
          {text}
        </span>
      )
    },
    { 
      title: 'Lớp / Nhóm', 
      key: 'info',
      width: 150,
      render: (_, record) => (
        <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
          <div style={{ fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>{record.lop || '--'} ({record.khoa || '--'})</div>
          <div style={{ color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap' }}>Nhóm: {record.nhom || '--'}</div>
        </div>
      )
    },
    { 
      title: 'Loại', 
      dataIndex: 'loai_chuyen', 
      key: 'loai_chuyen',
      width: 90,
      sorter: (a, b) => (a.loai_chuyen || '').localeCompare(b.loai_chuyen || ''),
      render: (type) => {
        let color = 'red';
        let label = 'Chính thức';
        if (type === 'chuyen_tam_thoi') {
          color = 'orange';
          label = 'Tạm thời';
        } else if (type === 'chuyen_du_bi') {
          color = 'gold';
          label = 'Dự bị';
        }
        return (
          <Tag color={color} style={{ borderRadius: '4px', fontWeight: 600, fontSize: '11px', whiteSpace: 'nowrap' }}>
            {label}
          </Tag>
        );
      }
    },
    { 
      title: 'Ngày nộp', 
      dataIndex: 'ngay_nop_ho_so', 
      key: 'ngay_nop_ho_so',
      width: 95,
      sorter: (a, b) => (a.ngay_nop_ho_so || '').localeCompare(b.ngay_nop_ho_so || ''),
      render: (date) => (
        <Space size={4} style={{ color: '#475569', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>
          <CalendarOutlined style={{ color: '#94a3b8' }} />
          <span>{date ? dayjs(date).format('DD/MM/YYYY') : '--'}</span>
        </Space>
      )
    },
    { 
      title: 'Tiến trình (3 bước)', 
      key: 'tien_trinh',
      width: 190,
      render: (_, record) => {
        const steps = [
          { label: 'Nộp HS', color: '#1890ff' },
          { label: 'VPĐU', color: '#722ed1' },
          { label: 'ĐHĐN', color: '#52c41a' }
        ];
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {steps.map((step, index) => {
              const isCurrent = record.buoc === index + 1;
              const isPast = record.buoc > index + 1;
              
              let bg = '#f1f5f9';
              let border = '1px solid #cbd5e1';
              let text = '#64748b';
              let weight = 'normal';
              
              if (isCurrent) {
                bg = step.color + '15';
                border = `1px solid ${step.color}`;
                text = step.color;
                weight = 'bold';
              } else if (isPast) {
                bg = '#f6ffed';
                border = '1px solid #b7eb8f';
                text = '#52c41a';
              }
              
              return (
                <React.Fragment key={index}>
                  <div style={{
                    padding: '2px 6px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    backgroundColor: bg,
                    border: border,
                    color: text,
                    fontWeight: weight,
                    whiteSpace: 'nowrap'
                  }}>
                    {step.label}
                  </div>
                  {index < 2 && <span style={{ color: '#cbd5e1', fontSize: '10px' }}>➔</span>}
                </React.Fragment>
              );
            })}
          </div>
        );
      }
    },
    {
      title: 'Ghi chú',
      dataIndex: 'ghi_chu',
      key: 'ghi_chu',
      width: 150,
      ellipsis: true,
      render: (text) => text ? <span style={{ fontSize: '12px', color: '#64748b' }}>{text}</span> : <span style={{ color: '#cbd5e1' }}>--</span>
    },
    { 
      title: 'Thao tác', 
      key: 'actions',
      width: 200,
      align: 'center',
      render: (_, record) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          <Button 
            type="default" 
            size="small"
            icon={<DownloadOutlined />}
            onClick={(e) => { e.stopPropagation(); handleOpenDocModal(record); }}
            style={{ borderRadius: '20px', fontWeight: 600, fontSize: '11px', padding: '0 8px', height: '24px', color: '#c62828', borderColor: '#c62828' }}
          >
            Biểu mẫu
          </Button>
          {record.buoc === 1 && (
            <Button 
              type="primary" 
              size="small"
              icon={<ArrowRightOutlined />}
              onClick={(e) => { e.stopPropagation(); handleAdvanceStep(record); }}
              style={{ backgroundColor: '#2f54eb', borderColor: '#2f54eb', borderRadius: '20px', fontWeight: 600, fontSize: '11px', padding: '0 8px', height: '24px', boxShadow: '0 2px 4px rgba(47, 84, 235, 0.15)' }}
            >
              Gửi VPĐU
            </Button>
          )}
          {record.buoc === 2 && (
            <Button 
              type="primary" 
              size="small"
              icon={<ArrowRightOutlined />}
              onClick={(e) => { e.stopPropagation(); handleAdvanceStep(record); }}
              style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', borderRadius: '20px', fontWeight: 600, fontSize: '11px', padding: '0 8px', height: '24px', boxShadow: '0 2px 4px rgba(114, 46, 209, 0.15)' }}
            >
              Gửi ĐHĐN
            </Button>
          )}
          {record.buoc === 3 && (
            <Button 
              type="primary" 
              size="small"
              icon={<CheckOutlined />}
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedProcessForCompletion(record);
                
                const isTamThoi = record.loai_chuyen === 'chuyen_tam_thoi';
                const initialVals = isTamThoi ? {
                  ngay_chuyen_tam_thoi: dayjs(),
                  thoi_gian_ve: '',
                  noi_chuyen_den_tam_thoi: '',
                  ghi_chu: ''
                } : {
                  ngay_chuyen_ra: dayjs(),
                  noi_chuyen_ra: '',
                  ghi_chu: ''
                };
                
                completeForm.setFieldsValue(initialVals);
                
                // Pre-generate dynamic email mockup content
                const defaultEmail = generateDefaultEmailTemplate(record, initialVals);
                setEmailSubject(defaultEmail.subject);
                setEmailHtml(defaultEmail.html);
                setSendEmailChecked(true);
                setIsEmailEditedManually(false);
                
                setIsCompleteModalVisible(true);
              }}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', borderRadius: '20px', fontWeight: 600, fontSize: '11px', padding: '0 8px', height: '24px', boxShadow: '0 2px 4px rgba(82, 196, 26, 0.15)' }}
            >
              Hoàn tất
            </Button>
          )}
          <Popconfirm
            title="Bạn có chắc muốn hủy tiến trình chuyển đi của đảng viên này không?"
            onConfirm={(e) => { e.stopPropagation(); handleCancelProcess(record.id); }}
            onCancel={(e) => e.stopPropagation()}
            okText="Hủy"
            cancelText="Đóng"
            okButtonProps={{ danger: true }}
          >
            <Button 
              type="text" 
              danger 
              size="small"
              icon={<DeleteOutlined />} 
              onClick={(e) => e.stopPropagation()} 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            />
          </Popconfirm>
        </Space>
      )
    }
  ], [activeMembers, activeProcesses]);

  return (
    <div className="premium-page-container">
      
      {/* Inline styles for styling optimization */}
      <style>{`
        .premium-page-container {
          padding: 4px;
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hover-underline:hover {
          text-decoration: underline;
        }
      `}</style>
      
      {/* Row 1: Page Header & Primary Actions - Styled fully uniform with the app */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', minWidth: '280px' }}>
          <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
          <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.3px' }}>
            Quản lý quy trình hồ sơ chuyển sinh hoạt Đảng
          </Title>
        </div>
        
        <Space size="middle">
          <Button 
            icon={<UploadOutlined />} 
            onClick={() => {
              setValidationResults([]);
              setIsImportModalVisible(true);
            }}
            style={{ borderRadius: '6px', fontWeight: 500 }}
          >
            Nhập từ Excel
          </Button>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleOpenExportModal}
            style={{ borderRadius: '6px', fontWeight: 500 }}
          >
            Xuất Excel
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              addForm.resetFields();
              addForm.setFieldsValue({
                ngay_nop_ho_so: dayjs()
              });
              setIsAddModalVisible(true);
            }}
            style={{ backgroundColor: '#c62828', borderColor: '#c62828', borderRadius: '6px', fontWeight: 600 }}
          >
            Khởi tạo hồ sơ
          </Button>
        </Space>
      </div>

      {/* Row 2: Fluid Search & Dynamic Filters Strip */}
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
          <FilterOutlined style={{ color: '#c62828' }} /> <span>Bộ lọc tiến trình:</span>
        </div>
        
        <div style={{ flex: 1.5, minWidth: '200px' }}>
          <Input 
            placeholder="Tìm kiếm theo MSSV hoặc họ tên..." 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            style={{ width: '100%', borderRadius: '6px' }} 
            allowClear
          />
        </div>
        
        <div style={{ flex: 1, minWidth: '150px' }}>
          <Select 
            placeholder="Lọc theo Bước Quy trình" 
            style={{ width: '100%' }} 
            allowClear 
            value={filterStep} 
            onChange={setFilterStep}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            <Option value={1}>Bước 1: Đã nộp hồ sơ</Option>
            <Option value={2}>Bước 2: Gửi Văn phòng Đảng ủy</Option>
            <Option value={3}>Bước 3: Gửi Đại học Đà Nẵng</Option>
          </Select>
        </div>
        
        <div style={{ flex: 1, minWidth: '150px' }}>
          <Select 
            placeholder="Lọc theo Loại chuyển" 
            style={{ width: '100%' }} 
            allowClear 
            value={filterLoaiChuyen} 
            onChange={setFilterLoaiChuyen}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            <Option value="chuyen_chinh_thuc">Chuyển chính thức</Option>
            <Option value="chuyen_du_bi">Chuyển dự bị</Option>
            <Option value="chuyen_tam_thoi">Chuyển tạm thời</Option>
          </Select>
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <Select 
            showSearch
            placeholder="Lọc theo Nhóm sinh hoạt" 
            style={{ width: '100%' }} 
            allowClear 
            value={filterNhom} 
            onChange={setFilterNhom}
            optionFilterProp="children"
            filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            {uniqueNhom.map(n => <Option key={n} value={n}>{n}</Option>)}
          </Select>
        </div>

        <div style={{ flex: 1, minWidth: '120px' }}>
          <Select 
            placeholder="Lọc theo Khóa" 
            style={{ width: '100%' }} 
            allowClear 
            value={filterIntake} 
            onChange={setFilterIntake}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            {uniqueIntakes.map(k => <Option key={k} value={k}>{k}</Option>)}
          </Select>
        </div>

        {(filterStep || filterNhom || searchText || filterLoaiChuyen || filterIntake) && (
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

      {/* Danh sách yêu cầu đăng ký chờ duyệt (nếu có) */}
      {pendingRegistrations.length > 0 && (
        <Card
          title={<><Alert message={`Có ${pendingRegistrations.length} yêu cầu đăng ký chuyển sinh hoạt đang chờ duyệt`} type="warning" showIcon style={{ border: 'none', padding: '4px 12px', background: 'transparent' }} /></>}
          bordered={false}
          style={{ marginBottom: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(250, 173, 20, 0.15)' }}
          styles={{ header: { borderBottom: '1px solid #ffe58f', backgroundColor: '#fffbe6', borderRadius: '12px 12px 0 0' }, body: { padding: 0 } }}
        >
          <Table
            columns={[
              { title: 'Ngày ĐK', dataIndex: 'created_at', render: (val) => dayjs(val).format('DD/MM/YYYY HH:mm'), width: 140 },
              { title: 'Họ tên', dataIndex: 'ho_ten', fontWeight: 600 },
              { title: 'MSSV', dataIndex: 'mssv', width: 100 },
              { title: 'Loại chuyển', dataIndex: 'loai_chuyen', render: (val) => val === 'chinh_thuc' ? <Tag color="blue">Chuyển chính thức</Tag> : <Tag color="orange">Chuyển tạm thời</Tag> },
              { title: 'Nơi chuyển đến', dataIndex: 'noi_chuyen_den' },
              { title: 'Thao tác', key: 'action', width: 120, align: 'center', render: (_, reg) => (
                <Button type="primary" size="small" style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  onClick={() => {
                    const m = activeMembers.find(x => x.id === reg.dang_vien_id);
                    if (!m) return message.error('Không tìm thấy dữ liệu Đảng viên!');
                    
                    addForm.resetFields();
                    addForm.setFieldsValue({
                      dang_vien_select: m.id,
                      loai_chuyen_sh: reg.loai_chuyen === 'chinh_thuc' ? 'chuyen_ra' : 'chuyen_tam_thoi',
                      ngay_nop_ho_so: dayjs(),
                      noi_chuyen_den: reg.noi_chuyen_den,
                      ly_do: reg.ly_do,
                      uu_diem: reg.uu_diem,
                      khuyet_diem: reg.khuyet_diem,
                      _registrationId: reg.id // Save this to update later
                    });
                    setIsAddModalVisible(true);
                  }}
                >
                  Tạo hồ sơ
                </Button>
              )}
            ]}
            dataSource={pendingRegistrations}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}

      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: (newSelectedRowKeys) => {
            setSelectedRowKeys(newSelectedRowKeys);
          }
        }}
        columns={activeProcessColumns}
        dataSource={filteredProcesses}
        loading={loading}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => handleRowClick(record)
        })}
        locale={{
          emptyText: (
            <Empty 
              description={
                <div style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
                  Không tìm thấy hồ sơ chuyển đi nào phù hợp với bộ lọc hiện tại
                </div>
              } 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20', '50'],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} hồ sơ chuyển đi đang xử lý`
        }}
        scroll={{ x: 'max-content' }}
        style={{ cursor: 'pointer' }}
      />

      <ProfileDrawer 
        open={isDrawerVisible} 
        onClose={() => setIsDrawerVisible(false)} 
        data={selectedRecord} 
        onUpdate={fetchActiveMembersAndProcesses} 
      />

      {/* Modal Chuyển bước Quy trình kèm Ghi chú */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#2f54eb', borderRadius: '2px' }} />
            <span style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a1a' }}>
              Xác nhận Chuyển bước Quy trình
            </span>
          </div>
        }
        open={isStepModalVisible}
        onOk={submitAdvanceStep}
        onCancel={() => {
          setIsStepModalVisible(false);
          setTransitioningRecord(null);
          setStepNote('');
        }}
        confirmLoading={stepLoading}
        okText={`CHUYỂN SANG BƯỚC ${(transitioningRecord?.buoc || 1) + 1}`}
        cancelText="HỦY BỎ"
        width={500}
        okButtonProps={{ style: { backgroundColor: '#2f54eb', borderColor: '#2f54eb', height: 40, fontWeight: 700, borderRadius: '6px' } }}
        cancelButtonProps={{ style: { height: 40, borderRadius: '6px' } }}
      >
        <div style={{ marginTop: 15, marginBottom: 15 }}>
          <p>Bạn đang chuyển tiến trình của đồng chí <strong>{transitioningRecord?.ho_ten}</strong> sang <strong>Bước {(transitioningRecord?.buoc || 1) + 1}</strong>.</p>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Nhập ghi chú cho bước này (nếu có):</div>
          <Input.TextArea
            rows={3}
            placeholder="Ví dụ: Đã gửi hồ sơ kèm văn bản đề nghị..."
            value={stepNote}
            onChange={e => setStepNote(e.target.value)}
            style={{ borderRadius: '6px' }}
          />
        </div>
      </Modal>

      
      {/* Modal 1: Add Transfer Process */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
            <span style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a1a' }}>
              Khởi tạo hồ sơ Chuyển sinh hoạt
            </span>
          </div>
        }
        open={isAddModalVisible}
        onOk={handleAddTransferSubmit}
        onCancel={() => setIsAddModalVisible(false)}
        confirmLoading={submittingAdd}
        okText="KHỞI TẠO TIẾN TRÌNH"
        cancelText="HỦY BỎ"
        width={900}
        okButtonProps={{ style: { backgroundColor: '#c62828', borderColor: '#c62828', height: 40, fontWeight: 700, borderRadius: '6px' } }}
        cancelButtonProps={{ style: { height: 40, borderRadius: '6px' } }}
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 20 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="dang_vien_select"
                label={<span style={{ fontWeight: 600 }}>Chọn Đảng viên đang sinh hoạt:</span>}
                rules={[{ required: true, message: 'Vui lòng chọn Đảng viên!' }]}
              >
                <Select
                  showSearch
                  placeholder="Nhập họ tên hoặc MSSV để tìm..."
                  optionFilterProp="children"
                  filterOption={(input, option) => 
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={availableMembers.map(m => ({
                    value: m.id,
                    label: `${m.ho_ten} - MSSV: ${m.mssv || 'N/A'} (Lớp: ${m.lop || 'N/A'}) - ${m.loai_dang_vien || (m.dang_vien_du_bi ? 'Dự bị' : 'Chính thức')}`
                  }))}
                  onChange={(val) => {
                    try {
                      const m = activeMembers.find(x => x.id === val);
                      if (m) {
                        const isReserve = m.loai_dang_vien === "Dự bị" || m.dang_vien_du_bi === true || m.loai_dang_vien === "dubi";
                        const defaultUuDiem = m.uu_diem || "- Có phẩm chất chính trị tốt lập trường tư tưởng vững vàng, tuyệt đối trung thành với đường lối của Đảng, tác phong đứng đắn, mẫu mực.\n- Có lối sống đạo đức trong sáng, giản dị, luôn có ý thức tu dưỡng và rèn luyện đạo đức, luôn là tấm gương sáng cho các thế hệ noi theo.\n- Có năng lực công tác tốt, luôn tích cực tham gia các hoạt động của chi Đoàn, khoa, Đoàn trường.\n- Tính tình vui vẻ, hòa đồng, luôn giúp đỡ mọi người.\n- Luôn có thái độ cầu thị trong việc nhìn nhận, sửa chữa, khắc phục khuyết điểm.";
                        const defaultKhuyetDiem = m.khuyet_diem || "Không có khuyết điểm gì lớn";
                        const defaultReason = "Tôi đã hoàn thành chương trình học và đã tốt nghiệp ra trường. Cần chuyển đến tổ chức Đảng mới để tiếp tục hoàn thành nhiệm vụ Đảng viên.";

                        addForm.setFieldsValue({
                          loai_chuyen_sh: 'chuyen_ra',
                          mssv: m.mssv || '',
                          gioi_tinh: m.gioi_tinh || 'Nam',
                          lop: m.lop || '',
                          khoa: m.khoa || '',
                          ngay_sinh: safeDate(m.ngay_sinh),
                          ngay_vao_dang: safeDate(m.ngay_vao_dang),
                          ngay_chinh_thuc: safeDate(m.ngay_chinh_thuc),
                          so_dien_thoai: m.so_dien_thoai || m.sdt || '',
                          so_the_dang: m.so_the_dang || m.so_quyet_dinh_dvct || m.so_qd || '',
                          que_quan: m.que_quan || m.tinh_tp_qq || '',
                          dia_chi: m.chi_tiet_dc || m.tinh_tp_tt || m.dia_chi_thuong_tru || '',
                          nhiem_vu_dang: m.nhiem_vu_dang || 'Đảng viên',
                          noi_chuyen_den: m.noi_chuyen_den || '',
                          tinh_tp: 'Đà Nẵng',
                          ly_do_chuyen: defaultReason,
                          uu_diem: defaultUuDiem,
                          khuyet_diem: defaultKhuyetDiem,
                          ghi_chu: m.ghi_chu || '',
                          ngay_ky: dayjs()
                        });
                      }
                    } catch (err) {
                      console.error("Error setting fields value:", err);
                      message.error("Lỗi khi tự động điền dữ liệu. Xin hãy nhập thủ công.");
                    }
                  }}
                  dropdownStyle={{ borderRadius: '6px' }}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="loai_chuyen_sh" label="Loại chuyển sinh hoạt Đảng" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value="chuyen_ra">Chuyển ra ngoài</Radio>
                  <Radio value="chuyen_tam_thoi">Chuyển tạm thời</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gioi_tinh" label="Giới tính" rules={[{ required: true }]}>
                <Select>
                  <Option value="Nam">Nam</Option>
                  <Option value="Nữ">Nữ</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="lop" label="Lớp học tập" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="khoa" label="Khoa quản lý" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ngay_sinh" label="Ngày sinh" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="so_dien_thoai" label="Số điện thoại liên hệ" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="ngay_vao_dang" label="Ngày vào Đảng" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ngay_chinh_thuc" label="Ngày chính thức"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={8}>
               <Form.Item name="so_the_dang" label="Số thẻ Đảng viên (nếu có)"><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="que_quan" label="Quê quán" rules={[{ required: true }]}><Input placeholder="Xã..., Huyện..., Tỉnh..." /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dia_chi" label="Địa chỉ cư trú hiện nay" rules={[{ required: true }]}><Input placeholder="Thôn..., Xã..., Huyện..., Tỉnh..." /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nhiem_vu_dang" label="Nhiệm vụ trong Đảng" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tinh_tp" label="Tỉnh/Thành phố ký hồ sơ" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="noi_chuyen_den" label="Nơi chuyển sinh hoạt Đảng đến" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ngay_ky" label="Ngày ký hồ sơ" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="ly_do_chuyen" label="Lý do xin chuyển sinh hoạt Đảng" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="uu_diem" label="Tự nhận xét Ưu điểm" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="khuyet_diem" label="Tự nhận xét Khuyết điểm" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="ghi_chu" label="Ghi chú hồ sơ"><Input.TextArea rows={2} placeholder="Nhập ghi chú hoặc nhắc nhở về hồ sơ này..." /></Form.Item>
          
          <Divider orientation="left">Dành cho Đảng viên Dự bị (Mẫu 5)</Divider>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="dvhd" label="Tên Đảng viên hướng dẫn"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="ngay_phan_cong" label="Ngày phân công HD"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="dvhd_ngay_sinh" label="Ngày sinh ĐVHD"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="dvhd_ngay_vao_dang" label="Ngày vào Đảng ĐVHD"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="dvhd_ngay_chinh_thuc" label="Ngày chính thức ĐVHD"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal 2: Complete Transfer Process */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#52c41a', borderRadius: '2px' }} />
            <span style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a1a' }}>
              Xác nhận Hoàn tất Thủ tục Chuyển sinh hoạt Đảng
            </span>
          </div>
        }
        open={isCompleteModalVisible}
        onOk={handleCompleteTransferSubmit}
        onCancel={() => setIsCompleteModalVisible(false)}
        confirmLoading={submittingComplete}
        okText="XÁC NHẬN HOÀN TẤT"
        cancelText="QUAY LẠI"
        width={1100}
        okButtonProps={{ style: { backgroundColor: '#52c41a', borderColor: '#52c41a', height: 40, fontWeight: 700, borderRadius: '6px' } }}
        cancelButtonProps={{ style: { height: 40, borderRadius: '6px' } }}
      >
        <Row gutter={24} style={{ marginTop: 20 }}>
          {/* Left Column: Form & Editor */}
          <Col span={11}>
            {selectedProcessForCompletion && (
              <div style={{ marginBottom: 16, background: selectedProcessForCompletion.loai_chuyen === 'chuyen_tam_thoi' ? '#fffbe6' : '#f6ffed', padding: '12px 16px', borderRadius: '8px', border: selectedProcessForCompletion.loai_chuyen === 'chuyen_tam_thoi' ? '1px solid #ffe58f' : '1px solid #b7eb8f' }}>
                <div style={{ fontWeight: 600, color: selectedProcessForCompletion.loai_chuyen === 'chuyen_tam_thoi' ? '#d46b08' : '#389e0d', fontSize: '14px', marginBottom: 4 }}>
                  Đồng chí: {selectedProcessForCompletion.ho_ten}
                </div>
                <div style={{ fontSize: '13px', color: '#555' }}>
                  MSSV: <Text strong>{selectedProcessForCompletion.mssv || 'N/A'}</Text> | Lớp: <Text strong>{selectedProcessForCompletion.lop || 'N/A'}</Text>
                </div>
                <div style={{ fontSize: '13px', color: '#555', marginTop: 4 }}>
                  Loại hình: <Tag color={selectedProcessForCompletion.loai_chuyen === 'chuyen_tam_thoi' ? 'orange' : 'red'} style={{ fontWeight: 600 }}>{selectedProcessForCompletion.loai_chuyen === 'chuyen_tam_thoi' ? 'Chuyển sinh hoạt tạm thời' : 'Chuyển ra chính thức'}</Tag>
                </div>
              </div>
            )}

            <Form
              form={completeForm}
              layout="vertical"
              onValuesChange={(changedValues, allValues) => {
                if (!isEmailEditedManually && selectedProcessForCompletion) {
                  const generated = generateDefaultEmailTemplate(selectedProcessForCompletion, allValues);
                  setEmailSubject(generated.subject);
                  setEmailHtml(generated.html);
                }
              }}
            >
              {selectedProcessForCompletion?.loai_chuyen === 'chuyen_tam_thoi' ? (
                <>
                  <Form.Item
                    name="ngay_chuyen_tam_thoi"
                    label={<span style={{ fontWeight: 600 }}>Ngày bắt đầu đi sinh hoạt tạm thời:</span>}
                    rules={[{ required: true, message: 'Vui lòng chọn ngày chuyển đi tạm thời!' }]}
                  >
                    <DatePicker 
                      format="DD/MM/YYYY" 
                      style={{ width: '100%', borderRadius: '6px' }} 
                    />
                  </Form.Item>

                  <Form.Item
                    name="thoi_gian_ve"
                    label={<span style={{ fontWeight: 600 }}>Thời gian về dự kiến (ví dụ: 6 tháng, 1 năm...):</span>}
                    rules={[{ required: true, message: 'Vui lòng nhập thời gian sinh hoạt tạm thời dự kiến!' }]}
                  >
                    <Input 
                      placeholder="Ví dụ: 6 tháng, 12 tháng..." 
                      style={{ borderRadius: '6px' }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="noi_chuyen_den_tam_thoi"
                    label={<span style={{ fontWeight: 600 }}>Nơi chuyển sinh hoạt tạm thời đến (Tổ chức Đảng mới):</span>}
                    rules={[{ required: true, message: 'Vui lòng nhập tổ chức Đảng nơi chuyển đến tạm thời!' }]}
                  >
                    <Input 
                      placeholder="Ví dụ: Chi bộ Sinh viên 1, Đảng bộ Trường Đại học X..." 
                      style={{ borderRadius: '6px' }}
                    />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Form.Item
                    name="ngay_chuyen_ra"
                    label={<span style={{ fontWeight: 600 }}>Ngày chuyển ra chính thức:</span>}
                    rules={[{ required: true, message: 'Vui lòng chọn ngày chuyển đi chính thức!' }]}
                  >
                    <DatePicker 
                      format="DD/MM/YYYY" 
                      style={{ width: '100%', borderRadius: '6px' }} 
                    />
                  </Form.Item>

                  <Form.Item
                    name="noi_chuyen_ra"
                    label={<span style={{ fontWeight: 600 }}>Nơi chuyển đến (Đảng bộ/Chi bộ mới):</span>}
                    rules={[{ required: true, message: 'Vui lòng nhập nơi chuyển sinh hoạt đến!' }]}
                  >
                    <Input 
                      placeholder="Ví dụ: Đảng bộ Quận Ngũ Hành Sơn, Đà Nẵng..." 
                      style={{ borderRadius: '6px' }}
                    />
                  </Form.Item>
                </>
              )}

              <Form.Item
                name="ghi_chu"
                label={<span style={{ fontWeight: 600 }}>Ghi chú chuyển đi (nếu có):</span>}
              >
                <Input.TextArea 
                  rows={2}
                  placeholder="Nhập ghi chú hoặc hướng dẫn thêm..." 
                  style={{ borderRadius: '6px' }}
                />
              </Form.Item>
            </Form>

            <Divider style={{ margin: '16px 0' }} />

            {/* Email send options */}
            <div style={{ marginBottom: 12 }}>
              <Checkbox 
                checked={sendEmailChecked} 
                onChange={e => setSendEmailChecked(e.target.checked)}
                style={{ fontWeight: 600 }}
              >
                Gửi email thông báo cho Đảng viên
              </Checkbox>
            </div>
            
            {sendEmailChecked && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Email nhận:</span>
                  <Input 
                    value={selectedProcessForCompletion?.email || 'N/A'} 
                    disabled 
                    style={{ borderRadius: '6px', marginTop: 4 }} 
                  />
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Tiêu đề email:</span>
                  <Input 
                    value={emailSubject} 
                    onChange={e => {
                      setEmailSubject(e.target.value);
                      setIsEmailEditedManually(true);
                    }}
                    style={{ borderRadius: '6px', marginTop: 4 }} 
                  />
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Nội dung email (Mã HTML):</span>
                  <Input.TextArea 
                    value={emailHtml} 
                    onChange={e => {
                      setEmailHtml(e.target.value);
                      setIsEmailEditedManually(true);
                    }}
                    rows={8}
                    style={{ borderRadius: '6px', marginTop: 4, fontFamily: 'monospace', fontSize: '12px' }} 
                  />
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>
                    * Bạn có thể tự do chỉnh sửa tiêu đề và mã HTML ở trên để điều chỉnh thư thông báo.
                  </div>
                </div>
              </div>
            )}
          </Col>
          
          {/* Right Column: Live Email Preview Mockup */}
          <Col span={13}>
            <div style={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              background: '#f8fafc', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0',
              padding: '16px',
              minHeight: '520px'
            }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: sendEmailChecked ? '#52c41a' : '#cbd5e1' }} />
                <span>Xem trước email sẽ gửi đi:</span>
              </div>
              
              {sendEmailChecked ? (
                <div style={{ 
                  flex: 1, 
                  background: '#ffffff', 
                  borderRadius: '6px', 
                  border: '1px solid #cbd5e1', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  display: 'flex', 
                  flexDirection: 'column', 
                  overflow: 'hidden'
                }}>
                  {/* Mock Email Header */}
                  <div style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', padding: '10px 14px', fontSize: '12px', color: '#475569' }}>
                    <div><strong>Từ:</strong> Chi bộ Sinh viên &lt;cbsv.due@gmail.com&gt;</div>
                    <div style={{ marginTop: 2 }}><strong>Tới:</strong> {selectedProcessForCompletion?.ho_ten || 'Đảng viên'} &lt;{selectedProcessForCompletion?.email || 'N/A'}&gt;</div>
                    <div style={{ marginTop: 4, padding: '4px 0', borderTop: '1px dashed #cbd5e1' }}>
                      <strong>Tiêu đề:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{emailSubject}</span>
                    </div>
                  </div>
                  
                  {/* HTML Content Render */}
                  <div 
                    style={{ flex: 1, padding: '20px', overflowY: 'auto', maxHeight: '420px' }}
                    dangerouslySetInnerHTML={{ __html: emailHtml }}
                  />
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '6px', border: '1px dashed #cbd5e1', color: '#94a3b8' }}>
                  <span>Tính năng gửi email thông báo đang tắt</span>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Modal>

      {/* Modal 3: Custom Export Modal */}
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
              {selectedRowKeys.length > 0 && (
                <Col span={8}>
                  <Radio.Button value="selected" style={{ width: '100%', textAlign: 'center', borderRadius: '6px', height: '42px', lineHeight: '40px', fontWeight: 600 }}>
                    Các dòng được chọn ({selectedRowKeys.length} dòng)
                  </Radio.Button>
                </Col>
              )}
              <Col span={selectedRowKeys.length > 0 ? 8 : 12}>
                <Radio.Button value="filtered" style={{ width: '100%', textAlign: 'center', borderRadius: '6px', height: '42px', lineHeight: '40px', fontWeight: 600 }}>
                  Theo bộ lọc tiến trình ({filteredProcesses.length} dòng)
                </Radio.Button>
              </Col>
              <Col span={selectedRowKeys.length > 0 ? 8 : 12}>
                <Radio.Button value="all" style={{ width: '100%', textAlign: 'center', borderRadius: '6px', height: '42px', lineHeight: '40px', fontWeight: 600 }}>
                  Toàn bộ danh sách ({activeProcesses.length} dòng)
                </Radio.Button>
              </Col>
            </Row>
          </Radio.Group>

          <Divider style={{ margin: '16px 0' }} />

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

      {/* Modal 4: Excel Import Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
            <span style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a1a' }}>
              Nhập Tiến trình Chuyển sinh hoạt từ Excel
            </span>
          </div>
        }
        open={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setIsImportModalVisible(false)}>
            Hủy bỏ
          </Button>,
          <Button 
            key="confirm" 
            type="primary"
            style={{ backgroundColor: '#c62828', borderColor: '#c62828' }}
            disabled={validationResults.filter(r => r.status === "valid").length === 0}
            onClick={handleConfirmImport}
            loading={importing}
          >
            Nhập tiến trình ({validationResults.filter(r => r.status === "valid").length} dòng)
          </Button>
        ]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#1e293b', fontWeight: 700 }}>Hướng dẫn nhập Excel:</h4>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
              <li>Tệp Excel của bạn phải chứa cột <strong>MSSV</strong> của Đảng viên đang sinh hoạt.</li>
              <li>Bạn có thể tùy chọn thêm cột <strong>Ngày nộp hồ sơ</strong> (Định dạng DD/MM/YYYY) và cột <strong>Bước hiện tại</strong> (Ghi số 1, 2 hoặc 3).</li>
              <li>Nếu không chỉ định, ngày nộp hồ sơ sẽ mặc định là ngày hôm nay và bước hiện tại mặc định là Bước 1.</li>
            </ul>
            <div style={{ marginTop: 12 }}>
              <Button 
                type="dashed" 
                icon={<DownloadOutlined />} 
                onClick={handleDownloadTemplate}
                size="small"
                style={{ color: '#c62828', borderColor: '#c62828' }}
              >
                Tải xuống File Excel Mẫu (.xlsx)
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0', border: '2px dashed #e2e8f0', borderRadius: 8, background: '#fafafa' }}>
            <Upload 
              accept=".xlsx, .xls" 
              beforeUpload={handleImportExcel} 
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} type="primary" style={{ backgroundColor: '#c62828', borderColor: '#c62828' }}>
                Chọn File Excel Tải Lên
              </Button>
            </Upload>
          </div>

          {isValidating && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <span style={{ color: '#64748b' }}>Đang kiểm tra và đối chiếu thông tin trong CSDL...</span>
            </div>
          )}

          {validationResults.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: 8, color: '#1e293b' }}>
                Kết quả đối chiếu CSDL ({validationResults.length} bản ghi):
              </div>
              <Table
                size="small"
                dataSource={validationResults}
                pagination={{ pageSize: 5 }}
                columns={[
                  { 
                    title: 'STT', 
                    key: 'idx', 
                    width: 50, 
                    align: 'center',
                    render: (_, __, idx) => idx + 1 
                  },
                  { 
                    title: 'MSSV', 
                    dataIndex: 'mssv', 
                    key: 'mssv', 
                    width: 100 
                  },
                  { 
                    title: 'Họ tên đối chiếu', 
                    dataIndex: 'ho_ten', 
                    key: 'ho_ten', 
                    width: 180,
                    render: (val, record) => (
                      <span style={{ color: record.status === 'invalid' ? '#ef4444' : '#1e293b', fontWeight: 600 }}>{val}</span>
                    )
                  },
                  { 
                    title: 'Ngày nộp HS', 
                    dataIndex: 'ngay_nop_ho_so', 
                    key: 'ngay_nop_ho_so', 
                    width: 120,
                    render: (d) => dayjs(d).format('DD/MM/YYYY')
                  },
                  { 
                    title: 'Bước', 
                    dataIndex: 'buoc', 
                    key: 'buoc', 
                    width: 70, 
                    align: 'center',
                    render: (b) => <Tag color="blue">Bước {b}</Tag>
                  },
                  { 
                    title: 'Loại hình', 
                    dataIndex: 'loai_chuyen', 
                    key: 'loai_chuyen', 
                    width: 100, 
                    render: (type) => (
                      <Tag color={type === 'chuyen_tam_thoi' ? 'orange' : 'red'} style={{ fontWeight: 500 }}>
                        {type === 'chuyen_tam_thoi' ? 'Tạm thời' : 'Chính thức'}
                      </Tag>
                    )
                  },
                  { 
                    title: 'Trạng thái đối chiếu', 
                    key: 'status',
                    render: (_, record) => {
                      if (record.status === "valid") {
                        return <Tag color="success">✓ Hợp lệ</Tag>;
                      } else if (record.status === "duplicate") {
                        return <Tag color="warning">⚠ Đang xử lý</Tag>;
                      } else if (record.status === "transferred") {
                        return <Tag color="error">✗ Đã chuyển đi</Tag>;
                      } else {
                        return <Tag color="error" title={record.errorMsg}>✗ {record.errorMsg}</Tag>;
                      }
                    }
                  }
                ]}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Modal 5: Document Generator Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
            <span style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a1a', letterSpacing: '-0.3px' }}>
              Trình hướng dẫn tạo biểu mẫu & Xem trước (Live Preview) - Đồng chí {docRecord?.ho_ten}
            </span>
          </div>
        }
        open={isDocModalVisible}
        onCancel={() => setIsDocModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDocModalVisible(false)} style={{ borderRadius: '6px' }}>
            Đóng
          </Button>,
          transferType && (
            <Button
              key="download-zip"
              type="primary"
              icon={<FileZipOutlined />}
              onClick={downloadDocModalAllAsZip}
              loading={generating}
              style={{
                backgroundColor: '#c62828',
                borderColor: '#c62828',
                borderRadius: '6px',
                fontWeight: 700,
                padding: '0 24px',
                height: '40px'
              }}
            >
              TẢI TRỌN BỘ HỒ SƠ (.ZIP)
            </Button>
          )
        ]}
        width={1300}
        centered
        destroyOnClose
        styles={{ body: { padding: '20px 24px', backgroundColor: '#f8fafc' }, header: { padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9' } }}
      >
        <Form form={docForm} layout="vertical">
          <Row gutter={24}>
            {/* Left inputs column */}
            <Col xs={24} lg={10} style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '16px' }}>
              
              {/* Transfer Type Cards */}
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '12px' }}>
                Loại chuyển sinh hoạt
              </div>
              <Form.Item
                name="loai_chuyen_sh"
                rules={[{ required: true, message: 'Vui lòng chọn loại chuyển sinh hoạt Đảng' }]}
              >
                <div style={{ display: 'none' }}>
                  <Input />
                </div>
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={12}>
                    <div
                      onClick={() => handleDocTransferTypeChange('chuyen_ra')}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: transferType === 'chuyen_ra' ? '2px solid #c62828' : '1px solid #e2e8f0',
                        backgroundColor: transferType === 'chuyen_ra' ? '#fef2f2' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: transferType === 'chuyen_ra' ? '0 4px 10px rgba(198, 40, 40, 0.06)' : 'none',
                      }}
                      className="custom-select-card"
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: transferType === 'chuyen_ra' ? '#c62828' : '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: transferType === 'chuyen_ra' ? '#ffffff' : '#64748b',
                        fontSize: '15px',
                        flexShrink: 0
                      }}>
                        <ExportOutlined />
                      </div>
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: transferType === 'chuyen_ra' ? '#c62828' : '#1e293b', fontSize: '13px' }}>
                          Chuyển ra ngoài
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                          Vĩnh viễn (ra trường, đi làm...)
                        </div>
                      </div>
                    </div>
                  </Col>
                  
                  <Col xs={24} sm={12}>
                    <div
                      onClick={() => handleDocTransferTypeChange('chuyen_tam_thoi')}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: transferType === 'chuyen_tam_thoi' ? '2px solid #c62828' : '1px solid #e2e8f0',
                        backgroundColor: transferType === 'chuyen_tam_thoi' ? '#fef2f2' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: transferType === 'chuyen_tam_thoi' ? '0 4px 10px rgba(198, 40, 40, 0.06)' : 'none',
                      }}
                      className="custom-select-card"
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: transferType === 'chuyen_tam_thoi' ? '#c62828' : '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: transferType === 'chuyen_tam_thoi' ? '#ffffff' : '#64748b',
                        fontSize: '15px',
                        flexShrink: 0
                      }}>
                        <CalendarOutlined />
                      </div>
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: transferType === 'chuyen_tam_thoi' ? '#c62828' : '#1e293b', fontSize: '13px' }}>
                          Chuyển tạm thời
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                          Tạm thời (thực tập, học quân sự...)
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Form.Item>

              {transferType && (
                <>
                  <Divider style={{ margin: '15px 0' }} />
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#1e293b', marginBottom: '15px' }}>
                    Thông tin bổ sung cho hồ sơ
                  </div>

                  <Collapse defaultActiveKey={['1']} bordered={false} style={{ backgroundColor: 'transparent' }} items={[
                    {
                      key: '1',
                      label: <div style={{ fontWeight: 700, color: '#1e293b' }}>1. Thông tin Cá nhân</div>,
                      children: (
                        <>
                          <Row gutter={16}>
                            <Col xs={24} sm={12}>
                              <Form.Item name="gioi_tinh" label="Giới tính" rules={[{ required: true }]}>
                                <Select>
                                  <Option value="Nam">Nam</Option>
                                  <Option value="Nữ">Nữ</Option>
                                </Select>
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Form.Item name="ngay_sinh" label="Ngày sinh" rules={[{ required: true }]}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={16}>
                            <Col xs={24} sm={12}>
                              <Form.Item name="que_quan" label="Quê quán" rules={[{ required: true }]}>
                                <Input placeholder="Xã..., Huyện..., Tỉnh..." />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Form.Item name="dia_chi" label="Địa chỉ cư trú hiện nay" rules={[{ required: true }]}>
                                <Input placeholder="Thôn..., Xã..., Huyện..., Tỉnh..." />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Form.Item name="so_dien_thoai" label="Số điện thoại liên hệ" rules={[{ required: true }]}>
                            <Input />
                          </Form.Item>
                        </>
                      )
                    },
                    {
                      key: '2',
                      label: <div style={{ fontWeight: 700, color: '#1e293b' }}>2. Thông tin Đảng tịch & Đoàn thể</div>,
                      children: (
                        <>
                          <Row gutter={16}>
                            <Col xs={24} sm={12}>
                              <Form.Item name="ngay_vao_dang" label="Ngày vào Đảng" rules={[{ required: true }]}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Form.Item name="ngay_chinh_thuc" label="Ngày chính thức (bỏ trống nếu Dự bị)">
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabled={isProbationary} />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={16}>
                            <Col xs={24} sm={12}>
                              <Form.Item name="so_the_dang" label="Số thẻ Đảng viên (nếu có)">
                                <Input placeholder="Nhập số thẻ Đảng..." />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Form.Item name="nhiem_vu_dang" label="Nhiệm vụ được giao trong Đảng" rules={[{ required: true }]}>
                                <Input placeholder="Ví dụ: Đảng viên, Phó Bí thư Chi bộ..." />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={16}>
                            <Col xs={24} sm={12}>
                              <Form.Item name="lop" label="Lớp học tập" rules={[{ required: true }]}>
                                <Input />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Form.Item name="khoa" label="Khoa quản lý" rules={[{ required: true }]}>
                                <Input />
                              </Form.Item>
                            </Col>
                          </Row>
                        </>
                      )
                    },
                    {
                      key: '3',
                      label: <div style={{ fontWeight: 700, color: '#1e293b' }}>3. Chi tiết Đơn chuyển sinh hoạt</div>,
                      children: (
                        <>
                          <Row gutter={16}>
                            <Col xs={24} sm={12}>
                              <Form.Item name="noi_chuyen_den" label="Nơi chuyển đến" rules={[{ required: true }]}>
                                <Input placeholder="Chi bộ... thuộc Đảng bộ cơ sở..." />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Form.Item name="ngay_ky" label="Ngày ký hồ sơ" rules={[{ required: true }]}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Form.Item name="tinh_tp" label="Tỉnh/Thành phố ký hồ sơ" rules={[{ required: true }]}>
                            <Input />
                          </Form.Item>
                          <Form.Item name="ly_do_chuyen" label="Lý do xin chuyển sinh hoạt Đảng" rules={[{ required: true }]}>
                            <Input.TextArea rows={2} />
                          </Form.Item>
                          <Form.Item name="ghi_chu" label="Ghi chú hồ sơ nội bộ">
                            <Input.TextArea rows={2} placeholder="Nhập ghi chú hoặc nhắc nhở về hồ sơ này..." />
                          </Form.Item>
                        </>
                      )
                    },
                    {
                      key: '4',
                      label: <div style={{ fontWeight: 700, color: '#1e293b' }}>4. Nội dung Tự Kiểm Điểm</div>,
                      children: (
                        <>
                          <Form.Item name="uu_diem" label="Tự nhận xét Ưu điểm" rules={[{ required: true }]}>
                            <Input.TextArea rows={4} />
                          </Form.Item>
                          <Form.Item name="khuyet_diem" label="Tự nhận xét Khuyết điểm, Hạn chế" rules={[{ required: true }]}>
                            <Input.TextArea rows={2} />
                          </Form.Item>
                        </>
                      )
                    }
                  ]} />

                  {/* Probationary member extra guider inputs */}
                  {isProbationary && (
                    <div style={{ marginTop: '20px', padding: '16px', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#166534', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <StarOutlined /> Ý kiến đánh giá của Đảng viên hướng dẫn (ĐVHD)
                      </div>

                      <Row gutter={16}>
                        <Col xs={24} sm={14}>
                          <Form.Item name="dvhd_id" label={<span style={{ color: '#166534', fontWeight: 600 }}>Chọn Đảng viên hướng dẫn từ danh sách</span>}>
                            <Select 
                              placeholder="Chọn Đảng viên chính thức đang sinh hoạt..."
                              onChange={handleDocGuiderSelect}
                              showSearch
                              optionFilterProp="children"
                            >
                              {officialMembers.map(m => (
                                <Option key={m.id} value={m.id}>{m.ho_ten} - {m.mssv || 'N/A'}</Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={10} style={{ display: 'none' }}>
                          <Form.Item name="dvhd">
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={10} style={{ display: 'flex', alignItems: 'center', height: '82px' }}>
                          {guiderFound === 'found' ? (
                            <Alert message="Lấy thông tin thành công" type="success" showIcon style={{ padding: '6px 12px', fontSize: '12px' }} />
                          ) : (
                            <Alert message="Vui lòng chọn để điền tự động" type="info" showIcon style={{ padding: '6px 12px', fontSize: '12px' }} />
                          )}
                        </Col>
                      </Row>

                      <div style={{ marginBottom: '15px' }}>
                        <Checkbox
                          checked={generateGuiderDoc}
                          onChange={(e) => setGenerateGuiderDoc(e.target.checked)}
                          style={{ fontWeight: 700, color: '#166534' }}
                        >
                          Tích chọn để kèm Bản nhận xét của ĐVHD (Mẫu 5) vào bộ hồ sơ
                        </Checkbox>
                      </div>

                      {generateGuiderDoc && (
                        <div style={{ marginTop: '10px', borderTop: '1px dashed #bbf7d0', paddingTop: '15px' }}>
                          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '10px', color: '#166534' }}>
                            Thông tin chi tiết về Đảng viên hướng dẫn (cần thiết cho Mẫu 5):
                          </Text>
                          <Row gutter={16}>
                            <Col xs={24} sm={8}>
                              <Form.Item name="dvhd_ngay_sinh" label={<span style={{ color: '#166534' }}>Ngày sinh ĐVHD</span>} rules={[{ required: generateGuiderDoc }]}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={8}>
                              <Form.Item name="dvhd_ngay_vao_dang" label={<span style={{ color: '#166534' }}>Ngày kết nạp ĐVHD</span>} rules={[{ required: generateGuiderDoc }]}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={8}>
                              <Form.Item name="dvhd_ngay_chinh_thuc" label={<span style={{ color: '#166534' }}>Ngày chính thức ĐVHD</span>} rules={[{ required: generateGuiderDoc }]}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={16}>
                            <Col xs={24} sm={12}>
                              <Form.Item name="ngay_phan_cong" label={<span style={{ color: '#166534' }}>Ngày Chi bộ phân công giúp đỡ</span>} rules={[{ required: generateGuiderDoc }]}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          </Row>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Downloads Section moved to Left Column */}
              <Card
                className="premium-glass-card"
                style={{
                  borderRadius: '12px',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                  backgroundColor: '#f8fafc',
                  marginTop: '20px',
                  marginBottom: '20px'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#1e293b', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DownloadOutlined style={{ color: '#c62828' }} /> Danh mục biểu mẫu & Tải lẻ
                </div>

                {!transferType ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
                    <InfoCircleOutlined style={{ fontSize: '24px', marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                    Vui lòng chọn loại chuyển sinh hoạt Đảng để xem danh mục biểu mẫu
                  </div>
                ) : (
                  <div>
                    <Alert
                      message={
                        <span style={{ fontSize: '11px', color: '#475569' }}>
                          Cơ chế sinh mẫu tự động điền các thông tin của {docRecord?.ho_ten} và ĐVHD (nếu có).
                        </span>
                      }
                      type="info"
                      showIcon
                      style={{ marginBottom: '15px' }}
                    />

                    {/* Document items list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {docModalDocumentList.map(doc => (
                        <div
                          key={doc.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            backgroundColor: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '60%' }}>
                            <FileTextOutlined style={{ color: '#3b82f6', fontSize: '15px' }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.label}
                            </span>
                          </div>
                          <Space size="small">
                            <Tooltip title="Xem trước trên giao diện">
                              <Button
                                size="small"
                                type={previewDocKey === doc.key ? 'primary' : 'default'}
                                icon={<InfoCircleOutlined />}
                                onClick={() => setPreviewDocKey(doc.key)}
                                style={{ borderRadius: '6px', fontSize: '11px' }}
                              >
                                Xem
                              </Button>
                            </Tooltip>
                            <Tooltip title={`Tải riêng lẻ ${doc.code}`}>
                              <Button
                                type="text"
                                icon={<DownloadOutlined style={{ color: '#10b981' }} />}
                                onClick={() => downloadDocModalSingleDoc(doc.key)}
                                disabled={generating}
                                size="small"
                              />
                            </Tooltip>
                          </Space>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

            </Col>

            {/* Right column: Live A4 Preview */}
            <Col xs={24} lg={14}>
              <Card
                className="premium-glass-card"
                style={{
                  borderRadius: '12px',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                  backgroundColor: '#e2e8f0',
                  height: '75vh',
                  overflowY: 'auto'
                }}
                styles={{ body: { padding: 0 } }}
              >
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
                  <div style={{ fontWeight: 700, color: '#334155' }}>
                    <FileTextOutlined style={{ marginRight: 8, color: '#c62828' }} />
                    Bản xem trước A4 - {docModalDocumentList.find(d => d.key === previewDocKey)?.code || 'Chọn mẫu để xem'}
                  </div>
                  <Tag color="green">Live Preview</Tag>
                </div>
                
                <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
                  <Form.Item noStyle shouldUpdate>
                    {() => {
                      const currentValues = docForm.getFieldsValue();
                      const previewData = {
                        ...docRecord,
                        ...currentValues,
                        ngay_sinh: currentValues.ngay_sinh ? currentValues.ngay_sinh.format('YYYY-MM-DD') : '',
                        ngay_vao_dang: currentValues.ngay_vao_dang ? currentValues.ngay_vao_dang.format('YYYY-MM-DD') : '',
                        ngay_chinh_thuc: currentValues.ngay_chinh_thuc ? currentValues.ngay_chinh_thuc.format('YYYY-MM-DD') : '',
                        ngay_ky: currentValues.ngay_ky ? currentValues.ngay_ky.format('YYYY-MM-DD') : ''
                      };
                      return (
                        <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', width: '100%' }}>
                          <DocumentPreview 
                            data={previewData} 
                            docType={previewDocKey} 
                          />
                        </div>
                      );
                    }}
                  </Form.Item>
                </div>
              </Card>
            </Col>
          </Row>
        </Form>
      </Modal>

    </div>
  );
};

export default HoSoChuyenRa;
