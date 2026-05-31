import { useState, useEffect, useMemo } from 'react';
import {
  Card, Row, Col, Typography, Tag, Form,
  Input, Button, message, Spin, Space, Radio, Select, Table, Modal, Badge,
  Divider, Empty, Tooltip, Alert, Tabs, Descriptions
} from 'antd';
import {
  FormOutlined, SearchOutlined, IdcardOutlined,
  HomeOutlined,
  FileWordOutlined, CheckCircleOutlined,
  ClockCircleOutlined, SendOutlined, ReloadOutlined,
  EnvironmentOutlined, DownloadOutlined, EyeOutlined,
  InboxOutlined, FileDoneOutlined, BellOutlined,
  MailOutlined, AppstoreOutlined, UnorderedListOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../services/permissionService';
import addressData from '../data/addressData.json';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table as DocxTable, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import DetailModal from '../components/DetailModal';

const { Title, Text } = Typography;
const { Option } = Select;

// Danh sách Tỉnh / Thành phố
const PROVINCES = Object.keys(addressData || {}).sort((a, b) => a.localeCompare(b, 'vi'));

// Trạng thái config - dùng Ant Design icons thay vì emoji
const TRANG_THAI_CONFIG = {
  da_nhan: { label: 'Đã nhận', color: '#faad14', bgColor: '#fffbe6', borderColor: '#ffe58f', Icon: InboxOutlined },
  da_lam: { label: 'Đã làm', color: '#1890ff', bgColor: '#e6f7ff', borderColor: '#91d5ff', Icon: FileDoneOutlined },
  cho_den_nhan: { label: 'Chờ đến nhận', color: '#52c41a', bgColor: '#f6ffed', borderColor: '#b7eb8f', Icon: BellOutlined },
  hoan_thanh: { label: 'Hoàn thành', color: '#722ed1', bgColor: '#f9f0ff', borderColor: '#d3adf7', Icon: CheckCircleOutlined }
};

// Roles có quyền quản lý (admin view)
const ADMIN_ROLES = [ROLES.ADMIN, ROLES.BITHU, ROLES.CAPUY, ROLES.KIEMTRA, ROLES.OFFICIAL_MANAGER, ROLES.PHOBIHU];

// ================================================================
// WORD DOCUMENT BUILDER - Theo đúng mẫu giấy giới thiệu 213 chuẩn A4
// docx v8: TabStopType không còn là enum, dùng string 'left' trực tiếp
// ================================================================



// Tạo dòng thông tin: "[label]                    : [value]"
// Dùng bảng 4 cột không viền để đảm bảo canh thẳng hàng tuyệt đối và không bị wrap chữ nhãn
const makeInfoParagraph = (label, value) => new Paragraph({
  spacing: { before: 120, line: 312, lineRule: 'auto' },
  indent: { firstLine: 720 },
  alignment: AlignmentType.JUSTIFY,
  tabStops: [
    { type: 'left', position: 3800 },
    { type: 'left', position: 4000 }
  ],
  children: [
    new TextRun({ text: label, size: 28, font: 'Times New Roman' }),
    new TextRun({ text: '\t', size: 28, font: 'Times New Roman' }),
    new TextRun({ text: ':', size: 28, font: 'Times New Roman' }),
    new TextRun({ text: '\t', size: 28, font: 'Times New Roman' }),
    new TextRun({ text: value || '', bold: label.includes('đồng chí'), size: 28, font: 'Times New Roman' })
  ]
});

const buildGiayGioiThieu = (reg, member, custom = {}) => {
  const soNhaVaTenDuong = [reg.so_nha, reg.ten_duong].filter(Boolean).join(' ');
  const fullAddress = [soNhaVaTenDuong, reg.phuong, reg.thanh_pho || 'Đà Nẵng'].filter(Boolean).join(', ');
  const diaChiCuTru = fullAddress ? `${fullAddress} về sinh hoạt nơi cư trú.` : '...';

  const c = {
    line1: 'ĐẢNG BỘ ỦY BAN NHÂN DÂN TPĐN',
    line2: 'ĐẢNG ỦY ĐẠI HỌC ĐÀ NẴNG',
    soGgt: 'Số          -GGT/ĐU',
    ngay: reg.created_at ? dayjs(reg.created_at).format('DD') : '.....',
    thang: reg.created_at ? dayjs(reg.created_at).format('MM') : '.....',
    nam: reg.created_at ? dayjs(reg.created_at).format('YYYY') : '2026',
    kinhGuiPhuong: `Đảng ủy phường ${reg.phuong || '...'}, ${reg.thanh_pho || 'Đà Nẵng'},`,
    kinhGuiChiBo: `Chi bộ ${reg.chi_bo_noi_cu_tru || '...'}.`,
    thucHienQuyDinh: 'Thực hiện Quy định số 213-QĐ/TW, ngày 02 tháng 01 năm 2020 của Bộ Chính trị về trách nhiệm của đảng viên đang công tác thường xuyên giữ mối liên hệ với tổ chức đảng và nhân dân nơi cư trú.',
    dangBoGioiThieu: 'ĐẢNG ỦY ĐẠI HỌC ĐÀ NẴNG',
    sinhHoatTaiChiBo: 'Sinh viên, Đảng ủy bộ phận Trường Đại học Kinh tế, Đảng bộ Đại học Đà Nẵng.',
    tenBiThu: reg.ten_bi_thu || member.ten_bi_thu || 'Phan Minh Đức',
    ...custom
  };

  return [
    // ── Header 2 cột ──
    new DocxTable({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4400, type: WidthType.DXA },
              margins: {
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
              },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
                  new TextRun({ text: c.line1, size: 28, font: 'Times New Roman' }),
                ]}),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
                  new TextRun({ text: c.line2, bold: true, size: 28, font: 'Times New Roman' }),
                ]}),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40, after: 80 },
                  children: [new TextRun({ text: '*', size: 28, font: 'Times New Roman' })]
                }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 0 }, children: [
                  new TextRun({ text: c.soGgt, size: 28, font: 'Times New Roman' }),
                ]}),
              ]
            }),
            new TableCell({
              width: { size: 5000, type: WidthType.DXA },
              margins: {
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 80 },
                  children: [
                    new TextRun({ text: 'ĐẢNG CỘNG SẢN VIỆT NAM', bold: true, size: 30, font: 'Times New Roman', underline: { type: 'single' } }),
                  ]
                }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 0 }, children: [
                  new TextRun({ text: `Đà Nẵng, ngày ${c.ngay} tháng ${c.thang} năm ${c.nam}`, italics: true, size: 28, font: 'Times New Roman' }),
                ]}),
              ]
            }),
          ]
        })
      ]
    }),

    new Paragraph({ spacing: { before: 160, after: 0 }, children: [] }),

    // ── TIÊU ĐỀ ──
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 }, children: [
      new TextRun({ text: 'GIẤY GIỚI THIỆU', bold: true, size: 32, font: 'Times New Roman' }),
    ]}),

    // ── Kính gửi (Bảng 2 cột không viền) ──
    new DocxTable({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 2694, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { line: 288, before: 0, after: 0 },
                  children: [new TextRun({ text: 'Kính gửi: ', italics: true, size: 28, font: 'Times New Roman' })]
                })
              ]
            }),
            new TableCell({
              width: { size: 7247, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  spacing: { line: 336, before: 0, after: 60 },
                  children: [new TextRun({ text: `- ${c.kinhGuiPhuong}`, size: 28, font: 'Times New Roman' })]
                }),
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  spacing: { line: 336, before: 0, after: 160 },
                  children: [new TextRun({ text: `- ${c.kinhGuiChiBo}`, size: 28, font: 'Times New Roman' })]
                })
              ]
            })
          ]
        })
      ]
    }),

    // ── Căn cứ ──
    new Paragraph({
      indent: { firstLine: 720 },
      spacing: { after: 160, line: 312 },
      alignment: AlignmentType.JUSTIFY,
      children: [
        new TextRun({ text: c.thucHienQuyDinh, size: 28, font: 'Times New Roman' })
      ]
    }),

    // ── Tên đảng ủy ──
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [
      new TextRun({ text: c.dangBoGioiThieu, bold: true, size: 28, font: 'Times New Roman' }),
    ]}),

    // ── Thông tin đảng viên (dùng paragraph với tab stops để thụt lề chuẩn) ──
    makeInfoParagraph('Giới thiệu đồng chí', member.ho_ten || '...'),
    makeInfoParagraph('Nam, nữ', member.gioi_tinh || '...'),
    makeInfoParagraph('Sinh ngày', member.ngay_sinh ? dayjs(member.ngay_sinh).format('DD/MM/YYYY') : '...'),
    makeInfoParagraph('Kết nạp vào Đảng ngày', member.ngay_vao_dang ? dayjs(member.ngay_vao_dang).format('DD/MM/YYYY') : '...'),
    makeInfoParagraph('Đang sinh hoạt đảng tại Chi bộ', c.sinhHoatTaiChiBo),
    makeInfoParagraph('Hiện cư trú tại', diaChiCuTru),

    new Paragraph({ spacing: { before: 160, after: 0 }, children: [] }),

    // ── Đề nghị ──
    new Paragraph({
      indent: { firstLine: 720 },
      spacing: { after: 200, line: 288 },
      alignment: AlignmentType.JUSTIFY,
      children: [
        new TextRun({ text: 'Đề nghị các đồng chí tiếp nhận và tạo điều kiện cho đảng viên ', size: 28, font: 'Times New Roman' }),
        new TextRun({ text: member.ho_ten || '', bold: true, size: 28, font: 'Times New Roman' }),
        new TextRun({ text: ' hoàn thành nhiệm vụ.', size: 28, font: 'Times New Roman' }),
      ]
    }),

    new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }),

    // ── Chữ ký 2 cột (Dùng bảng 6 dòng để cân đều tuyệt đối chữ Phan Minh Đức với chữ BÍ THƯ bên trái) ──
    new DocxTable({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        // Dòng 0: ĐẢNG ỦY NƠI CƯ TRÚ | T/M ĐẢNG ỦY
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4810, type: WidthType.DXA },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 288, before: 0, after: 120 }, children: [
                  new TextRun({ text: 'ĐẢNG ỦY NƠI CƯ TRÚ', bold: true, size: 28, font: 'Times New Roman' }),
                ]}),
              ]
            }),
            new TableCell({
              width: { size: 4811, type: WidthType.DXA },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 288, before: 0, after: 40 }, children: [
                  new TextRun({ text: 'T/M ĐẢNG ỦY', bold: true, size: 28, font: 'Times New Roman' }),
                ]}),
              ]
            }),
          ]
        }),
        // Dòng 1: Tiếp nhận ngày ... | BÍ THƯ
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4810, type: WidthType.DXA },
              children: [
                new Paragraph({ alignment: AlignmentType.LEFT, spacing: { line: 288, before: 0, after: 120 }, children: [
                  new TextRun({ text: 'Tiếp nhận ngày ……………………', size: 28, font: 'Times New Roman' }),
                ]}),
              ]
            }),
            new TableCell({
              width: { size: 4811, type: WidthType.DXA },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 288, before: 0, after: 40 }, children: [
                  new TextRun({ text: 'BÍ THƯ', bold: false, size: 28, font: 'Times New Roman' }),
                ]}),
              ]
            }),
          ]
        }),
        // Dòng 2: Đã giới thiệu... | (Trống cho chữ ký)
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4810, type: WidthType.DXA },
              children: [
                new Paragraph({ alignment: AlignmentType.LEFT, spacing: { line: 288, before: 0, after: 120 }, children: [
                  new TextRun({ text: 'Đã giới thiệu về sinh hoạt tại Chi bộ …………………………………….', size: 28, font: 'Times New Roman' }),
                ]}),
              ]
            }),
            new TableCell({
              width: { size: 4811, type: WidthType.DXA },
              children: [
                new Paragraph({ spacing: { before: 0, after: 0 } }),
              ]
            }),
          ]
        }),
        // Dòng 3: (Trống dòng kẻ tiếp theo bên trái) | (Trống cho chữ ký)
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4810, type: WidthType.DXA },
              children: [
                new Paragraph({ alignment: AlignmentType.LEFT, spacing: { line: 288, before: 0, after: 120 }, children: [
                  new TextRun({ text: '……………………………………………………………………', size: 28, font: 'Times New Roman' }),
                ]}),
              ]
            }),
            new TableCell({
              width: { size: 4811, type: WidthType.DXA },
              children: [
                new Paragraph({ spacing: { before: 0, after: 0 } }),
              ]
            }),
          ]
        }),
        // Dòng 4: T/M ĐẢNG ỦY | (Trống cho chữ ký)
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4810, type: WidthType.DXA },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 288, before: 0, after: 40 }, children: [
                  new TextRun({ text: 'T/M ĐẢNG ỦY', bold: true, size: 28, font: 'Times New Roman' }),
                ]}),
              ]
            }),
            new TableCell({
              width: { size: 4811, type: WidthType.DXA },
              children: [
                new Paragraph({ spacing: { before: 0, after: 0 } }),
              ]
            }),
          ]
        }),
        // Dòng 5: BÍ THƯ | Phan Minh Đức (Ngang hàng tuyệt đối!)
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4810, type: WidthType.DXA },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 288, before: 0, after: 40 }, children: [
                  new TextRun({ text: 'BÍ THƯ', bold: false, size: 28, font: 'Times New Roman' }),
                ]}),
              ]
            }),
            new TableCell({
              width: { size: 4811, type: WidthType.DXA },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [
                  new TextRun({ text: c.tenBiThu, bold: true, size: 28, font: 'Times New Roman' }),
                ]}),
              ]
            }),
          ]
        }),
      ]
    }),
  ];
};

// ================================================================
// COMPONENT CHÍNH
// ================================================================

