import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Card, Row, Col, Typography, Button, Input, Table, Tag, Space, 
  Select, DatePicker, TimePicker, Modal, Form, Badge, Progress, message, Popconfirm, Avatar, Result, Tabs, Tooltip
} from 'antd';
import { 
  ScanOutlined, SafetyCertificateOutlined, UserOutlined, CameraOutlined,
  PlayCircleOutlined, LockOutlined, PlusOutlined, DownloadOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  UploadOutlined,
  FullscreenOutlined,
  CheckCircleOutlined,
  QrcodeOutlined
} from '@ant-design/icons';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../services/permissionService';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const safeDayjs = (val) => {
  if (!val) return dayjs(null);
  if (val.toDate && typeof val.toDate === 'function') return dayjs(val.toDate());
  if (val.seconds) return dayjs(val.seconds * 1000);
  return dayjs(val);
};

const Attendance = () => {
  const { currentUser } = useAuth();
  
  // Roles check
  const isBiThu = currentUser?.role === ROLES.BITHU || currentUser?.role === ROLES.ADMIN;
  const isCapUy = currentUser?.role === ROLES.CAPUY || currentUser?.role === ROLES.PHOBIHU || isBiThu;
  const isKiemTra = currentUser?.role === ROLES.KIEMTRA || isCapUy;

  const isAdminOrChiUy = useMemo(() => {
    const role = currentUser?.role;
    return [
      ROLES.ADMIN,
      ROLES.BITHU,
      ROLES.PHOBIHU,
      ROLES.CAPUY,
      ROLES.KIEMTRA,
      ROLES.OFFICIAL_MANAGER,
      ROLES.ADMISSION_MANAGER
    ].includes(role);
  }, [currentUser]);

  // DB States
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [dangVienList, setDangVienList] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  // Regular Member Personal States & Absence Request list
  const [personalProfile, setPersonalProfile] = useState(null);
  const [personalAttendances, setPersonalAttendances] = useState([]);
  const [personalAbsences, setPersonalAbsences] = useState([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [absenceRequests, setAbsenceRequests] = useState([]);

  // useRef Sync State for Duplicate Prevention
  const attendancesRef = useRef([]);
  useEffect(() => {
    attendancesRef.current = attendances;
  }, [attendances]);

  // Matrix and Importer States
  const [matrixMonth, setMatrixMonth] = useState('ALL');
  const [matrixAttendances, setMatrixAttendances] = useState([]);
  const [matrixAbsences, setMatrixAbsences] = useState([]);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  // Monthly Aggregate Importer States
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importCols, setImportCols] = useState([]);
  const [importMeetingsDetected, setImportMeetingsDetected] = useState([]);

  // Modal States
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();

  // Scanner States
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeRef = useRef(null);
  const [lastCheckedInMember, setLastCheckedInMember] = useState(null);

  // Camera States
  const [cameraActive, setCameraActive] = useState(false);
  const [scanStream, setScanStream] = useState(null);
  const [faceLockState, setFaceLockState] = useState('IDLE'); // 'IDLE' | 'SCANNING' | 'MATCHED' | 'ERROR'
  const [matchedFace, setMatchedFace] = useState(null);
  const [matchConfidence, setMatchConfidence] = useState(0);

  const videoRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const faceMatcherRef = useRef(null);
  const streamRef = useRef(null);
  const processingRef = useRef(new Set());
  const [logs, setLogs] = useState([]);

  // Self check-in and projection modal states
  const [isProjectionModalVisible, setIsProjectionModalVisible] = useState(false);
  const [selfCheckInCode, setSelfCheckInCode] = useState('');
  const [selfChecking, setSelfChecking] = useState(false);

  // Device Camera QR Scanner states & refs
  const qrVideoRef = useRef(null);
  const qrCanvasRef = useRef(null);
  const qrStreamRef = useRef(null);
  const qrIntervalRef = useRef(null);
  const [isQrScannerVisible, setIsQrScannerVisible] = useState(false);
  const [qrScannerLoading, setQrScannerLoading] = useState(false);
  const [qrCameraError, setQrCameraError] = useState('');
  const [countdownSeconds, setCountdownSeconds] = useState(180);

  // Audio synthesis chime using Web Audio API
  const playBeep = (type = 'success') => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        // High double beep
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc1.connect(gain);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.1);
        
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
          osc2.connect(gain);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.15);
        }, 120);
      } else if (type === 'warning') {
        // Double warning beep
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(293.66, ctx.currentTime); // D4
        osc.connect(gain);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
        
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(293.66, ctx.currentTime);
          osc2.connect(gain);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.15);
        }, 180);
      } else {
        // Low error buzz
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130.81, ctx.currentTime); // C3
        osc.connect(gain);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch (e) {
      console.warn("Chime failed to synthesize:", e);
    }
  };

  // Add system console log in radar screen
  const addLog = (text) => {
    setLogs(prev => [
      `[${dayjs().format('HH:mm:ss')}] ${text}`,
      ...prev.slice(0, 14)
    ]);
  };

  const getCleanName = (fullName) => {
    if (!fullName) return '';
    let name = fullName.replace(/^(Đ\/c\s+|TS\.\s+)/, '');
    name = name.replace(/\s*\(.*\)$/, '');
    return name.trim();
  };

  const fetchMatrixData = async () => {
    setLoadingMatrix(true);
    try {
      // Fetch ALL attendances
      const snap1 = await getDocs(collection(db, "attendances"));
      setMatrixAttendances(snap1.docs.map(doc => doc.data()));

      // Fetch ALL approved absences
      const snap2 = await getDocs(collection(db, "vang_hop"));
      setMatrixAbsences(snap2.docs.map(doc => doc.data()));
    } catch (e) {
      console.error("Lỗi khi tải dữ liệu bảng tổng hợp:", e);
    } finally {
      setLoadingMatrix(false);
    }
  };

  const handleImportExcelFile = (file) => {
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error("Kích thước tệp bảng tổng hợp phải nhỏ hơn 5MB.");
      return Upload.LIST_IGNORE;
    }

    setImportLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rawJson.length < 2) {
          message.error("File Excel trống hoặc không đúng định dạng.");
          setImportLoading(false);
          return;
        }

        const headers = rawJson[0];
        const meetingCols = [];
        const detectedMt = [];

        headers.forEach((h, idx) => {
          if (!h) return;
          const hStr = h.toString().trim().toLowerCase();
          const isStandardCol = ["stt", "mssv", "họ tên", "họ và tên", "lớp", "tổng số", "có mặt", "đi muộn", "vắng có phép", "vắng không phép", "tổng vắng", "chuyên cần", "phân nhóm"].some(kw => hStr.includes(kw));
          
          if (!isStandardCol) {
            meetingCols.push({ header: h.toString().trim(), index: idx });
            detectedMt.push(h.toString().trim());
          }
        });

        if (meetingCols.length === 0) {
          message.error("Không phát hiện cột cuộc họp nào trong bảng biểu.");
          setImportLoading(false);
          return;
        }

        const parsedMembers = [];
        for (let i = 1; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (row.length === 0) continue;

          let mssvIdx = headers.findIndex(h => h && h.toString().trim().toLowerCase().includes("mssv"));
          if (mssvIdx === -1) mssvIdx = 1;

          let hoTenIdx = headers.findIndex(h => h && h.toString().trim().toLowerCase().includes("họ tên") || h && h.toString().trim().toLowerCase().includes("họ và tên"));
          if (hoTenIdx === -1) hoTenIdx = 2;

          const mssv = row[mssvIdx] ? row[mssvIdx].toString().trim() : '';
          const hoTen = row[hoTenIdx] ? row[hoTenIdx].toString().trim() : '';

          if (!mssv) continue;

          const memberRecords = {};
          meetingCols.forEach(mc => {
            const val = row[mc.index] ? row[mc.index].toString().trim().toLowerCase() : '';
            let status = 'ABSENT';
            if (val.includes("có mặt") || val.includes("co mat") || val === "●" || val.includes("x")) {
              status = 'PRESENT';
            } else if (val.includes("đi muộn") || val.includes("di muon") || val === "▲") {
              status = 'LATE';
            } else if (val.includes("có phép") || val.includes("co phep") || val === "○") {
              status = 'EXCUSED';
            } else if (val.includes("không phép") || val.includes("khong phep") || val === "❌") {
              status = 'UNEXCUSED';
            }
            memberRecords[mc.header] = status;
          });

          const dvMatch = dangVienList.find(d => d.mssv === mssv);

          parsedMembers.push({
            mssv,
            ho_ten: hoTen || (dvMatch ? dvMatch.ho_ten : "Chưa đăng ký"),
            lop: dvMatch ? dvMatch.lop || 'N/A' : 'N/A',
            isValid: !!dvMatch,
            records: memberRecords
          });
        }

        setImportRows(parsedMembers);
        setImportCols(meetingCols);
        setImportMeetingsDetected(detectedMt);
        message.success(`Đã phân tích thành công: ${parsedMembers.length} dòng và phát hiện ${detectedMt.length} cuộc họp.`);
      } catch (err) {
        console.error(err);
        message.error("Lỗi khi đọc file Excel tổng hợp.");
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsBinaryString(file);
    return false;
  };

  const handleSaveImportMatrix = async () => {
    if (importRows.length === 0) return;
    setImportLoading(true);

    try {
      addLog("Bắt đầu ghi dữ liệu đồng bộ tổng hợp...");
      const mappedMeetings = {};
      
      for (const mc of importCols) {
        const headerName = mc.header;
        let matched = meetings.find(m => m.title === headerName || safeDayjs(m.date).format('DD/MM/YYYY') === headerName || (m.date && typeof m.date === 'string' && m.date.includes(headerName)));
        
        if (!matched) {
          addLog(`Chưa có lịch họp "${headerName}". Tự động tạo mới...`);
          let parsedDate = dayjs();
          const cleanHeader = headerName.replace(/\s+/g, '');
          const dmyMatch = cleanHeader.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (dmyMatch) {
            parsedDate = dayjs(`${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`);
          }
          
          const formattedDate = parsedDate.format('YYYY-MM-DD');
          const formattedTime = '19:00';
          const newMeeting = {
            title: `Sinh hoạt Chi bộ (${headerName})`,
            date: `${formattedDate} ${formattedTime}`,
            location: 'Phòng họp Chi bộ - DUE',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            created_by: currentUser?.name || 'Admin'
          };
          
          const docRef = await addDoc(collection(db, "lich_hop"), newMeeting);
          matched = { id: docRef.id, ...newMeeting, date: formattedDate, time: formattedTime };
          setMeetings(prev => [matched, ...prev]);
          addLog(`Đã tạo buổi họp mới: ${matched.title}`);
        }
        mappedMeetings[headerName] = matched;
      }

      let totalCreatedAttendances = 0;
      let totalCreatedAbsences = 0;

      for (const row of importRows) {
        if (!row.isValid) continue;

        const dv = dangVienList.find(d => d.mssv === row.mssv);
        if (!dv) continue;

        for (const mc of importCols) {
          const headerName = mc.header;
          const status = row.records[headerName];
          const mt = mappedMeetings[headerName];
          if (!mt) continue;

          if (status === 'PRESENT' || status === 'LATE') {
            const alreadyChecked = attendancesRef.current.some(a => a.meetingId === mt.id && a.mssv === dv.mssv);
            if (!alreadyChecked) {
              const newAttendance = {
                meetingId: mt.id,
                userId: dv.id,
                ho_ten: dv.ho_ten,
                mssv: dv.mssv,
                lop: dv.lop || 'N/A',
                checkInTime: `${mt.date}T${mt.time}:00.000Z`,
                method: 'MANUAL',
                status: status,
                deviceInfo: 'Imported from aggregate Excel',
                ip: '192.168.1.1'
              };
              await addDoc(collection(db, "attendances"), newAttendance);
              totalCreatedAttendances++;
            }
          } else if (status === 'EXCUSED') {
            const q = query(
              collection(db, "vang_hop"), 
              where("cuoc_hop_id", "==", mt.id), 
              where("mssv", "==", dv.mssv)
            );
            const snap = await getDocs(q);
            if (snap.empty) {
              const newAbsence = {
                dang_vien_id: dv.id,
                mssv: dv.mssv,
                ho_ten: dv.ho_ten,
                cccd: dv.cccd || '',
                lop: dv.lop || '',
                nhom: dv.nhom || '',
                khoa: dv.khoa || '',
                cuoc_hop_id: mt.id,
                cuoc_hop_title: mt.title,
                ly_do: 'Vắng có lý do (Nhập tự động từ bảng tổng hợp)',
                minh_chung: '',
                trang_thai: 'approved',
                created_at: new Date().toISOString()
              };
              await addDoc(collection(db, "vang_hop"), newAbsence);
              totalCreatedAbsences++;
            }
          }
        }
      }

      message.success(`Đồng bộ dữ liệu thành công! Đã tạo ${totalCreatedAttendances} lượt điểm danh và ${totalCreatedAbsences} đơn vắng họp.`);
      addLog(`HOÀN TẤT NHẬP TỔNG HỢP: +${totalCreatedAttendances} điểm danh, +${totalCreatedAbsences} xin vắng.`);
      
      setIsImportModalVisible(false);
      setImportRows([]);
      setImportCols([]);
      setImportMeetingsDetected([]);
      fetchMatrixData();
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi lưu dữ liệu nhập tổng hợp: " + e.message);
    } finally {
      setImportLoading(false);
    }
  };

  const fetchAbsenceRequests = async (meetingId) => {
    try {
      const q = query(collection(db, "vang_hop"), where("cuoc_hop_id", "==", meetingId));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAbsenceRequests(list);
    } catch (e) {
      console.error("Lỗi khi tải đơn xin vắng:", e);
    }
  };

  // Real-time synchronization of check-in records for selected meeting
  useEffect(() => {
    if (!selectedMeeting?.id) return;
    
    setLoading(true);
    const q = query(collection(db, "attendances"), where("meetingId", "==", selectedMeeting.id));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.checkInTime) - new Date(a.checkInTime));
      setAttendances(list);
      setLoading(false);
    }, (error) => {
      console.error("Lỗi real-time attendances:", error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [selectedMeeting?.id]);

  // 1. Initial Load: Fetch Meetings & DangVien list
  const loadInitialData = async () => {
    setLoadingMeetings(true);
    try {
      // Fetch Dang Vien
      const dvSnapshot = await getDocs(collection(db, "dang_vien"));
      const dvList = dvSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => !d.trang_thai || d.trang_thai === 'dang_sinh_hoat');
      setDangVienList(dvList);

      // Fetch Meetings from lich_hop
      const mtSnapshot = await getDocs(collection(db, "lich_hop"));
      const mtList = mtSnapshot.docs
        .map(d => {
          const data = d.data();
          let parsedDate = data.date;
          let formattedDateOnly = '';
          let formattedTimeOnly = '';
          
          if (parsedDate) {
            const tempDayjs = safeDayjs(parsedDate);
            if (tempDayjs.isValid()) {
              formattedDateOnly = tempDayjs.format('YYYY-MM-DD');
              formattedTimeOnly = tempDayjs.format('HH:mm');
            }
          }
          
          return {
            id: d.id,
            ...data,
            date: formattedDateOnly || data.date || '',
            time: formattedTimeOnly || data.time || '19:00',
            status: data.status || 'ACTIVE'
          };
        })
        .sort((a, b) => dayjs(`${b.date} ${b.time}`).diff(dayjs(`${a.date} ${a.time}`)));
      
      setMeetings(mtList);
      
      if (mtList.length > 0) {
        // Default select the latest meeting
        const latest = mtList[0];
        setSelectedMeeting(latest);
        if (isAdminOrChiUy) {
          fetchAbsenceRequests(latest.id);
          ensureMeetingSessionCode(latest);
        }
      }

      // Fetch personal records for the logged-in user
      if (currentUser) {
        setLoadingPersonal(true);
        let profileDoc = null;
        let profileMssv = currentUser.mssv || '';
        let profileName = getCleanName(currentUser.name || '');

        if (profileMssv) {
          const q = query(collection(db, "dang_vien"), where("mssv", "==", profileMssv));
          const snap = await getDocs(q);
          if (!snap.empty) profileDoc = { id: snap.docs[0].id, ...snap.docs[0].data() };
        } else if (profileName) {
          const q = query(collection(db, "dang_vien"), where("ho_ten", "==", profileName));
          const snap = await getDocs(q);
          if (!snap.empty) profileDoc = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }

        if (profileDoc) {
          setPersonalProfile(profileDoc);
          const mssv = profileDoc.mssv;
          
          // Fetch personal check-ins
          const q1 = query(collection(db, "attendances"), where("mssv", "==", mssv));
          const snap1 = await getDocs(q1);
          setPersonalAttendances(snap1.docs.map(doc => ({ id: doc.id, ...doc.data() })));

          // Fetch personal approved absence requests
          const q2 = query(collection(db, "vang_hop"), where("mssv", "==", mssv), where("trang_thai", "==", "approved"));
          const snap2 = await getDocs(q2);
          setPersonalAbsences(snap2.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        setLoadingPersonal(false);
      }
    } catch (error) {
      console.error(error);
      message.error("Lỗi khi tải dữ liệu khởi tạo");
    } finally {
      setLoadingMeetings(false);
    }
  };

  const ensureMeetingSessionCode = useCallback(async (meeting, forceRegenerate = false, silent = false) => {
    if (!meeting) return null;
    if (meeting.sessionCode && !forceRegenerate) return meeting.sessionCode;

    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    const nowStr = new Date().toISOString();
    try {
      await updateDoc(doc(db, "lich_hop", meeting.id), {
        sessionCode: generatedCode,
        sessionCodeCreatedAt: nowStr
      });
      const updated = { ...meeting, sessionCode: generatedCode, sessionCodeCreatedAt: nowStr };
      setMeetings(prev => prev.map(m => m.id === meeting.id ? updated : m));
      setSelectedMeeting(updated);
      if (forceRegenerate && !silent) {
        message.success("Đã làm mới mã số và QR điểm danh!");
      }
      return generatedCode;
    } catch (e) {
      console.error("Lỗi khi sinh mã điểm danh:", e);
      return null;
    }
  }, []);

  const handleSelfCheckIn = useCallback(async (codeToUse) => {
    const codeClean = (codeToUse || selfCheckInCode).trim();
    if (!codeClean) {
      message.warning("Vui lòng nhập mã điểm danh!");
      return;
    }
    
    if (selfChecking) return;
    setSelfChecking(true);
    
    try {
      // Find the active meeting
      const activeMeeting = meetings.find(m => m.status === 'ACTIVE');
      if (!activeMeeting) {
        message.error("Không có buổi sinh hoạt nào đang mở điểm danh (ACTIVE)!");
        setSelfChecking(false);
        return;
      }

      if (activeMeeting.selfCheckInOpen === false) {
        message.error("Ban chi ủy đã khóa cổng tự điểm danh (QR/Mã số) cho buổi sinh hoạt này!");
        setSelfChecking(false);
        return;
      }
      
      if (!activeMeeting.sessionCode) {
        message.error("Buổi sinh hoạt này chưa cấu hình mã điểm danh!");
        setSelfChecking(false);
        return;
      }
      
      if (activeMeeting.sessionCode !== codeClean) {
        message.error("Mã điểm danh không chính xác!");
        setSelfChecking(false);
        return;
      }

      // Check session code expiration (3 minutes)
      if (activeMeeting.sessionCodeCreatedAt) {
        const createdAt = dayjs(activeMeeting.sessionCodeCreatedAt);
        const diffMinutes = dayjs().diff(createdAt, 'minute');
        if (diffMinutes > 3) {
          message.error("Mã số điểm danh này đã hết hạn (chỉ có hiệu lực trong 3 phút)! Vui lòng quét mã mới hoặc nhập mã mới hiển thị trên màn hình máy chiếu.");
          setSelfChecking(false);
          return;
        }
      }
      
      // Resolve member profile
      let profile = personalProfile;
      if (!profile && currentUser) {
        let profileMssv = currentUser.mssv || '';
        let profileName = getCleanName(currentUser.name || '');
        if (profileMssv) {
          const q = query(collection(db, "dang_vien"), where("mssv", "==", profileMssv));
          const snap = await getDocs(q);
          if (!snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
        } else if (profileName) {
          const q = query(collection(db, "dang_vien"), where("ho_ten", "==", profileName));
          const snap = await getDocs(q);
          if (!snap.empty) profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }
      
      if (!profile) {
        message.error("Không tìm thấy thông tin Đảng viên của đồng chí trên hệ thống!");
        setSelfChecking(false);
        return;
      }
      
      const mssv = profile.mssv;
      
      // Check if already checked in
      const alreadyCheckedLocal = personalAttendances.some(a => a.meetingId === activeMeeting.id);
      if (alreadyCheckedLocal) {
        message.warning("Đồng chí đã điểm danh cho buổi sinh hoạt này rồi!");
        setSelfChecking(false);
        return;
      }
      
      const qCheck = query(
        collection(db, "attendances"),
        where("meetingId", "==", activeMeeting.id),
        where("mssv", "==", mssv)
      );
      const snapCheck = await getDocs(qCheck);
      if (!snapCheck.empty) {
        message.warning("Đồng chí đã điểm danh cho buổi sinh hoạt này rồi!");
        const existing = snapCheck.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPersonalAttendances(prev => {
          const updated = [...prev];
          existing.forEach(e => {
            if (!updated.some(x => x.id === e.id)) updated.push(e);
          });
          return updated;
        });
        setSelfChecking(false);
        return;
      }
      
      // Determine Present vs Late status
      const today = dayjs();
      const meetingStart = dayjs(`${activeMeeting.date} ${activeMeeting.time}`);
      const minutesDiff = today.diff(meetingStart, 'minute');
      
      let status = 'PRESENT';
      if (minutesDiff > 15) {
        status = 'LATE';
      }
      
      const deviceInfo = `Self-CheckIn (Browser: ${navigator.userAgent.split(') ')[1] || 'WebClient'} | OS: ${navigator.platform})`;
      const mockIp = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
      
      const newAttendance = {
        meetingId: activeMeeting.id,
        userId: profile.id,
        ho_ten: profile.ho_ten,
        mssv: profile.mssv,
        lop: profile.lop || 'N/A',
        checkInTime: new Date().toISOString(),
        method: 'SELF_CODE',
        status: status,
        deviceInfo: deviceInfo,
        ip: mockIp
      };
      
      const docRef = await addDoc(collection(db, "attendances"), newAttendance);
      const saved = { id: docRef.id, ...newAttendance };
      
      // Update local state
      setPersonalAttendances(prev => [saved, ...prev]);
      
      // Clear input
      setSelfCheckInCode('');
      
      if (status === 'LATE') {
        message.warning(`Đã tự điểm danh thành công! (Đi muộn ${minutesDiff} phút)`);
      } else {
        message.success("Tự điểm danh thành công!");
      }
      
    } catch (error) {
      console.error("Lỗi tự điểm danh:", error);
      message.error("Lỗi khi thực hiện tự điểm danh");
    } finally {
      setSelfChecking(false);
    }
  }, [meetings, personalProfile, personalAttendances, selfCheckInCode, selfChecking, currentUser]);

  // Handle QR code / URL auto check-in
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    
    if (codeParam) {
      // Clear URL parameter immediately
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      if (!currentUser) {
        localStorage.setItem('pending_checkin_code', codeParam);
        message.info("Vui lòng đăng nhập để hoàn tất điểm danh tự động.");
      } else if (!isAdminOrChiUy && meetings.length > 0) {
        message.info(`Đang tự động điểm danh với mã QR: ${codeParam}...`);
        handleSelfCheckIn(codeParam);
      }
    } else if (currentUser && !isAdminOrChiUy && meetings.length > 0) {
      const pendingCode = localStorage.getItem('pending_checkin_code');
      if (pendingCode) {
        localStorage.removeItem('pending_checkin_code');
        message.info(`Đang tự động điểm danh mã đã quét trước đó: ${pendingCode}...`);
        handleSelfCheckIn(pendingCode);
      }
    }
  }, [currentUser, isAdminOrChiUy, meetings, handleSelfCheckIn]);

  const handleSelfCheckInRef = useRef(handleSelfCheckIn);
  useEffect(() => {
    handleSelfCheckInRef.current = handleSelfCheckIn;
  }, [handleSelfCheckIn]);

  const loadJsQR = () => {
    return new Promise((resolve, reject) => {
      if (window.jsQR) {
        resolve(window.jsQR);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.async = true;
      script.onload = () => resolve(window.jsQR);
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  };

  const stopQrScanner = useCallback(() => {
    if (qrIntervalRef.current) {
      clearInterval(qrIntervalRef.current);
      qrIntervalRef.current = null;
    }
    
    if (qrStreamRef.current) {
      qrStreamRef.current.getTracks().forEach(track => track.stop());
      qrStreamRef.current = null;
    }
    
    if (qrVideoRef.current) {
      qrVideoRef.current.srcObject = null;
    }
    
    setIsQrScannerVisible(false);
  }, []);

  const scanFrame = useCallback(() => {
    if (!qrVideoRef.current || !qrCanvasRef.current || !window.jsQR) return;
    
    const video = qrVideoRef.current;
    const canvas = qrCanvasRef.current;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      
      if (code) {
        const scannedData = code.data;
        console.log("Tìm thấy mã QR:", scannedData);
        
        stopQrScanner();
        
        let resolvedCode = scannedData;
        if (scannedData.includes('code=')) {
          try {
            const url = new URL(scannedData);
            resolvedCode = url.searchParams.get('code') || scannedData;
          } catch (e) {
            const parts = scannedData.split('code=');
            if (parts.length > 1) {
              resolvedCode = parts[1].substring(0, 6);
            }
          }
        }
        
        handleSelfCheckInRef.current(resolvedCode);
      }
    }
  }, [stopQrScanner]);

  const startQrScanner = async () => {
    setIsQrScannerVisible(true);
    setQrScannerLoading(true);
    setQrCameraError('');
    
    try {
      await loadJsQR();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      qrStreamRef.current = stream;
      
      if (qrVideoRef.current) {
        qrVideoRef.current.srcObject = stream;
        qrVideoRef.current.setAttribute("playsinline", "true");
        qrVideoRef.current.play();
      }
      
      setQrScannerLoading(false);
      qrIntervalRef.current = setInterval(scanFrame, 250);
      
    } catch (err) {
      console.error("Lỗi khi mở camera quét QR:", err);
      setQrCameraError(err.message || "Không thể truy cập camera. Vui lòng kiểm tra quyền camera.");
      setQrScannerLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
      if (qrStreamRef.current) {
        qrStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    loadInitialData(); // eslint-disable-line react-hooks/set-state-in-effect
    addLog("Khởi tạo hệ thống điểm danh thành công.");
    addLog("Đang chờ thiết bị quét...");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh code & QR scanner timer for 3-minute validity
  useEffect(() => {
    if (!isProjectionModalVisible || !selectedMeeting || !selectedMeeting.sessionCodeCreatedAt) return;

    const getRemainingSeconds = () => {
      const createdAt = dayjs(selectedMeeting.sessionCodeCreatedAt);
      const expiresAt = createdAt.add(3, 'minute');
      const diffSecs = expiresAt.diff(dayjs(), 'second');
      return Math.max(0, diffSecs);
    };

    setCountdownSeconds(getRemainingSeconds());

    const interval = setInterval(() => {
      const remaining = getRemainingSeconds();
      if (remaining <= 0) {
        clearInterval(interval);
        ensureMeetingSessionCode(selectedMeeting, true, true);
      } else {
        setCountdownSeconds(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isProjectionModalVisible, selectedMeeting, ensureMeetingSessionCode]);

  // Persistent auto-focus on barcode scanner field
  useEffect(() => {
    if (selectedMeeting && selectedMeeting.status === 'ACTIVE' && barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, [selectedMeeting, barcodeInput]);

  const handleMeetingSelect = (val) => {
    const mt = meetings.find(m => m.id === val);
    setSelectedMeeting(mt);
    if (isAdminOrChiUy) {
      fetchAbsenceRequests(val);
      ensureMeetingSessionCode(mt);
    }
    setLastCheckedInMember(null);
    addLog(`Đã tải buổi sinh hoạt: ${mt.title}`);
  };

  // 2. Create Meeting (Inspection Team / Cấp ủy only)
  const handleCreateMeeting = async (values) => {
    try {
      const formattedDate = values.date.format('YYYY-MM-DD');
      const formattedTime = values.time.format('HH:mm');
      const meetingDateTime = `${formattedDate} ${formattedTime}`;
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

      const newMeeting = {
        title: values.title,
        date: meetingDateTime,
        location: values.location,
        status: 'ACTIVE',
        sessionCode: generatedCode,
        sessionCodeCreatedAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        created_by: currentUser?.name || 'Admin'
      };

      const docRef = await addDoc(collection(db, "lich_hop"), newMeeting);
      const created = { 
        id: docRef.id, 
        ...newMeeting,
        date: formattedDate,
        time: formattedTime
      };
      
      setMeetings([created, ...meetings]);
      setSelectedMeeting(created);
      setAttendances([]);
      setIsCreateModalVisible(false);
      createForm.resetFields();
      
      message.success("Đã tạo buổi họp sinh hoạt mới thành công!");
      addLog(`Tạo mới: ${values.title}`);
      
      // Auto focus scanner
      setTimeout(() => {
        if (barcodeRef.current) barcodeRef.current.focus();
      }, 500);
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi tạo buổi sinh hoạt");
    }
  };

  // Lock Meeting (Inspection / Cấp ủy only)
  const handleLockMeeting = async () => {
    if (!selectedMeeting) return;
    
    Modal.confirm({
      title: 'Khóa sổ điểm danh?',
      content: 'Sau khi khóa, toàn bộ thiết bị sẽ ngừng nhận quét vân tay, mã vạch và khuôn mặt của buổi sinh hoạt này.',
      okText: 'Khóa ngay',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await updateDoc(doc(db, "lich_hop", selectedMeeting.id), {
            status: 'LOCKED',
            updated_at: new Date().toISOString()
          });
          
          const updated = { ...selectedMeeting, status: 'LOCKED' };
          setSelectedMeeting(updated);
          setMeetings(meetings.map(m => m.id === selectedMeeting.id ? updated : m));
          
          // Stop camera if running
          stopCamera();
          
          message.success("Đã khóa sổ điểm danh buổi họp!");
          addLog("ĐÃ KHÓA SỔ ĐIỂM DANH.");
        } catch (e) {
          console.error(e);
          message.error("Lỗi khi khóa sổ họp");
        }
      }
    });
  };

  // Unlock Meeting (Bí thư/Cấp ủy only override)
  const handleUnlockMeeting = async () => {
    if (!selectedMeeting) return;
    try {
      await updateDoc(doc(db, "lich_hop", selectedMeeting.id), {
        status: 'ACTIVE',
        updated_at: new Date().toISOString()
      });
      
      const updated = { ...selectedMeeting, status: 'ACTIVE' };
      setSelectedMeeting(updated);
      setMeetings(meetings.map(m => m.id === selectedMeeting.id ? updated : m));
      
      message.success("Đã mở lại sổ điểm danh thành công!");
      addLog("ĐÃ MỞ LẠI SỔ ĐIỂM DANH.");
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi mở khóa sổ");
    }
  };

  const handleToggleSelfCheckIn = async () => {
    if (!selectedMeeting) return;
    const currentStatus = selectedMeeting.selfCheckInOpen !== false;
    const newStatus = !currentStatus;
    
    try {
      await updateDoc(doc(db, "lich_hop", selectedMeeting.id), {
        selfCheckInOpen: newStatus,
        updated_at: new Date().toISOString()
      });
      
      const updated = { ...selectedMeeting, selfCheckInOpen: newStatus };
      setSelectedMeeting(updated);
      setMeetings(meetings.map(m => m.id === selectedMeeting.id ? updated : m));
      
      if (newStatus) {
        message.success("Đã MỞ cổng tự điểm danh bằng QR và Mã số!");
      } else {
        message.warning("Đã KHÓA cổng tự điểm danh bằng QR và Mã số!");
      }
    } catch (e) {
      console.error("Lỗi khi chuyển trạng thái cổng QR/Mã số:", e);
      message.error("Lỗi khi thay đổi trạng thái cổng điểm danh");
    }
  };

  // Core Attendance Processing
  const executeAttendanceCheckIn = useCallback(async (mssv, method) => {
    if (processingRef.current.has(mssv)) return false;
    processingRef.current.add(mssv);

    try {
      // Find user
      const member = dangVienList.find(d => d.mssv === mssv);
      if (!member) {
        playBeep('error');
        message.error(`MSSV [${mssv}] không tồn tại trong hệ thống hoặc không phải Đảng viên!`);
        addLog(`LỖI QUÉT: MSSV ${mssv} không tìm thấy.`);
        return false;
      }

      // Check if already checked in
      const isRegistered = attendances.some(a => a.mssv === mssv);
      if (isRegistered) {
        playBeep('warning');
        message.warning(`Đ/c ${member.ho_ten} (${mssv}) đã điểm danh từ trước!`);
        addLog(`CẢNH BÁO: Đ/c ${member.ho_ten} quét trùng lặp.`);
        return false;
      }

      // Determine Present vs Late status
      const today = dayjs();
      const meetingStart = dayjs(`${selectedMeeting.date} ${selectedMeeting.time}`);
      const minutesDiff = today.diff(meetingStart, 'minute');
      
      let status = 'PRESENT';
      if (minutesDiff > 15) {
        status = 'LATE';
      }

      const deviceInfo = `Browser: ${navigator.userAgent.split(') ')[1] || 'WebClient'} | OS: ${navigator.platform}`;
      const mockIp = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;

      const newAttendance = {
        meetingId: selectedMeeting.id,
        userId: member.id,
        ho_ten: member.ho_ten,
        mssv: member.mssv,
        lop: member.lop || 'N/A',
        checkInTime: new Date().toISOString(),
        method: method,
        status: status,
        deviceInfo: deviceInfo,
        ip: mockIp
      };

      const docRef = await addDoc(collection(db, "attendances"), newAttendance);
      const saved = { id: docRef.id, ...newAttendance };
      
      setAttendances(prev => [saved, ...prev]);
      setLastCheckedInMember({ ...member, status, time: dayjs(newAttendance.checkInTime).format('HH:mm:ss') });
      playBeep('success');

      if (status === 'LATE') {
        message.warning(`Đã điểm danh Đ/c ${member.ho_ten} (Đi muộn ${minutesDiff} phút)`);
        addLog(`ĐIỂM DANH: Đ/c ${member.ho_ten} - ĐI MUỘN (${method})`);
      } else {
        message.success(`Đã điểm danh Đ/c ${member.ho_ten} thành công!`);
        addLog(`ĐIỂM DANH: Đ/c ${member.ho_ten} - CÓ MẶT (${method})`);
      }
      return true;
    } catch (e) {
      console.error(e);
      playBeep('error');
      message.error("Lỗi khi ghi nhận điểm danh");
      return false;
    } finally {
      processingRef.current.delete(mssv);
    }
  }, [selectedMeeting, dangVienList, attendances]);

  // 3. BARCODE HANDLING (Global Scanner Listener + Keyboard emulation scan)
  const barcodeBuffer = useRef("");
  const lastKeyTime = useRef(0);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return; // Ignore completely if typing in an input field
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime.current > 50) {
        barcodeBuffer.current = "";
      }
      
      lastKeyTime.current = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 5) {
          const scannedCode = barcodeBuffer.current;
          barcodeBuffer.current = "";
          
          if (!selectedMeeting) {
            message.warning("Vui lòng chọn hoặc tạo một buổi sinh hoạt!");
            return;
          }
          if (selectedMeeting.status !== 'ACTIVE') {
            message.error("Sổ điểm danh đã bị khóa, không thể điểm danh!");
            return;
          }
          executeAttendanceCheckIn(scannedCode, 'BARCODE');
        }
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedMeeting, dangVienList, attendances, executeAttendanceCheckIn]);

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    const mssvClean = barcodeInput.trim();
    setBarcodeInput(''); // Clear immediately
    
    if (!selectedMeeting) {
      message.warning("Vui lòng chọn hoặc tạo một buổi sinh hoạt!");
      return;
    }
    if (selectedMeeting.status !== 'ACTIVE') {
      playBeep('error');
      message.error("Sổ điểm danh đã bị khóa, không thể điểm danh!");
      return;
    }
    if (!mssvClean) return;

    await executeAttendanceCheckIn(mssvClean, 'BARCODE');
  };

  // 4. WEBCAM BIOMETRICS FACE RECOGNITION (Simulation & WebCam integration)
  const startCamera = async () => {
    if (!selectedMeeting) {
      message.warning("Vui lòng chọn hoặc tạo buổi họp trước!");
      return;
    }
    if (selectedMeeting.status !== 'ACTIVE') {
      message.error("Sổ họp đang khóa, không thể điểm danh bằng camera!");
      return;
    }

    setCameraActive(true);
    setFaceLockState('SCANNING');
    setLogs([]);
    addLog("Khởi động Camera và tải hệ thống AI...");

    try {
      // Chờ window.faceapi sẵn sàng (tối đa 8 giây)
      let waited = 0;
      while (!window.faceapi && waited < 8000) {
        await new Promise(r => setTimeout(r, 300));
        waited += 300;
      }
      if (!window.faceapi) {
        throw new Error('FACEAPI_NOT_LOADED');
      }

      // Tải models AI (bỏ qua nếu đã tải)
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
      addLog("Đang tải mô hình AI nhận diện khuôn mặt...");
      await Promise.all([
        window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      addLog("Đã tải xong mô hình nhận diện khuôn mặt.");

      // Chuẩn bị dữ liệu khuôn mặt Đảng viên đã đăng ký
      const labeledDescriptors = dangVienList
        .filter(dv => dv.khuon_mat_registered && dv.khuon_mat_vector)
        .map(dv => new window.faceapi.LabeledFaceDescriptors(
          dv.mssv,
          [new Float32Array(dv.khuon_mat_vector)]
        ));

      if (labeledDescriptors.length > 0) {
        faceMatcherRef.current = new window.faceapi.FaceMatcher(labeledDescriptors, 0.45);
        addLog(`Đã nạp ${labeledDescriptors.length} mẫu khuôn mặt Đảng viên vào bộ nhớ.`);
      } else {
        faceMatcherRef.current = null;
        addLog("CẢNH BÁO: Chưa có Đảng viên nào đăng ký Face ID! Camera vẫn hoạt động để nhận diện.");
      }

      // Kết nối webcam
      addLog("Đang kết nối webcam...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      setScanStream(stream);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
            .then(() => {
              addLog("Camera kết nối thành công. Bắt đầu phân tích sinh trắc học...");
              runBiometricAnalysis();
            })
            .catch(playErr => {
              console.error("Lỗi play video:", playErr);
              addLog("LỖI: Không thể phát video. Thử tải lại trang.");
            });
        };
      }
    } catch (err) {
      console.error("[startCamera]", err);
      setCameraActive(false);
      setFaceLockState('ERROR');
      setScanStream(null);
      faceMatcherRef.current = null;

      if (err.message === 'FACEAPI_NOT_LOADED') {
        message.error("Thư viện nhận diện khuôn mặt chưa tải xong. Vui lòng tải lại trang!");
        addLog("LỖI: Thư viện face-api.js không tải được. Kiểm tra kết nối mạng.");
      } else if (err.name === 'NotAllowedError') {
        message.error("Trình duyệt bị từ chối quyền camera. Vui lòng cấp quyền trong cài đặt trình duyệt!");
        addLog("LỖI CAMERA: Bị từ chối quyền truy cập webcam.");
      } else if (err.name === 'NotFoundError') {
        message.error("Không tìm thấy camera trên thiết bị này!");
        addLog("LỖI CAMERA: Không có thiết bị camera.");
      } else {
        message.error("Lỗi khởi động camera: " + err.message);
        addLog("LỖI: " + err.message);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setScanStream(null);
    streamRef.current = null;
    setCameraActive(false);
    setFaceLockState('IDLE');
    setMatchedFace(null);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    addLog("Đã tắt Camera quan sát.");
  };

  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const runBiometricAnalysis = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    let emptyFrames = 0;
    let matchCooldown = false; // chặn quét trùng trong lúc chờ

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !window.faceapi || matchCooldown) return;

      try {
        setFaceLockState('SCANNING');
        const detection = await window.faceapi
          .detectSingleFace(videoRef.current, new window.faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          emptyFrames = 0;

          // Nếu chưa có ai đăng ký khuôn mặt
          if (!faceMatcherRef.current) {
            addLog('Phát hiện khuôn mặt nhưng chưa có Đảng viên nào đăng ký Face ID.');
            setMatchedFace(null);
            return;
          }

          const bestMatch = faceMatcherRef.current.findBestMatch(detection.descriptor);

          if (bestMatch.label !== 'unknown') {
            const matchedMssv = bestMatch.label;
            const confidence = Number((100 - bestMatch.distance * 100).toFixed(1));
            const matchedDv = dangVienList.find(dv => dv.mssv === matchedMssv);

            if (matchedDv) {
              const alreadyCheckedIn = attendances.some(a => a.mssv === matchedMssv);
              if (!alreadyCheckedIn) {
                // Khóa vòng lặp để tránh ghi trùng
                matchCooldown = true;
                clearInterval(scanIntervalRef.current);
                scanIntervalRef.current = null;

                setFaceLockState('MATCHED');
                setMatchedFace(matchedDv);
                setMatchConfidence(confidence);
                addLog(`✅ KHỚP KHUÔN MẶT: Đ/c ${matchedDv.ho_ten} — Độ chính xác: ${confidence}%`);

                await executeAttendanceCheckIn(matchedMssv, 'FACE');

                // Chờ 3.5 giây rồi tự quét tiếp
                setTimeout(() => {
                  matchCooldown = false;
                  setMatchedFace(null);
                  setFaceLockState('SCANNING');
                  addLog('Tiếp tục quét khuôn mặt...');
                  runBiometricAnalysis();
                }, 3500);
              } else {
                addLog(`⚠️ Đ/c ${matchedDv.ho_ten} đã được điểm danh trước đó — bỏ qua.`);
              }
            }
          } else {
            // Phát hiện mặt nhưng không khớp
            if (emptyFrames % 4 === 0) {
              addLog('🔍 Phát hiện khuôn mặt nhưng không tìm thấy trong hệ thống.');
            }
            setMatchedFace(null);
          }
        } else {
          emptyFrames++;
          if (emptyFrames % 5 === 0) {
            addLog('Đang theo dõi... chưa phát hiện khuôn mặt trong khung hình.');
          }
          setMatchedFace(null);
        }
      } catch (e) {
        console.error('Lỗi phân tích sinh trắc:', e);
        addLog('LỖI phân tích: ' + e.message);
      }
    }, 1000);
  };

  // 5. MANUAL OVERRIDES (Inspection / Cấp ủy only)
  const handleUpdateStatus = async (recordId, newStatus) => {
    try {
      await updateDoc(doc(db, "attendances", recordId), {
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      setAttendances(attendances.map(a => a.id === recordId ? { ...a, status: newStatus } : a));
      message.success("Cập nhật trạng thái điểm danh thành công!");
      addLog(`CHỈNH SỬA: Thay đổi trạng thái sang ${newStatus}.`);
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi sửa điểm danh");
    }
  };

  const handleUpdateMethod = async (recordId, newMethod) => {
    try {
      await updateDoc(doc(db, "attendances", recordId), {
        method: newMethod,
        updated_at: new Date().toISOString()
      });
      setAttendances(attendances.map(a => a.id === recordId ? { ...a, method: newMethod } : a));
      message.success("Cập nhật phương thức điểm danh thành công!");
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi sửa phương thức");
    }
  };

  const handleRemoveAttendance = async (recordId) => {
    try {
      await deleteDoc(doc(db, "attendances", recordId));
      setAttendances(attendances.filter(a => a.id !== recordId));
      message.success("Đã xóa bản ghi điểm danh khỏi danh sách.");
      addLog("CHỈNH SỬA: Xóa bản ghi điểm danh.");
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi xóa điểm danh");
    }
  };

  // Manual fast select adding
  const handleManualAdd = async (mssv) => {
    if (!selectedMeeting) return;
    await executeAttendanceCheckIn(mssv, 'MANUAL');
  };

  // 6. STATISTICAL SUMMARIES
  const stats = useMemo(() => {
    const total = dangVienList.length;
    const presentList = attendances.filter(a => a.status === 'PRESENT');
    const lateList = attendances.filter(a => a.status === 'LATE');
    const absentCount = total - attendances.length;

    const presentCount = presentList.length;
    const lateCount = lateList.length;
    const attendedCount = presentCount + lateCount;
    const rate = total > 0 ? Math.round((attendedCount / total) * 100) : 0;

    return {
      total,
      present: presentCount,
      late: lateCount,
      absent: absentCount > 0 ? absentCount : 0,
      rate
    };
  }, [dangVienList, attendances]);

  // Missing Members List
  const missingMembers = useMemo(() => {
    return dangVienList.filter(dv => 
      !attendances.some(a => a.mssv === dv.mssv)
    );
  }, [dangVienList, attendances]);

  // Missing Members Data (with excused absence check)
  const missingMembersData = useMemo(() => {
    return missingMembers.map(m => {
      // Find if this member has an approved absence request for this meeting
      const approvedAbsence = absenceRequests.find(r => r.mssv === m.mssv && r.trang_thai === 'approved');
      return {
        ...m,
        excused: !!approvedAbsence,
        reason: approvedAbsence ? approvedAbsence.ly_do : null
      };
    });
  }, [missingMembers, absenceRequests]);

  const missingColumns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_, __, idx) => idx + 1
    },
    {
      title: 'MSSV',
      dataIndex: 'mssv',
      key: 'mssv',
      width: 100,
      render: (text) => <strong>{text}</strong>
    },
    {
      title: 'Họ tên',
      dataIndex: 'ho_ten',
      key: 'ho_ten',
    },
    {
      title: 'Lớp',
      dataIndex: 'lop',
      key: 'lop',
      width: 100
    },
    {
      title: 'Phân nhóm',
      dataIndex: 'nhom',
      key: 'nhom',
      width: 140,
      render: (val) => val ? <Tag color="cyan">{val}</Tag> : <Tag color="default">Chưa có</Tag>
    },
    {
      title: 'Trạng thái vắng',
      key: 'excused',
      width: 160,
      render: (_, record) => {
        return record.excused ? (
          <Tooltip title={record.reason || "Lý do vắng họp đã được duyệt"}>
            <Tag color="processing">Vắng có phép</Tag>
          </Tooltip>
        ) : (
          <Tag color="error">Vắng không phép</Tag>
        );
      }
    },
    ...(isKiemTra ? [{
      title: 'Hành động',
      key: 'action',
      width: 160,
      align: 'center',
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small" 
          icon={<PlusOutlined />}
          style={{ backgroundColor: '#389e0d', borderColor: '#389e0d', borderRadius: '4px' }}
          onClick={() => handleManualAdd(record.mssv)}
          disabled={selectedMeeting?.status !== 'ACTIVE'}
        >
          Điểm danh thủ công
        </Button>
      )
    }] : [])
  ];

  // 8. PERSONAL ATTENDANCE DASHBOARD FOR REGULAR MEMBERS
  const personalStats = useMemo(() => {
    const pastMeetings = meetings.filter(m => {
      const meetingStart = dayjs(`${m.date} ${m.time}`);
      return meetingStart.isBefore(dayjs());
    });
    
    const total = pastMeetings.length;
    const present = personalAttendances.filter(a => a.status === 'PRESENT').length;
    const late = personalAttendances.filter(a => a.status === 'LATE').length;
    
    const excused = personalAbsences.filter(r => 
      pastMeetings.some(m => m.id === r.cuoc_hop_id)
    ).length;

    const attended = present + late;
    const absent = total - attended;
    const unexcused = absent - excused > 0 ? absent - excused : 0;
    
    const rate = total > 0 ? Math.round((attended / total) * 100) : 100;

    return {
      total,
      present,
      late,
      excused,
      unexcused,
      rate
    };
  }, [meetings, personalAttendances, personalAbsences]);

  const personalHistoryData = useMemo(() => {
    return meetings.map(m => {
      const meetingStart = dayjs(`${m.date} ${m.time}`);
      const isPast = meetingStart.isBefore(dayjs());
      
      const checkIn = personalAttendances.find(a => a.meetingId === m.id);
      const approvedAbsence = personalAbsences.find(r => r.cuoc_hop_id === m.id);

      let statusKey = 'UPCOMING';
      let checkInTimeStr = '';
      let methodStr = '';
      
      if (checkIn) {
        statusKey = checkIn.status;
        checkInTimeStr = checkIn.checkInTime ? safeDayjs(checkIn.checkInTime).format('HH:mm:ss') : '';
        methodStr = checkIn.method === 'BARCODE' ? 'Mã vạch' : (checkIn.method === 'FACE' ? 'Khuôn mặt' : 'Thủ công');
      } else if (isPast) {
        statusKey = approvedAbsence ? 'EXCUSED' : 'UNEXCUSED';
      }

      return {
        id: m.id,
        title: m.title,
        date: m.date,
        time: m.time,
        location: m.location,
        statusKey,
        checkInTime: checkInTimeStr,
        method: methodStr,
        reason: approvedAbsence ? approvedAbsence.ly_do : null
      };
    });
  }, [meetings, personalAttendances, personalAbsences]);

  const personalColumns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_, __, idx) => idx + 1
    },
    {
      title: 'Tên buổi họp / Chủ đề sinh hoạt',
      dataIndex: 'title',
      key: 'title',
      render: (t) => <strong>{t}</strong>
    },
    {
      title: 'Thời gian',
      key: 'time',
      width: 220,
      render: (_, record) => (
        <span>
          📅 {dayjs(record.date).format('DD/MM/YYYY')} lúc ⏰ {record.time}
        </span>
      )
    },
    {
      title: 'Địa điểm',
      dataIndex: 'location',
      key: 'location',
      width: 180
    },
    {
      title: 'Kết quả điểm danh',
      dataIndex: 'statusKey',
      key: 'statusKey',
      width: 180,
      render: (val, record) => {
        switch (val) {
          case 'PRESENT':
            return <Tag color="success">Có mặt</Tag>;
          case 'LATE':
            return <Tag color="warning">Đi muộn ({record.checkInTime})</Tag>;
          case 'EXCUSED':
            return (
              <Tooltip title={record.reason || "Vắng có lý do hợp lý được Chi ủy duyệt"}>
                <Tag color="processing">Vắng có phép</Tag>
              </Tooltip>
            );
          case 'UNEXCUSED':
            return <Tag color="error">Vắng không phép</Tag>;
          case 'UPCOMING':
          default:
            return <Tag color="default">Sắp diễn ra</Tag>;
        }
      }
    },
    {
      title: 'Phương thức',
      dataIndex: 'method',
      key: 'method',
      width: 120,
      render: (val) => val ? <Tag color="blue">{val}</Tag> : '--'
    }
  ];

  const renderPersonalDashboard = () => {
    const activeMeeting = meetings.find(m => m.status === 'ACTIVE');
    const personalCheckIn = activeMeeting ? personalAttendances.find(a => a.meetingId === activeMeeting.id) : null;
    
    // Check if current active meeting code is expired (3 minutes limit)
    let isCodeExpired = false;
    let expiresAtStr = '';
    if (activeMeeting && activeMeeting.sessionCodeCreatedAt) {
      const createdAt = dayjs(activeMeeting.sessionCodeCreatedAt);
      const expiresAt = createdAt.add(3, 'minute');
      isCodeExpired = dayjs().isAfter(expiresAt);
      expiresAtStr = expiresAt.format('HH:mm:ss');
    }

    return (
      <div style={{ fontFamily: "'SVN-Gilroy', 'Inter', sans-serif", minHeight: '80vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 24 }}>
          <div style={{ width: '4px', height: '26px', backgroundColor: '#c62828', borderRadius: '2px' }} />
          <Title level={4} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.3px' }}>
            Lịch sử Điểm danh cá nhân
          </Title>
        </div>

        {activeMeeting && (
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 4px 20px rgba(198, 40, 40, 0.08)',
              background: 'linear-gradient(135deg, #fffefe 0%, #fffbfb 100%)',
              border: '1.5px solid #ffccc7',
              borderLeft: '6px solid #c62828',
              marginBottom: 20,
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Badge status="processing" color="#c62828" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#c62828', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      BUỔI SINH HOẠT ĐANG DIỄN RA (ĐIỂM DANH MỞ)
                    </span>
                  </div>
                  <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#262626' }}>
                    {activeMeeting.title}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    📍 Địa điểm: <strong>{activeMeeting.location}</strong> | ⏰ Bắt đầu: <strong>{activeMeeting.time}</strong> | 📅 Ngày: <strong>{safeDayjs(activeMeeting.date).format('DD/MM/YYYY')}</strong>
                  </Text>
                </div>
                
                {personalCheckIn ? (
                  <Tag color="success" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <SafetyCertificateOutlined /> ĐÃ ĐIỂM DANH ({personalCheckIn.status === 'LATE' ? 'ĐI MUỘN' : 'CÓ MẶT'})
                  </Tag>
                ) : (
                  <Tag color="error" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <LockOutlined /> CHƯA ĐIỂM DANH
                  </Tag>
                )}
              </div>

              {personalCheckIn ? (
                <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ color: '#52c41a', fontSize: 24, display: 'flex', alignItems: 'center' }}>
                    <CheckCircleOutlined />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1b5e20', fontSize: 14 }}>
                      Đồng chí đã hoàn thành điểm danh!
                    </div>
                    <div style={{ fontSize: 13, color: '#43a047' }}>
                      Thời gian ghi nhận: <strong>{dayjs(personalCheckIn.checkInTime).format('HH:mm:ss DD/MM/YYYY')}</strong> | Phương thức: <strong>{personalCheckIn.method === 'SELF_CODE' ? 'Mã số / QR cá nhân' : personalCheckIn.method}</strong>
                    </div>
                  </div>
                </div>
              ) : activeMeeting.selfCheckInOpen === false ? (
                <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 8, padding: '16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontWeight: 700, color: '#ff4d4f', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    🔒 CỔNG TỰ ĐIỂM DANH ĐÃ KHÓA
                  </div>
                  <div style={{ fontSize: 13, color: '#595959' }}>
                    Ban chi ủy đã khóa cổng tự điểm danh bằng QR và Mã số đối với buổi sinh hoạt này.
                    Đồng chí vui lòng liên hệ trực tiếp Ban chi ủy tại bàn đón tiếp để ghi nhận điểm danh.
                  </div>
                </div>
              ) : isCodeExpired ? (
                <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontWeight: 700, color: '#d46b08', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    ⚠️ MÃ SỐ ĐIỂM DANH HẾT HẠN
                  </div>
                  <div style={{ fontSize: 13, color: '#595959' }}>
                    Mã số điểm danh hiện tại của cuộc họp đã hết hạn (chỉ có hiệu lực trong 3 phút, hết hạn lúc <strong>{expiresAtStr}</strong>).
                    Đồng chí vui lòng báo cáo Ban chi ủy làm mới mã số & QR điểm danh trên máy chiếu để tiếp tục điểm danh.
                  </div>
                </div>
              ) : (
                <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: 16 }}>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={14}>
                      <div style={{ fontSize: 14, color: '#595959', marginBottom: 8 }}>
                        Đồng chí hãy nhập <strong>Mã số điểm danh</strong> gồm 6 chữ số được Ban chi ủy công bố tại cuộc họp để điểm danh:
                      </div>
                      <div style={{ display: 'flex', gap: 8, maxWidth: 360 }}>
                        <Input
                          placeholder="Nhập 6 chữ số"
                          maxLength={6}
                          value={selfCheckInCode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setSelfCheckInCode(val);
                            if (val.length === 6) {
                              handleSelfCheckIn(val);
                            }
                          }}
                          style={{ 
                            fontSize: 16, 
                            fontWeight: 700, 
                            letterSpacing: 2, 
                            textAlign: 'center',
                            height: 40,
                            borderRadius: 6
                          }}
                          onPressEnter={() => handleSelfCheckIn()}
                        />
                        <Button 
                          type="primary" 
                          onClick={() => handleSelfCheckIn()} 
                          loading={selfChecking}
                          style={{ 
                            backgroundColor: '#c62828', 
                            borderColor: '#c62828',
                            height: 40,
                            fontWeight: 700,
                            borderRadius: 6
                          }}
                        >
                          Xác nhận
                        </Button>
                      </div>
                    </Col>
                    <Col xs={24} md={10} style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8c8c8c', fontSize: 13 }}>
                        <ScanOutlined style={{ fontSize: 18, color: '#c62828' }} />
                        <span>Hoặc sử dụng camera thiết bị quét mã QR hiển thị trên màn hình máy chiếu:</span>
                      </div>
                      <Button
                        type="primary"
                        icon={<QrcodeOutlined />}
                        onClick={startQrScanner}
                        style={{
                          backgroundColor: '#52c41a',
                          borderColor: '#52c41a',
                          height: 40,
                          fontWeight: 700,
                          borderRadius: 6,
                          width: '100%',
                          maxWidth: 240
                        }}
                      >
                        Quét mã QR điểm danh
                      </Button>
                    </Col>
                  </Row>
                </div>
              )}
            </div>
          </Card>
        )}

        {personalProfile && (
          <Card 
            bordered={false} 
            style={{ 
              borderRadius: 12, 
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              background: 'linear-gradient(135deg, #ffffff 0%, #fffbfb 100%)',
              borderLeft: '5px solid #c62828',
              marginBottom: 20
            }}
          >
            <Row gutter={[20, 16]} align="middle">
              <Col xs={24} sm={4} style={{ display: 'flex', justifyContent: 'center' }}>
                <Avatar size={64} icon={<UserOutlined />} style={{ backgroundColor: '#c62828' }} />
              </Col>
              <Col xs={24} sm={20}>
                <Title level={4} style={{ margin: '0 0 8px 0', color: '#c62828', fontWeight: 800 }}>
                  {personalProfile.ho_ten}
                </Title>
                <Row gutter={[16, 8]}>
                  <Col span={8}><strong>MSSV:</strong> {personalProfile.mssv}</Col>
                  <Col span={8}><strong>Lớp:</strong> {personalProfile.lop || 'N/A'}</Col>
                  <Col span={8}><strong>Phân nhóm:</strong> {personalProfile.nhom || 'N/A'}</Col>
                  <Col span={8}><strong>Khoa:</strong> {personalProfile.khoa || 'N/A'}</Col>
                  <Col span={8}><strong>Trạng thái:</strong> {personalProfile.dang_vien_du_bi ? 'Dự bị' : 'Chính thức'}</Col>
                </Row>
              </Col>
            </Row>
          </Card>
        )}

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={4}>
            <Card size="small" style={{ background: '#f6ffed', border: 'none', borderRadius: 8, textAlign: 'center' }}>
              <Text style={{ color: '#52c41a', fontSize: 11, fontWeight: 'bold' }}>CÓ MẶT</Text>
              <Title level={3} style={{ margin: '4px 0 0 0', color: '#389e0d', fontWeight: 900 }}>{personalStats.present}</Title>
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small" style={{ background: '#fff7e6', border: 'none', borderRadius: 8, textAlign: 'center' }}>
              <Text style={{ color: '#fa8c16', fontSize: 11, fontWeight: 'bold' }}>ĐI MUỘN</Text>
              <Title level={3} style={{ margin: '4px 0 0 0', color: '#d46b08', fontWeight: 900 }}>{personalStats.late}</Title>
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small" style={{ background: '#e6f7ff', border: 'none', borderRadius: 8, textAlign: 'center' }}>
              <Text style={{ color: '#1890ff', fontSize: 11, fontWeight: 'bold' }}>VẮNG CÓ PHÉP</Text>
              <Title level={3} style={{ margin: '4px 0 0 0', color: '#096dd9', fontWeight: 900 }}>{personalStats.excused}</Title>
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small" style={{ background: '#fff1f0', border: 'none', borderRadius: 8, textAlign: 'center' }}>
              <Text style={{ color: '#ff4d4f', fontSize: 11, fontWeight: 'bold' }}>VẮNG KHÔNG PHÉP</Text>
              <Title level={3} style={{ margin: '4px 0 0 0', color: '#cf1322', fontWeight: 900 }}>{personalStats.unexcused}</Title>
            </Card>
          </Col>
          <Col xs={24} md={8} style={{ display: 'flex', background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.02)', alignItems: 'center', justifyContent: 'space-around' }}>
            <Progress type="circle" size={54} percent={personalStats.rate} strokeColor="#c62828" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#333' }}>TỶ LỆ CHUYÊN CẦN</div>
              <div style={{ fontSize: 11, color: '#888' }}>Tính trên tổng số buổi đã sinh hoạt</div>
            </div>
          </Col>
        </Row>

        <Card 
          title={<span style={{ fontWeight: 800, color: '#333' }}>📋 LỊCH SỬ CHUYÊN CẦN VÀ SINH HOẠT VẮNG</span>}
          bordered={false} 
          style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}
        >
          <Table
            columns={personalColumns}
            dataSource={personalHistoryData}
            rowKey="id"
            loading={loadingPersonal}
            scroll={{ x: 'max-content' }}
            pagination={{
              defaultPageSize: 10,
              showTotal: (total) => `Tổng cộng: ${total} buổi sinh hoạt`
            }}
          />
        </Card>
      </div>
    );
  };

  // 9. MONTHLY ATTENDANCE MATRIX & DYNAMIC COLUMNS FOR ADMINISTRATIVE VIEWS
  const filteredMatrixMeetings = useMemo(() => {
    if (matrixMonth === 'ALL') return meetings;
    return meetings.filter(m => safeDayjs(m.date).format('MM') === matrixMonth);
  }, [meetings, matrixMonth]);

  const matrixData = useMemo(() => {
    return dangVienList.map(dv => {
      const records = {};
      let presentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;
      let unexcusedCount = 0;

      filteredMatrixMeetings.forEach(m => {
        const checkIn = matrixAttendances.find(a => a.meetingId === m.id && a.mssv === dv.mssv);
        const approvedAbsence = matrixAbsences.find(r => r.cuoc_hop_id === m.id && r.mssv === dv.mssv && r.trang_thai === 'approved');
        const isPast = safeDayjs(`${m.date} ${m.time}`).isBefore(safeDayjs());

        if (checkIn) {
          records[m.id] = checkIn.status;
          if (checkIn.status === 'PRESENT') presentCount++;
          else lateCount++;
        } else if (isPast) {
          if (approvedAbsence) {
            records[m.id] = 'EXCUSED';
            excusedCount++;
          } else {
            records[m.id] = 'UNEXCUSED';
            unexcusedCount++;
          }
        } else {
          records[m.id] = 'UPCOMING';
        }
      });

      const totalAbsent = excusedCount + unexcusedCount;

      return {
        key: dv.mssv,
        mssv: dv.mssv,
        ho_ten: dv.ho_ten,
        lop: dv.lop || 'N/A',
        records,
        presentCount,
        lateCount,
        excusedCount,
        unexcusedCount,
        totalAbsent,
        totalMeetings: filteredMatrixMeetings.length
      };
    });
  }, [dangVienList, filteredMatrixMeetings, matrixAttendances, matrixAbsences]);

  const matrixColumns = useMemo(() => {
    const cols = [
      {
        title: 'STT',
        key: 'stt',
        width: 60,
        align: 'center',
        render: (_, __, idx) => idx + 1,
        fixed: 'left'
      },
      {
        title: 'MSSV',
        dataIndex: 'mssv',
        key: 'mssv',
        width: 100,
        fixed: 'left',
        render: (text) => <strong>{text}</strong>
      },
      {
        title: 'Họ tên',
        dataIndex: 'ho_ten',
        key: 'ho_ten',
        width: 160,
        fixed: 'left'
      },
      {
        title: 'Lớp',
        dataIndex: 'lop',
        key: 'lop',
        width: 90,
        fixed: 'left'
      }
    ];

    filteredMatrixMeetings.forEach(m => {
      cols.push({
        title: (
          <Tooltip title={m.title}>
            <div style={{ fontSize: 11, textAlign: 'center', lineHeight: '1.2' }}>
              <div>{safeDayjs(m.date).format('DD/MM')}</div>
              <div style={{ color: '#888', fontWeight: 'normal' }}>{m.time}</div>
            </div>
          </Tooltip>
        ),
        key: m.id,
        width: 80,
        align: 'center',
        render: (_, record) => {
          const val = record.records[m.id];
          switch (val) {
            case 'PRESENT':
              return <span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: 16 }}>●</span>;
            case 'LATE':
              return <span style={{ color: '#fa8c16', fontWeight: 'bold', fontSize: 16 }}>▲</span>;
            case 'EXCUSED':
              return <span style={{ color: '#1890ff', fontWeight: 'bold', fontSize: 16 }}>○</span>;
            case 'UNEXCUSED':
              return <span style={{ color: '#f5222d', fontWeight: 'bold', fontSize: 16 }}>❌</span>;
            case 'UPCOMING':
            default:
              return <span style={{ color: '#bfbfbf' }}>--</span>;
          }
        }
      });
    });

    cols.push(
      {
        title: 'Có mặt',
        dataIndex: 'presentCount',
        key: 'present',
        width: 80,
        align: 'center',
        render: (val) => <strong style={{ color: '#389e0d' }}>{val}</strong>
      },
      {
        title: 'Đi muộn',
        dataIndex: 'lateCount',
        key: 'late',
        width: 80,
        align: 'center',
        render: (val) => <strong style={{ color: '#d46b08' }}>{val}</strong>
      },
      {
        title: 'Vắng có phép',
        dataIndex: 'excusedCount',
        key: 'excused',
        width: 90,
        align: 'center',
        render: (val) => <strong style={{ color: '#096dd9' }}>{val}</strong>
      },
      {
        title: 'Vắng không phép',
        dataIndex: 'unexcusedCount',
        key: 'unexcused',
        width: 95,
        align: 'center',
        render: (val) => <strong style={{ color: '#cf1322' }}>{val}</strong>
      },
      {
        title: 'Tổng vắng',
        dataIndex: 'totalAbsent',
        key: 'totalAbsent',
        width: 90,
        align: 'center',
        render: (val) => <strong style={{ color: '#c62828', fontSize: 14 }}>{val}</strong>
      }
    );

    return cols;
  }, [filteredMatrixMeetings]);

  const handleExportMatrixExcel = () => {
    if (matrixData.length === 0) {
      message.warning("Không có dữ liệu tổng hợp để xuất!");
      return;
    }

    try {
      const headers = ["STT", "MSSV", "Họ và tên", "Lớp"];
      filteredMatrixMeetings.forEach(m => {
        headers.push(`${m.title} (${safeDayjs(m.date).format('DD/MM/YYYY')})`);
      });
      headers.push("Tổng số buổi", "Có mặt", "Đi muộn", "Vắng có phép", "Vắng không phép", "Tổng vắng");

      const rows = [headers];

      matrixData.forEach((row, idx) => {
        const item = [idx + 1, row.mssv, row.ho_ten, row.lop];
        filteredMatrixMeetings.forEach(m => {
          const val = row.records[m.id];
          let valTxt = '--';
          if (val === 'PRESENT') valTxt = 'Có mặt';
          else if (val === 'LATE') valTxt = 'Đi muộn';
          else if (val === 'EXCUSED') valTxt = 'Vắng có phép';
          else if (val === 'UNEXCUSED') valTxt = 'Vắng không phép';
          item.push(valTxt);
        });
        item.push(row.totalMeetings, row.presentCount, row.lateCount, row.excusedCount, row.unexcusedCount, row.totalAbsent);
        rows.push(item);
      });

      const workbook = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, ws, "TongHop_ChuyenCan");

      const filename = `TongHop_DiemDanh_Thang_${matrixMonth === 'ALL' ? 'CaNam' : matrixMonth}_${dayjs().format('YYYYMMDD')}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      message.success("Xuất file tổng hợp chuyên cần thành công!");
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi xuất file báo cáo");
    }
  };

  const previewColumns = useMemo(() => {
    const cols = [
      {
        title: 'MSSV',
        dataIndex: 'mssv',
        key: 'mssv',
        width: 100,
        render: (text, record) => record.isValid ? <strong>{text}</strong> : <span style={{ color: '#ff4d4f' }}>{text} (Lỗi)</span>
      },
      {
        title: 'Họ tên',
        dataIndex: 'ho_ten',
        key: 'ho_ten',
        width: 150
      },
      {
        title: 'Trạng thái hợp lệ',
        key: 'isValid',
        width: 130,
        render: (_, record) => record.isValid ? <Tag color="success">Hợp lệ</Tag> : <Tag color="error">Không tìm thấy</Tag>
      }
    ];

    importCols.forEach(mc => {
      cols.push({
        title: mc.header,
        key: mc.header,
        width: 110,
        align: 'center',
        render: (_, record) => {
          const val = record.records[mc.header];
          switch (val) {
            case 'PRESENT':
              return <Tag color="success">Có mặt</Tag>;
            case 'LATE':
              return <Tag color="warning">Đi muộn</Tag>;
            case 'EXCUSED':
              return <Tag color="processing">Vắng có phép</Tag>;
            case 'UNEXCUSED':
              return <Tag color="error">Vắng không phép</Tag>;
            default:
              return <Tag color="default">Vắng</Tag>;
          }
        }
      });
    });

    return cols;
  }, [importCols, importRows]);

  // 7. EXPORT DATA (Excel 2 Sheets)
  const handleExportExcel = () => {
    if (!selectedMeeting) return;
    if (attendances.length === 0 && missingMembers.length === 0) {
      message.warning("Không có dữ liệu điểm danh để xuất!");
      return;
    }

    try {
      const presentHeaders = ["STT", "MSSV", "Họ và tên", "Lớp", "Thời gian quét", "Phương thức", "Trạng thái", "Thiết bị", "IP"];
      const presentRows = [presentHeaders];
      
      attendances.forEach((a, idx) => {
        const time = a.checkInTime ? safeDayjs(a.checkInTime).format('DD/MM/YYYY HH:mm:ss') : 'N/A';
        const methodTxt = a.method === 'BARCODE' ? "Mã vạch" : (a.method === 'FACE' ? "Khuôn mặt" : "Thủ công");
        const statusTxt = a.status === 'PRESENT' ? "Có mặt" : (a.status === 'LATE' ? "Đi muộn" : "Vắng");
        presentRows.push([idx + 1, a.mssv, a.ho_ten, a.lop, time, methodTxt, statusTxt, a.deviceInfo, a.ip]);
      });

      const absentHeaders = ["STT", "MSSV", "Họ và tên", "Lớp", "Trạng thái"];
      const absentRows = [absentHeaders];
      
      missingMembers.forEach((m, idx) => {
        absentRows.push([idx + 1, m.mssv, m.ho_ten, m.lop || '', "Vắng mặt"]);
      });

      const workbook = XLSX.utils.book_new();
      
      const wsPresent = XLSX.utils.aoa_to_sheet(presentRows);
      XLSX.utils.book_append_sheet(workbook, wsPresent, "Danh_sach_Co_mat");
      
      const wsAbsent = XLSX.utils.aoa_to_sheet(absentRows);
      XLSX.utils.book_append_sheet(workbook, wsAbsent, "Danh_sach_Vang_mat");

      const filename = `DiemDanh_${selectedMeeting.title.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD')}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      message.success("Xuất báo cáo Điểm danh Excel thành công!");
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi xuất file báo cáo");
    }
  };

  // Antd Table Columns configuration
  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_, __, idx) => idx + 1
    },
    {
      title: 'MSSV',
      dataIndex: 'mssv',
      key: 'mssv',
      width: 100,
      fontWeight: 700
    },
    {
      title: 'Họ tên',
      dataIndex: 'ho_ten',
      key: 'ho_ten',
    },
    {
      title: 'Lớp',
      dataIndex: 'lop',
      key: 'lop',
      width: 90
    },
    {
      title: 'Thời gian',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      render: (t) => t ? safeDayjs(t).format('HH:mm:ss') : ''
    },
    {
      title: 'Phương thức',
      dataIndex: 'method',
      key: 'method',
      width: 120,
      render: (val, record) => {
        if (!isKiemTra) {
          return val === 'BARCODE' ? <Tag color="blue">Mã vạch</Tag> : (val === 'FACE' ? <Tag color="purple">Khuôn mặt</Tag> : <Tag color="default">Thủ công</Tag>);
        }
        return (
          <Select 
            value={val} 
            size="small" 
            style={{ width: '100%' }}
            onChange={(newVal) => handleUpdateMethod(record.id, newVal)}
          >
            <Option value="BARCODE">Mã vạch</Option>
            <Option value="FACE">Khuôn mặt</Option>
            <Option value="MANUAL">Thủ công</Option>
          </Select>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (val, record) => {
        if (!isKiemTra) {
          return val === 'PRESENT' ? <Tag color="success">Có mặt</Tag> : (val === 'LATE' ? <Tag color="warning">Đi muộn</Tag> : <Tag color="error">Vắng</Tag>);
        }
        return (
          <Select 
            value={val} 
            size="small" 
            style={{ width: '100%' }}
            onChange={(newVal) => handleUpdateStatus(record.id, newVal)}
          >
            <Option value="PRESENT">✅ Có mặt</Option>
            <Option value="LATE">⚠️ Đi muộn</Option>
          </Select>
        );
      }
    },
    ...(isKiemTra ? [{
      title: 'Hành động',
      key: 'action',
      width: 70,
      align: 'center',
      render: (_, record) => (
        <Popconfirm title="Gỡ điểm danh?" onConfirm={() => handleRemoveAttendance(record.id)}>
          <Button type="text" danger size="small" icon={<CloseCircleOutlined />} />
        </Popconfirm>
      )
    }] : [])
  ];

  // If not admin/officer, show the personal member view
  if (!isAdminOrChiUy) {
    return renderPersonalDashboard();
  }

  return (
    <div style={{ fontFamily: "'SVN-Gilroy', 'Inter', sans-serif", minHeight: '80vh' }}>
      
      {/* 1. Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '4px', height: '26px', backgroundColor: '#c62828', borderRadius: '2px' }} />
          <Title level={4} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.3px' }}>
            Điểm danh sinh hoạt Chi bộ
          </Title>
          {selectedMeeting?.status === 'ACTIVE' && (
            <Badge status="success" text={<span style={{ color: '#52c41a', fontSize: '12px', fontWeight: 600 }}>Súng quét đang sẵn sàng</span>} style={{ marginLeft: 16 }} />
          )}
          {loadingMeetings && <ReloadOutlined spin style={{ color: '#c62828', marginLeft: 8 }} />}
        </div>
        
        <Space flex-wrap="wrap">
          <Select
            placeholder="Chọn buổi sinh hoạt..."
            style={{ width: 320 }}
            value={selectedMeeting?.id}
            onChange={handleMeetingSelect}
            loading={loadingMeetings}
          >
            {meetings.map(m => (
              <Option key={m.id} value={m.id}>
                {m.title} ({safeDayjs(m.date).format('DD/MM/YYYY')})
              </Option>
            ))}
          </Select>

          {isKiemTra && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              style={{ backgroundColor: '#c62828', borderColor: '#c62828' }}
              onClick={() => setIsCreateModalVisible(true)}
            >
              Buổi sinh hoạt mới
            </Button>
          )}
        </Space>
      </div>

      {selectedMeeting ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* 2. Active Meeting Details & Stats */}
          <Card 
            bordered={false} 
            style={{ 
              borderRadius: 12, 
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              background: 'linear-gradient(135deg, #ffffff 0%, #fffbfb 100%)',
              borderLeft: selectedMeeting.status === 'ACTIVE' ? '5px solid #52c41a' : '5px solid #bfbfbf'
            }}
          >
            <Row gutter={[24, 24]} align="middle">
              <Col xs={24} md={10}>
                <Space direction="vertical" size={2}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#999', letterSpacing: '0.5px' }}>
                      Đang điều hành họp
                    </Text>
                    {selectedMeeting.status === 'ACTIVE' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <Badge status="processing" text={<span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: 11 }}>Cổng điểm danh MỞ</span>} />
                        <Button 
                          type="link" 
                          size="small" 
                          icon={<FullscreenOutlined />} 
                          style={{ padding: 0, height: 'auto', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: '#1890ff' }}
                          onClick={() => setIsProjectionModalVisible(true)}
                        >
                          Trình chiếu QR & Mã số
                        </Button>
                        <Button 
                          type="primary" 
                          size="small"
                          onClick={handleToggleSelfCheckIn}
                          style={{ 
                            height: '24px', 
                            fontSize: '11px', 
                            borderRadius: '4px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            backgroundColor: selectedMeeting.selfCheckInOpen !== false ? '#ff4d4f' : '#52c41a',
                            borderColor: selectedMeeting.selfCheckInOpen !== false ? '#ff4d4f' : '#52c41a',
                          }}
                        >
                          {selectedMeeting.selfCheckInOpen !== false ? '🔒 Khóa cổng tự điểm danh' : '🔓 Mở cổng tự điểm danh'}
                        </Button>
                      </div>
                    ) : (
                      <Badge status="default" text={<span style={{ color: '#777', fontWeight: 'bold', fontSize: 11 }}>ĐÃ KHÓA</span>} />
                    )}
                  </div>
                  <Title level={4} style={{ margin: '4px 0 8px 0', fontWeight: 900, color: '#333' }}>
                    {selectedMeeting.title}
                  </Title>
                  <Space size="large" style={{ fontSize: 13, color: '#666' }}>
                    <span>📍 Địa điểm: <strong>{selectedMeeting.location}</strong></span>
                    <span>📅 Ngày: <strong>{safeDayjs(selectedMeeting.date).format('DD/MM/YYYY')}</strong></span>
                    <span>⏰ Bắt đầu: <strong>{selectedMeeting.time}</strong></span>
                  </Space>
                </Space>
                <div style={{ marginTop: 16 }}>
                  {selectedMeeting.status === 'ACTIVE' ? (
                    isKiemTra && (
                      <Button danger icon={<LockOutlined />} onClick={handleLockMeeting}>
                        Khóa sổ điểm danh
                      </Button>
                    )
                  ) : (
                    isBiThu && (
                      <Button type="dashed" icon={<PlayCircleOutlined />} onClick={handleUnlockMeeting}>
                        Mở sổ điểm danh (Override)
                      </Button>
                    )
                  )}
                </div>
              </Col>

              <Col xs={24} md={14}>
                <Row gutter={12} style={{ textAlign: 'center' }}>
                  <Col span={6}>
                    <Card size="small" style={{ background: '#f6ffed', border: 'none', borderRadius: 8 }}>
                      <Text style={{ color: '#52c41a', fontSize: 11, fontWeight: 'bold' }}>CÓ MẶT</Text>
                      <Title level={3} style={{ margin: '4px 0 0 0', color: '#389e0d', fontWeight: 900 }}>{stats.present}</Title>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small" style={{ background: '#fff7e6', border: 'none', borderRadius: 8 }}>
                      <Text style={{ color: '#fa8c16', fontSize: 11, fontWeight: 'bold' }}>ĐI MUỘN</Text>
                      <Title level={3} style={{ margin: '4px 0 0 0', color: '#d46b08', fontWeight: 900 }}>{stats.late}</Title>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small" style={{ background: '#fff1f0', border: 'none', borderRadius: 8 }}>
                      <Text style={{ color: '#ff4d4f', fontSize: 11, fontWeight: 'bold' }}>VẮNG MẶT</Text>
                      <Title level={3} style={{ margin: '4px 0 0 0', color: '#cf1322', fontWeight: 900 }}>{stats.absent}</Title>
                    </Card>
                  </Col>
                  <Col span={6} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Progress type="circle" size={54} percent={stats.rate} strokeColor="#c62828" />
                    <Text style={{ fontSize: 10, color: '#888', marginTop: 4, fontWeight: 'bold' }}>TỶ LỆ THAM GIA</Text>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card>

          {/* 3. Main Scanning Grid Layout */}
          <Row gutter={[20, 20]}>
            
            {/* Column Left: High-Tech Biometric Camera Scan */}
            <Col xs={24} lg={11}>
              <Card 
                title={<span style={{ fontWeight: 800, color: '#333' }}><CameraOutlined /> PHƯƠNG THỨC 1: XÁC THỰC KHUÔN MẶT</span>}
                bordered={false} 
                style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', height: '100%' }}
                extra={
                  cameraActive ? (
                    <Button type="primary" danger size="small" onClick={stopCamera}>
                      Tắt camera
                    </Button>
                  ) : (
                    <Button type="primary" size="small" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }} onClick={startCamera}>
                      Bật nhận dạng
                    </Button>
                  )
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  
                  {/* Camera view screen container */}
                  <div style={{ 
                    width: '100%', 
                    height: 300, 
                    backgroundColor: '#111', 
                    borderRadius: 12, 
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid #333'
                  }}>
                    {cameraActive ? (
                      <>
                        {/* Video Feed */}
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          muted 
                          playsInline 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />

                        {/* Interactive UI Scanning Overlay */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          pointerEvents: 'none',
                          border: '2px solid rgba(82, 196, 26, 0.2)'
                        }}>
                          {/* Circle Target Frame */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 180,
                            height: 180,
                            border: '2px dashed #52c41a',
                            borderRadius: '50%',
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                          }}>
                            {/* Rotating radar corner indicators */}
                            <div style={{
                              position: 'absolute',
                              top: -4,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: 8,
                              height: 8,
                              background: '#52c41a',
                              borderRadius: '50%'
                            }} />
                          </div>

                          {/* Laser Scanline Beam Animation */}
                          <div style={{
                            position: 'absolute',
                            width: '100%',
                            height: 2,
                            background: 'linear-gradient(to right, transparent, #52c41a, transparent)',
                            boxShadow: '0 0 8px #52c41a',
                            top: 0,
                            animation: 'scanLine 3s linear infinite'
                          }} />
                          <style>{`
                            @keyframes scanLine {
                              0% { top: 10%; }
                              50% { top: 90%; }
                              100% { top: 10%; }
                            }
                          `}</style>

                          {/* Bounding box mock when locked on a member */}
                          {faceLockState === 'MATCHED' && matchedFace && (
                            <div style={{
                              position: 'absolute',
                              top: '25%',
                              left: '30%',
                              width: '40%',
                              height: '50%',
                              border: '2px solid #52c41a',
                              boxShadow: '0 0 10px #52c41a',
                              borderRadius: 8,
                              animation: 'pulseBox 1s infinite alternate'
                            }}>
                              {/* Metadata HUD */}
                              <div style={{
                                position: 'absolute',
                                top: -26,
                                left: 0,
                                background: 'rgba(82, 196, 26, 0.85)',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap'
                              }}>
                                ĐÃ KHỚP: Đ/c {matchedFace.ho_ten} ({matchConfidence}%)
                              </div>
                            </div>
                          )}
                          <style>{`
                            @keyframes pulseBox {
                              from { border-color: #52c41a; box-shadow: 0 0 5px #52c41a; }
                              to { border-color: #73d13d; box-shadow: 0 0 15px #73d13d; }
                            }
                          `}</style>
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: 24, color: '#666' }}>
                        <CameraOutlined style={{ fontSize: 48, color: '#333', marginBottom: 12 }} />
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 'bold' }}>Camera nhận dạng đang tắt</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#444' }}>
                          Nhấp bật camera để bắt đầu nhận diện sinh trắc học khuôn mặt tự động chống gian lận.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* High tech AI Console Log terminal */}
                  <div style={{ 
                    backgroundColor: '#0c0e12', 
                    borderRadius: 8, 
                    padding: 12, 
                    fontFamily: 'monospace', 
                    fontSize: '11px',
                    color: '#4af626',
                    height: 120,
                    overflowY: 'auto',
                    border: '1px solid #1a2333'
                  }}>
                    <div style={{ borderBottom: '1px dashed rgba(74,246,38,0.2)', paddingBottom: 4, marginBottom: 6, fontWeight: 'bold' }}>
                      🤖 HỆ THỐNG PHÂN TÍCH NHẬN DIỆN SINH TRẮC HỌC:
                    </div>
                    {logs.length > 0 ? (
                      logs.map((log, i) => <div key={i}>{log}</div>)
                    ) : (
                      <div style={{ color: '#595959', fontStyle: 'italic' }}>Chưa có hoạt động. Đang chờ bật Camera...</div>
                    )}
                  </div>
                </div>
              </Card>
            </Col>

            {/* Column Right: Barcode scanner & Live stream checked list */}
            <Col xs={24} lg={13}>
              <Card 
                title={<span style={{ fontWeight: 800, color: '#333' }}><ScanOutlined /> PHƯƠNG THỨC 2: QUÉT THẺ ĐẢNG VIÊN (MÃ VẠCH)</span>}
                bordered={false} 
                style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  
                  {/* Scanner input area */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontWeight: 'bold', fontSize: 12 }}>
                      Đầu đọc máy quét thẻ (Keyboard emulation):
                    </span>
                    <Input
                      ref={barcodeRef}
                      placeholder={selectedMeeting?.status === 'ACTIVE' ? "Đang lắng nghe tín hiệu quét mã vạch..." : "Đã khóa cổng quét"}
                      prefix={<ScanOutlined style={{ color: '#c62828' }} />}
                      value={barcodeInput}
                      disabled={selectedMeeting?.status !== 'ACTIVE'}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onPressEnter={handleBarcodeSubmit}
                      style={{ height: 44, borderRadius: 6, fontSize: 15 }}
                    />
                    <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13 }}>
                      Hướng máy quét vào mã vạch trên thẻ Đảng viên để điểm danh tự động.
                    </div>
                  </div>

                  {/* Manual search check-in selection for errors */}
                  {isKiemTra && selectedMeeting.status === 'ACTIVE' && (
                    <div style={{ background: '#fafafa', padding: 12, borderRadius: 8, border: '1px solid #f0f0f0' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#555', marginBottom: 8 }}>
                        Sự cố quét thẻ? Điểm danh thủ công nhanh:
                      </div>
                      <Select
                        showSearch
                        placeholder="Chọn tên Đảng viên cần điểm danh..."
                        style={{ width: '100%' }}
                        optionFilterProp="children"
                        value={undefined}
                        onChange={handleManualAdd}
                      >
                        {missingMembers.map(m => (
                          <Option key={m.id} value={m.mssv}>
                            {m.mssv} - {m.ho_ten} ({m.lop || 'Chính thức'})
                          </Option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Notification screen of last success checkin */}
                  {lastCheckedInMember && (
                    <div style={{ 
                      padding: 12, 
                      background: lastCheckedInMember.status === 'LATE' ? '#fff7e6' : '#f6ffed', 
                      borderRadius: 8, 
                      border: lastCheckedInMember.status === 'LATE' ? '1.5px solid #ffd591' : '1.5px solid #b7eb8f',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      animation: 'successFlash 0.3s ease-out'
                    }}>
                      <Avatar size="large" style={{ backgroundColor: lastCheckedInMember.status === 'LATE' ? '#fa8c16' : '#52c41a' }} icon={<UserOutlined />} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#262626' }}>
                          ĐÃ QUÉT: Đ/c {lastCheckedInMember.ho_ten}
                        </div>
                        <Text style={{ fontSize: 11, color: '#555' }}>
                          MSSV: <strong>{lastCheckedInMember.mssv}</strong> | Lớp: <strong>{lastCheckedInMember.lop || 'N/A'}</strong> | Lúc: <strong>{lastCheckedInMember.time}</strong>
                        </Text>
                      </div>
                      <Tag color={lastCheckedInMember.status === 'LATE' ? 'warning' : 'success'} style={{ padding: '4px 10px', fontSize: 12, fontWeight: 'bold' }}>
                        {lastCheckedInMember.status === 'LATE' ? 'ĐI MUỘN' : 'CÓ MẶT'}
                      </Tag>
                    </div>
                  )}
                  <style>{`
                    @keyframes successFlash {
                      0% { transform: scale(0.95); opacity: 0.8; }
                      100% { transform: scale(1); opacity: 1; }
                    }
                  `}</style>

                </div>
              </Card>
            </Col>
          </Row>

          {/* 4. Table: Attendance List with Tabs */}
          <Card 
            bordered={false} 
            style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}
            extra={
              <Button type="primary" icon={<DownloadOutlined />} style={{ backgroundColor: '#389e0d', borderColor: '#389e0d' }} onClick={handleExportExcel}>
                Xuất báo cáo (Excel)
              </Button>
            }
          >
            <Tabs defaultActiveKey="1" style={{ fontFamily: 'inherit' }}>
              <Tabs.TabPane tab={<strong>📋 ĐÃ ĐIỂM DANH ({attendances.length})</strong>} key="1">
                <Table
                  columns={columns}
                  dataSource={attendances}
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    defaultPageSize: 50,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100', '1000'],
                    showTotal: (total) => `Tổng cộng: ${total}/${dangVienList.length} Đảng viên`
                  }}
                />
              </Tabs.TabPane>
              
              <Tabs.TabPane tab={<strong>❌ CHƯA ĐIỂM DANH / VẮNG MẶT ({missingMembersData.length})</strong>} key="2">
                <Table
                  columns={missingColumns}
                  dataSource={missingMembersData}
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    defaultPageSize: 50,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100', '1000'],
                    showTotal: (total) => `Tổng cộng: ${total} Đảng viên vắng mặt`
                  }}
                />
              </Tabs.TabPane>

              <Tabs.TabPane tab={<strong>📊 BẢNG TỔNG HỢP CHUYÊN CẦN</strong>} key="3">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <Space>
                    <span>Chọn tháng lọc:</span>
                    <Select value={matrixMonth} onChange={(val) => setMatrixMonth(val)} style={{ width: 140 }}>
                      <Option value="ALL">Cả năm</Option>
                      <Option value="01">Tháng 1</Option>
                      <Option value="02">Tháng 2</Option>
                      <Option value="03">Tháng 3</Option>
                      <Option value="04">Tháng 4</Option>
                      <Option value="05">Tháng 5</Option>
                      <Option value="06">Tháng 6</Option>
                      <Option value="07">Tháng 7</Option>
                      <Option value="08">Tháng 8</Option>
                      <Option value="09">Tháng 9</Option>
                      <Option value="10">Tháng 10</Option>
                      <Option value="11">Tháng 11</Option>
                      <Option value="12">Tháng 12</Option>
                    </Select>
                    <Button icon={<ReloadOutlined />} onClick={fetchMatrixData} loading={loadingMatrix}>Tải lại</Button>
                  </Space>
                  <Space>
                    <Button 
                      type="dashed" 
                      icon={<UploadOutlined />} 
                      style={{ borderColor: '#fa8c16', color: '#fa8c16' }}
                      onClick={() => setIsImportModalVisible(true)}
                    >
                      Nhập file tổng hợp (Excel)
                    </Button>
                    <Button 
                      type="primary" 
                      icon={<DownloadOutlined />} 
                      style={{ backgroundColor: '#389e0d', borderColor: '#389e0d' }}
                      onClick={handleExportMatrixExcel}
                    >
                      Xuất file tổng hợp (Excel)
                    </Button>
                  </Space>
                </div>

                <Table
                  columns={matrixColumns}
                  dataSource={matrixData}
                  rowKey="mssv"
                  loading={loadingMatrix}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    defaultPageSize: 50,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100', '1000'],
                    showTotal: (total) => `Tổng cộng: ${total} Đảng viên`
                  }}
                />

                <div style={{ marginTop: 16, background: '#fafafa', padding: 12, borderRadius: 8, border: '1px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#555' }}>
                    💡 Chú thích ký hiệu bảng chuyên cần:
                  </div>
                  <Row gutter={[16, 8]} style={{ fontSize: 12 }}>
                    <Col xs={12} sm={6}>
                      <span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: 16, marginRight: 6 }}>●</span>
                      <strong>Có mặt</strong> (Đúng giờ)
                    </Col>
                    <Col xs={12} sm={6}>
                      <span style={{ color: '#fa8c16', fontWeight: 'bold', fontSize: 16, marginRight: 6 }}>▲</span>
                      <strong>Đi muộn</strong>
                    </Col>
                    <Col xs={12} sm={6}>
                      <span style={{ color: '#1890ff', fontWeight: 'bold', fontSize: 16, marginRight: 6 }}>○</span>
                      <strong>Vắng có phép</strong> (Duyệt lý do)
                    </Col>
                    <Col xs={12} sm={6}>
                      <span style={{ color: '#f5222d', fontWeight: 'bold', fontSize: 16, marginRight: 6 }}>❌</span>
                      <strong>Vắng không phép</strong>
                    </Col>
                  </Row>
                </div>
              </Tabs.TabPane>
              <Tabs.TabPane tab={<strong>👤 ĐIỂM DANH CÁ NHÂN</strong>} key="4">
                <div style={{ padding: '8px 0' }}>
                  {renderPersonalDashboard()}
                </div>
              </Tabs.TabPane>
            </Tabs>
          </Card>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '80px 0', background: '#fff', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <SafetyCertificateOutlined style={{ fontSize: 64, color: '#c62828', marginBottom: 16 }} />
          <Title level={4}>Chưa chọn buổi họp sinh hoạt</Title>
          <Paragraph style={{ color: '#888', maxWidth: 460, margin: '8px auto 20px auto' }}>
            Vui lòng chọn một buổi sinh hoạt Chi bộ ở bộ lọc góc trên bên phải hoặc nhấn vào nút "Buổi sinh hoạt mới" để thiết lập phòng họp sinh hoạt và cổng quét.
          </Paragraph>
          {isKiemTra && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              style={{ backgroundColor: '#c62828', borderColor: '#c62828' }}
              onClick={() => setIsCreateModalVisible(true)}
            >
              Thiết lập buổi sinh hoạt mới
            </Button>
          )}
        </div>
      )}

      {/* 5. Modal: Create Meeting */}
      <Modal
        title={<b>THIẾT LẬP BUỔI HỌP SINH HOẠT CHI BỘ MỚI</b>}
        open={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateMeeting}>
          <Form.Item
            name="title"
            label="Tên chủ đề buổi sinh hoạt"
            rules={[{ required: true, message: 'Nhập tên chủ đề họp!' }]}
          >
            <Input placeholder="Ví dụ: Sinh hoạt chi bộ chuyên đề tháng 5/2026..." />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Ngày sinh hoạt"
                rules={[{ required: true, message: 'Chọn ngày họp!' }]}
                initialValue={dayjs()}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="time"
                label="Giờ bắt đầu họp"
                rules={[{ required: true, message: 'Chọn giờ họp!' }]}
                initialValue={dayjs().set('hour', 19).set('minute', 0)}
              >
                <TimePicker style={{ width: '100%' }} format="HH:mm" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="location"
            label="Địa điểm tổ chức"
            rules={[{ required: true, message: 'Nhập địa điểm họp!' }]}
            initialValue="Phòng họp Chi bộ - DUE"
          >
            <Input placeholder="Số phòng, giảng đường hoặc địa chỉ trực tuyến..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsCreateModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#c62828', borderColor: '#c62828' }}>
                Khởi tạo & Mở điểm danh
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 6. Modal: Projection QR and Session Code */}
      <Modal
        title={<b>TRÌNH CHIẾU QR & MÃ SỐ ĐIỂM DANH</b>}
        open={isProjectionModalVisible}
        onCancel={() => setIsProjectionModalVisible(false)}
        footer={[
          <Button 
            key="refresh" 
            icon={<ReloadOutlined />} 
            onClick={() => ensureMeetingSessionCode(selectedMeeting, true)}
            style={{ marginRight: 8 }}
          >
            Làm mới mã số & QR
          </Button>,
          <Button key="close" type="primary" style={{ backgroundColor: '#c62828', borderColor: '#c62828' }} onClick={() => setIsProjectionModalVisible(false)}>
            Đóng trình chiếu
          </Button>
        ]}
        width={600}
        centered
        destroyOnClose
      >
        {selectedMeeting && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Title level={4} style={{ color: '#c62828', marginBottom: 8, fontWeight: 800 }}>
              ĐANG ĐIỂM DANH: {selectedMeeting.title}
            </Title>
            <Paragraph style={{ color: '#555', fontSize: 13, marginBottom: 16 }}>
              📍 Địa điểm: <strong>{selectedMeeting.location}</strong> | 📅 Ngày: <strong>{safeDayjs(selectedMeeting.date).format('DD/MM/YYYY')}</strong> | ⏰ Bắt đầu: <strong>{selectedMeeting.time}</strong>
            </Paragraph>

            {selectedMeeting.selfCheckInOpen === false ? (
              <div style={{ fontSize: 16, color: '#f5222d', fontWeight: 'bold', background: '#fff2f0', border: '1px solid #ffccc7', padding: '12px 24px', borderRadius: 8, display: 'inline-block', marginBottom: 20 }}>
                🔒 CỔNG TỰ ĐIỂM DANH (QR/MÃ SỐ) HIỆN ĐANG KHÓA
              </div>
            ) : (
              selectedMeeting.sessionCodeCreatedAt && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: '#d46b08', background: '#fffbe6', border: '1px solid #ffe58f', padding: '6px 12px', borderRadius: 8, display: 'inline-block' }}>
                    🕒 <strong>Hiệu lực của mã đến:</strong> {dayjs(selectedMeeting.sessionCodeCreatedAt).add(3, 'minute').format('HH:mm:ss')}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 'bold', color: '#c62828' }}>
                    🔄 Tự động đổi mã mới sau: {Math.floor(countdownSeconds / 60)} phút {countdownSeconds % 60} giây
                  </div>
                </div>
              )
            )}
            
            {selectedMeeting.selfCheckInOpen !== false && (
              <>
                <div style={{ background: '#f5f5f5', padding: '24px 16px', borderRadius: 12, border: '1.5px solid #d9d9d9', display: 'inline-block', width: '100%', maxWidth: 450, marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>
                    MÃ SỐ ĐIỂM DANH (SESSION CODE)
                  </div>
                  <div style={{ fontSize: 44, fontWeight: 900, color: '#c62828', fontFamily: 'monospace', letterSpacing: 6 }}>
                    {selectedMeeting.sessionCode ? selectedMeeting.sessionCode.replace(/(\d{3})(\d{3})/, '$1 $2') : '------'}
                  </div>
                </div>

                {selectedMeeting.sessionCode && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ padding: 12, background: '#fff', border: '2px solid #f0f0f0', borderRadius: 12, display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '/attendance?code=' + selectedMeeting.sessionCode)}`} 
                        alt="QR Code Điểm danh"
                        style={{ width: 250, height: 250, display: 'block' }}
                      />
                    </div>
                    <div style={{ fontSize: 13, color: '#666', maxWidth: 400, marginTop: 8 }}>
                      📱 Hướng camera điện thoại quét mã QR ở trên để <strong>điểm danh tự động nhanh</strong>, hoặc truy cập trang Điểm danh và nhập <strong>mã số 6 chữ số</strong>.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      {/* 7. Modal: Device Camera QR Scanner */}
      <Modal
        title={<b>QUÉT MÃ QR ĐIỂM DANH</b>}
        open={isQrScannerVisible}
        onCancel={stopQrScanner}
        footer={[
          <Button key="close" type="primary" style={{ backgroundColor: '#c62828', borderColor: '#c62828' }} onClick={stopQrScanner}>
            Đóng Camera
          </Button>
        ]}
        width={450}
        centered
        destroyOnClose
      >
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes qr-scanner-line {
            0% { top: 15%; }
            50% { top: 85%; }
            100% { top: 15%; }
          }
        `}} />
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          {qrScannerLoading && (
            <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Badge status="processing" color="#c62828" />
              <span style={{ fontWeight: 600, color: '#555' }}>Đang kết nối camera...</span>
            </div>
          )}
          
          {qrCameraError && (
            <div style={{ color: '#c62828', padding: '20px 10px', fontSize: 14 }}>
              ⚠️ {qrCameraError}
              <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
                Đồng chí vui lòng cấp quyền truy cập camera cho trang web hoặc nhập mã số 6 chữ số thủ công.
              </div>
            </div>
          )}

          <div style={{ 
            position: 'relative', 
            display: qrScannerLoading || qrCameraError ? 'none' : 'block', 
            width: '100%', 
            maxWidth: 360, 
            margin: '0 auto', 
            overflow: 'hidden', 
            borderRadius: 12, 
            border: '3px solid #c62828', 
            boxShadow: '0 4px 16px rgba(198, 40, 40, 0.15)' 
          }}>
            <video 
              ref={qrVideoRef} 
              style={{ width: '100%', height: 'auto', display: 'block' }} 
              playsInline 
            />
            <canvas ref={qrCanvasRef} style={{ display: 'none' }} />
            
            {/* Viewfinder target overlay box */}
            <div style={{
              position: 'absolute',
              top: '15%',
              left: '15%',
              width: '70%',
              height: '70%',
              border: '2px dashed rgba(255,255,255,0.6)',
              borderRadius: 8,
              pointerEvents: 'none'
            }} />
            
            {/* Scanner overlay viewfinder line */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '15%',
              width: '70%',
              height: '2px',
              backgroundColor: '#c62828',
              boxShadow: '0 0 8px #c62828',
              animation: 'qr-scanner-line 2s infinite ease-in-out',
              pointerEvents: 'none'
            }} />
          </div>
          
          <div style={{ fontSize: 13, color: '#666', marginTop: 16, padding: '0 12px' }}>
            📱 Hướng camera về phía <strong>Mã QR điểm danh</strong> hiển thị trên màn hình máy chiếu của cuộc họp.
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default Attendance;
