import React, { useState, useEffect, useMemo } from 'react';
import { 
  Table, Typography, message, Space, Input, Button, Modal, Form, 
  Select, DatePicker, Popconfirm, Tag, Steps, Row, Col, Alert, Card, Badge, Tooltip, Tabs, Switch, Upload,
  Drawer, Timeline, Popover
} from 'antd';
import { 
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, 
  LockOutlined, UnlockOutlined, InfoCircleOutlined, DownloadOutlined, 
  CloseOutlined, FilterOutlined, MailOutlined, CalendarOutlined, HistoryOutlined, SendOutlined, UploadOutlined,
  TableOutlined, FullscreenOutlined, FullscreenExitOutlined
} from '@ant-design/icons';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { dbMain, dbStudent } from '../firebase';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import debounce from 'lodash/debounce';

const { Title, Text } = Typography;
const { Option } = Select;
const { Step } = Steps;

const PROVINCES = [
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
];

const KHOA_LIST = [
  "P.CTSV", "Quản trị Kinh doanh", "Trung tâm Đào tạo Quốc tế", "Du lịch", "Marketing", "Tài chính", "Ngân hàng", "Kinh tế", "Kế toán", "Luật", "Thống kê - Tin học", "Thương mại điện tử", "Kinh doanh quốc tế", "Lý luận chính trị", "Khác"
];



// 8 Admission Stages
const ADMISSION_STEPS = [
  { step: 1, title: 'Đang viết file mềm', desc: 'Đang tiến hành viết file mềm' },
  { step: 2, title: 'Đang viết bản cứng', desc: 'Đang tiến hành viết bản cứng' },
  { step: 3, title: 'Lý lịch chờ ĐHĐN làm giấy thẩm tra', desc: 'Lý lịch chờ ĐHĐN làm giấy thẩm tra' },
  { step: 4, title: 'Lý lịch đang thẩm tra', desc: 'Lý lịch đang được tiến hành thẩm tra' },
  { step: 5, title: 'Đang hoàn thiện giấy tờ khác', desc: 'Đang hoàn thiện các giấy tờ khác' },
  { step: 6, title: 'Hồ sơ gửi VPĐU', desc: 'Hồ sơ đã được gửi Văn phòng Đảng ủy' },
  { step: 7, title: 'Hồ sơ gửi ĐHĐN', desc: 'Hồ sơ đã được gửi Đại học Đà Nẵng' },
  { step: 8, title: 'Đã có quyết định kết nạp', desc: 'Đã có quyết định kết nạp Đảng viên' }
];