const DangKy213 = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser && ADMIN_ROLES.includes(currentUser.role);

  // === SHARED STATE ===
  const [loading, setLoading] = useState(true);
  const [memberData, setMemberData] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedCity, setSelectedCity] = useState('Đà Nẵng');

  // === ĐẢNG VIÊN FORM STATE ===
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [isConfirmRegisterVisible, setIsConfirmRegisterVisible] = useState(false);
  const [registerFormData, setRegisterFormData] = useState(null);

  // === ADMIN STATE ===
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [exportingId, setExportingId] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkExporting, setBulkExporting] = useState(false);

  // === EMAIL PREVIEW STATE ===
  const [emailPreviewVisible, setEmailPreviewVisible] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  // === BULK EMAIL PREVIEW STATE ===
  const [bulkEmailPreviewVisible, setBulkEmailPreviewVisible] = useState(false);
  const [bulkEmailSending, setBulkEmailSending] = useState(false);

  // === EMAIL CUSTOMIZATION STATE ===
  const [emailDiaDiem, setEmailDiaDiem] = useState('Văn phòng Chi bộ (Phòng B205)');
  const [emailThoiGian, setEmailThoiGian] = useState('08:00 - 11:30 ngày 28/05/2026');
  const [emailLienHe, setEmailLienHe] = useState('Ban Chấp hành Chi bộ');

  // === DETAIL MODAL STATE ===
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // === PREVIEW GIẤY GIỚI THIỆU 213 STATE ===
  const [docPreviewVisible, setDocPreviewVisible] = useState(false);
  const [docPreviewReg, setDocPreviewReg] = useState(null);
  const [docPreviewMember, setDocPreviewMember] = useState(null);

  // === CONFIRM SUBMIT MODAL STATE ===
  const [confirmSubmitModalVisible, setConfirmSubmitModalVisible] = useState(false);
  const [submittingCompletion, setSubmittingCompletion] = useState(false);
  const [selectedRegForCompletion, setSelectedRegForCompletion] = useState(null);
  const [completionForm] = Form.useForm();

  const [customFields, setCustomFields] = useState({
    line1: 'ĐẢNG BỘ ỦY BAN NHÂN DÂN TPĐN',
    line2: 'ĐẢNG ỦY ĐẠI HỌC ĐÀ NẴNG',
    soGgt: 'Số          -GGT/ĐU',
    ngay: '.....',
    thang: '.....',
    nam: '2026',
    kinhGuiPhuong: '',
    kinhGuiChiBo: '',
    thucHienQuyDinh: 'Thực hiện Quy định số 213-QĐ/TW, ngày 02 tháng 01 năm 2020 của Bộ Chính trị về trách nhiệm của đảng viên đang công tác thường xuyên giữ mối liên hệ với tổ chức đảng và nhân dân nơi cư trú.',
    dangBoGioiThieu: 'ĐẢNG ỦY ĐẠI HỌC ĐÀ NẴNG',
    sinhHoatTaiChiBo: 'Sinh viên, Đảng ủy bộ phận Trường Đại học Kinh tế, Đảng bộ Đại học Đà Nẵng.',
    tenBiThu: 'Phan Minh Đức'
  });

  const buildFullAddress = (reg) => {
    const soNhaVaTenDuong = [reg.so_nha, reg.ten_duong].filter(Boolean).join(' ');
    return [soNhaVaTenDuong, reg.phuong, reg.thanh_pho || 'Đà Nẵng'].filter(Boolean).join(', ');
  };

  const getMemberForReg = (reg) => {
    return allMembers.find(m => m.id === reg.user_id) || {};
  };

  const enrichedRegistrations = useMemo(() => {
    return registrations.map(reg => {
      const member = allMembers.find(m => m.id === reg.user_id) || {};
      return {
        ...reg,
        ho_ten: member.ho_ten || '',
        mssv: member.mssv || '',
        cccd: member.cccd || '',
        so_dien_thoai: member.so_dien_thoai || '',
        lop: member.lop || '',
        khoa: member.khoa || '',
        nhom: member.nhom || '',
        ngay_sinh: member.ngay_sinh || '',
        gioi_tinh: member.gioi_tinh || '',
        ngay_vao_dang: member.ngay_vao_dang || '',
        email: member.email || member.email_sv || '',
        full_address: buildFullAddress(reg)
      };
    });
  }, [registrations, allMembers]);

  const filteredRegistrations = useMemo(() => {
    return enrichedRegistrations.filter(r => {
      const matchSearch = !searchText ||
        r.ho_ten?.toLowerCase().includes(searchText.toLowerCase()) ||
        r.mssv?.toLowerCase().includes(searchText.toLowerCase());
      const matchStatus = filterStatus === 'all' || r.trang_thai === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [enrichedRegistrations, searchText, filterStatus]);

  const handleOpenDocPreview = (reg) => {
    const member = getMemberForReg(reg);
    setDocPreviewReg(reg);
    setDocPreviewMember(member);
    
    setCustomFields({
      line1: 'ĐẢNG BỘ ỦY BAN NHÂN DÂN TPĐN',
      line2: 'ĐẢNG ỦY ĐẠI HỌC ĐÀ NẴNG',
      soGgt: 'Số          -GGT/ĐU',
      ngay: reg.created_at ? dayjs(reg.created_at).format('DD') : '.....',
      thang: reg.created_at ? dayjs(reg.created_at).format('MM') : '.....',
      nam: reg.created_at ? dayjs(reg.created_at).format('YYYY') : '2026',
      kinhGuiPhuong: `Đảng ủy phường ${reg.phuong || '...'}, ${reg.thanh_pho || 'Đà Nẵng'}`,
      kinhGuiChiBo: `Chi bộ ${reg.chi_bo_noi_cu_tru || '...'}`,
      thucHienQuyDinh: 'Thực hiện Quy định số 213-QĐ/TW, ngày 02 tháng 01 năm 2020 của Bộ Chính trị về trách nhiệm của đảng viên đang công tác thường xuyên giữ mối liên hệ với tổ chức đảng và nhân dân nơi cư trú.',
      dangBoGioiThieu: 'ĐẢNG ỦY ĐẠI HỌC ĐÀ NẴNG',
      sinhHoatTaiChiBo: 'Sinh viên, Đảng ủy bộ phận Trường Đại học Kinh tế, Đảng bộ Đại học Đà Nẵng.',
      tenBiThu: reg.ten_bi_thu || member.ten_bi_thu || 'Phan Minh Đức'
    });
    setDocPreviewVisible(true);
  };

  const handleViewDetail = (record) => {
    const member = getMemberForReg(record);
    const ngayChinhThuc = member.ngay_chinh_thuc || member.ngay_cong_nhan_dvct || record.ngay_chinh_thuc || record.ngay_cong_nhan_dvct;
    const hasNgayChinhThuc = ngayChinhThuc && 
      typeof ngayChinhThuc === 'string' &&
      !ngayChinhThuc.includes('Chưa') && 
      ngayChinhThuc !== 'undefined' && 
      ngayChinhThuc.trim() !== '';

    const mappedData = {
      MSSV: record.mssv || '--',
      Hovaten: record.ho_ten || '--',
      GioiTinh: record.gioi_tinh || '--',
      Ngaysinh: record.ngay_sinh ? dayjs(record.ngay_sinh).format('DD/MM/YYYY') : '--',
      CCCD: record.cccd || '--',
      SoDienThoai: record.so_dien_thoai || '--',
      Email: record.email || '--',
      Lop: record.lop || '--',
      Khoa: record.khoa || '--',
      Nhom: record.nhom || '--',
      NgayvaoDang: record.ngay_vao_dang ? dayjs(record.ngay_vao_dang).format('DD/MM/YYYY') : '--',
      Ngaychinhthuc: hasNgayChinhThuc ? dayjs(ngayChinhThuc).format('DD/MM/YYYY') : 'Dự bị',
      // Thông tin đăng ký 213
      LoaiDangKy: record.loai_dang_ky === 'thuong_tru' ? 'Thường trú' : record.loai_dang_ky === 'tam_tru' ? 'Tạm trú' : '--',
      DiaChiCuTru: record.full_address || '--',
      PhuongXa: record.phuong || '--',
      TinhTP: record.thanh_pho || '--',
      ChiBoNoiCuTru: record.chi_bo_noi_cu_tru || '--',
      NgayGui: record.created_at ? dayjs(record.created_at).format('DD/MM/YYYY HH:mm') : '--',
      TrangThai: TRANG_THAI_CONFIG[record.trang_thai]?.label || record.trang_thai || '--',
    };
    setSelectedRecord(mappedData);
    setIsDetailVisible(true);
  };

  // ================================================================
  // DATA FETCHING
  // ================================================================

  const getCleanName = (fullName) => {
    if (!fullName) return '';
    let name = fullName.replace(/^(Đ\/c\s+|TS\.\s+)/, '');
    name = name.replace(/\s*\(.*\)$/, '');
    return name.trim();
  };

  const fetchMemberData = async () => {
    if (!currentUser) return;
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
        setMemberData({ id: docRecord.id, ...docRecord.data() });
      }
    } catch (e) {
      console.error("Lỗi tải hồ sơ Đảng viên:", e);
    }
  };

  const fetchAllMembers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "dang_vien"));
      const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllMembers(members);
    } catch (e) {
      console.error("Lỗi tải danh sách Đảng viên:", e);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const snapshot = await getDocs(collection(db, "dangky_213"));
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRegistrations(list);

      if (memberData) {
        setMyRegistrations(list.filter(r => r.user_id === memberData.id));
      }
    } catch (e) {
      console.error("Lỗi tải đăng ký 213:", e);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchMemberData();
      if (isAdmin) {
        await fetchAllMembers();
      }
      setLoading(false);
    };
    loadData();
  }, [currentUser]);

  useEffect(() => {
    if (memberData || isAdmin) {
      fetchRegistrations();
    }
  }, [memberData, isAdmin]);

  useEffect(() => {
    if (memberData && registrations.length >= 0) {
      setMyRegistrations(registrations.filter(r => r.user_id === memberData.id));
    }
  }, [memberData, registrations]);

  // ================================================================
  // ĐẢNG VIÊN: SUBMIT ĐĂNG KÝ
  // ================================================================

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setRegisterFormData(values);
      setIsConfirmRegisterVisible(true);
    } catch (e) {
      if (e.name === 'ValidationError') return;
      console.error(e);
    }
  };

  const handleConfirmRegister = async () => {
    if (!registerFormData) return;
    setSubmitting(true);
    try {
      const values = registerFormData;
      const newRecord = {
        user_id: memberData.id,
        loai_dang_ky: values.loai_dang_ky,
        so_nha: values.so_nha,
        ten_duong: values.ten_duong,
        phuong: values.phuong,
        thanh_pho: values.thanh_pho,
        chi_bo_noi_cu_tru: values.chi_bo_noi_cu_tru,
        trang_thai: 'da_nhan',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await addDoc(collection(db, "dangky_213"), newRecord);
      message.success('Gửi đăng ký 213 thành công! Trạng thái: Đã nhận.');
      form.resetFields();
      setSelectedCity('Đà Nẵng');
      setIsConfirmRegisterVisible(false);
      setRegisterFormData(null);
      await fetchRegistrations();
    } catch (e) {
      console.error(e);
      message.error('Lỗi khi gửi đăng ký: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };



  // ================================================================
  // ADMIN: XUẤT WORD ĐƠN LẺ (chỉ tải file, KHÔNG tự đổi trạng thái)
  // ================================================================

  const SECTION_PROPERTIES = {
    page: {
      size: {
        width: 12240,  // Letter Width
        height: 15840, // Letter Height
      },
      margin: {
        top: 540,
        bottom: 426,
        left: 1701,
        right: 1134,
      }
    }
  };

  const handleExportWord = async (reg, customData = null) => {
    setExportingId(reg.id);
    try {
      const member = getMemberForReg(reg);
      
      const customFieldsMerged = {
        line1: 'ĐẢNG BỘ ỦY BAN NHÂN DÂN TPĐN',
        line2: 'ĐẢNG ỦY ĐẠI HỌC ĐÀ NẴNG',
        soGgt: 'Số          -GGT/ĐU',
        ngay: reg.created_at ? dayjs(reg.created_at).format('DD') : '.....',
        thang: reg.created_at ? dayjs(reg.created_at).format('MM') : '.....',
        nam: reg.created_at ? dayjs(reg.created_at).format('YYYY') : '2026',
        kinhGuiPhuong: `Đảng ủy phường ${reg.phuong || '...'}, ${reg.thanh_pho || 'Đà Nẵng'}`,
        kinhGuiChiBo: `Chi bộ ${reg.chi_bo_noi_cu_tru || '...'}`,
        thucHienQuyDinh: 'Thực hiện Quy định số 213-QĐ/TW, ngày 02 tháng 01 năm 2020 của Bộ Chính trị về trách nhiệm của đảng viên đang công tác thường xuyên giữ mối liên hệ với tổ chức đảng và nhân dân nơi cư trú.',
        dangBoGioiThieu: 'ĐẢNG ỦY ĐẠI HỌC ĐÀ NẴNG',
        sinhHoatTaiChiBo: 'Sinh viên, Đảng ủy bộ phận Trường Đại học Kinh tế, Đảng bộ Đại học Đà Nẵng.',
        tenBiThu: reg.ten_bi_thu || member.ten_bi_thu || 'Phan Minh Đức',
        ...customFields,
        ...customData
      };

      const soNhaVaTenDuong = [reg.so_nha, reg.ten_duong].filter(Boolean).join(' ');
      const fullAddress = [soNhaVaTenDuong, reg.phuong, reg.thanh_pho || 'Đà Nẵng'].filter(Boolean).join(', ');
      
      const ngaySinhStr = member.ngay_sinh ? dayjs(member.ngay_sinh).format('DD/MM/YYYY') : '...';
      const ngayVaoDangStr = member.ngay_vao_dang ? dayjs(member.ngay_vao_dang).format('DD/MM/YYYY') : '...';

      // Load original template from public folder
      const response = await fetch('/' + encodeURIComponent('ĐHKT_QĐ 213- 24052026.Sinh vien.docx'));
      if (!response.ok) {
        throw new Error('Không thể tải file mẫu từ hệ thống.');
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      let docXml = await zip.file('word/document.xml').async('string');

      // Parse XML DOM
      const xmlDoc = new DOMParser().parseFromString(docXml, 'application/xml');

      const getElementsByLocalName = (parent, localName) => {
        const results = [];
        const traverse = (node) => {
          if (node.nodeType === 1) {
            const name = node.nodeName;
            if (name === localName || name.endsWith(':' + localName)) {
              results.push(node);
            }
          }
          for (let i = 0; i < node.childNodes.length; i++) {
            traverse(node.childNodes[i]);
          }
        };
        traverse(parent);
        return results;
      };

      const replaceParagraphValue = (p, label, newValue, isHeaderDate = false) => {
        const tElements = getElementsByLocalName(p, 't');
        if (tElements.length === 0) return;

        if (isHeaderDate) {
          for (let i = 0; i < tElements.length; i++) {
            if (tElements[i].textContent.includes('Đà Nẵng, ngày')) {
              tElements[i].textContent = newValue;
              for (let j = i + 1; j < tElements.length; j++) {
                tElements[j].textContent = '';
              }
              break;
            }
          }
          return;
        }

        if (label === null) {
          tElements[0].textContent = newValue;
          for (let i = 1; i < tElements.length; i++) {
            tElements[i].textContent = '';
          }
          return;
        }

        let colonIdx = -1;
        for (let i = 0; i < tElements.length; i++) {
          if (tElements[i].textContent.includes(':')) {
            colonIdx = i;
            break;
          }
        }

        if (colonIdx !== -1) {
          const text = tElements[colonIdx].textContent;
          const firstColonPos = text.indexOf(':');
          const beforeColon = text.substring(0, firstColonPos);
          const afterColon = text.substring(firstColonPos + 1).trim();
          
          if (afterColon.length > 0) {
            tElements[colonIdx].textContent = beforeColon + ': ' + newValue;
            for (let i = colonIdx + 1; i < tElements.length; i++) {
              tElements[i].textContent = '';
            }
          } else {
            if (colonIdx + 1 < tElements.length) {
              tElements[colonIdx + 1].textContent = ' ' + newValue;
              for (let i = colonIdx + 2; i < tElements.length; i++) {
                tElements[i].textContent = '';
              }
            } else {
              tElements[colonIdx].textContent = beforeColon + ': ' + newValue;
            }
          }
        }
      };

      const paragraphs = getElementsByLocalName(xmlDoc, 'p');
      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const tElements = getElementsByLocalName(p, 't');
        const pText = tElements.map(t => t.textContent).join('');

        if (pText === 'ĐẢNG BỘ ỦY BAN NHÂN DÂN TPĐN') {
          replaceParagraphValue(p, null, customFieldsMerged.line1);
        } else if (pText === 'ĐẢNG ỦY ĐẠI HỌC ĐÀ nẴNG' || pText === 'ĐẢNG ỦY ĐẠI HỌC ĐÀ NẴNG') {
          let isHeader = false;
          let curr = p.parentNode;
          while (curr) {
            if (curr.nodeName === 'w:tc' || curr.nodeName.endsWith(':tc')) {
              isHeader = true;
              break;
            }
            curr = curr.parentNode;
          }
          if (isHeader) {
            replaceParagraphValue(p, null, customFieldsMerged.line2);
          } else {
            replaceParagraphValue(p, null, customFieldsMerged.dangBoGioiThieu);
          }
        } else if (pText.startsWith('Số') && pText.includes('-GGT/ĐU')) {
          replaceParagraphValue(p, null, customFieldsMerged.soGgt);
        } else if (pText.includes('Đà Nẵng, ngày') && pText.includes('tháng') && pText.includes('năm 2026')) {
          const headerDateStr = `Đà Nẵng, ngày ${customFieldsMerged.ngay} tháng ${customFieldsMerged.thang} năm ${customFieldsMerged.nam}`;
          replaceParagraphValue(p, null, headerDateStr, true);
        } else if (pText.includes('Giới thiệu đồng chí')) {
          replaceParagraphValue(p, 'Giới thiệu đồng chí', member.ho_ten);
        } else if (pText.includes('Nam, nữ')) {
          replaceParagraphValue(p, 'Nam, nữ', member.gioi_tinh);
        } else if (pText.includes('Sinh ngày')) {
          replaceParagraphValue(p, 'Sinh ngày', ngaySinhStr);
        } else if (pText.includes('Kết nạp vào Đảng ngày')) {
          replaceParagraphValue(p, 'Kết nạp vào Đảng ngày', ngayVaoDangStr);
        } else if (pText.includes('Chính thức ngày')) {
          const ngayChinhThuc = member.ngay_chinh_thuc || member.ngay_cong_nhan_dvct;
          const hasNgayChinhThuc = ngayChinhThuc && 
            typeof ngayChinhThuc === 'string' &&
            !ngayChinhThuc.includes('Chưa') && 
            ngayChinhThuc !== 'undefined' && 
            ngayChinhThuc.trim() !== '';
          if (hasNgayChinhThuc) {
            const ngayChinhThucStr = dayjs(ngayChinhThuc).format('DD/MM/YYYY');
            replaceParagraphValue(p, 'Chính thức ngày', ngayChinhThucStr);
          } else {
            if (p.parentNode) {
              p.parentNode.removeChild(p);
            }
          }
        } else if (pText.includes('Đang sinh hoạt đảng tại Chi bộ')) {
          replaceParagraphValue(p, 'Đang sinh hoạt đảng tại Chi bộ', customFieldsMerged.sinhHoatTaiChiBo);
        } else if (pText.includes('Hiện cư trú tại')) {
          replaceParagraphValue(p, 'Hiện cư trú tại', fullAddress + ' về sinh hoạt nơi cư trú.');
        } else if (pText.startsWith('- Đảng uỷ phường') || pText.startsWith('- Đảng ủy phường')) {
          replaceParagraphValue(p, null, '- ' + customFieldsMerged.kinhGuiPhuong);
        } else if (pText.startsWith('- Chi bộ')) {
          replaceParagraphValue(p, null, '- ' + customFieldsMerged.kinhGuiChiBo);
        } else if (pText === 'Phan Minh Đức') {
          replaceParagraphValue(p, null, customFieldsMerged.tenBiThu);
        } else if (pText.includes('tiếp nhận và tạo điều kiện cho đảng viên') && pText.includes('hoàn thành nhiệm vụ.')) {
          for (let j = 0; j < tElements.length; j++) {
            if (tElements[j].textContent === 'Lê Quốc Việt') {
              tElements[j].textContent = member.ho_ten;
            }
          }
        }
      }

      // Clean up empty trailing paragraphs directly in the body to prevent blank page overflow
      const finalPs = getElementsByLocalName(xmlDoc, 'p');
      for (let j = finalPs.length - 1; j >= 0; j--) {
        const p = finalPs[j];
        const parentName = p.parentNode ? p.parentNode.nodeName : '';
        if (parentName === 'w:body' || parentName.endsWith(':body')) {
          const tElems = getElementsByLocalName(p, 't');
          const pText = tElems.map(t => t.textContent).join('').trim();
          const drawings = getElementsByLocalName(p, 'drawing');
          const shapes = getElementsByLocalName(p, 'w:shape');
          
          if (pText === '' && drawings.length === 0 && shapes.length === 0) {
            p.parentNode.removeChild(p);
          } else {
            break;
          }
        }
      }

      const docXmlString = new XMLSerializer().serializeToString(xmlDoc);
      zip.file('word/document.xml', docXmlString);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GiayGioiThieu213_${member.mssv || 'unknown'}_${member.ho_ten || ''}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);

      message.success(`Đã tải Giấy giới thiệu 213 (Mẫu chuẩn) cho ${member.ho_ten || ''}`);
    } catch (e) {
      console.error(e);
      message.error('Lỗi khi xuất Word: ' + e.message);
    } finally {
      setExportingId(null);
    }
  };

  // ================================================================
  // ADMIN: XUẤT WORD HÀNG LOẠT (nhiều người → xuất ra file ZIP chứa các file Word mẫu chuẩn)
  // ================================================================

  const handleBulkExport = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 đăng ký để xuất.');
      return;
    }
    setBulkExporting(true);
    try {
      const selectedRegs = enrichedRegistrations.filter(r => selectedRowKeys.includes(r.id));
      
      // Load template
      const response = await fetch('/' + encodeURIComponent('ĐHKT_QĐ 213- 24052026.Sinh vien.docx'));
      if (!response.ok) {
        throw new Error('Không thể tải file mẫu từ hệ thống.');
      }
      const templateArrayBuffer = await response.arrayBuffer();

      const getElementsByLocalName = (parent, localName) => {
        const results = [];
        const traverse = (node) => {
          if (node.nodeType === 1) {
            const name = node.nodeName;
            if (name === localName || name.endsWith(':' + localName)) {
              results.push(node);
            }
          }
          for (let i = 0; i < node.childNodes.length; i++) {
            traverse(node.childNodes[i]);
          }
        };
        traverse(parent);
        return results;
      };

      const replaceParagraphValue = (p, label, newValue, isHeaderDate = false) => {
        const tElements = getElementsByLocalName(p, 't');
        if (tElements.length === 0) return;

        if (isHeaderDate) {
          for (let i = 0; i < tElements.length; i++) {
            if (tElements[i].textContent.includes('Đà Nẵng, ngày')) {
              tElements[i].textContent = newValue;
              for (let j = i + 1; j < tElements.length; j++) {
                tElements[j].textContent = '';
              }
              break;
            }
          }
          return;
        }

        if (label === null) {
          tElements[0].textContent = newValue;
          for (let i = 1; i < tElements.length; i++) {
            tElements[i].textContent = '';
          }
          return;
        }

        let colonIdx = -1;
        for (let i = 0; i < tElements.length; i++) {
          if (tElements[i].textContent.includes(':')) {
            colonIdx = i;
            break;
          }
        }

        if (colonIdx !== -1) {
          const text = tElements[colonIdx].textContent;
          const firstColonPos = text.indexOf(':');
          const beforeColon = text.substring(0, firstColonPos);
          const afterColon = text.substring(firstColonPos + 1).trim();
          
          if (afterColon.length > 0) {
            tElements[colonIdx].textContent = beforeColon + ': ' + newValue;
            for (let i = colonIdx + 1; i < tElements.length; i++) {
              tElements[i].textContent = '';
            }
          } else {
            if (colonIdx + 1 < tElements.length) {
              tElements[colonIdx + 1].textContent = ' ' + newValue;
              for (let i = colonIdx + 2; i < tElements.length; i++) {
                tElements[i].textContent = '';
              }
            } else {
              tElements[colonIdx].textContent = beforeColon + ': ' + newValue;
            }
          }
        }
      };

      const outputZip = new JSZip();

      for (const reg of selectedRegs) {
        const member = getMemberForReg(reg);
        const customFieldsMerged = {
          line1: 'ĐẢNG BỘ ỦY BAN NHÂN DÂN TPĐN',
          line2: 'ĐẢNG ỦY ĐẠI HỌC ĐÀ NẴNG',
          soGgt: 'Số          -GGT/ĐU',
          ngay: reg.created_at ? dayjs(reg.created_at).format('DD') : '.....',
          thang: reg.created_at ? dayjs(reg.created_at).format('MM') : '.....',
          nam: reg.created_at ? dayjs(reg.created_at).format('YYYY') : '2026',
          kinhGuiPhuong: `Đảng ủy phường ${reg.phuong || '...'}, ${reg.thanh_pho || 'Đà Nẵng'}`,
          kinhGuiChiBo: `Chi bộ ${reg.chi_bo_noi_cu_tru || '...'}`,
          thucHienQuyDinh: 'Thực hiện Quy định số 213-QĐ/TW, ngày 02 tháng 01 năm 2020 của Bộ Chính trị về trách nhiệm của đảng viên đang công tác thường xuyên giữ mối liên hệ với tổ chức đảng và nhân dân nơi cư trú.',
          dangBoGioiThieu: 'ĐẢNG ỦY ĐẠI HỌC ĐÀ NẴNG',
          sinhHoatTaiChiBo: 'Sinh viên, Đảng ủy bộ phận Trường Đại học Kinh tế, Đảng bộ Đại học Đà Nẵng.',
          tenBiThu: reg.ten_bi_thu || member.ten_bi_thu || 'Phan Minh Đức',
          ...customFields
        };

        const soNhaVaTenDuong = [reg.so_nha, reg.ten_duong].filter(Boolean).join(' ');
        const fullAddress = [soNhaVaTenDuong, reg.phuong, reg.thanh_pho || 'Đà Nẵng'].filter(Boolean).join(', ');
        const ngaySinhStr = member.ngay_sinh ? dayjs(member.ngay_sinh).format('DD/MM/YYYY') : '...';
        const ngayVaoDangStr = member.ngay_vao_dang ? dayjs(member.ngay_vao_dang).format('DD/MM/YYYY') : '...';

        const zip = await JSZip.loadAsync(templateArrayBuffer);
        let docXml = await zip.file('word/document.xml').async('string');
        const xmlDoc = new DOMParser().parseFromString(docXml, 'application/xml');

        const paragraphs = getElementsByLocalName(xmlDoc, 'p');
        for (let i = 0; i < paragraphs.length; i++) {
          const p = paragraphs[i];
          const tElements = getElementsByLocalName(p, 't');
          const pText = tElements.map(t => t.textContent).join('');

          if (pText === 'ĐẢNG BỘ ỦY BAN NHÂN DÂN TPĐN') {
            replaceParagraphValue(p, null, customFieldsMerged.line1);
          } else if (pText === 'ĐẢNG ỦY ĐẠI HỌC ĐÀ nẴNG' || pText === 'ĐẢNG ỦY ĐẠI HỌC ĐÀ NẴNG') {
            let isHeader = false;
            let curr = p.parentNode;
            while (curr) {
              if (curr.nodeName === 'w:tc' || curr.nodeName.endsWith(':tc')) {
                isHeader = true;
                break;
              }
              curr = curr.parentNode;
            }
            if (isHeader) {
              replaceParagraphValue(p, null, customFieldsMerged.line2);
            } else {
              replaceParagraphValue(p, null, customFieldsMerged.dangBoGioiThieu);
            }
          } else if (pText.startsWith('Số') && pText.includes('-GGT/ĐU')) {
            replaceParagraphValue(p, null, customFieldsMerged.soGgt);
          } else if (pText.includes('Đà Nẵng, ngày') && pText.includes('tháng') && pText.includes('năm 2026')) {
            const headerDateStr = `Đà Nẵng, ngày ${customFieldsMerged.ngay} tháng ${customFieldsMerged.thang} năm ${customFieldsMerged.nam}`;
            replaceParagraphValue(p, null, headerDateStr, true);
          } else if (pText.includes('Giới thiệu đồng chí')) {
            replaceParagraphValue(p, 'Giới thiệu đồng chí', member.ho_ten);
          } else if (pText.includes('Nam, nữ')) {
            replaceParagraphValue(p, 'Nam, nữ', member.gioi_tinh);
          } else if (pText.includes('Sinh ngày')) {
            replaceParagraphValue(p, 'Sinh ngày', ngaySinhStr);
          } else if (pText.includes('Kết nạp vào Đảng ngày')) {
            replaceParagraphValue(p, 'Kết nạp vào Đảng ngày', ngayVaoDangStr);
          } else if (pText.includes('Chính thức ngày')) {
            const ngayChinhThuc = member.ngay_chinh_thuc || member.ngay_cong_nhan_dvct;
            const hasNgayChinhThuc = ngayChinhThuc && 
              typeof ngayChinhThuc === 'string' &&
              !ngayChinhThuc.includes('Chưa') && 
              ngayChinhThuc !== 'undefined' && 
              ngayChinhThuc.trim() !== '';
            if (hasNgayChinhThuc) {
              const ngayChinhThucStr = dayjs(ngayChinhThuc).format('DD/MM/YYYY');
              replaceParagraphValue(p, 'Chính thức ngày', ngayChinhThucStr);
            } else {
              if (p.parentNode) {
                p.parentNode.removeChild(p);
              }
            }
          } else if (pText.includes('Đang sinh hoạt đảng tại Chi bộ')) {
            replaceParagraphValue(p, 'Đang sinh hoạt đảng tại Chi bộ', customFieldsMerged.sinhHoatTaiChiBo);
          } else if (pText.includes('Hiện cư trú tại')) {
            replaceParagraphValue(p, 'Hiện cư trú tại', fullAddress + ' về sinh hoạt nơi cư trú.');
          } else if (pText.startsWith('- Đảng uỷ phường') || pText.startsWith('- Đảng ủy phường')) {
            replaceParagraphValue(p, null, '- ' + customFieldsMerged.kinhGuiPhuong);
          } else if (pText.startsWith('- Chi bộ')) {
            replaceParagraphValue(p, null, '- ' + customFieldsMerged.kinhGuiChiBo);
          } else if (pText === 'Phan Minh Đức') {
            replaceParagraphValue(p, null, customFieldsMerged.tenBiThu);
          } else if (pText.includes('tiếp nhận và tạo điều kiện cho đảng viên') && pText.includes('hoàn thành nhiệm vụ.')) {
            for (let j = 0; j < tElements.length; j++) {
              if (tElements[j].textContent === 'Lê Quốc Việt') {
                tElements[j].textContent = member.ho_ten;
              }
            }
          }
        }

        // Clean up empty trailing paragraphs directly in the body to prevent blank page overflow
        const finalPs = getElementsByLocalName(xmlDoc, 'p');
        for (let j = finalPs.length - 1; j >= 0; j--) {
          const p = finalPs[j];
          const parentName = p.parentNode ? p.parentNode.nodeName : '';
          if (parentName === 'w:body' || parentName.endsWith(':body')) {
            const tElems = getElementsByLocalName(p, 't');
            const pText = tElems.map(t => t.textContent).join('').trim();
            const drawings = getElementsByLocalName(p, 'drawing');
            const shapes = getElementsByLocalName(p, 'w:shape');
            
            if (pText === '' && drawings.length === 0 && shapes.length === 0) {
              p.parentNode.removeChild(p);
            } else {
              break;
            }
          }
        }

        const docXmlString = new XMLSerializer().serializeToString(xmlDoc);
        zip.file('word/document.xml', docXmlString);

        const fileBlob = await zip.generateAsync({ type: 'blob' });
        const safeName = member.ho_ten ? member.ho_ten.replace(/\s+/g, '_') : 'unnamed';
        outputZip.file(`GiayGioiThieu213_${member.mssv || 'unknown'}_${safeName}.docx`, fileBlob);
      }

      const zipBlob = await outputZip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GiayGioiThieu213_HangLoat_${selectedRegs.length}nguoi_${dayjs().format('DDMMYYYY')}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);

      message.success(`Đã xuất ${selectedRegs.length} giấy giới thiệu mẫu chuẩn thành công vào file ZIP.`);
      setSelectedRowKeys([]);
    } catch (e) {
      console.error(e);
      message.error('Lỗi khi xuất hàng loạt: ' + e.message);
    } finally {
      setBulkExporting(false);
    }
  };

  // ================================================================
  // ADMIN: XUẤT EXCEL DANH SÁCH ĐĂNG KÝ 213
  // ================================================================

  const handleExportExcel = () => {
    const dataToExport = (selectedRowKeys.length > 0
      ? filteredRegistrations.filter(r => selectedRowKeys.includes(r.id))
      : filteredRegistrations
    );
    if (dataToExport.length === 0) {
      message.warning('Không có dữ liệu để xuất.');
      return;
    }
    const rows = dataToExport.map((r, idx) => ({
      'STT': idx + 1,
      'Họ và tên': r.ho_ten || '',
      'MSSV': r.mssv || '',
      'CCCD': r.cccd || '',
      'SĐT': r.so_dien_thoai || '',
      'Lớp': r.lop || '',
      'Khoa': r.khoa || '',
      'Nhóm': r.nhom || '',
      'Ngày sinh': r.ngay_sinh ? dayjs(r.ngay_sinh).format('DD/MM/YYYY') : '',
      'Ngày vào Đảng': r.ngay_vao_dang ? dayjs(r.ngay_vao_dang).format('DD/MM/YYYY') : '',
      'Giới tính': r.gioi_tinh || '',
      'Email': r.email || '',
      'Loại đăng ký': r.loai_dang_ky === 'thuong_tru' ? 'Thường trú' : 'Tạm trú',
      'Địa chỉ cư trú': r.full_address || '',
      'Phường/Xã': r.phuong || '',
      'Tỉnh/TP': r.thanh_pho || '',
      'Chi bộ nơi cư trú': r.chi_bo_noi_cu_tru || '',
      'Ngày gửi': r.created_at ? dayjs(r.created_at).format('DD/MM/YYYY') : '',
      'Trạng thái': TRANG_THAI_CONFIG[r.trang_thai]?.label || r.trang_thai || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    // Đặt độ rộng cột
    ws['!cols'] = [
      { wch: 5 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
      { wch: 10 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 15 }, { wch: 8 },
      { wch: 26 }, { wch: 12 }, { wch: 36 }, { wch: 18 }, { wch: 16 },
      { wch: 24 }, { wch: 12 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách đăng ký 213');
    const fileName = `DangKy213_${dayjs().format('DDMMYYYY_HHmm')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    message.success(`Đã xuất ${dataToExport.length} bản ghi ra file Excel!`);
  };

  // ================================================================
  // ADMIN: CẬP NHẬT TRẠNG THÁI THỦ CÔNG
  // ================================================================

  const handleChangeStatus = async (reg, newStatus) => {
    try {
      await updateDoc(doc(db, "dangky_213", reg.id), {
        trang_thai: newStatus,
        updated_at: new Date().toISOString()
      });

      // Nếu chuyển sang "đã làm" → cập nhật địa chỉ vào hồ sơ
      if (newStatus === 'da_lam') {
        const fullAddress = buildFullAddress(reg);
        const updateData = { updated_at: new Date().toISOString() };
        if (reg.loai_dang_ky === 'thuong_tru') {
          updateData.chi_tiet_dc = fullAddress;
          updateData.xa_phuong_tt = reg.phuong;
          updateData.tinh_tp_tt = reg.thanh_pho;
        } else if (reg.loai_dang_ky === 'tam_tru') {
          updateData.dia_chi_tam_tru = fullAddress;
        }
        await updateDoc(doc(db, "dang_vien", reg.user_id), updateData);
      }

      const statusLabel = TRANG_THAI_CONFIG[newStatus]?.label || newStatus;
      message.success(`Đã chuyển trạng thái thành "${statusLabel}"`);
      await fetchRegistrations();
      if (isAdmin) await fetchAllMembers();
    } catch (e) {
      console.error(e);
      message.error('Lỗi khi cập nhật trạng thái: ' + e.message);
    }
  };

  // ================================================================
  // ĐẢNG VIÊN: XÁC NHẬN HOÀN THÀNH NỘP 213
  // ================================================================

  const handleOpenCompletionModal = (record) => {
    setSelectedRegForCompletion(record);
    completionForm.setFieldsValue({
      ten_bi_thu_cu_tru: record.ten_bi_thu_cu_tru || '',
      sdt_bi_thu_cu_tru: record.sdt_bi_thu_cu_tru || ''
    });
    setConfirmSubmitModalVisible(true);
  };

  const handleConfirmCompletion = async () => {
    if (!selectedRegForCompletion) return;
    try {
      const values = await completionForm.validateFields();
      setSubmittingCompletion(true);
      
      await updateDoc(doc(db, "dangky_213", selectedRegForCompletion.id), {
        trang_thai: 'hoan_thanh',
        ten_bi_thu_cu_tru: values.ten_bi_thu_cu_tru,
        sdt_bi_thu_cu_tru: values.sdt_bi_thu_cu_tru,
        completed_at: new Date().toISOString()
      });
      
      message.success("Xác nhận hoàn thành nộp Giấy 213 thành công!");
      setConfirmSubmitModalVisible(false);
      setSelectedRegForCompletion(null);
      completionForm.resetFields();
      
      await fetchRegistrations();
      if (isAdmin) await fetchAllMembers();
    } catch (e) {
      console.error(e);
      if (e.errorFields) return;
      message.error("Lỗi khi xác nhận hoàn thành: " + e.message);
    } finally {
      setSubmittingCompletion(false);
    }
  };

  // ================================================================
  // ADMIN: XEM TRƯỚC EMAIL & GỬI
  // ================================================================

  const buildEmailHtml = (reg, member, diaDiem, thoiGian, lienHe) => {
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #333; line-height: 1.6;">
        <div style="background: linear-gradient(135deg,#c62828,#b71c1c); padding: 24px; text-align: center; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0 0 4px 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">CHI BỘ SINH VIÊN</h2>
          <p style="color: #ffcdd2; margin: 0; font-size: 13px;">Trường Đại học Kinh tế - Đại học Đà Nẵng</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e8e8e8; border-top: none; border-radius: 0 0 10px 10px; background: #fff;">
          <p style="font-size: 15px; margin-bottom: 6px;">Kính gửi Đồng chí <strong style="color:#c62828">${member.ho_ten || ''}</strong>,</p>
          <p style="font-size: 14px; color:#555; text-align:justify;">Giấy đăng ký theo quy định 213 về việc giữ mối liên hệ với tổ chức đảng và nhân dân nơi cư trú đã được Chi bộ Xử lý hoàn tất. Đồng chí vui lòng đến nhận giấy theo thông tin dưới đây.</p>

          <!-- Thông tin nhận giấy -->
          <div style="background:#f6ffed; border:1px solid #b7eb8f; border-radius:8px; padding:14px 18px; margin:16px 0;">
            <p style="margin:0 0 10px 0; font-weight:700; color:#52c41a; font-size:14px;">📍 Thông tin nhận giấy</p>
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
              <tr><td style="padding:4px 0; color:#8c8c8c; width:100px; font-weight:600;">Địa điểm:</td><td style="font-weight:600; color:#333;">${diaDiem}</td></tr>
              <tr><td style="padding:4px 0; color:#8c8c8c; font-weight:600;">Thời gian:</td><td style="font-weight:600; color:#333;">${thoiGian}</td></tr>
            </table>
          </div>

          <p style="font-size:14px; margin-top:16px;">Mọi thắc mắc xin vui lòng liên hệ: <strong>${lienHe}</strong>.</p>
          <p style="font-size:14px; margin-top:20px; font-weight:600; color:#555;">Trân trọng./.</p>
          <hr style="border:none; border-top:1px solid #f0f0f0; margin:20px 0 12px 0;" />
          <p style="color:#999; font-size:11px; margin:0; text-align:center;">Email tự động từ Hệ thống quản lý Chi bộ Sinh viên - Trường ĐH Kinh tế ĐHĐN.</p>
        </div>
      </div>
    `;
  };

  // Khi đổi các thông tin custom, cập nhật lại html preview
  useEffect(() => {
    if (emailPreviewData) {
      const updatedHtml = buildEmailHtml(
        emailPreviewData.reg,
        emailPreviewData.member,
        emailDiaDiem,
        emailThoiGian,
        emailLienHe
      );
      setEmailPreviewData(prev => ({
        ...prev,
        diaDiem: emailDiaDiem,
        thoiGian: emailThoiGian,
        lienHe: emailLienHe,
        html: updatedHtml
      }));
    }
  }, [emailDiaDiem, emailThoiGian, emailLienHe]);

  const handlePreviewEmail = (reg) => {
    const member = getMemberForReg(reg);
    const email = member.email || member.email_sv || '';
    
    // Tạo ngày nhận mặc định là ngày mai
    const tomorrow = dayjs().add(1, 'day').format('DD/MM/YYYY');
    const defaultDiaDiem = 'Văn phòng Đảng ủy Trường ĐH Kinh tế (Phòng H208)';
    const defaultThoiGian = `08:00 - 11:30 ngày ${tomorrow}`;
    const defaultLienHe = `Đ/c ${currentUser?.name || ''} - Nhóm hồ sơ sinh hoạt Đảng - SĐT: ${currentUser?.so_dien_thoai || '0969754149'} - Email: ${currentUser?.email || ''}`;

    setEmailDiaDiem(defaultDiaDiem);
    setEmailThoiGian(defaultThoiGian);
    setEmailLienHe(defaultLienHe);

    const html = buildEmailHtml(reg, member, defaultDiaDiem, defaultThoiGian, defaultLienHe);
    
    setEmailPreviewData({
      reg,
      member,
      to: email,
      subject: `THÔNG BÁO NHẬN GIẤY 213`,
      html,
      diaDiem: defaultDiaDiem,
      thoiGian: defaultThoiGian,
      lienHe: defaultLienHe
    });
    setEmailPreviewVisible(true);
  };

  const handleConfirmSendEmail = async () => {
    if (!emailPreviewData) return;
    setSendingEmail(true);
    try {
      const { reg, member, to, subject, html } = emailPreviewData;

      // Cập nhật trạng thái → chờ đến nhận
      await updateDoc(doc(db, "dangky_213", reg.id), {
        trang_thai: 'cho_den_nhan',
        updated_at: new Date().toISOString()
      });

      // Tạo thông báo trong hệ thống
      await addDoc(collection(db, "notifications"), {
        title: `Đăng ký 213 đã xử lý xong`,
        content: `Kính gửi đồng chí ${member.ho_ten || ''}. Giấy đăng ký theo quy định 213 về việc giữ mối liên hệ với tổ chức đảng và nhân dân nơi cư trú đã được Chi bộ Xử lý hoàn tất. Đồng chí vui lòng đến nhận giấy tại ${emailPreviewData.diaDiem || 'Văn phòng Đảng ủy Trường ĐH Kinh tế (Phòng H208)'} vào lúc ${emailPreviewData.thoiGian || 'trong giờ hành chính'}. Trân trọng./. Mọi thắc mắc xin vui lòng liên hệ: ${emailPreviewData.lienHe || 'Ban Chấp hành Chi bộ'}.`,
        type: 'dangky_213',
        target_user_id: reg.user_id,
        created_at: new Date().toISOString()
      });

      // Gửi email
      if (to) {
        try {
          await fetch('https://chibosinhvien.onrender.com/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, html })
          });
        } catch (emailErr) {
          console.warn('Không gửi được email:', emailErr);
        }
      }

      message.success(`Đã gửi thông báo + email cho ${member.ho_ten || ''}`);
      setEmailPreviewVisible(false);
      setEmailPreviewData(null);
      await fetchRegistrations();
    } catch (e) {
      console.error(e);
      message.error('Lỗi: ' + e.message);
    } finally {
      setSendingEmail(false);
    }
  };

  // === BULK EMAIL PREVIEW & SENDING ===
  const firstSelectedRegAndMember = useMemo(() => {
    if (selectedRowKeys.length === 0) return null;
    const firstReg = enrichedRegistrations.find(r => r.id === selectedRowKeys[0]);
    if (!firstReg) return null;
    const member = getMemberForReg(firstReg);
    return { reg: firstReg, member };
  }, [selectedRowKeys, enrichedRegistrations, allMembers]);

  const bulkPreviewHtml = useMemo(() => {
    if (!firstSelectedRegAndMember) return '';
    return buildEmailHtml(
      firstSelectedRegAndMember.reg,
      firstSelectedRegAndMember.member,
      emailDiaDiem,
      emailThoiGian,
      emailLienHe
    );
  }, [firstSelectedRegAndMember, emailDiaDiem, emailThoiGian, emailLienHe]);

  const handleBulkPreviewEmail = () => {
    if (selectedRowKeys.length === 0) return;
    const tomorrow = dayjs().add(1, 'day').format('DD/MM/YYYY');
    const defaultDiaDiem = 'Văn phòng Đảng ủy Trường ĐH Kinh tế (Phòng H208)';
    const defaultThoiGian = `08:00 - 11:30 ngày ${tomorrow}`;
    const defaultLienHe = `Đ/c ${currentUser?.name || ''} - Nhóm hồ sơ sinh hoạt Đảng - SĐT: ${currentUser?.so_dien_thoai || '0969754149'} - Email: ${currentUser?.email || ''}`;

    setEmailDiaDiem(defaultDiaDiem);
    setEmailThoiGian(defaultThoiGian);
    setEmailLienHe(defaultLienHe);
    setBulkEmailPreviewVisible(true);
  };

  const handleConfirmBulkSendEmail = async () => {
    setBulkEmailSending(true);
    try {
      const selectedRegs = enrichedRegistrations.filter(r => selectedRowKeys.includes(r.id));
      let successCount = 0;
      let emailSuccessCount = 0;

      for (const reg of selectedRegs) {
        const member = getMemberForReg(reg);
        const to = member.email || member.email_sv || '';
        
        // 1. Update state in Firebase
        await updateDoc(doc(db, "dangky_213", reg.id), {
          trang_thai: 'cho_den_nhan',
          updated_at: new Date().toISOString()
        });

        // 2. Add notification in Firebase
        await addDoc(collection(db, "notifications"), {
          title: `Đăng ký 213 đã xử lý xong`,
          content: `Kính gửi đồng chí ${member.ho_ten || ''}. Giấy đăng ký theo quy định 213 về việc giữ mối liên hệ với tổ chức đảng và nhân dân nơi cư trú đã được Chi bộ Xử lý hoàn tất. Đồng chí vui lòng đến nhận giấy tại ${emailDiaDiem || 'Văn phòng Đảng ủy Trường ĐH Kinh tế (Phòng H208)'} vào lúc ${emailThoiGian || 'trong giờ hành chính'}. Trân trọng./. Mọi thắc mắc xin vui lòng liên hệ: ${emailLienHe || 'Ban Chấp hành Chi bộ'}.`,
          type: 'dangky_213',
          target_user_id: reg.user_id,
          created_at: new Date().toISOString()
        });

        // 3. Send email
        if (to) {
          const html = buildEmailHtml(reg, member, emailDiaDiem, emailThoiGian, emailLienHe);
          try {
            const res = await fetch('https://chibosinhvien.onrender.com/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to,
                subject: `THÔNG BÁO NHẬN GIẤY 213`,
                html
              })
            });
            if (res.ok) {
              emailSuccessCount++;
            }
          } catch (emailErr) {
            console.warn(`Không gửi được email cho ${member.ho_ten}:`, emailErr);
          }
        }
        successCount++;
      }

      message.success(`Đã cập nhật trạng thái ${successCount} đăng ký thành công! Gửi email thành công đến ${emailSuccessCount}/${successCount} đồng chí.`);
      setBulkEmailPreviewVisible(false);
      setSelectedRowKeys([]);
      await fetchRegistrations();
    } catch (e) {
      console.error(e);
      message.error('Lỗi khi gửi email hàng loạt: ' + e.message);
    } finally {
      setBulkEmailSending(false);
    }
  };



  // ================================================================
  // RENDER: LOADING
  // ================================================================

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 120 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#8c8c8c' }}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  // ================================================================
  // STYLES
  // ================================================================

  const cardStyle = {
    marginBottom: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    borderRadius: 12,
    border: '1px solid #f0f0f0'
  };

  const headStyle = {
    borderBottom: '2px solid #c62828',
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: '0 20px',
    minHeight: 48,
    fontSize: 15,
    color: '#c62828',
    fontWeight: 700
  };

  const readOnlyFieldStyle = { marginBottom: 14 };
  const readOnlyLabelStyle = { color: '#8c8c8c', fontSize: 12, marginBottom: 2, fontWeight: 600, letterSpacing: '0.3px' };
  const readOnlyValueStyle = { fontWeight: 600, fontSize: 14, color: '#262626', padding: '6px 12px', backgroundColor: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' };

  // ================================================================
  // RENDER: TAG TRẠNG THÁI (dùng SVG icon)
  // ================================================================

  const renderStatusTag = (val) => {
    const cfg = TRANG_THAI_CONFIG[val] || TRANG_THAI_CONFIG.da_nhan;
    const IconComp = cfg.Icon;
    return (
      <Tag
        style={{
          fontWeight: 700, borderRadius: 6, padding: '3px 10px',
          color: cfg.color, backgroundColor: cfg.bgColor, borderColor: cfg.borderColor, fontSize: 12,
          display: 'inline-flex', alignItems: 'center', gap: 4
        }}
      >
        <IconComp style={{ fontSize: 13 }} /> {cfg.label}
      </Tag>
    );
  };

  // ================================================================
  // RENDER: ĐẢNG VIÊN VIEW (Form đăng ký + lịch sử)
  // ================================================================

  const renderDangVienView = () => {
    if (!memberData) {
      return (
        <Alert
          message="Chưa liên kết hồ sơ Đảng viên"
          description="Tài khoản của bạn chưa được liên kết với hồ sơ Đảng viên trong hệ thống. Vui lòng liên hệ ban chi ủy."
          type="warning"
          showIcon
          style={{ borderRadius: 8 }}
        />
      );
    }

    return (
      <>
        {/* THÔNG TIN TỰ ĐỘNG */}
        <Card
          title={<><IdcardOutlined style={{ marginRight: 8 }} /> Thông tin Đảng viên (Tự động)</>}
          bordered={false}
          style={cardStyle}
          styles={{ header: headStyle }}
        >
          <Alert
            message="Thông tin bên dưới được tự động lấy từ hồ sơ Đảng viên, không thể chỉnh sửa tại đây."
            type="info"
            showIcon
            style={{ marginBottom: 16, borderRadius: 6, fontSize: 13 }}
          />
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={12} md={8}>
              <div style={readOnlyFieldStyle}>
                <div style={readOnlyLabelStyle}>Họ và tên</div>
                <div style={{ ...readOnlyValueStyle, color: '#c62828', fontWeight: 800 }}>
                  {memberData.ho_ten || '--'}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div style={readOnlyFieldStyle}>
                <div style={readOnlyLabelStyle}>MSSV</div>
                <div style={readOnlyValueStyle}>{memberData.mssv || '--'}</div>
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div style={readOnlyFieldStyle}>
                <div style={readOnlyLabelStyle}>CCCD</div>
                <div style={readOnlyValueStyle}>{memberData.cccd || '--'}</div>
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div style={readOnlyFieldStyle}>
                <div style={readOnlyLabelStyle}>SĐT</div>
                <div style={readOnlyValueStyle}>{memberData.so_dien_thoai || '--'}</div>
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div style={readOnlyFieldStyle}>
                <div style={readOnlyLabelStyle}>Ngày sinh</div>
                <div style={readOnlyValueStyle}>{memberData.ngay_sinh ? dayjs(memberData.ngay_sinh).format('DD/MM/YYYY') : '--'}</div>
              </div>
            </Col>
          </Row>
          <Row gutter={[16, 8]}>
            <Col xs={12} sm={6} md={4}>
              <div style={readOnlyFieldStyle}>
                <div style={readOnlyLabelStyle}>Giới tính</div>
                <div style={readOnlyValueStyle}>{memberData.gioi_tinh || '--'}</div>
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div style={readOnlyFieldStyle}>
                <div style={readOnlyLabelStyle}>Lớp</div>
                <div style={readOnlyValueStyle}>{memberData.lop || '--'}</div>
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div style={readOnlyFieldStyle}>
                <div style={readOnlyLabelStyle}>Khoa</div>
                <div style={readOnlyValueStyle}>{memberData.khoa || '--'}</div>
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div style={readOnlyFieldStyle}>
                <div style={readOnlyLabelStyle}>Nhóm</div>
                <div style={readOnlyValueStyle}>{memberData.nhom || '--'}</div>
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div style={readOnlyFieldStyle}>
                <div style={readOnlyLabelStyle}>Ngày vào Đảng</div>
                <div style={readOnlyValueStyle}>{memberData.ngay_vao_dang ? dayjs(memberData.ngay_vao_dang).format('DD/MM/YYYY') : '--'}</div>
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div style={readOnlyFieldStyle}>
                <div style={readOnlyLabelStyle}>Ngày chính thức</div>
                <div style={readOnlyValueStyle}>
                  {memberData.loai_dang_vien === 'Chính thức' || memberData.ngay_chinh_thuc || memberData.ngay_cong_nhan_dvct ? (
                    (memberData.ngay_chinh_thuc || memberData.ngay_cong_nhan_dvct) ? 
                      dayjs(memberData.ngay_chinh_thuc || memberData.ngay_cong_nhan_dvct).format('DD/MM/YYYY') : 'Chính thức'
                  ) : 'Dự bị'}
                </div>
              </div>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />

          <Row gutter={[16, 8]}>
            <Col xs={24} sm={8}>
              <div style={readOnlyFieldStyle}>
                <div style={readOnlyLabelStyle}>Chi bộ</div>
                <div style={{ ...readOnlyValueStyle, backgroundColor: '#fff1f0', borderColor: '#ffa39e' }}>Sinh viên</div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={readOnlyFieldStyle}>
                <div style={readOnlyLabelStyle}>Đảng ủy bộ phận</div>
                <div style={{ ...readOnlyValueStyle, backgroundColor: '#fff1f0', borderColor: '#ffa39e' }}>Trường Đại học Kinh tế</div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={readOnlyFieldStyle}>
                <div style={readOnlyLabelStyle}>Đảng bộ</div>
                <div style={{ ...readOnlyValueStyle, backgroundColor: '#fff1f0', borderColor: '#ffa39e' }}>Đại học Đà Nẵng</div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* FORM ĐĂNG KÝ */}
        <Card
          title={<><FormOutlined style={{ marginRight: 8 }} /> Đăng ký mẫu 213</>}
          bordered={false}
          style={cardStyle}
          styles={{ header: headStyle }}
        >
          <Form
            form={form}
            layout="vertical"
            size="large"
            initialValues={{ thanh_pho: 'Đà Nẵng' }}
            onValuesChange={(changedValues) => {
              if (changedValues.thanh_pho) {
                setSelectedCity(changedValues.thanh_pho);
                form.setFieldsValue({ phuong: undefined });
              }
            }}
          >
            <Form.Item
              name="loai_dang_ky"
              label={<span style={{ fontWeight: 700 }}>Loại đăng ký <span style={{ color: '#ff4d4f' }}>*</span></span>}
              rules={[{ required: true, message: 'Vui lòng chọn loại đăng ký' }]}
            >
              <Radio.Group buttonStyle="solid" style={{ display: 'flex', gap: 12 }}>
                <Radio.Button value="thuong_tru" style={{ flex: 1, textAlign: 'center', height: 44, lineHeight: '44px', borderRadius: 8, fontWeight: 600 }}>
                  <HomeOutlined style={{ marginRight: 6 }} /> Thường trú
                </Radio.Button>
                <Radio.Button value="tam_tru" style={{ flex: 1, textAlign: 'center', height: 44, lineHeight: '44px', borderRadius: 8, fontWeight: 600 }}>
                  <EnvironmentOutlined style={{ marginRight: 6 }} /> Tạm trú
                </Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Divider orientation="left" style={{ color: '#c62828', fontWeight: 700, fontSize: 14 }}>
              <EnvironmentOutlined /> Địa chỉ cư trú
            </Divider>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="so_nha" label="Số nhà" rules={[{ required: true, message: 'Vui lòng nhập số nhà' }]}>
                  <Input placeholder="VD: 123, 45A, K20/15..." />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="ten_duong" label="Tên đường" rules={[{ required: true, message: 'Vui lòng nhập tên đường' }]}>
                  <Input placeholder="VD: Nguyễn Lương Bằng, Tôn Đức Thắng..." />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="thanh_pho" label="Tỉnh / Thành phố" rules={[{ required: true, message: 'Vui lòng chọn tỉnh / thành phố' }]}>
                  <Select showSearch placeholder="Chọn tỉnh / thành phố"
                    filterOption={(input, option) => option.children?.toString().toLowerCase().includes(input.toLowerCase())}
                  >
                    {PROVINCES.map(prov => (<Option key={prov} value={prov}>{prov}</Option>))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="phuong" label="Phường / Xã" rules={[{ required: true, message: 'Vui lòng chọn phường / xã' }]}>
                  <Select showSearch placeholder="Chọn phường / xã"
                    filterOption={(input, option) => option.children?.toString().toLowerCase().includes(input.toLowerCase())}
                  >
                    {(addressData[selectedCity] || []).map(ward => (<Option key={ward} value={ward}>{ward}</Option>))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="chi_bo_noi_cu_tru" label="Chi bộ nơi cư trú" rules={[{ required: true, message: 'Vui lòng nhập chi bộ nơi cư trú' }]}>
              <Input placeholder="Nhập tên chi bộ nơi cư trú..." />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit} loading={submitting} block
                style={{
                  height: 48, borderRadius: 10, fontWeight: 700, fontSize: 15,
                  background: 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)',
                  border: 'none', boxShadow: '0 4px 14px rgba(198, 40, 40, 0.3)', transition: 'all 0.3s ease'
                }}
              >
                GỬI ĐĂNG KÝ 213
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* LỊCH SỬ ĐĂNG KÝ CỦA TÔI */}
        <Card
          title={<><ClockCircleOutlined style={{ marginRight: 8 }} /> Lịch sử đăng ký của tôi</>}
          bordered={false}
          style={cardStyle}
          styles={{ header: headStyle }}
        >
          {myRegistrations.length === 0 ? (
            <Empty description="Chưa có đăng ký nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Table
              dataSource={myRegistrations}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
              columns={[
                {
                  title: 'Loại', dataIndex: 'loai_dang_ky', width: 120,
                  render: (val) => (
                    <Tag color={val === 'thuong_tru' ? 'blue' : 'purple'} style={{ fontWeight: 600 }}>
                      {val === 'thuong_tru' ? <><HomeOutlined /> Thường trú</> : <><EnvironmentOutlined /> Tạm trú</>}
                    </Tag>
                  )
                },
                { title: 'Địa chỉ', key: 'address', render: (_, r) => buildFullAddress(r) },
                { title: 'Chi bộ nơi cư trú', dataIndex: 'chi_bo_noi_cu_tru', width: 160 },
                { title: 'Ngày gửi', dataIndex: 'created_at', width: 110, render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '--' },
                { title: 'Trạng thái', dataIndex: 'trang_thai', width: 170, render: renderStatusTag },
                {
                  title: 'Hành động',
                  key: 'action',
                  width: 200,
                  render: (_, r) => {
                    if (r.trang_thai === 'cho_den_nhan') {
                      return (
                        <Button 
                          type="primary" 
                          size="small" 
                          icon={<CheckCircleOutlined />}
                          onClick={() => handleOpenCompletionModal(r)}
                          style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', borderRadius: '5px', fontWeight: 600 }}
                        >
                          Xác nhận đã nộp
                        </Button>
                      );
                    }
                    if (r.trang_thai === 'hoan_thanh') {
                      return (
                        <Tooltip title={
                          <div>
                            <div>Bí thư: {r.ten_bi_thu_cu_tru || 'Chưa rõ'}</div>
                            <div>SĐT: {r.sdt_bi_thu_cu_tru || 'Chưa rõ'}</div>
                          </div>
                        }>
                          <Tag color="purple" style={{ fontWeight: 700, borderRadius: '4px', cursor: 'pointer' }}>
                            ✓ Đã hoàn thành nộp
                          </Tag>
                        </Tooltip>
                      );
                    }
                    return <span style={{ color: '#8c8c8c' }}>--</span>;
                  }
                }
              ]}
            />
          )}
        </Card>
      </>
    );
  };

  // ================================================================
  // RENDER: ADMIN TABLE COLUMNS
  // ================================================================

  const adminColumns = [
    { title: 'STT', key: 'stt', width: 55, fixed: 'left', render: (_, __, idx) => idx + 1 },
    {
      title: 'Họ tên', dataIndex: 'ho_ten', key: 'ho_ten', width: 160, fixed: 'left',
      sorter: (a, b) => (a.ho_ten || '').localeCompare(b.ho_ten || ''),
      render: (text, record) => (
        <a style={{ fontWeight: 700, color: '#1890ff' }} onClick={() => handleViewDetail(record)}>
          {text}
        </a>
      )
    },
    { title: 'MSSV', dataIndex: 'mssv', width: 120, sorter: (a, b) => (a.mssv || '').localeCompare(b.mssv || '') },
    { title: 'CCCD', dataIndex: 'cccd', width: 130 },
    { title: 'SĐT', dataIndex: 'so_dien_thoai', width: 110 },
    { title: 'Lớp', dataIndex: 'lop', width: 100 },
    { title: 'Khoa', dataIndex: 'khoa', width: 120 },
    { title: 'Nhóm', dataIndex: 'nhom', width: 130 },
    { title: 'Ngày sinh', dataIndex: 'ngay_sinh', width: 105, render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '--' },
    { title: 'GT', dataIndex: 'gioi_tinh', width: 60 },
    {
      title: 'Loại ĐK', dataIndex: 'loai_dang_ky', width: 110,
      filters: [{ text: 'Thường trú', value: 'thuong_tru' }, { text: 'Tạm trú', value: 'tam_tru' }],
      onFilter: (value, record) => record.loai_dang_ky === value,
      render: (val) => (
        <Tag color={val === 'thuong_tru' ? 'blue' : 'purple'} style={{ fontWeight: 600, borderRadius: 4 }}>
          {val === 'thuong_tru' ? 'Thường trú' : 'Tạm trú'}
        </Tag>
      )
    },
    {
      title: 'Địa chỉ cư trú', dataIndex: 'full_address', width: 250, ellipsis: true,
      render: (text) => (<Tooltip title={text}><span>{text}</span></Tooltip>)
    },
    { title: 'Chi bộ nơi cư trú', dataIndex: 'chi_bo_noi_cu_tru', width: 160 },
    {
      title: 'Bí thư nơi cư trú',
      key: 'bi_thu_cu_tru',
      width: 230,
      render: (_, r) => r.ten_bi_thu_cu_tru ? (
        <div>
          <div style={{ fontWeight: 700, color: '#555' }}>{r.ten_bi_thu_cu_tru}</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>SĐT: {r.sdt_bi_thu_cu_tru || '--'}</div>
        </div>
      ) : <span style={{ color: '#bfbfbf' }}>Chưa khai báo</span>
    },
    {
      title: 'Ngày gửi', dataIndex: 'created_at', width: 105,
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '--'
    },
    { title: 'Trạng thái', dataIndex: 'trang_thai', width: 170, fixed: 'right', render: renderStatusTag },
    {
      title: 'Thao tác', key: 'action', width: 340, fixed: 'right',
      render: (_, record) => (
        <Space size={4} wrap>
          {/* Xem trước */}
          <Button size="small" icon={<EyeOutlined />}
            onClick={() => handleOpenDocPreview(record)}
            style={{ borderRadius: 5, fontWeight: 600, fontSize: 11, color: '#eb2f96', borderColor: '#ffadd2' }}
          >
            Xem trước
          </Button>

          {/* Xuất Word luôn hiển thị */}
          <Button size="small" icon={<FileWordOutlined />} loading={exportingId === record.id}
            onClick={() => handleExportWord(record)}
            style={{ borderRadius: 5, fontWeight: 600, fontSize: 11, color: '#1890ff', borderColor: '#1890ff' }}
          >
            Xuất Word
          </Button>

          {/* Chuyển trạng thái thủ công */}
          {record.trang_thai === 'da_nhan' && (
            <Button size="small" icon={<FileDoneOutlined />}
              onClick={() => handleChangeStatus(record, 'da_lam')}
              style={{ borderRadius: 5, fontWeight: 600, fontSize: 11, color: '#1890ff', borderColor: '#91d5ff' }}
            >
              Đã làm
            </Button>
          )}
          {record.trang_thai === 'da_lam' && (
            <Button size="small" icon={<EyeOutlined />}
              onClick={() => handlePreviewEmail(record)}
              style={{ borderRadius: 5, fontWeight: 600, fontSize: 11, color: '#52c41a', borderColor: '#52c41a' }}
            >
              Gửi thông báo
            </Button>
          )}
          {record.trang_thai === 'cho_den_nhan' && (
            <Tag color="green" style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <CheckCircleOutlined /> Đã thông báo
            </Tag>
          )}
        </Space>
      )
    }
  ];

  // ================================================================
  // RENDER: ADMIN VIEW
  // ================================================================

  const renderAdminView = () => {
    const totalCount = registrations.length;
    const daNhanCount = registrations.filter(r => r.trang_thai === 'da_nhan').length;
    const daLamCount = registrations.filter(r => r.trang_thai === 'da_lam').length;
    const choNhanCount = registrations.filter(r => r.trang_thai === 'cho_den_nhan').length;

    const statItems = [
      { label: 'Tổng đăng ký', value: totalCount, color: '#c62828', bgColor: '#fff1f0', Icon: AppstoreOutlined },
      { label: 'Đã nhận', value: daNhanCount, color: '#faad14', bgColor: '#fffbe6', Icon: InboxOutlined },
      { label: 'Đã làm', value: daLamCount, color: '#1890ff', bgColor: '#e6f7ff', Icon: FileDoneOutlined },
      { label: 'Chờ đến nhận', value: choNhanCount, color: '#52c41a', bgColor: '#f6ffed', Icon: BellOutlined },
    ];

    return (
      <>
        {/* Stats Cards */}
        <Row gutter={16} style={{ marginBottom: 20 }}>
          {statItems.map((stat, idx) => (
            <Col xs={12} sm={6} key={idx}>
              <div style={{
                backgroundColor: stat.bgColor, borderRadius: 12, padding: '16px 20px',
                border: `1px solid ${stat.color}22`, textAlign: 'center', transition: 'transform 0.2s', cursor: 'default'
              }}>
                <stat.Icon style={{ fontSize: 28, color: stat.color, marginBottom: 4 }} />
                <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 600 }}>{stat.label}</div>
              </div>
            </Col>
          ))}
        </Row>

        {/* Filters + Bulk Actions */}
        <Card bordered={false} style={{ ...cardStyle, marginBottom: 16 }} bodyStyle={{ padding: '12px 20px' }}>
          <Row gutter={12} align="middle">
            <Col flex="auto">
              <Space wrap size={8}>
                <Input
                  placeholder="Tìm kiếm MSSV, họ tên..."
                  prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                  allowClear
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 260, borderRadius: 8 }}
                />
                <Select value={filterStatus} onChange={setFilterStatus} style={{ width: 200 }}
                  options={[
                    { value: 'all', label: 'Tất cả trạng thái' },
                    { value: 'da_nhan', label: 'Đã nhận' },
                    { value: 'da_lam', label: 'Đã làm' },
                    { value: 'cho_den_nhan', label: 'Chờ đến nhận' },
                  ]}
                />
                {selectedRowKeys.length > 0 && (
                  <>
                    <Button type="primary" icon={<DownloadOutlined />} onClick={handleBulkExport} loading={bulkExporting}
                      style={{ borderRadius: 8, fontWeight: 600, backgroundColor: '#1890ff', borderColor: '#1890ff' }}
                    >
                      Xuất {selectedRowKeys.length} giấy → 1 file Word
                    </Button>
                    <Button type="primary" icon={<MailOutlined />} onClick={handleBulkPreviewEmail}
                      style={{ borderRadius: 8, fontWeight: 600, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                    >
                      Gửi email thông báo ({selectedRowKeys.length} người)
                    </Button>
                  </>
                )}
              </Space>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={handleExportExcel}
                  style={{ borderRadius: 8, fontWeight: 600, color: '#52c41a', borderColor: '#52c41a' }}
                >
                  {selectedRowKeys.length > 0 ? `Xuất ${selectedRowKeys.length} dòng Excel` : 'Xuất Excel'}
                </Button>
                <Button icon={<ReloadOutlined />}
                  onClick={async () => {
                    setLoading(true);
                    await fetchRegistrations();
                    await fetchAllMembers();
                    setLoading(false);
                    message.success('Đã tải lại dữ liệu!');
                  }}
                  style={{ borderRadius: 8 }}
                >
                  Tải lại
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Table with row selection for bulk export */}
        <Card bordered={false} style={cardStyle} bodyStyle={{ padding: 0 }}>
          <Table
            dataSource={filteredRegistrations}
            columns={adminColumns}
            rowKey="id"
            scroll={{ x: 2400 }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              selections: [Table.SELECTION_ALL, Table.SELECTION_NONE],
            }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total) => <span style={{ fontWeight: 600 }}>Tổng: {total} đăng ký</span>
            }}
            size="small"
            style={{ borderRadius: 12, overflow: 'hidden' }}
            rowClassName={(_, idx) => idx % 2 === 0 ? '' : 'ant-table-row-striped'}
          />
        </Card>
      </>
    );
  };

  // ================================================================
  // RENDER: MAIN
  // ================================================================

  return (
    <div>
      <style>{`
        .ant-table-row-striped td {
          background-color: #fafafa !important;
        }
        .ant-radio-button-wrapper-checked {
          background: #c62828 !important;
          border-color: #c62828 !important;
          color: white !important;
        }
        .ant-radio-button-wrapper-checked::before {
          background-color: #c62828 !important;
        }
        .a4-paper-container {
          background-color: #525659;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          overflow-y: auto;
          max-height: 75vh;
          border-radius: 8px;
          border: 1px solid #3c4043;
        }
        .a4-paper {
          background: #fff;
          width: 210mm;
          min-height: 297mm;
          padding: 20mm 15mm 20mm 25mm;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          font-family: 'Times New Roman', Times, serif;
          color: #000;
          line-height: 1.45;
          font-size: 12.5pt;
          box-sizing: border-box;
        }
        .a4-paper h1, .a4-paper h2, .a4-paper h3, .a4-paper p, .a4-paper td, .a4-paper div {
          font-family: 'Times New Roman', Times, serif !important;
          color: #000 !important;
        }
        .a4-header-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
          margin-bottom: 20px;
        }
        .a4-header-table td {
          border: none;
          padding: 0;
          vertical-align: top;
          text-align: center;
        }
        .a4-title {
          text-align: center;
          font-size: 16pt;
          font-weight: bold;
          margin-top: 15px;
          margin-bottom: 25px;
          letter-spacing: 0.5px;
        }
        .a4-recipient-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
          margin-bottom: 20px;
        }
        .a4-recipient-table td {
          border: none;
          padding: 2px 0;
          vertical-align: top;
          font-size: 12.5pt;
        }
        .a4-body-text {
          text-indent: 1cm;
          text-align: justify;
          margin-bottom: 15px;
          font-size: 12.5pt;
          line-height: 1.5;
        }
        .a4-org {
          text-align: center;
          font-weight: bold;
          font-size: 12.5pt;
          margin-bottom: 20px;
        }
        .a4-info-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
          margin-bottom: 25px;
        }
        .a4-info-table td {
          border: none;
          padding: 4px 0;
          vertical-align: top;
          font-size: 12.5pt;
        }
        .a4-sig-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
          margin-top: 20px;
        }
        .a4-sig-table td {
          border: none;
          padding: 0;
          vertical-align: top;
          text-align: center;
          font-size: 12.5pt;
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-block', width: '4px', height: '22px', backgroundColor: '#c62828', borderRadius: '2px' }}></span>
          {isAdmin ? 'Quản lý Đăng ký 213' : 'Đăng ký Mẫu 213'}
        </Title>
        {isAdmin && (
          <Badge
            count={registrations.filter(r => r.trang_thai === 'da_nhan').length}
            style={{ backgroundColor: '#faad14' }}
          >
            <Tag color="red" style={{ fontWeight: 700, padding: '4px 12px', borderRadius: 6 }}>
              <FormOutlined /> QUẢN LÝ
            </Tag>
          </Badge>
        )}
      </div>

      {/* Admin: hiển thị CẢ 2 view (đăng ký + quản lý) dùng Tabs */}
      {isAdmin ? (
        <Tabs
          defaultActiveKey="admin"
          type="card"
          items={[
            {
              key: 'admin',
              label: <><UnorderedListOutlined /> Quản lý đăng ký</>,
              children: renderAdminView()
            },
            {
              key: 'myform',
              label: <><FormOutlined /> Đăng ký của tôi</>,
              children: renderDangVienView()
            }
          ]}
        />
      ) : (
        renderDangVienView()
      )}

      {/* EMAIL PREVIEW MODAL */}
      <Modal
        title={<><MailOutlined style={{ marginRight: 8 }} /> Xem trước và tùy chỉnh thông báo Email</>}
        open={emailPreviewVisible}
        onCancel={() => { setEmailPreviewVisible(false); setEmailPreviewData(null); }}
        footer={[
          <Button key="cancel" onClick={() => { setEmailPreviewVisible(false); setEmailPreviewData(null); }}>
            Hủy
          </Button>,
          <Button key="send" type="primary" icon={<SendOutlined />} loading={sendingEmail}
            onClick={handleConfirmSendEmail}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Xác nhận gửi
          </Button>
        ]}
        width={750}
        styles={{ body: { maxHeight: '75vh', overflow: 'auto' } }}
      >
        {emailPreviewData && (
          <div>
            <div style={{ marginBottom: 16, padding: '12px 16px', backgroundColor: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
              <div style={{ marginBottom: 6 }}>
                <Text strong>Người nhận: </Text>
                <Text>{emailPreviewData.to || <Tag color="red">Không có email</Tag>}</Text>
              </div>
              <div>
                <Text strong>Tiêu đề: </Text>
                <Text>{emailPreviewData.subject}</Text>
              </div>
            </div>

            {/* Custom Inputs */}
            <Card title="Nội dung tùy chỉnh mẫu thông báo" size="small" style={{ marginBottom: 16, borderRadius: 8 }} bodyStyle={{ padding: 12 }}>
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12}>
                  <Text strong style={{ fontSize: 13 }}>📍 Đến tại (Địa điểm):</Text>
                  <Input 
                    value={emailDiaDiem} 
                    onChange={(e) => setEmailDiaDiem(e.target.value)} 
                    placeholder="Ví dụ: Văn phòng Chi bộ (Phòng B205)"
                    style={{ marginTop: 4, borderRadius: 6 }}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <Text strong style={{ fontSize: 13 }}>⏰ Vào lúc (Thời gian):</Text>
                  <Input 
                    value={emailThoiGian} 
                    onChange={(e) => setEmailThoiGian(e.target.value)} 
                    placeholder="Ví dụ: 08:00 - 11:30 ngày 28/05/2026"
                    style={{ marginTop: 4, borderRadius: 6 }}
                  />
                </Col>
                <Col xs={24}>
                  <Text strong style={{ fontSize: 13 }}>📞 Mọi thắc mắc xin vui lòng liên hệ:</Text>
                  <Input 
                    value={emailLienHe} 
                    onChange={(e) => setEmailLienHe(e.target.value)} 
                    placeholder="Ví dụ: Đ/c Bí thư Chi bộ hoặc Ban Chấp hành Chi bộ"
                    style={{ marginTop: 4, borderRadius: 6 }}
                  />
                </Col>
              </Row>
            </Card>

            <Divider style={{ margin: '12px 0' }}>Xem trước nội dung Email</Divider>
            <div
              style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, backgroundColor: '#fff' }}
              dangerouslySetInnerHTML={{ __html: emailPreviewData.html }}
            />
          </div>
        )}
      </Modal>

      {/* BULK EMAIL PREVIEW MODAL */}
      <Modal
        title={<><MailOutlined style={{ marginRight: 8 }} /> Gửi thông báo Email hàng loạt ({selectedRowKeys.length} đảng viên)</>}
        open={bulkEmailPreviewVisible}
        onCancel={() => { setBulkEmailPreviewVisible(false); }}
        footer={[
          <Button key="cancel" onClick={() => { setBulkEmailPreviewVisible(false); }}>
            Hủy
          </Button>,
          <Button key="send" type="primary" icon={<SendOutlined />} loading={bulkEmailSending}
            onClick={handleConfirmBulkSendEmail}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Xác nhận gửi hàng loạt
          </Button>
        ]}
        width={750}
        styles={{ body: { maxHeight: '75vh', overflow: 'auto' } }}
      >
        <div>
          <div style={{ marginBottom: 16, padding: '12px 16px', backgroundColor: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
            <div style={{ marginBottom: 6 }}>
              <Text strong>Danh sách nhận ({selectedRowKeys.length} người): </Text>
              <div style={{ marginTop: 6, maxHeight: '60px', overflowY: 'auto', border: '1px solid #e8e8e8', borderRadius: 6, padding: '6px 10px', backgroundColor: '#fff' }}>
                {enrichedRegistrations.filter(r => selectedRowKeys.includes(r.id)).map(r => (
                  <Tag color="blue" key={r.id} style={{ margin: '2px' }}>
                    {r.ho_ten} ({r.mssv})
                  </Tag>
                ))}
              </div>
            </div>
            <div>
              <Text strong>Tiêu đề: </Text>
              <Text>THÔNG BÁO NHẬN GIẤY 213</Text>
            </div>
          </div>

          {/* Custom Inputs */}
          <Card title="Nội dung tùy chỉnh mẫu thông báo hàng loạt" size="small" style={{ marginBottom: 16, borderRadius: 8 }} bodyStyle={{ padding: 12 }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12}>
                <Text strong style={{ fontSize: 13 }}>📍 Đến tại (Địa điểm):</Text>
                <Input 
                  value={emailDiaDiem} 
                  onChange={(e) => setEmailDiaDiem(e.target.value)} 
                  placeholder="Ví dụ: Văn phòng Chi bộ (Phòng B205)"
                  style={{ marginTop: 4, borderRadius: 6 }}
                />
              </Col>
              <Col xs={24} sm={12}>
                <Text strong style={{ fontSize: 13 }}>⏰ Vào lúc (Thời gian):</Text>
                <Input 
                  value={emailThoiGian} 
                  onChange={(e) => setEmailThoiGian(e.target.value)} 
                  placeholder="Ví dụ: 08:00 - 11:30 ngày 28/05/2026"
                  style={{ marginTop: 4, borderRadius: 6 }}
                />
              </Col>
              <Col xs={24}>
                <Text strong style={{ fontSize: 13 }}>📞 Mọi thắc mắc xin vui lòng liên hệ:</Text>
                <Input 
                  value={emailLienHe} 
                  onChange={(e) => setEmailLienHe(e.target.value)} 
                  placeholder="Ví dụ: Đ/c Bí thư Chi bộ hoặc Ban Chấp hành Chi bộ"
                  style={{ marginTop: 4, borderRadius: 6 }}
                />
              </Col>
            </Row>
          </Card>

          {firstSelectedRegAndMember && (
            <>
              <Divider style={{ margin: '12px 0' }}>Xem trước Email (Đảng viên đầu tiên: {firstSelectedRegAndMember.member.ho_ten})</Divider>
              <div
                style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, backgroundColor: '#fff' }}
                dangerouslySetInnerHTML={{ __html: bulkPreviewHtml }}
              />
            </>
          )}
        </div>
      </Modal>

      {/* Modal Xác nhận đã nộp 213 và khai báo Bí thư cư trú */}
      <Modal
        title={<span style={{ fontWeight: 800, color: '#722ed1' }}><CheckCircleOutlined /> Xác nhận hoàn thành nộp Giấy 213</span>}
        open={confirmSubmitModalVisible}
        onOk={handleConfirmCompletion}
        onCancel={() => {
          setConfirmSubmitModalVisible(false);
          setSelectedRegForCompletion(null);
          completionForm.resetFields();
        }}
        confirmLoading={submittingCompletion}
        okText="Xác nhận & Lưu thông tin"
        cancelText="Hủy bỏ"
        okButtonProps={{ style: { backgroundColor: '#722ed1', borderColor: '#722ed1', fontWeight: 700 } }}
      >
        <Alert
          message="Yêu cầu bắt buộc"
          description="Đồng chí vui lòng khai báo đầy đủ thông tin của Bí thư Chi bộ nơi cư trú tiếp nhận Giấy giới thiệu 213 của đồng chí để Chi bộ tiện liên hệ lấy phiếu nhận xét cuối năm."
          type="info"
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
        <Form form={completionForm} layout="vertical">
          <Form.Item
            name="ten_bi_thu_cu_tru"
            label={<span style={{ fontWeight: 700 }}>Họ và tên Bí thư Chi bộ nơi cư trú <span style={{ color: '#ff4d4f' }}>*</span></span>}
            rules={[{ required: true, message: 'Nhập họ và tên Bí thư Chi bộ nơi cư trú' }]}
          >
            <Input placeholder="Nhập họ và tên Bí thư..." />
          </Form.Item>
          <Form.Item
            name="sdt_bi_thu_cu_tru"
            label={<span style={{ fontWeight: 700 }}>Số điện thoại Bí thư Chi bộ nơi cư trú <span style={{ color: '#ff4d4f' }}>*</span></span>}
            rules={[
              { required: true, message: 'Nhập số điện thoại Bí thư Chi bộ nơi cư trú' },
              { pattern: /^[0-9+ ]{9,12}$/, message: 'Số điện thoại không hợp lệ (9 đến 12 số)' }
            ]}
          >
            <Input placeholder="Nhập số điện thoại liên hệ..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* DYNAMIC A4 DOCUMENT PREVIEW MODAL */}
      <Modal
        title={<><EyeOutlined style={{ color: '#eb2f96' }} /> Xem trước và tùy biến Giấy giới thiệu 213 (Đúng chuẩn A4)</>}
        open={docPreviewVisible}
        onCancel={() => { setDocPreviewVisible(false); setDocPreviewReg(null); }}
        width={1250}
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={() => { setDocPreviewVisible(false); setDocPreviewReg(null); }}>
            Đóng
          </Button>,
          <Button 
            key="export" 
            type="primary" 
            icon={<FileWordOutlined />} 
            loading={exportingId === docPreviewReg?.id}
            onClick={() => handleExportWord(docPreviewReg, customFields)}
            style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
          >
            Tải xuống file Word chuẩn (.docx)
          </Button>
        ]}
      >
        {docPreviewReg && docPreviewMember && (
          <Row gutter={[24, 24]}>
            {/* Panel tùy chỉnh bên trái */}
            <Col xs={24} lg={9}>
              <Card title={<><FormOutlined /> Tùy biến nội dung Giấy giới thiệu</>} size="small" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Form layout="vertical" size="small">
                  <Form.Item label={<span style={{ fontWeight: 600 }}>Cơ quan cấp trên (Trái dòng 1)</span>}>
                    <Input value={customFields.line1} onChange={(e) => setCustomFields({ ...customFields, line1: e.target.value })} />
                  </Form.Item>
                  <Form.Item label={<span style={{ fontWeight: 600 }}>Cơ quan giới thiệu (Trái dòng 2 - In đậm)</span>}>
                    <Input value={customFields.line2} onChange={(e) => setCustomFields({ ...customFields, line2: e.target.value })} />
                  </Form.Item>
                  <Row gutter={8}>
                    <Col span={12}>
                      <Form.Item label={<span style={{ fontWeight: 600 }}>Số văn bản</span>}>
                        <Input value={customFields.soGgt} onChange={(e) => setCustomFields({ ...customFields, soGgt: e.target.value })} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label={<span style={{ fontWeight: 600 }}>Ngày</span>}>
                        <Input value={customFields.ngay} onChange={(e) => setCustomFields({ ...customFields, ngay: e.target.value })} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label={<span style={{ fontWeight: 600 }}>Tháng</span>}>
                        <Input value={customFields.thang} onChange={(e) => setCustomFields({ ...customFields, thang: e.target.value })} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label={<span style={{ fontWeight: 600 }}>Năm</span>}>
                        <Input value={customFields.nam} onChange={(e) => setCustomFields({ ...customFields, nam: e.target.value })} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label={<span style={{ fontWeight: 600 }}>Kính gửi: Đảng ủy phường/xã</span>}>
                    <Input value={customFields.kinhGuiPhuong} onChange={(e) => setCustomFields({ ...customFields, kinhGuiPhuong: e.target.value })} />
                  </Form.Item>
                  <Form.Item label={<span style={{ fontWeight: 600 }}>Kính gửi: Chi bộ nơi cư trú</span>}>
                    <Input value={customFields.kinhGuiChiBo} onChange={(e) => setCustomFields({ ...customFields, kinhGuiChiBo: e.target.value })} />
                  </Form.Item>
                  <Form.Item label={<span style={{ fontWeight: 600 }}>Văn bản Quy định căn cứ</span>}>
                    <Input.TextArea rows={3} value={customFields.thucHienQuyDinh} onChange={(e) => setCustomFields({ ...customFields, thucHienQuyDinh: e.target.value })} />
                  </Form.Item>
                  <Form.Item label={<span style={{ fontWeight: 600 }}>Đảng ủy giới thiệu (Giữa trang)</span>}>
                    <Input value={customFields.dangBoGioiThieu} onChange={(e) => setCustomFields({ ...customFields, dangBoGioiThieu: e.target.value })} />
                  </Form.Item>
                  <Form.Item label={<span style={{ fontWeight: 600 }}>Đang sinh hoạt tại Chi bộ</span>}>
                    <Input.TextArea rows={2} value={customFields.sinhHoatTaiChiBo} onChange={(e) => setCustomFields({ ...customFields, sinhHoatTaiChiBo: e.target.value })} />
                  </Form.Item>
                  <Form.Item label={<span style={{ fontWeight: 600 }}>Bí thư chi bộ/Đại diện ký tên</span>}>
                    <Input value={customFields.tenBiThu} onChange={(e) => setCustomFields({ ...customFields, tenBiThu: e.target.value })} />
                  </Form.Item>
                </Form>
              </Card>

              {/* Phím tắt đổi trạng thái nhanh */}
              <Card size="small" title="Thao tác nhanh cho hồ sơ" style={{ marginTop: 12, borderRadius: 8, backgroundColor: '#fafafa' }}>
                <Space wrap>
                  {docPreviewReg.trang_thai === 'da_nhan' && (
                    <Button type="primary" size="small" icon={<FileDoneOutlined />}
                      onClick={() => {
                        handleChangeStatus(docPreviewReg, 'da_lam');
                        setDocPreviewVisible(false);
                      }}
                    >
                      Đánh dấu: Đã làm xong
                    </Button>
                  )}
                  {docPreviewReg.trang_thai === 'da_lam' && (
                    <Button type="primary" size="small" icon={<MailOutlined />} style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                      onClick={() => {
                        setDocPreviewVisible(false);
                        handlePreviewEmail(docPreviewReg);
                      }}
                    >
                      Gửi thông báo Email ngay
                    </Button>
                  )}
                </Space>
              </Card>
            </Col>

            {/* A4 Paper mockup bên phải */}
            <Col xs={24} lg={15}>
              <div className="a4-paper-container">
                <div className="a4-paper">
                  {/* Header 2 columns */}
                  <table className="a4-header-table">
                    <tbody>
                      <tr>
                        <td style={{ width: '45%', textAlign: 'center', verticalAlign: 'top' }}>
                          <div style={{ fontSize: '11pt' }}>{customFields.line1}</div>
                          <div style={{ fontSize: '11pt', fontWeight: 'bold' }}>{customFields.line2}</div>
                          <div style={{ fontSize: '11pt', margin: '3px 0' }}>*</div>
                          <div style={{ fontSize: '11pt' }}>{customFields.soGgt}</div>
                        </td>
                        <td style={{ width: '55%', textAlign: 'center', verticalAlign: 'top' }}>
                          <div style={{ fontSize: '11pt', fontWeight: 'bold', textDecoration: 'underline', letterSpacing: '0.5px' }}>ĐẢNG CỘNG SẢN VIỆT NAM</div>
                          <div style={{ fontSize: '11pt', fontStyle: 'italic', marginTop: '12px' }}>
                            Đà Nẵng, ngày {customFields.ngay}&nbsp;&nbsp;tháng {customFields.thang}&nbsp;&nbsp;năm {customFields.nam}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* GIẤY GIỚI THIỆU */}
                  <div className="a4-title">GIẤY GIỚI THIỆU</div>

                  {/* Kính gửi - dùng bảng để căn thẳng */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: '11.5pt' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '90px', fontStyle: 'italic', whiteSpace: 'nowrap', verticalAlign: 'top', paddingLeft: '30px' }}><em>Kính gửi</em>:</td>
                        <td style={{ verticalAlign: 'top' }}>- {customFields.kinhGuiPhuong}</td>
                      </tr>
                      <tr>
                        <td style={{ paddingLeft: '30px' }}></td>
                        <td style={{ paddingBottom: 8 }}>- {customFields.kinhGuiChiBo}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Căn cứ */}
                  <div className="a4-body-text" style={{ textIndent: '30px', textAlign: 'justify', fontSize: '11.5pt', lineHeight: 1.45, marginBottom: 15 }}>
                    {customFields.thucHienQuyDinh}
                  </div>

                  {/* BAN CHẤP HÀNH */}
                  <div className="a4-org" style={{ textTransform: 'uppercase', fontSize: '11.5pt', fontWeight: 'bold', textAlign: 'center', marginBottom: 15 }}>
                    {customFields.dangBoGioiThieu}
                  </div>

                  {/* Thông tin Đảng viên - bảng 3 cột: indent | label (cố định) | : value */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: '11.5pt', lineHeight: 1.6 }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '28px', verticalAlign: 'top' }}></td>
                        <td style={{ width: '190px', verticalAlign: 'top' }}>Giới thiệu đồng chí</td>
                        <td style={{ width: '16px', verticalAlign: 'top' }}>:</td>
                        <td style={{ fontWeight: 'bold', verticalAlign: 'top' }}>{docPreviewMember.ho_ten || '...'}</td>
                      </tr>
                      <tr>
                        <td></td>
                        <td style={{ verticalAlign: 'top' }}>Nam, nữ</td>
                        <td style={{ verticalAlign: 'top' }}>:</td>
                        <td>{docPreviewMember.gioi_tinh || '...'}</td>
                      </tr>
                      <tr>
                        <td></td>
                        <td style={{ verticalAlign: 'top' }}>Sinh ngày</td>
                        <td style={{ verticalAlign: 'top' }}>:</td>
                        <td>{docPreviewMember.ngay_sinh ? dayjs(docPreviewMember.ngay_sinh).format('DD/MM/YYYY') : '...'}</td>
                      </tr>
                      <tr>
                        <td></td>
                        <td style={{ verticalAlign: 'top' }}>Kết nạp vào Đảng ngày</td>
                        <td style={{ verticalAlign: 'top' }}>:</td>
                        <td>{docPreviewMember.ngay_vao_dang ? dayjs(docPreviewMember.ngay_vao_dang).format('DD/MM/YYYY') : '...'}</td>
                      </tr>
                      {(() => {
                        const ngayChinhThuc = docPreviewMember.ngay_chinh_thuc || docPreviewMember.ngay_cong_nhan_dvct;
                        const hasNgayChinhThuc = ngayChinhThuc && 
                          typeof ngayChinhThuc === 'string' &&
                          !ngayChinhThuc.includes('Chưa') && 
                          ngayChinhThuc !== 'undefined' && 
                          ngayChinhThuc.trim() !== '';
                        return hasNgayChinhThuc ? (
                          <tr>
                            <td></td>
                            <td style={{ verticalAlign: 'top' }}>Chính thức ngày</td>
                            <td style={{ verticalAlign: 'top' }}>:</td>
                            <td>{dayjs(ngayChinhThuc).format('DD/MM/YYYY')}</td>
                          </tr>
                        ) : null;
                      })()}
                      <tr>
                        <td style={{ verticalAlign: 'top' }}></td>
                        <td style={{ verticalAlign: 'top' }}>Đang sinh hoạt đảng tại Chi bộ</td>
                        <td style={{ verticalAlign: 'top' }}>:</td>
                        <td style={{ verticalAlign: 'top' }}>{customFields.sinhHoatTaiChiBo}</td>
                      </tr>
                      <tr>
                        <td style={{ verticalAlign: 'top' }}></td>
                        <td style={{ verticalAlign: 'top' }}>Hiện cư trú tại</td>
                        <td style={{ verticalAlign: 'top' }}>:</td>
                        <td style={{ verticalAlign: 'top' }}>{[[docPreviewReg.so_nha, docPreviewReg.ten_duong].filter(Boolean).join(' '), docPreviewReg.phuong, docPreviewReg.thanh_pho || 'Đà Nẵng'].filter(Boolean).join(', ')} về sinh hoạt nơi cư trú.</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Đề nghị */}
                  <div style={{ textIndent: '30px', textAlign: 'justify', fontSize: '11.5pt', lineHeight: 1.55, marginBottom: 20 }}>
                    Đề nghị các đồng chí tiếp nhận và tạo điều kiện cho đảng viên <span style={{ fontWeight: 'bold' }}>{docPreviewMember.ho_ten}</span> hoàn thành nhiệm vụ.
                  </div>

                  {/* Ký tên - theo đúng ảnh mẫu */}
                  <table className="a4-sig-table" style={{ marginTop: 10, width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {/* Row 0: ĐẢNG ỦY NƠI CƯ TRÚ | T/M ĐẢNG ỦY */}
                      <tr style={{ verticalAlign: 'top' }}>
                        <td style={{ width: '50%', textAlign: 'center' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '11.5pt' }}>ĐẢNG ỦY NƠI CƯ TRÚ</div>
                        </td>
                        <td style={{ width: '50%', textAlign: 'center' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '11.5pt' }}>T/M ĐẢNG ỦY</div>
                        </td>
                      </tr>
                      {/* Row 1: Tiếp nhận ngày ... | BÍ THƯ */}
                      <tr style={{ verticalAlign: 'top' }}>
                        <td style={{ textAlign: 'left', paddingLeft: '20px' }}>
                          <div style={{ fontSize: '11pt' }}>Tiếp nhận ngày ………………………</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '11.5pt' }}>BÍ THƯ</div>
                        </td>
                      </tr>
                      {/* Row 2: Đã giới thiệu... | (Trống) */}
                      <tr style={{ verticalAlign: 'top' }}>
                        <td style={{ textAlign: 'left', paddingLeft: '20px' }}>
                          <div style={{ fontSize: '11pt' }}>Đã giới thiệu về sinh hoạt tại Chi bộ</div>
                        </td>
                        <td style={{ textAlign: 'center', height: '20px' }}></td>
                      </tr>
                      {/* Row 3: Dòng kẻ... | (Trống) */}
                      <tr style={{ verticalAlign: 'top' }}>
                        <td style={{ textAlign: 'left', paddingLeft: '20px' }}>
                          <div style={{ fontSize: '11pt' }}>─────────────────────────</div>
                        </td>
                        <td style={{ textAlign: 'center', height: '20px' }}></td>
                      </tr>
                      {/* Row 4: T/M ĐẢNG ỦY | (Trống) */}
                      <tr style={{ verticalAlign: 'top' }}>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '11.5pt' }}>T/M ĐẢNG ỦY</div>
                        </td>
                        <td style={{ textAlign: 'center', height: '20px' }}></td>
                      </tr>
                      {/* Row 5: BÍ THƯ | Phan Minh Đức (Ngang hàng tuyệt đối!) */}
                      <tr style={{ verticalAlign: 'top' }}>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '11.5pt' }}>BÍ THƯ</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '11.5pt' }}>{customFields.tenBiThu}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </Col>
          </Row>
        )}
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
            <span style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a1a' }}>
              Xác Nhận Thông Tin Đăng Ký 213
            </span>
          </div>
        }
        open={isConfirmRegisterVisible}
        onOk={handleConfirmRegister}
        onCancel={() => setIsConfirmRegisterVisible(false)}
        okText="XÁC NHẬN & GỬI ĐĂNG KÝ"
        cancelText="QUAY LẠI CHỈNH SỬA"
        confirmLoading={submitting}
        okButtonProps={{ style: { backgroundColor: '#c62828', borderColor: '#c62828', height: 40, fontWeight: 700, borderRadius: '6px' } }}
        cancelButtonProps={{ style: { height: 40, borderRadius: '6px' } }}
        width={600}
      >
        <Alert
          message="Vui lòng kiểm tra kỹ các thông tin dưới đây trước khi gửi lên Chi bộ."
          type="warning"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
        
        {registerFormData && (
          <Descriptions
            bordered
            column={1}
            size="small"
            labelStyle={{ fontWeight: 600, backgroundColor: '#fafafa', width: 180 }}
            contentStyle={{ backgroundColor: '#fff' }}
          >
            <Descriptions.Item label="Loại đăng ký">
              <span style={{ fontWeight: 700, color: '#c62828' }}>
                {registerFormData.loai_dang_ky === 'thuong_tru' ? 'Thường trú' : 'Tạm trú'}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Số nhà & Tên đường">
              {[registerFormData.so_nha, registerFormData.ten_duong].filter(Boolean).join(' ') || '--'}
            </Descriptions.Item>
            <Descriptions.Item label="Phường / Xã">
              {registerFormData.phuong || '--'}
            </Descriptions.Item>
            <Descriptions.Item label="Tỉnh / Thành phố">
              {registerFormData.thanh_pho || '--'}
            </Descriptions.Item>
            <Descriptions.Item label="Chi bộ nơi cư trú">
              <span style={{ fontWeight: 600 }}>{registerFormData.chi_bo_noi_cu_tru || '--'}</span>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <DetailModal
        open={isDetailVisible}
        onCancel={() => setIsDetailVisible(false)}
        data={selectedRecord}
      />
    </div>
  );
};

export default DangKy213;
