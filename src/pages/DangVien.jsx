import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Input, Space, Typography, message, Select, Avatar, Tag, Popconfirm, Modal, Form, DatePicker, Card, Row, Col, Divider, Empty, Radio, Tabs, Checkbox, Tooltip, Dropdown } from 'antd';
const { TabPane } = Tabs;
import { PlusOutlined, EditOutlined, SearchOutlined, DownloadOutlined, UploadOutlined, UserOutlined, DeleteOutlined, ExportOutlined, FilterOutlined, CloseOutlined, FacebookOutlined, PhoneOutlined, MailOutlined, TeamOutlined, ContactsOutlined, SwapOutlined, CheckCircleOutlined, HistoryOutlined, EyeOutlined, FullscreenOutlined, FullscreenExitOutlined, FileZipOutlined } from '@ant-design/icons';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import DangVienForm from '../components/DangVienForm';
import ImportExcel from '../components/ImportExcel';
import ProfileDrawer from '../components/ProfileDrawer';
import * as XLSX from 'xlsx';
import debounce from 'lodash/debounce';
import dayjs from 'dayjs';
import PermissionWrapper from '../components/PermissionWrapper';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, permissionService } from '../services/permissionService';

const safeDayjs = (val) => {
  if (!val) return dayjs(null);
  if (val.toDate && typeof val.toDate === 'function') return dayjs(val.toDate());
  if (val.seconds) return dayjs(val.seconds * 1000);
  return dayjs(val);
};

const checkIsDuBi = (member) => {
  if (!member) return true;
  const getOfficialDate = () => {
    const date = member.ngay_cong_nhan_dvct || member.ngay_chinh_thuc;
    if (!date) return null;
    if (date.toDate && typeof date.toDate === 'function') return dayjs(date.toDate());
    if (date.seconds) return dayjs(date.seconds * 1000);
    return dayjs(date);
  };
  const officialDate = getOfficialDate();
  if (officialDate && officialDate.isValid()) {
    return officialDate.isAfter(dayjs(), 'day');
  }
  return member.dang_vien_du_bi !== false && member.loai_dang_vien !== "Chính thức";
};

const getFullAddress = (record) => {
  if (!record) return '';
  if (record.dia_chi_thuong_tru) return record.dia_chi_thuong_tru;
  const parts = [];
  if (record.chi_tiet_dc) parts.push(record.chi_tiet_dc);
  if (record.xa_phuong_tt) parts.push(record.xa_phuong_tt);
  if (record.quan_huyen_tt) parts.push(record.quan_huyen_tt);
  if (record.tinh_tp_tt) parts.push(record.tinh_tp_tt);
  return parts.join(', ');
};

const getFullHometown = (record) => {
  if (!record) return '';
  if (record.que_quan) return record.que_quan;
  const parts = [];
  if (record.xa_phuong_qq) parts.push(record.xa_phuong_qq);
  if (record.quan_huyen_qq) parts.push(record.quan_huyen_qq);
  if (record.tinh_tp_qq) parts.push(record.tinh_tp_qq);
  return parts.join(', ');
};

const getFullTamTru = (record) => {
  if (!record) return '';
  if (record.dia_chi_tam_tru) return record.dia_chi_tam_tru;
  const parts = [];
  if (record.chi_tiet_tam_tru) parts.push(record.chi_tiet_tam_tru);
  if (record.xa_phuong_tam_tru) parts.push(record.xa_phuong_tam_tru);
  if (record.quan_huyen_tam_tru) parts.push(record.quan_huyen_tam_tru);
  if (record.tinh_tp_tam_tru) parts.push(record.tinh_tp_tam_tru);
  return parts.join(', ');
};

const EXPORT_FIELDS = [
  { key: 'ho_ten', label: 'Họ tên', group: 'basic' },
  { key: 'mssv', label: 'MSSV', group: 'basic' },
  { key: 'ngay_sinh', label: 'Ngày sinh', group: 'basic', isDate: true },
  { key: 'gioi_tinh', label: 'Giới tính', group: 'basic' },
  { key: 'cccd', label: 'CCCD', group: 'basic' },
  { key: 'dan_toc', label: 'Dân tộc', group: 'basic' },
  { key: 'ton_giao', label: 'Tôn giáo', group: 'basic' },
  
  { key: 'lop', label: 'Lớp', group: 'org' },
  { key: 'khoa', label: 'Khoa', group: 'org' },
  { key: 'nhom', label: 'Nhóm sinh hoạt', group: 'org' },
  
  { key: 'so_dien_thoai', label: 'SĐT', group: 'contact' },
  { key: 'email', label: 'Email cá nhân', group: 'contact' },
  { key: 'email_sv', label: 'Email sinh viên', group: 'contact' },
  { key: 'facebook', label: 'Facebook', group: 'contact' },
  { key: 'dia_chi_tam_tru', label: 'Địa chỉ tạm trú', group: 'contact' },
  
  { key: 'dia_chi_thuong_tru', label: 'Địa chỉ thường trú', group: 'address' },
  { key: 'chi_tiet_dc', label: 'Chi tiết địa chỉ thường trú', group: 'address' },
  { key: 'xa_phuong_tt', label: 'Xã/phường thường trú', group: 'address' },
  { key: 'quan_huyen_tt', label: 'Quận/huyện thường trú', group: 'address' },
  { key: 'tinh_tp_tt', label: 'Tỉnh/TP thường trú', group: 'address' },
  { key: 'chi_tiet_tt_cu', label: 'Chi tiết thường trú cũ', group: 'address' },
  { key: 'xa_phuong_tt_cu', label: 'Xã/phường thường trú cũ', group: 'address' },
  { key: 'quan_huyen_tt_cu', label: 'Quận/huyện thường trú cũ', group: 'address' },
  { key: 'tinh_tp_tt_cu', label: 'Tỉnh/TP thường trú cũ', group: 'address' },
  { key: 'que_quan', label: 'Quê quán', group: 'address' },
  { key: 'xa_phuong_qq', label: 'Xã/phường quê quán', group: 'address' },
  { key: 'quan_huyen_qq', label: 'Quận/huyện quê quán', group: 'address' },
  { key: 'tinh_tp_qq', label: 'Tỉnh/TP quê quán', group: 'address' },
  { key: 'xa_phuong_qq_cu', label: 'Xã/phường quê quán cũ', group: 'address' },
  { key: 'quan_huyen_qq_cu', label: 'Quận/huyện quê quán cũ', group: 'address' },
  { key: 'tinh_tp_qq_cu', label: 'Tỉnh/TP quê quán cũ', group: 'address' },
  
  { key: 'ho_ten_nguoi_than', label: 'Họ tên người thân', group: 'family' },
  { key: 'sdt_nguoi_than', label: 'SĐT người thân', group: 'family' },
  
  { key: 'ngay_vao_dang', label: 'Ngày vào Đảng', group: 'party', isDate: true },
  { key: 'ngay_chinh_thuc', label: 'Ngày chính thức', group: 'party', isDate: true },
  { key: 'so_the_dang', label: 'Số thẻ Đảng', group: 'party' },
  { key: 'noi_chuyen_di', label: 'Nơi chuyển đi', group: 'party' },
  { key: 'ngay_chuyen_vao', label: 'Ngày chuyển vào', group: 'party', isDate: true },
  { key: 'dang_vien_du_bi', label: 'Loại Đảng viên (Dự bị / Chính thức)', group: 'party', isSpecial: 'type' },
  { key: 'trang_thai', label: 'Trạng thái sinh hoạt', group: 'party', isSpecial: 'status' },
  { key: 'dvhd', label: 'Đảng viên hướng dẫn', group: 'party' },
  { key: 'anh_ca_nhan', label: 'Link ảnh cá nhân', group: 'basic' }
];

const FIELD_GROUPS = {
  basic: { label: "Thông tin cơ bản", color: "blue" },
  org: { label: "Học tập & Tổ chức", color: "geekblue" },
  contact: { label: "Liên hệ & Tạm trú", color: "cyan" },
  address: { label: "Thường trú & Quê quán", color: "purple" },
  party: { label: "Thông tin Đảng tịch", color: "red" },
  family: { label: "Gia đình", color: "orange" }
};

const KHOA_LIST = [
  "P.CTSV", "Quản trị Kinh doanh", "Trung tâm Đào tạo Quốc tế", "Du lịch", "Marketing", 
  "Tài chính", "Ngân hàng", "Kinh tế", "Kế toán", "Luật", "Thống kê - Tin học", 
  "Thương mại điện tử", "Kinh doanh quốc tế", "Lý luận chính trị", "Khác"
];

const { Title, Text } = Typography;
const { Option } = Select;

