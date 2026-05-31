import { useState, useEffect } from 'react';
import {
  Card,
  Tag,
  Button,
  Progress,
  Avatar,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Slider,
  Radio,
  message,
  List,
  Divider,
  Empty,
  Typography,
  Alert,
  Tabs
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  FileSearchOutlined,
  SendOutlined,
  PieChartOutlined,
  CarryOutOutlined,
  StarOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  BellOutlined,
  CommentOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../services/permissionService';
import dayjs from 'dayjs';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

// Mapping Firestore 'nhom' to WeeklyPlan 'team'
const MAP_TEAM_TO_NHOM = {
  "ADMISSION_TEAM": "Phát triển Đảng",
  "OFFICIAL_TEAM": "Hồ sơ sinh hoạt Đảng",
  "ORGANIZATION_TEAM": "Tổ chức",
  "INSPECTION_TEAM": "Kiểm tra - Giám sát",
  "MEDIA_TEAM": "Truyền thông"
};

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

// Mapping the 5 business groups/teams
const TEAMS = {
  ADMISSION_TEAM: {
    key: 'ADMISSION_TEAM',
    name: 'Nhóm Hồ sơ kết nạp',
    leaderRole: ROLES.ADMISSION_MANAGER,
    leaderName: 'Đ/c Phạm Văn D',
    color: '#1890ff',
    bg: '#e6f7ff',
    border: '#91d5ff',
    icon: <FileTextOutlined style={{ color: '#1890ff' }} />,
    members: ['Đ/c Hoàng Thị Quỳnh Như', 'Đ/c Lê Thị Lan', 'Đ/c Nguyễn Văn Nam'],
    desc: 'Xử lý hồ sơ vào Đảng, theo dõi rèn luyện và chuẩn bị kết nạp.'
  },
  OFFICIAL_TEAM: {
    key: 'OFFICIAL_TEAM',
    name: 'Nhóm Đảng viên chính thức',
    leaderRole: ROLES.OFFICIAL_MANAGER,
    leaderName: 'Đ/c Trần Thị B',
    color: '#52c41a',
    bg: '#f6ffed',
    border: '#b7eb8f',
    icon: <StarOutlined style={{ color: '#52c41a' }} />,
    members: ['Đ/c Trần Văn An', 'Đ/c Phạm Thị Mai', 'Đ/c Hoàng Thị Quỳnh Như'],
    desc: 'Quản lý đảng viên chính thức, đánh giá xếp loại và sinh hoạt đảng.'
  },
  ORGANIZATION_TEAM: {
    key: 'ORGANIZATION_TEAM',
    name: 'Nhóm Tổ chức',
    leaderRole: ROLES.TOCHUC,
    leaderName: 'Đ/c Nguyễn Văn A',
    color: '#722ed1',
    bg: '#f9f0ff',
    border: '#d3adf7',
    icon: <TeamOutlined style={{ color: '#722ed1' }} />,
    members: ['Đ/c Lê Văn Bình', 'Đ/c Nguyễn Thị Hoa'],
    desc: 'Tổ chức lớp học Đảng, sinh hoạt chuyên đề, hậu cần & nhân sự.'
  },
  INSPECTION_TEAM: {
    key: 'INSPECTION_TEAM',
    name: 'Nhóm Kiểm tra - Giám sát',
    leaderRole: ROLES.KIEMTRA,
    leaderName: 'Đ/c Lê Văn Hoàng',
    color: '#fa8c16',
    bg: '#fff7e6',
    border: '#ffd591',
    icon: <SafetyCertificateOutlined style={{ color: '#fa8c16' }} />,
    members: ['Đ/c Đặng Văn Khang', 'Đ/c Ngô Thị Cúc'],
    desc: 'Biên bản họp, điểm danh sinh hoạt, hồ sơ kiểm tra & quản lý danh sách.'
  },
  MEDIA_TEAM: {
    key: 'MEDIA_TEAM',
    name: 'Nhóm Truyền thông',
    leaderRole: ROLES.TRUYENTHONG,
    leaderName: 'Đ/c Phan Anh Tuấn',
    color: '#eb2f96',
    bg: '#fff0f6',
    border: '#ffadd2',
    icon: <BellOutlined style={{ color: '#eb2f96' }} />,
    members: ['Đ/c Nguyễn Minh Triết', 'Đ/c Bùi Thanh Hằng'],
    desc: 'Thiết kế ấn phẩm, viết bài Fanpage, tuyên truyền sự kiện Chi bộ.'
  }
};

// Initial Realistic Task Data
const INITIAL_TASKS = [
  {
    id: 't-1',
    team: 'ADMISSION_TEAM',
    title: 'Thẩm định hồ sơ kết nạp Đảng quần chúng ưu tú quý II',
    description: 'Rà soát hồ sơ lý lịch, lấy ý kiến chi ủy nơi cư trú và lấy ý kiến của đoàn thể chính trị - xã hội để hoàn tất hồ sơ trình Đảng ủy cấp trên.',
    deadline: '2026-05-25',
    status: 'In Progress',
    evaluation: '',
    subTasks: [
      { id: 'st-1-1', title: 'Lấy ý kiến nhận xét nơi cư trú của quần chúng Nguyễn Văn Nam', assignee: 'Đ/c Lê Thị Lan', deadline: '2026-05-22', progress: 100, status: 'Completed' },
      { id: 'st-1-2', title: 'Trích sao lý lịch và hoàn tất bản thẩm tra lý lịch quần chúng Hoàng Thị Quỳnh Như', assignee: 'Đ/c Hoàng Thị Quỳnh Như', deadline: '2026-05-24', progress: 40, status: 'In Progress' },
      { id: 'st-1-3', title: 'Chuẩn bị dự thảo Nghị quyết họp xét kết nạp Đảng', assignee: 'Đ/c Nguyễn Văn Nam', deadline: '2026-05-25', progress: 0, status: 'Pending' }
    ]
  },
  {
    id: 't-2',
    team: 'OFFICIAL_TEAM',
    title: 'Thu Đảng phí tháng 5 và rà soát Hồ sơ chuyển sinh hoạt Đảng chính thức',
    description: 'Đôn đốc đảng viên hoàn thành đóng đảng phí đúng hạn và lập danh sách chuyển sinh hoạt Đảng chính thức cho các đảng viên sinh viên đã tốt nghiệp.',
    deadline: '2026-05-23',
    status: 'In Progress',
    evaluation: '',
    subTasks: [
      { id: 'st-2-1', title: 'Thu nộp Đảng phí trực tuyến chi bộ tháng 5', assignee: 'Đ/c Trần Văn An', deadline: '2026-05-21', progress: 100, status: 'Completed' },
      { id: 'st-2-2', title: 'Kiểm tra hồ sơ chuyển sinh hoạt Đảng của các đảng viên ra trường', assignee: 'Đ/c Phạm Thị Mai', deadline: '2026-05-23', progress: 20, status: 'In Progress' }
    ]
  },
  {
    id: 't-3',
    team: 'ORGANIZATION_TEAM',
    title: 'Tổ chức Lớp bồi dưỡng nhận thức về Đảng đợt 1 năm 2026',
    description: 'Liên hệ trung tâm chính trị trường, chuẩn bị phòng học, tài liệu và điểm danh lớp học cảm tình Đảng cho 45 quần chúng ưu tú.',
    deadline: '2026-05-24',
    status: 'In Progress',
    evaluation: '',
    subTasks: [
      { id: 'st-3-1', title: 'Chuẩn bị hội trường sinh hoạt và kiểm tra trang thiết bị âm thanh, máy chiếu', assignee: 'Đ/c Lê Văn Bình', deadline: '2026-05-22', progress: 100, status: 'Completed' },
      { id: 'st-3-2', title: 'Lập danh sách học viên và gửi thông báo, giấy triệu tập học tập', assignee: 'Đ/c Nguyễn Thị Hoa', deadline: '2026-05-24', progress: 50, status: 'In Progress' }
    ]
  },
  {
    id: 't-4',
    team: 'INSPECTION_TEAM',
    title: 'Kiểm tra chuyên đề việc chấp hành sinh hoạt định kỳ tại Tổ Đảng 2 & 3',
    description: 'Thu nhận biên bản sinh hoạt tổ Đảng, tiến hành điểm danh đối chiếu chéo và cập nhật chính xác danh sách Đảng viên biến động vào sổ Đảng số.',
    deadline: '2026-05-26',
    status: 'In Progress',
    evaluation: '',
    subTasks: [
      { id: 'st-4-1', title: 'Điểm danh họp Chi bộ định kỳ và lập biên bản chính thức', assignee: 'Đ/c Đặng Văn Khang', deadline: '2026-05-20', progress: 100, status: 'Completed' },
      { id: 'st-4-2', title: 'Rà soát danh sách Đảng viên dự bị sắp hết hạn rèn luyện 12 tháng', assignee: 'Đ/c Ngô Thị Cúc', deadline: '2026-05-25', progress: 80, status: 'In Progress' }
    ]
  },
  {
    id: 't-5',
    team: 'MEDIA_TEAM',
    title: 'Đẩy mạnh truyền thông đợt sinh hoạt chuyên đề Kỷ niệm ngày sinh Bác Hồ 19/5',
    description: 'Biên tập nội dung các câu nói ý nghĩa của Bác Hồ, thiết kế ấn phẩm đồ họa đăng tải Fanpage và truyền thông phát động thi đua viết nhật ký học tập.',
    deadline: '2026-05-22',
    status: 'Completed',
    evaluation: 'Bài viết có tương tác tốt, poster thiết kế rất chuyên nghiệp, đúng tinh thần Chi bộ.',
    subTasks: [
      { id: 'st-5-1', title: 'Thiết kế Poster truyền thông chuyên đề học tập tấm gương Hồ Chí Minh 19/5', assignee: 'Đ/c Nguyễn Minh Triết', deadline: '2026-05-18', progress: 100, status: 'Completed' },
      { id: 'st-5-2', title: 'Viết bài tổng thuật kết quả buổi sinh hoạt chuyên đề đăng Fanpage chi bộ', assignee: 'Đ/c Bùi Thanh Hằng', deadline: '2026-05-20', progress: 100, status: 'Completed' }
    ]
  }
];

const WeeklyPlan = () => {
  const { currentUser, getRoleBadgeName } = useAuth();
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('weekly_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [dbMembers, setDbMembers] = useState([]);
  const [, setLoadingMembers] = useState(true);

  // Fetch real members from Firestore
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "dang_vien"));
        const list = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(dv => !dv.trang_thai || dv.trang_thai === 'dang_sinh_hoat');
        setDbMembers(list);
      } catch (error) {
        console.error("Lỗi khi tải thành viên nhóm:", error);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, []);

  // Helper to get real members of a team
  const getTeamMembers = (teamKey) => {
    const nhomName = MAP_TEAM_TO_NHOM[teamKey];
    if (!nhomName) return [];

    const matched = dbMembers.filter(m => m.nhom === nhomName);
    if (matched.length === 0) {
      // Fallback to initial mockup data if no members are registered in this group yet
      return TEAMS[teamKey]?.members || [];
    }
    return matched.map(m => `Đ/c ${m.ho_ten}`);
  };

  // State Management
  const [activeTab, setActiveTab] = useState('team-tasks'); // 'team-tasks', 'my-tasks', 'reports'

  // Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [evaluateModalVisible, setEvaluateModalVisible] = useState(false);

  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [commentText, setCommentText] = useState("");

  // Forms
  const [createForm] = Form.useForm();
  const [subTaskForm] = Form.useForm();
  const [evaluateForm] = Form.useForm();

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('weekly_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Role Checks Helper
  const isBiThu = currentUser?.role === ROLES.BITHU || currentUser?.role === ROLES.ADMIN;
  const isCapUy = currentUser?.role === ROLES.CAPUY || currentUser?.role === ROLES.PHOBIHU || isBiThu;

  // Checking if current user is the leader of a specific team
  const getLeaderTeamKey = () => {
    if (!currentUser) return null;
    const matched = Object.values(TEAMS).find(t => t.leaderRole === currentUser.role);
    return matched ? matched.key : null;
  };

  const isLeaderOf = (teamKey) => {
    if (isBiThu) return true; // Bi Thu has master rights
    const leaderTeam = getLeaderTeamKey();
    return leaderTeam === teamKey;
  };

  const getCurrentUserNhom = () => {
    if (!currentUser) return null;
    const found = dbMembers.find(m => m.mssv === currentUser.username || m.mssv === currentUser.mssv);
    return found ? found.nhom : null;
  };

  const getCurrentUserTeamKey = () => {
    const nhom = getCurrentUserNhom();
    if (!nhom) return null;
    const entry = Object.entries(MAP_TEAM_TO_NHOM).find(([, v]) => v === nhom);
    return entry ? entry[0] : null;
  };

  const getVisibleTeamKeys = () => {
    if (isBiThu || isCapUy) return Object.keys(TEAMS);
    const userTeamKey = getCurrentUserTeamKey();
    const leaderTeamKey = getLeaderTeamKey();
    const keys = [];
    if (userTeamKey) keys.push(userTeamKey);
    if (leaderTeamKey && !keys.includes(leaderTeamKey)) keys.push(leaderTeamKey);
    return keys.length > 0 ? keys : Object.keys(TEAMS); // Fallback to all if not categorized
  };

  // ----------------------------------------------------
  // ACTION HANDLERS
  // ----------------------------------------------------

  // 1. Parent Task Creation (Bi Thu / Admin only)
  const handleCreateTask = (values) => {
    // Check duplication of parent task for the same team in the weekly plan
    const teamHasTask = tasks.some(t => t.team === values.team && t.status !== 'Completed');
    if (teamHasTask && !values.force) {
      message.warning(`Nhóm này đã có một kế hoạch tuần chưa hoàn thành. Hãy tối ưu để tránh chồng chéo!`);
    }

    const newParentTask = {
      id: `t-${Date.now()}`,
      team: values.team,
      title: values.title,
      description: values.description || '',
      deadline: values.deadline.format('YYYY-MM-DD'),
      status: 'Pending',
      evaluation: '',
      subTasks: []
    };

    setTasks([newParentTask, ...tasks]);
    if (isBiThu) {
      message.success(`Đã giao nhiệm vụ mới thành công cho ${TEAMS[values.team].name}!`);
    } else {
      message.success(`Đã tạo kế hoạch mới thành công cho ${TEAMS[values.team].name}!`);
    }
    setCreateModalVisible(false);
    createForm.resetFields();
  };

  // 2. Delete Parent Task (Cap Uy / Bi Thu only)
  const handleDeleteTask = (taskId, e) => {
    e.stopPropagation();
    Modal.confirm({
      title: 'Xác nhận xóa nhiệm vụ?',
      content: 'Nhiệm vụ cha cùng toàn bộ phân công phân rã nội bộ của nhóm sẽ bị xóa vĩnh viễn.',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: () => {
        setTasks(tasks.filter(t => t.id !== taskId));
        message.success('Đã xóa nhiệm vụ thành công.');
      }
    });
  };

  // 3. Sub-Task Management (Group Leaders only)
  const handleAddSubTask = (values) => {
    if (!selectedTask) return;

    const newSubTask = {
      id: `st-${Date.now()}`,
      title: values.title,
      assignee: values.assignee,
      deadline: values.deadline.format('YYYY-MM-DD'),
      progress: 0,
      status: 'Pending'
    };

    const updatedTasks = tasks.map(t => {
      if (t.id === selectedTask.id) {
        const newSubs = [...t.subTasks, newSubTask];
        // Parent task becomes 'In Progress' automatically when a subtask is added
        return {
          ...t,
          status: 'In Progress',
          subTasks: newSubs
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    // Update active modal selected task reference
    const activeTask = updatedTasks.find(t => t.id === selectedTask.id);
    setSelectedTask(activeTask);

    message.success(`Đã phân công việc cho ${values.assignee}!`);
    subTaskForm.resetFields();
  };

  const handleDeleteSubTask = (subTaskId) => {
    if (!selectedTask) return;

    const updatedTasks = tasks.map(t => {
      if (t.id === selectedTask.id) {
        return {
          ...t,
          subTasks: t.subTasks.filter(s => s.id !== subTaskId)
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    const activeTask = updatedTasks.find(t => t.id === selectedTask.id);
    setSelectedTask(activeTask);
    message.success('Đã xóa phân công nội bộ.');
  };

  // 4. Personal Task Update (For Dang Vien - updates progress and status)
  const handleUpdatePersonalSubTask = (taskId, subTaskId, newProgress, newStatus) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const updatedSubs = t.subTasks.map(s => {
          if (s.id === subTaskId) {
            return { ...s, progress: newProgress, status: newStatus };
          }
          return s;
        });

        // Automatically calculate parent status based on subtasks
        const allCompleted = updatedSubs.length > 0 && updatedSubs.every(s => s.status === 'Completed');
        const parentStatus = allCompleted ? 'Completed' : 'In Progress';

        return {
          ...t,
          status: parentStatus,
          subTasks: updatedSubs
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    message.success('Đã cập nhật tiến độ công việc cá nhân thành công!');
  };

  // 5. Add Comment to Task Discussion
  const handleAddComment = () => {
    if (!commentText.trim() || !selectedTask) return;

    const newComment = {
      id: `c-${Date.now()}`,
      userName: currentUser?.name || 'Đảng viên',
      userRole: currentUser?.role || '',
      content: commentText.trim(),
      timestamp: dayjs().format('YYYY-MM-DD HH:mm')
    };

    const updatedTasks = tasks.map(t => {
      if (t.id === selectedTask.id) {
        const comments = t.comments || [];
        return {
          ...t,
          comments: [...comments, newComment]
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    // Update active modal selectedTask state to reflect changes instantly
    setSelectedTask(prev => ({
      ...prev,
      comments: [...(prev.comments || []), newComment]
    }));
    setCommentText("");
    message.success("Đã đăng bình luận thảo luận!");
  };

  // 5. Evaluate End of Week (Bí thư only)
  const handleEvaluateTask = (values) => {
    if (!selectedTask) return;

    const updatedTasks = tasks.map(t => {
      if (t.id === selectedTask.id) {
        return {
          ...t,
          evaluation: values.evaluation,
          status: values.status // Can change to completed or request review
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    message.success('Đã ghi nhận nhận xét đánh giá của Bí thư!');
    setEvaluateModalVisible(false);
    evaluateForm.resetFields();
  };

  // ----------------------------------------------------
  // COMPUTED VIEWS DATA
  // ----------------------------------------------------

  // Extract all subtasks assigned to the logged-in user (match by substring of name)
  const getPersonalTasks = () => {
    if (!currentUser) return [];

    // We match by the user's name. E.g. "Đ/c Hoàng Thị Quỳnh Như"
    const userName = currentUser.name || '';
    const nameClean = userName.replace(/[([].*?[)\]]/g, '').trim(); // Remove brackets/role

    const personal = [];
    tasks.forEach(task => {
      task.subTasks.forEach(sub => {
        if (sub.assignee.includes(nameClean) || nameClean.includes(sub.assignee.replace('Đ/c', '').trim())) {
          personal.push({
            parentTask: task,
            ...sub
          });
        }
      });
    });
    return personal;
  };

  const personalTasks = getPersonalTasks();

  // Calculate task statistics for Reports view
  const getTeamStats = (teamKey) => {
    const teamTasks = tasks.filter(t => t.team === teamKey);
    let totalSubs = 0;
    let completedSubs = 0;

    teamTasks.forEach(t => {
      totalSubs += t.subTasks.length;
      completedSubs += t.subTasks.filter(s => s.status === 'Completed').length;
    });

    const completionRate = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : (teamTasks.some(t => t.status === 'Completed') ? 100 : 0);

    return {
      taskCount: teamTasks.length,
      pendingCount: teamTasks.filter(t => t.status === 'Pending').length,
      inProgressCount: teamTasks.filter(t => t.status === 'In Progress').length,
      completedCount: teamTasks.filter(t => t.status === 'Completed').length,
      totalSubs,
      completedSubs,
      completionRate
    };
  };

  return (
    <div style={{ fontFamily: "'SVN-Gilroy', 'Inter', sans-serif", padding: '12px 0' }}>

      {/* PAGE HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        borderBottom: '1px solid #f0f0f0',
        paddingBottom: '12px'
      }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarOutlined style={{ color: '#c62828' }} /> Kế hoạch công việc thực hiện
          </Title>
        </div>
        {(isBiThu || isCapUy || !!getLeaderTeamKey() || !!getCurrentUserTeamKey()) && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              createForm.setFieldsValue({ 
                team: (isBiThu || isCapUy) ? undefined : (getLeaderTeamKey() || getCurrentUserTeamKey()),
                deadline: dayjs().add(7, 'day') 
              });
              setCreateModalVisible(true);
            }}
            style={{
              backgroundColor: '#c62828',
              borderColor: '#c62828',
              fontWeight: 700,
              borderRadius: '6px'
            }}
          >
            {isBiThu || isCapUy ? "Giao việc mới" : "Tạo kế hoạch công việc mới"}
          </Button>
        )}
      </div>

      {/* TAB NAVIGATION */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <Radio.Group
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          size="large"
        >
          <Radio.Button value="team-tasks" style={{ padding: '0 24px', fontWeight: 700 }}>
            <TeamOutlined style={{ marginRight: '6px' }} /> {isCapUy ? "Kế hoạch công việc 5 nhóm" : "Kế hoạch công việc của nhóm"}
          </Radio.Button>
          <Radio.Button value="my-tasks" style={{ padding: '0 24px', fontWeight: 700 }}>
            <CarryOutOutlined style={{ marginRight: '6px' }} /> Việc cần làm của tôi ({personalTasks.length})
          </Radio.Button>
          {isCapUy && (
            <Radio.Button value="reports" style={{ padding: '0 24px', fontWeight: 700 }}>
              <PieChartOutlined style={{ marginRight: '6px' }} /> Báo cáo & Đánh giá
            </Radio.Button>
          )}
        </Radio.Group>
      </div>

      {/* ====================================================
          TAB 1: TEAM TASKS (TABS LAYOUT - 5 BUSINESS TABS)
          ==================================================== */}
      {activeTab === 'team-tasks' && (
        <Tabs 
          type="card"
          defaultActiveKey={getVisibleTeamKeys()[0]}
          items={getVisibleTeamKeys().map(teamKey => {
            const team = TEAMS[teamKey];
            const teamTasks = tasks.filter(t => t.team === teamKey);
            const sortedTeamTasks = [...teamTasks].sort((a, b) => {
              if (a.status === 'Completed' && b.status !== 'Completed') return 1;
              if (a.status !== 'Completed' && b.status === 'Completed') return -1;
              return 0;
            });

            return {
              key: teamKey,
              label: (
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {team.icon} 
                  {team.name}
                </span>
              ),
              children: (
                <div style={{
                  background: '#f8f9fa',
                  borderRadius: '0 8px 8px 8px',
                  padding: '24px',
                  borderTop: `4px solid ${team.color}`,
                  minHeight: '400px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}>
                  {/* Grid for Cards */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '24px',
                    alignItems: 'start'
                  }}>
                    {sortedTeamTasks.length > 0 ? (
                      sortedTeamTasks.map(teamTask => (
                        <Card
                          key={teamTask.id}
                          hoverable
                          size="small"
                          style={{
                            border: teamTask.status === 'Completed' ? '1px solid #d9f7be' : '1px solid #d9d9d9',
                            borderRadius: '8px',
                            background: teamTask.status === 'Completed' ? '#f6ffed' : '#ffffff',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                          }}
                          bodyStyle={{ padding: '16px' }}
                          onClick={() => {
                            setSelectedTask(teamTask);
                            setSelectedTeam(team);
                            setDetailModalVisible(true);
                          }}
                        >
                          {/* Task Status */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            {teamTask.status === 'Completed' ? (
                              <Tag color="success"><CheckCircleOutlined /> Đã xong</Tag>
                            ) : teamTask.status === 'In Progress' ? (
                              <Tag color="processing"><SyncOutlined spin /> Đang làm</Tag>
                            ) : (
                              <Tag color="default"><ClockCircleOutlined /> Đang chờ</Tag>
                            )}
                            <Text style={{ fontSize: '11px', color: '#999', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CalendarOutlined /> {teamTask.deadline ? dayjs(teamTask.deadline).format('YYYY-MM-DD') : ''}
                            </Text>
                          </div>

                          {/* Task Title */}
                          <Title level={5} style={{ margin: '0 0 8px 0', fontSize: '14px', lineHeight: 1.4, color: '#262626' }}>
                            {teamTask.title}
                          </Title>
                          
                          <Paragraph ellipsis={{ rows: 2 }} style={{ fontSize: '12px', color: '#777', margin: 0, minHeight: '38px' }}>
                            {teamTask.description}
                          </Paragraph>

                          <Divider style={{ margin: '12px 0' }} />

                          {/* Sub-tasks interactive section */}
                          <div style={{ background: '#fafafa', padding: '10px', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '10px', fontWeight: 600, color: '#8c8c8c', textTransform: 'uppercase' }}>
                              <UnorderedListOutlined /> CÔNG VIỆC & NGƯỜI PHỤ TRÁCH:
                            </div>
                            
                            <div style={{ 
                              maxHeight: '140px', 
                              overflowY: 'auto', 
                              paddingRight: '4px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}>
                              {teamTask.subTasks?.length > 0 ? (
                                teamTask.subTasks.map(sub => (
                                  <div key={sub.id} style={{
                                    padding: '8px 10px',
                                    background: sub.status === 'Completed' ? '#f6ffed' : '#ffffff',
                                    borderLeft: `3px solid ${sub.status === 'Completed' ? '#52c41a' : (sub.status === 'In Progress' ? '#1890ff' : '#d9d9d9')}`,
                                    borderRadius: '0 4px 4px 0',
                                    border: '1px solid #f0f0f0',
                                    borderLeftWidth: '3px',
                                    fontSize: '12px'
                                  }}>
                                    <div style={{ 
                                      color: sub.status === 'Completed' ? '#8c8c8c' : '#333',
                                      textDecoration: sub.status === 'Completed' ? 'line-through' : 'none',
                                      marginBottom: '6px',
                                      lineHeight: 1.3
                                    }}>
                                      {sub.title}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                      <Tag icon={<UserOutlined />} color={sub.status === 'Completed' ? 'default' : 'success'} style={{ margin: 0, border: 'none', background: sub.status === 'Completed' ? '#f5f5f5' : '#e6f7ff', color: sub.status === 'Completed' ? '#bfbfbf' : '#000' }}>
                                        {sub.assignee || 'Chưa rõ'}
                                      </Tag>
                                      {sub.deadline && (
                                        <Text style={{ fontSize: '10px', color: '#ff4d4f', fontWeight: 500 }}><ClockCircleOutlined /> Hạn: {dayjs(sub.deadline).format('DD/MM/YYYY')}</Text>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div style={{ color: '#d48806', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <ClockCircleOutlined /> <em>Chưa phân công nội bộ</em>
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '11px' }}>
                            <Text type="secondary">Tiến độ chung:</Text>
                            <Text strong>{teamTask.subTasks?.filter(s => s.status === 'Completed').length || 0}/{teamTask.subTasks?.length || 0} việc</Text>
                          </div>
                          
                          <Progress 
                            percent={teamTask.progress || 0} 
                            size="small" 
                            status={teamTask.status === 'Completed' ? 'success' : 'active'} 
                            strokeColor={teamTask.status === 'Completed' ? '#52c41a' : team.color}
                          />

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                            <Button type="link" size="small" style={{ padding: 0, fontSize: '12px', color: '#1890ff', fontWeight: 500 }}>
                              <EditOutlined /> Phân việc chi tiết
                            </Button>
                            {(isBiThu || isCapUy || isLeaderOf(teamKey) || getCurrentUserTeamKey() === teamKey) && (
                              <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(teamTask.id, e);
                              }} />
                            )}
                          </div>
                        </Card>
                      ))
                    ) : (
                      <div style={{
                        gridColumn: '1 / -1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '60px 20px',
                        background: 'rgba(255,255,255,0.6)',
                        borderRadius: '8px',
                        border: '1px dashed #d9d9d9',
                        textAlign: 'center'
                      }}>
                        <Empty description={false} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '0 0 16px 0' }} />
                        <Text style={{ fontSize: '14px', color: '#999' }}>Chưa có kế hoạch công việc nào được giao cho mảng này.</Text>
                      </div>
                    )}

                    {/* Add New Plan Card */}
                    {(isBiThu || isCapUy || isLeaderOf(teamKey) || getCurrentUserTeamKey() === teamKey) && (
                      <div
                        style={{
                          height: '100%',
                          minHeight: '200px',
                          background: 'rgba(255,255,255,0.5)',
                          border: '1.5px dashed #d9d9d9',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          color: '#888'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.color = team.color; e.currentTarget.style.borderColor = team.color; e.currentTarget.style.background = '#fff'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#d9d9d9'; e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; }}
                        onClick={() => {
                          createForm.setFieldsValue({ 
                            team: teamKey,
                            deadline: dayjs().add(7, 'day') 
                          });
                          setCreateModalVisible(true);
                        }}
                      >
                        <PlusOutlined style={{ fontSize: '24px', marginBottom: '12px' }} />
                        <span style={{ fontWeight: 500 }}>Thêm kế hoạch mới</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            };
          })}
        />
      )}

      {/* ====================================================
          TAB 2: MY TASKS (DANG VIEN INTERACTIVE AREA)
          ==================================================== */}
      {activeTab === 'my-tasks' && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CarryOutOutlined style={{ fontSize: '20px', color: '#c62828' }} />
            <Title level={4} style={{ margin: 0 }}>Nhiệm vụ cá nhân của tôi</Title>
          </div>

          <Paragraph style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>
            Khu vực dành riêng cho từng Đảng viên. Bạn chỉ nhìn thấy những sub-task chi tiết được Ủy viên phụ trách phân công riêng cho mình. Trượt thanh kéo tiến độ (%) và chọn trạng thái tương ứng để báo cáo kết quả rèn luyện công việc.
          </Paragraph>

          {personalTasks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {personalTasks.map(item => {
                const team = TEAMS[item.parentTask.team];
                return (
                  <Card
                    key={item.id}
                    bordered={true}
                    style={{
                      borderRadius: '8px',
                      borderLeft: `5px solid ${team.color}`,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                    }}
                    bodyStyle={{ padding: '16px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: '280px' }}>
                        {/* Parent Context */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', background: team.bg, color: team.color, padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                            {team.name}
                          </span>
                          <span style={{ fontSize: '11px', color: '#999' }}>
                            Nhiệm vụ tuần: <strong>{item.parentTask.title}</strong>
                          </span>
                        </div>

                        {/* Subtask Title */}
                        <Title level={5} style={{ margin: '0 0 8px 0', color: '#333' }}>
                          {item.title}
                        </Title>

                        <Text style={{ fontSize: '12px', color: '#555', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CalendarOutlined /> Hạn hoàn thành sub-task: <strong style={{ color: '#c62828' }}>{item.deadline}</strong>
                        </Text>
                      </div>

                      {/* Interactive Update Panel */}
                      <div style={{
                        background: '#fcfcfc',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e8e8e8',
                        width: '320px'
                      }}>
                        <div style={{ fontWeight: 800, fontSize: '12px', color: '#444', marginBottom: '8px' }}>
                          Cập nhật báo cáo tiến độ cá nhân:
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginBottom: '2px' }}>
                            <span>Tiến độ hiện tại:</span>
                            <strong style={{ color: team.color }}>{item.progress}%</strong>
                          </div>
                          <Slider
                            value={item.progress}
                            min={0}
                            max={100}
                            step={10}
                            tooltip={{ formatter: (v) => `${v}%` }}
                            onChange={(value) => {
                              const newStatus = value === 100 ? 'Completed' : (value > 0 ? 'In Progress' : 'Pending');
                              handleUpdatePersonalSubTask(item.parentTask.id, item.id, value, newStatus);
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#666' }}>Trạng thái:</span>
                          <Select
                            value={item.status}
                            size="small"
                            style={{ width: '130px' }}
                            onChange={(status) => {
                              const progressVal = status === 'Completed' ? 100 : (status === 'Pending' ? 0 : 50);
                              handleUpdatePersonalSubTask(item.parentTask.id, item.id, progressVal, status);
                            }}
                          >
                            <Option value="Pending"><ClockCircleOutlined /> Đang chờ</Option>
                            <Option value="In Progress"><SyncOutlined spin /> Đang làm</Option>
                            <Option value="Completed"><CheckCircleOutlined /> Hoàn thành</Option>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', border: '1.5px dashed #e8e8e8', borderRadius: '12px' }}>
              <Empty description="Bạn không có sub-task phân công cá nhân nào trong tuần này." />
              <Text style={{ fontSize: '12px', color: '#999', display: 'block', marginTop: '8px' }}>
                Gợi ý: Ủy viên phụ trách hoặc Bí thư cần tạo nhiệm vụ cha, sau đó nhấp vào "Phân việc chi tiết" để chỉ định tên bạn vào công việc.
              </Text>
            </div>
          )}
        </div>
      )}

      {/* ====================================================
          TAB 3: REPORTS & EVALUATION
          ==================================================== */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Progress Overview Section */}
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <PieChartOutlined style={{ fontSize: '20px', color: '#c62828' }} />
              <Title level={4} style={{ margin: 0 }}>Đánh giá & Thống kê tiến độ theo nhóm</Title>
            </div>

            <Paragraph style={{ color: '#666', fontSize: '13px', marginBottom: '24px' }}>
              Bảng theo dõi thời gian thực kết quả triển khai công tác tuần của 5 nhóm nghiệp vụ. Bí thư Chi bộ xem chi tiết và thực hiện đánh giá, xếp loại rèn luyện vào cuối tuần.
            </Paragraph>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {getVisibleTeamKeys().map(teamKey => {
                const team = TEAMS[teamKey];
                const stats = getTeamStats(teamKey);
                const activeTask = tasks.find(t => t.team === teamKey && t.status !== 'Completed') ||
                  tasks.find(t => t.team === teamKey);

                return (
                  <div
                    key={teamKey}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #e8e8e8',
                      background: '#fafafa',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                      {team.icon}
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#333' }}>{team.name}</div>
                        <Text style={{ fontSize: '11px', color: '#777' }}>Leader: <strong>{team.leaderName}</strong></Text>
                      </div>
                    </div>

                    {/* Task Progress Bar */}
                    <div style={{ flex: 1, minWidth: '200px', maxWidth: '400px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                        <span>Tiến độ hoàn thành sub-task:</span>
                        <strong style={{ color: team.color }}>{stats.completionRate}%</strong>
                      </div>
                      <Progress percent={stats.completionRate} strokeColor={team.color} />
                    </div>

                    {/* Stats numeric counters */}
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                      <Tag color="cyan">Nhiệm vụ: {stats.taskCount}</Tag>
                      <Tag color="success">Xong: {stats.completedSubs}/{stats.totalSubs}</Tag>
                      {activeTask?.evaluation ? (
                        <Tag color="blue">Đã đánh giá</Tag>
                      ) : (
                        <Tag color="orange">Chưa nhận xét</Tag>
                      )}
                    </div>

                    {/* Evaluator button */}
                    <div>
                      {isBiThu && activeTask ? (
                        <Button
                          type="primary"
                          size="small"
                          onClick={() => {
                            setSelectedTask(activeTask);
                            setSelectedTeam(team);
                            evaluateForm.setFieldsValue({
                              evaluation: activeTask.evaluation,
                              status: activeTask.status
                            });
                            setEvaluateModalVisible(true);
                          }}
                          style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', fontWeight: 600 }}
                        >
                          Ghi nhận xét
                        </Button>
                      ) : activeTask?.evaluation ? (
                        <Tooltip title={activeTask.evaluation}>
                          <Button size="small" type="dashed">Xem nhận xét</Button>
                        </Tooltip>
                      ) : (
                        <Text style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>Chưa nhận xét</Text>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Workflow Explanation Banner */}
          <div style={{
            background: 'linear-gradient(to right, #fff1f0, #ffffff)',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: '5px solid #c62828',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            <Title level={5} style={{ color: '#c62828', margin: '0 0 8px 0', fontWeight: 800 }}>
              Sổ Tay Vận Hành Chi Bộ (Standard Operating Procedure)
            </Title>
            <Paragraph style={{ fontSize: '12px', color: '#555', margin: 0, lineHeight: '1.6' }}>
              <strong>1. Giao kế hoạch tuần (Bí thư):</strong> Giao nhiệm vụ trọng tâm bám sát năng lực của từng tổ nghiệp vụ. Tránh giao việc trùng lặp.<br />
              <strong>2. Phân rã công việc (Phụ trách):</strong> Ủy viên phụ trách nhấp chọn nhiệm vụ cha được giao để phân chia công việc chi tiết thành các sub-task, ấn định thời gian kết thúc và giao tên Đảng viên phụ trách cụ thể.<br />
              <strong>3. Thực thi báo cáo (Đảng viên):</strong> Từng Đảng viên chủ động xem việc trong tab cá nhân và tự kéo thanh báo cáo tiến độ khi thực hiện xong, đảm bảo tính trung thực và trách nhiệm.<br />
              <strong>4. Đánh giá chất lượng (Bí thư):</strong> Bí thư căn cứ vào tỷ lệ % hoàn thành và chất lượng thực tế để viết nhận xét đánh giá, làm cơ sở xếp loại đảng viên định kỳ.
            </Paragraph>
          </div>
        </div>
      )}

      {/* ====================================================
          MODALS AREA
          ==================================================== */}

      {/* 1. Create Task Modal */}
      <Modal
        title={
          <span style={{ fontWeight: 800, color: '#c62828' }}>
            <PlusOutlined /> {isBiThu ? "GIAO NHIỆM VỤ TUẦN MỚI CHO CÁC NHÓM" : "TẠO KẾ HOẠCH TUẦN MỚI CHO NHÓM"}
          </span>
        }
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateTask}
          initialValues={{ 
            deadline: dayjs().add(7, 'day'),
            team: isBiThu ? undefined : getCurrentUserTeamKey()
          }}
        >
          <Form.Item
            name="team"
            label="Chọn nhóm nghiệp vụ"
            rules={[{ required: true, message: 'Vui lòng chọn nhóm nghiệp vụ!' }]}
          >
            <Select placeholder="Chọn nhóm nhận nhiệm vụ" disabled={!isBiThu}>
              {Object.keys(TEAMS).map(key => (
                <Option key={key} value={key}>
                  {TEAMS[key].name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="Tiêu đề nhiệm vụ trọng tâm"
            rules={[{ required: true, message: 'Nhập tiêu đề nhiệm vụ cha!' }]}
          >
            <Input placeholder="Ví dụ: Tổ chức lớp cảm tình Đảng đợt 1 năm 2026..." />
          </Form.Item>

          <Form.Item 
            name="description" 
            label={isBiThu ? "Nội dung yêu cầu chi tiết (Bí thư chỉ đạo)" : "Nội dung kế hoạch chi tiết (Nhóm đề xuất)"}
          >
            <TextArea 
              rows={4} 
              placeholder={isBiThu ? "Mô tả cụ thể định hướng, kết quả mong đợi đầu ra của nhiệm vụ tuần..." : "Mô tả cụ thể định hướng công việc và phân công sơ bộ của nhóm..."} 
            />
          </Form.Item>

          <Form.Item
            name="deadline"
            label="Thời hạn hoàn thành kế hoạch"
            rules={[{ required: true, message: 'Chọn thời hạn hoàn thành!' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button onClick={() => setCreateModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#c62828', borderColor: '#c62828' }}>
                {isBiThu ? "Phát lệnh giao việc" : "Tạo kế hoạch"}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 2. Detail & Sub-task Assignment Modal */}
      <Modal
        title={
          <div style={{ borderBottom: `2.5px solid ${selectedTeam?.color}`, paddingBottom: '8px' }}>
            <div style={{ fontSize: '12px', color: selectedTeam?.color, fontWeight: 800 }}>
              CHI TIẾT KẾ HOẠCH TUẦN & PHÂN CÔNG NỘI BỘ
            </div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#333', marginTop: '4px' }}>
              {selectedTask?.title}
            </div>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <div style={{ padding: '8px 0' }}>
          {/* Parent task meta info */}
          <Paragraph style={{ color: '#555', fontSize: '13px', lineHeight: 1.5, background: '#f9f9f9', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
            <strong>Chỉ đạo của Bí thư:</strong> {selectedTask?.description || 'Không có mô tả thêm.'}
            <div style={{ marginTop: '8px', display: 'flex', gap: '16px', fontSize: '12px', color: '#777' }}>
              <span>Thời hạn: <strong style={{ color: '#c62828' }}>{selectedTask?.deadline}</strong></span>
              <span>Trạng thái: <strong>{selectedTask?.status === 'Completed' ? 'Đã hoàn thành' : 'Đang thực hiện'}</strong></span>
            </div>
          </Paragraph>

          <Divider style={{ margin: '16px 0' }} />

          {/* Subtask list */}
          <Title level={5} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TeamOutlined /> Danh sách sub-task nội bộ nhóm
          </Title>

          {selectedTask?.subTasks && selectedTask.subTasks.length > 0 ? (() => {
            const visibleSubTasks = selectedTask.subTasks.filter(sub => {
              if (isBiThu || isCapUy || isLeaderOf(selectedTask.team)) {
                return true;
              }
              const userName = currentUser?.name || '';
              const nameClean = userName.replace(/[([].*?[)\]]/g, '').replace('Đ/c', '').trim();
              const subAssigneeClean = sub.assignee.replace('Đ/c', '').trim();
              return nameClean && subAssigneeClean && (nameClean.includes(subAssigneeClean) || subAssigneeClean.includes(nameClean));
            });

            if (visibleSubTasks.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '24px 0', border: '1px dashed #d9d9d9', borderRadius: '8px', color: '#999', fontSize: '12px' }}>
                  Bạn không có sub-task nào được giao trong nhiệm vụ này.
                </div>
              );
            }

            return (
              <List
                dataSource={visibleSubTasks}
                renderItem={sub => (
                  <List.Item
                    style={{ padding: '12px 8px' }}
                    actions={[
                      isLeaderOf(selectedTask.team) && (
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteSubTask(sub.id)}
                        />
                      )
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar style={{ backgroundColor: selectedTeam?.color }}>
                          {sub.assignee.substring(4, 5) || <UserOutlined />}
                        </Avatar>
                      }
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800, fontSize: '13px' }}>{sub.title}</span>
                          {sub.status === 'Completed' ? (
                            <Tag color="success">100%</Tag>
                          ) : (
                            <Tag color="processing">{sub.progress}%</Tag>
                          )}
                        </div>
                      }
                      description={
                        <div style={{ fontSize: '11px', color: '#777', display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px' }}>
                          <span>Đảng viên phụ trách: <strong>{sub.assignee}</strong></span>
                          <span>Hạn: <strong style={{ color: '#c62828' }}>{sub.deadline}</strong></span>
                          <span>Trạng thái: <strong>{sub.status === 'Completed' ? 'Hoàn thành' : 'Đang tiến hành'}</strong></span>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            );
          })() : (
            <div style={{ textAlign: 'center', padding: '24px 0', border: '1px dashed #d9d9d9', borderRadius: '8px', color: '#999', fontSize: '12px' }}>
              Chưa có sub-task phân rã công việc cho từng thành viên.
            </div>
          )}

          {/* Subtask addition form (Only group leader of this team or Admin/Bi Thu can create) */}
          {isLeaderOf(selectedTask?.team) ? (
            <div style={{
              marginTop: '24px',
              background: '#fcf8e3',
              border: '1.5px solid #faebcc',
              padding: '16px',
              borderRadius: '8px'
            }}>
              <Title level={5} style={{ color: '#8a6d3b', margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800 }}>
                ➕ PHÒNG PHÂN CÔNG NỘI BỘ (Chỉ dành cho Nhóm trưởng/Leader)
              </Title>

              <Form form={subTaskForm} layout="vertical" onFinish={handleAddSubTask}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Form.Item
                    name="title"
                    label="Tên sub-task chi tiết"
                    rules={[{ required: true, message: 'Nhập nội dung sub-task!' }]}
                    style={{ margin: 0 }}
                  >
                    <Input placeholder="Ví dụ: Thiết kế poster..." size="small" />
                  </Form.Item>

                  <Form.Item
                    name="assignee"
                    label="Chọn Đảng viên đảm nhận"
                    rules={[{ required: true, message: 'Chọn đảng viên thực hiện!' }]}
                    style={{ margin: 0 }}
                  >
                    <Select placeholder="Thành viên nhóm" size="small">
                      {getTeamMembers(selectedTask?.team).map(m => (
                        <Option key={m} value={m}>{m}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '12px', marginTop: '12px', alignItems: 'flex-end' }}>
                  <Form.Item
                    name="deadline"
                    label="Hạn hoàn thành"
                    rules={[{ required: true, message: 'Chọn hạn chót!' }]}
                    style={{ margin: 0 }}
                  >
                    <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" size="small" />
                  </Form.Item>

                  <Form.Item style={{ margin: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="small"
                      style={{ width: '100%', backgroundColor: '#c62828', borderColor: '#c62828', fontWeight: 700 }}
                    >
                      Giao việc
                    </Button>
                  </Form.Item>
                </div>
              </Form>
            </div>
          ) : (
            <div style={{ marginTop: '20px' }}>
              <Alert
                type="warning"
                message={`Chỉ Ủy viên phụ trách (${selectedTeam?.leaderName}) hoặc Bí thư mới có quyền phân công sub-task nội bộ cho các thành viên trong nhóm này.`}
                showIcon
              />
            </div>
          )}

          <Divider style={{ margin: '24px 0 16px 0' }} />

          {/* 💬 ROOM FOR DISCUSSION & EXCHANGE */}
          <div style={{ background: '#f5f5f5', borderRadius: '12px', padding: '16px', border: '1px solid #e8e8e8' }}>
            <Title level={5} style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 800 }}>
              <CommentOutlined style={{ color: '#c62828' }} /> Trao đổi & Thảo luận chung
            </Title>

            {/* Comments List */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', paddingRight: '4px' }}>
              {selectedTask?.comments && selectedTask.comments.length > 0 ? (
                selectedTask.comments.map(c => {
                  const isUserComment = c.userName === currentUser?.name;
                  return (
                    <div
                      key={c.id}
                      style={{
                        alignSelf: isUserComment ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        background: isUserComment ? '#e6f7ff' : '#ffffff',
                        border: isUserComment ? '1px solid #91d5ff' : '1px solid #f0f0f0',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '11px', color: '#333' }}>{c.userName}</span>
                        {c.userRole && (
                          <Tag size="small" color="red" style={{ fontSize: '9px', margin: 0, padding: '0 4px', lineHeight: 1.4 }}>
                            {getRoleBadgeName(c.userRole)}
                          </Tag>
                        )}
                        <span style={{ fontSize: '10px', color: '#999', marginLeft: 'auto' }}>{c.timestamp}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#444', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                        {c.content}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#999', fontSize: '11px', fontStyle: 'italic' }}>
                  Chưa có trao đổi nào. Hãy là người đầu tiên đặt câu hỏi hoặc báo cáo vướng mắc!
                </div>
              )}
            </div>

            {/* Input area */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input.TextArea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Nhập nội dung trao đổi, thảo luận hoặc báo cáo tiến độ với Ban điều hành/Bí thư..."
                autoSize={{ minRows: 1, maxRows: 3 }}
                style={{ borderRadius: '6px' }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleAddComment}
                style={{ backgroundColor: '#c62828', borderColor: '#c62828', height: 'auto', display: 'flex', alignItems: 'center', alignSelf: 'flex-end', borderRadius: '6px' }}
              >
                Gửi
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* 3. Evaluate Weekly Task Modal (Bí thư only) */}
      <Modal
        title={
          <span style={{ fontWeight: 800, color: '#1890ff' }}>
            <FileSearchOutlined /> ĐÁNH GIÁ KẾT QUẢ CÔNG TÁC CUỐI TUẦN
          </span>
        }
        open={evaluateModalVisible}
        onCancel={() => setEvaluateModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={evaluateForm} layout="vertical" onFinish={handleEvaluateTask}>
          <div style={{ marginBottom: '16px' }}>
            <strong>Nhiệm vụ đánh giá:</strong> {selectedTask?.title}<br />
            <strong>Nhóm triển khai:</strong> {selectedTeam?.name}
          </div>

          <Form.Item
            name="status"
            label="Phê duyệt trạng thái kế hoạch tuần"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="Completed">Phê duyệt hoàn thành (Đóng kế hoạch)</Option>
              <Option value="In Progress">Yêu cầu tiếp tục hoàn thiện (In Progress)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="evaluation"
            label="Nhận xét đánh giá chi tiết của Bí thư"
            rules={[{ required: true, message: 'Vui lòng ghi nhận xét!' }]}
          >
            <TextArea rows={4} placeholder="Ghi cụ thể chất lượng bài viết, tinh thần trách nhiệm, đúng hạn hay trễ hạn..." />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button onClick={() => setEvaluateModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}>
                Lưu đánh giá
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
};

export default WeeklyPlan;
