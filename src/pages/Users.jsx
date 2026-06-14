import { useState, useEffect, useMemo } from 'react';
import { 
  Card, Typography, Tag, Space, Form, 
  Input, Select, Button, message, Avatar, Row, Col, Divider, Empty,
  Tabs, Table, Modal, Popconfirm, Alert, Progress, Switch, Spin, Tooltip, Badge
} from 'antd';
import { 
  UserOutlined, KeyOutlined, SafetyCertificateOutlined, SaveOutlined,
  SearchOutlined, SolutionOutlined, BookOutlined, TeamOutlined,
  HistoryOutlined, LoginOutlined, ChromeOutlined, WindowsOutlined,
  AppleOutlined, AndroidOutlined, DesktopOutlined, CompassOutlined,
  ClockCircleOutlined, ReloadOutlined, InfoCircleOutlined,
  DeleteOutlined, ExclamationCircleOutlined,
  DatabaseOutlined, WarningOutlined, CalendarOutlined,
  DownloadOutlined, UploadOutlined, PlusOutlined,
  HomeOutlined, CloseCircleOutlined, AuditOutlined, LockOutlined,
  UnorderedListOutlined, CloudUploadOutlined, UserSwitchOutlined
} from '@ant-design/icons';
import { collection, getDocs, updateDoc, doc, deleteDoc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ROLES, permissionService, DEFAULT_KHOA, DEFAULT_NHOM } from '../services/permissionService';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const Users = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.BITHU;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeMainTab = useMemo(() => {
    const tab = searchParams.get('tab');
    if (tab === 'rbac' || tab === 'role_permissions') return 'user_roles';
    if (tab === 'history') return 'history_logs';
    if (tab === 'login') return 'login_logs';
    if (tab === 'reset') return 'backup_restore';
    return tab || (isAdmin ? 'user_roles' : 'editing_period');
  }, [searchParams, isAdmin]);
  
  const setActiveMainTab = (key) => {
    setSearchParams({ tab: key });
  };
  const [matrixSearchText, setMatrixSearchText] = useState('');
  const [isEditingPeriodOpen, setIsEditingPeriodOpen] = useState(false);
  const [togglingPeriod, setTogglingPeriod] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [rollingBackId, setRollingBackId] = useState(null);
  const [loginLogs, setLoginLogs] = useState([]);
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Filters
  const [historySearch, setHistorySearch] = useState('');
  const [loginSearch, setLoginSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  // BCH config states
  const [bchForm] = Form.useForm();
  const [savingBch, setSavingBch] = useState(false);
  const [loadingBch, setLoadingBch] = useState(false);

  // Reset data states
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetProgress, setResetProgress] = useState({ current: 0, total: 0, collection: '' });

  // Backup, Restore and Seed states
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState({ current: 0, total: 0, status: '' });
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [uploadedBackupData, setUploadedBackupData] = useState(null);
  const [seeding, setSeeding] = useState(false);

  // Dynamic Permission Matrix States
  const [rolePerms, setRolePerms] = useState({});
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  // Category management states
  const [faculties, setFaculties] = useState([]);
  const [groups, setGroups] = useState([]);
  const [newFaculty, setNewFaculty] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [editingFacultyIndex, setEditingFacultyIndex] = useState(null);
  const [editingFacultyValue, setEditingFacultyValue] = useState('');
  const [editingGroupIndex, setEditingGroupIndex] = useState(null);
  const [editingGroupValue, setEditingGroupValue] = useState('');

  const RESET_COLLECTIONS = [
    { key: 'dang_vien', label: 'Danh sách Đảng viên', icon: <TeamOutlined />, color: '#c62828', description: 'Xóa toàn bộ hồ sơ Đảng viên trong hệ thống (bao gồm thông tin cá nhân, Đảng tịch, liên hệ...)' },
    { key: 'ho_so_ket_nap', label: 'Hồ sơ kết nạp Đảng', icon: <SolutionOutlined />, color: '#eb2f96', description: 'Xóa toàn bộ hồ sơ kết nạp Đảng viên mới (quần chúng ưu tú, cảm tình Đảng...)' },
    { key: 'ho_so_chinh_thuc', label: 'Hồ sơ chính thức Đảng', icon: <BookOutlined />, color: '#722ed1', description: 'Xóa toàn bộ hồ sơ Đảng viên dự bị đang làm thủ tục công nhận chính thức' },
    { key: 'chuyen_sinh_hoat', label: 'Hồ sơ chuyển sinh hoạt & Chuyển đi', icon: <CompassOutlined />, color: '#13c2c2', description: 'Xóa toàn bộ hồ sơ trong quy trình chuyển đi/chuyển sinh hoạt tạm thời và danh sách Đảng viên đã chuyển đi khỏi chi bộ.' },
    { key: 'diem_danh', label: 'Dữ liệu sinh hoạt & Điểm danh', icon: <SafetyCertificateOutlined />, color: '#13c2c2', description: 'Xóa toàn bộ các buổi họp sinh hoạt chi bộ và kết quả điểm danh của các Đảng viên' },
    { key: 'voting', label: 'Dữ liệu biểu quyết Chi bộ', icon: <UserOutlined />, color: '#2f54eb', description: 'Xóa toàn bộ phiên biểu quyết chi bộ, danh sách ứng viên và kết quả bỏ phiếu' },
    { key: 'thong_bao', label: 'Thông báo chi bộ', icon: <InfoCircleOutlined />, color: '#fa8c16', description: 'Xóa toàn bộ thông báo nội bộ và bảng tin đã đăng tải trên hệ thống' },
    { key: 'dangky_213', label: 'Đăng ký cư trú 213', icon: <HomeOutlined />, color: '#fa8c16', description: 'Xóa toàn bộ hồ sơ và lịch sử giới thiệu sinh hoạt nơi cư trú 213 của Đảng viên' },
    { key: 'vang_hop', label: 'Đơn đăng ký xin vắng họp', icon: <CloseCircleOutlined />, color: '#faad14', description: 'Xóa toàn bộ đơn đăng ký xin vắng họp và ảnh minh chứng vắng họp của Đảng viên' },
    { key: 'le_ket_nap_invitations', label: 'Giấy mời Lễ kết nạp', icon: <CalendarOutlined />, color: '#d46b08', description: 'Xóa toàn bộ thư mời và giấy báo tham gia lễ kết nạp Đảng viên mới' },
    { key: 'lich_su_cap_nhat', label: 'Lịch sử chỉnh sửa hồ sơ', icon: <HistoryOutlined />, color: '#fa541c', description: 'Xóa toàn bộ nhật ký ghi nhận các thay đổi chỉnh sửa hồ sơ Đảng viên' },
    { key: 'nhat_ky_dang_nhap', label: 'Nhật ký đăng nhập hệ thống', icon: <LoginOutlined />, color: '#52c41a', description: 'Xóa toàn bộ lịch sử truy cập và đăng nhập hệ thống của người dùng' }
  ];

  const handleResetCollection = async (collectionKey) => {
    setResetting(true);
    setResetConfirmText('');
    try {
      // Find actual collection keys associated with this option
      let targetCollections = [collectionKey];
      if (collectionKey === 'chuyen_sinh_hoat') {
        targetCollections = ['chuyen_sinh_hoat', 'transferred'];
      } else if (collectionKey === 'thong_bao') {
        targetCollections = ['notifications'];
      } else if (collectionKey === 'diem_danh') {
        targetCollections = ['lich_hop', 'meetings', 'attendances'];
      } else if (collectionKey === 'voting') {
        targetCollections = ['voting_sessions', 'voting_candidates', 'voting_votes'];
      } else if (collectionKey === 'dangky_213') {
        targetCollections = ['dangky_213'];
      } else if (collectionKey === 'vang_hop') {
        targetCollections = ['vang_hop'];
      }
      
      // Calculate total docs across all target collections
      let grandTotal = 0;
      const colSnapshots = [];
      for (const col of targetCollections) {
        const snap = await getDocs(collection(db, col));
        grandTotal += snap.docs.length;
        colSnapshots.push({ name: col, snap });
      }

      if (grandTotal === 0) {
        message.info(`Dữ liệu của mục này đang trống, không cần xóa.`);
        setResetting(false);
        return;
      }

      setResetProgress({ current: 0, total: grandTotal, collection: collectionKey });
      
      for (const colObj of colSnapshots) {
        const docs = colObj.snap.docs;
        const colName = colObj.name;
        const batchSize = 10;
        
        for (let i = 0; i < docs.length; i += batchSize) {
          const batch = docs.slice(i, i + batchSize);
          await Promise.all(batch.map(d => deleteDoc(doc(db, colName, d.id))));
          setResetProgress(p => ({ ...p, current: p.current + batch.length }));
        }
      }

      message.success(`Đã xóa thành công toàn bộ dữ liệu của danh mục này (${grandTotal} bản ghi)!`);
      
      // Refresh relevant data
      if (collectionKey === 'dang_vien') fetchUsers();
      if (collectionKey === 'lich_su_cap_nhat') fetchHistoryLogs();
      if (collectionKey === 'nhat_ky_dang_nhap') fetchLoginLogs();
    } catch (err) {
      console.error(err);
      message.error(`Lỗi khi xóa dữ liệu: ${err.message}`);
    } finally {
      setResetting(false);
      setResetProgress({ current: 0, total: 0, collection: '' });
    }
  };

  const handleBackupData = async () => {
    setBackingUp(true);
    message.loading({ content: 'Đang chuẩn bị sao lưu toàn bộ hệ thống...', key: 'backup' });
    try {
      const collectionsToBackup = [
        'dang_vien', 'lich_su_cap_nhat', 'nhat_ky_dang_nhap', 'notifications', 
        'ho_so_ket_nap', 'ho_so_chinh_thuc', 'le_ket_nap_invitations', 
        'meetings', 'attendances', 'voting_sessions', 'voting_candidates', 'voting_votes',
        'system_config', 'dangky_213', 'vang_hop', 'lich_hop'
      ];
      
      const backupData = {};
      
      for (const col of collectionsToBackup) {
        const snapshot = await getDocs(collection(db, col));
        backupData[col] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      // Generate JSON file download
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      const timestamp = dayjs().format('YYYYMMDD_HHmmss');
      downloadAnchor.setAttribute('download', `CBSV_Database_Backup_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      message.success({ content: 'Sao lưu dữ liệu hệ thống thành công!', key: 'backup', duration: 3 });
    } catch (e) {
      console.error(e);
      message.error({ content: 'Lỗi sao lưu hệ thống: ' + e.message, key: 'backup', duration: 4 });
    } finally {
      setBackingUp(false);
    }
  };

  const handleFileImportChange = (info) => {
    const file = info.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        // Basic validation
        if (typeof json !== 'object' || json === null) {
          throw new Error("Định dạng tệp tin sao lưu không chính xác!");
        }
        setUploadedBackupData(json);
        setIsRestoreModalVisible(true);
      } catch (err) {
        message.error("Lỗi đọc tệp sao lưu: " + err.message);
      }
    };
    reader.readAsText(file);
    info.target.value = '';
  };

  const handleExecuteRestore = async (strategy) => {
    if (!uploadedBackupData) return;
    setIsRestoreModalVisible(false);
    setRestoring(true);
    setRestoreProgress({ current: 0, total: 100, status: 'Bắt đầu quá trình khôi phục...' });
    
    try {
      const collections = Object.keys(uploadedBackupData);
      let totalDocs = 0;
      collections.forEach(col => {
        if (Array.isArray(uploadedBackupData[col])) {
          totalDocs += uploadedBackupData[col].length;
        }
      });
      
      if (totalDocs === 0) {
        message.warning("Tệp sao lưu không chứa dữ liệu!");
        setRestoring(false);
        return;
      }
      
      setRestoreProgress({ current: 0, total: totalDocs, status: 'Đang chuẩn bị cơ sở dữ liệu...' });
      let restoredCount = 0;
      
      for (const col of collections) {
        const docsArray = uploadedBackupData[col];
        if (!Array.isArray(docsArray)) continue;
        
        setRestoreProgress(p => ({ ...p, status: `Đang khôi phục bảng "${col}"...` }));
        
        // If overwrite strategy, delete existing docs in this collection first
        if (strategy === 'overwrite') {
          const snapshot = await getDocs(collection(db, col));
          const batchSize = 15;
          const existingDocs = snapshot.docs;
          for (let i = 0; i < existingDocs.length; i += batchSize) {
            const batch = existingDocs.slice(i, i + batchSize);
            await Promise.all(batch.map(d => deleteDoc(doc(db, col, d.id))));
          }
        }
        
        // Write the backup documents
        const batchSize = 10;
        for (let i = 0; i < docsArray.length; i += batchSize) {
          const batch = docsArray.slice(i, i + batchSize);
          await Promise.all(batch.map(async (docData) => {
            const { id, ...cleanData } = docData;
            await setDoc(doc(db, col, id), cleanData);
            restoredCount++;
            setRestoreProgress(p => ({ ...p, current: restoredCount }));
          }));
        }
      }
      
      message.success(`Khôi phục dữ liệu thành công! Tổng cộng ${restoredCount} bản ghi.`);
      fetchUsers();
      fetchHistoryLogs();
      fetchLoginLogs();
    } catch (e) {
      console.error(e);
      message.error("Lỗi khôi phục hệ thống: " + e.message);
    } finally {
      setRestoring(false);
      setUploadedBackupData(null);
      setRestoreProgress({ current: 0, total: 0, status: '' });
    }
  };

  const handleSeedDatabase = async () => {
    setSeeding(true);
    message.loading({ content: 'Đang khởi tạo dữ liệu mẫu cho hệ thống...', key: 'seed' });
    
    try {
      const collectionsToClear = [
        'dang_vien', 'lich_su_cap_nhat', 'nhat_ky_dang_nhap', 'notifications', 
        'meetings', 'attendances', 'voting_sessions', 'voting_candidates', 'voting_votes',
        'ho_so_ket_nap', 'ho_so_chinh_thuc', 'le_ket_nap_invitations',
        'dangky_213', 'vang_hop', 'lich_hop', 'chuyen_sinh_hoat', 'transferred'
      ];
      
      for (const col of collectionsToClear) {
        const snap = await getDocs(collection(db, col));
        await Promise.all(snap.docs.map(d => deleteDoc(doc(db, col, d.id))));
      }
      
      const seedDangVien = [
        {
          id: 'seed_user_admin',
          ho_ten: 'Đào Thị Lệ Hằng',
          mssv: 'admin',
          cccd: '048204001234',
          role: ROLES.ADMIN,
          loai_dang_vien: 'Chính thức',
          email: 'hangdtl@due.edu.vn',
          sdt: '0905999999',
          khoa: 'P.CTSV',
          lop: 'Chi ủy',
          trang_thai: 'dang_sinh_hoat',
          created_at: new Date().toISOString()
        },
        {
          id: 'seed_user_bithu',
          ho_ten: 'Phan Minh Đức',
          mssv: 'bithu',
          cccd: '048204005678',
          role: ROLES.BITHU,
          loai_dang_vien: 'Chính thức',
          email: 'ducpm@due.edu.vn',
          sdt: '0905888888',
          khoa: 'Lý luận chính trị',
          lop: 'Chi ủy',
          trang_thai: 'dang_sinh_hoat',
          created_at: new Date().toISOString()
        },
        {
          id: 'seed_user_phobithu',
          ho_ten: 'Trần Nguyễn Bảo Châu',
          mssv: 'phobithu',
          cccd: '048204004321',
          role: ROLES.PHOBIHU,
          loai_dang_vien: 'Chính thức',
          email: 'chautnb@due.edu.vn',
          sdt: '0905777777',
          khoa: 'Quản trị Kinh doanh',
          lop: 'Chi ủy',
          trang_thai: 'dang_sinh_hoat',
          created_at: new Date().toISOString()
        },
        {
          id: 'seed_dv_1',
          ho_ten: 'Nguyễn Văn Minh',
          mssv: '2311210001',
          cccd: '048204000001',
          role: ROLES.DANGVIEN,
          loai_dang_vien: 'Chính thức',
          email: 'minhnv23@due.edu.vn',
          sdt: '0911000001',
          khoa: 'Marketing',
          lop: '47K01.2',
          trang_thai: 'dang_sinh_hoat',
          created_at: new Date().toISOString()
        },
        {
          id: 'seed_dv_2',
          ho_ten: 'Lê Thị Khánh Huyền',
          mssv: '2411210002',
          cccd: '048204000002',
          role: ROLES.DANGVIEN,
          loai_dang_vien: 'Dự bị',
          dang_vien_du_bi: true,
          ngay_vao_dang: '2025-09-12',
          ho_so_status: 3,
          hoc_lop_dv_moi: true,
          dvhd_ho_so: 'Trần Nguyễn Bảo Châu',
          dvhd_email: 'chautnb@due.edu.vn',
          email: 'huyenltk24@due.edu.vn',
          sdt: '0911000002',
          khoa: 'Quản trị Kinh doanh',
          lop: '48K02.1',
          trang_thai: 'dang_sinh_hoat',
          created_at: new Date().toISOString()
        },
        {
          id: 'seed_dv_3',
          ho_ten: 'Hoàng Anh Tuấn',
          mssv: '2311210003',
          cccd: '048204000003',
          role: ROLES.DANGVIEN,
          loai_dang_vien: 'Dự bị',
          dang_vien_du_bi: true,
          ngay_vao_dang: '2025-05-18',
          ho_so_status: 5,
          hoc_lop_dv_moi: true,
          dvhd_ho_so: 'Nguyễn Văn Minh',
          dvhd_email: 'minhnv23@due.edu.vn',
          email: 'tuanha23@due.edu.vn',
          sdt: '0911000003',
          khoa: 'Ngân hàng',
          lop: '47K12.3',
          trang_thai: 'dang_sinh_hoat',
          created_at: new Date().toISOString()
        },
        {
          id: 'seed_dv_4',
          ho_ten: 'Trần Quốc Khánh',
          mssv: '2511210004',
          cccd: '048204000004',
          role: ROLES.DANGVIEN,
          loai_dang_vien: 'Dự bị',
          dang_vien_du_bi: true,
          ngay_vao_dang: '2026-03-10',
          ho_so_status: 1,
          hoc_lop_dv_moi: false,
          dvhd_ho_so: 'Đào Thị Lệ Hằng',
          dvhd_email: 'hangdtl@due.edu.vn',
          email: 'khanhtq25@due.edu.vn',
          sdt: '0911000004',
          khoa: 'Luật',
          lop: '49K01.1',
          trang_thai: 'dang_sinh_hoat',
          created_at: new Date().toISOString()
        },
        {
          id: 'seed_dv_5',
          ho_ten: 'Vũ Thị Hà Giang',
          mssv: '2411210005',
          cccd: '048204000005',
          role: ROLES.DANGVIEN,
          loai_dang_vien: 'Dự bị',
          dang_vien_du_bi: true,
          ngay_vao_dang: '2025-07-20',
          ho_so_status: 4,
          hoc_lop_dv_moi: true,
          dvhd_ho_so: 'Trần Nguyễn Bảo Châu',
          dvhd_email: 'chautnb@due.edu.vn',
          email: 'giangvth24@due.edu.vn',
          sdt: '0911000005',
          khoa: 'Du lịch',
          lop: '48K21.2',
          trang_thai: 'dang_sinh_hoat',
          created_at: new Date().toISOString()
        },
        {
          id: 'seed_dv_6',
          ho_ten: 'Đặng Đình Phong',
          mssv: '2411210006',
          cccd: '048204000006',
          role: ROLES.DANGVIEN,
          loai_dang_vien: 'Dự bị',
          dang_vien_du_bi: true,
          ngay_vao_dang: '2025-11-05',
          ho_so_status: 2,
          hoc_lop_dv_moi: false,
          dvhd_ho_so: 'Phạm Minh Trang',
          dvhd_email: 'trangpm22@due.edu.vn',
          email: 'phongdd24@due.edu.vn',
          sdt: '0911000006',
          khoa: 'Thương mại điện tử',
          lop: '48K11.1',
          trang_thai: 'dang_sinh_hoat',
          created_at: new Date().toISOString()
        },
        {
          id: 'seed_dv_7',
          ho_ten: 'Phạm Minh Trang',
          mssv: '2211210007',
          cccd: '048204000007',
          role: ROLES.DANGVIEN,
          loai_dang_vien: 'Chính thức',
          email: 'trangpm22@due.edu.vn',
          sdt: '0911000007',
          khoa: 'Kế toán',
          lop: '46K03.1',
          trang_thai: 'dang_sinh_hoat',
          created_at: new Date().toISOString()
        }
      ];

      for (const user of seedDangVien) {
        await setDoc(doc(db, 'dang_vien', user.id), user);
      }

      const seedNotifications = [
        {
          id: 'seed_notif_1',
          title: 'Thông báo về việc đóng Đảng phí Quý II/2026',
          content: 'Kính gửi các đồng chí Đảng viên trong Chi bộ,\n\nĐề nghị các đồng chí hoàn thành nghĩa vụ đóng Đảng phí Quý II/2026 trước ngày 15/06/2026 cho đồng chí Phó Bí thư Trần Nguyễn Bảo Châu.\n\nMức đóng cụ thể đối với sinh viên là 15.000 VNĐ/tháng. Trân trọng thông báo.',
          created_at: dayjs().subtract(2, 'day').toISOString(),
          sender: 'Đào Thị Lệ Hằng',
          tag: 'Hành chính'
        },
        {
          id: 'seed_notif_2',
          title: 'Lịch họp sinh hoạt Chi bộ định kỳ tháng 05/2026',
          content: 'Kính mời toàn thể các đồng chí Đảng viên tham dự phiên họp sinh hoạt Chi bộ định kỳ tháng 05/2026.\n\n- Thời gian: 19h00 ngày 29/05/2026.\n- Địa điểm: Phòng Hội thảo A2, Trường Đại học Kinh tế.\n- Nội dung: Đánh giá hoạt động tháng 5, Xét chuyển chính thức Đảng viên dự bị Hoàng Anh Tuấn.\n\nSự có mặt đầy đủ của các đồng chí là bắt buộc.',
          created_at: dayjs().subtract(5, 'day').toISOString(),
          sender: 'Phan Minh Đức',
          tag: 'Lịch họp'
        }
      ];

      for (const notif of seedNotifications) {
        await setDoc(doc(db, 'notifications', notif.id), notif);
      }

      const seedMeetings = [
        {
          id: 'seed_meeting_1',
          title: 'Sinh hoạt định kỳ Chi bộ tháng 04/2026',
          date: '2026-04-15',
          time: '19:00',
          location: 'Phòng A201',
          description: 'Họp sinh hoạt định kỳ đánh giá tình hình học tập và rèn luyện của Đảng viên.',
          status: 'completed',
          created_at: dayjs().subtract(30, 'day').toISOString()
        },
        {
          id: 'seed_meeting_2',
          title: 'Sinh hoạt chuyên đề Quý II/2026',
          date: '2026-05-20',
          time: '18:30',
          location: 'Hội trường B',
          description: 'Học tập Nghị quyết Đại hội Đảng toàn quốc khóa XIV.',
          status: 'completed',
          created_at: dayjs().subtract(8, 'day').toISOString()
        }
      ];

      for (const meeting of seedMeetings) {
        await setDoc(doc(db, 'meetings', meeting.id), meeting);
        await setDoc(doc(db, 'lich_hop', meeting.id), meeting);
      }

      const seedAttendances = [
        { id: 'seed_att_1_1', meetingId: 'seed_meeting_1', mssv: '2311210001', ho_ten: 'Nguyễn Văn Minh', status: 'present', note: '' },
        { id: 'seed_att_1_2', meetingId: 'seed_meeting_1', mssv: '2411210002', ho_ten: 'Lê Thị Khánh Huyền', status: 'present', note: '' },
        { id: 'seed_att_1_3', meetingId: 'seed_meeting_1', mssv: '2311210003', ho_ten: 'Hoàng Anh Tuấn', status: 'present', note: '' },
        { id: 'seed_att_1_4', meetingId: 'seed_meeting_1', mssv: '2511210004', ho_ten: 'Trần Quốc Khánh', status: 'absent_excused', note: 'Trùng lịch học chuyên đề' }
      ];

      for (const att of seedAttendances) {
        await setDoc(doc(db, 'attendances', att.id), att);
      }

      const seedHoSoKetNap = [
        {
          id: 'seed_hskn_1',
          mssv: '2411210002',
          hoten: 'Lê Thị Khánh Huyền',
          lop: '48K02.1',
          khoa: 'Quản trị Kinh doanh',
          trangthai: 5,
          dangvienhuongdan: 'Trần Nguyễn Bảo Châu'
        },
        {
          id: 'seed_hskn_2',
          mssv: '2311210003',
          hoten: 'Hoàng Anh Tuấn',
          lop: '47K12.3',
          khoa: 'Ngân hàng',
          trangthai: 7,
          dangvienhuongdan: 'Nguyễn Văn Minh'
        }
      ];

      for (const hs of seedHoSoKetNap) {
        await setDoc(doc(db, 'ho_so_ket_nap', hs.id), hs);
      }

      const seedHoSoChinhThuc = [
        {
          id: 'seed_hsct_1',
          dang_vien_id: 'seed_dv_5',
          da_hoc_lop: 'Lớp bồi dưỡng ĐV mới khóa 2025',
          trang_thai: 'dang_lam_thu_tuc',
          ngay_nhan_quyet_dinh: '2026-05-20'
        },
        {
          id: 'seed_hsct_2',
          dang_vien_id: 'seed_dv_6',
          da_hoc_lop: 'Lớp bồi dưỡng ĐV mới khóa 2026',
          trang_thai: 'dang_lam_thu_tuc',
          ngay_nhan_quyet_dinh: '2026-05-25'
        }
      ];

      for (const hs of seedHoSoChinhThuc) {
        await setDoc(doc(db, 'ho_so_chinh_thuc', hs.id), hs);
      }

      const seedVotingSessions = [
        {
          id: 'seed_voting_1',
          title: 'Xét đề nghị công nhận Đảng viên chính thức cho đồng chí Hoàng Anh Tuấn',
          description: 'Đồng chí Hoàng Anh Tuấn, ngày vào Đảng dự bị 18/05/2025, đã đủ 12 tháng thử thách và hoàn thành lớp học Bồi dưỡng Đảng viên mới. Kính mời Chi bộ biểu quyết thông qua.',
          status: 'active',
          creatorName: 'Phan Minh Đức',
          type: 'official_approval',
          created_at: dayjs().subtract(1, 'day').toISOString()
        }
      ];

      for (const session of seedVotingSessions) {
        await setDoc(doc(db, 'voting_sessions', session.id), session);
      }

      const seedVotingCandidates = [
        {
          id: 'seed_cand_1_1',
          sessionId: 'seed_voting_1',
          ho_ten: 'Đồng ý',
          mssv: 'agree',
          score: 0
        },
        {
          id: 'seed_cand_1_2',
          sessionId: 'seed_voting_1',
          ho_ten: 'Không đồng ý',
          mssv: 'disagree',
          score: 0
        }
      ];

      for (const cand of seedVotingCandidates) {
        await setDoc(doc(db, 'voting_candidates', cand.id), cand);
      }

      const seedAuditLogs = [
        {
          id: 'seed_audit_1',
          updated_at: dayjs().subtract(3, 'day').toISOString(),
          ho_ten: 'Lê Thị Khánh Huyền',
          mssv: '2411210002',
          updated_by: 'Trần Nguyễn Bảo Châu',
          action: 'update',
          changes: [
            { field: 'ho_so_status', label: 'Bước hồ sơ', oldVal: 2, newVal: 3 }
          ]
        }
      ];

      for (const log of seedAuditLogs) {
        await setDoc(doc(db, 'lich_su_cap_nhat', log.id), log);
      }

      // Also seed dynamic faculties and groups config
      await setDoc(doc(db, 'system_config', 'faculties'), { items: DEFAULT_KHOA });
      await setDoc(doc(db, 'system_config', 'groups'), { items: DEFAULT_NHOM });

      message.success({ content: 'Khởi tạo dữ liệu mẫu thành công! Vui lòng tải lại trang.', key: 'seed', duration: 4 });
      fetchUsers();
      fetchHistoryLogs();
      fetchLoginLogs();
    } catch (e) {
      console.error(e);
      message.error({ content: 'Lỗi khởi tạo hệ thống: ' + e.message, key: 'seed', duration: 5 });
    } finally {
      setSeeding(false);
    }
  };

  const authorizedUsers = users.filter(u => u.role && u.role !== ROLES.DANGVIEN);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Pull active party members directly from "dang_vien" collection
      const snapshot = await getDocs(collection(db, "dang_vien"));
      const list = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(dv => !dv.trang_thai || dv.trang_thai === 'dang_sinh_hoat');
      
      // Sort alphabetically by full name
      list.sort((a, b) => (a.ho_ten || '').localeCompare(b.ho_ten || ''));
      setUsers(list);
    } catch (e) {
      console.error(e);
      message.warning("Đang tải danh sách Đảng viên sinh hoạt...");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryLogs = async () => {
    setHistoryLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "lich_su_cap_nhat"));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by updated_at desc
      list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setHistoryLogs(list);
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi tải lịch sử chỉnh sửa: " + e.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRollbackHistory = async (record) => {
    if (!record.dang_vien_id || !record.changes || record.changes.length === 0) {
      message.error("Không thể hoàn tác sự kiện này.");
      return;
    }
    
    setRollingBackId(record.id);
    message.loading({ content: `Đang thực hiện hoàn tác thay đổi cho đồng chí ${record.ho_ten}...`, key: 'rollback' });
    
    try {
      // 1. Get the current document of the member to verify it exists
      const docRef = doc(db, 'dang_vien', record.dang_vien_id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("Không tìm thấy hồ sơ Đảng viên hiện tại. Có thể tài khoản đã bị xóa khỏi hệ thống.");
      }
      
      const currentData = docSnap.data();
      
      // 2. Prepare rollback updates by mapping changes in reverse order
      const updateFields = {};
      record.changes.forEach(change => {
        updateFields[change.field] = change.oldVal;
      });
      
      // 3. Update the member document in Firestore
      await updateDoc(docRef, updateFields);
      
      // 4. Log a new history entry for the rollback action!
      const rollbackChanges = record.changes.map(change => ({
        field: change.field,
        label: change.label || change.field,
        oldVal: currentData[change.field] !== undefined ? currentData[change.field] : '',
        newVal: change.oldVal
      }));
      
      await addDoc(collection(db, "lich_su_cap_nhat"), {
        dang_vien_id: record.dang_vien_id,
        mssv: record.mssv || '',
        ho_ten: record.ho_ten || '',
        updated_by: `Hoàn tác bởi ${currentUser?.email || currentUser?.username || "Admin"}`,
        updated_at: new Date().toISOString(),
        action: 'rollback',
        changes: rollbackChanges
      });
      
      message.success({ content: `Đã hoàn tác thành công thay đổi cho đồng chí ${record.ho_ten}!`, key: 'rollback', duration: 3 });
      
      // Refresh the tables
      fetchHistoryLogs();
      fetchUsers();
    } catch (err) {
      console.error(err);
      message.error({ content: `Lỗi hoàn tác: ${err.message}`, key: 'rollback', duration: 4 });
    } finally {
      setRollingBackId(null);
    }
  };

  const fetchLoginLogs = async () => {
    setLoginLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "nhat_ky_dang_nhap"));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by timestamp desc
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLoginLogs(list);
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi tải nhật ký đăng nhập: " + e.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchEditingPeriodStatus = async () => {
    try {
      const docRef = doc(db, "system_config", "editing_period");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setIsEditingPeriodOpen(!!docSnap.data().isOpen);
      }
    } catch (e) {
      console.error("Lỗi khi tải trạng thái đợt chỉnh sửa:", e);
    }
  };

  const handleToggleEditingPeriod = async (checked) => {
    setTogglingPeriod(true);
    try {
      const docRef = doc(db, "system_config", "editing_period");
      await setDoc(docRef, {
        isOpen: checked,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || currentUser?.username || currentUser?.email || 'Admin'
      });
      setIsEditingPeriodOpen(checked);
      message.success(`Đã ${checked ? 'MỞ' : 'ĐÓNG'} đợt chỉnh sửa lý lịch cho các Đảng viên!`);
    } catch (e) {
      console.error("Lỗi khi cập nhật đợt chỉnh sửa:", e);
      message.error("Lỗi khi cập nhật trạng thái");
    } finally {
      setTogglingPeriod(false);
    }
  };

  const fetchBchContacts = async () => {
    setLoadingBch(true);
    try {
      const docRef = doc(db, "system_config", "bch_contacts");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        bchForm.setFieldsValue({
          email: data.email || 'chibosvktdn@due.udn.vn',
          contacts: data.contacts || []
        });
      } else {
        bchForm.setFieldsValue({
          email: 'chibosvktdn@due.udn.vn',
          contacts: [
            { name: 'TS. Bùi Trung Hiệp', role: 'Bí thư Chi bộ (Chung)', initial: 'B' },
            { name: 'Đ/c Trần Văn Quyết', role: 'Admin hệ thống chi bộ', initial: 'Q' },
            { name: 'Đ/c Trần Thị B', role: 'Trưởng ban Đảng viên chính thức', initial: 'B' },
            { name: 'Đ/c Phạm Văn D', role: 'Trưởng ban Hồ sơ kết nạp', initial: 'D' }
          ]
        });
      }
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi tải cấu hình Ban Chi ủy: " + e.message);
    } finally {
      setLoadingBch(false);
    }
  };

  const handleSaveBch = async () => {
    setSavingBch(true);
    try {
      const values = await bchForm.validateFields();
      const docRef = doc(db, "system_config", "bch_contacts");
      await setDoc(docRef, {
        contacts: values.contacts || [],
        email: values.email || '',
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || 'Admin'
      });
      message.success("Cập nhật thông tin Chi ủy và Ban điều hành các nhóm của Chi bộ thành công!");
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi lưu cấu hình Ban Chi ủy: " + e.message);
    } finally {
      setSavingBch(false);
    }
  };

  const MODULE_METADATA = [
    {
      key: 'members',
      label: 'Quản lý Đảng viên',
      icon: <TeamOutlined style={{ color: '#c62828' }} />,
      description: 'Danh sách Đảng viên sinh hoạt, thông tin liên lạc, Đảng tịch chính.',
      actions: [
        { key: 'view', label: 'Xem danh sách' },
        { key: 'create', label: 'Thêm Đảng viên' },
        { key: 'edit', label: 'Sửa hồ sơ' },
        { key: 'delete', label: 'Xóa Đảng viên' },
        { key: 'transfer', label: 'Chuyển đi/đến' }
      ]
    },
    {
      key: 'admission',
      label: 'Hồ sơ Kết nạp',
      icon: <SolutionOutlined style={{ color: '#eb2f96' }} />,
      description: 'Hồ sơ cảm tình Đảng, quần chúng ưu tú đang trong tiến trình kết nạp.',
      actions: [
        { key: 'view', label: 'Xem tiến trình' },
        { key: 'create', label: 'Tạo hồ sơ mới' },
        { key: 'edit', label: 'Sửa tiến độ' },
        { key: 'delete', label: 'Xóa hồ sơ' }
      ]
    },
    {
      key: 'official',
      label: 'Hồ sơ Chính thức',
      icon: <BookOutlined style={{ color: '#722ed1' }} />,
      description: 'Đảng viên dự bị đang làm thủ tục công nhận Đảng viên chính thức.',
      actions: [
        { key: 'view', label: 'Xem tiến trình' },
        { key: 'create', label: 'Tạo hồ sơ mới' },
        { key: 'edit', label: 'Sửa tiến độ' },
        { key: 'delete', label: 'Xóa hồ sơ' }
      ]
    },
    {
      key: 'transferred',
      label: 'Hồ sơ Chuyển đi/Sinh hoạt',
      icon: <CompassOutlined style={{ color: '#13c2c2' }} />,
      description: 'Danh sách Đảng viên đã chuyển sinh hoạt ra ngoài chi bộ.',
      actions: [
        { key: 'view', label: 'Xem hồ sơ chuyển' },
        { key: 'create', label: 'Tạo hồ sơ mới' },
        { key: 'edit', label: 'Sửa thông tin chuyển' },
        { key: 'delete', label: 'Xóa hồ sơ' }
      ]
    },
    {
      key: 'notifications',
      label: 'Thông báo & Bảng tin',
      icon: <InfoCircleOutlined style={{ color: '#fa8c16' }} />,
      description: 'Đăng tải thông báo, lịch sinh hoạt chi bộ định kỳ cho toàn thể thành viên.',
      actions: [
        { key: 'view', label: 'Xem thông báo' },
        { key: 'create', label: 'Đăng thông báo mới' },
        { key: 'delete', label: 'Xóa thông báo' }
      ]
    },
    {
      key: 'dangky213',
      label: 'Đăng ký cư trú 213',
      icon: <HomeOutlined style={{ color: '#52c41a' }} />,
      description: 'Giới thiệu sinh hoạt về nơi cư trú theo Quy định 213.',
      actions: [
        { key: 'create', label: 'Gửi yêu cầu giới thiệu' },
        { key: 'manage', label: 'Duyệt & Quản lý hồ sơ' },
        { key: 'export', label: 'Xuất dữ liệu 213' }
      ]
    },
    {
      key: 'voting',
      label: 'Biểu quyết Chi bộ',
      icon: <AuditOutlined style={{ color: '#eb2f96' }} />,
      description: 'Tổ chức các phiên biểu quyết, bỏ phiếu tín nhiệm trong Chi bộ.',
      actions: [
        { key: 'view', label: 'Xem & Bỏ phiếu' },
        { key: 'create', label: 'Tạo phiên biểu quyết' },
        { key: 'manage', label: 'Quản lý phiên biểu quyết' }
      ]
    },
    {
      key: 'meetings',
      label: 'Sinh hoạt Chi bộ',
      icon: <CalendarOutlined style={{ color: '#13c2c2' }} />,
      description: 'Lịch họp, điểm danh và đăng ký xin vắng sinh hoạt.',
      actions: [
        { key: 'view', label: 'Xem lịch & Xin vắng' },
        { key: 'manage', label: 'Quản lý lịch & Điểm danh' }
      ]
    },
    {
      key: 'weekly_plan',
      label: 'Kế hoạch công việc',
      icon: <ClockCircleOutlined style={{ color: '#fa8c16' }} />,
      description: 'Theo dõi, giao việc và báo cáo tiến độ công việc hàng tuần.',
      actions: [
        { key: 'view', label: 'Xem kế hoạch' },
        { key: 'manage', label: 'Giao việc & Quản lý' }
      ]
    },
    {
      key: 'users',
      label: 'Cấu hình hệ thống & Lịch sử',
      icon: <KeyOutlined style={{ color: '#fa541c' }} />,
      description: 'Cấu hình Ban Chi ủy, cài đặt phân quyền (RBAC), xem nhật ký hệ thống.',
      actions: [
        { key: 'manage', label: 'Quản trị toàn hệ thống' }
      ]
    }
  ];

  const EDITABLE_ROLES = [
    { key: ROLES.ADMIN, label: 'Admin', isAdmin: true },
    { key: ROLES.BITHU, label: 'Bí thư', isAdmin: true },
    { key: ROLES.PHOBIHU, label: 'Phó Bí thư' },
    { key: ROLES.CAPUY, label: 'Chi ủy viên' },
    { key: ROLES.OFFICIAL_MANAGER, label: 'BĐH Sinh hoạt' },
    { key: ROLES.ADMISSION_MANAGER, label: 'BĐH Phát triển' },
    { key: ROLES.KIEMTRA, label: 'BĐH Kiểm tra' },
    { key: ROLES.TRUYENTHONG, label: 'BĐH Truyền thông' },
    { key: ROLES.TOCHUC, label: 'BĐH Tổ chức' },
    { key: ROLES.DANGVIEN, label: 'Đảng viên' }
  ];

  const fetchPermissions = async () => {
    setLoadingPerms(true);
    try {
      const docRef = doc(db, 'system_config', 'role_permissions');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setRolePerms(docSnap.data());
      } else {
        setRolePerms(permissionService.getDefaultActionPermissions());
      }
    } catch (e) {
      console.error('Error fetching role permissions:', e);
      message.error('Lỗi khi tải ma trận phân quyền: ' + e.message);
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleCheckboxChange = (moduleKey, actionKey, role, checked) => {
    setRolePerms(prev => {
      const newPerms = { ...prev };
      if (!newPerms[moduleKey]) {
        newPerms[moduleKey] = {};
      }
      if (!newPerms[moduleKey][actionKey]) {
        newPerms[moduleKey][actionKey] = [];
      }
      
      let list = [...newPerms[moduleKey][actionKey]];
      if (checked) {
        if (!list.includes(role)) {
          list.push(role);
        }
      } else {
        list = list.filter(r => r !== role);
      }
      
      newPerms[moduleKey][actionKey] = list;
      return newPerms;
    });
  };

  const handleSavePermissions = async () => {
    setSavingPerms(true);
    try {
      const docRef = doc(db, 'system_config', 'role_permissions');
      await setDoc(docRef, rolePerms);
      localStorage.setItem('role_permissions', JSON.stringify(rolePerms));
      message.success('✅ Lưu ma trận phân quyền thành công! Quyền hạn mới đã được đồng bộ toàn hệ thống tức thì.');
      
      // Force reload to apply permissions instantly across all routes and sidebar
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (e) {
      console.error('Error saving role permissions:', e);
      message.error('Lỗi khi lưu cấu hình phân quyền: ' + e.message);
      setSavingPerms(false);
    }
  };

  const handleRestoreDefaultPermissions = () => {
    const defaults = permissionService.getDefaultActionPermissions();
    setRolePerms(defaults);
    message.success('Đã khôi phục ma trận quyền mặc định trên màn hình. Vui lòng nhấn "LƯU MA TRẬN PHÂN QUYỀN" để áp dụng chính thức.');
  };

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const facultyRef = doc(db, 'system_config', 'faculties');
      const facultySnap = await getDoc(facultyRef);
      if (facultySnap.exists()) {
        setFaculties(facultySnap.data().items || []);
      } else {
        setFaculties(DEFAULT_KHOA);
      }

      const groupRef = doc(db, 'system_config', 'groups');
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        setGroups(groupSnap.data().items || []);
      } else {
        setGroups(DEFAULT_NHOM);
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
      message.error('Lỗi khi tải danh mục hệ thống: ' + e.message);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSaveFaculties = async (updatedFaculties) => {
    try {
      const docRef = doc(db, 'system_config', 'faculties');
      await setDoc(docRef, { items: updatedFaculties });
      setFaculties(updatedFaculties);
      message.success('Cập nhật danh sách Khoa đào tạo thành công!');
    } catch (e) {
      console.error('Error saving faculties:', e);
      message.error('Lỗi khi lưu danh sách Khoa: ' + e.message);
    }
  };

  const handleSaveGroups = async (updatedGroups) => {
    try {
      const docRef = doc(db, 'system_config', 'groups');
      await setDoc(docRef, { items: updatedGroups });
      setGroups(updatedGroups);
      message.success('Cập nhật danh sách Nhóm sinh hoạt thành công!');
    } catch (e) {
      console.error('Error saving groups:', e);
      message.error('Lỗi khi lưu danh sách Nhóm: ' + e.message);
    }
  };

  const handleAddFaculty = () => {
    if (!newFaculty.trim()) {
      message.warning('Vui lòng nhập tên Khoa!');
      return;
    }
    if (faculties.includes(newFaculty.trim())) {
      message.warning('Tên Khoa này đã tồn tại!');
      return;
    }
    const updated = [...faculties, newFaculty.trim()];
    handleSaveFaculties(updated);
    setNewFaculty('');
  };

  const handleAddGroup = () => {
    if (!newGroup.trim()) {
      message.warning('Vui lòng nhập tên Nhóm!');
      return;
    }
    if (groups.includes(newGroup.trim())) {
      message.warning('Tên Nhóm này đã tồn tại!');
      return;
    }
    const updated = [...groups, newGroup.trim()];
    handleSaveGroups(updated);
    setNewGroup('');
  };

  const handleDeleteFaculty = async (facultyName) => {
    const inUse = users.some(u => u.khoa === facultyName);
    if (inUse) {
      Modal.confirm({
        title: 'Cảnh báo danh mục đang được sử dụng',
        content: `Khoa "${facultyName}" đang được gán cho một số Đảng viên trong hệ thống. Nếu xóa, các Đảng viên này sẽ không hiển thị tên Khoa cũ trên lý lịch của họ. Bạn vẫn chắc chắn muốn xóa?`,
        okText: 'Vẫn xóa',
        okType: 'danger',
        cancelText: 'Hủy',
        onOk: () => {
          const updated = faculties.filter(f => f !== facultyName);
          handleSaveFaculties(updated);
        }
      });
    } else {
      const updated = faculties.filter(f => f !== facultyName);
      handleSaveFaculties(updated);
    }
  };

  const handleDeleteGroup = async (groupName) => {
    const inUse = users.some(u => u.nhom === groupName);
    if (inUse) {
      Modal.confirm({
        title: 'Cảnh báo danh mục đang được sử dụng',
        content: `Nhóm "${groupName}" đang được gán cho một số Đảng viên. Việc xóa danh mục này sẽ ảnh hưởng đến việc phân tổ chức sinh hoạt của các Đảng viên đó. Bạn vẫn chắc chắn muốn xóa?`,
        okText: 'Vẫn xóa',
        okType: 'danger',
        cancelText: 'Hủy',
        onOk: () => {
          const updated = groups.filter(g => g !== groupName);
          handleSaveGroups(updated);
        }
      });
    } else {
      const updated = groups.filter(g => g !== groupName);
      handleSaveGroups(updated);
    }
  };

  const handleEditFaculty = (index, value) => {
    if (!value.trim()) {
      message.warning('Tên Khoa không được để trống!');
      return;
    }
    if (faculties.some((f, idx) => f === value.trim() && idx !== index)) {
      message.warning('Tên Khoa này đã tồn tại!');
      return;
    }
    const updated = [...faculties];
    updated[index] = value.trim();
    handleSaveFaculties(updated);
    setEditingFacultyIndex(null);
  };

  const handleEditGroup = (index, value) => {
    if (!value.trim()) {
      message.warning('Tên Nhóm không được để trống!');
      return;
    }
    if (groups.some((g, idx) => g === value.trim() && idx !== index)) {
      message.warning('Tên Nhóm này đã tồn tại!');
      return;
    }
    const updated = [...groups];
    updated[index] = value.trim();
    handleSaveGroups(updated);
    setEditingGroupIndex(null);
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEditingPeriodStatus();
  }, []);

  useEffect(() => {
    if (activeMainTab === 'user_roles' || activeMainTab === 'permission_matrix') {
      fetchPermissions();
    } else if (activeMainTab === 'history_logs') {
      fetchHistoryLogs();
    } else if (activeMainTab === 'login_logs') {
      fetchLoginLogs();
    } else if (activeMainTab === 'editing_period') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchEditingPeriodStatus();
    } else if (activeMainTab === 'bch_contacts') {
      fetchBchContacts();
    } else if (activeMainTab === 'backup_restore' || activeMainTab === 'categories' || activeMainTab === 'danger_zone') {
      fetchCategories();
    }
  }, [activeMainTab]);

  const handleSelectUser = (userId) => {
    setSelectedUserId(userId);
    const user = users.find(u => u.id === userId);
    setSelectedUser(user);
    if (user) {
      form.setFieldsValue({
        cccd: user.cccd || user.CCCD || '',
        role: user.role || ROLES.DANGVIEN
      });
    } else {
      form.resetFields();
    }
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        role: values.role,
        cccd: values.cccd,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, "dang_vien", selectedUser.id), payload);
      message.success(`Cập nhật phân quyền & mật khẩu cho đồng chí ${selectedUser.ho_ten} thành công!`);
      
      // Refresh local copy
      const updatedUsers = users.map(u => {
        if (u.id === selectedUser.id) {
          return { ...u, ...payload };
        }
        return u;
      });
      setUsers(updatedUsers);
      setSelectedUser({ ...selectedUser, ...payload });
    } catch (e) {
      message.error("Lỗi khi lưu phân quyền: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleTagColor = (role) => {
    switch (role) {
      case ROLES.ADMIN: return 'red';
      case ROLES.BITHU: return 'volcano';
      case ROLES.PHOBIHU: return 'volcano';
      case ROLES.CAPUY: return 'gold';
      case ROLES.KIEMTRA: return 'purple';
      case ROLES.OFFICIAL_MANAGER: return 'blue';
      case ROLES.ADMISSION_MANAGER: return 'orange';
      case ROLES.TRUYENTHONG: return 'cyan';
      case ROLES.TOCHUC: return 'geekblue';
      case ROLES.DANGVIEN: return 'green';
      default: return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case ROLES.ADMIN: return 'Quản trị hệ thống';
      case ROLES.BITHU: return 'Bí thư Chi bộ';
      case ROLES.PHOBIHU: return 'Phó Bí thư Chi bộ';
      case ROLES.CAPUY: return 'Chi ủy Chi bộ Sinh viên';
      case ROLES.OFFICIAL_MANAGER: return 'BĐH nhóm Hồ sơ sinh hoạt Đảng';
      case ROLES.ADMISSION_MANAGER: return 'BĐH nhóm Phát triển Đảng';
      case ROLES.KIEMTRA: return 'BĐH nhóm Kiểm tra giám sát';
      case ROLES.TRUYENTHONG: return 'BĐH nhóm Truyền thông';
      case ROLES.TOCHUC: return 'BĐH nhóm Tổ chức';
      case ROLES.DANGVIEN: return 'Đảng viên sinh viên';
      default: return role;
    }
  };

  const getRoleShortLabel = (role) => {
    switch (role) {
      case ROLES.ADMIN: return 'Admin';
      case ROLES.BITHU: return 'Bí thư';
      case ROLES.PHOBIHU: return 'Phó Bí thư';
      case ROLES.CAPUY: return 'Chi ủy viên';
      case ROLES.OFFICIAL_MANAGER: return 'BĐH Sinh hoạt';
      case ROLES.ADMISSION_MANAGER: return 'BĐH Phát triển';
      case ROLES.KIEMTRA: return 'BĐH Kiểm tra';
      case ROLES.TRUYENTHONG: return 'BĐH Truyền thông';
      case ROLES.TOCHUC: return 'BĐH Tổ chức';
      case ROLES.DANGVIEN: return 'Đảng viên';
      default: return role;
    }
  };

  // User-Agent helpers
  const getDeviceIcon = (ua) => {
    if (!ua) return <DesktopOutlined style={{ color: '#8c8c8c' }} />;
    const uaLower = ua.toLowerCase();
    if (uaLower.includes('windows')) return <WindowsOutlined style={{ color: '#1890ff' }} />;
    if (uaLower.includes('macintosh') || uaLower.includes('mac os') || uaLower.includes('iphone') || uaLower.includes('ipad')) {
      return <AppleOutlined style={{ color: '#000000' }} />;
    }
    if (uaLower.includes('android')) return <AndroidOutlined style={{ color: '#52c41a' }} />;
    if (uaLower.includes('linux')) return <DesktopOutlined style={{ color: '#fa8c16' }} />;
    return <DesktopOutlined style={{ color: '#8c8c8c' }} />;
  };

  const getBrowserIcon = (ua) => {
    if (!ua) return <CompassOutlined style={{ color: '#8c8c8c' }} />;
    const uaLower = ua.toLowerCase();
    if (uaLower.includes('edg/')) return <CompassOutlined style={{ color: '#096dd9' }} />;
    if (uaLower.includes('chrome')) return <ChromeOutlined style={{ color: '#40a9ff' }} />;
    if (uaLower.includes('safari') && !uaLower.includes('chrome')) return <CompassOutlined style={{ color: '#13c2c2' }} />;
    if (uaLower.includes('firefox')) return <ChromeOutlined style={{ color: '#fa541c' }} />;
    return <CompassOutlined style={{ color: '#8c8c8c' }} />;
  };

  const parseUserAgentFriendly = (ua) => {
    if (!ua) return 'Thiết bị không rõ';
    let os = 'Thiết bị khác';
    let browser = 'Trình duyệt khác';
    
    const uaLower = ua.toLowerCase();
    if (uaLower.includes('windows')) os = 'Windows';
    else if (uaLower.includes('macintosh') || uaLower.includes('mac os')) os = 'macOS';
    else if (uaLower.includes('iphone')) os = 'iPhone';
    else if (uaLower.includes('ipad')) os = 'iPad';
    else if (uaLower.includes('android')) os = 'Android';
    else if (uaLower.includes('linux')) os = 'Linux';
    
    if (uaLower.includes('edg/')) browser = 'Edge';
    else if (uaLower.includes('chrome')) browser = 'Chrome';
    else if (uaLower.includes('safari') && !uaLower.includes('chrome')) browser = 'Safari';
    else if (uaLower.includes('firefox')) browser = 'Firefox';
    
    return `${browser} trên ${os}`;
  };

  // Filtered lists
  const filteredHistoryLogs = historyLogs.filter(log => {
    const text = `${log.ho_ten || ''} ${log.mssv || ''} ${log.updated_by || ''}`.toLowerCase();
    return text.includes(historySearch.toLowerCase());
  });

  const filteredLoginLogs = loginLogs.filter(log => {
    const text = `${log.ho_ten || ''} ${log.username || ''}`.toLowerCase();
    const matchSearch = text.includes(loginSearch.toLowerCase());
    const matchRole = selectedRoleFilter === 'ALL' || log.role === selectedRoleFilter;
    return matchSearch && matchRole;
  });

  // Table columns
  const historyColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: '180px',
      render: (val) => (
        <span style={{ fontWeight: 500, color: '#555' }}>
          <ClockCircleOutlined style={{ marginRight: '6px', color: '#8c8c8c' }} />
          {val ? dayjs(val).format('DD/MM/YYYY HH:mm:ss') : '--'}
        </span>
      )
    },
    {
      title: 'Đảng viên bị chỉnh sửa',
      key: 'dang_vien',
      width: '240px',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 700, color: '#262626' }}>{record.ho_ten}</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>MSSV: {record.mssv || '--'}</div>
        </div>
      )
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'updated_by',
      key: 'updated_by',
      width: '200px',
      render: (val) => (
        <Tag color="blue" style={{ fontWeight: 600, borderRadius: '4px' }}>
          {val || 'Hệ thống'}
        </Tag>
      )
    },
    {
      title: 'Chi tiết thay đổi',
      key: 'changes',
      render: (_, record) => {
        const isCreate = record.action === 'create' || !record.changes || record.changes.length === 0;
        if (isCreate) {
          return (
            <Tag color="green" style={{ fontWeight: 700, padding: '4px 8px' }}>
              ✓ Khởi tạo hồ sơ Đảng viên mới
            </Tag>
          );
        }
        if (record.action === 'rollback') {
          return (
            <div>
              <Tag color="volcano" style={{ fontWeight: 700, padding: '4px 8px', marginBottom: '6px' }}>
                ↩ Hoàn tác dữ liệu hồ sơ
              </Tag>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {record.changes.map((change, idx) => (
                  <div key={idx} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: '#595959', minWidth: '120px' }}>{change.label || change.field}:</span>
                    <span style={{ color: '#bfbfbf', textDecoration: 'line-through' }}>{String(change.oldVal) || '(Trống)'}</span>
                    <span style={{ color: '#faad14', fontWeight: 'bold' }}>➔</span>
                    <span style={{ 
                      color: '#d46b08', 
                      fontWeight: 700, 
                      backgroundColor: '#fffbe6', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      border: '1px solid #ffe58f',
                      display: 'inline-block'
                    }}>
                      {String(change.newVal) || '(Trống)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
            {record.changes.map((change, idx) => (
              <div key={idx} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, color: '#595959', minWidth: '120px' }}>{change.label || change.field}:</span>
                <span style={{ color: '#bfbfbf', textDecoration: 'line-through' }}>{String(change.oldVal) || '(Trống)'}</span>
                <span style={{ color: '#faad14', fontWeight: 'bold' }}>➔</span>
                <span style={{ 
                  color: '#d46b08', 
                  fontWeight: 700, 
                  backgroundColor: '#fffbe6', 
                  padding: '2px 8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ffe58f',
                  display: 'inline-block'
                }}>
                  {String(change.newVal) || '(Trống)'}
                </span>
              </div>
            ))}
          </div>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'rollback_action',
      width: '120px',
      align: 'center',
      render: (_, record) => {
        const canRollback = record.dang_vien_id && record.changes && record.changes.length > 0 && record.action !== 'rollback';
        return (
          <Popconfirm
            title="Xác nhận hoàn tác?"
            description="Thao tác này sẽ khôi phục các trường thông tin lý lịch về giá trị cũ trước đó."
            onConfirm={() => handleRollbackHistory(record)}
            okText="Đồng ý"
            cancelText="Hủy"
            disabled={!canRollback}
          >
            <Button
              type="primary"
              danger
              ghost
              size="small"
              icon={<ReloadOutlined />}
              disabled={!canRollback}
              loading={rollingBackId === record.id}
              style={{ borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}
            >
              Hoàn tác
            </Button>
          </Popconfirm>
        );
      }
    }
  ];

  const loginColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: '180px',
      render: (val) => (
        <span style={{ fontWeight: 500, color: '#555' }}>
          <ClockCircleOutlined style={{ marginRight: '6px', color: '#8c8c8c' }} />
          {val ? dayjs(val).format('DD/MM/YYYY HH:mm:ss') : '--'}
        </span>
      )
    },
    {
      title: 'Đồng chí đăng nhập',
      key: 'account',
      width: '240px',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 700, color: '#262626' }}>{record.ho_ten}</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Tài khoản: {record.username || '--'}</div>
        </div>
      )
    },
    {
      title: 'Vai trò đăng nhập',
      dataIndex: 'role',
      key: 'role',
      width: '220px',
      render: (val) => (
        <Tag color={getRoleTagColor(val)} style={{ fontWeight: 700, padding: '2px 8px' }}>
          {getRoleLabel(val)}
        </Tag>
      )
    },
    {
      title: 'Thiết bị & Trình duyệt',
      dataIndex: 'client_info',
      key: 'client_info',
      render: (val) => {
        if (!val) return <span style={{ color: '#bfbfbf' }}>Không có thông tin</span>;
        return (
          <Space>
            {getDeviceIcon(val)}
            {getBrowserIcon(val)}
            <span style={{ fontSize: '13px', color: '#434343' }}>
              {parseUserAgentFriendly(val)}
            </span>
          </Space>
        );
      }
    }
  ];

  const dataSource = useMemo(() => {
    const rows = [];
    MODULE_METADATA.forEach(mod => {
      mod.actions.forEach(act => {
        rows.push({
          key: `${mod.key}_${act.key}`,
          moduleKey: mod.key,
          moduleLabel: mod.label,
          moduleIcon: mod.icon,
          moduleDesc: mod.description,
          actionKey: act.key,
          actionLabel: act.label
        });
      });
    });
    return rows;
  }, []);

  const filteredDataSource = useMemo(() => {
    if (!matrixSearchText) return dataSource;
    const query = matrixSearchText.toLowerCase();
    return dataSource.filter(row => 
      (row.moduleLabel || '').toLowerCase().includes(query) ||
      (row.moduleKey || '').toLowerCase().includes(query) ||
      (row.actionLabel || '').toLowerCase().includes(query) ||
      (row.actionKey || '').toLowerCase().includes(query) ||
      (row.moduleDesc || '').toLowerCase().includes(query)
    );
  }, [dataSource, matrixSearchText]);

  const columns = [
    {
      title: 'Chức năng / Mô đun',
      key: 'action',
      width: 280,
      fixed: 'left',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {record.moduleIcon}
            {record.moduleLabel} — <span style={{ color: '#c62828' }}>{record.actionLabel}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
            {record.moduleDesc}
          </div>
        </div>
      )
    },
    ...EDITABLE_ROLES.map(roleObj => ({
      title: (
        <div style={{ textAlign: 'center', minWidth: '80px' }}>
          <div style={{ fontWeight: 800, fontSize: '12px' }}>{roleObj.label}</div>
          <Tag color={getRoleTagColor(roleObj.key)} style={{ margin: '4px 0 0 0', fontSize: '9px', fontWeight: 700, borderRadius: '3px', border: 'none', padding: '0px 4px' }}>
            {roleObj.key}
          </Tag>
        </div>
      ),
      key: roleObj.key,
      align: 'center',
      width: '100px',
      render: (_, record) => {
        const { moduleKey, actionKey } = record;
        
        // System admin roles have absolute bypass rights and are unmodifiable
        if (roleObj.isAdmin) {
          return (
            <Tooltip title="Đặc quyền tối cao (Toàn quyền hệ thống) - Luôn kích hoạt">
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Badge count={<LockOutlined style={{ color: '#fa8c16', fontSize: '12px' }} />} offset={[6, -2]}>
                  <Switch checked disabled checkedChildren="BẬT" unCheckedChildren="TẮT" size="small" style={{ backgroundColor: '#52c41a' }} />
                </Badge>
              </div>
            </Tooltip>
          );
        }

        const isChecked = rolePerms[moduleKey]?.[actionKey]?.includes(roleObj.key) || false;
        
        return (
          <Switch 
            checked={isChecked}
            size="small"
            onChange={(checked) => handleCheckboxChange(moduleKey, actionKey, roleObj.key, checked)}
            checkedChildren="BẬT"
            unCheckedChildren="TẮT"
            style={{ backgroundColor: isChecked ? '#52c41a' : '#d9d9d9' }}
          />
        );
      }
    }))
  ];

  const menuGroups = useMemo(() => {
    const groups = [];

    // Group 1: Cấu hình hệ thống (System Configurations)
    const systemConfigItems = [];
    if (isAdmin) {
      systemConfigItems.push({ key: 'user_roles', label: 'Cấp quyền tài khoản', icon: <UserSwitchOutlined /> });
      systemConfigItems.push({ key: 'permission_matrix', label: 'Ma trận phân quyền', icon: <SafetyCertificateOutlined /> });
    }
    systemConfigItems.push({ key: 'editing_period', label: 'Đợt cập nhật lý lịch', icon: <CalendarOutlined /> });
    if (isAdmin) {
      systemConfigItems.push({ key: 'bch_contacts', label: 'Cấu hình Chi ủy', icon: <TeamOutlined /> });
    }
    systemConfigItems.push({ key: 'categories', label: 'Quản lý danh mục', icon: <DatabaseOutlined /> });

    groups.push({
      title: 'Cấu hình Hệ thống',
      items: systemConfigItems
    });

    // Group 2: Giám sát hoạt động (Activity Monitoring)
    if (isAdmin) {
      groups.push({
        title: 'Giám sát Hoạt động',
        items: [
          { key: 'history_logs', label: 'Nhật ký chỉnh sửa', icon: <HistoryOutlined /> },
          { key: 'login_logs', label: 'Nhật ký đăng nhập', icon: <LoginOutlined /> }
        ]
      });
    }

    // Group 3: Quản lý dữ liệu (Data Management)
    const dataManagementItems = [];
    if (isAdmin) {
      dataManagementItems.push({ key: 'backup_restore', label: 'Sao lưu & khôi phục', icon: <CloudUploadOutlined /> });
      dataManagementItems.push({ key: 'danger_zone', label: 'Khu vực dọn dẹp', icon: <WarningOutlined style={{ color: '#ff4d4f' }} /> });
    }

    if (dataManagementItems.length > 0) {
      groups.push({
        title: 'Quản lý Dữ liệu',
        items: dataManagementItems
      });
    }

    return groups;
  }, [isAdmin]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 16px' }}>
      <style>{`
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.5); }
          70% { box-shadow: 0 0 0 8px rgba(82, 196, 26, 0); }
          100% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0); }
        }
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(245, 34, 45, 0.5); }
          70% { box-shadow: 0 0 0 8px rgba(245, 34, 45, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 34, 45, 0); }
        }
        .pulse-dot-green {
          width: 8px;
          height: 8px;
          background-color: #52c41a;
          border-radius: 50%;
          display: inline-block;
          animation: pulse-green 1.8s infinite;
        }
        .pulse-dot-red {
          width: 8px;
          height: 8px;
          background-color: #f5222d;
          border-radius: 50%;
          display: inline-block;
          animation: pulse-red 1.8s infinite;
        }
        .sidebar-menu-item:hover {
          background-color: #f8fafc !important;
          color: #1e293b !important;
        }
      `}</style>

      <Title level={3} style={{ marginBottom: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ display: 'inline-block', width: '4px', height: '22px', backgroundColor: '#c62828', borderRadius: '2px' }}></span>
        Cài đặt Hệ thống & Giám sát hoạt động
      </Title>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginTop: '24px' }}>
        {/* Sticky Left Sidebar */}
        <div style={{ 
          width: '280px', 
          flexShrink: 0, 
          position: 'sticky', 
          top: '24px', 
          background: '#fff', 
          padding: '24px 16px', 
          borderRadius: '16px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          border: '1px solid #f1f5f9'
        }}>
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} style={{ marginBottom: groupIdx === menuGroups.length - 1 ? 0 : 20 }}>
              <div style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                color: '#94a3b8', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                marginBottom: '8px',
                paddingLeft: '12px'
              }}>
                {group.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {group.items.map(item => {
                  const isActive = activeMainTab === item.key;
                  return (
                    <div
                      key={item.key}
                      onClick={() => setActiveMainTab(item.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '13.5px',
                        backgroundColor: isActive ? '#fbe9e7' : 'transparent',
                        color: isActive ? '#c62828' : '#475569',
                        transition: 'all 0.2s ease',
                      }}
                      className="sidebar-menu-item"
                    >
                      <span style={{ fontSize: '16px', display: 'flex', alignItems: 'center', color: isActive ? '#c62828' : '#64748b' }}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Tabs 
            activeKey={activeMainTab} 
            onChange={setActiveMainTab}
            renderTabBar={() => <></>}
            style={{ marginBottom: 24, minHeight: '600px', background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
          >
        {isAdmin && (
          <TabPane tab={<span><UserSwitchOutlined /> Cấp quyền tài khoản</span>} key="user_roles">
            <Row gutter={24}>
              <Col span={24}>
                <Alert
                  message="Lưu ý về Phân quyền Cán bộ (RBAC)"
                  description="Vai trò (Role) được cấp ở mục này sẽ áp dụng trực tiếp khi Đảng viên đăng nhập bằng Mã số sinh viên (MSSV) làm Tên đăng nhập và Căn cước công dân (CCCD) làm Mật khẩu."
                  type="info"
                  showIcon
                  style={{ marginBottom: 20 }}
                />
              </Col>
              <Col xs={24} lg={16}>
                {/* Select account Card */}
              <Card 
                bordered={false} 
                style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: 20 }}
              >
                <div style={{ marginBottom: 12, fontWeight: 700, fontSize: '15px', color: '#262626' }}>
                  <SearchOutlined style={{ color: '#c62828', marginRight: '6px' }} /> Chọn tài khoản Đảng viên cần phân quyền:
                </div>
                
                <Select
                  showSearch
                  placeholder="Nhập tên hoặc MSSV để tìm kiếm Đảng viên..."
                  optionFilterProp="children"
                  onChange={handleSelectUser}
                  value={selectedUserId}
                  loading={loading}
                  style={{ width: '100%' }}
                  size="large"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={users.map(u => ({
                    value: u.id,
                    label: `${u.ho_ten} - MSSV: ${u.mssv || 'Chưa có'} (${u.lop || ''})`
                  }))}
                />
              </Card>

              {/* Configuration Section */}
              {selectedUser ? (
                <Card
                  bordered={false}
                  style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: 20 }}
                  title={
                    <span style={{ fontWeight: 800, color: '#c62828' }}>
                      <SafetyCertificateOutlined /> Thiết lập tài khoản Đảng viên
                    </span>
                  }
                >
                  <Row gutter={24}>
                    {/* Left Column: Short Profile Information */}
                    <Col xs={24} md={9}>
                      <div style={{ 
                        background: '#f8fafc', 
                        padding: '24px 20px', 
                        borderRadius: '12px', 
                        border: '1px solid #f1f5f9',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                          <Avatar 
                            size={72} 
                            icon={<UserOutlined />} 
                            src={selectedUser.anh_ca_nhan} 
                            style={{ border: '2.5px solid #c62828', marginBottom: 8, boxShadow: '0 4px 10px rgba(198, 40, 40, 0.15)' }}
                          />
                          <div style={{ fontWeight: 800, fontSize: '16.5px', color: '#1e293b' }}>
                            {selectedUser.ho_ten}
                          </div>
                          <div style={{ marginTop: '6px' }}>
                            <Tag color={getRoleTagColor(selectedUser.role || ROLES.DANGVIEN)} style={{ fontWeight: 700, border: 'none', borderRadius: '4px', padding: '2px 8px' }}>
                              {getRoleShortLabel(selectedUser.role || ROLES.DANGVIEN)}
                            </Tag>
                          </div>
                        </div>

                        <Divider style={{ margin: '14px 0', borderColor: '#e2e8f0' }} />

                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                          <div>
                            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}><SolutionOutlined /> Mã số sinh viên (MSSV)</Text>
                            <div style={{ fontWeight: 700, color: '#334155', fontSize: '14px', marginTop: '2px' }}>{selectedUser.mssv || '--'}</div>
                          </div>
                          <div>
                            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}><BookOutlined /> Lớp / Khoa</Text>
                            <div style={{ fontWeight: 700, color: '#334155', fontSize: '14px', marginTop: '2px' }}>
                              {selectedUser.lop || '--'} — {selectedUser.khoa || '--'}
                            </div>
                          </div>
                          <div>
                            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Phân nhóm sinh hoạt</Text>
                            <div style={{ marginTop: '4px' }}>
                              {selectedUser.nhom ? <Tag color="cyan" style={{ border: 'none', fontWeight: 700, borderRadius: '4px' }}>{selectedUser.nhom}</Tag> : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>Chưa phân nhóm</span>}
                            </div>
                          </div>
                        </Space>
                      </div>
                    </Col>

                    {/* Right Column: Roles & Password settings */}
                    <Col xs={24} md={15}>
                      <Form form={form} layout="vertical" onFinish={handleSave} style={{ padding: '8px 12px' }}>
                        <Form.Item 
                          name="cccd" 
                          label={<span style={{ fontWeight: 700 }}>Mật khẩu tài khoản (Số CCCD)</span>} 
                          rules={[{ required: true, message: 'Nhập số CCCD làm mật khẩu!' }]}
                        >
                          <Input placeholder="Nhập số CCCD làm mật khẩu..." prefix={<KeyOutlined />} size="large" />
                        </Form.Item>

                        <Form.Item 
                          name="role" 
                          label={<span style={{ fontWeight: 700 }}>Vai trò phân quyền hệ thống (Role)</span>} 
                          rules={[{ required: true }]}
                        >
                          <Select size="large">
                            {Object.keys(ROLES).map(role => (
                              <Option key={role} value={role}>{getRoleLabel(role)}</Option>
                            ))}
                          </Select>
                        </Form.Item>

                        <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                          <Button 
                            type="primary" 
                            htmlType="submit" 
                            icon={<SaveOutlined />} 
                            loading={submitting}
                            block
                            style={{ backgroundColor: '#c62828', borderColor: '#c62828', height: 42, fontWeight: 700, borderRadius: '6px' }}
                          >
                            LƯU CẤU HÌNH TÀI KHOẢN
                          </Button>
                        </Form.Item>
                      </Form>
                    </Col>
                  </Row>
                </Card>
              ) : (
                <Card 
                  bordered={false} 
                  style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: '40px 0', marginBottom: 20 }}
                >
                  <Empty 
                    description={
                      <span style={{ color: '#8c8c8c', fontSize: '14px', fontWeight: 500 }}>
                        Đồng chí vui lòng tìm kiếm và chọn tài khoản Đảng viên<br />ở thanh chọn phía trên để bắt đầu cấu hình phân quyền hệ thống.
                      </span>
                    }
                  />
                </Card>
              )}
            </Col>

            <Col xs={24} lg={8}>
              {/* Summary card listing currently assigned roles */}
              <Card 
                bordered={false} 
                style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
                title={
                  <span style={{ fontWeight: 800, color: '#c62828' }}>
                    <TeamOutlined style={{ marginRight: '6px' }} /> Cán bộ đã phân quyền ({authorizedUsers.length})
                  </span>
                }
              >
                {authorizedUsers.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
                    {authorizedUsers.map(u => (
                      <div 
                        key={u.id}
                        onClick={() => handleSelectUser(u.id)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '12px 16px', 
                          background: '#ffffff', 
                          border: '1px solid #f0f0f0', 
                          borderRadius: '10px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.015)',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#c62828';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(198, 40, 40, 0.08)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#f0f0f0';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.015)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                          <Avatar src={u.anh_ca_nhan} icon={<UserOutlined />} style={{ border: '2px solid #c62828', flexShrink: 0, width: 40, height: 40 }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '13.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.ho_ten}>
                              {u.ho_ten}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              MSSV: {u.mssv || 'Chưa rõ'}
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
                          <Tag color={getRoleTagColor(u.role)} style={{ fontWeight: 700, margin: 0, fontSize: '10.5px', border: 'none', borderRadius: '4px', padding: '2px 6px' }}>
                            {getRoleShortLabel(u.role)}
                          </Tag>
                          <span style={{ color: '#c62828', fontWeight: 600, fontSize: '11.5px', marginTop: '2px' }}>
                            Cấu hình
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <Empty description="Chưa có tài khoản cán bộ nào." />
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </TabPane>
      )}

      {isAdmin && (
        <TabPane tab={<span><SafetyCertificateOutlined /> Ma trận phân quyền</span>} key="permission_matrix">
          <Card 
              bordered={false} 
              style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
                  <div>
                    <span style={{ fontWeight: 800, color: '#c62828', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <SafetyCertificateOutlined /> Ma trận Phân quyền Cán bộ & Vai trò
                    </span>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginTop: '4px', textTransform: 'none' }}>
                      Cấu hình quyền Xem, Thêm, Sửa, Xóa chi tiết cho từng mô đun chức năng của Chi bộ.
                    </div>
                  </div>
                  <Space>
                    <Input
                      placeholder="Tìm kiếm mô đun, chức năng..."
                      prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                      value={matrixSearchText}
                      onChange={e => setMatrixSearchText(e.target.value)}
                      style={{ width: 240, borderRadius: '6px' }}
                      allowClear
                    />
                    <Popconfirm
                      title="Khôi phục phân quyền mặc định?"
                      description="Hành động này sẽ tải lại cấu hình mặc định ban đầu của hệ thống lên ma trận."
                      onConfirm={handleRestoreDefaultPermissions}
                      okText="Đồng ý"
                      cancelText="Hủy"
                    >
                      <Button icon={<ReloadOutlined />} style={{ borderRadius: '6px' }}>
                        Khôi phục mặc định
                      </Button>
                    </Popconfirm>
                    <Button 
                      type="primary" 
                      icon={<SaveOutlined />} 
                      loading={savingPerms}
                      onClick={handleSavePermissions}
                      style={{ backgroundColor: '#c62828', borderColor: '#c62828', fontWeight: 700, borderRadius: '6px' }}
                    >
                      LƯU MA TRẬN PHÂN QUYỀN
                    </Button>
                  </Space>
                </div>
              }
            >
              <Alert
                message={<b style={{ color: '#c62828' }}>⚡ Nguyên tắc Phân quyền Chi bộ Sinh viên</b>}
                description={
                  <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                    1. Hai vai trò <b>Quản trị hệ thống (Admin)</b> và <b>Bí thư Chi bộ (Bí thư)</b> luôn có đặc quyền tối cao (Master Bypass), sở hữu toàn bộ các quyền và không thể thay đổi thông qua ma trận này.<br />
                    2. Các vai trò còn lại được phân quyền theo mô đun chức năng. Quyền truy cập trang liên quan (Sidebar menu/Route) sẽ tự động mở nếu vai trò đó sở hữu quyền <b>Xem</b> hoặc <b>Quản lý</b> của chức năng đó.<br />
                    3. Khi nhấn <b>LƯU MA TRẬN PHÂN QUYỀN</b>, các thay đổi sẽ lập tức có hiệu lực trên toàn hệ thống tức thì mà không yêu cầu người dùng phải đăng nhập lại hoặc làm mới trình duyệt.
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginBottom: '24px', borderRadius: '8px', border: '1px solid #ffe58f', backgroundColor: '#fffbe6' }}
              />

              <Spin spinning={loadingPerms} tip="Đang tải dữ liệu cấu hình phân quyền...">
                <Table
                  dataSource={filteredDataSource}
                  columns={columns}
                  pagination={false}
                  bordered
                  scroll={{ x: 1200 }}
                  sticky={{ offsetHeader: 64 }}
                  rowClassName={(record) => record.actionKey === 'view' ? 'module-header-row' : ''}
                  style={{ borderRadius: '8px', overflow: 'hidden' }}
                />
              </Spin>
            </Card>
          </TabPane>
        )}

        {isAdmin && (
          <TabPane tab={<span><HistoryOutlined /> Nhật ký Chỉnh sửa Hồ sơ</span>} key="history_logs">
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#262626' }}>
                Danh sách hoạt động chỉnh sửa dữ liệu toàn Chi bộ
              </div>
              <Space>
                <Input
                  placeholder="Tìm theo Tên, MSSV hoặc Người sửa..."
                  prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  style={{ width: 280, borderRadius: '6px' }}
                  allowClear
                />
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={fetchHistoryLogs} 
                  loading={historyLoading}
                  style={{ borderRadius: '6px' }}
                >
                  Làm mới
                </Button>
              </Space>
            </div>

            <Table
              dataSource={filteredHistoryLogs}
              columns={historyColumns}
              rowKey="id"
              loading={historyLoading}
              pagination={{
                defaultPageSize: 50,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => `Tổng số: ${total} sự kiện`
              }}
              style={{ borderRadius: '8px', overflow: 'hidden' }}
            />
          </Card>
          </TabPane>
        )}

        {isAdmin && (
          <TabPane tab={<span><LoginOutlined /> Nhật ký Đăng nhập Hệ thống</span>} key="login_logs">
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#262626' }}>
                Lịch sử truy cập và đăng nhập hệ thống
              </div>
              <Space flexWrap="wrap">
                <Select
                  value={selectedRoleFilter}
                  onChange={setSelectedRoleFilter}
                  style={{ width: 200, borderRadius: '6px' }}
                >
                  <Option value="ALL">-- Tất cả Vai trò --</Option>
                  {Object.keys(ROLES).map(role => (
                    <Option key={role} value={role}>{getRoleLabel(role)}</Option>
                  ))}
                </Select>
                <Input
                  placeholder="Tìm theo Họ tên hoặc Tài khoản..."
                  prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                  value={loginSearch}
                  onChange={e => setLoginSearch(e.target.value)}
                  style={{ width: 260, borderRadius: '6px' }}
                  allowClear
                />
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={fetchLoginLogs} 
                  loading={loginLoading}
                  style={{ borderRadius: '6px' }}
                >
                  Làm mới
                </Button>
              </Space>
            </div>

            <Table
              dataSource={filteredLoginLogs}
              columns={loginColumns}
              rowKey="id"
              loading={loginLoading}
              pagination={{
                defaultPageSize: 50,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => `Tổng số: ${total} lượt đăng nhập`
              }}
              style={{ borderRadius: '8px', overflow: 'hidden' }}
            />
          </Card>
          </TabPane>
        )}

        <TabPane tab={<span><CalendarOutlined /> Quản lý Đợt Cập nhật</span>} key="editing_period">
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <Card
              bordered={false}
              style={{
                background: 'linear-gradient(135deg, #fff7e6 0%, #ffffff 100%)',
                border: '1.5px solid #ffd591',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(212, 107, 8, 0.08)',
                padding: '16px'
              }}
              title={
                <span style={{ fontWeight: 800, color: '#d46b08', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarOutlined style={{ color: '#d46b08' }} /> Quản lý Đợt Cập nhật & Chỉnh sửa Lý lịch
                </span>
              }
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <Paragraph style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                    Với vai trò <Tag color="orange" style={{ fontWeight: 'bold' }}>{currentUser?.role === ROLES.KIEMTRA ? 'Ban điều hành nhóm Kiểm tra giám sát' : 'Chi ủy Chi bộ Sinh viên'}</Tag>, đồng chí có thẩm quyền mở hoặc khóa đợt điều chỉnh thông tin lý lịch tự động dành cho Đảng viên sinh viên.
                  </Paragraph>
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Trạng thái hiện tại:</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span className={isEditingPeriodOpen ? "pulse-dot-green" : "pulse-dot-red"} style={{ marginTop: '1px' }} />
                      {isEditingPeriodOpen ? (
                        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>Đang MỞ (Cho phép Đảng viên tự cập nhật lý lịch liên lạc)</span>
                      ) : (
                        <span style={{ color: '#f5222d', fontWeight: 'bold' }}>Đang ĐÓNG (Khóa mọi quyền chỉnh sửa từ Đảng viên)</span>
                      )}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>Đợt mở:</span>
                  <Switch
                    checked={isEditingPeriodOpen}
                    loading={togglingPeriod}
                    onChange={handleToggleEditingPeriod}
                    checkedChildren="MỞ"
                    unCheckedChildren="ĐÓNG"
                    style={{ backgroundColor: isEditingPeriodOpen ? '#52c41a' : '#d9d9d9' }}
                  />
                </div>
              </div>
            </Card>
          </Card>
        </TabPane>

        {isAdmin && (
          <TabPane tab={<span><TeamOutlined style={{ color: '#c62828' }} /> Cấu hình Chi ủy & Ban điều hành</span>} key="bch_contacts">
            <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#262626', marginBottom: '8px' }}>
                Cấu hình Thông tin Chi ủy và Ban điều hành các nhóm của Chi bộ
              </div>
              <Paragraph style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
                Thay đổi các thông tin liên lạc, danh sách thành viên chi ủy và ban điều hành hiển thị tại widget "Thông tin Chi ủy và Ban điều hành các nhóm của Chi bộ" trên trang chủ của các Đảng viên.
              </Paragraph>

              <Spin spinning={loadingBch}>
                <Form
                  form={bchForm}
                  layout="vertical"
                  onFinish={handleSaveBch}
                >
                  <Title level={5} style={{ color: '#c62828', fontWeight: 800, marginBottom: '16px' }}>
                    1. DANH SÁCH BAN CHI ỦY & BAN ĐIỀU HÀNH CÁC NHÓM (TỐI ĐA 15 ĐỒNG CHÍ)
                  </Title>

                  <Form.List name="contacts">
                    {(fields, { add, remove }) => (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {fields.map(({ key, name, ...restField }, idx) => (
                          <Card 
                            size="small" 
                            key={key} 
                            style={{ borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.015)' }}
                            title={<span style={{ fontWeight: 800, color: '#c62828' }}>Đồng chí thứ {idx + 1}</span>}
                            extra={fields.length > 1 && (
                              <Button type="link" danger onClick={() => remove(name)} style={{ fontWeight: 600 }}>
                                Xóa
                              </Button>
                            )}
                          >
                            <Row gutter={12}>
                              <Col xs={24} style={{ marginBottom: '12px' }}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'mssv_select']}
                                  label={<b style={{ color: '#c62828' }}>⚡ Chọn nhanh từ danh sách Đảng viên đang sinh hoạt</b>}
                                  style={{ marginBottom: '8px' }}
                                >
                                  <Select
                                    showSearch
                                    placeholder="Tìm theo Tên hoặc MSSV..."
                                    optionFilterProp="children"
                                    allowClear
                                    onChange={(mssvVal) => {
                                      const matchedUser = users.find(u => u.mssv === mssvVal);
                                      if (matchedUser) {
                                        const currentContacts = bchForm.getFieldValue('contacts') || [];
                                        currentContacts[name] = {
                                          ...currentContacts[name],
                                          name: matchedUser.ho_ten,
                                          phone: matchedUser.so_dien_thoai || matchedUser.sdt || '',
                                          email: matchedUser.email || '',
                                          facebook: matchedUser.facebook || '',
                                          initial: matchedUser.ho_ten ? matchedUser.ho_ten.trim().split(' ').pop().charAt(0).toUpperCase() : '?'
                                        };
                                        bchForm.setFieldsValue({ contacts: currentContacts });
                                      }
                                    }}
                                    filterOption={(input, option) =>
                                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    options={users.map(u => ({
                                      value: u.mssv,
                                      label: `${u.ho_ten} (${u.mssv || 'Không có MSSV'}) — ${u.lop || ''}`
                                    }))}
                                    dropdownStyle={{ borderRadius: '8px' }}
                                  />
                                </Form.Item>
                              </Col>
                            </Row>
                            <Row gutter={12}>
                              <Col xs={24} md={8}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'name']}
                                  label={<b>Họ và Tên</b>}
                                  rules={[{ required: true, message: 'Nhập họ tên!' }]}
                                  style={{ marginBottom: '8px' }}
                                >
                                  <Input placeholder="VD: TS. Bùi Trung Hiệp..." />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={8}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'role']}
                                  label={<b>Chức vụ / Vai trò phụ trách</b>}
                                  rules={[{ required: true, message: 'Nhập chức vụ!' }]}
                                  style={{ marginBottom: '8px' }}
                                >
                                  <Input placeholder="VD: Bí thư Chi bộ..." />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={8}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'initial']}
                                  label={<b>Ký tự đại diện</b>}
                                  rules={[{ required: true, message: 'Ký tự!' }]}
                                  style={{ marginBottom: '8px' }}
                                >
                                  <Input placeholder="VD: B" maxLength={2} style={{ textAlign: 'center' }} />
                                </Form.Item>
                              </Col>
                            </Row>
                            <Row gutter={12}>
                              <Col xs={24} md={8}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'phone']}
                                  label={<b>Số điện thoại (SĐT)</b>}
                                  style={{ marginBottom: '8px' }}
                                >
                                  <Input placeholder="VD: 0912345678..." />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={8}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'email']}
                                  label={<b>Email cá nhân</b>}
                                  style={{ marginBottom: '8px' }}
                                >
                                  <Input placeholder="VD: dongchi@due.edu.vn..." />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={8}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'facebook']}
                                  label={<b>Link Facebook</b>}
                                  style={{ marginBottom: '8px' }}
                                >
                                  <Input placeholder="VD: facebook.com/id..." />
                                </Form.Item>
                              </Col>
                            </Row>
                          </Card>
                        ))}
                        {fields.length < 15 && (
                          <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ borderRadius: '6px' }}>
                            Thêm thành viên mới
                          </Button>
                        )}
                      </div>
                    )}
                  </Form.List>

                  <Divider style={{ margin: '24px 0' }} />

                  <Title level={5} style={{ color: '#c62828', fontWeight: 800, marginBottom: '16px' }}>
                    2. THÔNG TIN LIÊN HỆ CHI BỘ
                  </Title>

                  <Row gutter={16}>
                    <Col xs={24}>
                      <Form.Item
                        name="email"
                        label={<b>Email liên hệ Chi bộ</b>}
                        rules={[{ required: true, message: 'Nhập email liên hệ!' }]}
                      >
                        <Input placeholder="VD: chibosvktdn@due.udn.vn..." />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={savingBch}
                      icon={<SaveOutlined />}
                      style={{ backgroundColor: '#c62828', borderColor: '#c62828', fontWeight: 700, height: 40, borderRadius: '6px' }}
                    >
                      LƯU CẤU HÌNH BAN CHI ỦY
                    </Button>
                  </Form.Item>
                </Form>
              </Spin>
            </Card>
          </TabPane>
        )}

        {isAdmin && (
          <TabPane tab={<span><CloudUploadOutlined /> Sao lưu & Khôi phục</span>} key="backup_restore">
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <Alert
              message="Khu vực nguy hiểm — Chỉ dành cho Quản trị viên"
              description="Các thao tác dưới đây sẽ ảnh hưởng trực tiếp đến toàn bộ cơ sở dữ liệu hệ thống. Hãy chắc chắn bạn đã sao lưu dữ liệu trước khi thực hiện dọn dẹp hoặc cài đặt lại."
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 24, borderRadius: '8px' }}
            />

            {/* Progress indicators */}
            {backingUp && (
              <Card
                size="small"
                style={{ marginBottom: 24, borderRadius: '8px', border: '1px solid #1890ff', background: '#e6f7ff' }}
              >
                <div style={{ fontWeight: 700, color: '#0050b3' }}>
                  <ReloadOutlined spin style={{ marginRight: 6 }} />
                  Đang xuất bản sao lưu dữ liệu... Vui lòng không đóng trình duyệt.
                </div>
              </Card>
            )}

            {restoring && (
              <Card
                size="small"
                style={{ marginBottom: 24, borderRadius: '8px', border: '1px solid #52c41a', background: '#f6ffed' }}
              >
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#389e0d' }}>
                  <ReloadOutlined spin style={{ marginRight: 6 }} />
                  {restoreProgress.status}
                </div>
                <Progress
                  percent={Math.round((restoreProgress.current / (restoreProgress.total || 1)) * 100)}
                  status="active"
                  strokeColor="#52c41a"
                  style={{ marginBottom: 4 }}
                />
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  Đang xử lý: {restoreProgress.current} / {restoreProgress.total} bản ghi
                </div>
              </Card>
            )}

            {resetting && resetProgress.total > 0 && (
              <Card
                size="small"
                style={{ marginBottom: 24, borderRadius: '8px', border: '1px solid #ffd666', background: '#fffbe6' }}
              >
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#d48806' }}>
                  <ReloadOutlined spin style={{ marginRight: 6 }} />
                  Đang dọn dẹp danh mục "{resetProgress.collection}"...
                </div>
                <Progress
                  percent={Math.round((resetProgress.current / resetProgress.total) * 100)}
                  status="active"
                  strokeColor="#c62828"
                  style={{ marginBottom: 4 }}
                />
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  Đang xóa: {resetProgress.current} / {resetProgress.total} bản ghi
                </div>
              </Card>
            )}

            {/* Backup, Restore, and Seeding Section */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} md={8}>
                <Card 
                  title={<span style={{ fontWeight: 800, color: '#1890ff' }}><DatabaseOutlined /> Sao lưu cơ sở dữ liệu</span>}
                  bordered
                  style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid #e8e8e8', height: '100%' }}
                >
                  <Paragraph style={{ fontSize: '13px', color: '#555', lineHeight: '1.6', margin: 0 }}>
                    Tải xuống toàn bộ dữ liệu của hệ thống dưới dạng tệp tin `.json`. Đồng chí nên thực hiện sao lưu định kỳ hoặc trước khi tiến hành dọn dẹp hệ thống.
                  </Paragraph>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />} 
                    onClick={handleBackupData} 
                    loading={backingUp}
                    block
                    style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', borderRadius: '6px', fontWeight: 700, marginTop: 16 }}
                  >
                    SAO LƯU HỆ THỐNG
                  </Button>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card 
                  title={<span style={{ fontWeight: 800, color: '#52c41a' }}><UploadOutlined /> Khôi phục dữ liệu</span>}
                  bordered
                  style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid #e8e8e8', height: '100%' }}
                >
                  <Paragraph style={{ fontSize: '13px', color: '#555', lineHeight: '1.6', margin: 0 }}>
                    Tải lên tệp tin sao lưu `.json` để tiến hành khôi phục lại dữ liệu hệ thống. Quá trình này sẽ bảo toàn toàn bộ liên kết thông tin.
                  </Paragraph>
                  <div style={{ marginTop: 16 }}>
                    <input 
                      type="file" 
                      accept=".json" 
                      id="database-restore-upload" 
                      style={{ display: 'none' }} 
                      onChange={handleFileImportChange}
                    />
                    <Button 
                      type="primary" 
                      icon={<UploadOutlined />} 
                      onClick={() => document.getElementById('database-restore-upload').click()}
                      loading={restoring}
                      block
                      style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', borderRadius: '6px', fontWeight: 700 }}
                    >
                      KHÔI PHỤC DỮ LIỆU
                    </Button>
                  </div>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card 
                  title={<span style={{ fontWeight: 800, color: '#fa8c16' }}><ReloadOutlined /> Khởi tạo dữ liệu mẫu</span>}
                  bordered
                  style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid #e8e8e8', height: '100%' }}
                >
                  <Paragraph style={{ fontSize: '13px', color: '#555', lineHeight: '1.6', margin: 0 }}>
                    <Tag color="orange" style={{ fontWeight: 'bold' }}>Thử nghiệm nhanh</Tag> Xóa sạch dữ liệu hiện tại và điền bộ dữ liệu mẫu (10+ Đảng viên sinh hoạt, họp chi bộ, biểu quyết, nhật ký mẫu).
                  </Paragraph>
                  <Popconfirm
                    title={<span style={{ fontWeight: 700, color: '#fa8c16' }}>XÁC NHẬN KHỞI TẠO DỮ LIỆU MẪU</span>}
                    description="Hành động này sẽ XÓA SẠCH toàn bộ dữ liệu hiện tại trước khi tạo mới. Bạn có chắc chắn muốn thực hiện?"
                    onConfirm={handleSeedDatabase}
                    okText="Đồng ý khởi tạo"
                    cancelText="Hủy bỏ"
                    okButtonProps={{ style: { backgroundColor: '#fa8c16', borderColor: '#fa8c16', fontWeight: 700 } }}
                    icon={<ExclamationCircleOutlined style={{ color: '#fa8c16' }} />}
                  >
                    <Button 
                      type="primary" 
                      icon={<ReloadOutlined />} 
                      loading={seeding}
                      block
                      style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16', borderRadius: '6px', fontWeight: 700, marginTop: 16 }}
                    >
                      KHỞI TẠO DỮ LIỆU MẪU
                    </Button>
                  </Popconfirm>
                </Card>
              </Col>
            </Row>
          </Card>
        </TabPane>
      )}

        <TabPane tab={<span><UnorderedListOutlined /> Quản lý Danh mục</span>} key="categories">
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#262626', marginBottom: '8px' }}>
              Quản lý Danh mục Hệ thống (Động)
            </div>
            <Paragraph style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
              Thay đổi các Khoa đào tạo và các Nhóm sinh hoạt Đảng có sẵn trong Chi bộ.
            </Paragraph>
            <Spin spinning={loadingCategories}>
              <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                {/* COLUMN 1: KHOA ĐÀO TẠO */}
                <Col xs={24} md={12}>
                  <Card 
                    title={
                      <span style={{ fontWeight: 800, color: '#1890ff', fontSize: '15px' }}>
                        <BookOutlined style={{ marginRight: 6 }} /> Danh sách Khoa đào tạo ({faculties.length})
                      </span>
                    }
                    bordered
                    style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid #e8e8e8' }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 20, minHeight: '100px', padding: '12px', background: '#fafafa', borderRadius: '8px', border: '1px dashed #d9d9d9' }}>
                      {faculties.length === 0 ? (
                        <Empty description="Chưa có Khoa nào" style={{ margin: 'auto' }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        faculties.map((f, index) => {
                          const isEditing = editingFacultyIndex === index;
                          return (
                            <span key={f}>
                              {isEditing ? (
                                <Input
                                  size="small"
                                  autoFocus
                                  style={{ width: '130px', borderRadius: '4px' }}
                                  value={editingFacultyValue}
                                  onChange={e => setEditingFacultyValue(e.target.value)}
                                  onBlur={() => handleEditFaculty(index, editingFacultyValue)}
                                  onPressEnter={() => handleEditFaculty(index, editingFacultyValue)}
                                />
                              ) : (
                                <Tag 
                                  color="blue" 
                                  closable 
                                  onClose={(e) => { e.preventDefault(); handleDeleteFaculty(f); }}
                                  onDoubleClick={() => {
                                    setEditingFacultyIndex(index);
                                    setEditingFacultyValue(f);
                                  }}
                                  style={{ 
                                    padding: '4px 10px', 
                                    borderRadius: '6px', 
                                    fontSize: '12px', 
                                    fontWeight: 600, 
                                    cursor: 'pointer',
                                    border: '1px solid #91d5ff'
                                  }}
                                >
                                  {f}
                                </Tag>
                              )}
                            </span>
                          );
                        })
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Input 
                        placeholder="Nhập tên Khoa mới..." 
                        value={newFaculty}
                        onChange={e => setNewFaculty(e.target.value)}
                        onPressEnter={handleAddFaculty}
                        style={{ borderRadius: '6px' }}
                      />
                      <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={handleAddFaculty}
                        style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', borderRadius: '6px', fontWeight: 600 }}
                      >
                        Thêm
                      </Button>
                    </div>
                    <div style={{ fontSize: '11px', color: '#bfbfbf', marginTop: '8px', fontStyle: 'italic' }}>
                      * Nhấn đúp (Double-click) vào thẻ danh mục để sửa đổi trực tiếp tên Khoa.
                    </div>
                  </Card>
                </Col>

                {/* COLUMN 2: NHÓM SINH HOẠT */}
                <Col xs={24} md={12}>
                  <Card 
                    title={
                      <span style={{ fontWeight: 800, color: '#722ed1', fontSize: '15px' }}>
                        <TeamOutlined style={{ marginRight: 6 }} /> Danh sách Nhóm sinh hoạt ({groups.length})
                      </span>
                    }
                    bordered
                    style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid #e8e8e8' }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 20, minHeight: '100px', padding: '12px', background: '#fafafa', borderRadius: '8px', border: '1px dashed #d9d9d9' }}>
                      {groups.length === 0 ? (
                        <Empty description="Chưa có Nhóm nào" style={{ margin: 'auto' }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        groups.map((g, index) => {
                          const isEditing = editingGroupIndex === index;
                          return (
                            <span key={g}>
                              {isEditing ? (
                                <Input
                                  size="small"
                                  autoFocus
                                  style={{ width: '130px', borderRadius: '4px' }}
                                  value={editingGroupValue}
                                  onChange={e => setEditingGroupValue(e.target.value)}
                                  onBlur={() => handleEditGroup(index, editingGroupValue)}
                                  onPressEnter={() => handleEditGroup(index, editingGroupValue)}
                                />
                              ) : (
                                <Tag 
                                  color="purple" 
                                  closable 
                                  onClose={(e) => { e.preventDefault(); handleDeleteGroup(g); }}
                                  onDoubleClick={() => {
                                    setEditingGroupIndex(index);
                                    setEditingGroupValue(g);
                                  }}
                                  style={{ 
                                    padding: '4px 10px', 
                                    borderRadius: '6px', 
                                    fontSize: '12px', 
                                    fontWeight: 600, 
                                    cursor: 'pointer',
                                    border: '1px solid #d3adf7'
                                  }}
                                >
                                  {g}
                                </Tag>
                              )}
                            </span>
                          );
                        })
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Input 
                        placeholder="Nhập tên Nhóm mới..." 
                        value={newGroup}
                        onChange={e => setNewGroup(e.target.value)}
                        onPressEnter={handleAddGroup}
                        style={{ borderRadius: '6px' }}
                      />
                      <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={handleAddGroup}
                        style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', borderRadius: '6px', fontWeight: 600 }}
                      >
                        Thêm
                      </Button>
                    </div>
                    <div style={{ fontSize: '11px', color: '#bfbfbf', marginTop: '8px', fontStyle: 'italic' }}>
                      * Nhấn đúp (Double-click) vào thẻ danh mục để sửa đổi trực tiếp tên Nhóm.
                    </div>
                  </Card>
                </Col>
              </Row>
            </Spin>
          </Card>
        </TabPane>

        {isAdmin && (
          <TabPane tab={<span><WarningOutlined style={{ color: '#ff4d4f' }} /> Khu vực dọn dẹp</span>} key="danger_zone">
            <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #ffd591', background: '#fffbe6' }}>
              <Alert
                message="CẢNH BÁO NGUY HIỂM — Khu vực dọn dẹp hệ thống vĩnh viễn"
                description="Các thao tác dưới đây sẽ xóa vĩnh viễn dữ liệu khỏi hệ thống và không thể hoàn tác. Vui lòng kiểm tra kỹ trước khi nhấn nút!"
                type="error"
                showIcon
                icon={<WarningOutlined />}
                style={{ marginBottom: 24, borderRadius: '8px' }}
              />
              <Row gutter={[16, 16]}>
              {RESET_COLLECTIONS.map(col => (
                <Col xs={24} md={12} key={col.key}>
                  <Card
                    size="small"
                    style={{
                      borderRadius: '10px',
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      height: '100%'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '10px',
                        backgroundColor: `${col.color}15`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', color: col.color, flexShrink: 0
                      }}>
                        {col.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#262626', marginBottom: 4 }}>
                          {col.label}
                        </div>
                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 12, lineHeight: '1.5' }}>
                          {col.description}
                        </div>
                        <div style={{ fontSize: '12px', color: '#bfbfbf', marginBottom: 8 }}>
                          Mã mục: <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '3px', color: '#595959' }}>{col.key}</code>
                        </div>

                        <Input
                          size="small"
                          placeholder={`Gõ "${col.key}" để xác nhận`}
                          value={resetConfirmText === col.key ? col.key : (resetConfirmText.startsWith(col.key.substring(0, 3)) ? resetConfirmText : '')}
                          onChange={e => {
                            const val = e.target.value;
                            setResetConfirmText(val === col.key ? col.key : val);
                          }}
                          style={{ marginBottom: 8, borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}
                          disabled={resetting}
                        />

                        <Popconfirm
                          title={<span style={{ fontWeight: 700, color: '#c62828' }}>XÁC NHẬN XÓA DỮ LIỆU</span>}
                          description={`Bạn chắc chắn muốn xóa toàn bộ dữ liệu "${col.label}"? Hành động này KHÔNG THỂ hoàn tác!`}
                          onConfirm={() => handleResetCollection(col.key)}
                          okText="XÓA VĨNH VIỄN"
                          cancelText="Hủy bỏ"
                          okButtonProps={{ danger: true, style: { fontWeight: 700 } }}
                          icon={<ExclamationCircleOutlined style={{ color: '#c62828' }} />}
                          disabled={resetConfirmText !== col.key || resetting}
                        >
                          <Button
                            danger
                            type="primary"
                            size="small"
                            icon={<DeleteOutlined />}
                            disabled={resetConfirmText !== col.key || resetting}
                            loading={resetting && resetProgress.collection === col.key}
                            block
                            style={{ borderRadius: '6px', fontWeight: 700 }}
                          >
                            Xóa toàn bộ {col.label}
                          </Button>
                        </Popconfirm>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </TabPane>
      )}
      </Tabs>
        </div>
      </div>

      {/* Modal Khôi phục dữ liệu */}
      <Modal
        title={<span style={{ fontWeight: 800, color: '#c62828' }}><WarningOutlined /> Xác nhận khôi phục hệ thống</span>}
        open={isRestoreModalVisible}
        onCancel={() => {
          setIsRestoreModalVisible(false);
          setUploadedBackupData(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setIsRestoreModalVisible(false);
            setUploadedBackupData(null);
          }}>
            Hủy bỏ
          </Button>,
          <Button key="merge" type="dashed" onClick={() => handleExecuteRestore('merge')} style={{ fontWeight: 600 }}>
            Trộn dữ liệu (Merge)
          </Button>,
          <Button key="overwrite" type="primary" danger onClick={() => handleExecuteRestore('overwrite')} style={{ fontWeight: 700 }}>
            Xóa sạch & Ghi đè (Overwrite)
          </Button>
        ]}
      >
        <div style={{ padding: '8px 0' }}>
          <Alert
            message="Lưu ý quan trọng trước khi khôi phục"
            description={
              <div>
                Đồng chí vui lòng chọn phương thức khôi phục dữ liệu:
                <ul style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '8px', fontSize: '13px' }}>
                  <li><strong>Xóa sạch & Ghi đè:</strong> Hệ thống sẽ xóa sạch dữ liệu hiện tại của các bảng có trong tệp sao lưu trước khi nhập mới. Thích hợp để đồng bộ hoàn toàn cơ sở dữ liệu.</li>
                  <li><strong>Trộn dữ liệu:</strong> Giữ nguyên dữ liệu hiện tại, chỉ thêm mới các dòng chưa có và cập nhật nội dung các dòng trùng mã định danh.</li>
                </ul>
              </div>
            }
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Paragraph>
            Tệp sao lưu chứa dữ liệu của các bảng: <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>{uploadedBackupData ? Object.keys(uploadedBackupData).join(', ') : ''}</code>
          </Paragraph>
        </div>
      </Modal>

    </div>
  );
};

export default Users;
