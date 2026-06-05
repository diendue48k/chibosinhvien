import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Typography, Spin, message, Select, Segmented, Table, Progress } from 'antd';
import { BarChartOutlined, TableOutlined, TeamOutlined, FilterOutlined } from '@ant-design/icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import addressDataMoi from '../data/addressDataMoi.json';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../services/permissionService';
import DangVienDashboard from './DangVienDashboard';

const { Title, Text } = Typography;

// Modern, vibrant gradient theme colors
const COLOR_CHINH_THUC = '#10b981'; // Emerald Green
const COLOR_DU_BI = '#f59e0b'; // Amber Orange

const Dashboard = () => {
  const { currentUser } = useAuth();

  // If the logged-in user is a simple Party member, render their personalized portal homepage
  if (currentUser?.role === ROLES.DANGVIEN) {
    return <DangVienDashboard />;
  }

  const [rawMembers, setRawMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'data'

  // Advanced dynamic filter states (Name filter removed)
  const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'ChinhThuc', 'DuBi'
  const [filterBatch, setFilterBatch] = useState('All');
  const [filterFaculty, setFilterFaculty] = useState('All');
  const [filterClass, setFilterClass] = useState('All');
  const [filterProvince, setFilterProvince] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterPlace, setFilterPlace] = useState('All');

  const fetchStats = async () => {
    try {
      const q = query(collection(db, "dang_vien"), where("trang_thai", "==", "dang_sinh_hoat"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawMembers(list);
    } catch (error) {
      console.error(error);
      message.error("Lỗi khi tải dữ liệu thống kê");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Inject Jakarta Sans font dynamically
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Safe year parser for date fields
  const getYearFromDate = (dateVal) => {
    if (!dateVal) return 'Chưa rõ';
    if (dateVal.seconds) {
      return new Date(dateVal.seconds * 1000).getFullYear().toString();
    }
    const parsed = new Date(dateVal);
    if (!isNaN(parsed.getTime())) {
      return parsed.getFullYear().toString();
    }
    try {
      const d = dayjs(dateVal);
      if (d.isValid()) return d.year().toString();
    } catch (e) {}
    return 'Chưa rõ';
  };

  // Dynamic filter options derivation
  const batchOptions = useMemo(() => {
    const batches = rawMembers.map(m => {
      let b = 'Khác';
      if (m.lop) {
        const match = m.lop.match(/^(\d{2}[Kk])/);
        if (match) b = match[1].toUpperCase();
        else b = m.lop.substring(0, 3);
      } else if (m.mssv) {
        b = m.mssv.substring(0, 2) + "K";
      }
      return b;
    }).filter(Boolean).filter((v, i, self) => self.indexOf(v) === i);
    batches.sort();
    return [{ value: 'All', label: 'Tất cả' }, ...batches.map(b => ({ value: b, label: b }))];
  }, [rawMembers]);

  const facultyOptions = useMemo(() => {
    const facs = rawMembers.map(m => m.khoa).filter(Boolean).filter((v, i, self) => self.indexOf(v) === i);
    facs.sort();
    return [{ value: 'All', label: 'Tất cả' }, ...facs.map(f => ({ value: f, label: f }))];
  }, [rawMembers]);

  const classOptions = useMemo(() => {
    const filteredForClasses = rawMembers.filter(m => {
      const matchBatch = filterBatch === 'All' || (() => {
        let b = 'Khác';
        if (m.lop) {
          const match = m.lop.match(/^(\d{2}[Kk])/);
          if (match) b = match[1].toUpperCase();
          else b = m.lop.substring(0, 3);
        } else if (m.mssv) {
          b = m.mssv.substring(0, 2) + "K";
        }
        return b === filterBatch;
      })();
      const matchFaculty = filterFaculty === 'All' || m.khoa === filterFaculty;
      return matchBatch && matchFaculty;
    });

    const classes = filteredForClasses.map(m => m.lop).filter(Boolean).filter((v, i, self) => self.indexOf(v) === i);
    classes.sort();
    return [{ value: 'All', label: 'Tất cả' }, ...classes.map(c => ({ value: c, label: c }))];
  }, [rawMembers, filterBatch, filterFaculty]);

  const provinceOptions = useMemo(() => {
    const provs = rawMembers.map(m => m.tinh_tp_tt).filter(Boolean).filter((v, i, self) => self.indexOf(v) === i);
    provs.sort();
    return [{ value: 'All', label: 'Tất cả' }, ...provs.map(p => ({ value: p, label: p }))];
  }, [rawMembers]);

  const yearOptions = useMemo(() => {
    const years = rawMembers
      .map(m => getYearFromDate(m.ngay_chuyen_vao))
      .filter(y => y && y !== 'Chưa rõ')
      .filter((v, i, self) => self.indexOf(v) === i);
    years.sort((a, b) => b - a);
    return [{ value: 'All', label: 'Tất cả' }, ...years.map(y => ({ value: y, label: `Năm ${y}` }))];
  }, [rawMembers]);

  const placeOptions = useMemo(() => {
    const places = rawMembers.map(m => m.noi_chuyen_di).filter(Boolean).filter((v, i, self) => self.indexOf(v) === i);
    places.sort();
    return [{ value: 'All', label: 'Tất cả' }, ...places.map(p => ({ value: p, label: p }))];
  }, [rawMembers]);

  // Dynamic filter application
  const filteredMembers = useMemo(() => {
    return rawMembers.filter(m => {
      const matchBatch = filterBatch === 'All' || (() => {
        let b = 'Khác';
        if (m.lop) {
          const match = m.lop.match(/^(\d{2}[Kk])/);
          if (match) b = match[1].toUpperCase();
          else b = m.lop.substring(0, 3);
        } else if (m.mssv) {
          b = m.mssv.substring(0, 2) + "K";
        }
        return b === filterBatch;
      })();
      const matchFaculty = filterFaculty === 'All' || m.khoa === filterFaculty;
      const matchClass = filterClass === 'All' || m.lop === filterClass;
      const matchProvince = filterProvince === 'All' || m.tinh_tp_tt === filterProvince;
      const matchStatus = filterStatus === 'All' || (filterStatus === 'ChinhThuc' ? !m.dang_vien_du_bi : !!m.dang_vien_du_bi);
      const matchYear = filterYear === 'All' || getYearFromDate(m.ngay_chuyen_vao) === filterYear;
      const matchPlace = filterPlace === 'All' || m.noi_chuyen_di === filterPlace;

      return matchBatch && matchFaculty && matchClass && matchProvince && matchStatus && matchYear && matchPlace;
    });
  }, [rawMembers, filterBatch, filterFaculty, filterClass, filterProvince, filterStatus, filterYear, filterPlace]);

  const stats = useMemo(() => {
    let total = filteredMembers.length;
    let maleCount = 0;
    let femaleCount = 0;
    let statusObj = { ChinhThuc: 0, DuBi: 0 };
    
    let group = {};
    let faculty = {};
    let batch = {};
    let province = {};

    Object.keys(addressDataMoi || {}).forEach(prov => {
      province[prov] = { name: prov, ChinhThuc: 0, DuBi: 0 };
    });

    const abbreviateGroup = (name) => {
      switch (name) {
        case 'Phát triển Đảng': return 'Nhóm PTĐ';
        case 'Hồ sơ sinh hoạt Đảng': return 'Nhóm HSSH';
        case 'Tổ chức': return 'Nhóm TC';
        case 'Kiểm tra - Giám sát': return 'Nhóm KTGS';
        case 'Truyền thông': return 'Nhóm TT';
        default: return name || 'Khác';
      }
    };

    const processItem = (obj, key, isDuBi, isGroup = false) => {
      const k = isGroup ? abbreviateGroup(key) : (key || 'Khác');
      if (!obj[k]) obj[k] = { name: k, ChinhThuc: 0, DuBi: 0 };
      if (isDuBi) obj[k].DuBi++;
      else obj[k].ChinhThuc++;
    };

    filteredMembers.forEach(m => {
      const isDuBi = !!m.dang_vien_du_bi;
      
      if (m.gioi_tinh === 'Nam') maleCount++;
      else if (m.gioi_tinh === 'Nữ') femaleCount++;
      
      if (isDuBi) statusObj.DuBi++; 
      else statusObj.ChinhThuc++;

      const prov = m.tinh_tp_tt || 'Khác';
      if (prov !== 'Khác' && !province[prov]) {
        province[prov] = { name: prov, ChinhThuc: 0, DuBi: 0 };
      }
      processItem(province, prov, isDuBi);

      processItem(group, m.nhom, isDuBi, true);

      processItem(faculty, m.khoa, isDuBi);

      let b = 'Khác';
      if (m.lop) {
        const match = m.lop.match(/^(\d{2}[Kk])/);
        if (match) b = match[1].toUpperCase();
        else b = m.lop.substring(0, 3);
      } else if (m.mssv) {
        b = m.mssv.substring(0, 2) + "K";
      }
      processItem(batch, b, isDuBi);
    });

    const toSortedArray = (obj) => Object.values(obj).sort((a, b) => (b.ChinhThuc + b.DuBi) - (a.ChinhThuc + a.DuBi));

    const sortedProvinces = Object.values(province).filter(p => (p.ChinhThuc + p.DuBi) > 0).sort((a, b) => {
      const totalA = a.ChinhThuc + a.DuBi;
      const totalB = b.ChinhThuc + b.DuBi;
      if (totalA !== totalB) return totalB - totalA;
      return a.name.localeCompare(b.name);
    });

    const batchOrder = ['GV', '51K', '50K', '49K', '48K', '47K', 'Null', 'Khác'];
    const sortedBatches = Object.values(batch).sort((a, b) => {
      const idxA = batchOrder.indexOf(a.name);
      const idxB = batchOrder.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    const sortedFaculties = Object.values(faculty).sort((a, b) => (a.ChinhThuc + a.DuBi) - (b.ChinhThuc + b.DuBi));

    return {
      total,
      gender: { Nam: maleCount, Nu: femaleCount },
      status: statusObj,
      province: sortedProvinces,
      group: toSortedArray(group),
      faculty: sortedFaculties,
      batch: sortedBatches
    };
  }, [filteredMembers]);

  // Premium glassmorphic tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #e2e8f0',
          padding: '10px 14px',
          borderRadius: '10px',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{ fontWeight: 800, color: '#1e293b', marginBottom: '4px', fontSize: '13px' }}>{label}</div>
          {payload.map((pld, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginTop: '2px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: pld.color }}></div>
              <span style={{ color: '#64748b' }}>{pld.name}:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{pld.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;

  // Custom charts using linear gradients
  const renderVerticalBarChart = (data, height = 260) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 5, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="gradChinhThucVert" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="gradDuBiVert" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="DuBi" name="Dự bị" stackId="a" fill="url(#gradDuBiVert)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="ChinhThuc" name="Chính thức" stackId="a" fill="url(#gradChinhThucVert)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderHorizontalBarChart = (data, height = 260) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ top: 10, right: 5, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="gradChinhThucHorz" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="gradDuBiHorz" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
        <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="DuBi" name="Dự bị" stackId="a" fill="url(#gradDuBiHorz)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="ChinhThuc" name="Chính thức" stackId="a" fill="url(#gradChinhThucHorz)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderDataTable = (dataSource, categoryLabel) => {
    const columns = [
      {
        title: categoryLabel,
        dataIndex: 'name',
        key: 'name',
        render: (text) => <span style={{ fontWeight: 600, color: '#1e293b' }}>{text}</span>
      },
      {
        title: 'Chính thức',
        dataIndex: 'ChinhThuc',
        key: 'ChinhThuc',
        align: 'right',
        render: (val) => <span style={{ fontWeight: 700, color: COLOR_CHINH_THUC }}>{val}</span>
      },
      {
        title: 'Dự bị',
        dataIndex: 'DuBi',
        key: 'DuBi',
        align: 'right',
        render: (val) => <span style={{ fontWeight: 700, color: COLOR_DU_BI }}>{val}</span>
      },
      {
        title: 'Tổng số',
        key: 'total',
        align: 'right',
        render: (_, record) => <span style={{ fontWeight: 700, color: '#0f172a' }}>{record.ChinhThuc + record.DuBi}</span>
      },
      {
        title: 'Tỷ lệ',
        key: 'ratio',
        align: 'right',
        render: (_, record) => {
          const tot = record.ChinhThuc + record.DuBi;
          const pct = stats.total > 0 ? ((tot / stats.total) * 100).toFixed(1) : 0;
          return <span style={{ color: '#64748b', fontWeight: 500 }}>{pct}%</span>;
        }
      }
    ];

    return (
      <Table
        dataSource={dataSource}
        columns={columns}
        rowKey="name"
        pagination={false}
        size="small"
        bordered={false}
        style={{ marginTop: '8px' }}
        summary={(pageData) => {
          let totalChinhThuc = 0;
          let totalDuBi = 0;

          pageData.forEach(({ ChinhThuc, DuBi }) => {
            totalChinhThuc += ChinhThuc;
            totalDuBi += DuBi;
          });

          const grandTotal = totalChinhThuc + totalDuBi;

          return (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                <Table.Summary.Cell index={0}><span style={{ color: '#475569' }}>Tổng cộng</span></Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <span style={{ color: COLOR_CHINH_THUC }}>{totalChinhThuc}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span style={{ color: COLOR_DU_BI }}>{totalDuBi}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <span style={{ color: '#0f172a' }}>{grandTotal}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <span style={{ color: '#475569' }}>{stats.total > 0 ? ((grandTotal / stats.total) * 100).toFixed(0) : 0}%</span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />
    );
  };

  return (
    <div style={{ 
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: '0px 10px',
      maxWidth: '1380px',
      margin: '0 auto'
    }}>
      {/* Premium CSS Styling Block */}
      <style>{`
        .premium-card-wrapper {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
          border: 1px solid #e2e8f0;
          padding: 24px;
          height: 100%;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .premium-card-wrapper:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.05);
          border-color: #cbd5e1;
        }
        .card-title-badge {
          font-size: 13px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 8px;
          margin-bottom: 16px;
        }
        .segmented-premium {
          border-radius: 10px !important;
          padding: 3px !important;
          background-color: #f1f5f9 !important;
          border: 1px solid #e2e8f0 !important;
        }
        .segmented-premium .ant-segmented-item-selected {
          background-color: #ffffff !important;
          color: #0f172a !important;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
          border-radius: 8px !important;
        }
        .ant-table-thead > tr > th {
          background-color: #f8fafc !important;
          color: #475569 !important;
          font-weight: 700 !important;
          border-bottom: 2px solid #e2e8f0 !important;
        }
        .ant-table-tbody > tr > td {
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .ant-table-row:hover > td {
          background-color: #f8fafc !important;
        }
        .filter-dropdown .ant-select-selector {
          border-radius: 8px !important;
          border-color: #e2e8f0 !important;
          height: 36px !important;
          padding: 2px 12px !important;
        }
        .filter-dropdown .ant-select-selection-item {
          line-height: 30px !important;
        }
        .filter-dropdown:hover .ant-select-selector {
          border-color: #cbd5e1 !important;
        }
      `}</style>

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Title level={3} style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>Tổng quan Thống kê</Title>
          <Text type="secondary" style={{ fontSize: '14px', color: '#64748b' }}>Báo cáo chi tiết số liệu và cơ cấu Đảng viên chi bộ</Text>
        </div>
        <Segmented
          className="segmented-premium"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { label: 'Xem dạng biểu đồ', value: 'chart', icon: <BarChartOutlined /> },
            { label: 'Xem dạng số liệu', value: 'data', icon: <TableOutlined /> }
          ]}
        />
      </div>

      {/* Full-width System Filter Card - Reorganized into 2 spacious rows, Name filter removed */}
      <Card 
        style={{ 
          borderRadius: '16px', 
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)', 
          border: '1px solid #e2e8f0', 
          marginBottom: '20px' 
        }}
        bodyStyle={{ padding: '18px 24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800', color: '#475569', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <FilterOutlined style={{ color: '#4f46e5' }} /> Bộ lọc hệ thống
        </div>
        
        {/* Row 1: Phân loại, Khóa học, Khoa, Lớp (4 Columns) */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Phân loại Đảng viên</div>
            <Select
              className="filter-dropdown"
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: 'All', label: 'Tất cả' },
                { value: 'ChinhThuc', label: 'Chính thức' },
                { value: 'DuBi', label: 'Dự bị' }
              ]}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Khóa học</div>
            <Select
              className="filter-dropdown"
              value={filterBatch}
              onChange={(val) => {
                setFilterBatch(val);
                setFilterClass('All');
              }}
              options={batchOptions}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Khoa chuyên môn</div>
            <Select
              className="filter-dropdown"
              value={filterFaculty}
              onChange={(val) => {
                setFilterFaculty(val);
                setFilterClass('All');
              }}
              options={facultyOptions}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Lớp sinh hoạt</div>
            <Select
              className="filter-dropdown"
              value={filterClass}
              onChange={setFilterClass}
              options={classOptions}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        {/* Row 2: Thường trú, Năm chuyển vào, Nơi chuyển vào (3 Columns) */}
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} sm={8}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Thường trú (Tỉnh / TP)</div>
            <Select
              className="filter-dropdown"
              value={filterProvince}
              onChange={setFilterProvince}
              options={provinceOptions}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Năm chuyển vào Chi bộ</div>
            <Select
              className="filter-dropdown"
              value={filterYear}
              onChange={setFilterYear}
              options={yearOptions}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Nơi chuyển vào (Sinh hoạt cũ)</div>
            <Select
              className="filter-dropdown"
              value={filterPlace}
              onChange={setFilterPlace}
              options={placeOptions}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Row 1: KPI Statistics cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        {/* Card 1: Total Members */}
        <Col xs={24} sm={8}>
          <div className="premium-card-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '112px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tổng số Đảng viên</div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: '#0f172a', marginTop: '4px', lineHeight: '1.2' }}>{stats.total}</div>
            </div>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '12px',
              backgroundColor: '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4f46e5',
              fontSize: '24px'
            }}>
              <TeamOutlined />
            </div>
          </div>
        </Col>

        {/* Card 2: Gender Distribution */}
        <Col xs={24} sm={8}>
          <div className="premium-card-wrapper" style={{ minHeight: '112px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Giới tính</div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '14px', fontWeight: '700' }}>
                <span style={{ color: '#3b82f6' }}>Nam: {stats.gender.Nam}</span>
                <span style={{ color: '#ec4899' }}>Nữ: {stats.gender.Nu}</span>
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <Progress 
                percent={stats.total > 0 ? Math.round((stats.gender.Nu / stats.total) * 100) : 0} 
                success={{ percent: stats.total > 0 ? Math.round((stats.gender.Nam / stats.total) * 100) : 0, strokeColor: '#3b82f6' }}
                strokeColor="#ec4899" 
                showInfo={false}
                strokeWidth={8}
                style={{ margin: 0 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginTop: '4px', fontWeight: 600 }}>
                <span>NAM: {stats.total > 0 ? ((stats.gender.Nam / stats.total) * 100).toFixed(0) : 0}%</span>
                <span>NỮ: {stats.total > 0 ? ((stats.gender.Nu / stats.total) * 100).toFixed(0) : 0}%</span>
              </div>
            </div>
          </div>
        </Col>

        {/* Card 3: Status Classification */}
        <Col xs={24} sm={8}>
          <div className="premium-card-wrapper" style={{ minHeight: '112px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phân loại đảng viên</div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '14px', fontWeight: '700' }}>
                <span style={{ color: COLOR_CHINH_THUC }}>CT: {stats.status.ChinhThuc}</span>
                <span style={{ color: COLOR_DU_BI }}>DB: {stats.status.DuBi}</span>
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <Progress 
                percent={stats.total > 0 ? Math.round((stats.status.DuBi / stats.total) * 100) : 0} 
                success={{ percent: stats.total > 0 ? Math.round((stats.status.ChinhThuc / stats.total) * 100) : 0, strokeColor: COLOR_CHINH_THUC }}
                strokeColor={COLOR_DU_BI} 
                showInfo={false}
                strokeWidth={8}
                style={{ margin: 0 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginTop: '4px', fontWeight: 600 }}>
                <span>CHÍNH THỨC: {stats.total > 0 ? ((stats.status.ChinhThuc / stats.total) * 100).toFixed(0) : 0}%</span>
                <span>DỰ BỊ: {stats.total > 0 ? ((stats.status.DuBi / stats.total) * 100).toFixed(0) : 0}%</span>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Charts Grid */}
      <Row gutter={[16, 16]}>
        {/* Row 2 - Group Stats & Batch Stats */}
        <Col xs={24} lg={12}>
          <div className="premium-card-wrapper">
            <div className="card-title-badge">Cơ cấu theo Nhóm sinh hoạt</div>
            {viewMode === 'chart' 
              ? renderVerticalBarChart(stats.group, 260)
              : renderDataTable(stats.group, "Nhóm sinh hoạt")
            }
          </div>
        </Col>

        <Col xs={24} lg={12}>
          <div className="premium-card-wrapper">
            <div className="card-title-badge">Cơ cấu theo Khóa học (Lớp)</div>
            {viewMode === 'chart' 
              ? renderHorizontalBarChart(stats.batch, 260)
              : renderDataTable(stats.batch, "Khóa học")
            }
          </div>
        </Col>

        {/* Row 3 - Faculty Stats & Top Provinces Stats */}
        <Col xs={24} lg={12}>
          <div className="premium-card-wrapper">
            <div className="card-title-badge">Phân bộ theo Khoa chuyên môn</div>
            {viewMode === 'chart' 
              ? renderVerticalBarChart(stats.faculty, 280)
              : renderDataTable(stats.faculty, "Khoa chuyên môn")
            }
          </div>
        </Col>

        <Col xs={24} lg={12}>
          <div className="premium-card-wrapper">
            <div className="card-title-badge">Phân bổ theo Tỉnh / Thành phố (Thường trú)</div>
            {viewMode === 'chart' 
              ? renderHorizontalBarChart(stats.province.slice(0, 8), 280)
              : renderDataTable(stats.province, "Tỉnh / Thành phố")
            }
          </div>
        </Col>
      </Row>

      {/* Legend and indicator row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '12px', fontWeight: '700', marginTop: '24px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLOR_CHINH_THUC }}></div>
          <span style={{ color: '#64748b' }}>ĐẢNG VIÊN CHÍNH THỨC</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLOR_DU_BI }}></div>
          <span style={{ color: '#64748b' }}>ĐẢNG VIÊN DỰ BỊ</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
