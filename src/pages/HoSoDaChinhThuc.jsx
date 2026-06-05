import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, Typography, message, Space, Input, Button, Modal, Form,
  Select, DatePicker, Popconfirm, Tag, Row, Col, Card, Badge, Tooltip, Drawer, Divider,
  Upload, Alert, Radio
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, DownloadOutlined, CloseOutlined, FilterOutlined,
  UploadOutlined, TableOutlined, MailOutlined, CalendarOutlined, ExportOutlined,
  FullscreenOutlined, FullscreenExitOutlined
} from '@ant-design/icons';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, where, addDoc } from 'firebase/firestore';
import { dbMain as db } from '../firebase';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import ImportExcel from '../components/ImportExcel';
import ProfileDrawer from '../components/ProfileDrawer';

const { Title, Text } = Typography;
const { Option } = Select;

const EXPORT_FIELDS = [
  { key: 'ho_ten', label: 'Họ tên', group: 'basic' },
  { key: 'mssv', label: 'MSSV', group: 'basic' },
  { key: 'ngay_sinh', label: 'Ngày sinh', group: 'basic', isDate: true },
  { key: 'gioi_tinh', label: 'Giới tính', group: 'basic' },
  { key: 'cccd', label: 'CCCD', group: 'basic' },
  { key: 'dan_toc', label: 'Dân tộc', group: 'basic' },
  { key: 'ton_giao', label: 'Tôn giáo', group: 'basic' },
  { key: 'anh_ca_nhan', label: 'Link ảnh cá nhân', group: 'basic' },
  
  { key: 'lop', label: 'Lớp', group: 'org' },
  { key: 'khoa', label: 'Khoa', group: 'org' },
  { key: 'nhom', label: 'Nhóm sinh hoạt', group: 'org' },
  
  { key: 'so_dien_thoai', label: 'SĐT', group: 'contact' },
  { key: 'email', label: 'Email cá nhân', group: 'contact' },
  { key: 'email_sv', label: 'Email sinh viên', group: 'contact' },
  { key: 'facebook', label: 'Facebook', group: 'contact' },
  { key: 'dia_chi_tam_tru', label: 'Địa chỉ tạm trú', group: 'contact' },
  
  { key: 'chi_tiet_dc', label: 'Chi tiết ĐC thường trú', group: 'address' },
  { key: 'xa_phuong_tt', label: 'Xã/phường thường trú', group: 'address' },
  { key: 'tinh_tp_tt', label: 'Tỉnh/TP thường trú', group: 'address' },
  { key: 'xa_phuong_qq', label: 'Xã/phường quê quán', group: 'address' },
  { key: 'tinh_tp_qq', label: 'Tỉnh/TP quê quán', group: 'address' },
  
  { key: 'ngay_vao_dang', label: 'Ngày vào Đảng', group: 'party', isDate: true },
  { key: 'ngay_chinh_thuc', label: 'Ngày chính thức', group: 'party', isDate: true },
  { key: 'so_the_dang', label: 'Số quyết định chính thức', group: 'party' },
  { key: 'dang_vien_du_bi', label: 'Loại Đảng viên', group: 'party', isSpecial: 'type' },
  { key: 'trang_thai', label: 'Trạng thái sinh hoạt', group: 'party', isSpecial: 'status' },
  { key: 'dvhd', label: 'Đảng viên hướng dẫn', group: 'party' },
  { key: 'ngay_chuyen_vao', label: 'Ngày chuyển vào', group: 'party', isDate: true },
  { key: 'noi_chuyen_di', label: 'Nơi chuyển đi', group: 'party' },
  { key: 'dvhd_theo_doi', label: 'ĐVHD theo dõi', group: 'party' },
  { key: 'dvhd_ho_so', label: 'ĐVHD làm hồ sơ', group: 'party' },
  
  { key: 'ho_ten_nguoi_than', label: 'Họ tên người thân', group: 'family' },
  { key: 'sdt_nguoi_than', label: 'SĐT người thân', group: 'family' }
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

const getOfficialYear = (item) => {
  const date = item.ngay_cong_nhan_dvct || item.ngay_chinh_thuc;
  if (date) return dayjs(date).format('YYYY');
  if (item.ngay_vao_dang) return dayjs(item.ngay_vao_dang).add(1, 'year').format('YYYY');
  if (item.created_at) return dayjs(item.created_at).format('YYYY');
  return null;
};

const safeDayjs = (dateVal) => {
  if (!dateVal) return null;
  const d = dayjs(dateVal);
  return d.isValid() ? d : null;
};

const HoSoDaChinhThuc = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchText, setSearchText] = useState("");
  const [filterKhoa, setFilterKhoa] = useState(null);
  const [filterLop, setFilterLop] = useState(null);
  const [filterIntake, setFilterIntake] = useState(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  // Drawer / View details
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedPrepId, setSelectedPrepId] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isProfileDrawerVisible, setIsProfileDrawerVisible] = useState(false);
  const [form] = Form.useForm();
  const [isSaving, setIsSaving] = useState(false);
  const [prepMembers, setPrepMembers] = useState([]);
  
  // Custom Export States
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [exportRange, setExportRange] = useState('filtered'); // 'filtered', 'all', 'selected'
  const [selectedExportFields, setSelectedExportFields] = useState(EXPORT_FIELDS.map(f => f.key));
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // Show all info / Import Excel states
  const [isAllInfoVisible, setIsAllInfoVisible] = useState(false);
  const [isImportVisible, setIsImportVisible] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState(null);

  const getUniqueColumnFilters = (dataSource, field) => {
    if (!dataSource || !Array.isArray(dataSource)) return [];
    const uniqueVals = [...new Set(dataSource.map(item => item && item[field]).filter(Boolean))];
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "dang_vien"));
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter those who are official members (loai_dang_vien === "Chính thức" or dang_vien_du_bi === false)
      const officialMembers = members.filter(member =>
        (member.loai_dang_vien === "Chính thức" || member.dang_vien_du_bi === false) &&
        member.ho_ten
      );

      setData(officialMembers);

      // Filter preparatory members who have completed Step 6 of their preparatory process
      const prepList = members.filter(member =>
        (member.loai_dang_vien === "Dự bị" || member.dang_vien_du_bi === true) &&
        (member.ho_so_status === 6 || member.ho_so_status === "6") &&
        member.ho_ten
      );
      setPrepMembers(prepList);
    } catch (error) {
      console.error("Lỗi khi tải danh sách:", error);
      message.error("Lỗi khi tải danh sách hồ sơ đã chính thức");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const uniqueIntakes = useMemo(() => {
    const intakes = data.map(item => {
      const lop = item.lop || "";
      const match = lop.match(/^(\d+K)/) || lop.match(/^(\d+)/);
      return match ? match[1] : null;
    }).filter(Boolean);
    return [...new Set(intakes)].sort();
  }, [data]);

  const resetFilters = () => {
    setSearchText("");
    setFilterKhoa(null);
    setFilterLop(null);
    setFilterIntake(null);
    setFilterYear(new Date().getFullYear().toString());
  };

  // Filtered and Sorted Data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch = searchText === "" ||
        item.mssv?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.ho_ten?.toLowerCase().includes(searchText.toLowerCase());
      const matchKhoa = filterKhoa ? item.khoa === filterKhoa : true;
      const matchLop = filterLop ? item.lop === filterLop : true;

      if (filterIntake) {
        const lop = item.lop || "";
        const match = lop.match(/^(\d+K)/) || lop.match(/^(\d+)/);
        const intake = match ? match[1] : null;
        if (intake !== filterIntake) return false;
      }

      const year = getOfficialYear(item);
      const yearNum = year ? parseInt(year, 10) : 0;
      

      let matchYear = true;
      if (filterYear) {
        matchYear = year === filterYear;
      }

      return matchSearch && matchKhoa && matchLop && matchYear;
    }).sort((a, b) => {
      const dateA = a.ngay_cong_nhan_dvct || a.ngay_chinh_thuc || '';
      const dateB = b.ngay_cong_nhan_dvct || b.ngay_chinh_thuc || '';
      return dateB.localeCompare(dateA); // Newest decisions on top
    });
  }, [data, searchText, filterKhoa, filterLop, filterIntake, filterYear]);

  // Derived filter lists
  const uniqueKhoa = useMemo(() => {
    return [...new Set(data.map(d => d.khoa).filter(Boolean))].sort();
  }, [data]);

  const uniqueLop = useMemo(() => {
    const source = filterKhoa ? data.filter(d => d.khoa === filterKhoa) : data;
    return [...new Set(source.map(d => d.lop).filter(Boolean))].sort();
  }, [data, filterKhoa]);

  const uniqueYears = useMemo(() => {
    const years = data.map(item => getOfficialYear(item)).filter(Boolean);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [data]);
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

      // Handle synced fields
      if (dataIndex === 'ngay_chinh_thuc') {
        updateData.ngay_cong_nhan_dvct = newVal === undefined ? null : newVal;
      }
      if (dataIndex === 'so_quyet_dinh_dvct') {
        updateData.so_qd = newVal === undefined ? null : newVal;
      }

      await updateDoc(doc(db, "dang_vien", id), updateData);
      
      setData(prevData => prevData.map(item => {
        if (item.id === id) {
          return { ...item, ...updateData };
        }
        return item;
      }));

      // Log update to history
      await addDoc(collection(db, "lich_su_cap_nhat"), {
        dang_vien_id: id,
        mssv: record.mssv || '',
        ho_ten: record.ho_ten || '',
        updated_by: "Hệ thống (Xem toàn bộ)",
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

  const columnTypes = {
    mssv: { type: 'text' },
    ho_ten: { type: 'text' },
    gioi_tinh: { type: 'select', options: [{ value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }] },
    ngay_sinh: { type: 'date' },
    lop: { type: 'text' },
    khoa: { type: 'select', options: KHOA_LIST.map(k => ({ value: k, label: k })) },
    so_dien_thoai: { type: 'text' },
    email: { type: 'text' },
    cccd: { type: 'text' },
    xa_phuong_qq: { type: 'text' },
    tinh_tp_qq: { type: 'text' },
    chi_tiet_dc: { type: 'text' },
    xa_phuong_tt: { type: 'text' },
    tinh_tp_tt: { type: 'text' },
    dia_chi_tam_tru: { type: 'text' },
    so_the_dang: { type: 'text' },
    dan_toc: { type: 'text' },
    ton_giao: { type: 'text' },
    ngay_vao_dang: { type: 'date' },
    ngay_chinh_thuc: { type: 'date' },
    so_quyet_dinh_dvct: { type: 'text' },
    noi_chuyen_di: { type: 'text' },
    ngay_chuyen_vao: { type: 'date' },
    nhom_sinh_hoat: { type: 'text' },
    dvhd: { type: 'text' },
    dvhd_theo_doi: { type: 'text' },
    dvhd_ho_so: { type: 'text' }
  };

  const wrapEditableColumn = (col) => {
    const dataIndex = col.dataIndex || col.key;
    if (!dataIndex || dataIndex === 'stt' || col.key === 'actions') {
      return col;
    }

    const config = columnTypes[dataIndex];
    if (!config) return col;

    const originalRender = col.render;

    col.render = (text, record, index) => {
      const isEditing = editingCell && editingCell.id === record.id && editingCell.dataIndex === dataIndex;
      const value = record[dataIndex];

      if (isEditing) {
        if (config.type === 'select') {
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
              {config.options.map(opt => (
                <Option key={String(opt.value)} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          );
        } else if (config.type === 'date') {
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
        align: 'center',
        fixed: 'left',
        render: (_, __, index) => index + 1
      },
      { 
        title: 'Họ tên & MSSV', 
        key: 'ho_ten_mssv', 
        width: 220, 
        fixed: 'left',
        sorter: (a, b) => (a.ho_ten || '').localeCompare(b.ho_ten || ''),
        ...getColumnSearchProps('ho_ten', 'Họ tên hoặc MSSV'),
        onFilter: (value, record) => {
          const nameMatch = record.ho_ten ? record.ho_ten.toString().toLowerCase().includes(value.toLowerCase()) : false;
          const mssvMatch = record.mssv ? record.mssv.toString().toLowerCase().includes(value.toLowerCase()) : false;
          return nameMatch || mssvMatch;
        },
        render: (_, record) => (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, color: '#1890ff' }}>{record.ho_ten || '--'}</span>
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.mssv || '--'}</span>
          </div>
        )
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
        render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : '',
        ...getColumnSearchProps('ngay_sinh', 'Ngày sinh')
      },
      { 
        title: 'Chi đoàn / Khoa', 
        key: 'lop_khoa', 
        width: 220,
        filters: KHOA_LIST.map(k => ({ text: k, value: k })),
        onFilter: (value, record) => record.khoa === value || record.lop === value,
        render: (_, record) => (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, color: '#262626' }}>{record.lop || '--'}</span>
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.khoa || '--'}</span>
          </div>
        )
      },
      { 
        title: 'Số điện thoại', 
        dataIndex: 'so_dien_thoai', 
        key: 'so_dien_thoai', 
        width: 130,
        ...getColumnSearchProps('so_dien_thoai', 'Số điện thoại')
      },
      { 
        title: 'Email', 
        dataIndex: 'email', 
        key: 'email', 
        width: 200,
        ...getColumnSearchProps('email', 'Email')
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
        ...getColumnSearchProps('so_the_dang', 'Số thẻ Đảng')
      },
      { 
        title: 'Dân tộc', 
        dataIndex: 'dan_toc', 
        key: 'dan_toc', 
        width: 120,
        ...getColumnSearchProps('dan_toc', 'Dân tộc')
      },
      { 
        title: 'Tôn giáo', 
        dataIndex: 'ton_giao', 
        key: 'ton_giao', 
        width: 120,
        ...getColumnSearchProps('ton_giao', 'Tôn giáo')
      },
      { 
        title: 'Quê quán',
        key: 'que_quan',
        width: 200,
        render: (_, r) => {
          const parts = [];
          if (r.xa_phuong_qq) parts.push(r.xa_phuong_qq);
          if (r.tinh_tp_qq) parts.push(r.tinh_tp_qq);
          return parts.join(', ') || '--';
        }
      },
      {
        title: 'Xã/Phường quê quán',
        dataIndex: 'xa_phuong_qq',
        key: 'xa_phuong_qq',
        width: 180,
        filters: getUniqueColumnFilters(data, 'xa_phuong_qq'),
        onFilter: (value, record) => record.xa_phuong_qq === value,
      },
      {
        title: 'Tỉnh/TP quê quán',
        dataIndex: 'tinh_tp_qq',
        key: 'tinh_tp_qq',
        width: 180,
        filters: getUniqueColumnFilters(data, 'tinh_tp_qq'),
        onFilter: (value, record) => record.tinh_tp_qq === value,
      },
      {
        title: 'Địa chỉ thường trú',
        dataIndex: 'chi_tiet_dc',
        key: 'chi_tiet_dc',
        width: 250,
        ...getColumnSearchProps('chi_tiet_dc', 'Địa chỉ thường trú')
      },
      {
        title: 'Xã/Phường thường trú',
        dataIndex: 'xa_phuong_tt',
        key: 'xa_phuong_tt',
        width: 180,
        filters: getUniqueColumnFilters(data, 'xa_phuong_tt'),
        onFilter: (value, record) => record.xa_phuong_tt === value,
      },
      {
        title: 'Tỉnh/TP thường trú',
        dataIndex: 'tinh_tp_tt',
        key: 'tinh_tp_tt',
        width: 180,
        filters: getUniqueColumnFilters(data, 'tinh_tp_tt'),
        onFilter: (value, record) => record.tinh_tp_tt === value,
      },
      {
        title: 'Địa chỉ tạm trú',
        dataIndex: 'dia_chi_tam_tru',
        key: 'dia_chi_tam_tru',
        width: 250,
        ...getColumnSearchProps('dia_chi_tam_tru', 'Địa chỉ tạm trú')
      },
      {
        title: 'Ngày vào Đảng',
        dataIndex: 'ngay_vao_dang',
        key: 'ngay_vao_dang',
        width: 130,
        render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : '',
        ...getColumnSearchProps('ngay_vao_dang', 'Ngày vào Đảng')
      },
      {
        title: 'Ngày chính thức',
        dataIndex: 'ngay_chinh_thuc',
        key: 'ngay_chinh_thuc',
        width: 130,
        render: (text, record) => {
          const d = record.ngay_cong_nhan_dvct || record.ngay_chinh_thuc || text;
          if (d) return dayjs(d).format('DD/MM/YYYY');
          if (record.ngay_vao_dang) {
            return dayjs(record.ngay_vao_dang).add(1, 'year').format('DD/MM/YYYY');
          }
          return '--';
        },
        ...getColumnSearchProps('ngay_chinh_thuc', 'Ngày chính thức')
      },
      {
        title: 'Số QĐ chính thức',
        dataIndex: 'so_quyet_dinh_dvct',
        key: 'so_quyet_dinh_dvct',
        width: 150,
        render: (text, record) => record.so_quyet_dinh_dvct || record.so_qd || text || '--',
        ...getColumnSearchProps('so_quyet_dinh_dvct', 'Số QĐ')
      },
      { 
        title: 'Ngày chuyển vào', 
        dataIndex: 'ngay_chuyen_vao', 
        key: 'ngay_chuyen_vao', 
        width: 130,
        render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : '--',
        ...getColumnSearchProps('ngay_chuyen_vao', 'Ngày chuyển vào')
      },
      { 
        title: 'Nơi chuyển đi', 
        dataIndex: 'noi_chuyen_di', 
        key: 'noi_chuyen_di', 
        width: 180,
        ...getColumnSearchProps('noi_chuyen_di', 'Nơi chuyển đi')
      },
      { 
        title: 'Nhóm sinh hoạt', 
        dataIndex: 'nhom_sinh_hoat', 
        key: 'nhom_sinh_hoat', 
        width: 150,
        filters: getUniqueColumnFilters(data, 'nhom_sinh_hoat'),
        onFilter: (value, record) => record.nhom_sinh_hoat === value,
        ...getColumnSearchProps('nhom_sinh_hoat', 'Nhóm sinh hoạt')
      },
      { 
        title: 'Đảng viên hướng dẫn', 
        dataIndex: 'dvhd', 
        key: 'dvhd', 
        width: 180,
        ...getColumnSearchProps('dvhd', 'ĐV hướng dẫn')
      },
      { 
        title: 'ĐVHD theo dõi', 
        dataIndex: 'dvhd_theo_doi', 
        key: 'dvhd_theo_doi', 
        width: 180,
        ...getColumnSearchProps('dvhd_theo_doi', 'ĐVHD theo dõi')
      },
      { 
        title: 'ĐVHD làm hồ sơ', 
        dataIndex: 'dvhd_ho_so', 
        key: 'dvhd_ho_so', 
        width: 180,
        ...getColumnSearchProps('dvhd_ho_so', 'ĐVHD làm hồ sơ')
      }
    ];

    return rawCols.map(col => wrapEditableColumn(col));
  }, [prepMembers, data, editingCell, editValue]);


  const downloadExcelTemplate = () => {
    try {
      const headers = ["MSSV", "Số quyết định chính thức", "Ngày ký quyết định (DD/MM/YYYY)"];
      const sampleData = [
        ["2011210001", "123-QĐ/ĐHĐN", "26/05/2026"],
        ["2011210002", "124-QĐ/ĐHĐN", "27/05/2026"]
      ];
      const excelRows = [headers, ...sampleData];
      const worksheet = XLSX.utils.aoa_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "MauImportChinhThuc");
      XLSX.writeFile(workbook, "Mau_nhap_quyet_dinh_chinh_thuc.xlsx");
      message.success("Đã tải file mẫu Excel thành công!");
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi tải file mẫu!");
    }
  };

  const handleExcelUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dataBytes = new Uint8Array(e.target.result);
        const workbook = XLSX.read(dataBytes, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length === 0) {
          message.error("File Excel trống!");
          return;
        }

        const headers = json[0].map(h => h ? String(h).trim().toLowerCase() : '');
        
        // Find column indices
        const mssvIdx = headers.findIndex(h => h.includes('mssv') || h.includes('mã số') || h.includes('sinh viên'));
        const qdIdx = headers.findIndex(h => h.includes('quyết định') || h.includes('số qđ') || h.includes('so_qd') || h.includes('qd') || h.includes('quyetdinh'));
        const ngayIdx = headers.findIndex(h => h.includes('ngày') || h.includes('ngay') || h.includes('ký') || h.includes('chính thức'));

        if (mssvIdx === -1) {
          message.error("Không tìm thấy cột MSSV trong file mẫu!");
          return;
        }

        const parsed = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;

          const mssv = row[mssvIdx] ? String(row[mssvIdx]).trim() : '';
          if (!mssv) continue;

          const soQd = qdIdx !== -1 && row[qdIdx] ? String(row[qdIdx]).trim() : '';
          const ngayKyRaw = ngayIdx !== -1 && row[ngayIdx] ? String(row[ngayIdx]).trim() : '';

          // Parse and format date
          let ngayKy = null;
          if (ngayKyRaw) {
            if (!isNaN(ngayKyRaw) && Number(ngayKyRaw) > 30000) {
              const excelDate = new Date((Number(ngayKyRaw) - 25569) * 86400 * 1000);
              ngayKy = dayjs(excelDate).format('YYYY-MM-DD');
            } else {
              const dParts = ngayKyRaw.split(/[\/\-]/);
              if (dParts.length === 3) {
                if (dParts[0].length === 4) {
                  ngayKy = `${dParts[0]}-${dParts[1].padStart(2, '0')}-${dParts[2].padStart(2, '0')}`;
                } else {
                  ngayKy = `${dParts[2]}-${dParts[1].padStart(2, '0')}-${dParts[0].padStart(2, '0')}`;
                }
              } else {
                const parsedDate = dayjs(ngayKyRaw);
                if (parsedDate.isValid()) {
                  ngayKy = parsedDate.format('YYYY-MM-DD');
                }
              }
            }
          }

          const prepMatch = prepMembers.find(m => m.mssv && String(m.mssv).trim() === mssv);
          const officialMatch = data.find(m => m.mssv && String(m.mssv).trim() === mssv);

          let status = 'error';
          let statusText = 'Không tìm thấy MSSV trong hệ thống';
          let member = null;

          if (prepMatch) {
            status = 'valid';
            statusText = 'Hợp lệ (Sẽ chuyển chính thức)';
            member = prepMatch;
          } else if (officialMatch) {
            status = 'official';
            statusText = 'Đã chính thức (Sẽ cập nhật số QĐ/ngày ký)';
            member = officialMatch;
          }

          parsed.push({
            key: i,
            mssv,
            ho_ten: member ? member.ho_ten : 'N/A',
            khoa: member ? member.khoa : 'N/A',
            lop: member ? member.lop : 'N/A',
            soQd,
            ngayKy,
            ngayKyRaw,
            status,
            statusText,
            memberId: member ? member.id : null
          });
        }

        setParsedRows(parsed);
        message.success(`Đã đọc ${parsed.length} dòng từ file Excel.`);
      } catch (err) {
        console.error(err);
        message.error("Lỗi khi đọc file Excel!");
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const confirmExcelImport = async () => {
    const validRows = parsedRows.filter(r => r.status === 'valid' || r.status === 'official');
    if (validRows.length === 0) {
      message.warning("Không có hồ sơ hợp lệ nào để cập nhật!");
      return;
    }

    setIsImportLoading(true);
    const hideLoading = message.loading(`Đang cập nhật ${validRows.length} hồ sơ...`, 0);

    try {
      const promises = validRows.map(async (row) => {
        const updateData = {
          so_quyet_dinh_dvct: row.soQd || null,
          so_qd: row.soQd || null,
          ngay_chinh_thuc: row.ngayKy || null,
          ngay_cong_nhan_dvct: row.ngayKy || null,
          loai_dang_vien: "Chính thức",
          dang_vien_du_bi: false,
          updated_at: new Date().toISOString()
        };

        await updateDoc(doc(db, "dang_vien", row.memberId), updateData);

        await addDoc(collection(db, "lich_su_cap_nhat"), {
          dang_vien_id: row.memberId,
          mssv: row.mssv,
          ho_ten: row.ho_ten,
          updated_by: "Import từ Excel (Đã chính thức)",
          updated_at: new Date().toISOString(),
          action: "chuyen_chinh_thuc",
          changes: [
            { field: "dang_vien_du_bi", from: row.status === 'valid' ? "Dự bị" : "Chính thức", to: "Chính thức" },
            { field: "so_quyet_dinh_dvct", from: "", to: row.soQd || "" }
          ]
        });
      });

      await Promise.all(promises);
      message.success(`Đã cập nhật thành công ${validRows.length} hồ sơ thành Đảng viên chính thức!`);
      setIsImportVisible(false);
      setParsedRows([]);
      fetchData();
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi cập nhật hàng loạt!");
    } finally {
      hideLoading();
      setIsImportLoading(false);
    }
  };
  const handleOpenExportModal = () => {
    setSelectedExportFields(EXPORT_FIELDS.map(f => f.key));
    setExportRange('filtered');
    setIsExportModalVisible(true);
  };

  const exportExcel = () => {
    let dataToExport = [];
    if (exportRange === 'selected') {
      dataToExport = filteredData.filter(item => selectedRowKeys.includes(item.id));
    } else if (exportRange === 'all') {
      dataToExport = data;
    } else {
      dataToExport = filteredData;
    }

    if (dataToExport.length === 0) {
      message.warning("Không có dữ liệu để xuất!");
      return;
    }

    const mappedData = dataToExport.map(item => {
      const normItem = {
        ...item,
        ho_ten: item.ho_ten || '',
        so_dien_thoai: item.so_dien_thoai || item.sdt || '',
        email: item.email || item.email_sv || '',
        email_sv: item.email_sv || item.email || '',
        ngay_sinh: item.ngay_sinh || null,
        que_quan: item.que_quan || '',
        tinh_tp_qq: item.tinh_tp_qq || item.tinh_tp_qq_cu || '',
        xa_phuong_qq: item.xa_phuong_qq || item.xa_phuong_qq_cu || '',
        tinh_tp_tt: item.tinh_tp_tt || item.tinh_tp_tt_cu || '',
        xa_phuong_tt: item.xa_phuong_tt || item.xa_phuong_tt_cu || '',
        ngay_vao_dang: item.ngay_vao_dang || null,
        dvhd: item.dvhd || '',
        so_the_dang: item.so_the_dang || item.so_quyet_dinh_dvct || item.so_qd || '',
        ngay_chinh_thuc: item.ngay_cong_nhan_dvct || item.ngay_chinh_thuc || null,
        dang_vien_du_bi: false,
        trang_thai: item.trang_thai || 'dang_sinh_hoat',
      };

      const row = {};
      EXPORT_FIELDS.forEach(field => {
        if (selectedExportFields.includes(field.key)) {
          if (field.isDate) {
            row[field.label] = normItem[field.key] ? dayjs(normItem[field.key]).format('DD/MM/YYYY') : '';
          } else if (field.isSpecial === 'type') {
            row[field.label] = normItem.dang_vien_du_bi ? "Dự bị" : "Chính thức";
          } else if (field.isSpecial === 'status') {
            row[field.label] = normItem.trang_thai === 'dang_sinh_hoat' ? 'Đang sinh hoạt' :
                               normItem.trang_thai === 'da_chuyen' ? 'Đã chuyển ra' :
                               normItem.trang_thai === 'cho_ket_nap' ? 'Chờ kết nạp' :
                               normItem.trang_thai === 'dang_xet_chinh_thuc' ? 'Đang xét chính thức' : 'Đang sinh hoạt';
          } else {
            row[field.label] = normItem[field.key] || "";
          }
        }
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(mappedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HoSoChinhThuc");
    XLSX.writeFile(wb, `Danh_sach_Ho_so_Da_Chinh_Thuc_${dayjs().format('YYYYMMDD')}_TuyChinh.xlsx`);
    
    setIsExportModalVisible(false);
    message.success(`Xuất Excel thành công ${dataToExport.length} dòng!`);
  };

  const handleSelectPrepMember = (memberId) => {
    setSelectedPrepId(memberId);
    const selected = prepMembers.find(m => m.id === memberId);
    if (selected) {
      const ngayVaoDang = safeDayjs(selected.ngay_vao_dang);
      const ngayChinhThuc = ngayVaoDang ? ngayVaoDang.add(1, 'year') : null;
      
      form.setFieldsValue({
        ...selected,
        ngay_sinh: safeDayjs(selected.ngay_sinh),
        ngay_vao_dang: ngayVaoDang,
        ngay_chinh_thuc: ngayChinhThuc,
        so_quyet_dinh_dvct: selected.so_quyet_dinh_dvct || '',
      });
    }
  };

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setSelectedPrepId(null);
    setIsProfileDrawerVisible(true);
  };

  const handleUpdateRecord = async () => {
    try {
      setIsSaving(true);
      const values = await form.validateFields();

      const formatted = {
        ...values,
        ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : null,
        ngay_vao_dang: values.ngay_vao_dang ? values.ngay_vao_dang.format('YYYY-MM-DD') : null,
        ngay_chinh_thuc: values.ngay_chinh_thuc ? values.ngay_chinh_thuc.format('YYYY-MM-DD') : null,
        ngay_cong_nhan_dvct: values.ngay_chinh_thuc ? values.ngay_chinh_thuc.format('YYYY-MM-DD') : null, // Sync both fields
        so_quyet_dinh_dvct: values.so_quyet_dinh_dvct || null,
        so_qd: values.so_quyet_dinh_dvct || null, // Sync both fields
        loai_dang_vien: "Chính thức",
        dang_vien_du_bi: false,
        updated_at: new Date().toISOString()
      };

      if (selectedRecord) {
        await updateDoc(doc(db, "dang_vien", selectedRecord.id), formatted);
        
        await addDoc(collection(db, "lich_su_cap_nhat"), {
          dang_vien_id: selectedRecord.id,
          mssv: selectedRecord.mssv || '',
          ho_ten: selectedRecord.ho_ten || '',
          updated_by: "Hệ thống",
          updated_at: new Date().toISOString(),
          action: "update_official_record",
          changes: [{ field: "thong_tin", from: "Cập nhật hồ sơ chính thức", to: "Thành công" }]
        });

        message.success("Cập nhật thông tin hồ sơ thành công!");
      } else {
        if (!selectedPrepId) {
          message.error("Vui lòng chọn Đảng viên dự bị!");
          setIsSaving(false);
          return;
        }

        const selectedPrep = prepMembers.find(m => m.id === selectedPrepId);
        await updateDoc(doc(db, "dang_vien", selectedPrepId), formatted);

        await addDoc(collection(db, "lich_su_cap_nhat"), {
          dang_vien_id: selectedPrepId,
          mssv: selectedPrep?.mssv || '',
          ho_ten: selectedPrep?.ho_ten || '',
          updated_by: "Hệ thống",
          updated_at: new Date().toISOString(),
          action: "chuyen_chinh_thuc",
          changes: [
            { field: "dang_vien_du_bi", from: "Dự bị", to: "Chính thức" },
            { field: "so_quyet_dinh_dvct", from: "", to: values.so_quyet_dinh_dvct || "" }
          ]
        });

        message.success("Chuyển Đảng viên dự bị thành Đảng viên chính thức thành công!");
      }

      setIsDrawerVisible(false);
      fetchData();
    } catch (err) {
      console.error(err);
      if (!err.errorFields) message.error("Lỗi khi lưu thông tin");
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_, __, index) => index + 1
    },
    { 
      title: 'Họ tên & MSSV', 
      key: 'ho_ten_mssv',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: '#1890ff', cursor: 'pointer' }}>{record.ho_ten || '--'}</span>
          <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.mssv || '--'}</span>
        </div>
      )
    },
    { 
      title: 'Chi đoàn / Khoa', 
      key: 'lop_khoa',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: '#262626' }}>{record.lop || '--'}</span>
          <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.khoa || '--'}</span>
        </div>
      )
    },
    {
      title: 'Ngày sinh',
      dataIndex: 'ngay_sinh',
      key: 'ngay_sinh',
      width: 120,
      render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : ''
    },
    {
      title: 'Ngày vào Đảng',
      dataIndex: 'ngay_vao_dang',
      key: 'ngay_vao_dang',
      width: 130,
      render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : ''
    },
    {
      title: 'Ngày chính thức',
      key: 'ngay_chinh_thuc_col',
      width: 130,
      render: (_, record) => {
        const d = record.ngay_cong_nhan_dvct || record.ngay_chinh_thuc;
        if (d) return dayjs(d).format('DD/MM/YYYY');
        if (record.ngay_vao_dang) {
          return dayjs(record.ngay_vao_dang).add(1, 'year').format('DD/MM/YYYY');
        }
        return '--';
      }
    },
    {
      title: 'Số QĐ chính thức',
      key: 'so_qd_chinh_thuc',
      render: (_, record) => record.so_quyet_dinh_dvct || record.so_qd || '--'
    }
  ];

  return (
    <div style={{ padding: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
          <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
            Hồ sơ đã công nhận Đảng viên chính thức
          </Title>
        </div>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setSelectedRecord(null); setIsDrawerVisible(true); }} style={{ backgroundColor: '#c62828', borderRadius: '6px', fontWeight: 500 }}>
            Thêm hồ sơ mới
          </Button>

          <Button
            type="dashed"
            icon={<TableOutlined style={{ color: '#52c41a' }} />}
            onClick={() => setIsAllInfoVisible(true)}
            style={{ borderRadius: '6px', fontWeight: 500, borderColor: '#52c41a', color: '#52c41a' }}
          >
            Xem toàn bộ thông tin
          </Button>

          <Button
            icon={<UploadOutlined />}
            onClick={() => setIsImportVisible(true)}
            style={{ borderRadius: '6px', fontWeight: 500, color: '#555555' }}
          >
            Nhập & Cập nhật
          </Button>

          <Button
            icon={<DownloadOutlined />}
            onClick={handleOpenExportModal}
            style={{ borderRadius: '6px', fontWeight: 500, color: '#555555' }}
          >
            Xuất Excel
          </Button>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8c8c8c', fontSize: '13px', marginRight: '4px', fontWeight: 500, flexShrink: 0 }}>
          <FilterOutlined style={{ color: '#c62828' }} /> <span>Bộ lọc:</span>
        </div>

        <div style={{ flex: 1.5, minWidth: '200px' }}>
          <Input
            placeholder="Tìm theo MSSV, Họ tên..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            style={{ width: '100%', borderRadius: '6px' }}
            allowClear
          />
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <Select
            style={{ width: '100%' }}
            placeholder="Lọc theo Khoa"
            allowClear
            value={filterKhoa}
            onChange={(val) => { setFilterKhoa(val); setFilterLop(null); }}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            {KHOA_LIST.map(k => <Option key={k} value={k}>{k}</Option>)}
          </Select>
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <Select
            style={{ width: '100%' }}
            placeholder="Lọc theo Lớp"
            allowClear
            value={filterLop}
            onChange={setFilterLop}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            {uniqueLop.map(l => <Option key={l} value={l}>{l}</Option>)}
          </Select>
        </div>

        <div style={{ flex: 1, minWidth: '120px' }}>
          <Select
            style={{ width: '100%' }}
            placeholder="Lọc theo Khóa"
            allowClear
            value={filterIntake}
            onChange={setFilterIntake}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            {uniqueIntakes.map(k => <Option key={k} value={k}>{k}</Option>)}
          </Select>
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <Select
            style={{ width: '100%' }}
            placeholder="Năm chính thức"
            allowClear
            value={filterYear}
            onChange={setFilterYear}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            {uniqueYears.map(y => <Option key={y} value={y}>{y}</Option>)}
          </Select>
        </div>

        {(searchText || filterKhoa || filterLop || filterIntake || filterYear) && (
          <div style={{ flexShrink: 0 }}>
            <Button
              type="text"
              danger
              onClick={resetFilters}
              icon={<CloseOutlined />}
              style={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}
              size="small"
            >
              Xóa lọc
            </Button>
          </div>
        )}
      </div>

        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys
          }}
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50', '1000'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} hồ sơ`
          }}
          onRow={(record) => ({
            onClick: (e) => {
              if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && !e.target.closest('.ant-select') && !e.target.closest('.ant-btn')) {
                handleRowClick(record);
              }
            },
            style: { cursor: 'pointer' }
          })}
        />

      <Drawer
        title="Thông tin chi tiết Hồ sơ chính thức"
        width={560}
        onClose={() => setIsDrawerVisible(false)}
        open={isDrawerVisible}
        bodyStyle={{ paddingBottom: 80 }}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setIsDrawerVisible(false)} style={{ marginRight: 8 }}>Hủy</Button>
            <Button onClick={handleUpdateRecord} type="primary" loading={isSaving} style={{ backgroundColor: '#c62828', borderColor: '#c62828' }}>Lưu thay đổi</Button>
          </div>
        }
      >
        <Form form={form} layout="vertical">
          {!selectedRecord && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item 
                  label={<b style={{ color: '#c62828' }}>Chọn Đảng viên dự bị chuyển chính thức</b>} 
                  required
                >
                  <Select
                    showSearch
                    placeholder="Tìm theo MSSV hoặc Họ tên (Chỉ hiển thị các Đảng viên ở Bước 6)..."
                    optionFilterProp="children"
                    value={selectedPrepId}
                    onChange={handleSelectPrepMember}
                    style={{ width: '100%', marginBottom: '12px' }}
                    dropdownStyle={{ borderRadius: '6px' }}
                  >
                    {prepMembers.map(m => (
                      <Option key={m.id} value={m.id}>
                        {m.ho_ten} - {m.mssv} ({m.lop || m.khoa}) [Bước 6: Hoàn thành hồ sơ]
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="mssv" label="MSSV" rules={[{ required: true }]}>
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ho_ten" label="Họ và tên" rules={[{ required: true }]}>
                <Input disabled={!selectedRecord && !selectedPrepId} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="lop" label="Lớp" rules={[{ required: true }]}>
                <Input disabled={!selectedRecord && !selectedPrepId} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="khoa" label="Khoa" rules={[{ required: true, message: 'Vui lòng chọn Khoa!' }]}>
                <Select disabled={!selectedRecord && !selectedPrepId} showSearch optionFilterProp="children" placeholder="Chọn Khoa...">
                  {KHOA_LIST.map(k => <Option key={k} value={k}>{k}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ngay_sinh" label="Ngày sinh">
                <DatePicker disabled={!selectedRecord && !selectedPrepId} format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gioi_tinh" label="Giới tính">
                <Select disabled={!selectedRecord && !selectedPrepId}>
                  <Option value="Nam">Nam</Option>
                  <Option value="Nữ">Nữ</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="so_dien_thoai" label="Số điện thoại">
                <Input disabled={!selectedRecord && !selectedPrepId} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input disabled={!selectedRecord && !selectedPrepId} />
              </Form.Item>
            </Col>
          </Row>
          <Divider style={{ margin: '16px 0' }} />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ngay_vao_dang" label="Ngày vào Đảng">
                <DatePicker 
                  disabled={!selectedRecord && !selectedPrepId} 
                  format="DD/MM/YYYY" 
                  style={{ width: '100%' }} 
                  onChange={(date) => {
                    if (date) {
                      form.setFieldsValue({ ngay_chinh_thuc: date.add(1, 'year') });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ngay_chinh_thuc" label="Ngày chính thức" rules={[{ required: true, message: 'Vui lòng chọn ngày chính thức!' }]}>
                <DatePicker disabled={!selectedRecord && !selectedPrepId} format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="so_quyet_dinh_dvct" label="Số quyết định chính thức" rules={[{ required: true, message: 'Vui lòng nhập số quyết định!' }]}>
                <Input disabled={!selectedRecord && !selectedPrepId} placeholder="VD: 123-QĐ/ĐHĐN" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dvhd" label="Đảng viên hướng dẫn">
                <Input disabled={!selectedRecord && !selectedPrepId} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>
      
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
              <span style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a1a' }}>
                Bảng Tổng Hợp Chi Tiết Toàn Bộ Hồ Sơ Đảng Viên Chính Thức ({filteredData.length} đồng chí)
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
          scroll={{ x: 3800, y: isTableFullscreen ? 'calc(100vh - 155px)' : 'calc(80vh - 135px)' }}
          bordered
          pagination={{
            defaultPageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100', '1000'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} hồ sơ`
          }}
          onRow={(record) => ({
            onClick: (e) => {
              if (
                e.target.tagName !== 'INPUT' && 
                e.target.tagName !== 'BUTTON' && 
                !e.target.closest('.ant-select') && 
                !e.target.closest('.ant-btn') && 
                e.target.title !== "Nhấp đúp chuột để sửa nhanh" &&
                !e.target.closest('[title="Nhấp đúp chuột để sửa nhanh"]')
              ) {
                handleRowClick(record);
              }
            },
            style: { cursor: 'pointer' }
          })}
        />
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
            <span style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a1a' }}>
              Nhập quyết định chính thức từ file Excel
            </span>
          </div>
        }
        open={isImportVisible}
        onCancel={() => {
          setIsImportVisible(false);
          setParsedRows([]);
          setExcelFile(null);
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setIsImportVisible(false);
              setParsedRows([]);
              setExcelFile(null);
            }}
          >
            Hủy
          </Button>,
          <Button
            key="confirm"
            type="primary"
            onClick={confirmExcelImport}
            loading={isImportLoading}
            disabled={parsedRows.filter(r => r.status === 'valid' || r.status === 'official').length === 0}
            style={{ backgroundColor: '#c62828', borderColor: '#c62828' }}
          >
            Xác nhận cập nhật ({parsedRows.filter(r => r.status === 'valid' || r.status === 'official').length} hồ sơ)
          </Button>
        ]}
        width={850}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Alert
            message={<b>Hướng dẫn nhập quyết định chính thức:</b>}
            description={
              <ul style={{ margin: 0, paddingLeft: '16px' }}>
                <li>Tải file mẫu Excel xuống, điền mã số sinh viên (MSSV), số quyết định chính thức và ngày ký quyết định chính thức.</li>
                <li>Hệ thống sẽ tự động đối chiếu MSSV để chuyển trạng thái của đồng chí đó sang <b>Chính thức</b> ở danh sách đang sinh hoạt.</li>
                <li>Định dạng ngày ký quyết định trong Excel khuyên dùng là <b>DD/MM/YYYY</b> (Ví dụ: 26/05/2026).</li>
              </ul>
            }
            type="info"
            showIcon
            action={
              <Button 
                type="primary" 
                ghost 
                size="small" 
                icon={<DownloadOutlined />} 
                onClick={downloadExcelTemplate}
                style={{ borderColor: '#1890ff', color: '#1890ff' }}
              >
                Tải file mẫu Excel
              </Button>
            }
          />

          <Upload.Dragger
            accept=".xlsx, .xls"
            beforeUpload={handleExcelUpload}
            showUploadList={false}
            disabled={isImportLoading}
            style={{ padding: '24px', background: '#fafafa', borderRadius: '8px', border: '1px dashed #d9d9d9' }}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined style={{ fontSize: '32px', color: '#c62828' }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: '15px', fontWeight: 600, color: '#434343' }}>
              Nhấp hoặc Kéo thả file Excel quyết định chính thức vào đây để bắt đầu tải lên
            </p>
            <p className="ant-upload-hint" style={{ fontSize: '12px', color: '#8c8c8c' }}>
              Hỗ trợ định dạng .xlsx, .xls (Cột bắt buộc: MSSV, Quyết định, Ngày ký)
            </p>
          </Upload.Dragger>

          {parsedRows.length > 0 && (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px', color: '#1f1f1f', display: 'flex', justifyContent: 'space-between' }}>
                <span>Xem trước danh sách đọc được từ Excel ({parsedRows.length} dòng):</span>
                <span style={{ color: '#8c8c8c', fontWeight: 'normal', fontSize: '12px' }}>
                  Hợp lệ: <b style={{ color: '#52c41a' }}>{parsedRows.filter(r => r.status === 'valid').length}</b> | 
                  Cập nhật: <b style={{ color: '#fa8c16' }}>{parsedRows.filter(r => r.status === 'official').length}</b> | 
                  Lỗi: <b style={{ color: '#f5222d' }}>{parsedRows.filter(r => r.status === 'error').length}</b>
                </span>
              </div>
              
              <Table
                dataSource={parsedRows}
                rowKey="key"
                size="small"
                pagination={{ pageSize: 5 }}
                bordered
                scroll={{ y: 220 }}
                columns={[
                  { title: 'MSSV', dataIndex: 'mssv', key: 'mssv', width: 110 },
                  { title: 'Họ và tên', dataIndex: 'ho_ten', key: 'ho_ten', width: 160 },
                  { title: 'Lớp/Khoa', key: 'lop_khoa', width: 150, render: (_, r) => r.lop !== 'N/A' ? `${r.lop} (${r.khoa})` : 'N/A' },
                  { title: 'Số quyết định', dataIndex: 'soQd', key: 'soQd', width: 130 },
                  { 
                    title: 'Ngày ký QĐ', 
                    key: 'ngayKy', 
                    width: 120,
                    render: (_, r) => r.ngayKy ? dayjs(r.ngayKy).format('DD/MM/YYYY') : <span style={{ color: '#ff4d4f' }}>{r.ngayKyRaw || 'Trống'}</span> 
                  },
                  {
                    title: 'Trạng thái đối chiếu',
                    dataIndex: 'statusText',
                    key: 'statusText',
                    width: 200,
                    render: (text, r) => {
                      let color = 'red';
                      if (r.status === 'valid') color = 'green';
                      if (r.status === 'official') color = 'orange';
                      return <Tag color={color}>{text}</Tag>;
                    }
                  }
                ]}
              />
            </div>
          )}
        </div>
      </Modal>
      
      <ProfileDrawer 
        open={isProfileDrawerVisible} 
        onClose={() => setIsProfileDrawerVisible(false)} 
        data={selectedRecord} 
        onUpdate={fetchData} 
      />

      {/* Custom Export Modal */}
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
        onOk={exportExcel}
        onCancel={() => setIsExportModalVisible(false)}
        okText="XUẤT FILE EXCEL"
        cancelText="HỦY BỎ"
        width={850}
        style={{ top: 40 }}
        okButtonProps={{ style: { backgroundColor: '#c62828', borderColor: '#c62828', height: 40, fontWeight: 700, borderRadius: '6px' } }}
        cancelButtonProps={{ style: { height: 40, borderRadius: '6px' } }}
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
                <Col span={4}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Khoa:</div>
                  <Select 
                    placeholder="Chọn Khoa" 
                    value={filterKhoa} 
                    onChange={val => { setFilterKhoa(val); setFilterLop(null); }} 
                    style={{ width: '100%' }}
                    allowClear
                    dropdownStyle={{ borderRadius: '6px' }}
                  >
                    {KHOA_LIST.map(k => <Option key={k} value={k}>{k}</Option>)}
                  </Select>
                </Col>
                <Col span={4}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Lớp:</div>
                  <Select 
                    placeholder="Chọn Lớp" 
                    value={filterLop} 
                    onChange={setFilterLop} 
                    style={{ width: '100%' }}
                    allowClear
                    dropdownStyle={{ borderRadius: '6px' }}
                  >
                    {uniqueLop.map(lop => (
                      <Option key={lop} value={lop}>{lop}</Option>
                    ))}
                  </Select>
                </Col>
                <Col span={4}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Khóa:</div>
                  <Select 
                    placeholder="Chọn Khóa" 
                    value={filterIntake} 
                    onChange={setFilterIntake} 
                    style={{ width: '100%' }}
                    allowClear
                    dropdownStyle={{ borderRadius: '6px' }}
                  >
                    {uniqueIntakes.map(k => (
                      <Option key={k} value={k}>{k}</Option>
                    ))}
                  </Select>
                </Col>
                <Col span={4}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Năm chính thức:</div>
                  <Select 
                    placeholder="Chọn Năm" 
                    value={filterYear} 
                    onChange={setFilterYear} 
                    style={{ width: '100%' }}
                    allowClear
                    dropdownStyle={{ borderRadius: '6px' }}
                  >
                    {uniqueYears.map(year => (
                      <Option key={year} value={year}>{year}</Option>
                    ))}
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

          <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
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
                          style={{ fontSize: '12px', fontWeight: 600, color: '#c62828' }}
                        >
                          {allSelected ? "Hủy chọn nhóm" : "Chọn cả nhóm"}
                        </Button>
                      }
                    >
                      <Row gutter={[8, 12]}>
                        {groupFields.map(field => {
                          const isSelected = selectedExportFields.includes(field.key);
                          return (
                            <Col span={8} key={field.key}>
                              <div 
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedExportFields(prev => prev.filter(k => k !== field.key));
                                  } else {
                                    setSelectedExportFields(prev => [...prev, field.key]);
                                  }
                                }}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: isSelected ? '1px solid #ffa39e' : '1px solid #d9d9d9',
                                  backgroundColor: isSelected ? '#fff1f0' : '#fff',
                                  color: isSelected ? '#c62828' : '#595959',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontWeight: isSelected ? 600 : 400,
                                  transition: 'all 0.15s ease',
                                  userSelect: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}
                              >
                                <span>{field.label}</span>
                                {isSelected && <span style={{ color: '#c62828', fontWeight: 800 }}>✓</span>}
                              </div>
                            </Col>
                          );
                        })}
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

export default HoSoDaChinhThuc;
