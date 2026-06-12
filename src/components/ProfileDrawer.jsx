import React, { useState, useEffect, useMemo } from 'react';
import { Drawer, Button, Form, Input, Row, Col, Select, DatePicker, message, Space, Checkbox, Avatar, Typography, Card, Popconfirm, Modal, Tooltip, Tabs, Timeline, Spin, Divider } from 'antd';
import { 
  EditOutlined, SaveOutlined, CloseOutlined, UserOutlined, 
  DeleteOutlined, ExportOutlined, ExclamationCircleOutlined,
  IdcardOutlined, BookOutlined, PhoneOutlined, HomeOutlined, TeamOutlined, StarOutlined,
  SwapOutlined, PlusOutlined, HistoryOutlined, ClockCircleOutlined, CheckCircleOutlined,
  CameraOutlined, UploadOutlined
} from '@ant-design/icons';
import { doc, updateDoc, deleteDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../services/permissionService';
import dayjs from 'dayjs';
import AddressWardSelect from './AddressWardSelect';
import AddressProvinceSelect from './AddressProvinceSelect';
import AddressDistrictSelect from './AddressDistrictSelect';
import PermissionWrapper from './PermissionWrapper';
const { Option } = Select;

const safeDayjs = (dateVal) => {
  if (!dateVal || dateVal === "Invalid Date") return null;
  const d = dayjs(dateVal);
  return d.isValid() ? d : null;
};

const DAN_TOC = ["Kinh", "Tày", "Thái", "Hoa", "Khmer", "Mường", "Nùng", "H'Mông", "Dao", "Gia Rai", "Ngái", "Ê Đê", "Ba Na", "Xơ Đăng", "Sán Chay", "Cơ Ho", "Chăm", "Sán Dìu", "Hrê", "Mnông", "Ra Glai", "Xtiêng", "Bru-Vân Kiều", "Thổ", "Giáy", "Cơ Tu", "Giẻ Triêng", "Mạ", "Khơ Mú", "Co", "Tà Ôi", "Chơ Ro", "Kháng", "Xinh Mun", "Hà Nhì", "Chu Ru", "Lào", "La Chí", "La Ha", "Phù Lá", "La Hủ", "Lự", "Lô Lô", "Chứt", "Mảng", "Pà Thẻn", "Co Lao", "Cống", "Bố Y", "Si La", "Pu Péo", "Brâu", "Ơ Đu", "Rơ Măm", "Khác"];
const TON_GIAO = ["Không", "Phật giáo", "Công giáo", "Tin Lành", "Cao Đài", "Hòa Hảo", "Hồi giáo", "Bà La Môn", "Khác"];
const NHOM = ["Phát triển Đảng", "Hồ sơ sinh hoạt Đảng", "Kiểm tra - Giám sát", "Truyền thông", "Tổ chức", "Khác"];
const KHOA = ["P.CTSV", "Quản trị Kinh doanh", "Du lịch", "Marketing", "Tài chính", "Ngân hàng", "Kinh tế", "Kế toán", "Luật", "Thống kê - Tin học", "Thương mại điện tử", "Kinh doanh quốc tế", "Lý luận chính trị", "Khác"];
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const FIELD_LABELS = {
  ho_ten: "Họ và tên",
  mssv: "MSSV",
  ngay_sinh: "Ngày sinh",
  gioi_tinh: "Giới tính",
  cccd: "CCCD",
  dan_toc: "Dân tộc",
  ton_giao: "Tôn giáo",
  lop: "Lớp",
  khoa: "Khoa",
  nhom: "Nhóm sinh hoạt",
  so_dien_thoai: "Số điện thoại",
  email: "Email cá nhân",
  email_sv: "Email sinh viên",
  facebook: "Facebook",
  dia_chi_tam_tru: "Địa chỉ tạm trú",
  chi_tiet_dc: "Địa chỉ thường trú",
  xa_phuong_tt: "Xã/Phường thường trú",
  quan_huyen_tt: "Quận/Huyện thường trú",
  tinh_tp_tt: "Tỉnh/TP thường trú",
  que_quan: "Quê quán (chi tiết)",
  xa_phuong_qq: "Xã/Phường quê quán",
  quan_huyen_qq: "Quận/Huyện quê quán",
  tinh_tp_qq: "Tỉnh/TP quê quán",
  chi_tiet_qq_cu: "Quê quán cũ (chi tiết)",
  xa_phuong_qq_cu: "Xã/Phường quê quán cũ",
  quan_huyen_qq_cu: "Quận/Huyện quê quán cũ",
  tinh_tp_qq_cu: "Tỉnh/TP quê quán cũ",
  chi_tiet_tt_cu: "Thường trú cũ (chi tiết)",
  xa_phuong_tt_cu: "Xã/Phường thường trú cũ",
  quan_huyen_tt_cu: "Quận/Huyện thường trú cũ",
  tinh_tp_tt_cu: "Tỉnh/TP thường trú cũ",
  ngay_vao_dang: "Ngày vào Đảng",
  ngay_chinh_thuc: "Ngày chính thức",
  so_the_dang: "Số thẻ Đảng",
  noi_chuyen_di: "Nơi chuyển đi",
  ngay_chuyen_vao: "Ngày chuyển vào Chi bộ",
  dvhd: "Đảng viên hướng dẫn",
  ho_ten_nguoi_than: "Họ tên người thân",
  sdt_nguoi_than: "SĐT người thân",
  anh_ca_nhan: "Ảnh cá nhân",
  dang_vien_du_bi: "Loại Đảng viên",
  trang_thai: "Trạng thái sinh hoạt",
  soqd: "Số quyết định kết nạp",
  ngaykiqd: "Ngày ký quyết định kết nạp",
  uu_diem: "Ưu điểm",
  khuyet_diem: "Khuyết điểm",
  ghi_chu_ho_so: "Ghi chú hồ sơ"
};

const FieldContext = React.createContext(null);

const Field = ({ name, label, rules, children, valueMap, span = 12 }) => {
  const { data, editMode, currentUser, form, setIsModified, collectionName } = React.useContext(FieldContext);
  const val = valueMap ? valueMap[data[name]] || data[name] : data[name];
  
  // For date formatting
  let displayVal = val;
  if ((name.includes('ngay_') || name === 'ngaykiqd') && val) {
    const d = safeDayjs(val);
    displayVal = d ? d.format('DD/MM/YYYY') : '--';
  }

  // Auto-calculate for official date if it is missing/invalid
  if (name === 'ngay_chinh_thuc' && !data.dang_vien_du_bi) {
    const d = safeDayjs(data.ngay_chinh_thuc || data.ngay_cong_nhan_dvct);
    if (d) {
      displayVal = d.format('DD/MM/YYYY');
    } else {
      const ngayVaoDang = safeDayjs(data.ngay_vao_dang);
      displayVal = ngayVaoDang ? ngayVaoDang.add(1, 'year').format('DD/MM/YYYY') : '--';
    }
  }
  
  const hasConvertPermission = currentUser && [ROLES.ADMIN, ROLES.BITHU, ROLES.CAPUY, ROLES.KIEMTRA, ROLES.OFFICIAL_MANAGER].includes(currentUser.role);
  
  return (
    <Col span={span}>
      {editMode ? (
        <Form.Item name={name} label={label} rules={rules} style={{ marginBottom: 12 }}>
          {name === 'so_the_dang' && hasConvertPermission && data.cccd && collectionName !== 'ho_so_ket_nap' ? (
            React.cloneElement(children, {
              addonAfter: (
                <span 
                  style={{ color: '#c62828', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                  onClick={() => {
                    form.setFieldsValue({ so_the_dang: data.cccd || data.CCCD || '' });
                    setIsModified(true);
                    message.success("Đã điền số CCCD làm Số thẻ Đảng!");
                  }}
                >
                  Cấp từ CCCD
                </span>
              )
            })
          ) : children}
        </Form.Item>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 4 }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 500, fontSize: 15, color: '#262626' }}>{displayVal || '--'}</div>
          </div>
        </div>
      )}
    </Col>
  );
};

