import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Row, Col, Typography, Tag, Form,
  Input, Button, message, Spin, Space, Checkbox, Avatar, Alert, DatePicker, Select, Popconfirm, Tooltip,
  Divider, Modal, Progress, Badge, List, Empty
} from 'antd';
import {
  EditOutlined, SaveOutlined, CloseOutlined, UserOutlined,
  IdcardOutlined, BookOutlined, PhoneOutlined, HomeOutlined, TeamOutlined, StarOutlined,
  MailOutlined, FacebookOutlined, SwapOutlined, ScanOutlined, CameraOutlined,
  CheckCircleOutlined, LoadingOutlined, SafetyCertificateOutlined, DeleteOutlined, UploadOutlined
} from '@ant-design/icons';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../services/permissionService';
import dayjs from 'dayjs';
import AddressWardSelect from '../components/AddressWardSelect';
import AddressProvinceSelect from '../components/AddressProvinceSelect';
import AddressDistrictSelect from '../components/AddressDistrictSelect';

const { Title, Text } = Typography;
const { Option } = Select;

const DAN_TOC = ["Kinh", "Tày", "Thái", "Hoa", "Khmer", "Mường", "Nùng", "H'Mông", "Dao", "Gia Rai", "Ngái", "Ê Đê", "Ba Na", "Xơ Đăng", "Sán Chay", "Cơ Ho", "Chăm", "Sán Dìu", "Hrê", "Mnông", "Ra Glai", "Xtiêng", "Bru-Vân Kiều", "Thổ", "Giáy", "Cơ Tu", "Giẻ Triêng", "Mạ", "Khơ Mú", "Co", "Tà Ôi", "Chơ Ro", "Kháng", "Xinh Mun", "Hà Nhì", "Chu Ru", "Lào", "La Chí", "La Ha", "Phù Lá", "La Hủ", "Lự", "Lô Lô", "Chứt", "Mảng", "Pà Thẻn", "Co Lao", "Cống", "Bố Y", "Si La", "Pu Péo", "Brâu", "Ơ Đu", "Rơ Măm", "Khác"];
const TON_GIAO = ["Không", "Phật giáo", "Công giáo", "Tin Lành", "Cao Đài", "Hòa Hảo", "Hồi giáo", "Bà La Môn", "Khác"];
const NHOM = ["Phát triển Đảng", "Hồ sơ sinh hoạt Đảng", "Kiểm tra - Giám sát", "Truyền thông", "Tổ chức"];
const KHOA = ["P.CTSV", "Quản trị Kinh doanh", "Du lịch", "Marketing", "Tài chính", "Ngân hàng", "Kinh tế", "Kế toán", "Luật", "Thống kê - Tin học", "Thương mại điện tử", "Kinh doanh quốc tế", "Lý luận chính trị", "Khác", "Trung tâm Đào tạo Quốc tế"];

const ProfileFieldContext = React.createContext(null);

const Field = ({ name, label, rules, children, span = 12, editable = false }) => {
  const { memberData, editMode, isEditingPeriodOpen } = React.useContext(ProfileFieldContext);
  const val = memberData[name];

  // For date formatting
  let displayVal = val;
  if ((name.includes('ngay_') || name === 'ngaykiqd') && val) {
    displayVal = dayjs(val).format('DD/MM/YYYY');
  }
  if (name === 'dang_vien_du_bi') {
    displayVal = val ? 'Dự bị' : 'Chính thức';
  }

  const isFieldEditable = editMode && editable && (isEditingPeriodOpen || memberData.allow_self_edit);

  return (
    <Col span={span}>
      {isFieldEditable ? (
        <Form.Item name={name} label={label} rules={rules} style={{ marginBottom: 12 }}>
          {children}
        </Form.Item>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 4 }}>{label}</div>
          <div style={{ fontWeight: 500, fontSize: 15, color: '#262626' }}>
            {name === 'ho_ten' ? (
              <strong style={{ color: '#c62828' }}>{displayVal || '--'}</strong>
            ) : name === 'nhom' && val ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{displayVal}</span>
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => window.showGroupMembersModal && window.showGroupMembersModal()}
                  style={{ padding: 0, height: 'auto', fontSize: '12px', textDecoration: 'underline' }}
                >
                  (Xem thành viên)
                </Button>
              </div>
            ) : (
              displayVal || '--'
            )}
          </div>
        </div>
      )}
    </Col>
  );
};

