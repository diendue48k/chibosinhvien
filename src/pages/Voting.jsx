import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card, Row, Col, Typography, Button, Table, Tag, Space, Modal, Form, Input,
  Select, InputNumber, message, Tabs, Progress, Avatar, Popconfirm,
  Empty, Spin, Divider, Alert, Badge
} from 'antd';
import {
  AuditOutlined, PlusOutlined, CheckCircleOutlined, LockOutlined,
  UserOutlined, TeamOutlined, BarChartOutlined, SendOutlined,
  MailOutlined, DeleteOutlined, SafetyCertificateOutlined,
  CheckOutlined, CloseOutlined, DownloadOutlined, FileExcelOutlined,
  SearchOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where
} from 'firebase/firestore';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../services/permissionService';
import dayjs from 'dayjs';
import { API_BASE_URL } from '../config';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const PIE_COLORS = ['#52c41a', '#ff4d4f'];

// ============================================================
// HELPER: Avatar resolver
// ============================================================
const getAvatarUrl = (url) => {
  if (!url || typeof url !== 'string') return undefined;
  const driveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)\//;
  const match = url.match(driveRegex);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w500`;
  }
  return url;
};

// ============================================================
// HELPER: Score color
// ============================================================
const academicColor = (s) => s >= 8 ? '#52c41a' : s >= 6.5 ? '#faad14' : '#ff4d4f';
const conductColor = (s) => s >= 80 ? '#52c41a' : s >= 65 ? '#faad14' : '#ff4d4f';

// ============================================================
// HELPER: Email HTML template
// ============================================================
const buildEmailHtml = (session, candidates, origin) => {
  const typeLabel = session.type === 'ADMISSION' ? 'Kết nạp Đảng viên' : 'Công nhận Đảng viên chính thức';
  const candRows = candidates.map((c, i) => `
    <tr style="border-bottom:1px solid #f0f0f0; background:${i % 2 === 0 ? '#fff' : '#fafafa'};">
      <td style="padding:10px 12px;font-weight:700;color:#c62828;">${i + 1}</td>
      <td style="padding:10px 12px;font-weight:700;">${c.name}</td>
      <td style="padding:10px 12px;">${c.faculty}</td>
      <td style="padding:10px 12px;">${c.class}</td>
      <td style="padding:10px 12px;text-align:center;"><strong>${c.academicScore}/10</strong></td>
      <td style="padding:10px 12px;text-align:center;"><strong>${c.conductScore}/100</strong></td>
    </tr>
  `).join('');

  return `
    <div style="font-family:'Inter',-apple-system,sans-serif;max-width:640px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.05);">
      <div style="background:linear-gradient(135deg,#c62828 0%,#8e0000 100%);padding:28px 32px;">
        <div style="font-size:11px;color:rgba(255,255,255,0.7);font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">
          CHI BỘ SINH VIÊN · ĐẢNG BỘ ĐH KINH TẾ
        </div>
        <div style="font-size:22px;color:#fff;font-weight:900;text-transform:uppercase;">PHIÊN BIỂU QUYẾT</div>
        <div style="margin-top:8px;font-size:16px;color:rgba(255,255,255,0.85);font-weight:600;">${session.title}</div>
      </div>
      <div style="padding:28px 32px;background:#fff;">
        <p style="font-size:14px;color:#333;line-height:1.8;margin-bottom:20px;">
          Kính gửi các đồng chí Đảng viên chính thức,<br/><br/>
          Chi ủy Chi bộ Sinh viên trân trọng thông báo về phiên biểu quyết
          <strong style="color:#c62828;">${typeLabel}</strong>.
          Đề nghị các đồng chí thực hiện biểu quyết đầy đủ và đúng thời hạn.
        </p>
        <div style="background:#fff9f9;border-left:4px solid #c62828;padding:14px 18px;border-radius:0 6px 6px 0;margin-bottom:24px;">
          <div style="font-size:13px;color:#c62828;font-weight:700;margin-bottom:6px;">📋 THÔNG TIN PHIÊN</div>
          <div style="font-size:13px;color:#333;line-height:1.8;">
            • Loại biểu quyết: <strong>${typeLabel}</strong><br/>
            • Số ứng viên: <strong>${candidates.length} đồng chí</strong><br/>
            • Ngày mở: <strong>${dayjs(session.createdAt).format('HH:mm DD/MM/YYYY')}</strong>
          </div>
        </div>
        <div style="font-size:13px;font-weight:700;color:#333;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">DANH SÁCH ỨNG VIÊN</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #f0f0f0;border-radius:6px;overflow:hidden;">
          <thead>
            <tr style="background:#c62828;">
              <th style="padding:10px 12px;color:#fff;text-align:left;width:32px;">STT</th>
              <th style="padding:10px 12px;color:#fff;text-align:left;">Họ và Tên</th>
              <th style="padding:10px 12px;color:#fff;text-align:left;">Khoa</th>
              <th style="padding:10px 12px;color:#fff;text-align:left;">Lớp</th>
              <th style="padding:10px 12px;color:#fff;text-align:center;">ĐTB</th>
              <th style="padding:10px 12px;color:#fff;text-align:center;">RL</th>
            </tr>
          </thead>
          <tbody>${candRows}</tbody>
        </table>
        <div style="text-align:center;margin-top:28px;">
          <a href="${origin}/voting"
            style="display:inline-block;background:linear-gradient(135deg,#c62828,#8e0000);color:#fff;font-weight:800;font-size:14px;text-decoration:none;padding:14px 36px;border-radius:6px;letter-spacing:0.5px;text-transform:uppercase;">
            🗳️ THỰC HIỆN BIỂU QUYẾT NGAY
          </a>
        </div>
        <p style="font-size:12px;color:#999;text-align:center;margin-top:20px;line-height:1.6;">
          Biểu quyết là quyền và nghĩa vụ của mỗi Đảng viên chính thức.<br/>
          Mọi thắc mắc vui lòng liên hệ Ban Chấp hành Chi bộ.
        </p>
      </div>
      <div style="background:#f5f5f5;padding:14px 32px;border-top:1px solid #e0e0e0;text-align:center;font-size:11px;color:#8c8c8c;">
        Hệ thống Quản lý Chi bộ Sinh viên · ĐH Kinh tế · ${dayjs().format('DD/MM/YYYY')}
      </div>
    </div>
  `;
};

// ============================================================
// PREMIUM HIGH-FIDELITY SVG COMPONENTS
// ============================================================
const SvgVote = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle', marginRight: 6, display: 'inline-block' }}>
    <path d="M19 13V19C19 20.1046 18.1046 21 17 21H7C5.89543 21 5 20.1046 5 19V13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 3V13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 7L12 3L16 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 13H22" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SvgProgress = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle', marginRight: 6, display: 'inline-block' }}>
    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23 21V19C22.9993 18.1137 22.6944 17.2521 22.135 16.5598C21.5757 15.8675 20.7937 15.3855 19.92 15.2C19.34 15.04 18.72 15 18.1 15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 3.13C16.8804 3.31018 17.6719 3.79152 18.2575 4.49896C18.8431 5.20641 19.1867 6.09633 19.237 7.03C19.2872 7.96367 19.0411 8.88726 18.536 9.66C18.0308 10.4327 17.2963 11.0097 16.44 11.31" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SvgResults = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle', marginRight: 6, display: 'inline-block' }}>
    <path d="M18 20V10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 20V4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 20V14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SvgPassed = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <circle cx="24" cy="24" r="20" fill="#f6ffed" stroke="#52c41a" strokeWidth="3"/>
    <path d="M16 24L21 29L32 18" stroke="#52c41a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SvgFailed = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <circle cx="24" cy="24" r="20" fill="#fff1f0" stroke="#ff4d4f" strokeWidth="3"/>
    <path d="M17 17L31 31" stroke="#ff4d4f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M31 17L17 31" stroke="#ff4d4f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SvgArrowRight = ({ size = 16, color = '#ffffff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle', marginLeft: 6, display: 'inline-block' }}>
    <path d="M5 12H19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 5L19 12L12 19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SvgArrowLeft = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle', marginRight: 6, display: 'inline-block' }}>
    <path d="M19 12H5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 19L5 12L12 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SvgAward = ({ size = 18, color = '#c62828' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle', marginRight: 6, display: 'inline-block' }}>
    <circle cx="12" cy="8" r="6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15.477 12.89L17 22L12 19L7 22L8.523 12.89" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SvgMail = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle', marginRight: 6, display: 'inline-block' }}>
    <rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 6L12 13L2 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SvgLock = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle', marginRight: 6, display: 'inline-block' }}>
    <rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SvgDelete = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle', marginRight: 6, display: 'inline-block' }}>
    <path d="M3 6H5H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SvgPlus = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle', marginRight: 6, display: 'inline-block' }}>
    <path d="M12 5V19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 12H19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ============================================================
// MAIN COMPONENT
// ============================================================
const Voting = () => {
  const { currentUser } = useAuth();

  // Role flags
  const canManage = [ROLES.BITHU, ROLES.ADMIN].includes(currentUser?.role);
  const canMonitor = canManage || [ROLES.CAPUY, ROLES.PHOBIHU, ROLES.KIEMTRA].includes(currentUser?.role);
  
  // Data states
  const [officialMembers, setOfficialMembers] = useState([]);
  
  // Verify official member status for voting rights
  const isOfficialMember = useMemo(() => {
    if (!currentUser) return false;
    const managerRoles = [ROLES.ADMIN, ROLES.BITHU, ROLES.CAPUY, ROLES.PHOBIHU, ROLES.KIEMTRA, ROLES.OFFICIAL_MANAGER, ROLES.ADMISSION_MANAGER];
    if (managerRoles.includes(currentUser.role)) return true;
    
    return officialMembers.some(m => 
       m.mssv === currentUser.mssv || 
       m.id === currentUser.id || 
       m.mssv === currentUser.username
    );
  }, [currentUser, officialMembers]);

  const canVote = isOfficialMember;

  // ── Data
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [votes, setVotes] = useState([]);

  // ── Loading flags
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  // ── Voting state
  const [myVoteMap, setMyVoteMap] = useState({});  // { candidateId: 'APPROVE'|'REJECT' }
  const [voteReasons, setVoteReasons] = useState({}); // { candidateId: 'Lý do...' }
  const [hasVoted, setHasVoted] = useState(false);

  // ── UI
  const [detailTab, setDetailTab] = useState('vote');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const fileInputRef = useRef(null);

  // ── Database Pull Selector State
  const [pullModalOpen, setPullModalOpen] = useState(false);
  const [pullSourceType, setPullSourceType] = useState('');
  const [pullDataList, setPullDataList] = useState([]);
  const [loadingPull, setLoadingPull] = useState(false);
  const [selectedPullRowKeys, setSelectedPullRowKeys] = useState([]);
  const [selectedPullRows, setSelectedPullRows] = useState([]);
  const [pullSearchText, setPullSearchText] = useState('');

  // ============================================================
  // TEMPLATE EXCEL FOR CANDIDATES
  // ============================================================
  const handleDownloadTemplate = () => {
    try {
      const wsData = [
        ["Họ và tên", "Lớp", "Khoa", "ĐTB Học tập", "Điểm Rèn luyện", "Quá trình công tác & rèn luyện"],
        ["Nguyễn Văn A", "51QT01", "Quản trị KD", 8.5, 90, "Lớp trưởng, Ủy viên BCH Liên chi đoàn khoa, Sinh viên 5 tốt cấp Trường năm học 2024-2025."],
        ["Trần Thị B", "51TC02", "Tài chính - Ngân hàng", 9.2, 95, "Ủy viên BCH Hội Sinh viên trường, đạt giải Nhất NCKH cấp Trường."],
        ["Lê Văn C", "51KT03", "Kế toán", 7.8, 85, "Thành viên tích cực CLB Tình nguyện, tích cực tham gia các hoạt động Đoàn Hội."]
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths for better styling
      ws['!cols'] = [
        { wch: 20 }, // Họ và tên
        { wch: 10 }, // Lớp
        { wch: 20 }, // Khoa
        { wch: 15 }, // ĐTB Học tập
        { wch: 15 }, // Điểm Rèn luyện
        { wch: 55 }  // Quá trình công tác
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Mau_Ung_Vien");
      XLSX.writeFile(wb, "Mau_Danh_Sach_Ung_Vien.xlsx");
      message.success("Đã tải xuống file Excel mẫu thành công.");
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi tải xuống file mẫu: " + e.message);
    }
  };

  // ============================================================
  // IMPORT CANDIDATES FROM EXCEL
  // ============================================================
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rawJson.length < 2) {
          message.error("File Excel không có dữ liệu ứng viên.");
          return;
        }

        const headers = rawJson[0].map(h => (h || '').toString().trim());
        const rows = rawJson.slice(1);

        // Map columns dynamically
        const nameIdx = headers.findIndex(h => /họ\s*và\s*tên|họ\s*tên|tên/i.test(h));
        const classIdx = headers.findIndex(h => /lớp/i.test(h));
        const facultyIdx = headers.findIndex(h => /khoa/i.test(h));
        const academicIdx = headers.findIndex(h => /học\s*tập|đtb|điểm\s*tb|gpa/i.test(h));
        const conductIdx = headers.findIndex(h => /rèn\s*luyện|đrl/i.test(h));
        const processIdx = headers.findIndex(h => /quá\s*trình|công\s*tác|ghi\s*chú|mô\s*tả/i.test(h));

        if (nameIdx === -1) {
          message.error("Không tìm thấy cột 'Họ và tên' hoặc 'Tên' trong file Excel.");
          return;
        }

        const importedCandidates = [];
        let skippedRows = 0;

        rows.forEach((row) => {
          const nameVal = row[nameIdx]?.toString().trim() || '';
          if (!nameVal) {
            skippedRows++;
            return;
          }

          const classVal = classIdx !== -1 ? (row[classIdx]?.toString().trim() || '') : '';
          const facultyVal = facultyIdx !== -1 ? (row[facultyIdx]?.toString().trim() || '') : '';

          // Parse scores, clamp them, and format them
          let academicVal = 0;
          if (academicIdx !== -1) {
            const rawScore = parseFloat(row[academicIdx]);
            if (!isNaN(rawScore)) {
              academicVal = Math.max(0, Math.min(10, parseFloat(rawScore.toFixed(2))));
            }
          }

          let conductVal = 0;
          if (conductIdx !== -1) {
            const rawScore = parseInt(row[conductIdx], 10);
            if (!isNaN(rawScore)) {
              conductVal = Math.max(0, Math.min(100, rawScore));
            }
          }

          const processVal = processIdx !== -1 ? (row[processIdx]?.toString().trim() || '') : '';

          importedCandidates.push({
            name: nameVal,
            class: classVal,
            faculty: facultyVal,
            academicScore: academicVal,
            conductScore: conductVal,
            processDescription: processVal
          });
        });

        if (importedCandidates.length === 0) {
          message.warning("Không nhập được ứng viên nào hợp lệ từ file.");
          return;
        }

        // Complete drop-in replacement in the Form
        createForm.setFieldsValue({ candidates: importedCandidates });

        let successMsg = `Đã nhập thành công ${importedCandidates.length} ứng viên từ file Excel.`;
        if (skippedRows > 0) {
          successMsg += ` (Bỏ qua ${skippedRows} dòng trống không có Họ tên).`;
        }
        message.success(successMsg);
      } catch (err) {
        console.error(err);
        message.error("Lỗi khi đọc file Excel: " + err.message);
      }
      e.target.value = null; // Reset to allow re-upload of same file
    };
    reader.readAsBinaryString(file);
  };

  // ============================================================
  // DATABASE CANDIDATE PULL SYSTEM
  // ============================================================
  const handleOpenPullModal = async (source) => {
    setPullSourceType(source);
    setPullModalOpen(true);
    setLoadingPull(true);
    setSelectedPullRowKeys([]);
    setSelectedPullRows([]);
    setPullSearchText('');
    
    try {
      if (source === 'dang_vien') {
        const snap = await getDocs(collection(db, 'dang_vien'));
        const list = snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            mssv: data.mssv || data.MSSV || data.masv || data.ma_sv || data.MaSV || '',
            ho_ten: data.ho_ten || data.hoten || '',
            lop: data.lop || data.Lop || '',
            khoa: data.khoa || data.Khoa || ''
          };
        });
        setPullDataList(list);
      } else if (source === 'ho_so_ket_nap') {
        const snap = await getDocs(collection(db, 'ho_so_ket_nap'));
        const list = snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            mssv: data.mssv || data.MSSV || data.masv || data.ma_sv || data.MaSV || '',
            ho_ten: data.ho_ten || data.hoten || '',
            lop: data.lop || data.Lop || '',
            khoa: data.khoa || data.Khoa || ''
          };
        }).filter(item => !item.trangthai || Number(item.trangthai) < 8); // Chỉ lấy hồ sơ kết nạp đang làm (trangthai < 8)
        setPullDataList(list);
      } else if (source === 'ho_so_chinh_thuc') {
        const snapHS = await getDocs(collection(db, 'ho_so_chinh_thuc'));
        const hsList = snapHS.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(hs => hs.trang_thai === 'dang_lam_thu_tuc' || hs.trang_thai !== 'chinh_thuc'); // Chỉ lấy hồ sơ chính thức đang làm
        
        const snapDV = await getDocs(collection(db, 'dang_vien'));
        const dvList = snapDV.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const merged = hsList.map(hs => {
          const dv = dvList.find(d => 
            (hs.dang_vien_id && d.id === hs.dang_vien_id) || 
            (hs.dangvien_id && d.id === hs.dangvien_id) || 
            (hs.mssv && d.mssv === hs.mssv) || 
            (hs.MSSV && d.mssv === hs.MSSV)
          ) || {};
          const mssvVal = hs.mssv || hs.MSSV || dv.mssv || dv.MSSV || 'N/A';
          const nameVal = hs.ho_ten || hs.hoten || dv.ho_ten || dv.hoten || 'N/A';
          const lopVal = hs.lop || hs.Lop || dv.lop || '';
          const khoaVal = hs.khoa || hs.Khoa || dv.khoa || '';
          return {
            id: hs.id,
            ...hs,
            mssv: mssvVal,
            ho_ten: nameVal,
            lop: lopVal,
            khoa: khoaVal,
            anh_ca_nhan: hs.anh_ca_nhan || dv.anh_ca_nhan || ''
          };
        });
        setPullDataList(merged);
      }
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi tải danh sách: " + e.message);
    } finally {
      setLoadingPull(false);
    }
  };

  const handleConfirmPull = () => {
    if (selectedPullRows.length === 0) {
      message.warning("Vui lòng chọn ít nhất 1 ứng viên!");
      return;
    }
    
    const mapped = selectedPullRows.map(row => {
      let nameVal = '';
      let classVal = '';
      let facultyVal = '';
      let picVal = '';
      let descVal = '';
      let academicVal = 8.0;
      let conductVal = 85;

      if (pullSourceType === 'dang_vien') {
        nameVal = row.ho_ten || '';
        classVal = row.lop || '';
        facultyVal = row.khoa || '';
        picVal = row.anh_ca_nhan || '';
        academicVal = 8.0;
        conductVal = 85;
        descVal = row.nhom ? `Nhóm sinh hoạt: ${row.nhom}` : '';
      } else if (pullSourceType === 'ho_so_ket_nap') {
        nameVal = row.ho_ten || row.hoten || '';
        classVal = row.lop || '';
        facultyVal = row.khoa || '';
        picVal = row.anh_ca_nhan || '';
        academicVal = 8.0;
        conductVal = 85;
        descVal = row.dangvienhuongdan ? `Đảng viên hướng dẫn: ${row.dangvienhuongdan}` : '';
      } else if (pullSourceType === 'ho_so_chinh_thuc') {
        nameVal = row.ho_ten || row.hoten || '';
        classVal = row.lop || '';
        facultyVal = row.khoa || '';
        picVal = row.anh_ca_nhan || '';
        academicVal = 8.0;
        conductVal = 85;
        descVal = row.da_hoc_lop ? `Đã học lớp bồi dưỡng: ${row.da_hoc_lop}` : '';
      }

      return {
        name: nameVal,
        class: classVal,
        faculty: facultyVal,
        academicScore: academicVal,
        conductScore: conductVal,
        processDescription: descVal,
        anh_ca_nhan: picVal
      };
    });

    const currentCandidates = createForm.getFieldValue('candidates') || [];
    const cleaned = currentCandidates.filter(c => c.name);
    const newCandidatesList = [...cleaned, ...mapped];

    createForm.setFieldsValue({ candidates: newCandidatesList });
    message.success(`Đã tự động điền thành công ${mapped.length} ứng viên vào danh sách.`);
    setPullModalOpen(false);
  };

  // ============================================================
  // LOAD SESSIONS
  // ============================================================
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const snap = await getDocs(collection(db, 'voting_sessions'));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setSessions(list);
    } catch (e) {
      console.error(e);
      message.error('Lỗi tải danh sách phiên biểu quyết');
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  // ============================================================
  // LOAD OFFICIAL MEMBERS (dang_vien_du_bi === false)
  // ============================================================
  const loadOfficialMembers = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'dang_vien'));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(dv =>
          (dv.dang_vien_du_bi === false || dv.loai_dang_vien === 'Chính thức' || (dv.dang_vien_du_bi !== true && dv.loai_dang_vien !== 'Dự bị')) &&
          (!dv.trang_thai || dv.trang_thai === 'dang_sinh_hoat')
        );
      setOfficialMembers(list);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    loadOfficialMembers();
  }, [loadSessions, loadOfficialMembers]);

  // ============================================================
  // LOAD SESSION DETAIL
  // ============================================================
  const loadSessionDetail = useCallback(async (session) => {
    setLoadingDetail(true);
    setSelectedSession(session);
    setMyVoteMap({});
    setVoteReasons({});
    setHasVoted(false);

    try {
      // Candidates
      const cQ = query(collection(db, 'voting_candidates'), where('sessionId', '==', session.id));
      const cSnap = await getDocs(cQ);
      const cList = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCandidates(cList);

      // Votes
      const vQ = query(collection(db, 'voting_votes'), where('sessionId', '==', session.id));
      const vSnap = await getDocs(vQ);
      const vList = vSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVotes(vList);

      // Check if current user already voted
      const myId = currentUser?.id || currentUser?.username;
      const myMssv = currentUser?.mssv || currentUser?.username;
      const myVotes = vList.filter(v => v.voterId === myId || v.voterMssv === myMssv);
      if (cList.length > 0 && myVotes.length >= cList.length) {
        setHasVoted(true);
      }
    } catch (e) {
      console.error(e);
      message.error('Lỗi tải chi tiết phiên biểu quyết');
    } finally {
      setLoadingDetail(false);
    }
  }, [currentUser]);

  const handleSelectSession = (session) => {
    loadSessionDetail(session);
    setDetailTab(canVote ? 'vote' : (canMonitor ? 'progress' : 'vote'));
  };

  const handleApproveAll = () => {
    const newMap = {};
    candidates.forEach(c => {
      newMap[c.id] = 'APPROVE';
    });
    setMyVoteMap(newMap);
    message.success("Đã chọn Đồng ý cho tất cả ứng viên. Vui lòng kiểm tra lại trước khi nhấn Xác nhận!");
  };

  const handleDeleteSession = async () => {
    if (!selectedSession) return;
    try {
      const sessionId = selectedSession.id;
      
      // 1. Delete candidates
      const candSnap = await getDocs(query(collection(db, 'voting_candidates'), where('sessionId', '==', sessionId)));
      await Promise.all(candSnap.docs.map(d => deleteDoc(doc(db, 'voting_candidates', d.id))));

      // 2. Delete votes
      const voteSnap = await getDocs(query(collection(db, 'voting_votes'), where('sessionId', '==', sessionId)));
      await Promise.all(voteSnap.docs.map(d => deleteDoc(doc(db, 'voting_votes', d.id))));

      // 3. Delete session itself
      await deleteDoc(doc(db, 'voting_sessions', sessionId));

      message.success("Đã xóa vĩnh viễn phiên biểu quyết thành công.");
      setSelectedSession(null);
      setCandidates([]);
      setVotes([]);
      await loadSessions();
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi xóa phiên biểu quyết: " + e.message);
    }
  };

  // ============================================================
  // CREATE SESSION
  // ============================================================
  const handleCreateSession = async () => {
    try {
      const values = await createForm.validateFields();
      setCreatingSession(true);

      const sessionDoc = await addDoc(collection(db, 'voting_sessions'), {
        title: values.title,
        type: values.type,
        status: 'OPEN',
        createdBy: currentUser?.name || 'Bí thư',
        createdAt: new Date().toISOString(),
      });

      await Promise.all(
        (values.candidates || []).map(c =>
          addDoc(collection(db, 'voting_candidates'), {
            sessionId: sessionDoc.id,
            name: c.name || '',
            class: c.class || '',
            faculty: c.faculty || '',
            academicScore: c.academicScore ?? 0,
            conductScore: c.conductScore ?? 0,
            processDescription: c.processDescription || '',
            anh_ca_nhan: c.anh_ca_nhan || '',
          })
        )
      );

      message.success(`Đã tạo phiên biểu quyết với ${(values.candidates || []).length} ứng viên!`);
      setCreateModalOpen(false);
      createForm.resetFields();
      await loadSessions();
    } catch (e) {
      if (!e.errorFields) {
        console.error(e);
        message.error('Lỗi tạo phiên: ' + e.message);
      }
    } finally {
      setCreatingSession(false);
    }
  };

  // ============================================================
  // SUBMIT VOTE
  // ============================================================
  const handleSubmitVote = async () => {
    const unvoted = candidates.filter(c => !myVoteMap[c.id]);
    if (unvoted.length > 0) {
      message.warning(`Vui lòng biểu quyết đủ cho tất cả ${candidates.length} ứng viên!`);
      return;
    }

    const missingReasons = candidates.filter(c => myVoteMap[c.id] === 'REJECT' && !(voteReasons[c.id] || '').trim());
    if (missingReasons.length > 0) {
      message.error(`Vui lòng điền lý do Không đồng ý cho ứng viên: ${missingReasons.map(c => c.name).join(', ')}`);
      return;
    }

    setSubmittingVote(true);
    try {
      await Promise.all(
        candidates.map(c =>
          addDoc(collection(db, 'voting_votes'), {
            sessionId: selectedSession.id,
            candidateId: c.id,
            candidateName: c.name,
            voterId: currentUser?.id || currentUser?.username,
            voterMssv: currentUser?.mssv || currentUser?.username,
            voterName: currentUser?.name || '',
            decision: myVoteMap[c.id],
            reason: myVoteMap[c.id] === 'REJECT' ? (voteReasons[c.id] || '').trim() : '',
            createdAt: new Date().toISOString(),
          })
        )
      );
      message.success('✅ Phiếu biểu quyết của đồng chí đã được ghi nhận!');
      setHasVoted(true);
      await loadSessionDetail(selectedSession);
    } catch (e) {
      console.error(e);
      message.error('Lỗi ghi nhận phiếu: ' + e.message);
    } finally {
      setSubmittingVote(false);
    }
  };

  // ============================================================
  // CLOSE SESSION
  // ============================================================
  const handleCloseSession = async () => {
    try {
      await updateDoc(doc(db, 'voting_sessions', selectedSession.id), {
        status: 'CLOSED',
        closedAt: new Date().toISOString(),
        closedBy: currentUser?.name,
      });
      const updated = { ...selectedSession, status: 'CLOSED' };
      setSelectedSession(updated);
      setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
      message.success('Đã đóng phiên biểu quyết!');
      setDetailTab('results');
    } catch (e) {
      message.error('Lỗi đóng phiên: ' + e.message);
    }
  };

  // ============================================================
  // SEND NOTIFICATION + EMAIL
  // ============================================================
  const handleSendNotification = async () => {
    setSendingNotif(true);
    try {
      const typeLabel = selectedSession.type === 'ADMISSION' ? 'kết nạp Đảng viên' : 'công nhận Đảng viên chính thức';
      const candLines = candidates.map((c, i) => `${i + 1}. ${c.name} (${c.faculty} - Lớp ${c.class})`).join('\n');

      // 1. Save notification to Firestore
      await addDoc(collection(db, 'notifications'), {
        title: `[Biểu quyết] ${selectedSession.title}`,
        content: `Chi bộ Sinh viên kính mời toàn thể Đảng viên chính thức tham gia biểu quyết về việc ${typeLabel}.\n\nDanh sách ứng viên:\n${candLines}\n\nVui lòng đăng nhập hệ thống để thực hiện biểu quyết.`,
        created_at: new Date().toISOString(),
        created_by: currentUser?.name || 'Bí thư Chi bộ',
        recipient_type: 'tat_ca',
        send_email: true,
        session_id: selectedSession.id,
        recipients: officialMembers.map(m => ({
          id: m.id, mssv: m.mssv, ho_ten: m.ho_ten,
          email: m.email || m.email_sv || ''
        }))
      });

      // 2. Send email to all official members
      const emails = officialMembers.map(m => m.email || m.email_sv).filter(Boolean);
      if (emails.length === 0) {
        message.warning('Đã lưu thông báo nhưng không có email Đảng viên chính thức nào để gửi!');
        return;
      }

      const htmlBody = buildEmailHtml(selectedSession, candidates, window.location.origin);

      const resp = await fetch(`${API_BASE_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bcc: emails.join(', '),
          subject: `[Biểu quyết Chi bộ] ${selectedSession.title}`,
          html: htmlBody,
        })
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Gửi email thất bại');

      message.success(`✅ Đã gửi thông báo + email đến ${emails.length} Đảng viên chính thức!`);
    } catch (e) {
      console.error(e);
      message.error('Lỗi gửi thông báo: ' + e.message);
    } finally {
      setSendingNotif(false);
    }
  };

  // ============================================================
  // COMPUTED: Vote progress
  // ============================================================
  const voteProgress = useMemo(() => {
    if (!selectedSession || candidates.length === 0) return { voted: [], notVoted: officialMembers };

    // Count votes per voter
    const voterMap = {};
    votes.forEach(v => {
      const key = v.voterId;
      if (!voterMap[key]) voterMap[key] = { name: v.voterName, mssv: v.voterMssv, count: 0 };
      voterMap[key].count++;
    });

    const voted = Object.entries(voterMap)
      .filter(([, v]) => v.count >= candidates.length)
      .map(([id, v]) => ({ id, name: v.name, mssv: v.mssv }));

    const votedIdSet = new Set(voted.map(v => v.id));
    const votedMssvSet = new Set(voted.map(v => v.mssv).filter(Boolean));

    const notVoted = officialMembers.filter(m =>
      !votedIdSet.has(m.id) && !votedMssvSet.has(m.mssv)
    );

    return { voted, notVoted };
  }, [selectedSession, candidates, votes, officialMembers]);

  // ============================================================
  // COMPUTED: Results per candidate
  // ============================================================
  const results = useMemo(() => {
    return candidates.map(cand => {
      const cv = votes.filter(v => v.candidateId === cand.id);
      const approve = cv.filter(v => v.decision === 'APPROVE').length;
      const reject = cv.filter(v => v.decision === 'REJECT').length;
      const total = approve + reject;
      const rate = total > 0 ? Math.round((approve / total) * 100) : 0;
      return { candidate: cand, approve, reject, total, rate, passed: rate > 50 && total > 0 };
    });
  }, [candidates, votes]);

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const typeTag = (type) =>
    type === 'ADMISSION'
      ? <Tag color="blue" style={{ fontWeight: 700 }}>Kết nạp Đảng</Tag>
      : <Tag color="purple" style={{ fontWeight: 700 }}>Công nhận chính thức</Tag>;

  const statusBadge = (status) =>
    status === 'OPEN'
      ? <Badge status="processing" text={<span style={{ color: '#52c41a', fontWeight: 700 }}>Đang mở</span>} />
      : <Badge status="default" text={<span style={{ color: '#8c8c8c', fontWeight: 700 }}>Đã đóng</span>} />;

  // ============================================================
  // RENDER: Candidate vote card
  // ============================================================
  const renderVoteCard = (cand) => {
    const decision = myVoteMap[cand.id];
    
    // Premium HSL themed highlights representing decision values
    const accentColor = decision === 'APPROVE' ? '#52c41a' : decision === 'REJECT' ? '#ff4d4f' : '#bfbfbf';
    const borderStyle = decision 
      ? `2.5px solid ${accentColor}`
      : '1.5px solid rgba(0,0,0,0.06)';
      
    const cardShadow = decision
      ? `0 10px 30px rgba(${decision === 'APPROVE' ? '82,196,26' : '255,77,79'}, 0.08)`
      : '0 4px 16px rgba(0,0,0,0.03)';

    return (
      <Card 
        key={cand.id} 
        bordered={false}
        style={{ 
          borderRadius: 14, 
          marginBottom: 20, 
          border: borderStyle,
          boxShadow: cardShadow,
          transition: 'all 0.3s ease',
          background: decision === 'APPROVE' ? 'linear-gradient(180deg, #f6ffed 0%, #ffffff 100%)' : decision === 'REJECT' ? 'linear-gradient(180deg, #fff1f0 0%, #ffffff 100%)' : '#ffffff'
        }}
      >
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} md={15}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
              <Avatar 
                size={70} 
                src={getAvatarUrl(cand.anh_ca_nhan)} 
                icon={<UserOutlined />} 
                style={{ 
                  border: '2.5px solid #c62828', 
                  boxShadow: '0 4px 12px rgba(198, 40, 40, 0.15)', 
                  flexShrink: 0 
                }} 
              />
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a1a', letterSpacing: '-0.3px' }}>{cand.name}</div>
                <Space size={6} style={{ marginTop: 6 }}>
                  <Tag style={{ borderRadius: 4, fontWeight: 600 }}>{cand.class}</Tag>
                  <Tag color="blue" style={{ borderRadius: 4, fontWeight: 600 }}>{cand.faculty}</Tag>
                </Space>
              </div>
            </div>

            <Row gutter={16} style={{ marginBottom: 18 }}>
              <Col span={12}>
                <div style={{ padding: '12px 16px', background: '#f6ffed', borderRadius: 10, border: '1.5px solid #d9f7be' }}>
                  <div style={{ fontSize: 11, color: '#389e0d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Điểm học tập</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: academicColor(cand.academicScore) }}>
                    {cand.academicScore} <span style={{ fontSize: 13, fontWeight: 600, color: '#8c8c8c' }}>/ 10</span>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ padding: '12px 16px', background: '#e6f7ff', borderRadius: 10, border: '1.5px solid #bae7ff' }}>
                  <div style={{ fontSize: 11, color: '#096dd9', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Điểm rèn luyện</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: conductColor(cand.conductScore) }}>
                    {cand.conductScore} <span style={{ fontSize: 13, fontWeight: 600, color: '#8c8c8c' }}>/ 100</span>
                  </div>
                </div>
              </Col>
            </Row>

            <div style={{ borderTop: '1px dashed #e8e8e8', paddingTop: 16 }}>
              <div style={{ fontSize: 13, color: '#262626', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <SvgAward size={18} color="#c62828" />
                Quá trình công tác, rèn luyện
              </div>
              <div style={{
                fontSize: 13.5, color: '#434343', lineHeight: 1.8,
                background: '#fff9f9', padding: '14px 18px', borderRadius: 10,
                borderLeft: '4px solid #c62828', whiteSpace: 'pre-wrap',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
              }}>
                {cand.processDescription ? cand.processDescription : <span style={{ color: '#bfbfbf', fontStyle: 'italic' }}>(Không có dữ liệu quá trình công tác)</span>}
              </div>
            </div>
          </Col>

          <Col xs={24} md={9}>
            <div style={{ textAlign: 'center', padding: '8px 12px', borderLeft: '1px solid rgba(0,0,0,0.05)', minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {hasVoted ? (
                <div>
                  <CheckCircleOutlined style={{ fontSize: 56, color: '#52c41a' }} />
                  <div style={{ marginTop: 10, fontWeight: 800, color: '#52c41a', fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Đã biểu quyết</div>
                </div>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Biểu quyết của đồng chí:</div>
                  <Button 
                    block 
                    size="large" 
                    type={decision === 'APPROVE' ? 'primary' : 'default'}
                    icon={<CheckOutlined />}
                    onClick={() => setMyVoteMap(prev => ({ ...prev, [cand.id]: 'APPROVE' }))}
                    style={decision === 'APPROVE'
                      ? { backgroundColor: '#52c41a', borderColor: '#52c41a', fontWeight: 800, minHeight: 48, height: 'auto', borderRadius: 8, fontSize: 13, whiteSpace: 'normal', padding: '8px 12px' }
                      : { minHeight: 48, height: 'auto', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'normal', padding: '8px 12px' }}
                  >
                    {selectedSession?.type === 'ADMISSION' ? 'ĐỒNG Ý CHO KẾT NẠP ĐẢNG' : 'ĐỒNG Ý CÔNG NHẬN ĐẢNG VIÊN CHÍNH THỨC'}
                  </Button>
                  <Button 
                    block 
                    size="large" 
                    danger 
                    type={decision === 'REJECT' ? 'primary' : 'default'}
                    icon={<CloseOutlined />}
                    onClick={() => setMyVoteMap(prev => ({ ...prev, [cand.id]: 'REJECT' }))}
                    style={decision === 'REJECT'
                      ? { minHeight: 48, height: 'auto', borderRadius: 8, fontWeight: 800, fontSize: 13, whiteSpace: 'normal', padding: '8px 12px' }
                      : { minHeight: 48, height: 'auto', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'normal', padding: '8px 12px' }}
                  >
                    {selectedSession?.type === 'ADMISSION' ? 'KHÔNG ĐỒNG Ý CHO KẾT NẠP ĐẢNG' : 'KHÔNG ĐỒNG Ý CÔNG NHẬN ĐẢNG VIÊN CHÍNH THỨC'}
                  </Button>
                  {decision === 'REJECT' && (
                    <div style={{ marginTop: 6, textAlign: 'left' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#ff4d4f', marginBottom: 6 }}>
                        * Vui lòng nêu rõ lý do:
                      </div>
                      <TextArea 
                        rows={2} 
                        placeholder="Nêu lý do không đồng ý..."
                        value={voteReasons[cand.id] || ''}
                        onChange={e => setVoteReasons(prev => ({ ...prev, [cand.id]: e.target.value }))}
                        style={{ borderRadius: 8, borderColor: '#ffccc7', fontSize: 13 }}
                      />
                    </div>
                  )}
                </Space>
              )}
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  // ============================================================
  // RENDER: Result card
  // ============================================================
  const renderResultCard = (r) => {
    const pieData = [
      { name: 'Đồng ý', value: r.approve },
      { name: 'Không đồng ý', value: r.reject },
    ].filter(d => d.value > 0);

    return (
      <Card key={r.candidate.id} bordered={false}
        style={{ borderRadius: 12, marginBottom: 16, border: `2px solid ${r.passed ? '#52c41a' : '#ff4d4f'}`, boxShadow: '0 4px 16px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* Card header */}
        <div style={{
          background: r.passed ? 'linear-gradient(135deg,#f6ffed,#fff)' : 'linear-gradient(135deg,#fff1f0,#fff)',
          margin: '-24px -24px 16px -24px', padding: '14px 24px',
          borderBottom: `2px solid ${r.passed ? '#b7eb8f' : '#ffa39e'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar size={48} src={getAvatarUrl(r.candidate.anh_ca_nhan)} icon={<UserOutlined />}
              style={{ border: `1.5px solid ${r.passed ? '#52c41a' : '#ff4d4f'}`, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>{r.candidate.name}</div>
              <Space size={4} style={{ marginTop: 4 }}>
                <Tag style={{ borderRadius: 4 }}>{r.candidate.class}</Tag>
                <Tag color="blue" style={{ borderRadius: 4 }}>{r.candidate.faculty}</Tag>
              </Space>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {r.passed ? <SvgPassed size={44} /> : <SvgFailed size={44} />}
            <div style={{ fontWeight: 900, fontSize: 13, color: r.passed ? '#389e0d' : '#cf1322', letterSpacing: '0.5px' }}>
              {r.passed ? 'ĐẠT YÊU CẦU' : 'KHÔNG ĐẠT YÊU CẦU'}
            </div>
          </div>
        </div>

        <Row gutter={24} align="middle">
          <Col xs={24} md={12}>
            <div style={{ height: 200 }}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.name === 'Đồng ý' ? '#52c41a' : '#ff4d4f'} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v, n) => [`${v} phiếu`, n]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="Chưa có phiếu" style={{ paddingTop: 40 }} />
              )}
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Progress type="circle" percent={r.rate} size={100}
                strokeColor={r.passed ? '#52c41a' : '#ff4d4f'}
                format={p => <span style={{ fontWeight: 900, color: r.passed ? '#389e0d' : '#cf1322' }}>{p}%</span>} />
              <div style={{ marginTop: 6, fontSize: 12, color: '#8c8c8c' }}>Tỷ lệ đồng ý</div>
            </div>
            <div style={{ background: '#fafafa', borderRadius: 8, padding: '12px 16px', border: '1px solid #f0f0f0' }}>
              <Row gutter={0} style={{ textAlign: 'center' }}>
                <Col span={8}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#52c41a' }}>{r.approve}</div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Đồng ý</div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#ff4d4f' }}>{r.reject}</div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Không đồng ý</div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#1890ff' }}>{r.total}</div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Tổng phiếu</div>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>

        {canMonitor && r.reject > 0 && (
          <div style={{ marginTop: 20, borderTop: '1px dashed #e8e8e8', paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#cf1322', marginBottom: 12, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              💬 Lý do không đồng ý ({votes.filter(v => v.candidateId === r.candidate.id && v.decision === 'REJECT' && v.reason).length})
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
              {votes.filter(v => v.candidateId === r.candidate.id && v.decision === 'REJECT' && v.reason).length > 0 ? (
                votes.filter(v => v.candidateId === r.candidate.id && v.decision === 'REJECT' && v.reason).map((v, i) => (
                  <div key={i} style={{ 
                    fontSize: 13, 
                    background: '#fff1f0', 
                    padding: '10px 14px', 
                    borderRadius: 8, 
                    borderLeft: '4px solid #ff4d4f',
                    boxShadow: '0 2px 6px rgba(255, 77, 79, 0.05)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#cf1322' }}>
                        <UserOutlined style={{ marginRight: 6 }} /> {v.voterName}
                      </span>
                      <span style={{ fontSize: 11, color: '#8c8c8c' }}>
                        {v.createdAt ? dayjs(v.createdAt).format('HH:mm DD/MM') : ''}
                      </span>
                    </div>
                    <div style={{ color: '#434343', fontStyle: 'italic', lineHeight: '1.5' }}>"{v.reason}"</div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 13, color: '#8c8c8c', fontStyle: 'italic', textAlign: 'center', padding: '16px 0', background: '#fafafa', borderRadius: 8 }}>
                  Không có ý kiến đóng góp bằng văn bản.
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    );
  };

  // ============================================================
  // RENDER: Sessions table
  // ============================================================
  const sessionsColumns = [
    {
      title: 'Phiên biểu quyết', dataIndex: 'title', key: 'title',
      render: (t, r) => (
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#262626' }}>{t}</div>
          <div style={{ marginTop: 4 }}>{typeTag(r.type)}</div>
        </div>
      )
    },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 140, render: s => statusBadge(s) },
    { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', width: 160, render: d => dayjs(d).format('HH:mm DD/MM/YYYY') },
    { title: 'Người tạo', dataIndex: 'createdBy', key: 'createdBy', width: 200 },
    {
      title: '', key: 'action', width: 130,
      render: (_, record) => (
        <Button type="primary" size="small"
          onClick={e => { e.stopPropagation(); handleSelectSession(record); }}
          style={{ backgroundColor: '#c62828', borderColor: '#c62828', fontWeight: 700 }}>
          Vào biểu quyết <SvgArrowRight size={14} />
        </Button>
      )
    }
  ];

  // ============================================================
  // RENDER: Detail tabs
  // ============================================================
  const buildDetailTabs = () => {
    const tabItems = [];

    // Tab Biểu quyết (Available to all logged in users, but shows restricted message for non-voters)
    if (currentUser) {
      tabItems.push({
        key: 'vote',
        label: <span><SvgVote /> Biểu quyết</span>,
        children: (
          <div>
            {!canVote ? (
              <Alert
                message="Quyền biểu quyết hạn chế"
                description="Đồng chí hiện là Đảng viên dự bị hoặc tài khoản chưa được xác minh là Đảng viên chính thức của Chi bộ. Theo Điều lệ Đảng Cộng sản Việt Nam, Đảng viên dự bị có quyền phát biểu ý kiến đóng góp trong các cuộc họp nhưng không có quyền biểu quyết."
                type="warning"
                showIcon
                icon={<LockOutlined />}
                style={{ marginBottom: 16, borderRadius: 8 }}
              />
            ) : (
              <>
                {selectedSession?.status === 'CLOSED' ? (
                  <Alert message="Phiên biểu quyết đã đóng — không nhận thêm phiếu." type="warning" showIcon style={{ marginBottom: 16, borderRadius: 8 }} />
                ) : hasVoted ? (
                  <Alert
                    message="Đồng chí đã hoàn thành biểu quyết"
                    description="Phiếu biểu quyết đã được ghi nhận. Kết quả chính thức sẽ được công bố sau khi Bí thư đóng phiên."
                    type="success" showIcon icon={<SafetyCertificateOutlined />}
                    style={{ marginBottom: 16, borderRadius: 8 }} />
                ) : (
                  <Alert
                    message="Biểu quyết bắt buộc"
                    description={`Đồng chí phải biểu quyết đầy đủ cho TẤT CẢ ${candidates.length} ứng viên trước khi xác nhận. Phiếu đã nộp không thể thay đổi.`}
                    type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }} />
                )}

                {!hasVoted && selectedSession?.status === 'OPEN' && (
                  <div style={{ marginBottom: 16, padding: '12px 18px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <Text style={{ fontSize: 13 }}>
                        Tiến độ biểu quyết: <strong style={{ color: '#c62828' }}>{Object.keys(myVoteMap).length}/{candidates.length}</strong> ứng viên
                      </Text>
                      <Progress
                        percent={Math.round((Object.keys(myVoteMap).length / (candidates.length || 1)) * 100)}
                        size="small" strokeColor="#c62828" style={{ marginTop: 4, marginBottom: 0 }} />
                    </div>
                    <Button 
                      type="dashed" 
                      icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                      onClick={handleApproveAll}
                      style={{ height: 38, borderColor: '#52c41a', color: '#52c41a', fontWeight: 600 }}
                    >
                      Đồng ý cho tất cả ứng viên
                    </Button>
                  </div>
                )}

                {candidates.map(renderVoteCard)}

                {!hasVoted && selectedSession?.status === 'OPEN' && candidates.length > 0 && (
                  <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                    <Button type="primary" size="large" icon={<CheckCircleOutlined />}
                      loading={submittingVote}
                      disabled={Object.keys(myVoteMap).length < candidates.length}
                      onClick={handleSubmitVote}
                      style={{ backgroundColor: '#c62828', borderColor: '#c62828', height: 52, padding: '0 40px', fontSize: 16, fontWeight: 800, borderRadius: 8 }}>
                      Xác nhận biểu quyết ({Object.keys(myVoteMap).length}/{candidates.length})
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )
      });
    }

    // Tab Tiến độ (managers)
    if (canMonitor) {
      tabItems.push({
        key: 'progress',
        label: <span><SvgProgress /> Tiến độ vote</span>,
        children: (
          <div>
            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col span={8}>
                <Card size="small" bordered={false} style={{ background: '#f6ffed', borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#389e0d' }}>{voteProgress.voted.length}</div>
                  <div style={{ fontSize: 12, color: '#52c41a', fontWeight: 700 }}>Đã biểu quyết</div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" bordered={false} style={{ background: '#fff1f0', borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#cf1322' }}>{voteProgress.notVoted.length}</div>
                  <div style={{ fontSize: 12, color: '#ff4d4f', fontWeight: 700 }}>Chưa biểu quyết</div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" bordered={false} style={{ background: '#e6f7ff', borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#096dd9' }}>{officialMembers.length}</div>
                  <div style={{ fontSize: 12, color: '#1890ff', fontWeight: 700 }}>Tổng ĐV chính thức</div>
                </Card>
              </Col>
            </Row>

            <Progress
              percent={officialMembers.length > 0 ? Math.round((voteProgress.voted.length / officialMembers.length) * 100) : 0}
              strokeColor="#c62828" style={{ marginBottom: 20 }}
              format={p => `${voteProgress.voted.length}/${officialMembers.length} Đảng viên (${p}%)`} />

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Card title={<span style={{ color: '#389e0d', fontWeight: 700 }}>✅ Đã biểu quyết ({voteProgress.voted.length})</span>}
                  size="small" bordered={false} style={{ borderRadius: 10, border: '1.5px solid #b7eb8f' }}>
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {voteProgress.voted.length === 0
                      ? <Empty description="Chưa có ai biểu quyết" imageStyle={{ height: 40 }} />
                      : voteProgress.voted.map((v, i) => (
                        <div key={i} style={{ padding: '7px 0', borderBottom: '1px solid #f6ffed', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar size="small" style={{ backgroundColor: '#52c41a' }} icon={<UserOutlined />} />
                          <Text style={{ fontSize: 13 }}>{v.name || v.id}</Text>
                        </div>
                      ))}
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title={<span style={{ color: '#cf1322', fontWeight: 700 }}>⏳ Chưa biểu quyết ({voteProgress.notVoted.length})</span>}
                  size="small" bordered={false} style={{ borderRadius: 10, border: '1.5px solid #ffa39e' }}>
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {voteProgress.notVoted.length === 0
                      ? <Empty description="🎉 Tất cả đã biểu quyết!" imageStyle={{ height: 40 }} />
                      : voteProgress.notVoted.map((m, i) => (
                        <div key={i} style={{ padding: '7px 0', borderBottom: '1px solid #fff1f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar size="small" style={{ backgroundColor: '#ff7875' }} icon={<UserOutlined />} />
                          <div>
                            <Text style={{ fontSize: 13, fontWeight: 600 }}>{m.ho_ten}</Text>
                            <Text style={{ fontSize: 11, color: '#8c8c8c', marginLeft: 8 }}>{m.mssv}</Text>
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        )
      });
    }

    // Tab Kết quả (managers always, DANGVIEN only after session closed)
    if (canMonitor || selectedSession?.status === 'CLOSED') {
      tabItems.push({
        key: 'results',
        label: <span><SvgResults /> Kết quả</span>,
        children: (
          <div>
            {selectedSession?.status === 'OPEN' && (
              <Alert message="Phiên đang mở — kết quả tạm thời"
                description="Kết quả hiện tại dựa trên phiếu đã nhận. Kết quả chính thức được tổng hợp khi Bí thư đóng phiên."
                type="warning" showIcon style={{ marginBottom: 16, borderRadius: 8 }} />
            )}
            {results.length === 0 ? (
              <Empty description="Chưa có ứng viên hoặc chưa có phiếu nào" />
            ) : (
              <>
                {/* Summary */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                  <Col span={6}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
                      borderRadius: 12, 
                      padding: '12px', 
                      textAlign: 'center',
                      border: '1px solid #bfdbfe',
                      boxShadow: '0 2px 8px rgba(30, 64, 175, 0.04)'
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#1d4ed8', lineHeight: 1.2 }}>{results.length}</div>
                      <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 700, marginTop: 4 }}>Ứng viên</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', 
                      borderRadius: 12, 
                      padding: '12px', 
                      textAlign: 'center',
                      border: '1px solid #bbf7d0',
                      boxShadow: '0 2px 8px rgba(22, 101, 52, 0.04)'
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#15803d', lineHeight: 1.2 }}>{results.filter(r => r.passed).length}</div>
                      <div style={{ fontSize: 11, color: '#166534', fontWeight: 700, marginTop: 4 }}>Đạt</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', 
                      borderRadius: 12, 
                      padding: '12px', 
                      textAlign: 'center',
                      border: '1px solid #fecaca',
                      boxShadow: '0 2px 8px rgba(185, 28, 28, 0.04)'
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#b91c1c', lineHeight: 1.2 }}>{results.filter(r => !r.passed).length}</div>
                      <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 700, marginTop: 4 }}>Không đạt</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', 
                      borderRadius: 12, 
                      padding: '12px', 
                      textAlign: 'center',
                      border: '1px solid #fde68a',
                      boxShadow: '0 2px 8px rgba(217, 119, 6, 0.04)'
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#d97706', lineHeight: 1.2 }}>{new Set(votes.map(v => v.voterId)).size}</div>
                      <div style={{ fontSize: 11, color: '#92400e', fontWeight: 700, marginTop: 4 }}>Tổng số phiếu</div>
                    </div>
                  </Col>
                </Row>
                {results.map(renderResultCard)}
              </>
            )}
          </div>
        )
      });
    }

    return tabItems;
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div style={{ fontFamily: "'SVN-Gilroy','Inter',sans-serif" }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 4, height: 26, backgroundColor: '#c62828', borderRadius: 2 }} />
          <Title level={4} style={{ margin: 0, fontWeight: 800 }}>Biểu quyết Chi bộ</Title>
          {selectedSession && (
            <>
              <span style={{ color: '#bfbfbf', fontSize: 18 }}>›</span>
              <Text style={{ fontSize: 14, fontWeight: 600, color: '#595959' }}>{selectedSession.title}</Text>
            </>
          )}
        </div>
        <Space>
          {selectedSession && (
            <Button onClick={() => { setSelectedSession(null); setCandidates([]); setVotes([]); }}>
              <SvgArrowLeft size={14} /> Danh sách phiên
            </Button>
          )}
          {canManage && !selectedSession && (
            <Button type="primary" icon={<SvgPlus size={14} color="#ffffff" />}
              onClick={() => setCreateModalOpen(true)}
              style={{ backgroundColor: '#c62828', borderColor: '#c62828', fontWeight: 700, height: 40 }}>
              Tạo phiên biểu quyết
            </Button>
          )}
        </Space>
      </div>

      {/* ── Sessions List ── */}
      {!selectedSession && (
        <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <Table
            columns={sessionsColumns}
            dataSource={sessions}
            rowKey="id"
            loading={loadingSessions}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="Chưa có phiên biểu quyết nào. Bí thư hãy tạo phiên mới!" /> }}
            onRow={record => ({ onClick: () => handleSelectSession(record), style: { cursor: 'pointer' } })} />
        </Card>
      )}

      {/* ── Session Detail ── */}
      {selectedSession && (
        <>
          {/* Info banner */}
          <Card bordered={false} style={{
            borderRadius: 12, marginBottom: 16,
            borderLeft: `5px solid ${selectedSession.status === 'OPEN' ? '#52c41a' : '#bfbfbf'}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
          }}>
            <Row align="middle" justify="space-between" wrap>
              <Col>
                <Space direction="vertical" size={4}>
                  <Space>{typeTag(selectedSession.type)}{statusBadge(selectedSession.status)}</Space>
                  <Title level={4} style={{ margin: 0 }}>{selectedSession.title}</Title>
                  <Text style={{ color: '#8c8c8c', fontSize: 12 }}>
                    Tạo bởi: {selectedSession.createdBy} · {dayjs(selectedSession.createdAt).format('HH:mm DD/MM/YYYY')}
                    {selectedSession.closedAt && ` · Đóng: ${dayjs(selectedSession.closedAt).format('HH:mm DD/MM/YYYY')}`}
                  </Text>
                </Space>
              </Col>
              {canManage && (
                <Col>
                  <Space style={{ marginTop: 8 }} wrap>
                    {selectedSession.status === 'OPEN' && (
                      <>
                        <Button icon={<SvgMail size={15} />} loading={sendingNotif} onClick={handleSendNotification}>
                          Gửi thông báo & Email
                        </Button>
                        <Popconfirm
                          title="Đóng phiên biểu quyết?"
                          description="Sau khi đóng, không ai có thể biểu quyết thêm. Tiếp tục?"
                          okText="Đóng phiên" cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                          onConfirm={handleCloseSession}>
                          <Button danger type="primary" icon={<SvgLock size={15} />}>Đóng phiên</Button>
                        </Popconfirm>
                      </>
                    )}
                    <Popconfirm
                      title="Xóa phiên biểu quyết này?"
                      description="Hành động này sẽ xóa vĩnh viễn phiên biểu quyết, danh sách ứng viên và toàn bộ phiếu bầu hiện tại. Không thể hoàn tác. Đồng ý?"
                      okText="Xóa vĩnh viễn" cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                      onConfirm={handleDeleteSession}>
                      <Button danger type="dashed" icon={<SvgDelete size={15} />}>Xóa phiên</Button>
                    </Popconfirm>
                  </Space>
                </Col>
              )}
            </Row>
          </Card>

          {loadingDetail ? (
            <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
          ) : (
            <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <Tabs activeKey={detailTab} onChange={setDetailTab} items={buildDetailTabs()} />
            </Card>
          )}
        </>
      )}

      {/* ── Create Session Modal ── */}
      <Modal
        title={<b style={{ fontSize: 16 }}>TẠO PHIÊN BIỂU QUYẾT CHI BỘ</b>}
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        width={820}
        footer={null}
        destroyOnClose>
        <Form form={createForm} layout="vertical" onFinish={handleCreateSession}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="title" label={<b>Tên phiên biểu quyết</b>}
                rules={[{ required: true, message: 'Nhập tên phiên!' }]}>
                <Input size="large" placeholder="Ví dụ: Biểu quyết kết nạp Đảng viên đợt 1 năm 2026" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="type" label={<b>Loại biểu quyết</b>}
                rules={[{ required: true, message: 'Chọn loại!' }]}>
                <Select size="large" placeholder="Chọn loại...">
                  <Option value="ADMISSION">Kết nạp Đảng viên</Option>
                  <Option value="OFFICIAL">Công nhận chính thức</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12, borderBottom: '1px solid #f0f0f0', paddingBottom: 12, marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#262626' }}>DANH SÁCH ỨNG VIÊN</span>
              <Space>
                <Button 
                  type="default" 
                  size="small"
                  icon={<DownloadOutlined />} 
                  onClick={handleDownloadTemplate}
                  style={{ fontSize: 12 }}
                >
                  Tải file mẫu Excel
                </Button>
                <Button 
                  type="default" 
                  size="small"
                  icon={<FileExcelOutlined />} 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ borderColor: '#52c41a', color: '#52c41a', fontSize: 12 }}
                >
                  Nhập ứng viên từ Excel
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".xlsx, .xls"
                  onChange={handleImportExcel}
                />
              </Space>
            </div>
            
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => handleOpenPullModal('ho_so_ket_nap')} style={{ fontSize: 12, borderColor: '#1890ff', color: '#1890ff' }}>
                Chọn từ HS Kết nạp Đảng
              </Button>
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => handleOpenPullModal('ho_so_chinh_thuc')} style={{ fontSize: 12, borderColor: '#722ed1', color: '#722ed1' }}>
                Chọn từ HS Chính thức
              </Button>
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => handleOpenPullModal('dang_vien')} style={{ fontSize: 12, borderColor: '#eb2f96', color: '#eb2f96' }}>
                Chọn từ Danh sách Đảng viên
              </Button>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Alert
              message="Có thể tự động chọn lấy ứng viên nhanh chóng từ các hồ sơ lưu trữ sẵn có trên hệ thống hoặc tải lên từ Excel."
              type="info"
              showIcon
              style={{ borderRadius: 6 }}
            />
          </div>

          <Form.List name="candidates" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Card key={key} size="small" style={{ marginBottom: 12, borderRadius: 8, background: '#fafafa', border: '1px solid #f0f0f0' }}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar size="small" src={getAvatarUrl(createForm.getFieldValue(['candidates', name, 'anh_ca_nhan']))} icon={<UserOutlined />} />
                        <span style={{ fontWeight: 700, color: '#c62828' }}>Ứng viên #{name + 1}</span>
                      </div>
                    }
                    extra={fields.length > 1 && (
                      <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(name)}>Xóa</Button>
                    )}>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name={[name, 'name']} label="Họ và tên" rules={[{ required: true, message: 'Nhập tên!' }]}>
                          <Input placeholder="Nguyễn Văn A" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name={[name, 'class']} label="Lớp">
                          <Input placeholder="51QT01" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name={[name, 'faculty']} label="Khoa">
                          <Input placeholder="Quản trị KD" />
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    <Row gutter={12}>
                      <Col span={24}>
                        <Form.Item name={[name, 'anh_ca_nhan']} label="Link ảnh cá nhân (Google Drive hoặc Web)">
                          <Input placeholder="Nhập link ảnh từ Google Drive hoặc link trực tiếp..." />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={6}>
                        <Form.Item name={[name, 'academicScore']} label="ĐTB học tập" rules={[{ required: true, message: 'Nhập điểm!' }]}>
                          <InputNumber min={0} max={10} step={0.1} style={{ width: '100%' }} placeholder="8.5" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name={[name, 'conductScore']} label="Điểm rèn luyện" rules={[{ required: true, message: 'Nhập điểm!' }]}>
                          <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="90" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name={[name, 'processDescription']} label="Quá trình công tác & rèn luyện">
                          <TextArea rows={5} placeholder="Nhập chi tiết về quá trình học tập, rèn luyện, các thành tích nổi bật, khen thưởng, kỷ luật..." />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}
                  style={{ marginBottom: 16, borderColor: '#c62828', color: '#c62828' }}>
                  Thêm ứng viên
                </Button>
              </>
            )}
          </Form.List>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setCreateModalOpen(false); createForm.resetFields(); }}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={creatingSession}
                icon={<AuditOutlined />}
                style={{ backgroundColor: '#c62828', borderColor: '#c62828', fontWeight: 700, height: 40 }}>
                Tạo phiên & Mở biểu quyết
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ── Candidate Pull Selector Modal ── */}
      <Modal
        title={
          <b style={{ fontSize: 16, color: '#c62828' }}>
            {pullSourceType === 'dang_vien' && 'CHỌN ỨNG VIÊN TỪ DANH SÁCH ĐẢNG VIÊN'}
            {pullSourceType === 'ho_so_ket_nap' && 'CHỌN ỨNG VIÊN TỪ HỒ SƠ KẾT NẠP ĐẢNG'}
            {pullSourceType === 'ho_so_chinh_thuc' && 'CHỌN ỨNG VIÊN TỪ HỒ SƠ CHÍNH THỨC'}
          </b>
        }
        open={pullModalOpen}
        onCancel={() => setPullModalOpen(false)}
        width={720}
        onOk={handleConfirmPull}
        okText={`Xác nhận chọn (${selectedPullRowKeys.length})`}
        cancelText="Hủy"
        destroyOnClose
      >
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <Input
            placeholder="Tìm theo Tên hoặc MSSV..."
            prefix={<SearchOutlined />}
            value={pullSearchText}
            onChange={e => setPullSearchText(e.target.value)}
          />
        </div>

        <Table
          size="small"
          loading={loadingPull}
          dataSource={pullDataList.filter(item => {
            const nameField = item.ho_ten || item.hoten || '';
            const matchSearch = nameField.toLowerCase().includes(pullSearchText.toLowerCase()) || 
                               (item.mssv || '').toLowerCase().includes(pullSearchText.toLowerCase());
            return matchSearch;
          })}
          rowKey="id"
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys: selectedPullRowKeys,
            onChange: (keys, rows) => {
              setSelectedPullRowKeys(keys);
              setSelectedPullRows(rows);
            }
          }}
          columns={[
            {
              title: 'Ảnh',
              dataIndex: 'anh_ca_nhan',
              key: 'avatar',
              width: 60,
              render: (url, record) => (
                <Avatar src={getAvatarUrl(url || record.anh_ca_nhan)} icon={<UserOutlined />} />
              )
            },
            {
              title: 'Họ tên',
              key: 'name_display',
              render: (_, record) => <b>{record.ho_ten || record.hoten}</b>
            },
            {
              title: 'MSSV',
              dataIndex: 'mssv',
              key: 'mssv',
              width: 120
            },
            {
              title: 'Lớp',
              dataIndex: 'lop',
              key: 'lop',
              width: 120
            },
            {
              title: 'Khoa',
              dataIndex: 'khoa',
              key: 'khoa'
            }
          ]}
          pagination={{ pageSize: 6 }}
        />
      </Modal>
    </div>
  );
};

export default Voting;
