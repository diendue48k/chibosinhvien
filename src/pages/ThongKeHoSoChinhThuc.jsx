import React, { useState, useEffect, useMemo } from 'react';
import { 
  Row, Col, Card, Typography, Spin, message, Divider,
  Table, Tag, Tooltip, Progress, Space, Select, Empty, Badge, Button, Radio
} from 'antd';
import { 
  FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ReloadOutlined, FilterOutlined, AreaChartOutlined, TableOutlined,
  SendOutlined, SyncOutlined
} from '@ant-design/icons';
import { collection, getDocs } from 'firebase/firestore';
import { dbMain } from '../firebase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import dayjs from 'dayjs';

const safeDayjs = (val) => {
  if (!val) return dayjs(null);
  if (val.toDate && typeof val.toDate === 'function') return dayjs(val.toDate());
  if (val.seconds) return dayjs(val.seconds * 1000);
  return dayjs(val);
};

const checkIsDuBi = (member) => {
  if (!member) return true;
  if (member.dang_vien_du_bi === true) return true;
  if (member.dang_vien_du_bi === false) return false;
  if (member.loai_dang_vien === "Dự bị" || member.loai_dang_vien === "dubi") return true;
  if (member.loai_dang_vien === "Chính thức") return false;
  const getOfficialDate = () => {
    const date = member.ngay_cong_nhan_dvct || member.ngay_chinh_thuc;
    if (!date) return null;
    return safeDayjs(date);
  };
  const officialDate = getOfficialDate();
  if (officialDate && officialDate.isValid()) {
    return officialDate.isAfter(dayjs(), 'day');
  }
  if (member.so_quyet_dinh_dvct) {
    return false;
  }
  return true;
};

const getOfficialDateVal = (item) => {
  let d = safeDayjs(item.ngay_cong_nhan_dvct);
  if (d && d.isValid()) return d;
  d = safeDayjs(item.ngay_chinh_thuc);
  if (d && d.isValid()) return d;
  if (item.ngay_vao_dang) {
    d = safeDayjs(item.ngay_vao_dang);
    if (d && d.isValid()) return d.add(1, 'year');
  }
  return safeDayjs(item.created_at);
};

const { Text, Title } = Typography;
const { Option } = Select;

const KHOA_LIST = ["P.CTSV", "Quản trị Kinh doanh", "Du lịch", "Marketing", "Tài chính", "Ngân hàng", "Kinh tế", "Kế toán", "Luật", "Thống kê - Tin học", "Thương mại điện tử", "Kinh doanh quốc tế", "Lý luận chính trị", "Khác"];

const standardizeKhoa = (khoaStr) => {
  if (!khoaStr) return 'Chưa xác định';
  const s = String(khoaStr).trim();
  const matched = KHOA_LIST.find(k => k.toLowerCase() === s.toLowerCase());
  return matched || s;
};

// Helper to parse cohort "Khóa" from student lop or mssv
const getCohort = (item) => {
  let rawCohort = item.khoa_hoc || '';
  if (!rawCohort) {
    const lop = item.lop || '';
    const mssv = item.mssv || '';
    
    const match1 = lop.match(/^(\d+)K/i);
    if (match1) {
      rawCohort = `${match1[1]}K`;
    } else {
      const match2 = lop.match(/K\s*(\d+)/i);
      if (match2) {
        rawCohort = `${match2[1]}K`;
      } else if (mssv && /^\d{2}/.test(mssv)) {
        const yr = parseInt(mssv.substring(0, 2), 10);
        if (yr >= 15 && yr <= 30) {
          rawCohort = `${yr + 26}K`;
        }
      }
    }
  }
  
  if (rawCohort) {
    // Standardize cohort to e.g. "48K" instead of "K48"
    const standardMatch = rawCohort.match(/K\s*(\d+)/i) || rawCohort.match(/^(\d+)\s*K/i);
    if (standardMatch) {
      return `${standardMatch[1]}K`;
    }
    return rawCohort;
  }
  
  return 'Khác';
};