const HoSoKetNap = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  
  // Edit & Lookup states
  const [editingId, setEditingId] = useState(null);
  const [mssvInput, setMssvInput] = useState("");
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isEditable, setIsEditable] = useState(false); // Controls readonly override for AUTO
  const [sourceType, setSourceType] = useState(null); // 'auto' | 'manual'
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);

  // Filters
  const [searchText, setSearchText] = useState("");
  const [filterKhoa, setFilterKhoa] = useState(null);
  const [filterTrangThai, setFilterTrangThai] = useState(null);
  const [filterIntake, setFilterIntake] = useState(null);

  // Import Excel Modal states
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importFileList, setImportFileList] = useState([]);
  const [importPreviewData, setImportPreviewData] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  // Spreadsheet Mode States
  const [isSpreadsheetModalVisible, setIsSpreadsheetModalVisible] = useState(false);
  const [spreadsheetData, setSpreadsheetData] = useState([]);
  const [savingSpreadsheet, setSavingSpreadsheet] = useState(false);
  const [importSelectedKeys, setImportSelectedKeys] = useState([]);
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState(null);
  const [sheetSearchText, setSheetSearchText] = useState("");
  const [sheetFilterKhoa, setSheetFilterKhoa] = useState(null);
  const [sheetFilterTrangThai, setSheetFilterTrangThai] = useState(null);

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

  const columnTypes = {
    mssv: { type: 'text' },
    hoten: { type: 'text' },
    lop: { type: 'text' },
    khoa: { type: 'select', options: KHOA_LIST.map(k => ({ value: k, label: k })) },
    trangthai: { 
      type: 'select', 
      options: ADMISSION_STEPS.filter(s => s.step !== 8).map(s => ({ value: s.step, label: `Bước ${s.step}: ${s.title}` }))
    },
    dangvienhuongdan: { type: 'text' },
    ngaynhanhoso: { type: 'date' },
    deadline_file_mem: { type: 'date' },
    deadline_viet_so: { type: 'date' },
    deadline_hoanthanhgiayto: { type: 'date' },
    ngay_nop_vpdu: { type: 'date' },
    ngay_nop_dhdn: { type: 'date' },
    gioitinh: { type: 'select', options: [{ value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }] },
    ngaysinh: { type: 'date' },
    cccd: { type: 'text' },
    quequan: { type: 'text' },
    sdt: { type: 'text' },
    email: { type: 'text' },
    ghi_chu_ho_so: { type: 'text' }
  };

  const startCellEdit = (id, dataIndex, val) => {
    setEditingCell({ id, dataIndex });
    setEditValue(val);
  };

  const cancelCellEdit = () => {
    setEditingCell(null);
    setEditValue(null);
  };

  const saveCellEdit = (id, dataIndex, newVal) => {
    handleCellChange(id, dataIndex, newVal);
    cancelCellEdit();
  };

  const wrapEditableColumn = (col) => {
    const dataIndex = col.dataIndex || col.key;
    if (!dataIndex || dataIndex === 'stt' || col.key === 'actions' || col.key === 'status_history') {
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

      // Display Value
      let displayVal = text;
      if (config.type === 'date') {
        displayVal = text ? dayjs(text).format('DD/MM/YYYY') : '';
      } else if (config.type === 'select') {
        const option = config.options.find(o => o.value === text);
        displayVal = option ? option.label : (text || '--');
      }

      if (!displayVal && dataIndex === 'hoten') {
        displayVal = <span style={{ color: '#ff4d4f' }}>Chưa nhập họ tên (*)</span>;
      } else if (!displayVal) {
        displayVal = '--';
      }

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

  const filteredSheetData = useMemo(() => {
    return spreadsheetData.filter(item => {
      if (!item) return false;
      const matchSearch = !sheetSearchText || 
        item.mssv?.toLowerCase().includes(sheetSearchText.toLowerCase()) || 
        item.hoten?.toLowerCase().includes(sheetSearchText.toLowerCase());
      const matchKhoa = !sheetFilterKhoa || item.khoa === sheetFilterKhoa;
      const matchTrangThai = !sheetFilterTrangThai || item.trangthai === sheetFilterTrangThai;
      return matchSearch && matchKhoa && matchTrangThai;
    });
  }, [spreadsheetData, sheetSearchText, sheetFilterKhoa, sheetFilterTrangThai]);

  const spreadsheetColumns = useMemo(() => {
    const rawCols = [
      {
        title: 'STT',
        key: 'stt',
        width: 60,
        fixed: 'left',
        align: 'center',
        render: (_, __, index) => index + 1
      },
      {
        title: 'MSSV',
        dataIndex: 'mssv',
        key: 'mssv',
        width: 120,
        fixed: 'left',
        sorter: (a, b) => (a.mssv || '').localeCompare(b.mssv || ''),
        ...getColumnSearchProps('mssv', 'MSSV')
      },
      {
        title: 'Họ tên (*)',
        dataIndex: 'hoten',
        key: 'hoten',
        width: 180,
        fixed: 'left',
        sorter: (a, b) => (a.hoten || '').localeCompare(b.hoten || ''),
        ...getColumnSearchProps('hoten', 'Họ tên')
      },
      {
        title: 'Lớp',
        dataIndex: 'lop',
        key: 'lop',
        width: 120,
        fixed: 'left',
        sorter: (a, b) => (a.lop || '').localeCompare(b.lop || ''),
        filters: getUniqueColumnFilters(spreadsheetData, 'lop'),
        onFilter: (value, record) => record.lop === value,
      },
      {
        title: 'Khoa',
        dataIndex: 'khoa',
        key: 'khoa',
        width: 160,
        fixed: 'left',
        filters: KHOA_LIST.map(k => ({ text: k, value: k })),
        onFilter: (value, record) => record.khoa === value,
      },
      {
        title: 'Tiến trình',
        dataIndex: 'trangthai',
        key: 'trangthai',
        width: 200,
        filters: ADMISSION_STEPS.filter(s => s.step !== 8).map(s => ({ text: `Bước ${s.step}: ${s.title}`, value: s.step })),
        onFilter: (value, record) => record.trangthai === value,
      },
      {
        title: 'Đảng viên hướng dẫn',
        dataIndex: 'dangvienhuongdan',
        key: 'dangvienhuongdan',
        width: 160,
        sorter: (a, b) => (a.dangvienhuongdan || '').localeCompare(b.dangvienhuongdan || ''),
        ...getColumnSearchProps('dangvienhuongdan', 'ĐV hướng dẫn')
      },
      {
        title: 'Ngày nhận HS',
        dataIndex: 'ngaynhanhoso',
        key: 'ngaynhanhoso',
        width: 130
      },
      {
        title: 'Hạn file mềm',
        dataIndex: 'deadline_file_mem',
        key: 'deadline_file_mem',
        width: 130
      },
      {
        title: 'Hạn viết sổ',
        dataIndex: 'deadline_viet_so',
        key: 'deadline_viet_so',
        width: 130
      },
      {
        title: 'Hạn giấy tờ khác',
        dataIndex: 'deadline_hoanthanhgiayto',
        key: 'deadline_hoanthanhgiayto',
        width: 130
      },
      {
        title: 'Ngày nộp VPĐU',
        dataIndex: 'ngay_nop_vpdu',
        key: 'ngay_nop_vpdu',
        width: 130
      },
      {
        title: 'Ngày nộp ĐHĐN',
        dataIndex: 'ngay_nop_dhdn',
        key: 'ngay_nop_dhdn',
        width: 130
      },
      {
        title: 'Lịch sử thay đổi',
        dataIndex: 'status_history',
        key: 'status_history',
        width: 140,
        render: (history, record) => {
          const logs = Array.isArray(history) ? history.filter(h => h && typeof h === 'object') : [];
          if (logs.length === 0) return <span style={{ fontSize: '12px', color: '#8c8c8c' }}>Chưa ghi nhận</span>;
          
          const content = (
            <Timeline size="small" style={{ marginTop: 8, maxWidth: 280 }}>
              {logs.map((h, idx) => {
                const stepInfo = ADMISSION_STEPS.find(s => s.step === Number(h.step)) || ADMISSION_STEPS[0];
                return (
                  <Timeline.Item key={idx} color={h.step === 8 ? 'green' : 'blue'}>
                    <div style={{ fontSize: '12px' }}>
                      <strong>Bước {h.step}: {stepInfo.title}</strong>
                    </div>
                    <div style={{ fontSize: '10px', color: '#8c8c8c' }}>
                      {h.timestamp ? dayjs(h.timestamp).format('DD/MM/YYYY HH:mm') : ''}
                    </div>
                  </Timeline.Item>
                );
              })}
            </Timeline>
          );
          
          return (
            <Popover content={content} title="Lịch sử thay đổi trạng thái" trigger="hover" placement="topLeft">
              <Button size="small" icon={<HistoryOutlined />} style={{ borderRadius: 4 }}>
                Xem ({logs.length})
              </Button>
            </Popover>
          );
        }
      },
      {
        title: 'Giới tính',
        dataIndex: 'gioitinh',
        key: 'gioitinh',
        width: 100,
        filters: [{ text: 'Nam', value: 'Nam' }, { text: 'Nữ', value: 'Nữ' }],
        onFilter: (value, record) => record.gioitinh === value,
      },
      {
        title: 'Ngày sinh',
        dataIndex: 'ngaysinh',
        key: 'ngaysinh',
        width: 130
      },
      {
        title: 'CCCD',
        dataIndex: 'cccd',
        key: 'cccd',
        width: 140,
        ...getColumnSearchProps('cccd', 'Số CCCD')
      },
      {
        title: 'Quê quán',
        dataIndex: 'quequan',
        key: 'quequan',
        width: 160,
        ...getColumnSearchProps('quequan', 'Quê quán')
      },
      {
        title: 'Số điện thoại',
        dataIndex: 'sdt',
        key: 'sdt',
        width: 130,
        ...getColumnSearchProps('sdt', 'Số điện thoại')
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
        width: 180,
        ...getColumnSearchProps('email', 'Email')
      },
      {
        title: 'Ghi chú',
        dataIndex: 'ghi_chu_ho_so',
        key: 'ghi_chu_ho_so',
        width: 200,
        ...getColumnSearchProps('ghi_chu_ho_so', 'Ghi chú')
      },
      {
        title: 'Hành động',
        key: 'actions',
        width: 80,
        fixed: 'right',
        align: 'center',
        render: (_, record) => (
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa dòng này không?"
            onConfirm={() => handleDeleteSpreadsheetRow(record)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        )
      }
    ];

    return rawCols.map(col => wrapEditableColumn(col));
  }, [spreadsheetData, editingCell, editValue]);

  const handleDownloadTemplate = () => {
    const templateData = [{
      "MSSV": "251123028135",
      "Họ tên": "Hoàng Thị Quỳnh Như",
      "Lớp": "48K07.2",
      "Khoa": "Khoa Ngân hàng",
      "Ngày sinh": "2004-05-15",
      "Giới tính": "Nữ",
      "CCCD": "048304001234",
      "Quê quán": "Quảng Nam",
      "Email": "quynhnhu@gmail.com",
      "SĐT": "0777565953",
      "Facebook": "facebook.com/quynhnhu",
      "Đảng viên hướng dẫn": "Lê Vĩnh Diện",
      "Ngày nhận hồ sơ": "2026-05-01",
      "Hạn nộp file mềm": "2026-05-10",
      "Hạn viết sổ": "2026-05-20",
      "Hạn hoàn thành giấy tờ": "2026-05-30",
      "Ngày nộp hồ sơ lên VPĐU": "2026-06-05",
      "Ngày nộp hồ sơ lên ĐHĐN": "2026-06-15",
      "Bước tiến trình (1-8)": 8,
      "Ngày kết nạp": "2026-06-25",
      "Số quyết định": "123-QĐ/ĐHĐN",
      "Ngày ký quyết định": "2026-06-24"
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_KetNap");
    XLSX.writeFile(wb, "HoSoKetNap_Template.xlsx");
    message.success("Đã tải xuống file mẫu thành công!");
  };

  const handleImportUpload = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      setIsImporting(true);
      try {
        const snapshot = await getDocs(collection(dbMain, "ho_so_ket_nap"));
        const existingData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const existingMssvMap = new Map();
        existingData.forEach(item => {
          if (item.mssv) existingMssvMap.set(item.mssv.toString().trim(), item);
        });

        const dataBytes = new Uint8Array(e.target.result);
        const workbook = XLSX.read(dataBytes, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const currentExcelMssv = new Set();

        const parseExcelDate = (val) => {
          if (!val) return null;
          if (val instanceof Date) {
            return dayjs(val).format('YYYY-MM-DD');
          }
          if (typeof val === 'number') {
            const date = new Date((val - 25569) * 86400 * 1000);
            const parsed = dayjs(date);
            return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
          }
          const str = String(val).trim();
          if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
              const day = parts[0].padStart(2, '0');
              const month = parts[1].padStart(2, '0');
              const year = parts[2];
              return `${year}-${month}-${day}`;
            }
          }
          if (str.includes('-')) {
            const parts = str.split('-');
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                return str;
              } else {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                return `${year}-${month}-${day}`;
              }
            }
          }
          const parsed = dayjs(str);
          return parsed.isValid() ? parsed.format('YYYY-MM-DD') : str;
        };

        const parsed = jsonData.map((row, index) => {
          const mssvVal = row["MSSV"]?.toString().trim();
          const hotenVal = row["Họ tên"] || row["Họ và tên"] || row["HỌ VÀ TÊN"] || "";
          const stepVal = Number(row["Bước tiến trình (1-8)"] || row["Bước"] || 1);

          const mappedRow = {
            key: index.toString(),
            mssv: mssvVal,
            hoten: hotenVal,
            lop: row["Lớp"] || row["LỚP"] || "",
            khoa: row["Khoa"] || row["KHOA"] || "",
            ngaysinh: parseExcelDate(row["Ngày sinh"] || row["NGÀY SINH"]),
            gioitinh: row["Giới tính"] || row["GIỚI TÍNH"] || "Nam",
            cccd: row["CCCD"]?.toString() || "",
            quequan: row["Quê quán"] || row["QUÊ QUÁN"] || "",
            email: row["Email"] || row["EMAIL"] || "",
            sdt: row["SĐT"]?.toString() || row["SĐt"]?.toString() || row["Số điện thoại"]?.toString() || row["SĐT"]?.toString() || "",
            link_fb: row["Facebook"] || row["Link Facebook"] || row["Link facebook"] || "",
            dangvienhuongdan: row["Đảng viên hướng dẫn"] || row["ĐVHD"] || "",
            ngaynhanhoso: parseExcelDate(row["Ngày nhận hồ sơ"] || row["Ngày nhận HS"] || row["NGÀY NHẬN HS"]),
            deadline_file_mem: parseExcelDate(row["Hạn nộp file mềm"]),
            deadline_viet_so: parseExcelDate(row["Hạn viết sổ"]),
            deadline_hoanthanhgiayto: parseExcelDate(row["Hạn hoàn thành giấy tờ"]),
            ngay_nop_vpdu: parseExcelDate(row["Ngày nộp hồ sơ lên VPĐU"] || row["Ngày nộp HS lên VPĐU"]),
            ngay_nop_dhdn: parseExcelDate(row["Ngày nộp hồ sơ lên ĐHĐN"] || row["Ngày nộp HS lên ĐHĐN"]),
            ngayvaodang: parseExcelDate(row["Ngày kết nạp"] || row["NGÀY KẾT NẠP"] || row["Ngày vào Đảng"] || row["NGÀY VÀO ĐẢNG"]),
            soqd: row["Số quyết định"] || row["SỐ QĐ"] || row["Số QĐ"] || row["Số QĐ kết nạp"] || "",
            ngaykiqd: parseExcelDate(row["Ngày ký quyết định"] || row["Ngày kí"] || row["NGÀY KÍ"] || row["NGÀY KÍ "] || row["Ngày ký QĐ"] || row["NGÀY KÝ"] || row["NGÀY KÝ QUYẾT ĐỊNH"]),
            trangthai: (row["Ngày kết nạp"] || row["NGÀY KẾT NẠP"] || row["Ngày vào Đảng"] || row["NGÀY VÀO ĐẢNG"] || row["Số quyết định"] || row["SỐ QĐ"] || row["Số QĐ"] || stepVal === 8) ? 8 : (stepVal >= 1 && stepVal <= 8 ? stepVal : 1),
            ghi_chu_ho_so: row["Ghi chú"] || row["Ghi chú hồ sơ"] || "",
            nguon_du_lieu: 'auto'
          };

          let errorMsg = "";
          let isUpdate = false;
          let docId = null;

          if (!mappedRow.hoten) {
            errorMsg = "Thiếu Họ tên";
          } else if (mappedRow.mssv) {
            if (currentExcelMssv.has(mappedRow.mssv)) {
              errorMsg = "Trùng MSSV trong chính file Excel";
            } else {
              const existingMssvRec = existingMssvMap.get(mappedRow.mssv);
              if (existingMssvRec) {
                isUpdate = true;
                docId = existingMssvRec.id;
              }
            }
          }

          if (mappedRow.mssv) currentExcelMssv.add(mappedRow.mssv);

          return {
            ...mappedRow,
            hasError: !!errorMsg,
            errorMsg: errorMsg,
            isUpdate: isUpdate,
            docId: docId
          };
        });

        setImportPreviewData(parsed);
        setImportSelectedKeys(parsed.filter(d => !d.hasError).map(d => d.key));
      } catch (err) {
        message.error("Lỗi khi đọc file Excel: " + err.message);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleConfirmImport = async () => {
    if (importSelectedKeys.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 dòng hợp lệ để import');
      return;
    }
    setIsImporting(true);
    let successCount = 0;
    
    try {
      const dataToImport = importPreviewData.filter(d => importSelectedKeys.includes(d.key));
      const promises = [];

      for (const row of dataToImport) {
        const cleanData = { ...row };
        delete cleanData.key;
        delete cleanData.hasError;
        delete cleanData.errorMsg;
        delete cleanData.isUpdate;
        delete cleanData.docId;
        
        Object.keys(cleanData).forEach(key => {
          if (cleanData[key] === undefined) {
            delete cleanData[key];
          }
        });
        
        if (row.isUpdate && row.docId) {
          cleanData.updated_at = new Date().toISOString();
          promises.push(updateDoc(doc(dbMain, "ho_so_ket_nap", row.docId), cleanData));
          if (cleanData.trangthai === 8) {
            promises.push(triggerStep8DV(cleanData));
          }
        } else {
          cleanData.created_at = new Date().toISOString();
          const addAndSync = async () => {
            const docRef = await addDoc(collection(dbMain, "ho_so_ket_nap"), cleanData);
            if (cleanData.trangthai === 8) {
              await triggerStep8DV({ ...cleanData, id: docRef.id });
            }
          };
          promises.push(addAndSync());
        }
        
        successCount++;
      }
      
      await Promise.all(promises);
      
      message.success(`Đã import thành công ${successCount} hồ sơ kết nạp.`);
      setImportFileList([]);
      setImportPreviewData([]);
      setIsImportModalVisible(false);
      fetchData();
    } catch (error) {
      console.error(error);
      message.error("Đã xảy ra lỗi khi import: " + error.message);
    } finally {
      setIsImporting(false);
    }
  };



  const fetchData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(dbMain, "ho_so_ket_nap"));
      const records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setData(records);
    } catch (error) {
      message.error("Lỗi khi tải danh sách hồ sơ kết nạp");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);



  // Filtered & Sorted Data
  const filteredData = useMemo(() => {
    const result = data.filter(item => {
      const matchSearch = item.mssv?.toLowerCase().includes(searchText.toLowerCase()) || 
                          item.hoten?.toLowerCase().includes(searchText.toLowerCase());
      const matchKhoa = filterKhoa ? item.khoa === filterKhoa : true;
      
      // Only show in-progress records (trangthai !== 8) in this list
      if (item.trangthai === 8) return false;

      let matchTrangThai = true;
      if (filterTrangThai) {
        matchTrangThai = item.trangthai === filterTrangThai;
      }

      if (filterIntake) {
        const lop = item.lop || "";
        const match = lop.match(/^(\d+K)/) || lop.match(/^(\d+)/);
        const intake = match ? match[0] : null;
        if (intake !== filterIntake) return false;
      }

      return matchSearch && matchKhoa && matchTrangThai;
    });

    result.sort((a, b) => (b.trangthai || 1) - (a.trangthai || 1));
    return result;
  }, [data, searchText, filterKhoa, filterTrangThai, filterIntake]);

  const uniqueKhoa = useMemo(() => {
    return [...new Set(data.map(d => d.khoa).filter(Boolean))].sort();
  }, [data]);

  const uniqueIntakes = useMemo(() => {
    const intakes = data.map(item => {
      const lop = item.lop || "";
      const match = lop.match(/^(\d+K)/) || lop.match(/^(\d+)/);
      return match ? match[0] : null;
    }).filter(Boolean);
    return [...new Set(intakes)].sort();
  }, [data]);

  const handleSearch = debounce((e) => {
    setSearchText(e.target.value);
  }, 300);

  const resetFilters = () => {
    setSearchText("");
    setFilterKhoa(null);
    setFilterTrangThai(null);
    setFilterIntake(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    if (dateString.toDate) return dayjs(dateString.toDate()).format('DD/MM/YYYY');
    if (dateString.seconds) return dayjs(dateString.seconds * 1000).format('DD/MM/YYYY');
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const [studentOptions, setStudentOptions] = useState([]);
  const [searching, setSearching] = useState(false);

  // Debounced prefix lookup matching MaSV or HoTen (remote dropdown fetch)
  const handleSearchStudents = useMemo(() => {
    return debounce(async (value) => {
      const searchVal = value ? value.trim() : "";
      if (!searchVal || searchVal.length < 2) {
        setStudentOptions([]);
        return;
      }
      setSearching(true);
      try {
        // 1. Query by MaSV prefix
        const qMaSV = query(
          collection(dbStudent, "students"), 
          where("MaSV", ">=", searchVal), 
          where("MaSV", "<=", searchVal + "\uf8ff")
        );
        const snapshotMaSV = await getDocs(qMaSV);
        let list = snapshotMaSV.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Query by HoTen prefix with Capitalized fallback
        const capitalizedSearch = searchVal.replace(/\b\w/g, c => c.toUpperCase());
        const qHoTen = query(
          collection(dbStudent, "students"),
          where("HoTen", ">=", capitalizedSearch),
          where("HoTen", "<=", capitalizedSearch + "\uf8ff")
        );
        const snapshotHoTen = await getDocs(qHoTen);
        const listHoTen = snapshotHoTen.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Merge and remove duplicates by MaSV
        const merged = [...list];
        listHoTen.forEach(item => {
          if (!merged.some(m => m.MaSV === item.MaSV)) {
            merged.push(item);
          }
        });

        // Limit results to top 15 for dropdown clarity
        setStudentOptions(merged.slice(0, 15));
      } catch (err) {
        console.error("Lỗi khi tìm kiếm sinh viên:", err);
        if (err.message && err.message.includes("Database '(default)' not found")) {
          message.error("Lỗi: Dự án Firebase 'qlycbsv' chưa được kích hoạt Firestore Database. Hãy vào Firebase Console và nhấn 'Create Database'!");
        } else {
          message.error("Lỗi khi tìm kiếm sinh viên: " + err.message);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleSelectStudent = (svData) => {
    message.success(`Đã lấy thông tin của sinh viên: ${svData.HoTen || svData.hoten}`);
    
    // Parse birth date formatted as "DD/MM/YYYY" or ISO
    let birthDate = null;
    const rawBirthDate = svData.NgaySinh || svData.ngay_sinh || svData.ngaysinh;
    if (rawBirthDate) {
      if (typeof rawBirthDate === 'string') {
        if (rawBirthDate.includes('/')) {
          birthDate = dayjs(rawBirthDate, 'DD/MM/YYYY');
        } else {
          birthDate = dayjs(rawBirthDate);
        }
      } else {
        birthDate = dayjs(rawBirthDate);
      }
    }

    form.setFieldsValue({
      mssv: svData.MaSV || svData.mssv || '',
      hoten: svData.HoTen || svData.ho_ten || svData.hoten || '',
      lop: svData.Lop || svData.lop || '',
      khoa: svData.Khoa || svData.khoa || '',
      ngaysinh: birthDate && birthDate.isValid() ? birthDate : null,
      gioitinh: svData.GioiTinh || svData.gioi_tinh || svData.gioitinh || 'Nam',
      quequan: svData.QueQuan || svData.que_quan || svData.quequan || '',
      email: svData.Email || svData.email || '',
      sdt: svData.SoDienThoai || svData.so_dien_thoai || svData.sdt || '',
      link_fb: svData.Facebook || svData.facebook || svData.link_fb || '',
      cccd: svData.SoCCCD || svData.cccd || '',
      ghi_chu_ho_so: svData.GhiChu || svData.ghi_chu_ho_so || '',
      nguon_du_lieu: 'auto'
    });

    setSourceType('auto');
    setIsEditable(false); // Readonly by default
    setIsDataLoaded(true);
    setStudentOptions([]);
  };

  const handleManualEntry = () => {
    message.info("Vui lòng nhập tay đầy đủ các trường thông tin bắt buộc!");
    form.resetFields();
    form.setFieldsValue({
      nguon_du_lieu: 'manual',
      trangthai: 1
    });
    setSourceType('manual');
    setIsEditable(true); // Fully editable
    setIsDataLoaded(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    setMssvInput("");
    setIsDataLoaded(true);
    setSourceType('manual');
    setIsEditable(true);
    setCurrentStep(1);
    setStatusHistory([]);
    form.resetFields();
    form.setFieldsValue({
      nguon_du_lieu: 'manual',
      trangthai: 1
    });
    setIsModalVisible(true);
  };

  const findDocByMssv = async (colName, mStr) => {
    if (!mStr) return null;
    const mNum = Number(mStr);
    try {
      // 1. lowercase "mssv" - string
      const q1 = query(collection(dbMain, colName), where("mssv", "==", mStr));
      const s1 = await getDocs(q1);
      if (!s1.empty) return s1.docs[0];

      // 2. uppercase "MSSV" - string
      const q2 = query(collection(dbMain, colName), where("MSSV", "==", mStr));
      const s2 = await getDocs(q2);
      if (!s2.empty) return s2.docs[0];

      if (!isNaN(mNum)) {
        // 3. lowercase "mssv" - number
        const q3 = query(collection(dbMain, colName), where("mssv", "==", mNum));
        const s3 = await getDocs(q3);
        if (!s3.empty) return s3.docs[0];

        // 4. uppercase "MSSV" - number
        const q4 = query(collection(dbMain, colName), where("MSSV", "==", mNum));
        const s4 = await getDocs(q4);
        if (!s4.empty) return s4.docs[0];
      }
    } catch (e) {
      console.error("Error in findDocByMssv:", e);
    }
    return null;
  };

  const triggerStep8DV = async (record) => {
    const mssvStr = String(record.mssv || '').trim();
    if (!mssvStr) return; // Only trigger if MSSV is provided
    try {
      // A. Check & update or insert in dang_vien collection
      const existingDvDoc = await findDocByMssv("dang_vien", mssvStr);
      let existingDocId = existingDvDoc ? existingDvDoc.id : null;
      let existingStatus = existingDvDoc ? existingDvDoc.data()?.trang_thai : null;

      // Determine the status to write
      // If they already exist and are not 'dang_sinh_hoat' (e.g. 'da_chuyen'), preserve that status
      const finalStatus = (existingStatus && existingStatus !== 'dang_sinh_hoat') ? existingStatus : 'dang_sinh_hoat';
      
      const dangVienData = {
        mssv: mssvStr,
        ho_ten: record.hoten,
        cccd: record.cccd || '',
        lop: record.lop || '',
        khoa: record.khoa || '',
        ngay_sinh: record.ngaysinh || null,
        gioi_tinh: record.gioitinh || 'Nam',
        que_quan: record.quequan || '',
        email: record.email || '',
        so_dien_thoai: record.sdt || '',
        facebook: record.link_fb || '',
        ngay_vao_dang: record.ngayvaodang || record.ngaynhanhoso || null,
        ngay_chinh_thuc: null,
        so_the_dang: record.soqd || '',
        dang_vien_du_bi: true,
        trang_thai: finalStatus,
        dvhd: record.dangvienhuongdan || '',
        nhom: "Phát triển Đảng",
        updated_at: new Date().toISOString()
      };

      if (existingDocId) {
        // Keep created_at if it exists
        if (existingDvDoc.data()?.created_at) {
          dangVienData.created_at = existingDvDoc.data().created_at;
        }
        await updateDoc(doc(dbMain, "dang_vien", existingDocId), dangVienData);
      } else {
        dangVienData.created_at = new Date().toISOString();
        await addDoc(collection(dbMain, "dang_vien"), dangVienData);
      }

      // B. Sync to dang_vien_dang_sinh_hoat collection ONLY if they are active (finalStatus === 'dang_sinh_hoat')
      if (finalStatus === 'dang_sinh_hoat') {
        const existingDshDoc = await findDocByMssv("dang_vien_dang_sinh_hoat", mssvStr);
        let existingDshDocId = existingDshDoc ? existingDshDoc.id : null;

        const dangVienDshData = {
          mssv: mssvStr,
          ho_ten: record.hoten,
          cccd: record.cccd || '',
          lop: record.lop || '',
          khoa: record.khoa || '',
          ngay_sinh: record.ngaysinh || null,
          gioi_tinh: record.gioitinh || 'Nam',
          que_quan: record.quequan || '',
          email: record.email || '',
          so_dien_thoai: record.sdt || '',
          facebook: record.link_fb || '',
          ngay_vao_dang: record.ngayvaodang || null,
          so_qd: record.soqd || '',
          ngay_ki_qd: record.ngaykiqd || null,
          dang_vien_huong_dan: record.dangvienhuongdan || '',
          updated_at: new Date().toISOString()
        };

        if (existingDshDocId) {
          await updateDoc(doc(dbMain, "dang_vien_dang_sinh_hoat", existingDshDocId), dangVienDshData);
        } else {
          dangVienDshData.created_at = new Date().toISOString();
          await addDoc(collection(dbMain, "dang_vien_dang_sinh_hoat"), dangVienDshData);
        }
      }
    } catch (e) {
      console.error("Lỗi trigger Step 8:", e);
    }
  };

  const handleCellChange = (recordId, field, value) => {
    setSpreadsheetData(prev => prev.map(row => {
      if (row.id === recordId) {
        return { ...row, [field]: value, isEdited: true };
      }
      return row;
    }));
  };

  const handleAddSpreadsheetRow = () => {
    const newId = `new_${Date.now()}`;
    const newRow = {
      id: newId,
      mssv: '',
      hoten: '',
      cccd: '',
      lop: '',
      khoa: '',
      gioitinh: 'Nam',
      ngaysinh: null,
      quequan: '',
      sdt: '',
      email: '',
      link_fb: '',
      trangthai: 1,
      dangvienhuongdan: '',
      ngaynhanhoso: null,
      deadline_file_mem: null,
      deadline_viet_so: null,
      deadline_hoanthanhgiayto: null,
      ngay_nop_vpdu: null,
      ngay_nop_dhdn: null,
      status_history: [],
      nguon_du_lieu: 'manual',
      isNew: true
    };
    setSpreadsheetData(prev => [newRow, ...prev]);
  };

  const handleDeleteSpreadsheetRow = (record) => {
    if (record.isNew) {
      setSpreadsheetData(prev => prev.filter(row => row.id !== record.id));
    } else {
      Modal.confirm({
        title: 'Xác nhận xóa hồ sơ?',
        content: `Bạn có chắc chắn muốn xóa hồ sơ của sinh viên ${record.hoten || 'chưa có tên'}?`,
        okText: 'Xóa',
        okType: 'danger',
        cancelText: 'Hủy',
        onOk: async () => {
          try {
            setLoading(true);
            await deleteDoc(doc(dbMain, "ho_so_ket_nap", record.id));
            setSpreadsheetData(prev => prev.filter(row => row.id !== record.id));
            message.success("Đã xóa hồ sơ thành công!");
            fetchData();
          } catch(e) {
            message.error("Lỗi khi xóa: " + e.message);
          } finally {
            setLoading(false);
          }
        }
      });
    }
  };

  const handleSaveSpreadsheet = async () => {
    setSavingSpreadsheet(true);
    let successCount = 0;
    try {
      const changedRows = spreadsheetData.filter(row => row.isNew || row.isEdited);
      if (changedRows.length === 0) {
        message.info("Không có thay đổi nào cần lưu!");
        setIsSpreadsheetModalVisible(false);
        return;
      }

      for (const row of changedRows) {
        if (!row.hoten || row.hoten.trim() === '') {
          message.error("Họ tên không được phép để trống!");
          setSavingSpreadsheet(false);
          return;
        }
      }

      for (const row of changedRows) {
        let updatedHistory = Array.isArray(row.status_history) ? [...row.status_history] : [];
        if (row.isNew) {
          updatedHistory = [{
            step: Number(row.trangthai || 1),
            timestamp: new Date().toISOString()
          }];
        } else {
          const originalRecord = data.find(d => d.id === row.id);
          const oldStep = originalRecord ? originalRecord.trangthai : null;
          const newStep = Number(row.trangthai || 1);
          if (oldStep !== newStep) {
            updatedHistory.push({
              step: newStep,
              timestamp: new Date().toISOString()
            });
          }
        }

        const formatted = {
          mssv: row.mssv || '',
          cccd: row.cccd || '',
          hoten: row.hoten,
          lop: row.lop || '',
          khoa: row.khoa || '',
          ngaysinh: row.ngaysinh || null,
          gioitinh: row.gioitinh || 'Nam',
          quequan: row.quequan || '',
          email: row.email || '',
          sdt: row.sdt || '',
          link_fb: row.link_fb || '',
          trangthai: Number(row.trangthai || 1),
          dangvienhuongdan: row.dangvienhuongdan || '',
          ngaynhanhoso: row.ngaynhanhoso || null,
          deadline_file_mem: row.deadline_file_mem || null,
          deadline_viet_so: row.deadline_viet_so || null,
          deadline_hoanthanhgiayto: row.deadline_hoanthanhgiayto || null,
          ngay_nop_vpdu: row.ngay_nop_vpdu || null,
          ngay_nop_dhdn: row.ngay_nop_dhdn || null,
          status_history: updatedHistory,
          nguon_du_lieu: row.nguon_du_lieu || 'manual',
          updated_at: new Date().toISOString()
        };

        if (row.isNew) {
          formatted.created_at = new Date().toISOString();
          const docRef = await addDoc(collection(dbMain, "ho_so_ket_nap"), formatted);
          if (formatted.trangthai === 8) {
            await triggerStep8DV({ ...formatted, id: docRef.id });
          }
        } else {
          await updateDoc(doc(dbMain, "ho_so_ket_nap", row.id), formatted);
          if (formatted.trangthai === 8) {
            await triggerStep8DV({ ...formatted, id: row.id });
          }
        }
        successCount++;
      }

      message.success(`✓ Đã lưu thành công ${successCount} thay đổi!`);
      setIsSpreadsheetModalVisible(false);
      fetchData();
    } catch (e) {
      message.error("Lỗi khi lưu bảng tính: " + e.message);
      console.error(e);
    } finally {
      setSavingSpreadsheet(false);
    }
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setMssvInput(record.mssv);
    setSourceType(record.nguon_du_lieu || 'manual');
    setIsEditable(record.nguon_du_lieu !== 'auto'); // Auto starts locked, manual is fully editable
    setCurrentStep(record.trangthai || 1);
    setIsDataLoaded(true);
    setStatusHistory(Array.isArray(record.status_history) ? record.status_history.filter(h => h && typeof h === 'object') : []);

    form.setFieldsValue({
      ...record,
      ngaysinh: record.ngaysinh ? dayjs(record.ngaysinh) : null,
      ngaynhanhoso: record.ngaynhanhoso ? dayjs(record.ngaynhanhoso) : null,
      deadline_file_mem: record.deadline_file_mem ? dayjs(record.deadline_file_mem) : null,
      deadline_viet_so: record.deadline_viet_so ? dayjs(record.deadline_viet_so) : null,
      deadline_hoanthanhgiayto: record.deadline_hoanthanhgiayto ? dayjs(record.deadline_hoanthanhgiayto) : null,
      ngay_nop_vpdu: record.ngay_nop_vpdu ? dayjs(record.ngay_nop_vpdu) : null,
      ngay_nop_dhdn: record.ngay_nop_dhdn ? dayjs(record.ngay_nop_dhdn) : null,
      ngayvaodang: record.ngayvaodang ? dayjs(record.ngayvaodang) : null,
      ngaykiqd: record.ngaykiqd ? dayjs(record.ngaykiqd) : null
    });

    setIsModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      // Step 8 strict validations
      if (values.trangthai === 8) {
        if (!values.ngayvaodang || !values.soqd || !values.ngaykiqd) {
          message.error("Khi trạng thái ở Bước 8 (Đã có quyết định kết nạp), bắt buộc nhập đầy đủ: Ngày vào Đảng, Số quyết định, Ngày kí quyết định!");
          return;
        }
      }

      // Check for state jumps warning (optional helper)
      if (editingId) {
        const originalRecord = data.find(d => d.id === editingId);
        if (originalRecord && Math.abs((values.trangthai || 1) - (originalRecord.trangthai || 1)) > 1) {
          message.warning("Lưu ý: Bạn đang thực hiện nhảy bước trong quy trình kết nạp!");
        }
      }

      let updatedHistory = [...statusHistory];
      if (editingId) {
        const originalRecord = data.find(d => d.id === editingId);
        const oldStep = originalRecord ? originalRecord.trangthai : null;
        const newStep = values.trangthai || 1;
        if (oldStep !== newStep) {
          updatedHistory.push({
            step: Number(newStep),
            timestamp: new Date().toISOString()
          });
        }
      } else {
        updatedHistory = [{
          step: Number(values.trangthai || 1),
          timestamp: new Date().toISOString()
        }];
      }

      const formatted = {
        mssv: values.mssv || '',
        cccd: values.cccd || '',
        hoten: values.hoten,
        lop: values.lop || '',
        khoa: values.khoa || '',
        ngaysinh: values.ngaysinh ? values.ngaysinh.format('YYYY-MM-DD') : null,
        gioitinh: values.gioitinh || 'Nam',
        quequan: values.quequan || '',
        email: values.email || '',
        link_fb: values.link_fb || '',
        sdt: values.sdt || '',
        nguon_du_lieu: sourceType || 'manual',
        dangvienhuongdan: values.dangvienhuongdan || '',
        ngaynhanhoso: values.ngaynhanhoso ? values.ngaynhanhoso.format('YYYY-MM-DD') : null,
        deadline_file_mem: values.deadline_file_mem ? values.deadline_file_mem.format('YYYY-MM-DD') : null,
        deadline_viet_so: values.deadline_viet_so ? values.deadline_viet_so.format('YYYY-MM-DD') : null,
        deadline_hoanthanhgiayto: values.deadline_hoanthanhgiayto ? values.deadline_hoanthanhgiayto.format('YYYY-MM-DD') : null,
        ngay_nop_vpdu: values.ngay_nop_vpdu ? values.ngay_nop_vpdu.format('YYYY-MM-DD') : null,
        ngay_nop_dhdn: values.ngay_nop_dhdn ? values.ngay_nop_dhdn.format('YYYY-MM-DD') : null,
        trangthai: values.trangthai || 1,
        status_history: updatedHistory,
        ngayvaodang: values.ngayvaodang ? values.ngayvaodang.format('YYYY-MM-DD') : null,
        soqd: values.soqd || '',
        ngaykiqd: values.ngaykiqd ? values.ngaykiqd.format('YYYY-MM-DD') : null,
        ghi_chu_ho_so: values.ghi_chu_ho_so || '',
        updated_at: new Date().toISOString()
      };

      // Validation: MSSV Unique in ho_so_ket_nap (checking both string/number and lower/upper case)
      const mssvStr = String(values.mssv || '').trim();
      let isDuplicateInKetNap = false;

      // Using component scope findDocByMssv for duplicate check

      // Check duplicate in ho_so_ket_nap (only if MSSV is provided)
      if (mssvStr) {
        const existingKetNapDoc = await findDocByMssv("ho_so_ket_nap", mssvStr);
        if (existingKetNapDoc && existingKetNapDoc.id !== editingId) {
          isDuplicateInKetNap = true;
        }
      }

      if (isDuplicateInKetNap) {
        message.error("MSSV này đã tồn tại trong danh sách Hồ sơ kết nạp!");
        setLoading(false);
        return;
      }

      if (editingId) {
        await updateDoc(doc(dbMain, "ho_so_ket_nap", editingId), formatted);
        message.success("Cập nhật hồ sơ kết nạp thành công");
      } else {
        formatted.created_at = new Date().toISOString();
        await addDoc(collection(dbMain, "ho_so_ket_nap"), formatted);
        message.success("Thêm mới hồ sơ kết nạp thành công");
      }

      // Special Trigger: If Step 8 (Đã có quyết định kết nạp) is active, automatically write/update active members collections
      if (values.trangthai === 8) {
        await triggerStep8DV(formatted);
        message.success("Đảng viên đã được tự động đồng bộ!");
      }

      setIsModalVisible(false);
      fetchData();
    } catch (error) {
      console.error(error);
      if (!error.errorFields) message.error("Lỗi khi lưu thông tin");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await deleteDoc(doc(dbMain, "ho_so_ket_nap", id));
      message.success("Xóa hồ sơ kết nạp thành công");
      fetchData();
    } catch (e) {
      message.error("Lỗi khi xóa hồ sơ");
      setLoading(false);
    }
  };

  const exportExcel = () => {
    const dataToExport = selectedRowKeys.length > 0 
      ? filteredData.filter(item => selectedRowKeys.includes(item.id))
      : filteredData;

    const ws = XLSX.utils.json_to_sheet(dataToExport.map(item => ({
      "MSSV": item.mssv,
      "Họ và tên": item.hoten || item.ho_ten,
      "Lớp": item.lop,
      "Khoa": item.khoa,
      "Ngày sinh": formatDate(item.ngaysinh || item.ngay_sinh),
      "Giới tính": item.gioitinh || item.gioi_tinh,
      "Quê quán": item.quequan || item.que_quan || [item.chi_tiet_qq_cu, item.xa_phuong_qq || item.xa_phuong_qq_cu, item.tinh_tp_qq || item.tinh_tp_qq_cu].filter(Boolean).join(', '),
      "CCCD": item.cccd,
      "SĐT": item.sdt || item.so_dien_thoai,
      "Email": item.email || item.email_sv,
      "Facebook": item.link_fb || item.facebook,
      "Nguồn dữ liệu": item.nguon_du_lieu === 'auto' ? 'Tự động' : 'Nhập tay',
      "Đảng viên hướng dẫn": item.dangvienhuongdan,
      "Ngày nhận hồ sơ": formatDate(item.ngaynhanhoso || item.ngay_nhan_ho_so),
      "Hạn nộp file mềm": formatDate(item.deadline_file_mem),
      "Hạn viết sổ": formatDate(item.deadline_viet_so),
      "Hạn hoàn thành giấy tờ khác": formatDate(item.deadline_hoanthanhgiayto),
      "Ngày nộp HS lên VPĐU": formatDate(item.ngay_nop_vpdu || item.ngay_nop_ho_so_vpdu),
      "Ngày nộp HS lên ĐHĐN": formatDate(item.ngay_nop_dhdn || item.ngay_nop_ho_so_dhdn),
      "Trạng thái quy trình (Bước)": item.trangthai || item.ho_so_status || 1,
      "Ghi chú": item.ghi_chu_ho_so || '',
      "Ngày vào Đảng": formatDate(item.ngayvaodang || item.ngay_vao_dang),
      "Số quyết định": item.soqd || item.so_qd,
      "Ngày ký quyết định": formatDate(item.ngaykiqd || item.ngay_ky_qd)
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HoSoKetNap");
    XLSX.writeFile(wb, "DanhSachHoSoKetNapDang.xlsx");
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  const columns = [
    { 
      title: 'STT', 
      key: 'stt',
      width: 60,
      render: (_, __, index) => index + 1
    },
    { 
      title: 'Họ tên & MSSV', 
      key: 'hoten_mssv',
      sorter: (a, b) => (a.hoten || '').localeCompare(b.hoten || ''),
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text style={{ color: '#1890ff', fontWeight: 600, fontSize: '14px' }}>
            {record.hoten || '--'}
          </Text>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            {record.mssv || '--'}
          </Text>
        </div>
      )
    },
    { 
      title: 'Lớp & Khoa', 
      key: 'lop_khoa',
      sorter: (a, b) => (a.lop || '').localeCompare(b.lop || ''),
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text style={{ fontWeight: 500, color: '#262626', fontSize: '14px' }}>
            {record.lop || '--'}
          </Text>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            {record.khoa || '--'}
          </Text>
        </div>
      )
    },
    { 
      title: 'Tiến trình', 
      dataIndex: 'trangthai', 
      key: 'trangthai',
      sorter: (a, b) => (a.trangthai || 1) - (b.trangthai || 1),
      render: (step) => {
        const stepInfo = ADMISSION_STEPS.find(s => s.step === step) || ADMISSION_STEPS[0];
        return (
          <Tooltip title={stepInfo.desc}>
            <Tag color={step === 8 ? 'success' : 'processing'} style={{ borderRadius: '4px', fontWeight: 500 }}>
              Bước {step}/8: {stepInfo.title}
            </Tag>
          </Tooltip>
        );
      }
    },
    { 
      title: 'Ngày nhận', 
      dataIndex: 'ngaynhanhoso', 
      key: 'ngaynhanhoso',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '--'
    },
    {
      title: 'Ghi chú',
      dataIndex: 'ghi_chu_ho_so',
      key: 'ghi_chu_ho_so',
      render: (text) => text ? <span style={{ fontSize: '12px' }}>{text}</span> : '--'
    }
  ];

  return (
    <div style={{ padding: '4px' }}>
      
      {/* Row 1: Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
          <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
            Quản lý hồ sơ kết nạp Đảng
          </Title>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`Xóa vĩnh viễn ${selectedRowKeys.length} hồ sơ đã chọn?`}
              onConfirm={async () => {
                try {
                  setLoading(true);
                  await Promise.all(selectedRowKeys.map(id => deleteDoc(doc(dbMain, "ho_so_ket_nap", id))));
                  message.success(`Đã xóa ${selectedRowKeys.length} hồ sơ thành công`);
                  setSelectedRowKeys([]);
                  fetchData();
                } catch(e) {
                  message.error("Lỗi khi xóa hàng loạt");
                  setLoading(false);
                }
              }}
            >
              <Button danger type="primary" icon={<DeleteOutlined />}>
                Xóa ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}

          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={{ backgroundColor: '#c62828', borderRadius: '6px', fontWeight: 500 }}>
            Thêm hồ sơ mới
          </Button>

          <Button 
            type="dashed"
            icon={<TableOutlined style={{ color: '#52c41a' }} />} 
            onClick={() => {
              setSpreadsheetData([...data].filter(item => item.trangthai !== 8).sort((a, b) => (b.trangthai || 1) - (a.trangthai || 1)));
              setIsSpreadsheetModalVisible(true);
            }} 
            style={{ borderRadius: '6px', fontWeight: 500, borderColor: '#52c41a' }}
          >
            Xem toàn bộ thông tin
          </Button>

          <Button 
            icon={<UploadOutlined />} 
            onClick={() => setIsImportModalVisible(true)} 
            style={{ borderRadius: '6px', fontWeight: 500, color: '#555555' }}
          >
            Nhập từ Excel
          </Button>

          <Button icon={<DownloadOutlined />} onClick={exportExcel} style={{ borderRadius: '6px', fontWeight: 500 }}>
            Xuất Excel
          </Button>


        </div>
      </div>

      {/* Row 2: Fluid Filters ribbon */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: 16, 
        background: '#fafafa', 
        padding: '10px 16px', 
        borderRadius: '8px', 
        border: '1px solid #f0f0f0',
        flexWrap: 'wrap',
        width: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8c8c8c', fontSize: '13px', marginRight: '4px', fontWeight: 500, flexShrink: 0 }}>
          <FilterOutlined style={{ color: '#c62828' }} /> <span>Bộ lọc:</span>
        </div>
        
        <div style={{ flex: 1.5, minWidth: '200px' }}>
          <Input 
            placeholder="Tìm kiếm mã số, họ tên..." 
            onChange={handleSearch}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            style={{ width: '100%', borderRadius: '6px' }} 
            allowClear
          />
        </div>
        
        <div style={{ flex: 1, minWidth: '120px' }}>
          <Select 
            placeholder="Chọn Khóa" 
            style={{ width: '100%' }} 
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
            showSearch
            placeholder="Chọn Khoa" 
            style={{ width: '100%' }} 
            allowClear 
            value={filterKhoa} 
            onChange={setFilterKhoa}
            optionFilterProp="children"
            filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            {KHOA_LIST.map(k => <Option key={k} value={k}>{k}</Option>)}
          </Select>
        </div>
        
        <div style={{ flex: 1, minWidth: '180px' }}>
          <Select 
            placeholder="Chọn trạng thái quy trình" 
            style={{ width: '100%' }} 
            allowClear 
            value={filterTrangThai} 
            onChange={setFilterTrangThai}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            {ADMISSION_STEPS.filter(s => s.step !== 8).map(s => (
              <Option key={s.step} value={s.step}>Bước {s.step}: {s.title}</Option>
            ))}
          </Select>
        </div>

        {(filterKhoa || filterTrangThai || searchText || filterIntake) && (
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

      {/* Main Table */}
      <Table 
        rowSelection={rowSelection}
        columns={columns} 
        dataSource={filteredData} 
        loading={loading}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => handleEdit(record),
          style: { cursor: 'pointer' }
        })}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20', '50', '1000'],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} hồ sơ kết nạp`
        }}
      />

      {/* Admission Record Modal (Form) */}
      <Drawer
        title={
          <span style={{ color: '#c62828', fontWeight: 'bold', fontSize: '18px' }}>
            {editingId ? "Cập nhật Hồ sơ kết nạp Đảng" : "Thêm mới Hồ sơ kết nạp Đảng"}
          </span>
        }
        open={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        width={1000}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
            <div>
              {editingId && (
                <Popconfirm title="Xóa vĩnh viễn hồ sơ này?" onConfirm={() => {
                  handleDelete(editingId);
                  setIsModalVisible(false);
                }} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                  <Button danger icon={<DeleteOutlined />}>Xóa hồ sơ</Button>
                </Popconfirm>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button onClick={() => setIsModalVisible(false)}>Hủy</Button>
              <Button type="primary" onClick={handleSave} style={{ backgroundColor: '#c62828', borderColor: '#c62828' }} loading={loading}>Lưu</Button>
            </div>
          </div>
        }
      >
        <Form form={form} layout="vertical" onValuesChange={(changed) => {
          if (changed.trangthai) {
            setCurrentStep(changed.trangthai);
          }
        }}>
          
          {/* Step 1: Sleek compact Search & Auto-Fill at top (for new entries) */}
          {!editingId && (
            <Card style={{ marginBottom: 16, backgroundColor: '#fdfdfd', border: '1px dashed #d9d9d9', borderRadius: '8px' }} size="small">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 600, color: '#c62828', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <SearchOutlined /> Tra cứu sinh viên hệ thống để tự điền:
                </span>
                <Select
                  showSearch
                  placeholder="Nhập MSSV hoặc Họ tên để tự động điền..."
                  defaultActiveFirstOption={false}
                  showArrow={true}
                  filterOption={false}
                  onSearch={handleSearchStudents}
                  onChange={(id) => {
                    const sv = studentOptions.find(o => o.id === id);
                    if (sv) handleSelectStudent(sv);
                  }}
                  notFoundContent={searching ? 'Đang tìm...' : 'Không tìm thấy dữ liệu'}
                  style={{ flex: 1 }}
                  loading={searching}
                  allowClear
                  onClear={() => {
                    form.resetFields();
                    setSourceType('manual');
                    setIsEditable(true);
                  }}
                >
                  {studentOptions.map(sv => (
                    <Option key={sv.id} value={sv.id}>
                      <strong>{sv.MaSV || sv.mssv}</strong> - {sv.HoTen || sv.hoten} ({sv.Lop})
                    </Option>
                  ))}
                </Select>
              </div>
            </Card>
          )}

          {/* Source type banner (only shown when editing or sourceType is auto) */}
          {(editingId || sourceType === 'auto') && (
            <div style={{ marginBottom: 16 }}>
              {sourceType === 'auto' ? (
                <Alert
                  message={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        <Badge status="success" style={{ marginRight: 8 }} />
                        <strong>Dữ liệu tự động (AUTO):</strong> Hồ sơ được lấy từ danh mục sinh viên hệ thống. Các trường lý lịch đang khóa.
                      </span>
                      <Space>
                        {!isEditable && (
                          <Button 
                            type="dashed" 
                            icon={<UnlockOutlined />} 
                            size="small" 
                            onClick={() => {
                              setIsEditable(true);
                              message.info("Đã cho phép chỉnh sửa thủ công các trường thông tin!");
                            }}
                            style={{ color: '#d46b08', borderColor: '#d46b08' }}
                          >
                            Cho phép chỉnh sửa
                          </Button>
                        )}
                      </Space>
                    </div>
                  }
                  type="success"
                  showIcon
                />
              ) : (
                <Alert
                  message={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        <Badge status="warning" style={{ marginRight: 8 }} />
                        <strong>Nhập thủ công (MANUAL):</strong> Không tìm thấy sinh viên trong hệ thống. Nhập tay thông tin.
                      </span>
                    </div>
                  }
                  type="warning"
                  showIcon
                />
              )}
            </div>
          )}

          {/* Admission Timeline Progress */}
          <div style={{ marginBottom: 24, padding: '16px 12px', background: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
            <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 12, fontWeight: 500 }}>
              TIẾN TRÌNH KẾT NẠP ĐẢNG VIÊN (8 BƯỚC):
            </div>
            <Steps current={currentStep - 1} size="small" labelPlacement="vertical">
              {ADMISSION_STEPS.map(s => (
                <Step key={s.step} title={s.title} description={<span style={{ fontSize: '10px' }}>Bước {s.step}</span>} />
              ))}
            </Steps>
          </div>

          <Row gutter={16}>
            {/* CARD 1: THÔNG TIN SINH VIÊN */}
            <Col span={24}>
              <Card title="Thông tin Sinh viên" size="small" style={{ marginBottom: 16, borderRadius: '8px' }}>
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item name="mssv" label="MSSV">
                      <Input disabled={editingId ? (sourceType === 'auto' ? !isEditable : false) : !isEditable} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="hoten" label="Họ và tên" rules={[{ required: true }]}>
                      <Input disabled={!isEditable} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="cccd" label="CCCD">
                      <Input disabled={!isEditable} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item name="lop" label="Lớp">
                      <Input disabled={!isEditable} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="khoa" label="Khoa">
                      <Select disabled={!isEditable} showSearch optionFilterProp="children">
                        {KHOA_LIST.map(k => (
                          <Option key={k} value={k}>{k}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="gioitinh" label="Giới tính">
                      <Select disabled={!isEditable}>
                        <Option value="Nam">Nam</Option>
                        <Option value="Nữ">Nữ</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="ngaysinh" label="Ngày sinh">
                      <DatePicker 
                        disabled={!isEditable} 
                        format={['DD/MM/YYYY', 'DDMMYYYY']} 
                        placeholder="DD/MM/YYYY" 
                        style={{ width: '100%' }} 
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="quequan" label="Quê quán (Tỉnh/TP)">
                      <Select 
                        showSearch 
                        disabled={!isEditable} 
                        placeholder="Chọn Tỉnh/TP Quê quán"
                        optionFilterProp="children"
                        dropdownStyle={{ borderRadius: '6px' }}
                      >
                        {PROVINCES.map(p => <Option key={p} value={p}>{p}</Option>)}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item name="sdt" label="Số điện thoại">
                      <Input disabled={!isEditable} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
                      <Input disabled={!isEditable} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="link_fb" label="Facebook Link">
                      <Input disabled={!isEditable} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* CARD 2: TIẾN ĐỘ & ĐẢNG VIÊN HƯỚNG DẪN */}
            <Col span={24}>
              <Card title="Quy trình & Tiến độ hồ sơ" size="small" style={{ marginBottom: 16, borderRadius: '8px' }}>
                <Form.Item name="trangthai" label="Trạng thái hiện tại" rules={[{ required: true }]} initialValue={1}>
                  <Select placeholder="Chọn trạng thái">
                    {ADMISSION_STEPS.map(s => (
                      <Option key={s.step} value={s.step}>Bước {s.step}: {s.title}</Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="dangvienhuongdan" label="Đảng viên hướng dẫn">
                  <Input placeholder="Tên Đảng viên hướng dẫn" />
                </Form.Item>

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="ngaynhanhoso" label="Ngày nhận hồ sơ">
                      <DatePicker format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="deadline_file_mem" label="Hạn nộp file mềm">
                      <DatePicker format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="deadline_viet_so" label="Hạn viết sổ">
                      <DatePicker format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="deadline_hoanthanhgiayto" label="Hạn hoàn thành các giấy tờ khác">
                      <DatePicker format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="ngay_nop_vpdu" label="Ngày nộp HS lên VPĐU">
                      <DatePicker format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="ngay_nop_dhdn" label="Ngày nộp HS lên ĐHĐN">
                      <DatePicker format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item name="ghi_chu_ho_so" label="Ghi chú hồ sơ">
                  <Input.TextArea rows={2} placeholder="Nhập ghi chú cho hồ sơ kết nạp này..." />
                </Form.Item>
              </Card>

              {/* Status History Timeline Card */}
              {editingId && (
                <Card title="Lịch sử thay đổi trạng thái" size="small" style={{ marginTop: 16, borderRadius: '8px' }}>
                  {statusHistory.length > 0 ? (
                    <Timeline mode="left" size="small" style={{ marginTop: 12 }}>
                      {statusHistory.map((h, idx) => {
                        const stepInfo = ADMISSION_STEPS.find(s => s.step === Number(h.step)) || ADMISSION_STEPS[0];
                        return (
                          <Timeline.Item key={idx} color={h.step === 8 ? 'green' : 'blue'}>
                            <div>
                              <strong>Bước {h.step}: {stepInfo.title}</strong>
                            </div>
                            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                              {h.timestamp ? dayjs(h.timestamp).format('DD/MM/YYYY HH:mm') : ''}
                            </div>
                          </Timeline.Item>
                        );
                      })}
                    </Timeline>
                  ) : (
                    <Text type="secondary">Chưa có lịch sử thay đổi trạng thái.</Text>
                  )}
                </Card>
              )}
            </Col>
          </Row>

          {/* CARD 3: QUYẾT ĐỊNH KẾT NẠP (ONLY ENFORCED ON STEP 8) */}
          {currentStep === 8 && (
            <Card 
              title={
                <span style={{ color: '#c62828', fontWeight: 'bold' }}>
                  <InfoCircleOutlined style={{ marginRight: 8 }} />
                  Thông tin quyết định kết nạp (Bắt buộc ở Bước 8)
                </span>
              }
              size="small"
              style={{ border: '1px solid #ffa39e', backgroundColor: '#fff2f0', borderRadius: '8px' }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item 
                    name="ngayvaodang" 
                    label="Ngày vào Đảng" 
                    rules={[{ required: true, message: 'Bắt buộc nhập ngày vào Đảng!' }]}
                  >
                    <DatePicker format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item 
                    name="soqd" 
                    label="Số quyết định kết nạp" 
                    rules={[{ required: true, message: 'Bắt buộc nhập Số quyết định!' }]}
                  >
                    <Input placeholder="Nhập Số Quyết định" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item 
                    name="ngaykiqd" 
                    label="Ngày ký quyết định" 
                    rules={[{ required: true, message: 'Bắt buộc nhập Ngày kí quyết định!' }]}
                  >
                    <DatePicker format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          )}

        </Form>
      </Drawer>



      {/* Import Excel Modal */}
      <Modal
        title={
          <span style={{ color: '#c62828', fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadOutlined />
            Nhập dữ liệu hồ sơ từ Excel
          </span>
        }
        open={isImportModalVisible}
        onCancel={() => {
          setImportFileList([]);
          setImportPreviewData([]);
          setIsImportModalVisible(false);
        }}
        width={950}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setImportFileList([]);
              setImportPreviewData([]);
              setIsImportModalVisible(false);
            }}
          >
            Hủy
          </Button>,
          <Button 
            key="import" 
            type="primary" 
            loading={isImporting} 
            onClick={handleConfirmImport} 
            style={{ backgroundColor: '#c62828', borderColor: '#c62828' }}
          >
            Import Data
          </Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%', marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Upload
              beforeUpload={handleImportUpload}
              fileList={importFileList}
              onChange={({ fileList }) => setImportFileList(fileList)}
              maxCount={1}
              accept=".xlsx,.xls"
            >
              <Button icon={<UploadOutlined />}>Chọn file Excel</Button>
            </Upload>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              Tải file mẫu (Template)
            </Button>
          </div>
          
          {importPreviewData.length > 0 && (
            <>
              <Alert 
                message={`Tìm thấy ${importPreviewData.length} dòng. Vui lòng kiểm tra dữ liệu trước khi import.`} 
                type="info" 
                showIcon 
              />
              <Table
                rowSelection={{
                  selectedRowKeys: importSelectedKeys,
                  onChange: setImportSelectedKeys,
                  getCheckboxProps: (record) => ({
                    disabled: record.hasError,
                  }),
                }}
                columns={[
                  { title: 'MSSV', dataIndex: 'mssv', key: 'mssv' },
                  { title: 'Họ tên', dataIndex: 'hoten', key: 'hoten' },
                  { title: 'Lớp', dataIndex: 'lop', key: 'lop' },
                  { title: 'Khoa', dataIndex: 'khoa', key: 'khoa' },
                  { 
                    title: 'Trạng thái', 
                    key: 'status',
                    render: (_, record) => {
                      if (record.hasError) return <span style={{color: 'red', fontWeight: 500}}>{record.errorMsg}</span>;
                      if (record.isUpdate) return <span style={{color: '#d46b08', fontWeight: 500}}>Cập nhật thông tin</span>;
                      return <span style={{color: 'green', fontWeight: 500}}>Thêm mới</span>;
                    }
                  }
                ]}
                dataSource={importPreviewData}
                pagination={{ pageSize: 5 }}
                size="small"
              />
            </>
          )}
        </Space>
      </Modal>

      {/* Spreadsheet (Excel Grid) Mode Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
              <span style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a1a' }}>
                Bảng Tổng Hợp Chi Tiết Toàn Bộ Hồ Sơ Kết Nạp ({spreadsheetData.length} đồng chí)
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
        open={isSpreadsheetModalVisible}
        onCancel={() => {
          if (spreadsheetData.some(row => row.isNew || row.isEdited)) {
            Modal.confirm({
              title: 'Hủy bỏ các thay đổi?',
              content: 'Các chỉnh sửa chưa lưu sẽ bị mất. Bạn có chắc chắn muốn thoát?',
              okText: 'Thoát',
              cancelText: 'Hủy',
              onOk: () => {
                setIsSpreadsheetModalVisible(false);
                setIsTableFullscreen(false);
                setSheetSearchText("");
                setSheetFilterKhoa(null);
                setSheetFilterTrangThai(null);
              }
            });
          } else {
            setIsSpreadsheetModalVisible(false);
            setIsTableFullscreen(false);
            setSheetSearchText("");
            setSheetFilterKhoa(null);
            setSheetFilterTrangThai(null);
          }
        }}
        width={isTableFullscreen ? "100vw" : "95%"}
        style={isTableFullscreen ? { top: 0, margin: 0, padding: 0, maxWidth: '100vw' } : { top: 20 }}
        bodyStyle={isTableFullscreen ? { padding: '12px 24px', height: 'calc(100vh - 60px)', overflow: 'hidden' } : { padding: '12px 24px', overflow: 'hidden' }}
        footer={null}
        destroyOnClose
      >
        {/* Excel Grid Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: 'normal' }}>
            💡 Nhấp đúp chuột (Double click) vào ô để sửa trực tiếp. Dữ liệu sẽ lưu tạm cho tới khi bấm lưu thay đổi.
          </span>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAddSpreadsheetRow} 
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', borderRadius: '4px' }}
              size="small"
            >
              Thêm dòng mới
            </Button>
            <Button 
              type="primary" 
              icon={<SendOutlined />} 
              loading={savingSpreadsheet} 
              onClick={handleSaveSpreadsheet} 
              style={{ backgroundColor: '#c62828', borderColor: '#c62828', fontWeight: 'bold', borderRadius: '4px' }}
              size="small"
            >
              Lưu tất cả thay đổi
            </Button>
          </Space>
        </div>
        <Table
          columns={spreadsheetColumns}
          dataSource={filteredSheetData}
          rowKey="id"
          scroll={{ x: 3200, y: isTableFullscreen ? 'calc(100vh - 195px)' : 'calc(80vh - 175px)' }}
          pagination={{ pageSize: 100, size: 'small' }}
          size="small"
          bordered
          style={{ borderRadius: 8, overflow: 'hidden' }}
        />
      </Modal>
    </div>
  );
};

export default HoSoKetNap;