const DangVien = () => {
  const { currentUser } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals/Drawers visibility
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isImportVisible, setIsImportVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isTransferVisible, setIsTransferVisible] = useState(false);
  const [transferForm] = Form.useForm();

  // Temporary activity transfer state variables
  const [isTempTransferVisible, setIsTempTransferVisible] = useState(false);
  const [tempTransferForm] = Form.useForm();
  const [isTempReturnVisible, setIsTempReturnVisible] = useState(false);
  const [tempReturnForm] = Form.useForm();
  const [selectedTempRecord, setSelectedTempRecord] = useState(null);
  const [tempTransferData, setTempTransferData] = useState([]);
  const [tempLoading, setTempLoading] = useState(false);
  const [tempSearchText, setTempSearchText] = useState("");
  const [tempFilterStatus, setTempFilterStatus] = useState("all"); // "all", "dang_di", "da_ve"
  const [isAllInfoVisible, setIsAllInfoVisible] = useState(false);

  // Excel custom export states
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [isExportingPhotos, setIsExportingPhotos] = useState(false);
  const [exportRange, setExportRange] = useState('filtered');
  const [selectedExportFields, setSelectedExportFields] = useState(EXPORT_FIELDS.map(f => f.key));

  const canCreate = useMemo(() => permissionService.hasActionAccess(currentUser?.role, 'members', 'create'), [currentUser?.role]);
  const canEdit = useMemo(() => permissionService.hasActionAccess(currentUser?.role, 'members', 'edit'), [currentUser?.role]);
  const canDelete = useMemo(() => permissionService.hasActionAccess(currentUser?.role, 'members', 'delete'), [currentUser?.role]);
  const canTransfer = useMemo(() => permissionService.hasActionAccess(currentUser?.role, 'members', 'transfer'), [currentUser?.role]);
  const canExport = useMemo(() => permissionService.hasActionAccess(currentUser?.role, 'members', 'export'), [currentUser?.role]);

  const isViewOnlyMode = useMemo(() => {
    return !canCreate && !canEdit && !canDelete && !canTransfer;
  }, [canCreate, canEdit, canDelete, canTransfer]);

  const [activeMainTab, setActiveMainTab] = useState(() => {
    return isViewOnlyMode ? 'groups' : 'list';
  });
  const [selectedGroupTab, setSelectedGroupTab] = useState("Phát triển Đảng");
  const [hasSetDefaultGroup, setHasSetDefaultGroup] = useState(false);

  const GROUPS_LIST = ["Phát triển Đảng", "Hồ sơ sinh hoạt Đảng", "Tổ chức", "Kiểm tra - Giám sát", "Truyền thông"];

  const [editingCell, setEditingCell] = useState(null); // { id, dataIndex }
  const [editValue, setEditValue] = useState(null);
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);

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

      if (dataIndex === 'dang_vien_du_bi') {
        updateData.loai_dang_vien = newVal ? 'Dự bị' : 'Chính thức';
      }

      await updateDoc(doc(db, "dang_vien", id), updateData);
      
      setData(prevData => prevData.map(item => {
        if (item.id === id) {
          return { ...item, ...updateData };
        }
        return item;
      }));

      await addDoc(collection(db, "lich_su_cap_nhat"), {
        dang_vien_id: id,
        mssv: record.mssv || '',
        ho_ten: record.ho_ten || '',
        updated_by: currentUser?.email || currentUser?.username || "Hệ thống",
        updated_at: new Date().toISOString(),
        action: "update_cell",
        changes: [{ field: dataIndex, from: record[dataIndex] || '', to: newVal || '' }]
      });

      message.success('Đã cập nhật thành công!');
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi cập nhật dữ liệu: ' + err.message);
    } finally {
      hideMessage();
      cancelCellEdit();
    }
  };

  // Helper to determine visible groups for current user
  const getVisibleGroups = () => {
    const isBiThu = currentUser?.role === ROLES.BITHU || currentUser?.role === ROLES.ADMIN;
    const isCapUy = currentUser?.role === ROLES.PHOBIHU || currentUser?.role === ROLES.CAPUY || isBiThu;

    if (isCapUy) {
      return GROUPS_LIST;
    }

    // Role-to-group mapping for Group Leaders (Ban điều hành)
    const leaderRoleToGroup = {
      [ROLES.ADMISSION_MANAGER]: "Phát triển Đảng",
      [ROLES.OFFICIAL_MANAGER]: "Hồ sơ sinh hoạt Đảng",
      [ROLES.TOCHUC]: "Tổ chức",
      [ROLES.KIEMTRA]: "Kiểm tra - Giám sát",
      [ROLES.TRUYENTHONG]: "Truyền thông"
    };

    const ledGroup = leaderRoleToGroup[currentUser?.role];
    if (ledGroup) {
      return [ledGroup];
    }

    // Normal Party Member (Đảng viên thuộc nhóm nào thì xem được nhóm đó)
    const userProfile = data.find(m => 
      (m.email && m.email.toLowerCase() === currentUser?.email?.toLowerCase()) ||
      (m.mssv && m.mssv.toLowerCase() === currentUser?.username?.toLowerCase())
    );

    const userGroup = userProfile?.nhom || currentUser?.nhom;
    if (userGroup) {
      const matchedGroup = GROUPS_LIST.find(g => g.toLowerCase() === userGroup.trim().toLowerCase());
      if (matchedGroup) {
        return [matchedGroup];
      }
    }

    // Default fallback
    return [];
  };

  // Sync selected group tab dynamically when data or currentUser changes
  useEffect(() => {
    if (data.length === 0 || hasSetDefaultGroup) return;
    const visible = getVisibleGroups();
    if (visible.length === 0) return;

    const userProfile = data.find(m => 
      (m.email && m.email.toLowerCase() === currentUser?.email?.toLowerCase()) ||
      (m.mssv && m.mssv.toLowerCase() === currentUser?.username?.toLowerCase())
    );
    const personalGroup = userProfile?.nhom || currentUser?.nhom;
    const matchedPersonalGroup = GROUPS_LIST.find(g => g.toLowerCase() === personalGroup?.trim().toLowerCase());

    if (matchedPersonalGroup && visible.includes(matchedPersonalGroup)) {
      setSelectedGroupTab(matchedPersonalGroup);
    } else {
      setSelectedGroupTab(visible[0]);
    }
    setHasSetDefaultGroup(true);
  }, [data, currentUser, hasSetDefaultGroup]);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  
  // Filters
  const [searchText, setSearchText] = useState("");
  const [filterKhoa, setFilterKhoa] = useState([]);
  const [filterLop, setFilterLop] = useState([]);
  const [filterNhom, setFilterNhom] = useState([]);
  const [filterIntake, setFilterIntake] = useState([]);

  // Group directory filter states
  const [groupFilterIntake, setGroupFilterIntake] = useState(null);
  const [groupFilterKhoa, setGroupFilterKhoa] = useState(null);
  const [groupFilterLoai, setGroupFilterLoai] = useState(null);
  
  const [filterNgayVaoDangRange, setFilterNgayVaoDangRange] = useState(null);
  const [filterNoiChuyenDi, setFilterNoiChuyenDi] = useState(null);
  const [filterLoaiDangVien, setFilterLoaiDangVien] = useState(null);
  const [filterCoTheDang, setFilterCoTheDang] = useState(null);
  
  const fetchDangVien = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "dang_vien"));
      const membersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(dv => !dv.trang_thai || dv.trang_thai === 'dang_sinh_hoat');
      setData(membersData);
      
      // Update selectedRecord if it's currently open in the drawer
      setSelectedRecord(prev => {
        if (!prev) return null;
        const updated = membersData.find(m => m.id === prev.id);
        return updated || prev;
      });
    } catch (error) {
      message.error("Lỗi khi tải danh sách Đảng viên");
    } finally {
      setLoading(false);
    }
  };

  const fetchTempTransferHistory = async () => {
    setTempLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "chuyen_tam_thoi"));
      const records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTempTransferData(records);
    } catch (error) {
      console.error("Lỗi khi tải lịch sử chuyển tạm thời:", error);
    } finally {
      setTempLoading(false);
    }
  };

  useEffect(() => {
    fetchDangVien();
    fetchTempTransferHistory();
  }, []);

  // Filtered Data
  const filteredData = useMemo(() => {
    const result = data.filter(item => {
      const matchSearch = item.mssv?.toLowerCase().includes(searchText.toLowerCase()) || 
                          item.ho_ten?.toLowerCase().includes(searchText.toLowerCase());
      const matchKhoa = filterKhoa && filterKhoa.length > 0 ? filterKhoa.includes(item.khoa) : true;
      const matchLop = filterLop && filterLop.length > 0 ? filterLop.includes(item.lop) : true;
      const matchNhom = filterNhom && filterNhom.length > 0 ? filterNhom.includes(item.nhom) : true;
      const isDuBi = checkIsDuBi(item);
      const isOfficial = !isDuBi;

      const matchLoai = filterLoaiDangVien === 'Chính thức' ? isOfficial :
                        filterLoaiDangVien === 'Dự bị' ? isDuBi : true;
                        
      const cardStr = item.so_the_dang ? String(item.so_the_dang).trim().toLowerCase() : '';
      const hasCard = isOfficial && !!cardStr && cardStr !== '' && !cardStr.includes('chưa') && !cardStr.includes('chua');
      const matchCoThe = filterCoTheDang === 'Đã có thẻ' ? hasCard :
                         filterCoTheDang === 'Chưa có thẻ' ? !hasCard : true;

      const matchNoiChuyenDi = filterNoiChuyenDi ? item.noi_chuyen_di === filterNoiChuyenDi : true;
      
      if (filterIntake && filterIntake.length > 0) {
        const lop = item.lop || "";
        const match = lop.match(/^(\d+K)/) || lop.match(/^(\d+)/);
        const intake = match ? match[0] : null;
        if (!filterIntake.includes(intake)) return false;
      }
      
      let matchNgayVao = true;
      if (filterNgayVaoDangRange && filterNgayVaoDangRange.length === 2) {
         const fromDate = dayjs(filterNgayVaoDangRange[0]).startOf('day');
         const toDate = dayjs(filterNgayVaoDangRange[1]).endOf('day');
         const itemDate = item.ngay_vao_dang ? safeDayjs(item.ngay_vao_dang) : null;
         if (!itemDate || !itemDate.isValid() || itemDate.isBefore(fromDate) || itemDate.isAfter(toDate)) {
            matchNgayVao = false;
         }
      }

      return matchSearch && matchKhoa && matchLop && matchNhom && matchLoai && matchCoThe && matchNoiChuyenDi && matchNgayVao;
    });

    result.sort((a, b) => {
       const dateA = a.ngay_vao_dang ? safeDayjs(a.ngay_vao_dang).valueOf() : 0;
       const dateB = b.ngay_vao_dang ? safeDayjs(b.ngay_vao_dang).valueOf() : 0;
       if (dateA !== dateB) return dateA - dateB;
       
       const nhomA = a.nhom || '';
       const nhomB = b.nhom || '';
       return nhomA.localeCompare(nhomB);
    });

    return result;
  }, [data, searchText, filterKhoa, filterLop, filterNhom, filterNgayVaoDangRange, filterNoiChuyenDi, filterLoaiDangVien, filterCoTheDang, filterIntake]);

  const uniqueKhoa = useMemo(() => {
    return [...new Set(data.map(d => d.khoa).filter(Boolean))].sort();
  }, [data]);

  const uniqueIntakes = useMemo(() => {
    const intakes = data.map(d => {
      if (!d.lop) return null;
      const match = d.lop.match(/^(\d+K)/) || d.lop.match(/^(\d+)/);
      return match ? match[0] : null;
    }).filter(Boolean);
    return [...new Set(intakes)].sort();
  }, [data]);

  const uniqueLop = useMemo(() => {
    const sourceData = filterKhoa && filterKhoa.length > 0
      ? data.filter(d => filterKhoa.includes(d.khoa))
      : data;
    return [...new Set(sourceData.map(d => d.lop).filter(Boolean))].sort();
  }, [data, filterKhoa]);

  const uniqueNhom = useMemo(() => {
    return [...new Set(data.map(d => d.nhom).filter(Boolean))].sort();
  }, [data]);

  const uniqueNoiChuyenDi = useMemo(() => {
    return [...new Set(data.map(d => d.noi_chuyen_di).filter(Boolean))].sort();
  }, [data]);

  useEffect(() => {
    if (filterKhoa && filterKhoa.length > 0 && filterLop && filterLop.length > 0) {
      const validLops = filterLop.filter(lop => 
        data.some(d => filterKhoa.includes(d.khoa) && d.lop === lop)
      );
      if (validLops.length !== filterLop.length) {
        setFilterLop(validLops);
      }
    }
  }, [filterKhoa, filterLop, data]);

  const handleSearch = debounce((e) => {
    setSearchText(e.target.value);
  }, 300);

  const resetFilters = () => {
    setSearchText("");
    setFilterKhoa([]);
    setFilterLop([]);
    setFilterNhom([]);
    setFilterNgayVaoDangRange(null);
    setFilterNoiChuyenDi(null);
    setFilterLoaiDangVien(null);
    setFilterCoTheDang(null);
    setFilterIntake([]);
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return '';
      if (typeof dateString === 'string' && dateString.trim() === '') return '';
      if (dateString.toDate) return dayjs(dateString.toDate()).format('DD/MM/YYYY');
      if (dateString.seconds) return dayjs(dateString.seconds * 1000).format('DD/MM/YYYY');
      const parsed = dayjs(dateString);
      return parsed.isValid() ? parsed.format('DD/MM/YYYY') : String(dateString);
    } catch(e) {
      return '';
    }
  };

  const handleOpenExportModal = () => {
    setExportRange(selectedRowKeys.length > 0 ? 'selected' : 'filtered');
    setSelectedExportFields(EXPORT_FIELDS.map(f => f.key));
    setIsExportModalVisible(true);
  };

  const exportExcel = () => {
    try {
      let dataToExport = [];
      if (exportRange === 'selected') {
        dataToExport = (data || []).filter(item => item && selectedRowKeys.includes(item.id));
      } else if (exportRange === 'all') {
        dataToExport = data || [];
      } else {
        dataToExport = filteredData || [];
      }

      if (!dataToExport || dataToExport.length === 0) {
        message.warning("Không có dữ liệu Đảng viên để xuất!");
        return;
      }

      const mappedData = [];
      dataToExport.forEach((item, index) => {
        if (!item) return;
        try {
          const row = { 'STT': index + 1 };
          EXPORT_FIELDS.forEach(field => {
            if (selectedExportFields.includes(field.key)) {
              if (field.isDate) {
                row[field.label] = formatDate(item[field.key]);
              } else if (field.isSpecial === 'type') {
                row[field.label] = item.dang_vien_du_bi ? "Dự bị" : "Chính thức";
              } else if (field.isSpecial === 'status') {
                row[field.label] = item.trang_thai === 'dang_sinh_hoat' ? 'Đang sinh hoạt' :
                                   item.trang_thai === 'da_chuyen' ? 'Đã chuyển ra' :
                                   item.trang_thai === 'cho_ket_nap' ? 'Chờ kết nạp' :
                                   item.trang_thai === 'dang_xet_chinh_thuc' ? 'Đang xét chính thức' : 'Đang sinh hoạt';
              } else {
                let val = item[field.key];
                if (field.key === 'so_dien_thoai') {
                  val = item.so_dien_thoai || item.sdt;
                } else if (field.key === 'email') {
                  val = item.email || item.email_sv;
                } else if (field.key === 'email_sv') {
                  val = item.email_sv || item.email;
                } else if (field.key === 'que_quan') {
                  val = item.que_quan || getFullHometown(item);
                } else if (field.key === 'dia_chi_thuong_tru') {
                  val = item.dia_chi_thuong_tru || getFullAddress(item);
                } else if (field.key === 'dia_chi_tam_tru') {
                  val = item.dia_chi_tam_tru || getFullTamTru(item);
                } else if (field.key === 'tinh_tp_qq') {
                  val = item.tinh_tp_qq || item.tinh_tp_qq_cu;
                } else if (field.key === 'xa_phuong_qq') {
                  val = item.xa_phuong_qq || item.xa_phuong_qq_cu;
                } else if (field.key === 'tinh_tp_tt') {
                  val = item.tinh_tp_tt || item.tinh_tp_tt_cu;
                } else if (field.key === 'xa_phuong_tt') {
                  val = item.xa_phuong_tt || item.xa_phuong_tt_cu;
                } else if (field.key === 'chi_tiet_dc') {
                  val = item.chi_tiet_dc || item.chi_tiet_tt_cu;
                }
                
                if (val !== null && val !== undefined) {
                  if (typeof val === 'object') {
                    if (val.toDate) val = dayjs(val.toDate()).format('DD/MM/YYYY');
                    else if (val.seconds) val = dayjs(val.seconds * 1000).format('DD/MM/YYYY');
                    else val = JSON.stringify(val);
                  } else {
                    val = String(val);
                  }
                  
                  // Truncate strings exceeding Excel cell character limit (32767)
                  if (typeof val === 'string' && val.length > 32000) {
                    val = val.substring(0, 32000) + '... (bị cắt do quá dài)';
                  }
                }
                row[field.label] = val || "";
              }
            }
          });
          mappedData.push(row);
        } catch (itemErr) {
          console.error("Lỗi khi xử lý item:", item, itemErr);
        }
      });

      const ws = XLSX.utils.json_to_sheet(mappedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "DangVien");
      XLSX.writeFile(wb, "DanhSachDangVien_TuyChinh.xlsx");
      
      setIsExportModalVisible(false);
      message.success(`Xuất Excel thành công ${mappedData.length} Đảng viên!`);
    } catch (error) {
      console.error("Lỗi khi xuất file Excel:", error);
      message.error("Đã xảy ra lỗi: " + error.message);
    }
  };

  const exportPhotosZip = async () => {
    let dataToExport = [];
    if (exportRange === 'selected') {
      dataToExport = (data || []).filter(item => item && selectedRowKeys.includes(item.id));
    } else if (exportRange === 'all') {
      dataToExport = data || [];
    } else {
      dataToExport = filteredData || [];
    }

    const membersWithPhoto = dataToExport.filter(item => item && item.anh_ca_nhan);

    if (membersWithPhoto.length === 0) {
      message.warning("Không có ảnh Đảng viên nào trong phạm vi được chọn!");
      return;
    }

    setIsExportingPhotos(true);
    const hideLoading = message.loading(`Đang chuẩn bị tải ảnh của ${membersWithPhoto.length} Đảng viên...`, 0);

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      const downloadImage = async (member) => {
        try {
          const response = await fetch(member.anh_ca_nhan);
          if (!response.ok) throw new Error("Fetch error");
          const blob = await response.blob();
          
          let ext = 'jpg';
          const contentType = response.headers.get('Content-Type');
          if (contentType) {
            const parts = contentType.split('/');
            if (parts.length > 1) {
              ext = parts[1].split(';')[0];
            }
          }
          if (ext === 'octet-stream') ext = 'jpg';
          
          const cleanName = member.ho_ten.replace(/[^a-zA-Z0-9\s_àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi, '').trim().replace(/\s+/g, '_');
          const filename = `${member.mssv || 'CHUA_CO_MSSV'}_${cleanName}.${ext}`;
          zip.file(filename, blob);
        } catch (err) {
          console.error(`Failed to download photo for ${member.ho_ten}:`, err);
        }
      };

      const batchSize = 5;
      for (let i = 0; i < membersWithPhoto.length; i += batchSize) {
        const batch = membersWithPhoto.slice(i, i + batchSize);
        await Promise.all(batch.map(member => downloadImage(member)));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Anh_Dang_Vien_${dayjs().format('YYYYMMDD')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      message.success(`Tải ảnh Đảng viên thành công!`);
    } catch (e) {
      console.error(e);
      message.error("Lỗi xảy ra khi đóng gói và xuất ảnh ZIP: " + e.message);
    } finally {
      hideLoading();
      setIsExportingPhotos(false);
      setIsExportModalVisible(false);
    }
  };

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setIsDrawerVisible(true);
  };

  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      await Promise.all(selectedRowKeys.map(id => deleteDoc(doc(db, "dang_vien", id))));
      message.success(`Đã xóa ${selectedRowKeys.length} Đảng viên.`);
      setSelectedRowKeys([]);
      fetchDangVien();
    } catch (error) {
      message.error("Lỗi khi xóa Đảng viên");
      setLoading(false);
    }
  };

  const handleBulkTransfer = async () => {
    try {
      const values = await transferForm.validateFields();
      setLoading(true);
      
      const transferPromises = selectedRowKeys.map(async (id) => {
        const formattedDate = values.ngay_chuyen ? values.ngay_chuyen.format('YYYY-MM-DD') : null;
        // 1. Update dang_vien status and transfer details
        await updateDoc(doc(db, "dang_vien", id), {
          trang_thai: "da_chuyen",
          ngay_chuyen_ra: formattedDate,
          noi_chuyen_ra: values.noi_chuyen || '',
          ghi_chu_chuyen: values.ghi_chu || '',
          updated_at: new Date().toISOString()
        });
        
        // 2. Add to chuyen_sinh_hoat (backward compatibility)
        await addDoc(collection(db, "chuyen_sinh_hoat"), {
          dang_vien_id: id,
          ngay_chuyen: formattedDate,
          noi_chuyen: values.noi_chuyen || '',
          ghi_chu: values.ghi_chu || '',
          created_at: new Date().toISOString()
        });
      });
      
      await Promise.all(transferPromises);
      message.success(`Đã chuyển sinh hoạt ${selectedRowKeys.length} Đảng viên.`);
      setSelectedRowKeys([]);
      setIsTransferVisible(false);
      transferForm.resetFields();
      fetchDangVien();
    } catch (error) {
      if (error.name === 'ValidationError') return;
      message.error("Lỗi khi chuyển sinh hoạt");
      console.error(error);
      setLoading(false);
    }
  };

  const handleBulkTempTransfer = async () => {
    try {
      const values = await tempTransferForm.validateFields();
      setLoading(true);
      
      const formattedDate = values.ngay_chuyen_tam_thoi ? values.ngay_chuyen_tam_thoi.format('YYYY-MM-DD') : null;
      
      const transferPromises = selectedRowKeys.map(async (id) => {
        const record = data.find(m => m.id === id);
        if (!record) return;
        
        // 1. Create history log in chuyen_tam_thoi collection
        await addDoc(collection(db, "chuyen_tam_thoi"), {
          dang_vien_id: id,
          ho_ten: record.ho_ten || '',
          mssv: record.mssv || '',
          lop: record.lop || '',
          khoa: record.khoa || '',
          ngay_chuyen_tam_thoi: formattedDate,
          thoi_gian_ve: values.thoi_gian_ve || '',
          noi_chuyen_den_tam_thoi: values.noi_chuyen_den_tam_thoi || '',
          ngay_chuyen_ve: null,
          ghi_chu: values.ghi_chu || '',
          trang_thai: 'dang_di',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        // 2. Update status of the member in dang_vien collection
        await updateDoc(doc(db, "dang_vien", id), {
          trang_thai_tam_thoi: "dang_di_tam_thoi",
          updated_at: new Date().toISOString()
        });
      });
      
      await Promise.all(transferPromises);
      message.success(`Đã chuyển sinh hoạt tạm thời ${selectedRowKeys.length} Đảng viên.`);
      setSelectedRowKeys([]);
      setIsTempTransferVisible(false);
      tempTransferForm.resetFields();
      
      // Reload datasets
      fetchDangVien();
      fetchTempTransferHistory();
    } catch (error) {
      if (error.name === 'ValidationError') return;
      message.error("Lỗi khi chuyển sinh hoạt tạm thời");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReturn = async () => {
    try {
      const values = await tempReturnForm.validateFields();
      setLoading(true);
      
      const formattedDate = values.ngay_chuyen_ve ? values.ngay_chuyen_ve.format('YYYY-MM-DD') : null;
      
      if (!selectedTempRecord) return;
      
      // 1. Update chuyen_tam_thoi history log
      await updateDoc(doc(db, "chuyen_tam_thoi", selectedTempRecord.id), {
        ngay_chuyen_ve: formattedDate,
        trang_thai: 'da_ve',
        updated_at: new Date().toISOString()
      });
      
      // 2. Restore active status of the member
      await updateDoc(doc(db, "dang_vien", selectedTempRecord.dang_vien_id), {
        trang_thai_tam_thoi: null,
        updated_at: new Date().toISOString()
      });
      
      message.success(`Đảng viên ${selectedTempRecord.ho_ten} đã trở lại sinh hoạt Chi bộ.`);
      setIsTempReturnVisible(false);
      tempReturnForm.resetFields();
      setSelectedTempRecord(null);
      
      // Reload datasets
      fetchDangVien();
      fetchTempTransferHistory();
    } catch (error) {
      if (error.name === 'ValidationError') return;
      message.error("Lỗi khi xác nhận trở lại");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkConvertSoTheDang = async () => {
    try {
      setLoading(true);
      
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

      let successCount = 0;
      let noCccdCount = 0;

      const promises = selectedRowKeys.map(async (id) => {
        const record = data.find(m => m.id === id);
        if (!record || !record.cccd) {
          noCccdCount++;
          return;
        }

        const cccdVal = String(record.cccd).trim();
        const mssvStr = String(record.mssv).trim();

        // 1. Update dang_vien
        await updateDoc(doc(db, "dang_vien", id), {
          so_the_dang: cccdVal,
          updated_at: new Date().toISOString()
        });

        // 2. Sync to dang_vien_dang_sinh_hoat
        const dshDoc = await findDocByMssv("dang_vien_dang_sinh_hoat", mssvStr);
        if (dshDoc) {
          await updateDoc(doc(db, "dang_vien_dang_sinh_hoat", dshDoc.id), {
            so_qd: cccdVal,
            updated_at: new Date().toISOString()
          });
        }
        successCount++;
      });

      await Promise.all(promises);
      
      if (noCccdCount > 0) {
        message.warning(`Đã cấp ${successCount} thẻ. Bỏ qua ${noCccdCount} Đảng viên không có CCCD.`);
      } else {
        message.success(`Cấp số thẻ Đảng từ số CCCD thành công cho ${successCount} Đảng viên.`);
      }
      setSelectedRowKeys([]);
      fetchDangVien();
    } catch (error) {
      console.error("Lỗi cấp thẻ Đảng hàng loạt:", error);
      message.error("Lỗi khi thực hiện cấp thẻ Đảng hàng loạt");
      setLoading(false);
    }
  };

  const handleBulkSelfEditPermission = async (allow) => {
    if (selectedRowKeys.length === 0) return;
    const hideMessage = message.loading('Đang cập nhật quyền tự chỉnh sửa...', 0);
    try {
      setLoading(true);
      const batchSize = 10;
      for (let i = 0; i < selectedRowKeys.length; i += batchSize) {
        const batchKeys = selectedRowKeys.slice(i, i + batchSize);
        await Promise.all(batchKeys.map(async (key) => {
          const record = data.find(m => m.id === key);
          const oldVal = record ? (record.allow_self_edit ? 'Cho phép' : 'Khóa') : 'Khóa';
          const newVal = allow ? 'Cho phép' : 'Khóa';
          
          await updateDoc(doc(db, "dang_vien", key), {
            allow_self_edit: allow,
            updated_at: new Date().toISOString()
          });

          // Log history
          await addDoc(collection(db, "lich_su_cap_nhat"), {
            dang_vien_id: key,
            mssv: record?.mssv || '',
            ho_ten: record?.ho_ten || '',
            updated_by: currentUser?.email || currentUser?.username || "Hệ thống",
            updated_at: new Date().toISOString(),
            action: "bulk_allow_self_edit",
            changes: [{ field: "allow_self_edit", from: oldVal, to: newVal }]
          });
        }));
      }

      message.success(`Đã ${allow ? 'cấp' : 'khóa'} quyền tự chỉnh sửa hàng loạt thành công cho ${selectedRowKeys.length} Đảng viên!`);
      setSelectedRowKeys([]);
      fetchDangVien();
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi cập nhật quyền tự chỉnh sửa hàng loạt: " + err.message);
      setLoading(false);
    } finally {
      hideMessage();
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
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

  const columns = [
    { 
      title: 'STT', 
      key: 'stt',
      width: 60,
      render: (_, __, index) => index + 1
    },
    { 
      title: 'MSSV', 
      dataIndex: 'mssv', 
      key: 'mssv',
      sorter: (a, b) => (a.mssv || '').localeCompare(b.mssv || '')
    },
    { 
      title: 'Họ tên', 
      dataIndex: 'ho_ten', 
      key: 'ho_ten',
      sorter: (a, b) => (a.ho_ten || '').localeCompare(b.ho_ten || ''),
      render: (text, r) => (
        <Space>
          <span>{text}</span>
          {r.trang_thai_tam_thoi === 'dang_di_tam_thoi' && (
            <Tag color="cyan" style={{ fontWeight: 600, borderRadius: '4px' }}>
              Sinh hoạt tạm thời
            </Tag>
          )}
        </Space>
      )
    },
    { 
      title: 'Lớp', 
      dataIndex: 'lop', 
      key: 'lop',
      sorter: (a, b) => (a.lop || '').localeCompare(b.lop || '')
    },
    { 
      title: 'Khoa', 
      dataIndex: 'khoa', 
      key: 'khoa',
      sorter: (a, b) => (a.khoa || '').localeCompare(b.khoa || '')
    },
    { 
      title: 'Nhóm sinh hoạt', 
      dataIndex: 'nhom', 
      key: 'nhom',
      sorter: (a, b) => (a.nhom || '').localeCompare(b.nhom || '')
    },
    { 
      title: 'Ngày vào Đảng', 
      dataIndex: 'ngay_vao_dang', 
      key: 'ngay_vao_dang',
      render: (text) => formatDate(text),
      sorter: (a, b) => {
        const dateA = a.ngay_vao_dang ? safeDayjs(a.ngay_vao_dang).valueOf() : 0;
        const dateB = b.ngay_vao_dang ? safeDayjs(b.ngay_vao_dang).valueOf() : 0;
        return dateA - dateB;
      }
    },
    { 
      title: 'Loại', 
      key: 'loai',
      render: (_, r) => {
        const isDuBi = checkIsDuBi(r);
        return (
          <Tag color={isDuBi ? 'orange' : 'green'}>
            {isDuBi ? 'Dự bị' : 'Chính thức'}
          </Tag>
        );
      },
      sorter: (a, b) => {
        const valA = checkIsDuBi(a) ? 1 : 0;
        const valB = checkIsDuBi(b) ? 1 : 0;
        return valA - valB;
      }
    }
  ];

  const { Paragraph } = Typography;

  const renderGroupDirectory = () => {
    // Filter active members belonging to the selectedGroupTab and matching filters
    const groupMembers = data.filter(item => {
      const matchGroup = item.nhom === selectedGroupTab;
      const matchSearch = item.mssv?.toLowerCase().includes(searchText.toLowerCase()) || 
                          item.ho_ten?.toLowerCase().includes(searchText.toLowerCase());
      
      let matchIntake = true;
      if (groupFilterIntake) {
        if (!item.lop) {
          matchIntake = false;
        } else {
          const match = item.lop.match(/^(\d+K)/) || item.lop.match(/^(\d+)/);
          const intakeVal = match ? match[0] : null;
          matchIntake = intakeVal === groupFilterIntake;
        }
      }

      const matchKhoa = groupFilterKhoa ? item.khoa === groupFilterKhoa : true;

      let matchLoai = true;
      if (groupFilterLoai) {
        matchLoai = groupFilterLoai === 'du_bi' ? checkIsDuBi(item) : !checkIsDuBi(item);
      }

      return matchGroup && matchSearch && matchIntake && matchKhoa && matchLoai;
    });

    return (
      <div style={{ marginTop: '8px' }}>
        <Paragraph style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>
          {getVisibleGroups().length === 5 
            ? "Tra cứu nhanh thành viên sinh hoạt trong 5 nhóm nghiệp vụ Chi bộ. Thành viên chỉ xem được thông tin liên hệ cơ bản để trao đổi công việc, kết nối đồng chí." 
            : `Danh sách liên lạc thành viên nhóm "${selectedGroupTab}". Tra cứu thông tin cơ bản để kết nối đồng chí, trao đổi và thảo luận công việc.`}
        </Paragraph>

        {getVisibleGroups().length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <Radio.Group 
              value={selectedGroupTab} 
              onChange={(e) => setSelectedGroupTab(e.target.value)} 
              optionType="button"
              buttonStyle="solid"
              size="middle"
            >
              {getVisibleGroups().map(gName => (
                <Radio.Button key={gName} value={gName} style={{ fontWeight: 600 }}>
                  {gName} ({data.filter(item => item.nhom === gName).length})
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>
        )}

        {/* Filter Toolbar for Group Directory */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 20, 
          flexWrap: 'wrap', 
          gap: '12px', 
          background: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(10px)',
          padding: '12px 20px', 
          borderRadius: '12px', 
          border: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
        }}>
          <Space wrap size="middle" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FilterOutlined style={{ color: '#c62828' }} />
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#555' }}>Bộ lọc:</span>
            </div>

            <Select 
              value={groupFilterIntake} 
              onChange={setGroupFilterIntake}
              placeholder="Chọn Khóa"
              style={{ width: '130px' }}
              dropdownStyle={{ borderRadius: '8px' }}
              allowClear
            >
              {uniqueIntakes.map(intake => (
                <Option key={intake} value={intake}>{intake}</Option>
              ))}
            </Select>
            
            <Select 
              value={groupFilterKhoa} 
              onChange={setGroupFilterKhoa}
              placeholder="Chọn Khoa"
              style={{ width: '180px' }}
              dropdownStyle={{ borderRadius: '8px' }}
              allowClear
            >
              {uniqueKhoa.map(khoa => (
                <Option key={khoa} value={khoa}>{khoa}</Option>
              ))}
            </Select>

            <Select 
              value={groupFilterLoai} 
              onChange={setGroupFilterLoai}
              placeholder="Trạng thái"
              style={{ width: '140px' }}
              dropdownStyle={{ borderRadius: '8px' }}
              allowClear
            >
              <Option value="chinh_thuc">Chính thức</Option>
              <Option value="du_bi">Dự bị</Option>
            </Select>

            {(groupFilterIntake || groupFilterKhoa || groupFilterLoai) && (
              <Button 
                type="text" 
                danger 
                icon={<CloseOutlined />} 
                onClick={() => {
                  setGroupFilterIntake(null);
                  setGroupFilterKhoa(null);
                  setGroupFilterLoai(null);
                }}
                style={{ fontSize: '13px', fontWeight: 500 }}
              >
                Xóa bộ lọc
              </Button>
            )}
          </Space>

          <Input 
            placeholder="Tìm kiếm mã số, họ tên..." 
            onChange={handleSearch}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            style={{ width: '280px', borderRadius: '8px' }} 
            allowClear
          />
        </div>

        {groupMembers.length > 0 ? (
          <Row gutter={[16, 16]}>
            {groupMembers.map(m => (
              <Col xs={24} sm={12} md={8} lg={6} key={m.id}>
                <Card 
                  hoverable 
                  bordered
                  style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', height: '100%' }}
                  bodyStyle={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
                >
                  <Avatar 
                    size={72} 
                    src={getAvatarUrl(m.anh_ca_nhan)} 
                    icon={<UserOutlined />} 
                    style={{ border: '2px solid #c62828', marginBottom: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.08)' }}
                  />
                  
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#1a1a1a', marginBottom: '4px', lineHeight: 1.3 }}>
                    {m.ho_ten}
                  </div>
                  
                  <Tag color="red" style={{ fontWeight: 700, marginBottom: '12px' }}>
                    MSSV: {m.mssv || 'Chưa rõ'}
                  </Tag>

                  <div style={{ fontSize: '12px', color: '#555', width: '100%', marginBottom: '12px' }}>
                    <div style={{ marginBottom: '4px' }}>
                      Lớp: <strong>{m.lop || 'Chưa rõ'}</strong>
                    </div>
                    <div>
                      Khoa: <strong>{m.khoa || 'Chưa rõ'}</strong>
                    </div>
                  </div>

                  <Divider style={{ margin: '8px 0 12px 0' }} />

                  {/* Contact Info (Only phone, email, facebook link) */}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <PhoneOutlined style={{ color: '#52c41a' }} />
                      <span style={{ color: '#555' }}>SĐT: <strong>{m.so_dien_thoai || 'Chưa rõ'}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.email}>
                      <MailOutlined style={{ color: '#1890ff' }} />
                      <span style={{ color: '#555' }}>Email: <strong>{m.email || 'Chưa rõ'}</strong></span>
                    </div>

                    {m.facebook ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FacebookOutlined style={{ color: '#3b5998' }} />
                        <a href={m.facebook.startsWith('http') ? m.facebook : `https://${m.facebook}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff', fontWeight: 600 }}>
                          Facebook liên kết
                        </a>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc' }}>
                        <FacebookOutlined />
                        <span style={{ fontStyle: 'italic' }}>Chưa cập nhật FB</span>
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <Empty description={`Không có thành viên nào trong nhóm "${selectedGroupTab}" hiện tại.`} />
          </div>
        )}
      </div>
    );
  };

  const renderTempTransferTab = () => {
    // Filter and search temporary records
    const filteredTemp = tempTransferData.filter(item => {
      const matchSearch = item.mssv?.toLowerCase().includes(tempSearchText.toLowerCase()) || 
                          item.ho_ten?.toLowerCase().includes(tempSearchText.toLowerCase()) ||
                          item.noi_chuyen_den_tam_thoi?.toLowerCase().includes(tempSearchText.toLowerCase());
                          
      const matchStatus = tempFilterStatus === 'all' ? true :
                          tempFilterStatus === 'dang_di' ? item.trang_thai === 'dang_di' :
                          tempFilterStatus === 'da_ve' ? item.trang_thai === 'da_ve' : true;
                          
      return matchSearch && matchStatus;
    });

    filteredTemp.sort((a, b) => {
      const dateA = a.ngay_chuyen_tam_thoi ? safeDayjs(a.ngay_chuyen_tam_thoi).valueOf() : 0;
      const dateB = b.ngay_chuyen_tam_thoi ? safeDayjs(b.ngay_chuyen_tam_thoi).valueOf() : 0;
      return dateB - dateA; // Show latest transfers first
    });

    const tempColumns = [
      {
        title: 'STT',
        key: 'stt',
        width: 60,
        render: (_, __, index) => index + 1
      },
      {
        title: 'MSSV',
        dataIndex: 'mssv',
        key: 'mssv',
        sorter: (a, b) => (a.mssv || '').localeCompare(b.mssv || '')
      },
      {
        title: 'Họ tên',
        dataIndex: 'ho_ten',
        key: 'ho_ten',
        sorter: (a, b) => (a.ho_ten || '').localeCompare(b.ho_ten || '')
      },
      {
        title: 'Lớp',
        dataIndex: 'lop',
        key: 'lop',
      },
      {
        title: 'Khoa',
        dataIndex: 'khoa',
        key: 'khoa',
      },
      {
        title: 'Ngày chuyển tạm thời',
        dataIndex: 'ngay_chuyen_tam_thoi',
        key: 'ngay_chuyen_tam_thoi',
        render: (text) => formatDate(text),
        sorter: (a, b) => safeDayjs(a.ngay_chuyen_tam_thoi).valueOf() - safeDayjs(b.ngay_chuyen_tam_thoi).valueOf()
      },
      {
        title: 'Thời gian về dự kiến',
        dataIndex: 'thoi_gian_ve',
        key: 'thoi_gian_ve',
      },
      {
        title: 'Nơi chuyển đến',
        dataIndex: 'noi_chuyen_den_tam_thoi',
        key: 'noi_chuyen_den_tam_thoi',
        sorter: (a, b) => (a.noi_chuyen_den_tam_thoi || '').localeCompare(b.noi_chuyen_den_tam_thoi || '')
      },
      {
        title: 'Ngày chuyển về thực tế',
        dataIndex: 'ngay_chuyen_ve',
        key: 'ngay_chuyen_ve',
        render: (text) => text ? (
          <Tag color="green" style={{ borderRadius: '4px', fontWeight: 500 }}>
            {formatDate(text)}
          </Tag>
        ) : (
          <Tag color="orange" style={{ borderRadius: '4px', fontWeight: 500 }}>
            Chưa trở lại
          </Tag>
        )
      },
      {
        title: 'Hành động',
        key: 'action',
        width: 150,
        render: (_, r) => r.trang_thai === 'dang_di' && (
          <PermissionWrapper module="members" action="transfer">
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTempRecord(r);
                setIsTempReturnVisible(true);
                tempReturnForm.setFieldsValue({ ngay_chuyen_ve: dayjs() });
              }}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Xác nhận trở lại
            </Button>
          </PermissionWrapper>
        )
      }
    ];

    return (
      <div style={{ marginTop: '8px' }}>
        <Paragraph style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>
          Danh sách lưu vết Đảng viên chuyển sinh hoạt tạm thời đi chi bộ khác học tập/công tác và ghi nhận ngày trở về sinh hoạt bình thường.
        </Paragraph>

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: '12px', background: '#fafafa', padding: '10px 16px', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
          <Space>
            <Input 
              placeholder="Tìm theo MSSV, họ tên, nơi đến..." 
              value={tempSearchText}
              onChange={(e) => setTempSearchText(e.target.value)}
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              style={{ width: '260px', borderRadius: '6px' }} 
              allowClear
            />
            
            <Select 
              value={tempFilterStatus} 
              onChange={setTempFilterStatus}
              style={{ width: '180px' }}
              dropdownStyle={{ borderRadius: '6px' }}
            >
              <Option value="all">Tất cả lịch sử</Option>
              <Option value="dang_di">Đang đi sinh hoạt tạm thời</Option>
              <Option value="da_ve">Đã chuyển về</Option>
            </Select>
          </Space>
        </div>

        <Table 
          columns={tempColumns}
          dataSource={filteredTemp}
          loading={tempLoading}
          rowKey="id"
          pagination={{ 
            defaultPageSize: 50, 
            showSizeChanger: true, 
            pageSizeOptions: ['10', '20', '50', '1000'] 
          }}
        />
      </div>
    );
  };

  const getUniqueColumnFilters = (data, field) => {
    if (!data || !Array.isArray(data)) return [];
    const uniqueVals = [...new Set(data.map(item => item && item[field]).filter(Boolean))];
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

  const columnTypes = {
    mssv: { type: 'text' },
    ho_ten: { type: 'text' },
    gioi_tinh: { type: 'select', options: [{ value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }] },
    ngay_sinh: { type: 'date' },
    lop: { type: 'text' },
    khoa: { type: 'select', options: KHOA_LIST.map(k => ({ value: k, label: k })) },
    nhom: { type: 'select', options: GROUPS_LIST.map(g => ({ value: g, label: g })) },
    dang_vien_du_bi: { type: 'select', options: [{ value: true, label: 'Dự bị' }, { value: false, label: 'Chính thức' }] },
    trang_thai: { 
      type: 'select', 
      options: [
        { value: 'dang_sinh_hoat', label: 'Đang sinh hoạt' },
        { value: 'da_chuyen', label: 'Đã chuyển ra' },
        { value: 'cho_ket_nap', label: 'Chờ kết nạp' },
        { value: 'dang_xet_chinh_thuc', label: 'Đang xét chính thức' }
      ] 
    },
    so_dien_thoai: { type: 'text' },
    email: { type: 'text' },
    email_sv: { type: 'text' },
    cccd: { type: 'text' },
    so_the_dang: { type: 'text' },
    dan_toc: { type: 'text' },
    ton_giao: { type: 'text' },
    xa_phuong_qq: { type: 'text' },
    tinh_tp_qq: { type: 'text' },
    dia_chi_tam_tru: { type: 'text' },
    chi_tiet_dc: { type: 'text' },
    xa_phuong_tt: { type: 'text' },
    tinh_tp_tt: { type: 'text' },
    ngay_vao_dang: { type: 'date' },
    ngay_chinh_thuc: { type: 'date' },
    ngay_chuyen_vao: { type: 'date' },
    noi_chuyen_di: { type: 'text' },
    dvhd: { type: 'text' },
    ho_ten_nguoi_than: { type: 'text' },
    sdt_nguoi_than: { type: 'text' },
    facebook: { type: 'text' },
    ngay_chuyen_ra: { type: 'date' },
    noi_chuyen_ra: { type: 'text' },
    ghi_chu_chuyen: { type: 'text' }
  };

  const wrapEditableColumn = (col, type = 'text', options = []) => {
    const dataIndex = col.dataIndex || col.key;
    if (!dataIndex || dataIndex === 'stt' || dataIndex === 'anh_ca_nhan' || col.key === 'actions' || col.key === 'que_quan') {
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
                setSelectedRecord(record);
                setIsDrawerVisible(true);
              }}
              style={{ padding: 0, height: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </Tooltip>
        )
      },
      {
        title: 'Ảnh',
      dataIndex: 'anh_ca_nhan',
      key: 'anh_ca_nhan',
      width: 80,
      fixed: 'left',
      render: (url) => (
        <Avatar src={getAvatarUrl(url)} icon={<UserOutlined />} style={{ border: '1px solid #d9d9d9' }} />
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
      render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : '--'
    },
    {
      title: 'Lớp',
      dataIndex: 'lop',
      key: 'lop',
      width: 120,
      filters: getUniqueColumnFilters(filteredData, 'lop'),
      onFilter: (value, record) => record.lop === value,
    },
    {
      title: 'Khoa',
      dataIndex: 'khoa',
      key: 'khoa',
      width: 150,
      filters: getUniqueColumnFilters(filteredData, 'khoa'),
      onFilter: (value, record) => record.khoa === value,
    },
    {
      title: 'Nhóm sinh hoạt',
      dataIndex: 'nhom',
      key: 'nhom',
      width: 150,
      filters: getUniqueColumnFilters(filteredData, 'nhom'),
      onFilter: (value, record) => record.nhom === value,
    },
    {
      title: 'Loại',
      dataIndex: 'dang_vien_du_bi',
      key: 'dang_vien_du_bi',
      width: 120,
      render: (duBi) => duBi ? 'Dự bị' : 'Chính thức',
      filters: [
        { text: 'Dự bị', value: true },
        { text: 'Chính thức', value: false }
      ],
      onFilter: (value, record) => record.dang_vien_du_bi === value,
    },
    {
      title: 'Trạng thái sinh hoạt',
      dataIndex: 'trang_thai',
      key: 'trang_thai',
      width: 180,
      render: (status, record) => {
        let color = 'green';
        let text = 'Đang sinh hoạt';
        if (status === 'da_chuyen') { color = 'red'; text = 'Đã chuyển ra'; }
        else if (status === 'cho_ket_nap') { color = 'blue'; text = 'Chờ kết nạp'; }
        else if (status === 'dang_xet_chinh_thuc') { color = 'warning'; text = 'Đang xét chính thức'; }
        
        if (record.trang_thai_tam_thoi === 'dang_di_tam_thoi') {
          return (
            <Space direction="vertical" size={2}>
              <Tag color={color}>{text}</Tag>
              <Tag color="cyan">Sinh hoạt tạm thời</Tag>
            </Space>
          );
        }
        return <Tag color={color}>{text}</Tag>;
      },
      filters: [
        { text: 'Đang sinh hoạt', value: 'dang_sinh_hoat' },
        { text: 'Đã chuyển ra', value: 'da_chuyen' },
        { text: 'Chờ kết nạp', value: 'cho_ket_nap' },
        { text: 'Đang xét chính thức', value: 'dang_xet_chinh_thuc' },
        { text: 'Sinh hoạt tạm thời', value: 'dang_di_tam_thoi' }
      ],
      onFilter: (value, record) => {
        if (value === 'dang_di_tam_thoi') {
          return record.trang_thai_tam_thoi === 'dang_di_tam_thoi';
        }
        return record.trang_thai === value;
      }
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'so_dien_thoai',
      key: 'so_dien_thoai',
      width: 130,
      ...getColumnSearchProps('so_dien_thoai', 'SĐT')
    },
    {
      title: 'Email cá nhân',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      ...getColumnSearchProps('email', 'Email cá nhân')
    },
    {
      title: 'Email sinh viên',
      dataIndex: 'email_sv',
      key: 'email_sv',
      width: 200,
      ...getColumnSearchProps('email_sv', 'Email SV')
    },
    {
      title: 'Số CCCD',
      dataIndex: 'cccd',
      key: 'cccd',
      width: 130,
      ...getColumnSearchProps('cccd', 'Số CCCD')
    },
    {
      title: 'Số thẻ Đảng',
      dataIndex: 'so_the_dang',
      key: 'so_the_dang',
      width: 130,
      render: (text) => text || '--',
      ...getColumnSearchProps('so_the_dang', 'Số thẻ Đảng')
    },
    {
      title: 'Dân tộc',
      dataIndex: 'dan_toc',
      key: 'dan_toc',
      width: 100,
      filters: getUniqueColumnFilters(filteredData, 'dan_toc'),
      onFilter: (value, record) => record.dan_toc === value,
    },
    {
      title: 'Tôn giáo',
      dataIndex: 'ton_giao',
      key: 'ton_giao',
      width: 100,
      filters: getUniqueColumnFilters(filteredData, 'ton_giao'),
      onFilter: (value, record) => record.ton_giao === value,
    },
    {
      title: 'Quê quán',
      key: 'que_quan',
      width: 200,
      render: (_, r) => r.que_quan || getFullHometown(r) || '--'
    },
    {
      title: 'Xã/Phường quê quán',
      dataIndex: 'xa_phuong_qq',
      key: 'xa_phuong_qq',
      width: 180,
      filters: getUniqueColumnFilters(filteredData, 'xa_phuong_qq'),
      onFilter: (value, record) => record.xa_phuong_qq === value,
    },
    {
      title: 'Tỉnh/TP quê quán',
      dataIndex: 'tinh_tp_qq',
      key: 'tinh_tp_qq',
      width: 180,
      filters: getUniqueColumnFilters(filteredData, 'tinh_tp_qq'),
      onFilter: (value, record) => record.tinh_tp_qq === value,
    },
    {
      title: 'Địa chỉ tạm trú',
      dataIndex: 'dia_chi_tam_tru',
      key: 'dia_chi_tam_tru',
      width: 250,
      render: (text, record) => record.dia_chi_tam_tru || getFullTamTru(record) || '--'
    },
    {
      title: 'Địa chỉ thường trú',
      dataIndex: 'dia_chi_thuong_tru',
      key: 'dia_chi_thuong_tru',
      width: 250,
      ...getColumnSearchProps('dia_chi_thuong_tru', 'Địa chỉ thường trú'),
      onFilter: (value, record) => {
        const fullAddress = record.dia_chi_thuong_tru || getFullAddress(record);
        return fullAddress ? fullAddress.toLowerCase().includes(value.toLowerCase()) : false;
      },
      render: (text, record) => record.dia_chi_thuong_tru || getFullAddress(record) || '--'
    },
    {
      title: 'Xã/Phường thường trú',
      dataIndex: 'xa_phuong_tt',
      key: 'xa_phuong_tt',
      width: 180,
      filters: getUniqueColumnFilters(filteredData, 'xa_phuong_tt'),
      onFilter: (value, record) => record.xa_phuong_tt === value,
    },
    {
      title: 'Tỉnh/TP thường trú',
      dataIndex: 'tinh_tp_tt',
      key: 'tinh_tp_tt',
      width: 180,
      filters: getUniqueColumnFilters(filteredData, 'tinh_tp_tt'),
      onFilter: (value, record) => record.tinh_tp_tt === value,
    },
    {
      title: 'Ngày vào Đảng',
      dataIndex: 'ngay_vao_dang',
      key: 'ngay_vao_dang',
      width: 130,
      render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : '--'
    },
    {
      title: 'Ngày chính thức',
      dataIndex: 'ngay_chinh_thuc',
      key: 'ngay_chinh_thuc',
      width: 130,
      render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : '--'
    },
    {
      title: 'Ngày chuyển vào',
      dataIndex: 'ngay_chuyen_vao',
      key: 'ngay_chuyen_vao',
      width: 130,
      render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : '--'
    },
    {
      title: 'Nơi chuyển đi',
      dataIndex: 'noi_chuyen_di',
      key: 'noi_chuyen_di',
      width: 180,
    },
    {
      title: 'Đảng viên hướng dẫn',
      dataIndex: 'dvhd',
      key: 'dvhd',
      width: 180,
    },
    {
      title: 'Người thân',
      dataIndex: 'ho_ten_nguoi_than',
      key: 'ho_ten_nguoi_than',
      width: 180,
    },
    {
      title: 'SĐT người thân',
      dataIndex: 'sdt_nguoi_than',
      key: 'sdt_nguoi_than',
      width: 130,
    },
    {
      title: 'Facebook',
      dataIndex: 'facebook',
      key: 'facebook',
      width: 120,
      render: (url) => url ? (
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          onClick={(e) => e.stopPropagation()}
          style={{ color: '#1890ff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <FacebookOutlined /> Liên kết
        </a>
      ) : '--'
    },
    {
      title: 'Ngày chuyển ra',
      dataIndex: 'ngay_chuyen_ra',
      key: 'ngay_chuyen_ra',
      width: 130,
      render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : '--'
    },
    {
      title: 'Nơi chuyển ra',
      dataIndex: 'noi_chuyen_ra',
      key: 'noi_chuyen_ra',
      width: 180,
      render: (text) => text || '--'
    },
    {
      title: 'Ghi chú chuyển',
      dataIndex: 'ghi_chu_chuyen',
      key: 'ghi_chu_chuyen',
      width: 200,
      render: (text) => text || '--'
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
}, [filteredData, editingCell, editValue, uniqueKhoa]);

  return (
    <div style={{ padding: '0 8px' }}>
      {/* Row 1: Header Title & Main Action Buttons (Perfectly Balanced) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f0f0f0', paddingBottom: '12px' }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '4px', height: '22px', backgroundColor: '#c62828', borderRadius: '2px' }}></span>
            Quản lý Đảng viên
          </Title>
        </div>
      </div>

      <Tabs 
        activeKey={activeMainTab} 
        onChange={setActiveMainTab} 
        size="large"
        type="card"
      >
        {!isViewOnlyMode && (
          <TabPane tab={<span><ContactsOutlined /> Danh sách quản lý</span>} key="list">
          {/* Main Toolbar: Search and Action Buttons aligned */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ width: '280px' }}>
              <Input 
                placeholder="Tìm kiếm mã số, họ tên..." 
                onChange={handleSearch}
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                style={{ width: '100%', borderRadius: '6px' }} 
                allowClear
              />
            </div>
            
            <Space size={10} style={{ flexWrap: 'wrap' }}>
              {selectedRowKeys.length > 0 ? (
                <>
                  <PermissionWrapper module="members" action="delete">
                    <Popconfirm title="Bạn có chắc chắn muốn xóa các Đảng viên đã chọn?" onConfirm={handleBulkDelete} okText="Xóa" cancelText="Hủy">
                      <Button 
                        danger 
                        type="primary"
                        icon={<DeleteOutlined />}
                        style={{ borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        Xóa ({selectedRowKeys.length})
                      </Button>
                    </Popconfirm>
                  </PermissionWrapper>
                  
                  <PermissionWrapper module="members" action="transfer">
                    <Button 
                      icon={<ExportOutlined />} 
                      onClick={() => setIsTransferVisible(true)}
                      style={{ 
                        borderRadius: '6px', 
                        borderColor: '#faad14', 
                        color: '#faad14', 
                        backgroundColor: '#fffbe6',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px'
                      }}
                    >
                      Chuyển sinh hoạt ({selectedRowKeys.length})
                    </Button>
                  </PermissionWrapper>

                  <PermissionWrapper module="members" action="transfer">
                    <Button 
                      icon={<SwapOutlined />} 
                      onClick={() => setIsTempTransferVisible(true)}
                      style={{ 
                        borderRadius: '6px', 
                        borderColor: '#13c2c2', 
                        color: '#13c2c2', 
                        backgroundColor: '#e6fffb',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px'
                      }}
                    >
                      Chuyển tạm thời ({selectedRowKeys.length})
                    </Button>
                  </PermissionWrapper>

                  <PermissionWrapper module="members" action="update">
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'allow',
                            label: 'Cấp quyền tự sửa lý lịch',
                            icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                            onClick: () => handleBulkSelfEditPermission(true)
                          },
                          {
                            key: 'deny',
                            label: 'Khóa quyền tự sửa lý lịch',
                            icon: <CloseOutlined style={{ color: '#ff4d4f' }} />,
                            onClick: () => handleBulkSelfEditPermission(false)
                          }
                        ]
                      }}
                      trigger={['click']}
                    >
                      <Button
                        icon={<EditOutlined />}
                        style={{
                          borderRadius: '6px',
                          borderColor: '#1890ff',
                          color: '#1890ff',
                          backgroundColor: '#e6f7ff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        Quyền chỉnh sửa ({selectedRowKeys.length})
                      </Button>
                    </Dropdown>
                  </PermissionWrapper>
                </>
              ) : (
                <>
                  <PermissionWrapper module="members" action="create">
                    <Button 
                      icon={<UploadOutlined />} 
                      onClick={() => setIsImportVisible(true)} 
                      style={{ borderRadius: '6px', color: '#555555', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      Nhập từ Excel
                    </Button>
                  </PermissionWrapper>
                  <Button 
                    icon={<DownloadOutlined />} 
                    onClick={handleOpenExportModal} 
                    style={{ borderRadius: '6px', color: '#555555', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Xuất Excel
                  </Button>
                  <Button 
                    icon={<EyeOutlined />} 
                    onClick={() => setIsAllInfoVisible(true)} 
                    style={{ borderRadius: '6px', color: '#1890ff', borderColor: '#1890ff', backgroundColor: '#e6f7ff', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Xem toàn bộ thông tin
                  </Button>
                </>
              )}
              
              <PermissionWrapper module="members" action="create">
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => setIsFormVisible(true)}
                  style={{ 
                    backgroundColor: '#c62828', 
                    borderColor: '#c62828', 
                    borderRadius: '6px', 
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Thêm Đảng viên mới
                </Button>
              </PermissionWrapper>
            </Space>
          </div>

          {/* Filters Bar in a clean Row/Col Grid */}
          <div style={{ 
            background: '#fafafa', 
            padding: '16px', 
            borderRadius: '8px', 
            border: '1px solid #f0f0f0',
            marginBottom: 16 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1a1a1a', fontSize: '14px', fontWeight: 600 }}>
                <FilterOutlined style={{ color: '#c62828' }} /> <span>Bộ lọc dữ liệu</span>
              </div>
              
              {((filterKhoa && filterKhoa.length > 0) || (filterLop && filterLop.length > 0) || (filterNhom && filterNhom.length > 0) || filterNgayVaoDangRange || filterNoiChuyenDi || filterLoaiDangVien || filterCoTheDang || (filterIntake && filterIntake.length > 0)) && (
                <Button 
                  type="text" 
                  danger 
                  onClick={resetFilters} 
                  icon={<CloseOutlined />}
                  style={{ display: 'flex', alignItems: 'center', fontWeight: 500, marginLeft: 'auto' }}
                  size="small"
                >
                  Xóa lọc
                </Button>
              )}
            </div>
            
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={4} lg={4}>
                <Select 
                  mode="multiple"
                  maxTagCount="responsive"
                  placeholder="Chọn Khóa" 
                  style={{ width: '100%' }} 
                  allowClear 
                  value={filterIntake} 
                  onChange={val => setFilterIntake(val || [])}
                  dropdownStyle={{ borderRadius: '6px' }}
                >
                  {uniqueIntakes.map(k => <Option key={k} value={k}>{k}</Option>)}
                </Select>
              </Col>

              <Col xs={24} sm={12} md={5} lg={5}>
                <Select 
                  mode="multiple"
                  maxTagCount="responsive"
                  showSearch
                  placeholder="Chọn Khoa" 
                  style={{ width: '100%' }} 
                  allowClear 
                  value={filterKhoa} 
                  onChange={val => setFilterKhoa(val || [])}
                  optionFilterProp="children"
                  filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                  dropdownStyle={{ borderRadius: '6px' }}
                >
                  {uniqueKhoa.map(k => <Option key={k} value={k}>{k}</Option>)}
                </Select>
              </Col>
              
              <Col xs={24} sm={12} md={5} lg={5}>
                <Select 
                  mode="multiple"
                  maxTagCount="responsive"
                  showSearch
                  placeholder="Chọn Lớp" 
                  style={{ width: '100%' }} 
                  allowClear 
                  value={filterLop} 
                  onChange={val => setFilterLop(val || [])}
                  optionFilterProp="children"
                  filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                  dropdownStyle={{ borderRadius: '6px' }}
                >
                  {uniqueLop.map(l => <Option key={l} value={l}>{l}</Option>)}
                </Select>
              </Col>
              
              <Col xs={24} sm={12} md={5} lg={5}>
                <Select 
                  mode="multiple"
                  maxTagCount="responsive"
                  showSearch
                  placeholder="Chọn Nhóm" 
                  style={{ width: '100%' }} 
                  allowClear 
                  value={filterNhom} 
                  onChange={val => setFilterNhom(val || [])}
                  optionFilterProp="children"
                  filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                  dropdownStyle={{ borderRadius: '6px' }}
                >
                  {uniqueNhom.map(n => <Option key={n} value={n}>{n}</Option>)}
                </Select>
              </Col>

              <Col xs={24} sm={12} md={5} lg={5}>
                <Select 
                  placeholder="Loại Đảng viên" 
                  style={{ width: '100%' }} 
                  allowClear 
                  value={filterLoaiDangVien} 
                  onChange={(val) => {
                    setFilterLoaiDangVien(val);
                    if (val === 'Dự bị' && filterCoTheDang === 'Đã có thẻ') {
                      setFilterCoTheDang(null);
                    }
                  }} 
                  dropdownStyle={{ borderRadius: '6px' }}
                >
                  <Option value="Chính thức">Chính thức</Option>
                  <Option value="Dự bị">Dự bị</Option>
                </Select>
              </Col>
              
              <Col xs={24} sm={12} md={6} lg={6}>
                <Select 
                  placeholder="Thẻ Đảng" 
                  style={{ width: '100%' }} 
                  allowClear 
                  value={filterCoTheDang} 
                  onChange={setFilterCoTheDang} 
                  dropdownStyle={{ borderRadius: '6px' }}
                  disabled={filterLoaiDangVien === 'Dự bị'}
                >
                  <Option value="Đã có thẻ">Đã có thẻ</Option>
                  <Option value="Chưa có thẻ">Chưa có thẻ</Option>
                </Select>
              </Col>
              
              <Col xs={24} sm={12} md={6} lg={6}>
                <Select 
                  showSearch 
                  placeholder="Nơi chuyển vào" 
                  style={{ width: '100%' }} 
                  allowClear 
                  value={filterNoiChuyenDi} 
                  onChange={setFilterNoiChuyenDi} 
                  optionFilterProp="children" 
                  filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())} 
                  dropdownStyle={{ borderRadius: '6px' }}
                >
                  {uniqueNoiChuyenDi.map(n => <Option key={n} value={n}>{n}</Option>)}
                </Select>
              </Col>

              <Col xs={24} sm={24} md={12} lg={12}>
                <DatePicker.RangePicker 
                  style={{ width: '100%', borderRadius: '6px' }} 
                  placeholder={['Từ ngày (Vào Đảng)', 'Đến ngày']} 
                  format="DD/MM/YYYY" 
                  value={filterNgayVaoDangRange} 
                  onChange={setFilterNgayVaoDangRange} 
                  allowClear 
                />
              </Col>
            </Row>
          </div>

          <Table 
            rowSelection={rowSelection}
            columns={columns} 
            dataSource={filteredData} 
            loading={loading}
            rowKey="id"
            pagination={{ 
              defaultPageSize: 50, 
              showSizeChanger: true, 
              pageSizeOptions: ['10', '20', '50', '100', '1000'] 
            }}
             onRow={(record) => {
              return {
                onClick: (event) => {
                  if (
                    event.target.closest('.ant-table-selection-column') ||
                    event.target.closest('.ant-checkbox-wrapper') ||
                    event.target.closest('.ant-checkbox') ||
                    event.target.tagName === 'INPUT'
                  ) {
                    return;
                  }
                  handleRowClick(record);
                },
                style: { cursor: 'pointer' }
              };
            }}
          />
        </TabPane>
        )}

        <TabPane tab={<span><TeamOutlined /> Danh sách nhóm sinh hoạt</span>} key="groups">
          {renderGroupDirectory()}
        </TabPane>
      </Tabs>

      <DangVienForm 
        open={isFormVisible} 
        onCancel={() => setIsFormVisible(false)} 
        onSave={async (values) => {
          try {
            // Check unique MSSV (checking both string/number and lower/upper case)
            const mssvStr = String(values.mssv).trim();
            
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
            if (existingDvDoc) {
              message.error("MSSV đã tồn tại trong hệ thống!");
              return;
            }

            const cleanValues = {
              ...values,
              mssv: mssvStr
            };

            const docRef = await addDoc(collection(db, "dang_vien"), {
              ...cleanValues,
              created_at: new Date().toISOString()
            });

            // Ghi nhận lịch sử khởi tạo
            await addDoc(collection(db, "lich_su_cap_nhat"), {
              dang_vien_id: docRef.id,
              mssv: mssvStr,
              ho_ten: values.ho_ten,
              updated_by: currentUser?.email || currentUser?.username || "Hệ thống",
              updated_at: new Date().toISOString(),
              action: "create",
              changes: []
            });
            
            // Also write to dang_vien_dang_sinh_hoat for complete sync
            await addDoc(collection(db, "dang_vien_dang_sinh_hoat"), {
              mssv: mssvStr,
              ho_ten: values.ho_ten,
              cccd: values.cccd || '',
              lop: values.lop || '',
              khoa: values.khoa || '',
              ngay_sinh: values.ngay_sinh || null,
              gioi_tinh: values.gioi_tinh || 'Nam',
              que_quan: values.tinh_tp_qq || '',
              email: values.email || '',
              so_dien_thoai: values.so_dien_thoai || '',
              facebook: values.facebook || '',
              ngay_vao_dang: values.ngay_vao_dang || null,
              so_qd: values.so_the_dang || '',
              ngay_ki_qd: null,
              dang_vien_huong_dan: values.dvhd || '',
              created_at: new Date().toISOString()
            });

            message.success("Thêm mới Đảng viên thành công");
            setIsFormVisible(false);
            fetchDangVien();
          } catch (error) {
            console.error(error);
            message.error("Lỗi khi thêm mới Đảng viên");
          }
        }} 
      />

      <ImportExcel 
        open={isImportVisible} 
        onCancel={() => setIsImportVisible(false)} 
        onSuccess={() => { setIsImportVisible(false); fetchDangVien(); }} 
      />

      <ProfileDrawer 
        open={isDrawerVisible} 
        onClose={() => setIsDrawerVisible(false)} 
        data={selectedRecord} 
        onUpdate={fetchDangVien} 
      />

      <Modal
        title="Chuyển sinh hoạt Đảng viên"
        open={isTransferVisible}
        onOk={handleBulkTransfer}
        onCancel={() => {
          setIsTransferVisible(false);
          transferForm.resetFields();
        }}
        okText="Xác nhận"
        cancelText="Hủy"
        confirmLoading={loading}
      >
        <Form form={transferForm} layout="vertical">
          <Form.Item name="ngay_chuyen" label="Ngày chuyển" rules={[{ required: true, message: 'Vui lòng chọn ngày chuyển' }]}>
            <DatePicker format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="noi_chuyen" label="Nơi chuyển đến (Không bắt buộc)">
            <Input />
          </Form.Item>
          <Form.Item name="ghi_chu" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Chuyển sinh hoạt tạm thời Đảng viên"
        open={isTempTransferVisible}
        onOk={handleBulkTempTransfer}
        onCancel={() => {
          setIsTempTransferVisible(false);
          tempTransferForm.resetFields();
        }}
        okText="Xác nhận"
        cancelText="Hủy"
        confirmLoading={loading}
      >
        <Form form={tempTransferForm} layout="vertical" initialValues={{ ngay_chuyen_tam_thoi: dayjs() }}>
          <Form.Item name="ngay_chuyen_tam_thoi" label="Ngày chuyển tạm thời" rules={[{ required: true, message: 'Vui lòng chọn ngày chuyển đi tạm thời' }]}>
            <DatePicker format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="thoi_gian_ve" label="Thời gian về dự kiến (Không bắt buộc)">
            <Input placeholder="Nhập hạn hoặc thời gian dự kiến về (VD: 6 tháng, hoặc ngày cụ thể)..." />
          </Form.Item>
          <Form.Item name="noi_chuyen_den_tam_thoi" label="Nơi chuyển đến tạm thời (Không bắt buộc)">
            <Input placeholder="Nhập tên trường học, đơn vị hoặc chi bộ tạm thời..." />
          </Form.Item>
          <Form.Item name="ghi_chu" label="Ghi chú">
            <Input.TextArea rows={3} placeholder="Nhập các ghi chú bổ sung..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
              <span style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a1a' }}>
                Bảng Tổng Hợp Chi Tiết Toàn Bộ Thông Tin Đảng Viên ({filteredData.length} đồng chí)
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
          scroll={{ x: 5800, y: isTableFullscreen ? 'calc(100vh - 155px)' : 'calc(80vh - 135px)' }}
          bordered
          pagination={{
            defaultPageSize: 50,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100', '1000'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} Đảng viên`
          }}
        />
      </Modal>

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
        onCancel={() => setIsExportModalVisible(false)}
        width={850}
        style={{ top: 40 }}
        footer={[
          <Button key="cancel" onClick={() => setIsExportModalVisible(false)} style={{ height: 40, borderRadius: '6px' }}>
            HỦY BỎ
          </Button>,
          <Button
            key="zip-photos"
            type="dashed"
            icon={<FileZipOutlined style={{ color: '#fa8c16' }} />}
            onClick={exportPhotosZip}
            loading={isExportingPhotos}
            style={{ borderColor: '#fa8c16', color: '#fa8c16', height: 40, fontWeight: 600, borderRadius: '6px' }}
          >
            TẢI ẢNH ĐẢNG VIÊN (.ZIP)
          </Button>,
          <Button
            key="ok"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={exportExcel}
            style={{ backgroundColor: '#c62828', borderColor: '#c62828', height: 40, fontWeight: 700, borderRadius: '6px' }}
          >
            XUẤT FILE EXCEL
          </Button>
        ]}
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
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Lớp:</div>
                  <Select 
                    placeholder="Chọn Lớp" 
                    value={filterLop} 
                    onChange={setFilterLop} 
                    style={{ width: '100%' }}
                    allowClear
                    dropdownStyle={{ borderRadius: '6px' }}
                  >
                    {[...new Set(data.map(d => d.lop).filter(Boolean))].sort().map(lop => (
                      <Option key={lop} value={lop}>{lop}</Option>
                    ))}
                  </Select>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Nhóm sinh hoạt:</div>
                  <Select 
                    placeholder="Chọn Nhóm" 
                    value={filterNhom} 
                    onChange={setFilterNhom} 
                    style={{ width: '100%' }}
                    allowClear
                    dropdownStyle={{ borderRadius: '6px' }}
                  >
                    {[...new Set(data.map(d => d.nhom).filter(Boolean))].sort().map(nhom => (
                      <Option key={nhom} value={nhom}>{nhom}</Option>
                    ))}
                  </Select>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Loại Đảng viên:</div>
                  <Select 
                    placeholder="Chọn Loại" 
                    value={filterLoaiDangVien} 
                    onChange={setFilterLoaiDangVien} 
                    style={{ width: '100%' }}
                    allowClear
                    dropdownStyle={{ borderRadius: '6px' }}
                  >
                    <Option value="dubi">Dự bị</Option>
                    <Option value="chinhthuc">Chính thức</Option>
                  </Select>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Thẻ Đảng:</div>
                  <Select 
                    placeholder="Chọn Trạng thái" 
                    value={filterCoTheDang} 
                    onChange={setFilterCoTheDang} 
                    style={{ width: '100%' }}
                    allowClear
                    dropdownStyle={{ borderRadius: '6px' }}
                  >
                    <Option value="co">Đã cấp</Option>
                    <Option value="chua">Chưa cấp</Option>
                  </Select>
                </Col>
              </Row>
            </div>
          )}

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

    </div>
  );
};

export default DangVien;
