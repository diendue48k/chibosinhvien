import React, { useState, useEffect, useMemo } from 'react';
import { 
  Row, Col, Card, Typography, Space, Avatar, Button, Spin, 
  List, Progress, Tooltip, Tag, Modal, Empty, Divider, Alert, message, Drawer
} from 'antd';
import { 
  UserOutlined, CalendarOutlined, NotificationOutlined, AuditOutlined, 
  ClockCircleOutlined, CheckCircleOutlined, SyncOutlined, FileTextOutlined, 
  StarOutlined, TeamOutlined, SafetyCertificateOutlined, BellOutlined, 
  RightOutlined, FormOutlined, FlagOutlined, CloseCircleOutlined, InfoCircleOutlined, ExportOutlined
} from '@ant-design/icons';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../services/permissionService';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Title, Text, Paragraph } = Typography;

// SVGs for contacts
const phoneSvg = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="#52c41a" style={{ marginRight: '6px', flexShrink: 0 }}>
    <path d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.3-1.1-.5-2.3-.5-3.5 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"/>
  </svg>
);

const mailSvg = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="#1890ff" style={{ marginRight: '6px', flexShrink: 0 }}>
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>
);

const facebookSvg = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="#3b5998" style={{ marginRight: '6px', flexShrink: 0 }}>
    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
  </svg>
);

// Initial Realistic Task Data Fallback (from WeeklyPlan.jsx)
const INITIAL_TASKS = [
  {
    id: 't-1',
    team: 'ADMISSION_TEAM',
    title: 'Thẩm định hồ sơ kết nạp Đảng quần chúng ưu tú quý II',
    description: 'Rà soát hồ sơ lý lịch, lấy ý kiến chi ủy nơi cư trú và lấy ý kiến của đoàn thể chính trị - xã hội để hoàn tất hồ sơ trình Đảng ủy cấp trên.',
    deadline: '2026-06-15',
    status: 'In Progress',
    evaluation: '',
    subTasks: [
      { id: 'st-1-1', title: 'Lấy ý kiến nhận xét nơi cư trú của quần chúng Nguyễn Văn Nam', assignee: 'Đ/c Lê Thị Lan', deadline: '2026-06-12', progress: 100, status: 'Completed' },
      { id: 'st-1-2', title: 'Trích sao lý lịch và hoàn tất bản thẩm tra lý lịch quần chúng Hoàng Thị Quỳnh Như', assignee: 'Đ/c Hoàng Thị Quỳnh Như', deadline: '2026-06-14', progress: 40, status: 'In Progress' },
      { id: 'st-1-3', title: 'Chuẩn bị dự thảo Nghị quyết họp xét kết nạp Đảng', assignee: 'Đ/c Nguyễn Văn Nam', deadline: '2026-06-15', progress: 0, status: 'Pending' }
    ]
  },
  {
    id: 't-2',
    team: 'OFFICIAL_TEAM',
    title: 'Thu Đảng phí tháng 5 và rà soát Hồ sơ chuyển sinh hoạt Đảng chính thức',
    description: 'Đôn đốc đảng viên hoàn thành đóng đảng phí đúng hạn và lập danh sách chuyển sinh hoạt Đảng chính thức cho các đảng viên sinh viên đã tốt nghiệp.',
    deadline: '2026-06-10',
    status: 'In Progress',
    evaluation: '',
    subTasks: [
      { id: 'st-2-1', title: 'Thu nộp Đảng phí trực tuyến chi bộ tháng 5', assignee: 'Đ/c Trần Văn An', deadline: '2026-06-05', progress: 100, status: 'Completed' },
      { id: 'st-2-2', title: 'Kiểm tra hồ sơ chuyển sinh hoạt Đảng của các đảng viên ra trường', assignee: 'Đ/c Phạm Thị Mai', deadline: '2026-06-09', progress: 20, status: 'In Progress' },
      { id: 'st-2-3', title: 'Hoàn thành hồ sơ đề nghị công nhận Đảng viên chính thức cho đồng chí Hoàng Thị Quỳnh Như', assignee: 'Đ/c Hoàng Thị Quỳnh Như', deadline: '2026-06-08', progress: 50, status: 'In Progress' }
    ]
  }
];

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
  if (member.so_quyet_dinh_dvct || member.so_qd) {
    return false;
  }
  if (member.dang_vien_du_bi === true) return true;
  if (member.dang_vien_du_bi === false) return false;
  if (member.loai_dang_vien === "Dự bị" || member.loai_dang_vien === "dubi") return true;
  if (member.loai_dang_vien === "Chính thức") return false;
  return true;
};

