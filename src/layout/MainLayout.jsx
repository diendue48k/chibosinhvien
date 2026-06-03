import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Menu, Input, Avatar, Badge, Space, Typography, Dropdown, Popover, List, Empty, Button, Spin } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  ExportOutlined,
  FileTextOutlined,
  StarOutlined,
  SearchOutlined,
  BellOutlined,
  UserOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  LogoutOutlined,
  SettingOutlined,
  CalendarOutlined,
  AuditOutlined,
  ClockCircleOutlined,
  RightOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FormOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { permissionService, ROLES } from '../services/permissionService';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { currentUser, getRoleBadgeName, logout } = useAuth();

  // Notification popup states
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifList, setNotifList] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // Client-side read/unread tracking via localStorage
  const [lastViewedNotifTime, setLastViewedNotifTime] = useState(() => {
    return localStorage.getItem(`lastViewedNotifTime_${currentUser?.id || 'default'}`) || '';
  });

  const unreadNotifCount = useMemo(() => {
    if (!lastViewedNotifTime) return notifList.length;
    return notifList.filter(n => n.created_at && new Date(n.created_at) > new Date(lastViewedNotifTime)).length;
  }, [notifList, lastViewedNotifTime]);

  useEffect(() => {
    if (location.pathname === '/thong-bao') {
      const now = new Date().toISOString();
      localStorage.setItem(`lastViewedNotifTime_${currentUser?.id || 'default'}`, now);
      setLastViewedNotifTime(now);
    }
  }, [location.pathname, currentUser]);

  const fetchRecentNotifications = async () => {
    setNotifLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "notifications"));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setNotifList(list.slice(0, 8));
    } catch (e) {
      console.error("Lỗi tải thông báo:", e);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentNotifications();
  }, []);

  const dropdownItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Hồ sơ cá nhân',
      onClick: () => navigate('/profile')
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ color: '#c62828' }} />,
      label: <span style={{ color: '#c62828', fontWeight: 700 }}>Đăng xuất</span>,
      onClick: () => {
        logout();
        navigate('/login');
      }
    }
  ];

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Tổng quan',
    },
    {
      key: 'quan-ly-dang-vien-group',
      icon: <TeamOutlined />,
      label: 'Quản lý Đảng viên',
      children: [
        {
          key: '/dang-vien',
          label: 'Đang sinh hoạt',
        },
        {
          key: '/chuyen-tam-thoi',
          label: 'Chuyển sinh hoạt tạm thời',
        },
        {
          key: '/chuyen-sinh-hoat',
          label: 'Đã chuyển ra',
        },
      ],
    },
    {
      key: 'ho-so-ket-nap-group',
      icon: <FileTextOutlined />,
      label: 'Hồ sơ kết nạp',
      children: [
        {
          key: '/ho-so-ket-nap',
          label: 'Quản lý hồ sơ',
        },
        {
          key: '/ho-so-da-ket-nap',
          label: 'Hồ sơ đã kết nạp',
        },
        {
          key: '/thong-ke-ho-so',
          label: 'Thống kê số lượng',
        },
      ],
    },
    {
      key: 'ho-so-chinh-thuc-group',
      icon: <StarOutlined />,
      label: 'Hồ sơ chính thức',
      children: [
        {
          key: '/ho-so-chinh-thuc',
          label: 'Quản lý hồ sơ',
        },
        {
          key: '/ho-so-da-chinh-thuc',
          label: 'Hồ sơ đã chính thức',
        },
        {
          key: '/thong-ke-chinh-thuc',
          label: 'Thống kê số lượng',
        },
        {
          key: '/document-generator',
          label: 'Tạo biểu mẫu hồ sơ',
        },
      ],
    },
    {
      key: '/ho-so-chuyen-ra',
      icon: <ExportOutlined />,
      label: 'Hồ sơ chuyển ra',
    },
    {
      key: 'sinh-hoat-chi-bo-group',
      icon: <CalendarOutlined />,
      label: 'Sinh hoạt Chi bộ',
      children: [
        {
          key: '/lich-hop',
          label: 'Lịch họp & Thông báo',
        },
        {
          key: '/xin-vang',
          label: 'Đăng ký xin vắng',
        },
        {
          key: '/attendance',
          label: 'Điểm danh sinh hoạt',
        },
      ],
    },
    {
      key: '/thong-bao',
      icon: <BellOutlined />,
      label: 'Thông báo chi bộ',
    },
    {
      key: '/voting',
      icon: <AuditOutlined />,
      label: 'Biểu quyết Chi bộ',
    },
    {
      key: '/weekly-plan',
      icon: <CalendarOutlined />,
      label: 'Kế hoạch công việc',
    },
    {
      key: '/dang-ky-213',
      icon: <FormOutlined />,
      label: 'Đăng ký 213',
    },
  ];

  const bottomMenuItem = [
    {
      key: '/users',
      icon: <SettingOutlined />,
      label: 'Cài đặt hệ thống',
    },
  ];

  // Helper to recursively filter out menu items not allowed for the role
  const filterMenuItems = (items, role) => {
    return items.map(item => {
      if (item.children) {
        const filteredChildren = item.children.filter(child => {
          // Additional check for DANGVIEN and document-generator: only show if reserve member
          if (child.key === '/document-generator' && currentUser?.role === 'DANGVIEN') {
            return currentUser?.dang_vien_du_bi === true;
          }
          return permissionService.hasRouteAccess(role, child.key);
        });
        if (filteredChildren.length > 0) {
          return { ...item, children: filteredChildren };
        }
        return null;
      }
      


      // Hide transfer registration menu item for admin/managers
      if (item.key === '/dang-ky-chuyen') {
        const isManager = [
          'ADMIN', 'BITHU', 'PHOBIHU', 'CAPUY', 
          'OFFICIAL_MANAGER', 'ADMISSION_MANAGER', 'KIEMTRA'
        ].includes(role);
        if (isManager) return null;
      }

      return permissionService.hasRouteAccess(role, item.key) ? item : null;
    }).filter(Boolean);
  };

  const filteredItems = filterMenuItems(menuItems, currentUser?.role);
  const filteredBottomItem = filterMenuItems(bottomMenuItem, currentUser?.role);

  const getOpenKeys = () => {
    if (['/dang-vien', '/chuyen-tam-thoi', '/chuyen-sinh-hoat'].includes(location.pathname)) {
      return ['quan-ly-dang-vien-group'];
    }
    if (['/ho-so-ket-nap', '/ho-so-da-ket-nap', '/thong-ke-ho-so'].includes(location.pathname)) {
      return ['ho-so-ket-nap-group'];
    }
    if (['/ho-so-chinh-thuc', '/ho-so-da-chinh-thuc', '/thong-ke-chinh-thuc', '/document-generator'].includes(location.pathname)) {
      return ['ho-so-chinh-thuc-group'];
    }
    if (['/lich-hop', '/xin-vang', '/attendance'].includes(location.pathname)) {
      return ['sinh-hoat-chi-bo-group'];
    }
    return [];
  };

  const notificationPopoverContent = (
    <div style={{ width: 380 }}>
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderBottom: '1px solid #f0f0f0'
      }}>
        <span style={{ fontWeight: 800, fontSize: '16px', color: '#262626' }}>
          🔔 Thông báo
        </span>
        <Badge count={notifList.length} style={{ backgroundColor: '#c62828' }} />
      </div>

      {notifLoading ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin size="small" />
        </div>
      ) : notifList.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <Empty description="Chưa có thông báo nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {notifList.map((item, idx) => (
            <div 
              key={item.id} 
              style={{
                padding: '12px 16px',
                borderBottom: idx < notifList.length - 1 ? '1px solid #f5f5f5' : 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fafafa'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              onClick={() => {
                setNotifOpen(false);
                navigate('/thong-bao');
              }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '8px',
                  backgroundColor: '#fff1f0', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', flexShrink: 0
                }}>
                  📢
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontWeight: 700, fontSize: '13px', color: '#262626',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {item.title || 'Thông báo'}
                  </div>
                  <div style={{ 
                    fontSize: '12px', color: '#8c8c8c', marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {item.content ? item.content.substring(0, 60) + (item.content.length > 60 ? '...' : '') : ''}
                  </div>
                  <div style={{ fontSize: '11px', color: '#bfbfbf', marginTop: 4 }}>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {item.created_at ? dayjs(item.created_at).fromNow() : ''}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ 
        borderTop: '1px solid #f0f0f0', padding: '10px 16px', textAlign: 'center'
      }}>
        <Button 
          type="link" 
          onClick={() => { setNotifOpen(false); navigate('/thong-bao'); }}
          style={{ fontWeight: 700, color: '#c62828', fontSize: '13px' }}
        >
          Xem tất cả thông báo <RightOutlined />
        </Button>
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        theme="light"
        width={250}
        collapsed={collapsed}
        collapsedWidth={80}
        style={{ 
          boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)', 
          zIndex: 10,
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          bottom: 0,
          overflow: 'visible'
        }}
      >
        {/* Floating Toggle Button */}
        <div 
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: 'absolute',
            top: 72,
            right: -12,
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            border: '1px solid #d9d9d9',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 100,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#c62828';
            e.currentTarget.style.backgroundColor = '#fff1f0';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d9d9d9';
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title={collapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
        >
          {collapsed ? (
            <RightOutlined style={{ fontSize: '10px', color: '#c62828', fontWeight: 'bold' }} />
          ) : (
            <RightOutlined style={{ fontSize: '10px', color: '#8c8c8c', transform: 'rotate(180deg)', transition: 'transform 0.2s' }} />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', overflow: 'hidden' }}>
          <div style={{ 
            height: 64, 
            margin: '8px 8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: collapsed ? 'center' : 'flex-start',
            paddingLeft: collapsed ? 0 : 12,
            transition: 'all 0.2s'
          }}>
            {collapsed ? (
              <img 
                src="/logo.png" 
                alt="Logo" 
                style={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: '50%', 
                  objectFit: 'cover',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'transform 0.3s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  style={{ 
                     width: 42, 
                     height: 42, 
                     borderRadius: '50%', 
                     objectFit: 'cover',
                     boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                     transition: 'transform 0.3s ease',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '800', 
                    color: '#c62828', 
                    lineHeight: '1.2',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    Chi bộ Sinh viên
                  </span>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: '700', 
                    color: '#555555',
                    lineHeight: '1.2',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    Đảng bộ ĐH Kinh tế
                  </span>
                </div>
              </div>
            )}
          </div>
          <Menu 
            className="custom-sidebar-menu"
            theme="light" 
            mode="inline" 
            selectedKeys={[location.pathname]} 
            defaultOpenKeys={getOpenKeys()}
            items={filteredItems} 
            onClick={({ key }) => navigate(key)}
            style={{ borderRight: 0, flex: 1, overflowY: 'auto' }}
          />
          {filteredBottomItem.length > 0 && (
            <div style={{ marginTop: 'auto', borderTop: '1px solid #f0f0f0', padding: '8px 0' }}>
              <Menu
                className="custom-sidebar-menu"
                theme="light"
                mode="inline"
                selectedKeys={[location.pathname]}
                items={filteredBottomItem}
                onClick={({ key }) => navigate(key)}
                style={{ borderRight: 0 }}
              />
            </div>
          )}
        </div>
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'all 0.2s' }}>
          <Header style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '0 24px', 
            background: '#c62828',
            position: 'fixed',
            top: 0,
            right: 0,
            left: collapsed ? 80 : 250,
            zIndex: 99,
            height: 64,
            transition: 'all 0.2s'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined style={{ color: 'white' }} /> : <MenuFoldOutlined style={{ color: 'white' }} />}
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  fontSize: '18px',
                  width: 40,
                  height: 40,
                  marginRight: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }}
              />
              <span className="header-title-text" style={{ 
                color: '#ffffff', 
                fontWeight: 900, 
                fontSize: '15px', 
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                fontFamily: "'SVN-Gilroy', 'Inter', sans-serif"
              }}>
                HỆ THỐNG QUẢN LÝ, ĐIỀU HÀNH CHI BỘ SINH VIÊN
              </span>
            </div>
            <Space size="large">
              <Popover
                content={notificationPopoverContent}
                trigger="click"
                open={notifOpen}
                onOpenChange={(open) => {
                  setNotifOpen(open);
                  if (open) {
                    fetchRecentNotifications();
                    const now = new Date().toISOString();
                    localStorage.setItem(`lastViewedNotifTime_${currentUser?.id || 'default'}`, now);
                    setLastViewedNotifTime(now);
                  }
                }}
                placement="bottomRight"
                overlayInnerStyle={{ padding: 0, borderRadius: '12px', overflow: 'hidden' }}
                arrow={false}
              >
                <Badge count={unreadNotifCount} size="small" style={{ cursor: 'pointer' }}>
                  <BellOutlined 
                    style={{ fontSize: 20, color: 'white', cursor: 'pointer' }} 
                  />
                </Badge>
              </Popover>
               <Dropdown menu={{ items: dropdownItems }} trigger={['click']} placement="bottomRight">
                 <Space 
                   style={{ cursor: 'pointer' }}
                 >
                   <Avatar style={{ backgroundColor: '#fbc02d', color: '#c62828' }} icon={<UserOutlined />} />
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                     <span style={{ color: 'white', fontWeight: 800, fontSize: '13px' }}>
                       {currentUser?.name || 'Đồng chí'}
                     </span>
                     <span style={{ color: '#ffeb3b', fontSize: '10px', fontWeight: 700 }}>
                       {getRoleBadgeName(currentUser?.role)}
                     </span>
                   </div>
                 </Space>
               </Dropdown>
            </Space>
          </Header>
         <Content style={{ margin: '88px 16px 24px', padding: 24, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