const ThongKeHoSoChinhThuc = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterFaculty, setFilterFaculty] = useState(null);
  const [filterCohort, setFilterCohort] = useState(null);
  const [filterYear, setFilterYear] = useState('2026');
  const [displayMode, setDisplayMode] = useState('charts'); // 'charts' | 'tables'
  const [timeTrendType, setTimeTrendType] = useState('month'); // 'year' | 'month'

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = collection(dbMain, "dang_vien");
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // We display all active members who have went through the preparatory process or are official/probationary members
      setData(docs.filter(item => item.ho_ten && (!item.trang_thai || item.trang_thai === 'dang_sinh_hoat')));
    } catch (error) {
      console.error("Lỗi tải dữ liệu thống kê:", error);
      message.error("Lỗi tải dữ liệu thống kê hồ sơ chính thức");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Lists for dropdown options (derived from full data)
  const facultiesList = useMemo(() => {
    const list = new Set();
    data.forEach(item => {
      if (item.khoa) list.add(standardizeKhoa(item.khoa));
    });
    return Array.from(list).sort();
  }, [data]);

  const cohortsList = useMemo(() => {
    const list = new Set();
    data.forEach(item => {
      const c = getCohort(item);
      if (c && c !== 'Khác') list.add(c);
    });
    return Array.from(list).sort((a, b) => b.localeCompare(a));
  }, [data]);

  const hasKhac = useMemo(() => {
    return data.some(item => getCohort(item) === 'Khác');
  }, [data]);

  const displayCohorts = useMemo(() => {
    const list = [...cohortsList];
    if (hasKhac) {
      list.push('Khác');
    }
    return list;
  }, [cohortsList, hasKhac]);

  const yearsList = useMemo(() => {
    const list = new Set();
    data.forEach(item => {
      const d = getOfficialDateVal(item);
      if (d && d.isValid()) {
        const yr = d.format('YYYY');
        list.add(yr);
      }
    });
    return Array.from(list).sort((a, b) => b - a);
  }, [data]);

  // 1. Filtered Dataset
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Filter by Faculty
      if (filterFaculty && standardizeKhoa(item.khoa) !== filterFaculty) {
        return false;
      }
      
      // Filter by Cohort
      if (filterCohort && getCohort(item) !== filterCohort) {
        return false;
      }
      
      const d = getOfficialDateVal(item);
      if (d && d.isValid()) {
        const itemYear = d.format('YYYY');
        if (filterYear && itemYear !== filterYear) {
          return false;
        }
      } else {
        return false;
      }
      
      return true;
    });
  }, [data, filterFaculty, filterCohort, filterYear]);

  // 2. Computed Statistics
  const stats = useMemo(() => {
    const checkIsInProgress = (item) => {
      const isDuBi = checkIsDuBi(item);
      if (!isDuBi) return false;
      if (!item.ngay_vao_dang) return false;
      const ngayVao = safeDayjs(item.ngay_vao_dang);
      if (!ngayVao || !ngayVao.isValid()) return false;
      const deadline = ngayVao.add(12, 'month');
      const daysLeft = deadline.diff(dayjs(), 'day');
      return daysLeft <= 30 || (item.ho_so_status && Number(item.ho_so_status) > 1);
    };

    const checkIsOfficial = (member) => {
      return !checkIsDuBi(member) && member.so_quyet_dinh_dvct && member.ngay_ky_quyet_dinh_dvct;
    };

    const checkIsNotStarted = (member) => {
      return checkIsDuBi(member) && !checkIsInProgress(member);
    };

    // 1. Tổng số hồ sơ đang làm (Probationary members preparing dossiers: Steps 1-6)
    const inProgress = filteredData.filter(item => checkIsInProgress(item)).length;

    // 2. Đảng viên dự bị chưa đến hạn làm hồ sơ
    const notStarted = filteredData.filter(item => checkIsNotStarted(item)).length;
    
    // 3. Tổng số hồ sơ đã chính thức (Official members)
    const admitted = filteredData.filter(item => checkIsOfficial(item)).length;
    
    // 4. Tổng số hồ sơ Đã nộp lên Đảng ủy ĐHĐN (Probationary members at Step 6)
    const submittedDhdn = filteredData.filter(item => {
      const isInProgress = checkIsInProgress(item);
      const step = Number(item.ho_so_status || 1);
      return isInProgress && step === 6;
    }).length;

    const total = inProgress + admitted + notStarted;

    // Faculty maps for both admitted & in-progress
    const facultyMap = {};
    const facultyCohortMap = {};
    // Gender maps for both admitted & in-progress
    const genderMap = {
      "Nam": { admitted: 0, inProgress: 0 },
      "Nữ": { admitted: 0, inProgress: 0 }
    };
    // Cohort maps for both admitted & in-progress
    const cohortMap = {};

    // Yearly/Monthly trends (Specifically for official/completed profiles)
    const yearTrendCounts = {};
    const monthTrendCounts = {};
    for (let m = 1; m <= 12; m++) {
      monthTrendCounts[m] = 0;
    }

    filteredData.forEach(item => {
      const isProbationary = checkIsInProgress(item);
      const isOfficial = checkIsOfficial(item);

      // Faculty Grouping
      const f = standardizeKhoa(item.khoa);
      if (!facultyMap[f]) {
        facultyMap[f] = { admitted: 0, inProgress: 0 };
      }
      if (isOfficial) facultyMap[f].admitted++;
      if (isProbationary) facultyMap[f].inProgress++;

      // Gender Grouping
      const g = item.gioi_tinh || 'Nam';
      if (genderMap[g]) {
        if (isOfficial) genderMap[g].admitted++;
        if (isProbationary) genderMap[g].inProgress++;
      }

      // Cohort Grouping
      const c = getCohort(item);
      if (!cohortMap[c]) {
        cohortMap[c] = { admitted: 0, inProgress: 0 };
      }
      if (isOfficial) cohortMap[c].admitted++;
      if (isProbationary) cohortMap[c].inProgress++;

      // Faculty & Cohort Grouping
      const fcKey = `${f}_${c}`;
      if (!facultyCohortMap[fcKey]) {
        facultyCohortMap[fcKey] = { khoa: f, cohort: c, admitted: 0, inProgress: 0 };
      }
      if (isOfficial) facultyCohortMap[fcKey].admitted++;
      if (isProbationary) facultyCohortMap[fcKey].inProgress++;

      // Trends (Specifically for members recognized as official)
      if (isOfficial) {
        const d = getOfficialDateVal(item);
        if (d && d.isValid()) {
          const yr = d.format('YYYY');
          const mth = d.month() + 1; // 1-indexed
          
          yearTrendCounts[yr] = (yearTrendCounts[yr] || 0) + 1;
          
          if (filterYear) {
            if (yr === filterYear) {
              monthTrendCounts[mth]++;
            }
          } else {
            monthTrendCounts[mth]++;
          }
        }
      }
    });

    // Format outputs
    const facultyData = Object.keys(facultyMap).map(name => {
      const d = facultyMap[name];
      return {
        name,
        "Đang làm": d.inProgress,
        "Đã chính thức": d.admitted,
        "Tổng cộng": d.inProgress + d.admitted
      };
    }).sort((a, b) => b["Tổng cộng"] - a["Tổng cộng"]);

    const facultyCohortData = Object.keys(facultyCohortMap).map(key => {
      const d = facultyCohortMap[key];
      return {
        key,
        khoa: d.khoa,
        cohort: d.cohort,
        "Đang làm": d.inProgress,
        "Đã chính thức": d.admitted,
        "Tổng cộng": d.inProgress + d.admitted
      };
    }).sort((a, b) => {
      const comp = a.khoa.localeCompare(b.khoa);
      if (comp !== 0) return comp;
      if (a.cohort === 'Khác') return 1;
      if (b.cohort === 'Khác') return -1;
      return b.cohort.localeCompare(a.cohort);
    });

    const genderData = [
      { 
        name: 'Nam', 
        "Đang làm": genderMap['Nam'].inProgress, 
        "Đã chính thức": genderMap['Nam'].admitted, 
        "Tổng cộng": genderMap['Nam'].inProgress + genderMap['Nam'].admitted 
      },
      { 
        name: 'Nữ', 
        "Đang làm": genderMap['Nữ'].inProgress, 
        "Đã chính thức": genderMap['Nữ'].admitted, 
        "Tổng cộng": genderMap['Nữ'].inProgress + genderMap['Nữ'].admitted 
      }
    ];

    const genderPieInProgress = [
      { name: 'Nam', value: genderMap['Nam'].inProgress },
      { name: 'Nữ', value: genderMap['Nữ'].inProgress }
    ];

    const genderPieAdmitted = [
      { name: 'Nam', value: genderMap['Nam'].admitted },
      { name: 'Nữ', value: genderMap['Nữ'].admitted }
    ];

    const cohortData = Object.keys(cohortMap).map(name => {
      const d = cohortMap[name];
      return {
        name,
        "Đang làm": d.inProgress,
        "Đã chính thức": d.admitted,
        "Tổng cộng": d.inProgress + d.admitted
      };
    }).sort((a, b) => b.name.localeCompare(a.name));

    // For yearly trend, display years present in data
    const activeYears = new Set(Object.keys(yearTrendCounts));
    const currentYear = dayjs().year();
    for (let i = 0; i < 4; i++) {
      const yr = currentYear - i;
      activeYears.add(String(yr));
    }
    const sortedYears = Array.from(activeYears).sort();
    
    const yearlyTrendData = sortedYears.map(yr => ({
      time: `Năm ${yr}`,
      value: yearTrendCounts[yr] || 0
    }));

    const monthlyTrendData = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      return {
        time: `Tháng ${m}`,
        value: monthTrendCounts[m] || 0
      };
    });

    const facultyHorizontalData = Object.keys(facultyMap).map(f => {
      const cohortsInProgress = {};
      const cohortsAdmitted = {};
      
      displayCohorts.forEach(c => {
        cohortsInProgress[c] = 0;
        cohortsAdmitted[c] = 0;
      });

      let ipTotal = 0;
      let adTotal = 0;

      filteredData.forEach(item => {
        const itemF = standardizeKhoa(item.khoa);
        if (itemF !== f) return;

        const c = getCohort(item);
        const isProbationary = checkIsInProgress(item);
        const isOfficial = checkIsOfficial(item);

        if (isProbationary) {
          cohortsInProgress[c] = (cohortsInProgress[c] || 0) + 1;
          ipTotal++;
        } else if (isOfficial) {
          cohortsAdmitted[c] = (cohortsAdmitted[c] || 0) + 1;
          adTotal++;
        }
      });

      return {
        key: f,
        khoa: f,
        inProgress: {
          ...cohortsInProgress,
          total: ipTotal
        },
        admitted: {
          ...cohortsAdmitted,
          total: adTotal
        },
        total: ipTotal + adTotal
      };
    }).sort((a, b) => b.total - a.total);

    return {
      inProgress,
      notStarted,
      admitted,
      submittedDhdn,
      facultyData,
      facultyCohortData,
      facultyHorizontalData,
      genderData,
      genderPieInProgress,
      genderPieAdmitted,
      cohortData,
      yearlyTrendData,
      monthlyTrendData,
      total
    };
  }, [filteredData, filterYear, displayCohorts]);

  // Antd Table Columns Configuration
  const trendTableColumns = [
    { 
      title: 'Thời gian', 
      dataIndex: 'time', 
      key: 'time', 
      render: text => <strong style={{ color: '#c62828' }}>{text}</strong> 
    },
    { 
      title: 'Số lượng đã chính thức', 
      dataIndex: 'value', 
      key: 'value', 
      render: val => <strong style={{ fontSize: '14px' }}>{val} đảng viên</strong> 
    }
  ];

  // Filter out cohorts that have 0 total across all faculties for each group
  const activeInProgressCohorts = displayCohorts.filter(cohort => 
    stats?.facultyHorizontalData?.some(f => f.inProgress[cohort] > 0)
  );
  
  const activeAdmittedCohorts = displayCohorts.filter(cohort => 
    stats?.facultyHorizontalData?.some(f => f.admitted[cohort] > 0)
  );

  const facultyTableColumns = [
    { 
      title: 'Khoa quản lý', 
      dataIndex: 'khoa', 
      key: 'khoa', 
      fixed: 'left',
      width: 140,
      render: text => <strong>{text}</strong> 
    },
    ...(stats.inProgress > 0 ? [{
      title: 'Đang làm (Dự bị)',
      children: [
        ...activeInProgressCohorts.map(cohort => ({
          title: cohort,
          dataIndex: ['inProgress', cohort],
          key: `ip_${cohort}`,
          align: 'center',
          render: val => val > 0 ? <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>{val}</span> : <span style={{ color: '#d9d9d9' }}>0</span>
        })),
        {
          title: 'Cộng',
          dataIndex: ['inProgress', 'total'],
          key: 'ip_total',
          align: 'center',
          render: val => val > 0 ? <strong style={{ color: '#fa8c16' }}>{val}</strong> : <strong>0</strong>
        }
      ]
    }] : []),
    {
      title: 'Đã chính thức',
      children: [
        ...activeAdmittedCohorts.map(cohort => ({
          title: cohort,
          dataIndex: ['admitted', cohort],
          key: `ad_${cohort}`,
          align: 'center',
          render: val => val > 0 ? <span style={{ color: '#c62828', fontWeight: 'bold' }}>{val}</span> : <span style={{ color: '#d9d9d9' }}>0</span>
        })),
        {
          title: 'Cộng',
          dataIndex: ['admitted', 'total'],
          key: 'ad_total',
          align: 'center',
          render: val => val > 0 ? <strong style={{ color: '#c62828' }}>{val}</strong> : <strong>0</strong>
        }
      ]
    },
    { 
      title: 'Tổng cộng', 
      dataIndex: 'total', 
      key: 'total', 
      align: 'center',
      fixed: 'right',
      width: 110,
      render: val => <strong>{val} đảng viên</strong> 
    }
  ];

  const cohortTableColumns = [
    { title: 'Khóa học', dataIndex: 'name', key: 'name', render: text => <strong>{text}</strong> },
    ...(stats.inProgress > 0 ? [{ title: 'Đang làm (Dự bị)', dataIndex: 'Đang làm', key: 'inProgress', render: val => <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>{val} đảng viên</span> }] : []),
    { title: 'Đã chính thức', dataIndex: 'Đã chính thức', key: 'admitted', render: val => <span style={{ color: '#c62828', fontWeight: 'bold' }}>{val} đảng viên</span> },
    { title: 'Tổng cộng', dataIndex: 'Tổng cộng', key: 'total', render: val => <strong>{val} đảng viên</strong> }
  ];

  const genderTableColumns = [
    { title: 'Giới tính', dataIndex: 'name', key: 'name', render: text => <strong>{text}</strong> },
    ...(stats.inProgress > 0 ? [{ title: 'Đang làm (Dự bị)', dataIndex: 'Đang làm', key: 'inProgress', render: val => <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>{val} đảng viên</span> }] : []),
    { title: 'Đã chính thức', dataIndex: 'Đã chính thức', key: 'admitted', render: val => <span style={{ color: '#c62828', fontWeight: 'bold' }}>{val} đảng viên</span> },
    { title: 'Tổng cộng', dataIndex: 'Tổng cộng', key: 'total', render: val => <strong>{val} đảng viên</strong> }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 50px', background: '#ffffff', borderRadius: 16 }}>
        <Spin size="large" tip="Đang tải dữ liệu thống kê hồ sơ chính thức..." />
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      {/* Embedded CSS Styling for Gold & Red theme */}
      <style dangerouslySetInnerHTML={{ __html: `
        .dashboard-wrapper {
          padding: 4px 12px;
          background-color: transparent;
        }
        .dashboard-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1.5px solid #f0f0f0;
          padding-bottom: 16px;
        }
        .dashboard-header-title {
          font-weight: 900;
          color: #c62828;
          margin: 0;
          font-size: 22px;
          letter-spacing: -0.5px;
        }

        .filter-card-custom {
          background: #ffffff;
          border-radius: 14px;
          padding: 16px;
          border: 1px solid #e8e8e8;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
          margin-bottom: 20px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 992px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }
        }
        .kpi-card-compact {
          background: #ffffff;
          border-radius: 12px;
          padding: 14px 18px;
          border: 1px solid #e8e8e8;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.01);
          transition: all 0.25s ease;
          position: relative;
        }
        .kpi-card-compact:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(168, 7, 26, 0.06);
          border-color: rgba(168, 7, 26, 0.12);
        }
        .kpi-icon-wrapper-compact {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .kpi-value-compact {
          font-size: 24px;
          font-weight: 800;
          color: #111111;
          line-height: 1.1;
        }
        .kpi-label-compact {
          font-size: 13px;
          color: #555555;
          font-weight: 700;
          margin-top: 2px;
        }
        .chart-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #f0f0f0;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
          margin-bottom: 20px;
          height: 100%;
        }
        .chart-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .chart-card-title {
          font-weight: 800;
          font-size: 14px;
          color: #5c0011;
          letter-spacing: 0.2px;
        }
      ` }} />

      {/* Header Row */}
      <div className="dashboard-header-row">
        <div>
          <h1 className="dashboard-header-title">THỐNG KÊ HỒ SƠ CHÍNH THỨC</h1>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Hệ thống báo cáo số liệu và phân tích cơ cấu hồ sơ chuyển Đảng viên chính thức - Chi bộ Sinh viên
          </Text>
        </div>
      </div>

      {/* Filter and Mode Control Panel */}
      <div className="filter-card-custom">
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Space size="middle" wrap align="middle">
              <span style={{ fontWeight: 800, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FilterOutlined style={{ color: '#c62828' }} />
                Bộ lọc:
              </span>
              
              <Select 
                value={filterFaculty} 
                onChange={setFilterFaculty} 
                style={{ width: 180 }} 
                placeholder="Tất cả các khoa"
                allowClear
              >
                <Option value={null}>Tất cả các khoa</Option>
                {facultiesList.map(f => <Option key={f} value={f}>{f}</Option>)}
              </Select>

              <Select 
                value={filterCohort} 
                onChange={setFilterCohort} 
                style={{ width: 150 }} 
                placeholder="Tất cả các khóa"
                allowClear
              >
                <Option value={null}>Tất cả các khóa</Option>
                {cohortsList.map(c => <Option key={c} value={c}>{c}</Option>)}
              </Select>

              <Select 
                value={filterYear} 
                onChange={setFilterYear} 
                style={{ width: 150 }} 
                placeholder="Tất cả các năm"
                allowClear
              >
                <Option value={null}>Tất cả các năm</Option>
                {yearsList.map(y => <Option key={y} value={y}>{y}</Option>)}
              </Select>

              {(filterFaculty || filterCohort || filterYear) && (
                <Button 
                  type="text" 
                  danger 
                  onClick={() => {
                    setFilterFaculty(null);
                    setFilterCohort(null);
                    setFilterYear(null);
                  }}
                  style={{ fontWeight: 700 }}
                >
                  Xóa bộ lọc
                </Button>
              )}
            </Space>
          </Col>
          <Col xs={24} lg={8} style={{ textAlign: 'right' }}>
            <Radio.Group 
              value={displayMode} 
              onChange={e => setDisplayMode(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="charts">
                <Space><AreaChartOutlined /> Biểu đồ</Space>
              </Radio.Button>
              <Radio.Button value="tables">
                <Space><TableOutlined /> Bảng số liệu</Space>
              </Radio.Button>
            </Radio.Group>
          </Col>
        </Row>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-grid">
        {/* KPI 1: Đang làm */}
        <div className="kpi-card-compact" style={{ borderLeft: '4px solid #fa8c16' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="kpi-icon-wrapper-compact" style={{ color: '#fa8c16', backgroundColor: 'rgba(250, 140, 22, 0.08)' }}>
              <SyncOutlined spin />
            </div>
            <div>
              <div className="kpi-value-compact">
                {stats.inProgress}
                <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#8c8c8c', marginLeft: '12px' }}>
                  (Trong đó đã gửi ĐHĐN: <strong style={{ color: '#1890ff' }}>{stats.submittedDhdn}</strong>)
                </span>
              </div>
              <div className="kpi-label-compact">Đảng viên dự bị (Hồ sơ đang làm)</div>
            </div>
          </div>
        </div>

        {/* KPI 2: Chưa đến hạn */}
        <div className="kpi-card-compact" style={{ borderLeft: '4px solid #1890ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="kpi-icon-wrapper-compact" style={{ color: '#1890ff', backgroundColor: 'rgba(24, 144, 255, 0.08)' }}>
              <ClockCircleOutlined />
            </div>
            <div>
              <div className="kpi-value-compact">{stats.notStarted}</div>
              <div className="kpi-label-compact">Đảng viên dự bị (Chưa đến hạn)</div>
            </div>
          </div>
        </div>

        {/* KPI 3: Đã chính thức */}
        <div className="kpi-card-compact" style={{ borderLeft: '4px solid #c62828' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="kpi-icon-wrapper-compact" style={{ color: '#c62828', backgroundColor: 'rgba(198, 40, 40, 0.08)' }}>
              <CheckCircleOutlined />
            </div>
            <div>
              <div className="kpi-value-compact">{stats.admitted}</div>
              <div className="kpi-label-compact">Tổng số Đảng viên chính thức</div>
            </div>
          </div>
        </div>
      </div>

      {stats.total === 0 ? (
        <Card style={{ borderRadius: 16, padding: '40px 0', textAlign: 'center' }}>
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
            description="Không tìm thấy dữ liệu hồ sơ phù hợp với bộ lọc hiện tại" 
          />
        </Card>
      ) : (
        /* Conditional Content Area: Charts vs Tables */
        displayMode === 'charts' ? (
          <div>
            {/* Row 1: Cohort & Gender Distribution */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              {/* Card 1: Cohort Distribution */}
              <Col xs={24} lg={12}>
                <div className="chart-card">
                  <div className="chart-card-header">
                    <span className="chart-card-title">CƠ CẤU HỒ SƠ THEO KHÓA</span>
                  </div>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.cohortData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" stroke="#8c8c8c" style={{ fontSize: 11, fontWeight: 600 }} />
                        <YAxis allowDecimals={false} stroke="#8c8c8c" style={{ fontSize: 11, fontWeight: 600 }} />
                        <RechartsTooltip />
                        <Legend verticalAlign="top" height={36} style={{ fontSize: 11 }} />
                        {stats.inProgress > 0 && <Bar dataKey="Đang làm" name="Đang làm" fill="#fa8c16" radius={[4, 4, 0, 0]} barSize={16} />}
                        <Bar dataKey="Đã chính thức" name="Đã chính thức" fill="#c62828" radius={[4, 4, 0, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Col>

              {/* Card 2: Gender Distribution */}
              <Col xs={24} lg={12}>
                <div className="chart-card">
                  <div className="chart-card-header">
                    <span className="chart-card-title">CƠ CẤU GIỚI TÍNH ĐẢNG VIÊN</span>
                  </div>
                  <div style={{ height: 260, display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                    {/* Left Pie: Đang làm */}
                    {stats.inProgress > 0 && (
                      <div style={{ textAlign: 'center', width: '45%' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#fa8c16', marginBottom: 8 }}>Đang làm (Dự bị)</div>
                        <div style={{ height: 150 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={stats.genderPieInProgress}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={50}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                <Cell key="cell-gender-ip-nam" fill="#c62828" />
                                <Cell key="cell-gender-ip-nu" fill="#d4af37" />
                              </Pie>
                              <RechartsTooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 700, marginTop: 4 }}>
                          <span style={{ color: '#c62828' }}>Nam: {stats.genderData[0]["Đang làm"]}</span> | <span style={{ color: '#d4af37' }}>Nữ: {stats.genderData[1]["Đang làm"]}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Right Pie: Đã chính thức */}
                    <div style={{ textAlign: 'center', width: stats.inProgress > 0 ? '45%' : '100%' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#c62828', marginBottom: 8 }}>Đã chính thức</div>
                      <div style={{ height: 150 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.genderPieAdmitted}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={50}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              <Cell key="cell-gender-ad-nam" fill="#c62828" />
                              <Cell key="cell-gender-ad-nu" fill="#d4af37" />
                            </Pie>
                            <RechartsTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 700, marginTop: 4 }}>
                        <span style={{ color: '#c62828' }}>Nam: {stats.genderData[0]["Đã chính thức"]}</span> | <span style={{ color: '#d4af37' }}>Nữ: {stats.genderData[1]["Đã chính thức"]}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Row 2: Faculty Distribution */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              {/* Card 3: Faculty Distribution */}
              <Col xs={24} lg={24}>
                <div className="chart-card">
                  <div className="chart-card-header">
                    <span className="chart-card-title">CƠ CẤU HỒ SƠ THEO KHOA QUẢN LÝ</span>
                  </div>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.facultyData}
                        margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" stroke="#8c8c8c" style={{ fontSize: 11, fontWeight: 600 }} />
                        <YAxis allowDecimals={false} stroke="#8c8c8c" style={{ fontSize: 11, fontWeight: 600 }} />
                        <RechartsTooltip />
                        <Legend verticalAlign="top" height={36} style={{ fontSize: 11 }} />
                        {stats.inProgress > 0 && <Bar dataKey="Đang làm" name="Đang làm" fill="#fa8c16" radius={[4, 4, 0, 0]} barSize={16} />}
                        <Bar dataKey="Đã chính thức" name="Đã chính thức" fill="#c62828" radius={[4, 4, 0, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Row 3: Time Fluctuation */}
            <Row gutter={[16, 16]}>
              {/* Card 4: Time Trend */}
              <Col xs={24} lg={24}>
                <div className="chart-card">
                  <div className="chart-card-header">
                    <span className="chart-card-title">
                      BIẾN ĐỘNG QUYẾT ĐỊNH CÔNG NHẬN ĐẢNG VIÊN CHÍNH THỨC
                    </span>
                    <Radio.Group 
                      value={timeTrendType} 
                      onChange={e => setTimeTrendType(e.target.value)}
                      size="small"
                      buttonStyle="solid"
                    >
                      <Radio.Button value="year">Theo Năm</Radio.Button>
                      <Radio.Button value="month">Theo Tháng {filterYear ? `(${filterYear})` : ''}</Radio.Button>
                    </Radio.Group>
                  </div>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart 
                        data={timeTrendType === 'year' ? stats.yearlyTrendData : stats.monthlyTrendData} 
                        margin={{ top: 10, right: 15, left: -25, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorTrendValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c62828" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#c62828" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="time" stroke="#8c8c8c" style={{ fontSize: 11, fontWeight: 600 }} />
                        <YAxis allowDecimals={false} stroke="#8c8c8c" style={{ fontSize: 11, fontWeight: 600 }} />
                        <RechartsTooltip />
                        <Area 
                          type="monotone" 
                          name="Đảng viên chính thức" 
                          dataKey="value" 
                          stroke="#c62828" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#colorTrendValue)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        ) : (
          /* Data Tables View */
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              {/* Card 1: Table Fluctuation */}
              <Col xs={24} lg={12}>
                <div className="chart-card" style={{ height: 'auto' }}>
                  <div className="chart-card-header">
                    <span className="chart-card-title">BẢNG BIẾN ĐỘNG THEO THỜI GIAN</span>
                    <Radio.Group 
                      value={timeTrendType} 
                      onChange={e => setTimeTrendType(e.target.value)}
                      size="small"
                      buttonStyle="solid"
                    >
                      <Radio.Button value="year">Theo Năm</Radio.Button>
                      <Radio.Button value="month">Theo Tháng {filterYear ? `(${filterYear})` : ''}</Radio.Button>
                    </Radio.Group>
                  </div>
                  <Table 
                    dataSource={timeTrendType === 'year' ? stats.yearlyTrendData : stats.monthlyTrendData} 
                    columns={trendTableColumns}
                    pagination={false}
                    size="small"
                    rowKey="time"
                    bordered
                  />
                </div>
              </Col>

              {/* Card 2: Table Cohort */}
              <Col xs={24} lg={12}>
                <div className="chart-card" style={{ height: 'auto' }}>
                  <div className="chart-card-header">
                    <span className="chart-card-title">BẢNG PHÂN BỔ THEO KHÓA HỌC</span>
                  </div>
                  <Table 
                    dataSource={stats.cohortData} 
                    columns={cohortTableColumns}
                    pagination={false}
                    size="small"
                    rowKey="name"
                    bordered
                  />
                </div>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              {/* Card 3: Table Faculty */}
              <Col xs={24} lg={24}>
                <div className="chart-card" style={{ height: 'auto' }}>
                  <div className="chart-card-header">
                    <span className="chart-card-title">BẢNG PHÂN BỔ THEO KHOA QUẢN LÝ</span>
                  </div>
                  <Table 
                    dataSource={stats.facultyHorizontalData} 
                    columns={facultyTableColumns}
                    pagination={false}
                    size="small"
                    rowKey="key"
                    bordered
                    scroll={{ x: 'max-content' }}
                  />
                </div>
              </Col>

              {/* Card 4: Table Gender */}
              <Col xs={24} lg={12}>
                <div className="chart-card" style={{ height: 'auto' }}>
                  <div className="chart-card-header">
                    <span className="chart-card-title">BẢNG PHÂN BỔ THEO GIỚI TÍNH</span>
                  </div>
                  <Table 
                    dataSource={stats.genderData} 
                    columns={genderTableColumns}
                    pagination={false}
                    size="small"
                    rowKey="name"
                    bordered
                  />
                </div>
              </Col>
            </Row>
          </div>
        )
      )}
    </div>
  );
};

export default ThongKeHoSoChinhThuc;