const DangVienDashboard = () => {
  const { currentUser, getRoleBadgeName } = useAuth();
  const navigate = useNavigate();

  // Loading and Data states
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [upcomingMeeting, setUpcomingMeeting] = useState(null);
  const [meetingCountdown, setMeetingCountdown] = useState('');
  const [tasks, setTasks] = useState([]);
  const [openVotings, setOpenVotings] = useState([]);
  const [memberDetail, setMemberDetail] = useState(null);

  // Detail Modal/Drawer states
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);

  // Group members states
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);

  const [bchConfig, setBchConfig] = useState({
    contacts: [
      { name: 'TS. Bùi Trung Hiệp', role: 'Bí thư Chi bộ (Chung)', initial: 'B' },
      { name: 'Đ/c Trần Văn Quyết', role: 'Admin hệ thống chi bộ', initial: 'Q' },
      { name: 'Đ/c Trần Thị B', role: 'Trưởng ban Đảng viên chính thức', initial: 'B' },
      { name: 'Đ/c Phạm Văn D', role: 'Trưởng ban Hồ sơ kết nạp', initial: 'D' }
    ],
    email: 'chibosvktdn@due.udn.vn'
  });

  const { chiUy: chiUyContacts = [], banDieuHanh: banDieuHanhContacts = [] } = useMemo(() => {
    const list = bchConfig.contacts || [];
    const chiUy = list.filter(c => {
      const r = c.role?.toLowerCase() || '';
      return r.includes('bí thư') || r.includes('chi ủy') || r.includes('chi uỷ');
    });
    const bdh = list.filter(c => !chiUy.includes(c));
    
    // Fallback if no explicit roles are matched
    if (chiUy.length === 0 && list.length > 0) {
      return {
        chiUy: list.slice(0, Math.ceil(list.length / 2)),
        banDieuHanh: list.slice(Math.ceil(list.length / 2))
      };
    }
    return { chiUy, banDieuHanh: bdh };
  }, [bchConfig.contacts]);

  // Load member info from Firestore to get dynamic Group/Status/etc.
  const fetchMemberDetail = async () => {
    try {
      const q = query(collection(db, "dang_vien"), where("mssv", "==", currentUser.mssv || currentUser.username));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setMemberDetail(snap.docs[0].data());
      }
    } catch (e) {
      console.error("Lỗi tải thông tin Đảng viên:", e);
    }
  };

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch notifications
      const notifSnap = await getDocs(collection(db, "notifications"));
      const allNotifs = notifSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      allNotifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Filter notifications targeting this specific member or tat_ca
      const myId = currentUser?.id;
      const myMssv = currentUser?.mssv || currentUser?.username;
      const filteredNotifs = allNotifs.filter(n => {
        if (n.recipient_type === 'tat_ca') return true;
        if (n.recipients && Array.isArray(n.recipients)) {
          return n.recipients.some(r => r.id === myId || r.mssv === myMssv);
        }
        return false;
      });
      setNotifications(filteredNotifs.slice(0, 5)); // Keep latest 5

      // 2. Fetch meetings & find upcoming one
      const meetingSnap = await getDocs(collection(db, "lich_hop"));
      const allMeetings = meetingSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const upcoming = allMeetings
        .filter(m => dayjs(m.date).isAfter(dayjs()))
        .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())[0];
      setUpcomingMeeting(upcoming || null);

      // 3. Load tasks from localStorage (falls back to initial)
      const savedTasks = localStorage.getItem('weekly_tasks');
      const loadedTasks = savedTasks ? JSON.parse(savedTasks) : INITIAL_TASKS;
      setTasks(loadedTasks);

      // 4. Fetch open voting sessions
      const votingSessionsSnap = await getDocs(collection(db, 'voting_sessions'));
      const activeSessions = votingSessionsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.status === 'OPEN');

      // Verify if voted in each session
      const votesSnap = await getDocs(collection(db, 'voting_votes'));
      const allVotes = votesSnap.docs.map(d => d.data());

      const candidatesSnap = await getDocs(collection(db, 'voting_candidates'));
      const allCandidates = candidatesSnap.docs.map(d => d.data());

      const unvotedSessions = [];
      for (const session of activeSessions) {
        const sessionCandidates = allCandidates.filter(c => c.sessionId === session.id);
        const myVotes = allVotes.filter(v => 
          v.sessionId === session.id && 
          (v.voterId === myId || v.voterMssv === myMssv)
        );

        if (sessionCandidates.length > 0 && myVotes.length < sessionCandidates.length) {
          unvotedSessions.push(session);
        }
      }
      setOpenVotings(unvotedSessions);

      // 5. Fetch Ban Chi uy contacts config
      try {
        const bchDocRef = doc(db, "system_config", "bch_contacts");
        const bchSnap = await getDoc(bchDocRef);
        if (bchSnap.exists()) {
          const data = bchSnap.data();
          setBchConfig({
            contacts: data.contacts || [],
            email: data.email || 'chibosvktdn@due.udn.vn'
          });
        }
      } catch (e) {
        console.error("Lỗi khi tải cấu hình Ban Chi ủy:", e);
      }

    } catch (e) {
      console.error("Lỗi khi tải dữ liệu trang chủ:", e);
      message.error("Lỗi khi tải dữ liệu trang chủ Đảng viên");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberDetail();
    fetchData();
  }, []);

  // Fetch members of the same group when modal opens
  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (!isGroupModalVisible || !memberDetail?.nhom) return;
      setLoadingGroupMembers(true);
      try {
        const q = query(
          collection(db, "dang_vien"),
          where("nhom", "==", memberDetail.nhom),
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
  }, [isGroupModalVisible, memberDetail]);

  // Real-time Countdown Timer for Meeting
  useEffect(() => {
    if (!upcomingMeeting) return;

    const timer = setInterval(() => {
      const diffMs = dayjs(upcomingMeeting.date).diff(dayjs());
      if (diffMs <= 0) {
        setMeetingCountdown('Đang diễn ra');
        clearInterval(timer);
        return;
      }

      const duration = dayjs(upcomingMeeting.date).diff(dayjs());
      const hours = Math.floor(duration / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      const mins = Math.floor((duration / (1000 * 60)) % 60);
      const secs = Math.floor((duration / 1000) % 60);

      if (days > 0) {
        setMeetingCountdown(`${days} ngày ${remainingHours} giờ ${mins} phút`);
      } else if (remainingHours > 0) {
        setMeetingCountdown(`${remainingHours} giờ ${mins} phút ${secs} giây`);
      } else {
        setMeetingCountdown(`${mins} phút ${secs} giây`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [upcomingMeeting]);

  // Filter tasks assigned to the current user
  const personalTasks = useMemo(() => {
    const userName = currentUser.name || '';
    const nameClean = userName.replace(/[([].*?[)\]]/g, '').trim(); // E.g. "Đ/c Hoàng Thị Quỳnh Như"

    const list = [];
    tasks.forEach(task => {
      (task.subTasks || []).forEach(sub => {
        const matchesAssignee = sub.assignee && (
          sub.assignee.includes(nameClean) || 
          nameClean.includes(sub.assignee.replace('Đ/c', '').trim())
        );
        if (matchesAssignee) {
          list.push({
            parentTaskId: task.id,
            parentTaskTitle: task.title,
            ...sub
          });
        }
      });
    });
    return list;
  }, [tasks, currentUser]);

  // Update task progress locally and save to localStorage (syncs with WeeklyPlan.jsx)
  const handleUpdateTaskProgress = (parentTaskId, subTaskId, newProgress) => {
    const status = newProgress === 100 ? 'Completed' : (newProgress > 0 ? 'In Progress' : 'Pending');
    const updatedTasks = tasks.map(t => {
      if (t.id === parentTaskId) {
        const updatedSubs = t.subTasks.map(s => {
          if (s.id === subTaskId) {
            return { ...s, progress: newProgress, status: status };
          }
          return s;
        });
        const allCompleted = updatedSubs.length > 0 && updatedSubs.every(s => s.status === 'Completed');
        const parentStatus = allCompleted ? 'Completed' : 'In Progress';
        const parentProgress = updatedSubs.length > 0 
          ? Math.round(updatedSubs.reduce((acc, s) => acc + s.progress, 0) / updatedSubs.length)
          : 0;

        return {
          ...t,
          status: parentStatus,
          progress: parentProgress,
          subTasks: updatedSubs
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    localStorage.setItem('weekly_tasks', JSON.stringify(updatedTasks));
    message.success("Đã cập nhật tiến độ công việc!");
  };

  // Utilities Quick Menu config
  const utilities = [
    {
      title: 'Tạo biểu mẫu hồ sơ',
      desc: 'Xuất văn bản, tự kiểm điểm',
      icon: <FileTextOutlined />,
      route: '/document-generator',
      color: '#c62828',
      bg: '#fff1f0'
    },
    {
      title: 'Biểu quyết chi bộ',
      desc: 'Thực hiện quyền biểu quyết',
      icon: <AuditOutlined />,
      route: '/voting',
      color: '#1890ff',
      bg: '#e6f7ff'
    },
    {
      title: 'Lịch họp & sinh hoạt',
      desc: 'Xem chương trình & kế hoạch',
      icon: <CalendarOutlined />,
      route: '/lich-hop',
      color: '#722ed1',
      bg: '#f9f0ff'
    },
    {
      title: 'Đăng ký cư trú 213',
      desc: 'Kê khai, quản lý hồ sơ 213',
      icon: <FormOutlined />,
      route: '/dang-ky-213',
      color: '#52c41a',
      bg: '#f6ffed'
    },
    {
      title: 'Đăng ký xin vắng',
      desc: 'Nộp đơn xin vắng sinh hoạt',
      icon: <CloseCircleOutlined />,
      route: '/xin-vang',
      color: '#fa8c16',
      bg: '#fff7e6'
    },
    {
      title: 'Nhiệm vụ tuần',
      desc: 'Quản lý, báo cáo công việc',
      icon: <SyncOutlined />,
      route: '/weekly-plan',
      color: '#eb2f96',
      bg: '#fff0f6'
    },
    {
      title: 'Hồ sơ cá nhân',
      desc: 'Xem thông tin lý lịch Đảng',
      icon: <UserOutlined />,
      route: '/profile',
      color: '#607d8b',
      bg: '#eceff1'
    },
    {
      title: 'Đăng ký chuyển SHĐ',
      desc: 'Đăng ký chuyển sinh hoạt đi nơi khác',
      icon: <ExportOutlined />,
      route: '/dang-ky-chuyen-sinh-hoat',
      color: '#d46b08',
      bg: '#fff7e6'
    },
    {
      title: 'Xem thành viên nhóm',
      desc: 'Tra cứu danh bạ hoạt động nhóm',
      icon: <TeamOutlined />,
      route: '#',
      onClick: () => setIsGroupModalVisible(true),
      color: '#13c2c2',
      bg: '#e6fffb'
    }
  ];

  const activeUtilities = useMemo(() => {
    let isRequested = false;
    if (currentUser?.role === 'DANGVIEN') {
      const isDuBi = checkIsDuBi(memberDetail);
      if (isDuBi) {
        if (memberDetail?.ngay_vao_dang) {
          const ngayVao = safeDayjs(memberDetail.ngay_vao_dang);
          if (ngayVao && ngayVao.isValid()) {
            const deadline = ngayVao.add(12, 'month');
            const daysLeft = deadline.diff(dayjs(), 'day');
            isRequested = daysLeft <= 60;
          }
        }
      } else {
        isRequested = true;
      }
    } else {
      isRequested = true;
    }

    if (!isRequested) {
      // Hide 'Tạo biểu mẫu hồ sơ' (document generator) if admin has not requested official profile
      return utilities.filter(util => util.route !== '/document-generator');
    }
    return utilities;
  }, [currentUser, memberDetail, utilities]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: '#64748b', fontWeight: 'bold' }}>Đang chuẩn bị trang chủ cá nhân...</div>
      </div>
    );
  }

  // Personal status
  const isDuBi = checkIsDuBi(memberDetail);
  const statusText = isDuBi ? "Đảng viên dự bị" : "Đảng viên chính thức";
  const statusColor = isDuBi ? "orange" : "green";

  return (
    <div className="dangvien-portal-container">
      {/* Custom Styles */}
      <style>{`
        .dangvien-portal-container {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-banner {
          background: linear-gradient(135deg, #c62828 0%, #8e0000 100%);
          border-radius: 16px;
          padding: 28px;
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 6px 20px rgba(198, 40, 40, 0.15);
          margin-bottom: 24px;
        }
        .utility-card {
          border-radius: 12px;
          transition: all 0.25s ease;
          border: 1px solid #f0f0f0;
          box-shadow: 0 4px 10px rgba(0,0,0,0.02);
          cursor: pointer;
          height: 100%;
        }
        .utility-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(198, 40, 40, 0.06);
          border-color: #ffa39e;
        }
        .meeting-widget {
          background: linear-gradient(180deg, #fffcf6 0%, #ffffff 100%);
          border-left: 4px solid #fbc02d;
        }
        .countdown-pulse {
          animation: pulse 2s infinite;
          font-weight: 900;
          color: #c62828;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        .task-list-container {
          max-height: 280px;
          overflow-y: auto;
          padding-right: 6px;
        }
        .task-list-container::-webkit-scrollbar {
          width: 4px;
        }
        .task-list-container::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 2px;
        }
      `}</style>

      {/* 1. Alert for Pending Votings */}
      {openVotings.length > 0 && (
        <Alert
          message={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span>
                <InfoCircleOutlined style={{ marginRight: '6px' }} />
                Đồng chí có <strong>{openVotings.length} phiên biểu quyết</strong> đang mở chưa tham gia đóng ý kiến. Hãy thực hiện quyền biểu quyết của mình!
              </span>
              <Button 
                type="primary" 
                size="small" 
                onClick={() => navigate('/voting')}
                style={{ backgroundColor: '#c62828', borderColor: '#c62828', fontWeight: 'bold' }}
              >
                <AuditOutlined style={{ marginRight: '4px' }} /> Biểu quyết ngay
              </Button>
            </div>
          }
          type="warning"
          showIcon
          style={{ borderRadius: '10px', marginBottom: '20px', borderLeft: '4px solid #faad14' }}
        />
      )}

      {/* 2. Hero Banner Card */}
      <div className="hero-banner">
        <Row gutter={[20, 20]} align="middle">
          <Col xs={24} md={18}>
            <Space direction="vertical" size={4}>
              <Title level={2} style={{ color: 'white', margin: '4px 0 8px', fontWeight: 900 }}>
                Kính chào đồng chí {memberDetail?.ho_ten || currentUser.name.replace(/^Đ\/c\s+/i, '')}!
              </Title>
              <Paragraph style={{ color: '#ffcdbe', margin: 0, fontSize: '14px', fontStyle: 'italic', fontWeight: 600 }}>
                "Mỗi Đảng viên sinh viên là một tấm gương sáng về rèn luyện, học tập và hoạt động phong trào."
              </Paragraph>
            </Space>
          </Col>
          <Col xs={24} md={6} style={{ textAlign: 'right' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px', backdropFilter: 'blur(4px)', display: 'inline-block', textAlign: 'left', minWidth: '180px' }}>
              <div style={{ fontSize: '11px', color: '#ffcdbe', fontWeight: 'bold', textTransform: 'uppercase' }}>Trạng thái đảng</div>
              <Tag color={statusColor} style={{ fontWeight: 800, marginTop: '4px', border: 'none' }}>
                {statusText.toUpperCase()}
              </Tag>
              <div style={{ height: '8px' }} />
              <div style={{ fontSize: '11px', color: '#ffcdbe', fontWeight: 'bold', textTransform: 'uppercase' }}>MSSV</div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '14px' }}>{memberDetail?.mssv || currentUser.mssv || 'N/A'}</div>
              <div style={{ height: '8px' }} />
              <div style={{ fontSize: '11px', color: '#ffcdbe', fontWeight: 'bold', textTransform: 'uppercase' }}>Nhóm sinh hoạt</div>
              <div style={{ color: '#fbc02d', fontWeight: 800, fontSize: '14px', marginTop: '2px' }}>
                {memberDetail?.nhom || 'Chưa phân nhóm'}
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* 3. Lưới Tiện ích Nhanh */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ width: '4px', height: '18px', backgroundColor: '#c62828', borderRadius: '2px' }} />
          <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>
            Tiện ích dành cho Đảng viên
          </Title>
        </div>

        <Row gutter={[16, 16]}>
          {activeUtilities.map((util, index) => (
            <Col xs={12} sm={8} lg={6} xl={index === activeUtilities.length - 1 ? 6 : undefined} key={util.route} style={{ flexGrow: 1 }}>
              <Card 
                className="utility-card"
                onClick={() => {
                  if (util.onClick) {
                    util.onClick();
                  } else {
                    navigate(util.route);
                  }
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: util.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: util.color,
                    fontSize: '20px',
                    flexShrink: 0
                  }}>
                    {util.icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '13px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {util.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                      {util.desc}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 4. Thân trang chủ - Chia cột chính phụ */}
      <Row gutter={[20, 20]}>
        {/* CỘT TRÁI (CHÍNH): Bảng tin thông báo mới nhất */}
        <Col xs={24} lg={15}>
          {/* A. BẢNG TIN THÔNG BÁO MỚI NHẤT */}
          <Card 
            bordered={false} 
            style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)', border: '1px solid #e2e8f0', height: '100%' }}
            bodyStyle={{ height: 'calc(100% - 56px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                <NotificationOutlined style={{ color: '#c62828', fontSize: '18px' }} />
                <span style={{ fontWeight: 800, fontSize: '15px', color: '#1e293b' }}>Thông báo Chi bộ mới nhất</span>
              </div>
            }
            extra={
              <Button type="link" onClick={() => navigate('/thong-bao')} style={{ padding: 0, fontWeight: 700, color: '#c62828' }}>
                Xem tất cả <RightOutlined style={{ fontSize: 10 }} />
              </Button>
            }
          >
            {notifications.length === 0 ? (
              <Empty description="Không có thông báo nào trong thời gian gần đây" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={notifications}
                renderItem={(item) => (
                  <List.Item
                    style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedNotif(item);
                      setNotifDrawerOpen(true);
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: '#fff1f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#c62828',
                          fontSize: '18px'
                        }}>
                          <NotificationOutlined />
                        </div>
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '13px' }} className="hover-red-text">
                            {item.title}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                            {dayjs(item.created_at).fromNow()}
                          </span>
                        </div>
                      }
                      description={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                          <span style={{ 
                            fontSize: '12px', 
                            color: '#64748b', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            maxWidth: '480px'
                          }}>
                            {item.content}
                          </span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                              Người đăng: <strong>{item.created_by}</strong>
                            </span>
                            {item.deadline && (
                              <Tag color="volcano" style={{ fontSize: '10px', border: 'none', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                                <ClockCircleOutlined style={{ marginRight: '4px' }} /> Hạn p/h: {dayjs(item.deadline).format('DD/MM HH:mm')}
                              </Tag>
                            )}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* CỘT PHẢI (PHỤ): Lịch họp & Liên hệ nhanh */}
        <Col xs={24} lg={9}>
          {/* A. THẺ LỊCH HỌP SẮP TỚI */}
          <Card 
            className="meeting-widget"
            bordered={false} 
            style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)', border: '1px solid #ffa39e', height: '100%' }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                <CalendarOutlined style={{ color: '#c62828', fontSize: '16px' }} />
                <span style={{ fontWeight: 800, fontSize: '15px', color: '#c62828' }}>Sinh hoạt Chi bộ sắp tới</span>
              </div>
            }
          >
            {!upcomingMeeting ? (
              <Empty 
                description={
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                    Chưa đăng ký lịch họp sinh hoạt Chi bộ mới.
                  </span>
                } 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
              />
            ) : (
              <div>
                <Title level={5} style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b', fontWeight: 800, lineHeight: 1.4 }}>
                  {upcomingMeeting.title}
                </Title>

                {/* Countdown display */}
                <div style={{ 
                  background: '#fff1f0', 
                  borderRadius: '10px', 
                  padding: '12px', 
                  textAlign: 'center', 
                  marginBottom: '16px',
                  border: '1px dashed #ffa39e'
                }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ClockCircleOutlined style={{ marginRight: '6px', fontSize: '14px', color: '#c62828' }} /> HỌP CHI BỘ SẼ DIỄN RA SAU
                  </div>
                  <div className="countdown-pulse" style={{ fontSize: '16px', marginTop: '6px', fontWeight: 900 }}>
                    {meetingCountdown || 'Đang tải bộ đếm...'}
                  </div>
                </div>

                <Space direction="vertical" size={10} style={{ width: '100%', fontSize: '13px', color: '#475569' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <ClockCircleOutlined style={{ color: '#c62828', marginTop: '3px' }} />
                    <div>
                      <strong>Thời gian:</strong> {dayjs(upcomingMeeting.date).format('HH:mm – DD/MM/YYYY')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <CalendarOutlined style={{ color: '#c62828', marginTop: '3px' }} />
                    <div>
                      <strong>Địa điểm:</strong> {upcomingMeeting.location}
                    </div>
                  </div>
                  {upcomingMeeting.dress_code && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <TeamOutlined style={{ color: '#c62828', marginTop: '3px' }} />
                      <div>
                        <strong>Trang phục:</strong> {upcomingMeeting.dress_code}
                      </div>
                    </div>
                  )}
                  {upcomingMeeting.note && (
                    <div style={{ display: 'flex', gap: '8px', color: '#cf1322', background: '#fff1f0', padding: '6px 10px', borderRadius: '6px', fontSize: '12px' }}>
                      <InfoCircleOutlined style={{ marginTop: '2px' }} />
                      <div>
                        <strong>Lưu ý:</strong> {upcomingMeeting.note}
                      </div>
                    </div>
                  )}
                </Space>

                <Divider style={{ margin: '14px 0' }} />

                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button 
                    type="primary" 
                    block
                    onClick={() => navigate('/lich-hop')}
                    style={{ backgroundColor: '#c62828', borderColor: '#c62828', fontWeight: 'bold', height: '36px', borderRadius: '6px' }}
                  >
                    Xem chương trình
                  </Button>
                  <Button 
                    type="default" 
                    danger
                    onClick={() => navigate('/xin-vang')}
                    style={{ fontWeight: 'bold', height: '36px', borderRadius: '6px' }}
                  >
                    Xin vắng họp
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* B. CÔNG VIỆC TUẦN ĐƯỢC GIAO */}
      <Card 
        bordered={false} 
        style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)', border: '1px solid #e2e8f0', marginTop: '20px' }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
            <SyncOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
            <span style={{ fontWeight: 800, fontSize: '15px', color: '#1e293b' }}>Nhiệm vụ tuần được phân công</span>
          </div>
        }
        extra={
          <Button type="link" onClick={() => navigate('/weekly-plan')} style={{ padding: 0, fontWeight: 700, color: '#1890ff' }}>
            Chi tiết kế hoạch <RightOutlined style={{ fontSize: 10 }} />
          </Button>
        }
      >
        {personalTasks.length === 0 ? (
          <Empty 
            description={
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                Đồng chí không có công việc nào cần thực hiện trong tuần này.
              </span>
            } 
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
          />
        ) : (
          <div className="task-list-container" style={{ maxHeight: 'none' }}>
            <List
              dataSource={personalTasks}
              renderItem={(subTask) => (
                <div style={{
                  padding: '12px 14px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #f1f5f9',
                  borderLeft: `4px solid ${subTask.status === 'Completed' ? '#52c41a' : (subTask.status === 'In Progress' ? '#1890ff' : '#d9d9d9')}`,
                  marginBottom: '10px'
                }}>
                  <Row gutter={[12, 8]} align="middle">
                    <Col xs={24} sm={16}>
                      <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '13px', lineHeight: 1.3 }}>
                        {subTask.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                        Mảng kế hoạch: <strong>{subTask.parentTaskTitle}</strong>
                      </div>
                    </Col>
                    <Col xs={24} sm={8}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>
                            <span>Tiến độ:</span>
                            <strong>{subTask.progress}%</strong>
                          </div>
                          <Progress 
                            percent={subTask.progress} 
                            size="small" 
                            status={subTask.status === 'Completed' ? 'success' : 'active'}
                            strokeColor={subTask.status === 'Completed' ? '#52c41a' : '#1890ff'}
                          />
                        </div>
                        <Tooltip title="Cập nhật nhanh tiến độ">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {subTask.progress < 100 && (
                              <Button 
                                size="small" 
                                type="primary" 
                                onClick={() => handleUpdateTaskProgress(subTask.parentTaskId, subTask.id, 100)}
                                style={{ fontSize: '10px', height: '20px', padding: '0 4px', backgroundColor: '#52c41a', borderColor: '#52c41a', fontWeight: 'bold' }}
                              >
                                Xong
                              </Button>
                            )}
                            {subTask.progress === 0 && (
                              <Button 
                                size="small" 
                                type="default" 
                                onClick={() => handleUpdateTaskProgress(subTask.parentTaskId, subTask.id, 50)}
                                style={{ fontSize: '10px', height: '20px', padding: '0 4px', fontWeight: 'bold' }}
                              >
                                50%
                              </Button>
                            )}
                          </div>
                        </Tooltip>
                      </div>
                    </Col>
                  </Row>
                </div>
              )}
            />
          </div>
        )}
      </Card>

      {/* 3. THÔNG TIN CHI ỦY & BAN ĐIỀU HÀNH CÁC NHÓM CỦA CHI BỘ */}
      <Card 
        bordered={false} 
        style={{ 
          borderRadius: '16px', 
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)', 
          border: '1px solid #e2e8f0', 
          marginTop: '20px' 
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
            <SafetyCertificateOutlined style={{ color: '#722ed1', fontSize: '16px' }} />
            <span style={{ fontWeight: 800, fontSize: '15px', color: '#1e293b' }}>Thông tin Chi ủy và Ban điều hành các nhóm của Chi bộ</span>
          </div>
        }
      >
        {/* Top Info Bar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '12px 18px', 
          background: 'linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%)', 
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#1890ff" style={{ marginRight: '8px' }}>
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            <strong>Email liên hệ Chi bộ:</strong> <span style={{ color: '#0f172a', fontWeight: 600, marginLeft: '6px' }}>{bchConfig.email || 'Chưa cập nhật'}</span>
          </div>
        </div>

        <Row gutter={[24, 20]}>
          {/* Cột trái: Ban Chi ủy (50%) */}
          <Col xs={24} lg={12}>
            <div style={{ 
              borderRight: '1px solid #f1f5f9', 
              paddingRight: '12px',
              height: '100%' 
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '16px',
                borderBottom: '2px solid #722ed1',
                paddingBottom: '8px'
              }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#722ed1">
                  <path d="M12 1.5l3.09 6.26L22 8.5l-5 4.87 1.18 6.88L12 17.25l-6.18 3.25L7 13.37l-5-4.87 6.91-.74L12 1.5z" />
                </svg>
                <span style={{ fontWeight: 800, fontSize: '14px', color: '#722ed1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Ban Chi ủy Chi bộ
                </span>
              </div>
              
              <Row gutter={[12, 12]}>
                {chiUyContacts.map((contact, index) => {
                  const roleLower = contact.role?.toLowerCase() || '';
                  const isBiThu = roleLower.includes('bí thư') && !roleLower.includes('phó');
                  const isPhoBiThu = roleLower.includes('phó bí thư') || roleLower.includes('phó bí thư');
                  
                  // Premium Solid-filled SVG Icons
                  const phoneSvg = (
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="#52c41a" style={{ marginRight: '6px', flexShrink: 0 }}>
                      <path d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.3-1.1-.5-2.3-.5-3.5 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"/>
                    </svg>
                  );
                  const mailSvg = (
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="#1890ff" style={{ marginRight: '6px', flexShrink: 0 }}>
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  );
                  const facebookSvg = (
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="#3b5998" style={{ marginRight: '6px', flexShrink: 0 }}>
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504l.062-.017v-6.722H6.428V12.02h2.473V9.927c0-2.447 1.457-3.799 3.684-3.799 1.066 0 2.18.19 2.18.19v2.393h-1.229c-1.21 0-1.589.753-1.589 1.524v1.826h2.7l-.432 2.76h-2.268v6.757c4.02-1.31 6.914-5.08 6.914-9.524C22 6.484 17.522 2 12 2z"/>
                    </svg>
                  );

                  return (
                    <Col span={24} sm={12} key={index}>
                      <div style={{ 
                        display: 'flex', 
                        gap: '16px', 
                        alignItems: 'flex-start',
                        padding: '16px',
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        height: '100%',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.borderColor = '#722ed1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                      >
                        <Avatar 
                          size={44} 
                          style={{ 
                            background: isPhoBiThu 
                              ? 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)'
                              : (isBiThu ? 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)' : 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)'), 
                            color: isPhoBiThu ? '#d46b08' : (isBiThu ? '#cf1322' : '#6d28d9'), 
                            fontWeight: 900,
                            fontSize: '15px',
                            border: isPhoBiThu ? '2px solid #ffe7ba' : (isBiThu ? '2px solid #ffccc7' : '2px solid #ddd6fe'),
                            flexShrink: 0 
                          }}
                        >
                          {contact.initial || (contact.name ? contact.name.trim().split(' ').pop().charAt(0).toUpperCase() : '?')}
                        </Avatar>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '14px', color: '#1e293b', marginBottom: '2px' }}>
                            {contact.name}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <Tag color={isPhoBiThu ? 'orange' : (isBiThu ? 'red' : 'purple')} style={{ border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 700, margin: 0 }}>
                              {contact.role}
                            </Tag>
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>• Chi ủy viên</span>
                          </div>
                          
                          {/* SĐT, Email, Facebook details */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '6px', fontSize: '11px' }}>
                            {contact.phone && (
                              <div style={{ color: '#475569', display: 'flex', alignItems: 'center' }}>
                                {phoneSvg} <span>SĐT: <strong>{contact.phone}</strong></span>
                              </div>
                            )}
                            {contact.email && (
                              <div style={{ color: '#475569', display: 'flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={contact.email}>
                                {mailSvg} <span>Email: <strong>{contact.email}</strong></span>
                              </div>
                            )}
                            {contact.facebook && (
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                {facebookSvg}
                                <a href={contact.facebook.startsWith('http') ? contact.facebook : `https://${contact.facebook}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff', fontWeight: 600 }}>
                                  Facebook liên kết
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          </Col>

          {/* Cột phải: Ban Điều Hành các nhóm (50%) */}
          <Col xs={24} lg={12}>
            <div style={{ height: '100%' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '16px',
                borderBottom: '2px solid #1890ff',
                paddingBottom: '8px'
              }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#1890ff">
                  <path d="M13 2.05v9.95h5.5l-9.5 10v-9.95H3.5l9.5-10z" />
                </svg>
                <span style={{ fontWeight: 800, fontSize: '14px', color: '#1890ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Ban điều hành các nhóm nghiệp vụ
                </span>
              </div>
              
              <Row gutter={[12, 12]}>
                {banDieuHanhContacts.map((contact, index) => {
                  const phoneSvg = (
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#1890ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', flexShrink: 0 }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  );
                  const facebookSvg = (
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#3b5998" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', flexShrink: 0 }}>
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                  );

                  return (
                    <Col span={24} sm={12} key={index}>
                      <div style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        alignItems: 'flex-start',
                        padding: '16px',
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        height: '100%',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.borderColor = '#1890ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                      >
                        <Avatar 
                          size={40} 
                          style={{ 
                            background: 'linear-gradient(135deg, #f0f9ff 0%, #bae6fd 100%)', 
                            color: '#0369a1', 
                            fontWeight: 900,
                            fontSize: '14px',
                            border: '2px solid #bae6fd',
                            flexShrink: 0 
                          }}
                        >
                          {contact.initial || (contact.name ? contact.name.trim().split(' ').pop().charAt(0).toUpperCase() : '?')}
                        </Avatar>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '13px', color: '#1e293b', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={contact.name}>
                            {contact.name}
                          </div>
                          <Tag color="blue" style={{ border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: 700, marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', maxWidth: '100%' }} title={contact.role}>
                            {contact.role}
                          </Tag>

                          {/* SĐT, Email, Facebook details */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '6px', fontSize: '11px' }}>
                            {contact.phone && (
                              <div style={{ color: '#475569', display: 'flex', alignItems: 'center' }}>
                                {phoneSvg} <span>SĐT: <strong>{contact.phone}</strong></span>
                              </div>
                            )}
                            {contact.email && (
                              <div style={{ color: '#475569', display: 'flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={contact.email}>
                                {mailSvg} <span>Email: <strong>{contact.email}</strong></span>
                              </div>
                            )}
                            {contact.facebook && (
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                {facebookSvg}
                                <a href={contact.facebook.startsWith('http') ? contact.facebook : `https://${contact.facebook}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff', fontWeight: 600 }}>
                                  Facebook liên kết
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 5. DRAWER READ ANNOUNCEMENT DETAIL */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <NotificationOutlined style={{ color: '#c62828', fontSize: '20px' }} />
            <span style={{ fontWeight: 900, color: '#c62828', fontSize: '15px', textTransform: 'uppercase' }}>Chi tiết thông báo</span>
          </div>
        }
        placement="right"
        width={550}
        onClose={() => setNotifDrawerOpen(false)}
        open={notifDrawerOpen}
        styles={{ body: { padding: '24px' } }}
        destroyOnClose
      >
        {selectedNotif && (
          <div style={{ fontFamily: "'SVN-Gilroy', 'Inter', sans-serif" }}>
            <Title level={4} style={{ fontWeight: 900, color: '#1e293b', marginBottom: '8px', lineHeight: 1.4 }}>
              {selectedNotif.title}
            </Title>

            <div style={{ display: 'flex', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9', marginBottom: '20px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}><UserOutlined style={{ marginRight: '4px' }} /> <strong>Người đăng:</strong> <span style={{ marginLeft: '4px' }}>{selectedNotif.created_by}</span></div>
              <div style={{ display: 'flex', alignItems: 'center' }}><CalendarOutlined style={{ marginRight: '4px' }} /> <strong>Ngày đăng:</strong> <span style={{ marginLeft: '4px' }}>{dayjs(selectedNotif.created_at).format('DD/MM/YYYY HH:mm')}</span></div>
              {selectedNotif.deadline && (
                <div style={{ color: '#cf1322', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  <ClockCircleOutlined style={{ marginRight: '4px' }} /> <strong>Hạn phản hồi:</strong> <span style={{ marginLeft: '4px' }}>{dayjs(selectedNotif.deadline).format('DD/MM/YYYY HH:mm')}</span>
                </div>
              )}
            </div>

            <Paragraph style={{ 
              fontSize: '14px', 
              color: '#334155', 
              lineHeight: 1.8, 
              textAlign: 'justify', 
              whiteSpace: 'pre-line',
              marginBottom: '24px'
            }}>
              {selectedNotif.content}
            </Paragraph>

            {selectedNotif.image_url && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px', background: '#f8fafc', textAlign: 'center', marginBottom: '24px' }}>
                <img 
                  src={selectedNotif.image_url} 
                  alt="Ảnh đính kèm" 
                  style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '350px', objectFit: 'contain' }}
                />
              </div>
            )}

            <Divider />

            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11px', fontStyle: 'italic' }}>
              Bản tin tự động gửi từ hệ thống quản lý chi bộ sinh viên.
            </div>
          </div>
        )}
      </Drawer>

      {/* 6. MODAL XEM THÀNH VIÊN TRONG NHÓM */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TeamOutlined style={{ color: '#c62828', fontSize: '20px' }} />
            <span style={{ fontWeight: 900, color: '#1e293b', fontSize: '15px', textTransform: 'uppercase' }}>
              Thành viên nhóm: {memberDetail?.nhom}
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
        <Paragraph style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic', marginBottom: '16px', padding: '0 12px' }}>
          Danh sách các đồng chí Đảng viên đang sinh hoạt cùng nhóm với đồng chí.
        </Paragraph>

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
                            {member.ho_ten} {member.id === memberDetail.id && <Tag color="blue" style={{ fontSize: '10px', marginLeft: '6px', fontWeight: 'bold' }}>BẠN</Tag>}
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
                            {member.so_dien_thoai && <span style={{ display: 'flex', alignItems: 'center' }}>
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="#52c41a" style={{ marginRight: '4px' }}>
                                <path d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.3-1.1-.5-2.3-.5-3.5 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"/>
                              </svg> SĐT: <strong>{member.so_dien_thoai}</strong>
                            </span>}
                            {member.email && <span style={{ display: 'flex', alignItems: 'center' }}>
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="#1890ff" style={{ marginRight: '4px' }}>
                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                              </svg> Email: <strong>{member.email}</strong>
                            </span>}
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
  );
};

export default DangVienDashboard;