const ProfileDrawer = ({ open, onClose, data: originalData, onUpdate, collectionName = "dang_vien" }) => {
  const { currentUser } = useAuth();
  
  const data = useMemo(() => {
    if (!originalData) return null;
    if (collectionName === "ho_so_ket_nap") {
      return {
        ...originalData,
        id: originalData.id,
        ho_ten: originalData.ho_ten || originalData.hoten || '',
        so_dien_thoai: originalData.so_dien_thoai || originalData.sdt || '',
        ngay_sinh: originalData.ngay_sinh || originalData.ngaysinh || null,
        que_quan: originalData.que_quan || originalData.quequan || '',
        ngay_vao_dang: originalData.ngay_vao_dang || originalData.ngayvaodang || null,
        dvhd: originalData.dvhd || originalData.dangvienhuongdan || '',
        dang_vien_du_bi: true,
        loai_dang_vien: "Dự bị",
        trang_thai: "dang_sinh_hoat",
        soqd: originalData.soqd || '',
        ngaykiqd: originalData.ngaykiqd || null,
        facebook: originalData.facebook || originalData.link_fb || '',
      };
    }
    return {
      ...originalData,
      soqd: originalData.soqd || originalData.so_qd || '',
      ngaykiqd: originalData.ngaykiqd || originalData.ngay_ki_qd || null,
    };
  }, [originalData, collectionName]);
  const [editMode, setEditMode] = useState(false);
  const [form] = Form.useForm();

  const watchAvatar = Form.useWatch('anh_ca_nhan', form);

  const handleAvatarUpload = (e) => {
    const file = e.target.value ? e.target.files[0] : null;
    if (!file) return;

    if (file.size > 800 * 1024) {
      message.error("Ảnh quá lớn! Vui lòng chọn ảnh dưới 800KB để đảm bảo hiệu năng lưu trữ.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target.result;
      form.setFieldsValue({ anh_ca_nhan: base64String });
      setIsModified(true);
      message.success("Đã nạp ảnh đại diện mới! Nhấn 'Lưu thay đổi' để hoàn tất.");
    };
    reader.readAsDataURL(file);
  };

  const [saving, setSaving] = useState(false);
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [transferForm] = Form.useForm();

  // Temporary Transfer states & forms
  const [isTempTransferModalVisible, setIsTempTransferModalVisible] = useState(false);
  const [tempTransferForm] = Form.useForm();
  const [isTempReturnModalVisible, setIsTempReturnModalVisible] = useState(false);
  const [tempReturnForm] = Form.useForm();

  const [activeTab, setActiveTab] = useState("info");
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistoryLogs = async () => {
    if (!data?.id) return;
    setHistoryLoading(true);
    try {
      const q = query(
        collection(db, "lich_su_cap_nhat"),
        where("dang_vien_id", "==", data.id)
      );
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      logs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setHistoryLogs(logs);
    } catch (err) {
      console.error("Lỗi khi tải lịch sử cập nhật:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const [transferProcess, setTransferProcess] = useState(null);
  const [transferLoading, setTransferLoading] = useState(false);

  const fetchTransferProcess = async () => {
    if (!data?.id) return;
    setTransferLoading(true);
    try {
      const q = query(
        collection(db, "chuyen_sinh_hoat"),
        where("dang_vien_id", "==", data.id)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const processes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        processes.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setTransferProcess(processes[0]);
      } else {
        setTransferProcess(null);
      }
    } catch (err) {
      console.error("Lỗi khi tải tiến trình chuyển đi:", err);
    } finally {
      setTransferLoading(false);
    }
  };

  const findDocByMssv = async (colName, mStr) => {
    const mNum = Number(mStr);
    const q1 = query(collection(db, colName), where("mssv", "==", mStr));
    const s1 = await getDocs(q1);
    if (!s1.empty) return s1.docs[0];

    const q2 = query(collection(db, colName), where("MSSV", "==", mStr));
    const s2 = await getDocs(q2);
    if (!s2.empty) return s2.docs[0];

    if (!isNaN(mNum)) {
      const q3 = query(collection(db, colName), where("mssv", "==", mNum));
      const s3 = await getDocs(q3);
      if (!s3.empty) return s3.docs[0];

      const q4 = query(collection(db, colName), where("MSSV", "==", mNum));
      const s4 = await getDocs(q4);
      if (!s4.empty) return s4.docs[0];
    }
    return null;
  };

  const handleConvertSoTheDang = async () => {
    if (!data || !data.cccd) {
      message.error("Đảng viên không có số CCCD để cấp!");
      return;
    }
    
    try {
      setSaving(true);
      const cccdVal = String(data.cccd).trim();
      const mssvStr = String(data.mssv).trim();
      
      // Update dang_vien
      await updateDoc(doc(db, "dang_vien", data.id), {
        so_the_dang: cccdVal,
        updated_at: new Date().toISOString()
      });
      
      // Sync to dang_vien_dang_sinh_hoat
      const dshDoc = await findDocByMssv("dang_vien_dang_sinh_hoat", mssvStr);
      if (dshDoc) {
        await updateDoc(doc(db, "dang_vien_dang_sinh_hoat", dshDoc.id), {
          so_qd: cccdVal,
          updated_at: new Date().toISOString()
        });
      }
      
      message.success("Cấp thẻ Đảng từ số CCCD thành công!");
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Lỗi khi cấp thẻ Đảng từ CCCD:", err);
      message.error("Lỗi khi cấp thẻ Đảng từ số CCCD");
    } finally {
      setSaving(false);
    }
  };
  
  const watchTinhTpTt = Form.useWatch('tinh_tp_tt', form);
  const watchTinhTpQq = Form.useWatch('tinh_tp_qq', form);
  const watchTinhTpQqCu = Form.useWatch('tinh_tp_qq_cu', form);
  const watchTinhTpTtCu = Form.useWatch('tinh_tp_tt_cu', form);
  const watchTinhTpTamTru = Form.useWatch('tinh_tp_tam_tru', form);
  const watchQuanHuyenQqCu = Form.useWatch('quan_huyen_qq_cu', form);
  const watchQuanHuyenTtCu = Form.useWatch('quan_huyen_tt_cu', form);
  const isDuBiWatch = Form.useWatch('dang_vien_du_bi', form);
  const shouldHideOfficialDetails = editMode ? isDuBiWatch : data?.dang_vien_du_bi;

  // Watch for form changes to disable save button if no changes
  const [isModified, setIsModified] = useState(false);

  useEffect(() => {
    if (open && data) {
      setEditMode(false);
      setIsModified(false);
      setActiveTab("info");
      const ngayVaoDang = safeDayjs(data.ngay_vao_dang);
      let ngayChinhThuc = safeDayjs(data.ngay_chinh_thuc || data.ngay_cong_nhan_dvct);
      
      // If the member is official (dang_vien_du_bi === false) but official date is missing/invalid, auto-fallback to entry date + 1 year
      if (!data.dang_vien_du_bi && !ngayChinhThuc && ngayVaoDang) {
        ngayChinhThuc = ngayVaoDang.add(1, 'year');
      }

      form.setFieldsValue({
        ...data,
        tinh_tp_tam_tru: data.tinh_tp_tam_tru || 'Đà Nẵng',
        ngay_sinh: safeDayjs(data.ngay_sinh),
        ngay_vao_dang: ngayVaoDang,
        ngay_chuyen_vao: safeDayjs(data.ngay_chuyen_vao),
        ngay_chinh_thuc: ngayChinhThuc,
        ngay_chuyen_ra: safeDayjs(data.ngay_chuyen_ra),
        ngaykiqd: safeDayjs(data.ngaykiqd),
      });
      fetchHistoryLogs();
      fetchTransferProcess();
    }
  }, [open, data, form]);

  const handleClose = () => {
    if (editMode && isModified) {
      Modal.confirm({
        title: 'Bạn có thay đổi chưa lưu',
        icon: <ExclamationCircleOutlined />,
        content: 'Bạn có chắc chắn muốn đóng và hủy bỏ các thay đổi?',
        okText: 'Đóng',
        cancelText: 'Tiếp tục sửa',
        onOk: () => {
          setEditMode(false);
          setIsModified(false);
          onClose();
        }
      });
    } else {
      setEditMode(false);
      setIsModified(false);
      onClose();
    }
  };

  const handleCancelEdit = () => {
    form.setFieldsValue({
      ...data,
      tinh_tp_tam_tru: data.tinh_tp_tam_tru || 'Đà Nẵng',
      ngay_sinh: data.ngay_sinh ? dayjs(data.ngay_sinh) : null,
      ngay_vao_dang: data.ngay_vao_dang ? dayjs(data.ngay_vao_dang) : null,
      ngay_chuyen_vao: data.ngay_chuyen_vao ? dayjs(data.ngay_chuyen_vao) : null,
      ngay_chinh_thuc: data.ngay_chinh_thuc ? dayjs(data.ngay_chinh_thuc) : null,
      ngay_chuyen_ra: data.ngay_chuyen_ra ? dayjs(data.ngay_chuyen_ra) : null,
      ngaykiqd: data.ngaykiqd ? dayjs(data.ngaykiqd) : null,
    });
    setEditMode(false);
    setIsModified(false);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      
      // Validation: MSSV Unique (checking both string/number and lower/upper case)
      const mssvStr = String(values.mssv).trim();
      const originalMssvStr = String(data.mssv).trim();
      
      if (mssvStr !== originalMssvStr) {
        // Helper function to find a document with MSSV in a specific collection
        const findDocByMssv = async (colName, mStr) => {
          const mNum = Number(mStr);
          // 1. lowercase "mssv" - string
          const q1 = query(collection(db, colName), where("mssv", "==", mStr));
          const s1 = await getDocs(q1);
          if (!s1.empty) return s1.docs[0];

          // 2. uppercase "MSSV" - string
          const q2 = query(collection(db, colName), where("MSSV", "==", mStr));
          const s2 = await getDocs(q2);
          if (!s2.empty) return s2.docs[0];

          if (!isNaN(mNum)) {
            // 3. lowercase "mssv" - number
            const q3 = query(collection(db, colName), where("mssv", "==", mNum));
            const s3 = await getDocs(q3);
            if (!s3.empty) return s3.docs[0];

            // 4. uppercase "MSSV" - number
            const q4 = query(collection(db, colName), where("MSSV", "==", mNum));
            const s4 = await getDocs(q4);
            if (!s4.empty) return s4.docs[0];
          }
          return null;
        };

        const existingDvDoc = await findDocByMssv("dang_vien", mssvStr);
        if (existingDvDoc && existingDvDoc.id !== data.id) {
          message.error("MSSV đã tồn tại trong hệ thống!");
          setSaving(false);
          return;
        }
      }
      values.mssv = mssvStr;

      const buildAddress = (tinh, huyen, xa, chiTiet) => {
        const parts = [];
        if (chiTiet) parts.push(chiTiet);
        if (xa) parts.push(xa);
        if (huyen) parts.push(huyen);
        if (tinh) parts.push(tinh);
        return parts.join(', ');
      };

      const queQuanMoi = buildAddress(values.tinh_tp_qq, null, values.xa_phuong_qq, null);
      const queQuanCu = buildAddress(values.tinh_tp_qq_cu, values.quan_huyen_qq_cu, values.xa_phuong_qq_cu, null);
      const queQuan = queQuanCu ? `${queQuanMoi} (Trước đây là ${queQuanCu})` : queQuanMoi;

      const thuongTruMoi = buildAddress(values.tinh_tp_tt, null, values.xa_phuong_tt, values.chi_tiet_dc);
      const thuongTruCu = buildAddress(values.tinh_tp_tt_cu, values.quan_huyen_tt_cu, values.xa_phuong_tt_cu, values.chi_tiet_tt_cu);
      const diaChiThuongTru = thuongTruCu ? `${thuongTruMoi} (Trước đây là ${thuongTruCu})` : thuongTruMoi;

      const tamTruMoi = buildAddress(values.tinh_tp_tam_tru, null, values.xa_phuong_tam_tru, values.chi_tiet_tam_tru);
      const diaChiTamTru = tamTruMoi;

      let chiTiet = values.chi_tiet_dc;
      if (!chiTiet) {
        const parts = [];
        if (values.xa_phuong_tt) parts.push(values.xa_phuong_tt);
        if (values.tinh_tp_tt) parts.push(values.tinh_tp_tt);
        chiTiet = parts.join(", ");
      }

      // Format dates
      const formatted = {
        ...values,
        chi_tiet_dc: chiTiet,
        que_quan: queQuan,
        dia_chi_thuong_tru: diaChiThuongTru,
        dia_chi_tam_tru: diaChiTamTru,
        ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : null,
        ngay_vao_dang: values.ngay_vao_dang ? values.ngay_vao_dang.format('YYYY-MM-DD') : null,
        ngay_chuyen_vao: values.ngay_chuyen_vao ? values.ngay_chuyen_vao.format('YYYY-MM-DD') : null,
        ngay_chinh_thuc: values.ngay_chinh_thuc ? values.ngay_chinh_thuc.format('YYYY-MM-DD') : null,
        ngay_chuyen_ra: values.ngay_chuyen_ra ? values.ngay_chuyen_ra.format('YYYY-MM-DD') : null,
        ngaykiqd: values.ngaykiqd ? values.ngaykiqd.format('YYYY-MM-DD') : null,
        dang_vien_du_bi: !!values.dang_vien_du_bi
      };

      // Firestore throws error if undefined is passed. Remove undefined properties.
      Object.keys(formatted).forEach(key => {
        if (formatted[key] === undefined) {
          delete formatted[key];
        }
      });

      // So sánh tìm các trường thông tin thay đổi để ghi log lịch sử
      const changes = [];
      Object.keys(formatted).forEach(key => {
        if (key === 'updated_at' || key === 'id') return;
        const newVal = formatted[key];
        const oldVal = data[key];
        
        let strOld = oldVal !== undefined && oldVal !== null ? String(oldVal).trim() : "";
        let strNew = newVal !== undefined && newVal !== null ? String(newVal).trim() : "";
        
        if (key === 'dang_vien_du_bi') {
          if (!!oldVal !== !!newVal) {
            changes.push({
              field: key,
              label: FIELD_LABELS[key] || key,
              oldVal: !!oldVal ? "Dự bị" : "Chính thức",
              newVal: !!newVal ? "Dự bị" : "Chính thức"
            });
          }
        } else if (strOld !== strNew) {
          changes.push({
            field: key,
            label: FIELD_LABELS[key] || key,
            oldVal: oldVal !== undefined && oldVal !== null ? oldVal : "",
            newVal: newVal !== undefined && newVal !== null ? newVal : ""
          });
        }
      });

      if (changes.length > 0) {
        await addDoc(collection(db, "lich_su_cap_nhat"), {
          dang_vien_id: data.id || '',
          mssv: data.mssv || '',
          ho_ten: data.ho_ten || '',
          updated_by: currentUser?.email || currentUser?.username || "Hệ thống",
          updated_at: new Date().toISOString(),
          changes: changes
        });
      }

      if (collectionName === "ho_so_ket_nap") {
        const mappedBack = {
          mssv: formatted.mssv || '',
          cccd: formatted.cccd || '',
          hoten: formatted.ho_ten || '',
          lop: formatted.lop || '',
          khoa: formatted.khoa || '',
          ngaysinh: formatted.ngay_sinh || null,
          gioitinh: formatted.gioi_tinh || 'Nam',
          quequan: formatted.que_quan || '',
          email: formatted.email || '',
          link_fb: formatted.facebook || '',
          sdt: formatted.so_dien_thoai || '',
          dangvienhuongdan: formatted.dvhd || '',
          ngayvaodang: formatted.ngay_vao_dang || null,
          soqd: formatted.soqd || '',
          ngaykiqd: formatted.ngaykiqd || null,
          updated_at: new Date().toISOString()
        };
        await updateDoc(doc(db, "ho_so_ket_nap", data.id), mappedBack);
      } else {
        const updateData = {
          ...formatted,
          soqd: formatted.soqd || '',
          so_qd: formatted.soqd || '',
          ngaykiqd: formatted.ngaykiqd || null,
          ngay_ki_qd: formatted.ngaykiqd || null,
        };
        await updateDoc(doc(db, collectionName, data.id), updateData);
      }
      fetchHistoryLogs();

      // Relational sync for transferred members
      if (data.trang_thai === 'da_chuyen') {
        try {
          const q = query(collection(db, "chuyen_sinh_hoat"), where("dang_vien_id", "==", data.id));
          const snapshot = await getDocs(q);
          const transferData = {
            dang_vien_id: data.id,
            ngay_chuyen: formatted.ngay_chuyen_ra || null,
            noi_chuyen: formatted.noi_chuyen_ra || '',
            ghi_chu: formatted.ghi_chu_chuyen || '',
            updated_at: new Date().toISOString()
          };
          if (!snapshot.empty) {
            const transferDocId = snapshot.docs[0].id;
            await updateDoc(doc(db, "chuyen_sinh_hoat", transferDocId), transferData);
          } else {
            await addDoc(collection(db, "chuyen_sinh_hoat"), transferData);
          }
        } catch (err) {
          console.error("Lỗi đồng bộ chuyen_sinh_hoat:", err);
        }
      }

      message.success("Cập nhật thành công");
      setEditMode(false);
      setIsModified(false);
      onUpdate(); // refresh table
    } catch (e) {
      console.error(e);
      if(!e.errorFields) message.error("Lỗi khi cập nhật: " + (e.message || e.toString()));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "dang_vien", data.id));
      // Delete corresponding transfer records too
      try {
        const q = query(collection(db, "chuyen_sinh_hoat"), where("dang_vien_id", "==", data.id));
        const snapshot = await getDocs(q);
        await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, "chuyen_sinh_hoat", d.id))));
      } catch (err) {}
      
      message.success('Xóa Đảng viên thành công');
      onClose();
      onUpdate();
    } catch (error) {
      message.error('Lỗi khi xóa Đảng viên');
    }
  };

  const handleTransfer = async () => {
    try {
      const values = await transferForm.validateFields();
      const formattedDate = values.ngay_chuyen ? values.ngay_chuyen.format('YYYY-MM-DD') : null;
      const transferData = {
        dang_vien_id: data.id,
        ngay_chuyen: formattedDate,
        noi_chuyen: values.noi_chuyen,
        ghi_chu: values.ghi_chu || "",
      };
      
      await addDoc(collection(db, "chuyen_sinh_hoat"), transferData);
      await updateDoc(doc(db, "dang_vien", data.id), { 
        trang_thai: "da_chuyen",
        ngay_chuyen_ra: formattedDate,
        noi_chuyen_ra: values.noi_chuyen,
        ghi_chu_chuyen: values.ghi_chu || ""
      });
      
      message.success('Chuyển sinh hoạt thành công');
      setIsTransferModalVisible(false);
      transferForm.resetFields();
      onClose();
      onUpdate();
    } catch (error) {
      if(!error.errorFields) message.error('Lỗi khi chuyển sinh hoạt');
    }
  };

  const handleTempTransfer = async () => {
    try {
      const values = await tempTransferForm.validateFields();
      setSaving(true);
      
      const formattedDate = values.ngay_chuyen_tam_thoi ? values.ngay_chuyen_tam_thoi.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0];
      
      // 1. Add record to chuyen_tam_thoi
      await addDoc(collection(db, "chuyen_tam_thoi"), {
        dang_vien_id: data.id,
        mssv: data.mssv,
        ho_ten: data.ho_ten,
        lop: data.lop || '',
        khoa: data.khoa || '',
        ngay_chuyen_tam_thoi: formattedDate,
        thoi_gian_ve: values.thoi_gian_ve || '',
        noi_chuyen_den_tam_thoi: values.noi_chuyen_den_tam_thoi || '',
        ngay_chuyen_ve: null,
        ghi_chu: values.ghi_chu || '',
        trang_thai: 'dang_di',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // 2. Update member dang_vien status
      await updateDoc(doc(db, "dang_vien", data.id), {
        trang_thai_tam_thoi: "dang_di_tam_thoi",
        updated_at: new Date().toISOString()
      });
      
      // 3. Write audit log
      await addDoc(collection(db, "lich_su_cap_nhat"), {
        dang_vien_id: data.id,
        mssv: data.mssv,
        ho_ten: data.ho_ten,
        updated_by: currentUser?.email || currentUser?.username || "Hệ thống",
        updated_at: new Date().toISOString(),
        action: "update",
        changes: [
          {
            field: "trang_thai_tam_thoi",
            label: "Trạng thái sinh hoạt tạm thời",
            oldVal: "Đang sinh hoạt bình thường",
            newVal: `Đi sinh hoạt tạm thời tại: ${values.noi_chuyen_den_tam_thoi} (Thời gian về: ${values.thoi_gian_ve})`
          }
        ]
      });
      
      message.success(`Đã chuyển sinh hoạt tạm thời Đảng viên ${data.ho_ten} thành công.`);
      setIsTempTransferModalVisible(false);
      tempTransferForm.resetFields();
      
      if (onUpdate) onUpdate();
      fetchHistoryLogs();
      onClose(); // Close drawer after action
    } catch (error) {
      if (error.name === 'ValidationError') return;
      message.error("Lỗi khi chuyển sinh hoạt tạm thời: " + error.message);
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleTempReturn = async () => {
    try {
      const values = await tempReturnForm.validateFields();
      setSaving(true);
      
      const formattedDate = values.ngay_chuyen_ve ? values.ngay_chuyen_ve.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0];
      
      // 1. Find active chuyen_tam_thoi record
      const q = query(
        collection(db, "chuyen_tam_thoi"), 
        where("dang_vien_id", "==", data.id), 
        where("trang_thai", "==", "dang_di")
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const activeDocId = snapshot.docs[0].id;
        const activeDocData = snapshot.docs[0].data();
        
        // Update history log in chuyen_tam_thoi
        await updateDoc(doc(db, "chuyen_tam_thoi", activeDocId), {
          ngay_chuyen_ve: formattedDate,
          trang_thai: 'da_ve',
          updated_at: new Date().toISOString()
        });
        
        // 2. Restore active status of member
        await updateDoc(doc(db, "dang_vien", data.id), {
          trang_thai_tam_thoi: null,
          updated_at: new Date().toISOString()
        });
        
        // 3. Write audit log
        await addDoc(collection(db, "lich_su_cap_nhat"), {
          dang_vien_id: data.id,
          mssv: data.mssv,
          ho_ten: data.ho_ten,
          updated_by: currentUser?.email || currentUser?.username || "Hệ thống",
          updated_at: new Date().toISOString(),
          action: "update",
          changes: [
            {
              field: "trang_thai_tam_thoi",
              label: "Trạng thái sinh hoạt tạm thời",
              oldVal: `Đang đi sinh hoạt tạm thời tại: ${activeDocData.noi_chuyen_den_tam_thoi || 'nơi khác'}`,
              newVal: `Đã trở lại sinh hoạt Chi bộ (Ngày về: ${dayjs(formattedDate).format('DD/MM/YYYY')})`
            }
          ]
        });
        
        message.success(`Đồng chí ${data.ho_ten} đã trở lại sinh hoạt Chi bộ.`);
      } else {
        // Fallback: just restore active status if no log found
        await updateDoc(doc(db, "dang_vien", data.id), {
          trang_thai_tam_thoi: null,
          updated_at: new Date().toISOString()
        });
        message.success(`Khôi phục sinh hoạt bình thường cho đồng chí ${data.ho_ten}.`);
      }
      
      setIsTempReturnModalVisible(false);
      tempReturnForm.resetFields();
      
      if (onUpdate) onUpdate();
      fetchHistoryLogs();
      onClose(); // Close drawer after action
    } catch (error) {
      if (error.name === 'ValidationError') return;
      message.error("Lỗi khi xác nhận trở lại: " + error.message);
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const onValuesChange = () => {
    setIsModified(true);
  };

  if (!data) return null;

  const statusColor = data.dang_vien_du_bi ? 'orange' : 'green';
  const statusText = data.dang_vien_du_bi ? 'Đảng viên dự bị' : 'Đảng viên chính thức';

  const cardStyle = { 
    marginBottom: 20, 
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', 
    borderRadius: 8,
    border: '1px solid #f0f0f0'
  };
  
  const headStyle = { 
    borderBottom: '1px solid #f0f0f0', 
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    padding: '0 20px',
    minHeight: 48,
    fontSize: 16,
    color: '#c62828'
  };

  const getAvatarUrl = (url) => {
    if (!url) return undefined;
    const driveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)\//;
    const match = url.match(driveRegex);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w500`;
    }
    return url;
  };



  return (
    <Drawer
      title={<span style={{ color: '#c62828', fontWeight: 'bold' }}>Chi tiết Hồ sơ Đảng viên</span>}
      width={1000}
      open={open}
      onClose={handleClose}
      destroyOnClose
      maskClosable={!editMode}
      styles={{ body: { backgroundColor: '#f5f5f5', padding: '24px' } }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            {!editMode && (
              <PermissionWrapper module="members" action="delete">
                <Popconfirm title="Xóa Đảng viên này?" onConfirm={handleDelete} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                  <Button danger icon={<DeleteOutlined />}>Xóa hồ sơ</Button>
                </Popconfirm>
              </PermissionWrapper>
            )}
            {!editMode && data.trang_thai !== 'da_chuyen' && (
              <PermissionWrapper module="members" action="transfer">
                <Button onClick={() => setIsTransferModalVisible(true)} icon={<ExportOutlined />} style={{ color: '#d46b08', borderColor: '#d46b08' }}>Chuyển sinh hoạt</Button>
              </PermissionWrapper>
            )}
            {!editMode && data.trang_thai !== 'da_chuyen' && data.trang_thai_tam_thoi !== 'dang_di_tam_thoi' && (
              <PermissionWrapper module="members" action="transfer">
                <Button onClick={() => setIsTempTransferModalVisible(true)} icon={<SwapOutlined />} style={{ color: '#13c2c2', borderColor: '#13c2c2' }}>Chuyển sinh hoạt tạm thời</Button>
              </PermissionWrapper>
            )}
            {!editMode && data.trang_thai !== 'da_chuyen' && data.trang_thai_tam_thoi === 'dang_di_tam_thoi' && (
              <PermissionWrapper module="members" action="transfer">
                <Button onClick={() => setIsTempReturnModalVisible(true)} icon={<CheckCircleOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a' }}>Xác nhận trở lại</Button>
              </PermissionWrapper>
            )}
            {!editMode && data.trang_thai === 'da_chuyen' && (
              <PermissionWrapper module="members" action="transfer">
                <Popconfirm 
                  title="Khôi phục Đảng viên này về trạng thái Đang sinh hoạt?" 
                  onConfirm={async () => {
                    try {
                      await updateDoc(doc(db, "dang_vien", data.id), { 
                        trang_thai: "dang_sinh_hoat",
                        updated_at: new Date().toISOString()
                      });
                      // Delete corresponding transfer records to keep in sync
                      try {
                        const q = query(collection(db, "chuyen_sinh_hoat"), where("dang_vien_id", "==", data.id));
                        const snapshot = await getDocs(q);
                        await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, "chuyen_sinh_hoat", d.id))));
                      } catch (err) {}
                      
                      message.success('Khôi phục Đảng viên thành công');
                      onClose();
                      onUpdate();
                    } catch (error) {
                      message.error('Lỗi khi khôi phục trạng thái');
                    }
                  }} 
                  okText="Đồng ý" 
                  cancelText="Hủy"
                >
                  <Button type="dashed" style={{ color: '#52c41a', borderColor: '#52c41a' }}>Khôi phục sinh hoạt</Button>
                </Popconfirm>
              </PermissionWrapper>
            )}
          </Space>
          <Space>
            {!editMode ? (
              <PermissionWrapper module="members" action="edit">
                <Popconfirm 
                  title={data.allow_self_edit ? "Khóa quyền tự chỉnh sửa của Đảng viên này?" : "Mở khóa cho Đảng viên này tự chỉnh sửa hồ sơ?"} 
                  onConfirm={async () => {
                    try {
                      await updateDoc(doc(db, "dang_vien", data.id), { allow_self_edit: !data.allow_self_edit });
                      message.success(data.allow_self_edit ? "Đã khóa quyền tự sửa" : "Đã cấp quyền tự sửa");
                      if (onUpdate) onUpdate();
                      onClose();
                    } catch (e) {
                      message.error("Lỗi khi cập nhật quyền");
                    }
                  }} 
                  okText="Đồng ý" 
                  cancelText="Hủy"
                >
                  <Button type={data.allow_self_edit ? "default" : "dashed"} style={{height: 38, borderColor: data.allow_self_edit ? undefined : '#1890ff', color: data.allow_self_edit ? undefined : '#1890ff'}}>
                    {data.allow_self_edit ? 'Khóa quyền tự sửa' : 'Cấp quyền tự sửa'}
                  </Button>
                </Popconfirm>
                <Button type="primary" icon={<EditOutlined />} onClick={() => setEditMode(true)} style={{backgroundColor: '#c62828', height: 38, padding: '0 24px', borderRadius: 6}}>Chỉnh sửa hồ sơ</Button>
              </PermissionWrapper>
            ) : (
              <>
                <Button icon={<CloseOutlined />} onClick={handleCancelEdit} style={{height: 38, borderRadius: 6}}>Hủy</Button>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={!isModified} style={{backgroundColor: '#c62828', height: 38, padding: '0 24px', borderRadius: 6}}>Lưu thay đổi</Button>
              </>
            )}
          </Space>
        </div>
      }
    >
      <FieldContext.Provider value={{ data, editMode, currentUser, form, setIsModified, collectionName }}>
      <Row gutter={24}>
        {/* LEFT SIDE: ID Card Profile */}
        <Col span={7}>
          <div style={{ 
            backgroundColor: '#ffffff',
            borderRadius: 12, 
            padding: '32px 20px', 
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
            border: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0
          }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
              <Avatar 
                size={140} 
                icon={<UserOutlined />} 
                src={getAvatarUrl(watchAvatar || data.anh_ca_nhan)} 
                style={{ 
                  border: '3px solid #c62828', 
                  boxShadow: '0 8px 16px rgba(198, 40, 40, 0.15)' 
                }} 
              />
              {editMode && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    id="drawer-avatar-upload"
                    style={{ display: 'none' }}
                    onChange={handleAvatarUpload}
                  />
                  <Tooltip title="Tải lên ảnh đại diện mới">
                    <Button
                      type="primary"
                      shape="circle"
                      icon={<CameraOutlined />}
                      onClick={() => document.getElementById('drawer-avatar-upload').click()}
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 8,
                        backgroundColor: '#c62828',
                        borderColor: '#c62828',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                        zIndex: 10
                      }}
                    />
                  </Tooltip>
                </>
              )}
            </div>
            
            <Title level={3} style={{ color: '#262626', marginBottom: 12, marginTop: 0 }}>
              {data.ho_ten}
            </Title>
            
            <div style={{ 
              backgroundColor: statusColor === 'orange' ? '#fff7e6' : '#f6ffed', 
              color: statusColor === 'orange' ? '#d46b08' : '#389e0d',
              border: `1px solid ${statusColor === 'orange' ? '#ffd591' : '#b7eb8f'}`,
              padding: '6px 18px',
              borderRadius: 20,
              display: 'inline-block',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              marginBottom: 28
            }}>
              {statusText}
            </div>

            <div style={{ textAlign: 'left', padding: '0 12px' }}>
              <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center' }}>
                <IdcardOutlined style={{ fontSize: 20, color: '#c62828', marginRight: 14, width: 20 }} />
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>MSSV</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#262626' }}>{data.mssv || '--'}</div>
                </div>
              </div>
              
              <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center' }}>
                <TeamOutlined style={{ fontSize: 20, color: '#c62828', marginRight: 14, width: 20 }} />
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>Nhóm sinh hoạt</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#262626' }}>{data.nhom || '--'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <PhoneOutlined style={{ fontSize: 20, color: '#c62828', marginRight: 14, width: 20 }} />
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>Số điện thoại</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#262626' }}>{data.so_dien_thoai || '--'}</div>
                </div>
              </div>
            </div>
          </div>
        </Col>

        <Col span={17}>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            type="line"
            size="large"
            style={{ marginBottom: 16 }}
          >
            <TabPane tab="Thông tin chi tiết" key="info">
              <Form form={form} layout="vertical" onValuesChange={onValuesChange}>
                <Card title={<><IdcardOutlined style={{marginRight: 8}}/> Thông tin cá nhân</>} bordered={false} style={cardStyle} headStyle={headStyle}>
                  <Row gutter={16}>
                    <Field name="mssv" label="MSSV" rules={[{ required: true, message: 'Bắt buộc' }]} span={12}><Input size="large" /></Field>
                    <Field name="cccd" label="CCCD" rules={[{ required: true, message: 'Bắt buộc' }]} span={12}><Input size="large" /></Field>
                  </Row>
                  <Row gutter={16}>
                    <Field name="ho_ten" label="Họ và tên" rules={[{ required: true, message: 'Bắt buộc' }]} span={24}><Input size="large" /></Field>
                  </Row>
                  <Row gutter={16}>
                    <Field name="ngay_sinh" label="Ngày sinh" span={6}><DatePicker style={{width:'100%'}} format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" size="large" /></Field>
                    <Field name="gioi_tinh" label="Giới tính" span={6}><Select size="large"><Option value="Nam">Nam</Option><Option value="Nữ">Nữ</Option></Select></Field>
                    <Field name="dan_toc" label="Dân tộc" span={6}>
                      <Select showSearch size="large" allowClear placeholder="Chọn Dân tộc" filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                        {DAN_TOC.map(item => <Option key={item} value={item}>{item}</Option>)}
                      </Select>
                    </Field>
                    <Field name="ton_giao" label="Tôn giáo" span={6}>
                      <Select showSearch size="large" allowClear placeholder="Chọn Tôn giáo" filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                        {TON_GIAO.map(item => <Option key={item} value={item}>{item}</Option>)}
                      </Select>
                    </Field>
                  </Row>
                  <Row gutter={16}>
                    <Field name="anh_ca_nhan" label="Link ảnh cá nhân (Google Drive / Web)" span={24}><Input size="large" placeholder="Nhập link ảnh từ Google Drive hoặc link trực tiếp" /></Field>
                  </Row>
                </Card>

                <Card title={<><BookOutlined style={{marginRight: 8}}/> Học tập & Tổ chức</>} bordered={false} style={cardStyle} headStyle={headStyle}>
                  <Row gutter={16}>
                    <Field name="lop" label="Lớp" span={8}><Input size="large" /></Field>
                    <Field name="khoa" label="Khoa" span={8}>
                      <Select showSearch size="large" allowClear placeholder="Chọn Khoa" filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                        {KHOA.map(item => <Option key={item} value={item}>{item}</Option>)}
                      </Select>
                    </Field>
                    <Field name="nhom" label="Nhóm sinh hoạt" span={8}>
                      <Select showSearch size="large" allowClear placeholder="Chọn Nhóm">
                        {NHOM.map(item => <Option key={item} value={item}>{item}</Option>)}
                      </Select>
                    </Field>
                  </Row>
                </Card>

                <Card title={<><StarOutlined style={{marginRight: 8}}/> Thông tin Đảng</>} bordered={false} style={cardStyle} headStyle={headStyle}>
                  <Row gutter={16}>
                    <Field name="ngay_vao_dang" label="Ngày vào Đảng" span={12}><DatePicker style={{width:'100%'}} format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" size="large" onChange={(date) => { if (date) form.setFieldsValue({ ngay_chinh_thuc: date.add(1, 'year') }); setIsModified(true); }} /></Field>
                    <Col span={12}>
                      {editMode ? (
                        <Form.Item name="dang_vien_du_bi" valuePropName="checked" style={{ marginBottom: 12, marginTop: 30 }}>
                          <Checkbox style={{ fontSize: 15 }}>Là Đảng viên dự bị</Checkbox>
                        </Form.Item>
                      ) : (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 4 }}>Phân loại</div>
                          <div style={{ fontWeight: 500, fontSize: 15, color: '#262626' }}>{data.dang_vien_du_bi ? "Dự bị" : "Chính thức"}</div>
                        </div>
                      )}
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Field name="ngay_chuyen_vao" label="Ngày chuyển vào Chi bộ" span={12}><DatePicker style={{width:'100%'}} format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" size="large"/></Field>
                    <Field name="noi_chuyen_di" label="Nơi chuyển đi (Nơi sinh hoạt cũ)" span={12}><Input size="large" /></Field>
                  </Row>
                  {/* Quyết định kết nạp (Always show this since both probationary, official, and ho_so_ket_nap have an admission decision!) */}
                  <Row gutter={16}>
                    <Field name="ngaykiqd" label="Ngày ký quyết định kết nạp" span={12} 
                       rules={[
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            const vaoDang = getFieldValue('ngay_vao_dang');
                            if (!value || !vaoDang || value.isBefore(vaoDang) || value.isSame(vaoDang)) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('Ngày ký quyết định phải trước hoặc bằng ngày vào Đảng'));
                          },
                        }),
                       ]}
                    ><DatePicker style={{width:'100%'}} format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" size="large"/></Field>
                    <Field name="soqd" label="Số quyết định kết nạp" span={12}><Input size="large" /></Field>
                  </Row>
                  
                  {/* Official membership details (Only show if not probationary) */}
                  {!shouldHideOfficialDetails && (
                    <Row gutter={16}>
                      <Field name="ngay_chinh_thuc" label="Ngày chính thức" span={12} 
                         rules={[
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              const vaoDang = getFieldValue('ngay_vao_dang');
                              if (!value || !vaoDang || value.isAfter(vaoDang)) {
                                return Promise.resolve();
                              }
                              return Promise.reject(new Error('Ngày chính thức phải lớn hơn ngày vào'));
                            },
                          }),
                         ]}
                      ><DatePicker style={{width:'100%'}} format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" size="large"/></Field>
                      <Field name="so_the_dang" label="Số thẻ Đảng" span={12}><Input size="large" /></Field>
                    </Row>
                  )}
                  <Row gutter={16}>
                    <Field name="dvhd" label="Đảng viên hướng dẫn" span={24}><Input size="large" /></Field>
                  </Row>
                </Card>

                {data.trang_thai === 'da_chuyen' && (
                  <Card title={<><ExportOutlined style={{marginRight: 8}}/> Thông tin chuyển sinh hoạt</>} bordered={false} style={cardStyle} headStyle={headStyle}>
                    <Row gutter={16}>
                      <Field name="ngay_chuyen_ra" label="Ngày chuyển ra" span={12}>
                        <DatePicker style={{width:'100%'}} format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" size="large"/>
                      </Field>
                      <Field name="noi_chuyen_ra" label="Nơi chuyển ra" span={12}>
                        <Input size="large" />
                      </Field>
                    </Row>
                    <Row gutter={16}>
                      <Field name="ghi_chu_chuyen" label="Ghi chú chuyển sinh hoạt" span={24}>
                        <Input.TextArea rows={3} size="large" />
                      </Field>
                    </Row>
                  </Card>
                )}



                <Card title={<><PhoneOutlined style={{marginRight: 8}}/> Liên hệ</>} bordered={false} style={cardStyle} headStyle={headStyle}>
                  <Row gutter={16}>
                    <Field name="so_dien_thoai" label="SĐT" rules={[{ pattern: /^[0-9]+$/, message: 'SĐT không hợp lệ' }]} span={12}><Input size="large" /></Field>
                    <Field name="facebook" label="Facebook" span={12}><Input size="large" /></Field>
                  </Row>
                  <Row gutter={16}>
                    <Field name="email" label="Email cá nhân" rules={[{ type: 'email', message: 'Email không hợp lệ' }]} span={12}><Input size="large" /></Field>
                    <Field name="email_sv" label="Email SV" rules={[{ type: 'email', message: 'Email không hợp lệ' }]} span={12}><Input size="large" /></Field>
                  </Row>
                </Card>

                <Card title={<><HomeOutlined style={{marginRight: 8}}/> Địa chỉ</>} bordered={false} style={cardStyle} headStyle={headStyle}>
                  <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Quê quán</Divider>
                  <Row gutter={16}>
                    <Field name="tinh_tp_qq" label="Tỉnh/TP quê quán" span={12}>
                       <AddressProvinceSelect size="large" onChange={() => form.setFieldsValue({ xa_phuong_qq: undefined })} />
                    </Field>
                    <Field name="xa_phuong_qq" label="Xã/Phường quê quán" span={12}>
                       <AddressWardSelect province={watchTinhTpQq} />
                    </Field>
                  </Row>

                  <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Quê quán cũ (nếu có)</Divider>
                  <Row gutter={16}>
                    <Field name="tinh_tp_qq_cu" label="Tỉnh/TP quê quán cũ" span={8}>
                       <AddressProvinceSelect isOld={true} size="large" onChange={() => form.setFieldsValue({ quan_huyen_qq_cu: undefined, xa_phuong_qq_cu: undefined })} />
                    </Field>
                    <Field name="quan_huyen_qq_cu" label="Quận/Huyện quê quán cũ" span={8}>
                       <AddressDistrictSelect province={watchTinhTpQqCu} onChange={() => form.setFieldsValue({ xa_phuong_qq_cu: undefined })} size="large" />
                    </Field>
                    <Field name="xa_phuong_qq_cu" label="Xã/Phường quê quán cũ" span={8}>
                       <AddressWardSelect isOld={true} province={watchTinhTpQqCu} district={watchQuanHuyenQqCu} />
                    </Field>
                  </Row>

                  <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Địa chỉ thường trú</Divider>
                  <Row gutter={16}>
                    <Field name="chi_tiet_dc" label="Số nhà, tên đường, tổ dân phố, thôn, xóm..." span={24}>
                      <Input size="large" placeholder="Nhập số nhà, tên đường, tổ dân phố, thôn, xóm..." />
                    </Field>
                  </Row>
                  <Row gutter={16}>
                    <Field name="tinh_tp_tt" label="Tỉnh/TP thường trú" span={12}>
                       <AddressProvinceSelect size="large" onChange={() => form.setFieldsValue({ xa_phuong_tt: undefined })} />
                    </Field>
                    <Field name="xa_phuong_tt" label="Xã/Phường thường trú" span={12}>
                       <AddressWardSelect province={watchTinhTpTt} />
                    </Field>
                  </Row>

                  <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Thường trú cũ (nếu có)</Divider>
                  <Row gutter={16}>
                    <Field name="chi_tiet_tt_cu" label="Số nhà, tên đường, tổ dân phố, thôn, xóm cũ" span={24}>
                      <Input size="large" placeholder="Nhập số nhà, tên đường, tổ dân phố, thôn, xóm cũ..." />
                    </Field>
                  </Row>
                  <Row gutter={16}>
                    <Field name="tinh_tp_tt_cu" label="Tỉnh/TP thường trú cũ" span={8}>
                       <AddressProvinceSelect isOld={true} size="large" onChange={() => form.setFieldsValue({ quan_huyen_tt_cu: undefined, xa_phuong_tt_cu: undefined })} />
                    </Field>
                    <Field name="quan_huyen_tt_cu" label="Quận/Huyện thường trú cũ" span={8}>
                       <AddressDistrictSelect province={watchTinhTpTtCu} onChange={() => form.setFieldsValue({ xa_phuong_tt_cu: undefined })} size="large" />
                    </Field>
                    <Field name="xa_phuong_tt_cu" label="Xã/Phường thường trú cũ" span={8}>
                       <AddressWardSelect isOld={true} province={watchTinhTpTtCu} district={watchQuanHuyenTtCu} />
                    </Field>
                  </Row>

                  <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Địa chỉ tạm trú</Divider>
                  <Row gutter={16}>
                    <Field name="chi_tiet_tam_tru" label="Số nhà, tên đường, tổ dân phố, thôn, xóm..." span={24}>
                      <Input size="large" placeholder="Nhập số nhà, tên đường, tổ dân phố, thôn, xóm..." />
                    </Field>
                  </Row>
                  <Row gutter={16}>
                    <Field name="tinh_tp_tam_tru" label="Tỉnh/TP tạm trú" span={12}>
                       <AddressProvinceSelect size="large" onChange={() => form.setFieldsValue({ xa_phuong_tam_tru: undefined })} />
                    </Field>
                    <Field name="xa_phuong_tam_tru" label="Xã/Phường tạm trú" span={12}>
                       <AddressWardSelect province={watchTinhTpTamTru} />
                    </Field>
                  </Row>
                </Card>

                <Card title={<><TeamOutlined style={{marginRight: 8}}/> Gia đình</>} bordered={false} style={cardStyle} headStyle={headStyle}>
                  <Row gutter={16}>
                    <Field name="ho_ten_nguoi_than" label="Họ tên người thân" span={12}><Input size="large" /></Field>
                    <Field name="sdt_nguoi_than" label="SĐT người thân" span={12}><Input size="large" /></Field>
                  </Row>
                </Card>
              </Form>
            </TabPane>

            {transferProcess && (
              <TabPane tab="Tiến trình chuyển đi" key="transfer_progress" disabled={editMode}>
                {transferLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Spin tip="Đang tải tiến trình..." />
                  </div>
                ) : (
                  <Card bordered={false} style={cardStyle} headStyle={headStyle} title={<><SwapOutlined style={{marginRight: 8}}/> Tiến trình chuyển sinh hoạt Đảng</>}>
                    <div style={{ marginBottom: 20 }}>
                      <p><strong>Loại hình chuyển:</strong> {
                        transferProcess.loai_chuyen === 'chuyen_chinh_thuc' ? 'Chuyển ra đảng viên chính thức' :
                        transferProcess.loai_chuyen === 'chuyen_du_bi' ? 'Chuyển ra đảng viên dự bị' :
                        transferProcess.loai_chuyen === 'chuyen_tam_thoi' ? 'Chuyển sinh hoạt tạm thời' :
                        transferProcess.loai_chuyen === 'chuyen_ra' ? 'Chuyển ra chính thức' : 'Chuyển sinh hoạt'
                      }</p>
                      {transferProcess.ngay_nop_ho_so && <p><strong>Ngày nộp hồ sơ chuyển đi:</strong> {dayjs(transferProcess.ngay_nop_ho_so).format('DD/MM/YYYY')}</p>}
                      {transferProcess.noi_chuyen && <p><strong>Nơi chuyển đến:</strong> {transferProcess.noi_chuyen}</p>}
                      {transferProcess.noi_chuyen_ra && <p><strong>Nơi chuyển đến:</strong> {transferProcess.noi_chuyen_ra}</p>}
                      {transferProcess.ghi_chu && <p><strong>Ghi chú hồ sơ:</strong> {transferProcess.ghi_chu}</p>}
                      <p><strong>Trạng thái:</strong> {transferProcess.status === 'completed' ? <span style={{color: '#52c41a', fontWeight: 'bold'}}>Đã hoàn tất</span> : <span style={{color: '#1890ff', fontWeight: 'bold'}}>Đang xử lý</span>}</p>
                    </div>
                    
                    <Divider style={{ margin: '16px 0' }}>Lịch sử các bước</Divider>
                    
                    <Timeline mode="left" style={{ marginTop: 20 }}>
                      <Timeline.Item color="green" dot={<CheckCircleOutlined style={{ fontSize: '16px' }} />}>
                        <div>
                          <strong>Bước 1: Nhận hồ sơ chuyển đi</strong>
                          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                            {transferProcess.ngay_nop_ho_so ? dayjs(transferProcess.ngay_nop_ho_so).format('DD/MM/YYYY') : dayjs(transferProcess.created_at).format('DD/MM/YYYY')}
                          </div>
                          {transferProcess.ghi_chu && <div style={{ marginTop: 4, fontStyle: 'italic' }}>Ghi chú: {transferProcess.ghi_chu}</div>}
                        </div>
                      </Timeline.Item>
                      
                      <Timeline.Item 
                        color={transferProcess.buoc >= 2 ? "green" : "gray"}
                        dot={transferProcess.buoc >= 2 ? <CheckCircleOutlined style={{ fontSize: '16px' }} /> : <ClockCircleOutlined style={{ fontSize: '16px' }} />}
                      >
                        <div>
                          <strong>Bước 2: Gửi hồ sơ lên Văn phòng Đảng ủy Trường (VPĐU)</strong>
                          {transferProcess.ngay_hoan_thien_gui_vpdu && (
                            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                              Ngày hoàn thành: {dayjs(transferProcess.ngay_hoan_thien_gui_vpdu).format('DD/MM/YYYY')}
                            </div>
                          )}
                          {transferProcess.history && transferProcess.history.find(h => h.step === 2) && (
                            <div style={{ marginTop: 4, fontStyle: 'italic', color: '#555' }}>
                              Ghi chú chuyển bước: {transferProcess.history.find(h => h.step === 2).note}
                              {transferProcess.history.find(h => h.step === 2).updated_by && <span style={{ fontSize: '11px', color: '#8c8c8c' }}> (bởi {transferProcess.history.find(h => h.step === 2).updated_by})</span>}
                            </div>
                          )}
                        </div>
                      </Timeline.Item>

                      <Timeline.Item 
                        color={transferProcess.buoc >= 3 ? "green" : "gray"}
                        dot={transferProcess.buoc >= 3 ? <CheckCircleOutlined style={{ fontSize: '16px' }} /> : <ClockCircleOutlined style={{ fontSize: '16px' }} />}
                      >
                        <div>
                          <strong>Bước 3: VPĐU gửi hồ sơ lên Đảng ủy Đại học Đà Nẵng (ĐHĐN)</strong>
                          {transferProcess.ngay_gui_dhdn && (
                            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                              Ngày hoàn thành: {dayjs(transferProcess.ngay_gui_dhdn).format('DD/MM/YYYY')}
                            </div>
                          )}
                          {transferProcess.history && transferProcess.history.find(h => h.step === 3) && (
                            <div style={{ marginTop: 4, fontStyle: 'italic', color: '#555' }}>
                              Ghi chú chuyển bước: {transferProcess.history.find(h => h.step === 3).note}
                              {transferProcess.history.find(h => h.step === 3).updated_by && <span style={{ fontSize: '11px', color: '#8c8c8c' }}> (bởi {transferProcess.history.find(h => h.step === 3).updated_by})</span>}
                            </div>
                          )}
                        </div>
                      </Timeline.Item>

                      {transferProcess.status === 'completed' && (
                        <Timeline.Item color="green" dot={<CheckCircleOutlined style={{ fontSize: '16px' }} />}>
                          <div>
                            <strong>Bước 4: Hoàn tất thủ tục chuyển đi</strong>
                            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                              Ngày hoàn tất: {transferProcess.completed_at ? dayjs(transferProcess.completed_at).format('DD/MM/YYYY') : transferProcess.ngay_chuyen ? dayjs(transferProcess.ngay_chuyen).format('DD/MM/YYYY') : ''}
                            </div>
                            {transferProcess.history && transferProcess.history.find(h => h.step === 4) && (
                              <div style={{ marginTop: 4, fontStyle: 'italic', color: '#555' }}>
                                Ghi chú hoàn tất: {transferProcess.history.find(h => h.step === 4).note}
                                {transferProcess.history.find(h => h.step === 4).updated_by && <span style={{ fontSize: '11px', color: '#8c8c8c' }}> (bởi {transferProcess.history.find(h => h.step === 4).updated_by})</span>}
                              </div>
                            )}
                          </div>
                        </Timeline.Item>
                      )}
                    </Timeline>
                  </Card>
                )}
              </TabPane>
            )}

            <TabPane tab="Lịch sử cập nhật" key="history" disabled={editMode}>
              {historyLoading && historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Spin tip="Đang tải lịch sử..." />
                </div>
              ) : historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', background: '#ffffff', borderRadius: '8px', border: '1px solid #e8e8e8' }}>
                  <HistoryOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px' }} />
                  <div style={{ color: '#8c8c8c', fontSize: '14px' }}>Chưa có lịch sử cập nhật nào cho Đảng viên này.</div>
                </div>
              ) : (
                <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '8px 4px' }}>
                  <Timeline mode="left">
                    {historyLogs.map((log) => {
                      const isCreate = log.action === 'create';
                      return (
                        <Timeline.Item 
                          key={log.id} 
                          color={isCreate ? 'green' : 'orange'}
                          dot={isCreate ? <PlusOutlined style={{ fontSize: '16px' }} /> : <HistoryOutlined style={{ fontSize: '16px' }} />}
                        >
                          <Card 
                            size="small" 
                            style={{ 
                              borderRadius: '8px', 
                              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                              border: '1px solid #e8e8e8'
                            }}
                            bodyStyle={{ padding: '12px 16px' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #f0f0f0', paddingBottom: '6px' }}>
                              <span style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: 600 }}>
                                {isCreate ? 'Khởi tạo hồ sơ' : 'Cập nhật thông tin'}
                              </span>
                              <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                <ClockCircleOutlined style={{ marginRight: '4px' }} />
                                {dayjs(log.updated_at).format('DD/MM/YYYY HH:mm:ss')}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '8px' }}>
                              Người thực hiện: <strong style={{ color: '#555' }}>{log.updated_by}</strong>
                            </div>
                            {isCreate ? (
                              <div style={{ color: '#52c41a', fontWeight: 600, fontSize: '13px' }}>
                                ✓ Khởi tạo thông tin hồ sơ Đảng viên mới.
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {log.changes && log.changes.map((change, idx) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '13px' }}>
                                    <span style={{ fontWeight: 600, color: '#555', minWidth: '120px' }}>{change.label}:</span>
                                    <span style={{ color: '#bfbfbf', textDecoration: 'line-through' }}>{String(change.oldVal) || '(Trống)'}</span>
                                    <span style={{ color: '#faad14', fontWeight: 'bold' }}>➔</span>
                                    <span style={{ color: '#d46b08', fontWeight: 700, backgroundColor: '#fffbe6', padding: '1px 6px', borderRadius: '4px', border: '1px solid #ffe58f' }}>
                                      {String(change.newVal) || '(Trống)'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </Card>
                        </Timeline.Item>
                      );
                    })}
                  </Timeline>
                </div>
              )}
            </TabPane>
          </Tabs>
        </Col>
      </Row>

      <Modal
        title="Chuyển sinh hoạt Đảng"
        open={isTransferModalVisible}
        onOk={handleTransfer}
        onCancel={() => setIsTransferModalVisible(false)}
        okText="Xác nhận Chuyển"
        cancelText="Hủy"
        okButtonProps={{ style: { backgroundColor: '#faad14', borderColor: '#faad14' } }}
      >
        <Form form={transferForm} layout="vertical">
          <Form.Item name="ngay_chuyen" label="Ngày chuyển ra" rules={[{ required: true, message: 'Bắt buộc' }]}>
            <DatePicker format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="noi_chuyen" label="Nơi chuyển đến (Không bắt buộc)">
            <Input placeholder="Nhập nơi chuyển đến" />
          </Form.Item>
          <Form.Item name="ghi_chu" label="Ghi chú">
            <Input.TextArea placeholder="Nhập ghi chú" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Chuyển sinh hoạt tạm thời Đảng viên"
        open={isTempTransferModalVisible}
        onOk={handleTempTransfer}
        onCancel={() => {
          setIsTempTransferModalVisible(false);
          tempTransferForm.resetFields();
        }}
        okText="Xác nhận Chuyển"
        cancelText="Hủy"
        confirmLoading={saving}
        okButtonProps={{ style: { backgroundColor: '#13c2c2', borderColor: '#13c2c2' } }}
      >
        <Form form={tempTransferForm} layout="vertical">
          <div style={{ marginBottom: '16px', padding: '12px', background: '#e6fffb', border: '1px solid #b5f5ec', borderRadius: '6px' }}>
            Đang cấu hình chuyển tạm thời cho đồng chí: <strong>{data.ho_ten}</strong> (MSSV: {data.mssv})
          </div>
          <Form.Item name="ngay_chuyen_tam_thoi" label="Ngày chuyển đi tạm thời" rules={[{ required: true, message: 'Bắt buộc' }]}>
            <DatePicker format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="thoi_gian_ve" label="Thời gian về dự kiến (Không bắt buộc)">
            <Input placeholder="Ví dụ: 6 tháng, 1 năm,..." />
          </Form.Item>
          <Form.Item name="noi_chuyen_den_tam_thoi" label="Nơi chuyển đến tạm thời (Không bắt buộc)">
            <Input placeholder="Nhập tên chi bộ/cơ quan nơi sinh hoạt tạm thời" />
          </Form.Item>
          <Form.Item name="ghi_chu" label="Ghi chú">
            <Input.TextArea placeholder="Nhập ghi chú chi tiết nếu có" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Xác nhận Đảng viên trở lại sinh hoạt Chi bộ"
        open={isTempReturnModalVisible}
        onOk={handleTempReturn}
        onCancel={() => {
          setIsTempReturnModalVisible(false);
          tempReturnForm.resetFields();
        }}
        okText="Xác nhận trở lại"
        cancelText="Hủy"
        confirmLoading={saving}
        okButtonProps={{ style: { backgroundColor: '#52c41a', borderColor: '#52c41a' } }}
      >
        <Form form={tempReturnForm} layout="vertical">
          <div style={{ marginBottom: '16px', padding: '12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px' }}>
            Đang xác nhận trở lại cho đồng chí: <strong>{data.ho_ten}</strong> (MSSV: {data.mssv})
          </div>
          <Form.Item name="ngay_chuyen_ve" label="Ngày trở lại sinh hoạt thực tế" rules={[{ required: true, message: 'Vui lòng chọn ngày về thực tế' }]}>
            <DatePicker format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      </FieldContext.Provider>
    </Drawer>
  );
};

export default ProfileDrawer;