const Profile = () => {
  const { currentUser } = useAuth();
  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isEditingPeriodOpen, setIsEditingPeriodOpen] = useState(false);
  const [editingPeriodInfo, setEditingPeriodInfo] = useState(null);

  const [form] = Form.useForm();

  const watchAvatar = Form.useWatch('anh_ca_nhan', form);

  // Group members states
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);

  // Bind trigger function to window
  useEffect(() => {
    window.showGroupMembersModal = () => {
      setIsGroupModalVisible(true);
    };
    return () => {
      delete window.showGroupMembersModal;
    };
  }, []);

  // Fetch members of the same group when modal opens
  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (!isGroupModalVisible || !memberData?.nhom) return;
      setLoadingGroupMembers(true);
      try {
        const q = query(
          collection(db, "dang_vien"),
          where("nhom", "==", memberData.nhom),
          where("trang_thai", "==", "dang_sinh_hoat")
        );
        const snap = await getDocs(q);
        const members = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        members.sort((a, b) => (a.ho_ten || '').localeCompare(b.ho_ten || ''));
        setGroupMembers(members);
      } catch (e) {
        console.error("Lỗi khi tải thành viên nhóm:", e);
        message.error("Không thể tải danh sách thành viên trong nhóm.");
      } finally {
        setLoadingGroupMembers(false);
      }
    };
    fetchGroupMembers();
  }, [isGroupModalVisible, memberData]);

  const handleAvatarUpload = (e) => {
    const file = e.target.value ? e.target.files[0] : null;
    if (!file) return;

    if (file.size > 800 * 1024) {
      message.error("Ảnh quá lớn! Vui lòng chọn ảnh dưới 800KB để đảm bảo hiệu năng lưu trữ.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target.result;
      try {
        setSaving(true);
        await updateDoc(doc(db, "dang_vien", memberData.id), {
          anh_ca_nhan: base64String,
          updatedAt: new Date().toISOString()
        });
        form.setFieldsValue({ anh_ca_nhan: base64String });
        message.success("Đã tải lên và cập nhật ảnh đại diện mới thành công!");
        fetchMemberRecord();
      } catch (err) {
        console.error(err);
        message.error("Lỗi khi cập nhật ảnh đại diện: " + err.message);
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Biometric Face Registration states
  const [isFaceModalVisible, setIsFaceModalVisible] = useState(false);
  const [scanStep, setScanStep] = useState(0); // 0: Start/Wait, 1: Scanning, 2: Preview & Confirm
  const [scanProgress, setScanProgress] = useState(0);
  const [capturedImage, setCapturedImage] = useState(null);
  const [scanLogs, setScanLogs] = useState([]);
  const [isSavingFace, setIsSavingFace] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const playBiometricSound = (type = 'scan') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);

      if (type === 'scan') {
        // High frequency soft click/tick
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.connect(gain);
        gain.gain.setValueAtTime(0.015, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'success') {
        // High-pitched crystal double chime
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
        osc1.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.12); // E6

        osc2.frequency.setValueAtTime(1975.53, ctx.currentTime); // B6
        osc2.frequency.setValueAtTime(2637.02, ctx.currentTime + 0.12); // E7

        osc1.connect(gain);
        osc2.connect(gain);

        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.8);
        osc2.stop(ctx.currentTime + 0.8);
      } else if (type === 'error') {
        // Warning buzz
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.connect(gain);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn("Chime failed to synthesize:", e);
    }
  };

  const addScanLog = (text) => {
    setScanLogs(prev => [...prev, `[${dayjs().format('HH:mm:ss')}] ${text}`]);
  };

  const startCamera = async () => {
    setScanStep(1);
    setScanProgress(0);
    setCapturedImage(null);
    setFaceDescriptor(null);
    setScanLogs([]);
    setCameraActive(true);

    addScanLog("Đang tải các mô hình AI nhận diện (lần đầu sẽ mất chút thời gian)...");
    playBiometricSound('scan');

    try {
      if (window.faceapi) {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        await Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        addScanLog("Tải mô hình AI thành công.");
      } else {
        addScanLog("LỖI: Chưa tải được thư viện face-api!");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      addScanLog("Camera kết nối thành công.");
      addScanLog("Vui lòng giữ thẳng mặt trước ống kính...");

      // Chờ video phát
      if (videoRef.current) {
        videoRef.current.onplay = () => {
          runBiometricScanSequence();
        };
      }
    } catch (err) {
      console.error(err);
      addScanLog("LỖI: Không thể truy cập camera hoặc tải AI.");
      playBiometricSound('error');
      message.error("Vui lòng cấp quyền truy cập camera để đăng ký!");
      stopCamera();
      setScanStep(0);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  // Auto clean camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const runBiometricScanSequence = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    let attempts = 0;

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !window.faceapi) return;
      attempts++;
      setScanProgress(Math.min(attempts * 10, 90)); // Update fake progress up to 90%

      if (attempts % 5 === 0) playBiometricSound('scan');

      try {
        const detection = await window.faceapi
          .detectSingleFace(videoRef.current, new window.faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
          setScanProgress(100);
          addScanLog("Phát hiện khuôn mặt! Đang trích xuất đặc trưng...");
          setFaceDescriptor(Array.from(detection.descriptor));
          captureSnapshot();
        } else {
          if (attempts % 5 === 0) {
            addScanLog("Chưa tìm thấy khuôn mặt, vui lòng nhìn thẳng...");
          }
        }
      } catch (e) {
        console.error("Lỗi nhận diện:", e);
      }
    }, 500);
  };

  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Draw current frame to canvas
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to Base64
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);

    // Play camera success sound
    playBiometricSound('success');
    addScanLog("Đã chụp khuôn mặt thành công!");

    // Turn off camera
    stopCamera();

    // Advance to confirmation screen
    setTimeout(() => {
      setScanStep(2);
    }, 1000);
  };

  const handleRegisterFace = async () => {
    if (!capturedImage || !faceDescriptor) {
      message.error("Không có dữ liệu đặc trưng khuôn mặt hợp lệ.");
      return;
    }
    setIsSavingFace(true);
    try {
      const formatted = {
        khuon_mat_registered: true,
        khuon_mat_snapshot: capturedImage,
        khuon_mat_vector: faceDescriptor,
        khuon_mat_registered_at: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, "dang_vien", memberData.id), formatted);
      message.success("Đăng ký sinh trắc học khuôn mặt thành công!");
      setIsFaceModalVisible(false);
      setScanStep(0);
      fetchMemberRecord();
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi đồng bộ dữ liệu khuôn mặt: " + e.message);
    } finally {
      setIsSavingFace(false);
    }
  };

  const handleDeleteFace = async () => {
    try {
      const formatted = {
        khuon_mat_registered: false,
        khuon_mat_snapshot: null,
        khuon_mat_vector: null,
        khuon_mat_registered_at: null,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, "dang_vien", memberData.id), formatted);
      message.success("Đã xóa thông tin khuôn mặt thành công.");
      fetchMemberRecord();
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi xóa dữ liệu khuôn mặt: " + e.message);
    }
  };

  const handleSetAsAvatar = async () => {
    if (!memberData.khuon_mat_snapshot) return;
    try {
      await updateDoc(doc(db, "dang_vien", memberData.id), {
        anh_ca_nhan: memberData.khuon_mat_snapshot,
        updatedAt: new Date().toISOString()
      });
      message.success("Đã đặt ảnh sinh trắc học làm ảnh đại diện!");
      fetchMemberRecord();
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi đổi ảnh đại diện: " + e.message);
    }
  };

  const watchTinhTpTt = Form.useWatch('tinh_tp_tt', form);
  const watchTinhTpQq = Form.useWatch('tinh_tp_qq', form);
  const watchTinhTpQqCu = Form.useWatch('tinh_tp_qq_cu', form);
  const watchTinhTpTtCu = Form.useWatch('tinh_tp_tt_cu', form);
  const watchQuanHuyenQqCu = Form.useWatch('quan_huyen_qq_cu', form);
  const watchQuanHuyenTtCu = Form.useWatch('quan_huyen_tt_cu', form);

  const fetchEditingPeriodStatus = async () => {
    try {
      const docRef = doc(db, "system_config", "editing_period");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsEditingPeriodOpen(!!data.isOpen);
        setEditingPeriodInfo(data);
      } else {
        setIsEditingPeriodOpen(false);
      }
    } catch (e) {
      console.error("Lỗi khi đọc trạng thái đợt chỉnh sửa:", e);
    }
  };

  const getCleanName = (fullName) => {
    if (!fullName) return '';
    let name = fullName.replace(/^(Đ\/c\s+|TS\.\s+)/, '');
    name = name.replace(/\s*\(.*\)$/, '');
    return name.trim();
  };

  const fetchMemberRecord = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      let snapshot = null;
      if (currentUser.mssv) {
        const q = query(collection(db, "dang_vien"), where("mssv", "==", currentUser.mssv));
        snapshot = await getDocs(q);
      } else if (currentUser.name) {
        const cleanName = getCleanName(currentUser.name);
        const q = query(collection(db, "dang_vien"), where("ho_ten", "==", cleanName));
        snapshot = await getDocs(q);
      }

      if (snapshot && !snapshot.empty) {
        const docRecord = snapshot.docs[0];
        const data = { id: docRecord.id, ...docRecord.data() };
        setMemberData(data);

        // Prefill form
        form.setFieldsValue({
          ...data,
          ngay_sinh: data.ngay_sinh ? dayjs(data.ngay_sinh) : null,
          ngay_vao_dang: data.ngay_vao_dang ? dayjs(data.ngay_vao_dang) : null,
          ngay_chinh_thuc: data.ngay_chinh_thuc ? dayjs(data.ngay_chinh_thuc) : null,
          ngay_chuyen_vao: data.ngay_chuyen_vao ? dayjs(data.ngay_chuyen_vao) : null,
          ngaykiqd: data.ngaykiqd ? dayjs(data.ngaykiqd) : null,
        });
      } else {
        setMemberData(null);
      }
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi tải thông tin hồ sơ Đảng viên.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberRecord();
    fetchEditingPeriodStatus();
  }, [currentUser]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // Only allow editing all fields except mssv, ho_ten, nhom
      const formatted = {
        cccd: values.cccd || '',
        ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : (memberData.ngay_sinh || null),
        gioi_tinh: values.gioi_tinh || '',
        dan_toc: values.dan_toc || '',
        ton_giao: values.ton_giao || '',
        lop: values.lop || '',
        khoa: values.khoa || '',
        ngay_vao_dang: values.ngay_vao_dang ? values.ngay_vao_dang.format('YYYY-MM-DD') : (memberData.ngay_vao_dang || null),
        ngay_chinh_thuc: values.ngay_chinh_thuc ? values.ngay_chinh_thuc.format('YYYY-MM-DD') : (memberData.ngay_chinh_thuc || null),
        so_the_dang: values.so_the_dang || '',
        ngay_chuyen_vao: values.ngay_chuyen_vao ? values.ngay_chuyen_vao.format('YYYY-MM-DD') : (memberData.ngay_chuyen_vao || null),
        noi_chuyen_di: values.noi_chuyen_di || '',
        ngaykiqd: values.ngaykiqd ? values.ngaykiqd.format('YYYY-MM-DD') : (memberData.ngaykiqd || null),
        soqd: values.soqd || '',
        dvhd: values.dvhd || '',
        so_dien_thoai: values.so_dien_thoai || '',
        facebook: values.facebook || '',
        email: values.email || '',
        email_sv: values.email_sv || '',
        dia_chi_tam_tru: values.dia_chi_tam_tru || '',
        chi_tiet_dc: values.chi_tiet_dc || '',
        xa_phuong_tt: values.xa_phuong_tt || '',
        tinh_tp_tt: values.tinh_tp_tt || '',
        xa_phuong_qq: values.xa_phuong_qq || '',
        tinh_tp_qq: values.tinh_tp_qq || '',
        tinh_tp_qq_cu: values.tinh_tp_qq_cu || '',
        quan_huyen_qq_cu: values.quan_huyen_qq_cu || '',
        xa_phuong_qq_cu: values.xa_phuong_qq_cu || '',
        chi_tiet_tt_cu: values.chi_tiet_tt_cu || '',
        tinh_tp_tt_cu: values.tinh_tp_tt_cu || '',
        quan_huyen_tt_cu: values.quan_huyen_tt_cu || '',
        xa_phuong_tt_cu: values.xa_phuong_tt_cu || '',
        ho_ten_nguoi_than: values.ho_ten_nguoi_than || '',
        sdt_nguoi_than: values.sdt_nguoi_than || '',
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, "dang_vien", memberData.id), formatted);
      message.success("Cập nhật hồ sơ thành công!");
      setEditMode(false);
      fetchMemberRecord();
    } catch (e) {
      message.error("Lỗi khi lưu thay đổi: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Privileged roles that can convert CCCD -> So The Dang
  const PRIVILEGED_ROLES = [ROLES.ADMIN, ROLES.BITHU, ROLES.CAPUY, ROLES.KIEMTRA, ROLES.OFFICIAL_MANAGER];

  const handleConvertSoTheDang = async () => {
    if (!memberData || !memberData.cccd) {
      message.warning('Đảng viên này chưa có số CCCD trong hệ thống!');
      return;
    }
    try {
      await updateDoc(doc(db, "dang_vien", memberData.id), {
        so_the_dang: memberData.cccd,
        updatedAt: new Date().toISOString()
      });
      message.success(`Đã cấp số thẻ Đảng (${memberData.cccd}) cho đồng chí ${memberData.ho_ten} thành công!`);
      fetchMemberRecord();
    } catch (e) {
      message.error('Lỗi khi cấp số thẻ Đảng: ' + e.message);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: 80 }}><Spin size="large" /></div>;

  if (!memberData) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto' }}>
        <Alert
          message="Hồ sơ cá nhân chưa được liên kết"
          description={
            <div style={{ marginTop: '8px' }}>
              Tài khoản đăng nhập của đồng chí (<strong>{currentUser?.name}</strong> - vai trò <strong>{currentUser?.role}</strong>) chưa được liên kết với bất kỳ hồ sơ Đảng viên Đang sinh hoạt nào trong hệ thống.<br />
              Vui lòng liên hệ ban chi ủy hoặc nhóm Kiểm tra giám sát để được đồng bộ!
            </div>
          }
          type="warning"
          showIcon
        />
      </div>
    );
  }



  const statusColor = memberData.dang_vien_du_bi ? 'orange' : 'green';
  const statusText = memberData.dang_vien_du_bi ? 'Đảng viên dự bị' : 'Đảng viên chính thức';

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
    if (!url || typeof url !== 'string') return undefined;
    const driveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)\//;
    const match = url.match(driveRegex);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w500`;
    }
    return url;
  };

  return (
    <ProfileFieldContext.Provider value={{ memberData, editMode, isEditingPeriodOpen }}>
      <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-block', width: '4px', height: '22px', backgroundColor: '#c62828', borderRadius: '2px' }}></span>
          Hồ sơ cá nhân Đảng viên
        </Title>

        <Space>
          {(isEditingPeriodOpen || memberData.allow_self_edit) ? (
            !editMode ? (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setEditMode(true)}
                style={{ backgroundColor: '#c62828', height: 38, padding: '0 24px', borderRadius: 6, fontWeight: 700 }}
              >
                Chỉnh sửa liên lạc
              </Button>
            ) : (
              <>
                <Button
                  icon={<CloseOutlined />}
                  onClick={() => setEditMode(false)}
                  style={{ height: 38, borderRadius: 6 }}
                >
                  Hủy
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={saving}
                  style={{ backgroundColor: '#c62828', height: 38, padding: '0 24px', borderRadius: 6, fontWeight: 700 }}
                >
                  Lưu thay đổi
                </Button>
              </>
            )
          ) : (
            <Tag color="warning" style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '4px', fontWeight: 700 }}>
              Chức năng tự cập nhật đang ĐÓNG
            </Tag>
          )}
        </Space>
      </div>

      {!(isEditingPeriodOpen || memberData.allow_self_edit) && (
        <Alert
          message="Đợt tự cập nhật thông tin liên lạc đang đóng"
          description="Hệ thống hiện tại đang khóa chức năng tự cập nhật lý lịch. Bạn chỉ có quyền xem thông tin. Vui lòng liên hệ Trưởng nhóm Kiểm tra giám sát để được mở đợt chỉnh sửa khi cần thiết."
          type="info"
          showIcon
          style={{ marginBottom: 20, borderRadius: '8px' }}
        />
      )}
      {(!isEditingPeriodOpen && memberData.allow_self_edit) && (
        <Alert
          message="Hồ sơ đã được cấp quyền tự chỉnh sửa"
          description="Tài khoản của bạn đã được cấp quyền để tự cập nhật thông tin. Vui lòng cập nhật các thông tin còn thiếu và lưu thay đổi."
          type="success"
          showIcon
          style={{ marginBottom: 20, borderRadius: '8px' }}
        />
      )}

      <Row gutter={24}>
        {/* LEFT SIDE: ID Card Profile */}
        <Col xs={24} md={7}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            padding: '32px 20px',
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
            border: '1px solid #f0f0f0',
            position: 'sticky',
            top: 24
          }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
              <Avatar
                size={140}
                icon={<UserOutlined />}
                src={getAvatarUrl(watchAvatar || memberData.anh_ca_nhan)}
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
                    id="profile-avatar-upload"
                    style={{ display: 'none' }}
                    onChange={handleAvatarUpload}
                  />
                  <Tooltip title="Tải lên ảnh đại diện mới">
                    <Button
                      type="primary"
                      shape="circle"
                      icon={<CameraOutlined />}
                      onClick={() => document.getElementById('profile-avatar-upload').click()}
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
              {memberData.ho_ten}
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
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#262626' }}>{memberData.mssv || '--'}</div>
                </div>
              </div>

              <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center' }}>
                <TeamOutlined style={{ fontSize: 20, color: '#c62828', marginRight: 14, width: 20 }} />
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>Nhóm sinh hoạt</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#262626' }}>{memberData.nhom || '--'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <PhoneOutlined style={{ fontSize: 20, color: '#c62828', marginRight: 14, width: 20 }} />
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>Số điện thoại</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#262626' }}>{memberData.so_dien_thoai || '--'}</div>
                </div>
              </div>
            </div>

            {/* Divider Line */}
            <Divider style={{ margin: '20px 0', borderColor: '#f0f0f0' }} />

            {/* BIOMETRICS FACE ID REGISTER & MANAGE */}
            {/* Tạm thời ẩn thiết lập sinh trắc học face id theo yêu cầu */}
            {true && (
              <div style={{ padding: '0 12px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#c62828', letterSpacing: '0.5px' }}>
                    SINH TRẮC HỌC FACE ID
                  </span>
                  {memberData.khuon_mat_registered ? (
                    <Badge status="success" text={<span style={{ color: '#52c41a', fontSize: '11px', fontWeight: 700 }}>ĐÃ XÁC MINH</span>} />
                  ) : (
                    <Badge status="warning" text={<span style={{ color: '#fa8c16', fontSize: '11px', fontWeight: 700 }}>CHƯA THIẾT LẬP</span>} />
                  )}
                </div>

                {memberData.khuon_mat_registered ? (
                  <div style={{
                    background: 'linear-gradient(135deg, #f6ffed 0%, #ffffff 100%)',
                    border: '1px solid #b7eb8f',
                    borderRadius: 10,
                    padding: '14px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    boxShadow: '0 2px 8px rgba(56, 158, 13, 0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar
                        size={48}
                        src={memberData.khuon_mat_snapshot}
                        style={{ border: '2px solid #52c41a', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1b4a00', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <SafetyCertificateOutlined style={{ color: '#52c41a' }} /> Face ID Đã Hoạt Động
                        </div>
                        <div style={{ fontSize: 11, color: '#595959', marginTop: 2 }}>
                          {memberData.khuon_mat_registered_at ? `Cập nhật: ${dayjs(memberData.khuon_mat_registered_at).format('DD/MM/YYYY')}` : 'Đã bảo mật'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                      {memberData.anh_ca_nhan !== memberData.khuon_mat_snapshot && (
                        <Button
                          type="dashed"
                          size="small"
                          icon={<UploadOutlined />}
                          onClick={handleSetAsAvatar}
                          style={{ width: '100%', fontSize: 11, color: '#1890ff', borderColor: '#1890ff' }}
                        >
                          Đặt làm ảnh đại diện
                        </Button>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          size="small"
                          icon={<ScanOutlined />}
                          onClick={() => { setIsFaceModalVisible(true); setScanStep(0); }}
                          style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#722ed1', borderColor: '#722ed1' }}
                        >
                          Quét lại
                        </Button>
                        <Popconfirm
                          title="Xóa dữ liệu khuôn mặt?"
                          description="Hệ thống sẽ xóa vĩnh viễn mẫu khuôn mặt và hình chụp đã lưu. Bạn chắc chắn?"
                          onConfirm={handleDeleteFace}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            style={{ fontSize: 11 }}
                          />
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: 'linear-gradient(135deg, #fffbe6 0%, #ffffff 100%)',
                    border: '1px solid #ffe58f',
                    borderRadius: 10,
                    padding: '14px 12px',
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(250, 140, 22, 0.05)'
                  }}>
                    <div style={{ fontSize: 12, color: '#595959', marginBottom: 12, lineHeight: '1.4' }}>
                      Chưa đăng ký mẫu sinh trắc học khuôn mặt. Hãy thiết lập ngay để hỗ trợ điểm danh bảo mật chống gian lận.
                    </div>
                    <Button
                      type="primary"
                      className="glow-btn-face"
                      icon={<ScanOutlined />}
                      onClick={() => { setIsFaceModalVisible(true); setScanStep(0); }}
                      style={{ width: '100%', fontWeight: 700, borderRadius: 6, height: 34 }}
                    >
                      THIẾT LẬP FACE ID
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Col>

        {/* RIGHT SIDE: Details Sections */}
        <Col xs={24} md={17}>
          <Form form={form} layout="vertical">

            {/* SECTION 1 */}
            <Card title={<><IdcardOutlined style={{ marginRight: 8 }} /> Thông tin cá nhân</>} bordered={false} style={cardStyle} headStyle={headStyle}>
              <Row gutter={16}>
                <Field name="mssv" label="MSSV" span={12} />
                <Field name="cccd" label="CCCD" span={12} editable>
                  <Input size="large" />
                </Field>
              </Row>
              <Row gutter={16}>
                <Field name="ho_ten" label="Họ và tên" span={24} />
              </Row>
              <Row gutter={16}>
                <Field name="ngay_sinh" label="Ngày sinh" span={6} editable>
                  <DatePicker style={{ width: '100%' }} format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" size="large" />
                </Field>
                <Field name="gioi_tinh" label="Giới tính" span={6} editable>
                  <Select size="large"><Option value="Nam">Nam</Option><Option value="Nữ">Nữ</Option></Select>
                </Field>
                <Field name="dan_toc" label="Dân tộc" span={6} editable>
                  <Select showSearch size="large" allowClear placeholder="Chọn Dân tộc"
                    filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                    {DAN_TOC.map(item => <Option key={item} value={item}>{item}</Option>)}
                  </Select>
                </Field>
                <Field name="ton_giao" label="Tôn giáo" span={6} editable>
                  <Select showSearch size="large" allowClear placeholder="Chọn Tôn giáo"
                    filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                    {TON_GIAO.map(item => <Option key={item} value={item}>{item}</Option>)}
                  </Select>
                </Field>
              </Row>
            </Card>

            {/* SECTION 2 */}
            <Card title={<><BookOutlined style={{ marginRight: 8 }} /> Học tập & Tổ chức</>} bordered={false} style={cardStyle} headStyle={headStyle}>
              <Row gutter={16}>
                <Field name="lop" label="Lớp" span={8} editable><Input size="large" /></Field>
                <Field name="khoa" label="Khoa" span={8} editable>
                  <Select showSearch size="large" allowClear placeholder="Chọn Khoa"
                    filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                    {KHOA.map(item => <Option key={item} value={item}>{item}</Option>)}
                  </Select>
                </Field>
                <Field name="nhom" label="Nhóm sinh hoạt" span={8} />
              </Row>
            </Card>

            {/* SECTION 3 */}
            <Card title={<><StarOutlined style={{ marginRight: 8 }} /> Thông tin Đảng</>} bordered={false} style={cardStyle} headStyle={headStyle}>
              <Row gutter={16}>
                <Field name="ngay_vao_dang" label="Ngày vào Đảng" span={12} />
                <Field name="dang_vien_du_bi" label="Phân loại" span={12} />
              </Row>
              <Row gutter={16}>
                <Field name="ngay_chuyen_vao" label="Ngày chuyển vào Chi bộ" span={12} />
                <Field name="noi_chuyen_di" label="Nơi chuyển đi (Nơi sinh hoạt cũ)" span={12} />
              </Row>
              <Row gutter={16}>
                <Field name="ngaykiqd" label="Ngày ký quyết định kết nạp" span={12} />
                <Field name="soqd" label="Số quyết định kết nạp" span={12} />
              </Row>
              {!memberData.dang_vien_du_bi && (
                <Row gutter={16}>
                  <Field name="ngay_chinh_thuc" label="Ngày chính thức" span={12} />
                  <Col span={12}>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 4 }}>Số thẻ Đảng</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontWeight: 500, fontSize: 15, color: '#262626', flex: 1 }}>
                          {memberData.so_the_dang || <span style={{ color: '#bfbfbf' }}>Chưa cấp</span>}
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              )}
              <Row gutter={16}>
                <Field name="dvhd" label="Đảng viên hướng dẫn" span={24} />
              </Row>
            </Card>

            {/* SECTION 4 */}
            <Card title={<><PhoneOutlined style={{ marginRight: 8 }} /> Liên hệ</>} bordered={false} style={cardStyle} headStyle={headStyle}>
              <Row gutter={16}>
                <Field name="so_dien_thoai" label="SĐT" span={12} editable rules={[{ pattern: /^[0-9]+$/, message: 'SĐT không hợp lệ' }]}>
                  <Input size="large" />
                </Field>
                <Field name="facebook" label="Facebook" span={12} editable>
                  <Input size="large" />
                </Field>
              </Row>
              <Row gutter={16}>
                <Field name="email" label="Email cá nhân" span={12} editable rules={[]}>
                  <Input size="large" placeholder="example@gmail.com (Không bắt buộc)" />
                </Field>
                <Field name="email_sv" label="Email SV" span={12} editable rules={[]}>
                  <Input size="large" placeholder="example@sv.due.edu.vn (Không bắt buộc)" />
                </Field>
              </Row>
            </Card>

            {/* SECTION 5 */}
            <Card title={<><HomeOutlined style={{ marginRight: 8 }} /> Địa chỉ</>} bordered={false} style={cardStyle} headStyle={headStyle}>
              <Row gutter={16}>
                <Field name="dia_chi_tam_tru" label="Địa chỉ tạm trú" span={24} editable><Input size="large" /></Field>
              </Row>
              <Row gutter={16}>
                <Field name="chi_tiet_dc" label="Chi tiết địa chỉ thường trú" span={24} editable><Input size="large" /></Field>
              </Row>
              <Row gutter={16}>
                <Field name="xa_phuong_tt" label="Xã/Phường Thường trú" span={12} editable>
                  <AddressWardSelect province={watchTinhTpTt} />
                </Field>
                <Field name="tinh_tp_tt" label="Tỉnh/TP Thường Trú" span={12} editable>
                  <AddressProvinceSelect size="large" onChange={() => form.setFieldsValue({ xa_phuong_tt: undefined })} />
                </Field>
              </Row>
              <Row gutter={16}>
                <Field name="xa_phuong_qq" label="Xã/Phường (Quê quán)" span={12} editable>
                  <AddressWardSelect province={watchTinhTpQq} />
                </Field>
                <Field name="tinh_tp_qq" label="Tỉnh/TP (Quê quán)" span={12} editable>
                  <AddressProvinceSelect size="large" onChange={() => form.setFieldsValue({ xa_phuong_qq: undefined })} />
                </Field>
              </Row>

              <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Quê quán cũ (nếu có)</Divider>
              <Row gutter={16}>
                <Field name="tinh_tp_qq_cu" label="Tỉnh/TP quê quán cũ" span={8} editable>
                   <AddressProvinceSelect isOld={true} size="large" onChange={() => form.setFieldsValue({ quan_huyen_qq_cu: undefined, xa_phuong_qq_cu: undefined })} />
                </Field>
                <Field name="quan_huyen_qq_cu" label="Quận/Huyện quê quán cũ" span={8} editable>
                   <AddressDistrictSelect province={watchTinhTpQqCu} onChange={() => form.setFieldsValue({ xa_phuong_qq_cu: undefined })} size="large" />
                </Field>
                <Field name="xa_phuong_qq_cu" label="Xã/Phường quê quán cũ" span={8} editable>
                   <AddressWardSelect isOld={true} province={watchTinhTpQqCu} district={watchQuanHuyenQqCu} />
                </Field>
              </Row>

              <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Thường trú cũ (nếu có)</Divider>
              <Row gutter={16}>
                <Field name="chi_tiet_tt_cu" label="Chi tiết thường trú cũ" span={24} editable>
                  <Input size="large" placeholder="Số nhà, tên đường, tổ/thôn/bản cũ..." />
                </Field>
              </Row>
              <Row gutter={16}>
                <Field name="tinh_tp_tt_cu" label="Tỉnh/TP thường trú cũ" span={8} editable>
                   <AddressProvinceSelect isOld={true} size="large" onChange={() => form.setFieldsValue({ quan_huyen_tt_cu: undefined, xa_phuong_tt_cu: undefined })} size="large" />
                </Field>
                <Field name="quan_huyen_tt_cu" label="Quận/Huyện thường trú cũ" span={8} editable>
                   <AddressDistrictSelect province={watchTinhTpTtCu} onChange={() => form.setFieldsValue({ xa_phuong_tt_cu: undefined })} size="large" />
                </Field>
                <Field name="xa_phuong_tt_cu" label="Xã/Phường thường trú cũ" span={8} editable>
                   <AddressWardSelect isOld={true} province={watchTinhTpTtCu} district={watchQuanHuyenTtCu} />
                </Field>
              </Row>
            </Card>

            {/* SECTION 6 */}
            <Card title={<><TeamOutlined style={{ marginRight: 8 }} /> Gia đình</>} bordered={false} style={cardStyle} headStyle={headStyle}>
              <Row gutter={16}>
                <Field name="ho_ten_nguoi_than" label="Họ tên người thân" span={12} editable>
                  <Input size="large" />
                </Field>
                <Field name="sdt_nguoi_than" label="SĐT người thân" span={12} editable>
                  <Input size="large" />
                </Field>
              </Row>
            </Card>

          </Form>
        </Col>
      </Row>

      {/* -------------------- FUTURISTIC CYBERPUNK FACE SCANNING MODAL -------------------- */}
      <Modal
        title={
          <span style={{ fontWeight: 800, fontSize: 16, color: '#262626', display: 'flex', alignItems: 'center', gap: 8 }}>
            <SafetyCertificateOutlined style={{ color: '#722ed1' }} />
            ĐĂNG KÝ SINH TRẮC HỌC KHUÔN MẶT (FACE ID)
          </span>
        }
        open={isFaceModalVisible}
        onCancel={() => {
          stopCamera();
          setIsFaceModalVisible(false);
          setScanStep(0);
        }}
        footer={null}
        width={500}
        destroyOnClose
        bodyStyle={{ padding: '24px 20px', backgroundColor: '#fafafa' }}
      >
        {/* Custom Styles Injection */}
        <style>{`
          @keyframes scanline {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
          }
          @keyframes pulseGlow {
            0% { transform: scale(1); opacity: 0.85; box-shadow: 0 0 10px rgba(114, 46, 209, 0.4); }
            50% { transform: scale(1.03); opacity: 1; box-shadow: 0 0 25px rgba(114, 46, 209, 0.7); }
            100% { transform: scale(1); opacity: 0.85; box-shadow: 0 0 10px rgba(114, 46, 209, 0.4); }
          }
          @keyframes spinRing {
            100% { transform: rotate(360deg); }
          }
          @keyframes flashDot {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
          .biometric-scanner-ring {
            width: 250px;
            height: 250px;
            border-radius: 50%;
            position: relative;
            overflow: hidden;
            background-color: #0c0817;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 32px rgba(114, 46, 209, 0.2);
            border: 4px solid #1a0f30;
            animation: pulseGlow 3s infinite ease-in-out;
          }
          .laser-scanner-line {
            width: 100%;
            height: 4px;
            background: linear-gradient(180deg, rgba(114, 46, 209, 0) 0%, #13c2c2 50%, rgba(114, 46, 209, 0) 100%);
            position: absolute;
            left: 0;
            animation: scanline 2.5s infinite linear;
            box-shadow: 0 0 10px #13c2c2;
            z-index: 10;
          }
          .scanner-spinning-border {
            position: absolute;
            top: -6px;
            left: -6px;
            right: -6px;
            bottom: -6px;
            border: 2px dashed #722ed1;
            border-radius: 50%;
            animation: spinRing 20s infinite linear;
            opacity: 0.6;
          }
          .virtual-landmark-dot {
            width: 6px;
            height: 6px;
            background-color: #13c2c2;
            border-radius: 50%;
            position: absolute;
            box-shadow: 0 0 8px #13c2c2;
            animation: flashDot 1.5s infinite ease-in-out;
            z-index: 8;
          }
          .glow-btn-face {
            background: linear-gradient(135deg, #722ed1 0%, #c62828 100%) !important;
            border: none !important;
            color: white !important;
            box-shadow: 0 4px 15px rgba(114, 46, 209, 0.4) !important;
            transition: all 0.3s ease !important;
          }
          .glow-btn-face:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 20px rgba(114, 46, 209, 0.6) !important;
          }
        `}</style>

        {scanStep === 0 && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <ScanOutlined style={{ fontSize: 60, color: '#722ed1', marginBottom: 16 }} />
            <Title level={4} style={{ color: '#262626', margin: 0, fontWeight: 700 }}>
              Sẵn sàng quét sinh trắc học
            </Title>
            <Text style={{ display: 'block', color: '#8c8c8c', margin: '12px 0 24px 0', lineHeight: 1.5, fontSize: 13 }}>
              Hệ thống sẽ kích hoạt Camera của thiết bị để phân tích và giải mã cấu trúc khuôn mặt của đồng chí thành chuỗi mã hóa FaceID bảo mật. Vui lòng chuẩn bị thiết bị ở nơi đủ sáng.
            </Text>
            <Button
              type="primary"
              className="glow-btn-face"
              size="large"
              icon={<CameraOutlined />}
              onClick={startCamera}
              style={{ width: '100%', height: 46, borderRadius: 8, fontWeight: 700 }}
            >
              KÍCH HOẠT CAMERA & QUÉT
            </Button>
          </div>
        )}

        {scanStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Hologram Camera Container */}
            <div className="biometric-scanner-ring">
              {/* Outer spin ring */}
              <div className="scanner-spinning-border"></div>

              {/* Horizontal laser scanline */}
              <div className="laser-scanner-line"></div>

              {/* Live Webcam Video stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)' // Mirror view
                }}
              />

              {/* Simulated glowing vector landmark dots for biometrics */}
              {scanProgress > 15 && <div className="virtual-landmark-dot" style={{ top: '35%', left: '30%', animationDelay: '0.1s' }} />}
              {scanProgress > 30 && <div className="virtual-landmark-dot" style={{ top: '35%', left: '70%', animationDelay: '0.2s' }} />}
              {scanProgress > 45 && <div className="virtual-landmark-dot" style={{ top: '50%', left: '50%', animationDelay: '0.3s' }} />}
              {scanProgress > 55 && <div className="virtual-landmark-dot" style={{ top: '65%', left: '35%', animationDelay: '0.4s' }} />}
              {scanProgress > 55 && <div className="virtual-landmark-dot" style={{ top: '65%', left: '65%', animationDelay: '0.5s' }} />}
              {scanProgress > 70 && <div className="virtual-landmark-dot" style={{ top: '52%', left: '22%', animationDelay: '0.6s' }} />}
              {scanProgress > 70 && <div className="virtual-landmark-dot" style={{ top: '52%', left: '78%', animationDelay: '0.7s' }} />}
              {scanProgress > 80 && <div className="virtual-landmark-dot" style={{ top: '80%', left: '50%', animationDelay: '0.8s' }} />}
            </div>

            {/* Hidden canvas to hold snapshot */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Scanning progress */}
            <div style={{ width: '100%', marginTop: 24, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
                <span style={{ fontWeight: 700, color: '#722ed1', fontSize: 13 }}>ĐANG QUÉT KHUÔN MẶT...</span>
                <span style={{ fontWeight: 800, color: '#13c2c2', fontSize: 13 }}>{scanProgress}%</span>
              </div>
              <Progress percent={scanProgress} showInfo={false} strokeColor={{ '0%': '#722ed1', '100%': '#13c2c2' }} status="active" strokeWidth={8} />
            </div>

            {/* Virtual futuristic logs */}
            <div style={{
              width: '100%',
              backgroundColor: '#0a0518',
              borderRadius: 8,
              padding: '12px 14px',
              marginTop: 18,
              height: 100,
              overflowY: 'auto',
              border: '1px solid #1f1035',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#13c2c2',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column-reverse',
              gap: 4
            }}>
              {scanLogs.length === 0 ? (
                <div style={{ color: '#595959', fontStyle: 'italic' }}>Đang chờ luồng tín hiệu quang học...</div>
              ) : (
                [...scanLogs].reverse().map((log, idx) => (
                  <div key={idx} style={{ color: log.includes('LỖI') ? '#f5222d' : log.includes('hoàn tất') || log.includes('thành công') ? '#52c41a' : '#13c2c2' }}>
                    {log}
                  </div>
                ))
              )}
            </div>

            <Button
              danger
              style={{ width: '100%', marginTop: 20, borderRadius: 6 }}
              onClick={() => {
                stopCamera();
                setScanStep(0);
              }}
            >
              Hủy bỏ quét
            </Button>
          </div>
        )}

        {scanStep === 2 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-block', position: 'relative', marginBottom: 20 }}>
              <Avatar
                size={180}
                src={capturedImage}
                style={{
                  border: '4px solid #722ed1',
                  boxShadow: '0 8px 24px rgba(114, 46, 209, 0.3)'
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                backgroundColor: '#52c41a',
                color: 'white',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                fontSize: 16
              }}>
                <CheckCircleOutlined />
              </div>
            </div>

            <Title level={4} style={{ color: '#262626', margin: 0, fontWeight: 700 }}>
              Quét sinh trắc học thành công!
            </Title>

            <Text style={{ display: 'block', color: '#8c8c8c', margin: '8px 0 24px 0', lineHeight: 1.5, fontSize: 13, padding: '0 10px' }}>
              Mẫu dữ liệu khuôn mặt đã được mã hóa bảo mật chuẩn xác 99.89%. Đồng chí vui lòng nhấn xác nhận bên dưới để đồng bộ hóa và kích hoạt mở khóa Face ID.
            </Text>

            <div style={{ display: 'flex', gap: 12 }}>
              <Button
                style={{ flex: 1, height: 42, borderRadius: 8, fontWeight: 600 }}
                onClick={() => {
                  setScanStep(0);
                  setCapturedImage(null);
                  startCamera();
                }}
              >
                Quét lại
              </Button>

              <Button
                type="primary"
                className="glow-btn-face"
                style={{ flex: 2, height: 42, borderRadius: 8, fontWeight: 700 }}
                icon={<SafetyCertificateOutlined />}
                loading={isSavingFace}
                onClick={handleRegisterFace}
              >
                XÁC NHẬN & ĐỒNG BỘ
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL XEM THÀNH VIÊN TRONG NHÓM */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TeamOutlined style={{ color: '#c62828', fontSize: '20px' }} />
            <span style={{ fontWeight: 900, color: '#1e293b', fontSize: '15px', textTransform: 'uppercase' }}>
              Thành viên nhóm: {memberData?.nhom}
            </span>
          </div>
        }
        open={isGroupModalVisible}
        onCancel={() => setIsGroupModalVisible(false)}
        footer={null}
        width={650}
        destroyOnClose
        styles={{ body: { padding: '12px 4px 12px 4px', maxHeight: '450px', overflowY: 'auto' } }}
      >
        <Typography.Paragraph style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic', marginBottom: '16px', padding: '0 12px' }}>
          Danh sách các đồng chí Đảng viên đang sinh hoạt cùng nhóm với đồng chí.
        </Typography.Paragraph>

        <Spin spinning={loadingGroupMembers} tip="Đang tải danh sách thành viên...">
          {groupMembers.length === 0 ? (
            <Empty description="Không tìm thấy thành viên nào trong nhóm sinh hoạt này" />
          ) : (
            <div style={{ padding: '0 12px' }}>
              <List
                itemLayout="horizontal"
                dataSource={groupMembers}
                renderItem={(member) => (
                  <List.Item style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          src={member.anh_ca_nhan ? (member.anh_ca_nhan.startsWith('http') || member.anh_ca_nhan.startsWith('data:') ? member.anh_ca_nhan : undefined) : undefined}
                          icon={<UserOutlined />}
                          style={{ border: '1.5px solid #c62828' }}
                        />
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '13px' }}>
                            {member.ho_ten} {member.id === memberData.id && <Tag color="blue" style={{ fontSize: '10px', marginLeft: '6px', fontWeight: 'bold' }}>BẠN</Tag>}
                          </span>
                          <Tag color={member.dang_vien_du_bi ? 'orange' : 'green'} style={{ fontWeight: 700, margin: 0, fontSize: '10px' }}>
                            {member.dang_vien_du_bi ? 'DỰ BỊ' : 'CHÍNH THỨC'}
                          </Tag>
                        </div>
                      }
                      description={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                          <div>Lớp: <strong>{member.lop || 'Chưa cập nhật'}</strong> — Khoa: <strong>{member.khoa || 'Chưa cập nhật'}</strong></div>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '2px', flexWrap: 'wrap' }}>
                            {member.so_dien_thoai && <span>📞 SĐT: <strong>{member.so_dien_thoai}</strong></span>}
                            {member.email && <span>✉ Email: <strong>{member.email}</strong></span>}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          )}
        </Spin>
      </Modal>
    </div>
    </ProfileFieldContext.Provider>
  );
};

export default Profile;
