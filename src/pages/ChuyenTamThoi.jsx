import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Input, Space, Typography, message, Select, Tag, Modal, Form, DatePicker, Radio, Row, Col, Card, Divider, Popconfirm } from 'antd';
import { SearchOutlined, CheckCircleOutlined, FilterOutlined, CloseOutlined, SwapOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { collection, getDocs, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';
import PermissionWrapper from '../components/PermissionWrapper';
import ProfileDrawer from '../components/ProfileDrawer';
import * as XLSX from 'xlsx';

const safeDayjs = (val) => {
  if (!val) return dayjs(null);
  if (val.toDate && typeof val.toDate === 'function') return dayjs(val.toDate());
  if (val.seconds) return dayjs(val.seconds * 1000);
  return dayjs(val);
};

const { Title, Text, Paragraph } = Typography;
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
  { key: 'so_the_dang', label: 'Số thẻ Đảng', group: 'party' },
  { key: 'dang_vien_du_bi', label: 'Loại Đảng viên', group: 'party', isSpecial: 'type' },
  { key: 'trang_thai', label: 'Trạng thái sinh hoạt', group: 'party', isSpecial: 'status' },
  { key: 'dvhd', label: 'Đảng viên hướng dẫn', group: 'party' },
  
  { key: 'ngay_chuyen_tam_thoi', label: 'Ngày chuyển tạm thời', group: 'transfer_temp', isDate: true },
  { key: 'thoi_gian_ve', label: 'Thời gian về dự kiến', group: 'transfer_temp' },
  { key: 'noi_chuyen_den_tam_thoi', label: 'Nơi chuyển đến tạm thời', group: 'transfer_temp' },
  { key: 'ngay_chuyen_ve', label: 'Ngày chuyển về thực tế', group: 'transfer_temp', isDate: true },
  { key: 'trang_thai_tam_thoi', label: 'Trạng thái chuyển sinh hoạt tạm thời', group: 'transfer_temp' },
  { key: 'ghi_chu', label: 'Ghi chú chuyển', group: 'transfer_temp' },

  { key: 'ho_ten_nguoi_than', label: 'Họ tên người thân', group: 'family' },
  { key: 'sdt_nguoi_than', label: 'SĐT người thân', group: 'family' }
];

const FIELD_GROUPS = {
  basic: { label: "Thông tin cơ bản", color: "blue" },
  org: { label: "Học tập & Tổ chức", color: "geekblue" },
  contact: { label: "Liên hệ & Tạm trú", color: "cyan" },
  address: { label: "Thường trú & Quê quán", color: "purple" },
  party: { label: "Thông tin Đảng tịch", color: "red" },
  transfer_temp: { label: "Sinh hoạt tạm thời", color: "green" },
  family: { label: "Gia đình", color: "orange" }
};

const ChuyenTamThoi = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // "all", "dang_di", "da_ve"

  // Return Modal state
  const [isReturnVisible, setIsReturnVisible] = useState(false);
  const [returnForm] = Form.useForm();
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Profile Drawer state
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  
  // Custom Export States
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [exportRange, setExportRange] = useState('filtered'); // 'filtered', 'all', 'selected'
  const [selectedExportFields, setSelectedExportFields] = useState(EXPORT_FIELDS.map(f => f.key));
  
  // selected keys for selection
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "chuyen_tam_thoi"));
      const records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setData(records);
    } catch (error) {
      message.error("Lỗi khi tải lịch sử chuyển sinh hoạt tạm thời");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (record) => {
    if (!record.dang_vien_id) {
      message.error("Không tìm thấy ID Đảng viên");
      return;
    }
    try {
      setLoading(true);
      const docRef = doc(db, "dang_vien", record.dang_vien_id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSelectedProfile({
          id: docSnap.id,
          ...docSnap.data()
        });
        setIsProfileVisible(true);
      } else {
        message.error("Không tìm thấy thông tin Đảng viên trong hệ thống");
      }
    } catch (error) {
      message.error("Lỗi khi tải thông tin Đảng viên");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    if (dateString.toDate) return dayjs(dateString.toDate()).format('DD/MM/YYYY');
    if (dateString.seconds) return dayjs(dateString.seconds * 1000).format('DD/MM/YYYY');
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const handleConfirmReturn = async () => {
    try {
      const values = await returnForm.validateFields();
      setLoading(true);

      const formattedDate = values.ngay_chuyen_ve ? values.ngay_chuyen_ve.format('YYYY-MM-DD') : null;

      if (!selectedRecord) return;

      // 1. Update history log in chuyen_tam_thoi
      await updateDoc(doc(db, "chuyen_tam_thoi", selectedRecord.id), {
        ngay_chuyen_ve: formattedDate,
        trang_thai: 'da_ve',
        updated_at: new Date().toISOString()
      });

      // 2. Restore active status of the member
      await updateDoc(doc(db, "dang_vien", selectedRecord.dang_vien_id), {
        trang_thai_tam_thoi: null,
        updated_at: new Date().toISOString()
      });

      message.success(`Đồng chí ${selectedRecord.ho_ten} đã trở lại sinh hoạt Chi bộ.`);
      setIsReturnVisible(false);
      returnForm.resetFields();
      setSelectedRecord(null);
      fetchHistory();
    } catch (error) {
      if (error.name === 'ValidationError') return;
      message.error("Lỗi khi xác nhận trở lại");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReset = async () => {
    try {
      setLoading(true);
      await Promise.all(selectedRowKeys.map(async (id) => {
        const record = data.find(r => r.id === id);
        if (record && record.dang_vien_id) {
          await updateDoc(doc(db, "dang_vien", record.dang_vien_id), {
            trang_thai_tam_thoi: null,
            updated_at: new Date().toISOString()
          });
        }
        await deleteDoc(doc(db, "chuyen_tam_thoi", id));
      }));
      message.success(`Đã khôi phục trạng thái sinh hoạt cho ${selectedRowKeys.length} Đảng viên thành công.`);
      setSelectedRowKeys([]);
      fetchHistory();
    } catch (error) {
      message.error("Lỗi khi reset hàng loạt");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExportModal = () => {
    setSelectedExportFields(EXPORT_FIELDS.map(f => f.key));
    setExportRange('filtered');
    setIsExportModalVisible(true);
  };

  const exportExcel = async () => {
    let dataToExport = [];
    if (exportRange === 'selected') {
      dataToExport = (data || []).filter(item => selectedRowKeys.includes(item.id));
    } else if (exportRange === 'all') {
      dataToExport = data;
    } else {
      dataToExport = filteredData;
    }

    if (dataToExport.length === 0) {
      message.warning("Không có dữ liệu để xuất!");
      return;
    }

    try {
      setLoading(true);
      // Fetch full member details from dang_vien for each row to export comprehensive fields
      const dvSnapshot = await getDocs(collection(db, "dang_vien"));
      const allMembers = dvSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const mappedData = dataToExport.map(item => {
        const fullMember = allMembers.find(m => m.id === item.dang_vien_id) || {};
        const normItem = {
          ...fullMember,
          ...item,
          ho_ten: item.ho_ten || fullMember.ho_ten || '',
          so_dien_thoai: item.so_dien_thoai || fullMember.so_dien_thoai || '',
          ngay_sinh: item.ngay_sinh || fullMember.ngay_sinh || null,
          que_quan: item.que_quan || fullMember.que_quan || '',
          ngay_vao_dang: item.ngay_vao_dang || fullMember.ngay_vao_dang || null,
          dvhd: item.dvhd || fullMember.dvhd || '',
          so_the_dang: item.so_the_dang || fullMember.so_the_dang || '',
          ngay_chinh_thuc: item.ngay_chinh_thuc || fullMember.ngay_chinh_thuc || null,
          dang_vien_du_bi: fullMember.hasOwnProperty('dang_vien_du_bi') ? !!fullMember.dang_vien_du_bi : true,
          trang_thai: fullMember.trang_thai || 'dang_sinh_hoat',
          trang_thai_tam_thoi: item.trang_thai === 'dang_di' ? 'Đang đi sinh hoạt tạm thời' : 'Đã chuyển về',
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
      XLSX.utils.book_append_sheet(wb, ws, "ChuyenTamThoi");
      XLSX.writeFile(wb, "DanhSachDangVienChuyenTamThoi_TuyChinh.xlsx");
      
      setIsExportModalVisible(false);
      message.success(`Xuất Excel thành công ${dataToExport.length} dòng!`);
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi xuất dữ liệu");
    } finally {
      setLoading(false);
    }
  };
  const filteredData = useMemo(() => {
    const result = data.filter(item => {
      const matchSearch = item.mssv?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.ho_ten?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.noi_chuyen_den_tam_thoi?.toLowerCase().includes(searchText.toLowerCase());

      const matchStatus = filterStatus === 'all' ? true :
        filterStatus === 'dang_di' ? item.trang_thai === 'dang_di' :
          filterStatus === 'da_ve' ? item.trang_thai === 'da_ve' : true;

      return matchSearch && matchStatus;
    });

    result.sort((a, b) => {
      const dateA = a.ngay_chuyen_tam_thoi ? safeDayjs(a.ngay_chuyen_tam_thoi).valueOf() : 0;
      const dateB = b.ngay_chuyen_tam_thoi ? safeDayjs(b.ngay_chuyen_tam_thoi).valueOf() : 0;
      return dateB - dateA; // Show latest first
    });

    return result;
  }, [data, searchText, filterStatus]);

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      render: (_, __, index) => index + 1
    },
    {
      title: 'Họ tên & MSSV',
      key: 'ho_ten_mssv',
      sorter: (a, b) => (a.ho_ten || '').localeCompare(b.ho_ten || ''),
      render: (_, r) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text style={{ color: '#1890ff', fontWeight: 500 }}>{r.ho_ten || '--'}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{r.mssv || '--'}</Text>
        </div>
      )
    },
    {
      title: 'Lớp & Khoa',
      key: 'lop_khoa',
      sorter: (a, b) => (a.lop || '').localeCompare(b.lop || ''),
      render: (_, r) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 500 }}>{r.lop || '--'}</span>
          <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{r.khoa || '--'}</span>
        </div>
      )
    },
    {
      title: 'Ngày chuyển tạm thời',
      dataIndex: 'ngay_chuyen_tam_thoi',
      key: 'ngay_chuyen_tam_thoi',
      render: (text) => formatDate(text),
      sorter: (a, b) => safeDayjs(a.ngay_chuyen_tam_thoi).valueOf() - safeDayjs(b.ngay_chuyen_tam_thoi).valueOf()
    },
    {
      title: 'Thời gian về dự kiến',
      dataIndex: 'thoi_gian_ve',
      key: 'thoi_gian_ve',
    },
    {
      title: 'Nơi chuyển đến',
      dataIndex: 'noi_chuyen_den_tam_thoi',
      key: 'noi_chuyen_den_tam_thoi',
      sorter: (a, b) => (a.noi_chuyen_den_tam_thoi || '').localeCompare(b.noi_chuyen_den_tam_thoi || '')
    },
    {
      title: 'Ngày chuyển về thực tế',
      dataIndex: 'ngay_chuyen_ve',
      key: 'ngay_chuyen_ve',
      render: (text) => text ? (
        <Tag color="green" style={{ borderRadius: '4px', fontWeight: 500 }}>
          {formatDate(text)}
        </Tag>
      ) : (
        <Tag color="orange" style={{ borderRadius: '4px', fontWeight: 500 }}>
          Chưa trở lại
        </Tag>
      )
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 250,
      render: (_, r) => (
        <Space size="small">
          {r.trang_thai === 'dang_di' && (
            <PermissionWrapper module="members" action="transfer">
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRecord(r);
                  setIsReturnVisible(true);
                  returnForm.setFieldsValue({ ngay_chuyen_ve: dayjs() });
                }}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Xác nhận trở lại
              </Button>
            </PermissionWrapper>
          )}
          <PermissionWrapper module="members" action="transfer">
            <Popconfirm
              title="Bạn có chắc chắn muốn reset?"
              description="Hồ sơ chuyển tạm thời này sẽ bị xóa và khôi phục trạng thái sinh hoạt bình thường cho Đảng viên."
              onConfirm={async (e) => {
                // We don't need e.stopPropagation() here because Popconfirm onConfirm doesn't pass native event,
                // but just in case, we will stop propagation or handle it
                try {
                  setLoading(true);
                  if (r.dang_vien_id) {
                    await updateDoc(doc(db, "dang_vien", r.dang_vien_id), {
                      trang_thai_tam_thoi: null,
                      updated_at: new Date().toISOString()
                    });
                  }
                  await deleteDoc(doc(db, "chuyen_tam_thoi", r.id));
                  message.success(`Đã reset trạng thái sinh hoạt cho đồng chí ${r.ho_ten}.`);
                  fetchHistory();
                } catch (error) {
                  message.error("Lỗi khi reset");
                  console.error(error);
                } finally {
                  setLoading(false);
                }
              }}
              onCancel={(e) => e && e.stopPropagation()}
              okText="Reset"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
                style={{ borderRadius: '4px' }}
              >
                Reset
              </Button>
            </Popconfirm>
          </PermissionWrapper>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '4px' }}>

      {/* Row 1: Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', minWidth: '280px' }}>
          <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
          <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.3px' }}>
            Quản lý Đảng viên chuyển sinh hoạt tạm thời
          </Title>
        </div>
        
        <Space size="middle">
          {selectedRowKeys.length > 0 && (
            <PermissionWrapper module="members" action="transfer">
              <Popconfirm
                title={`Reset trạng thái sinh hoạt cho ${selectedRowKeys.length} Đảng viên đã chọn?`}
                description="Các hồ sơ chuyển tạm thời đã chọn sẽ bị xóa và khôi phục trạng thái sinh hoạt bình thường."
                onConfirm={handleBulkReset}
                okText="Reset"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button 
                  danger
                  type="primary" 
                  icon={<DeleteOutlined />} 
                  style={{ borderRadius: '6px' }}
                >
                  Reset trạng thái ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            </PermissionWrapper>
          )}

          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleOpenExportModal}
            style={{ borderRadius: '6px', fontWeight: 500 }}
          >
            Xuất Excel
          </Button>
        </Space>
      </div>

      <Paragraph style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>
      </Paragraph>

      {/* Row 2: Filters Ribbon */}
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

        <div style={{ flex: 1.5, minWidth: '220px' }}>
          <Input
            placeholder="Tìm theo MSSV, họ tên, nơi đến..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            style={{ width: '100%', borderRadius: '6px' }}
            allowClear
          />
        </div>

        <div style={{ flex: 1, minWidth: '180px' }}>
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: '100%' }}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            <Option value="all">Tất cả lịch sử</Option>
            <Option value="dang_di">Đang đi sinh hoạt tạm thời</Option>
            <Option value="da_ve">Đã chuyển về</Option>
          </Select>
        </div>

        {(searchText || filterStatus !== 'all') && (
          <div style={{ flexShrink: 0 }}>
            <Button
              type="text"
              danger
              onClick={() => { setSearchText(""); setFilterStatus("all"); }}
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
        pagination={{
          defaultPageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100', '1000'],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đợt chuyển tạm thời`
        }}
        onRow={(record) => {
          return {
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer' }
          };
        }}
      />

      <Modal
        title="Xác nhận Đảng viên trở lại sinh hoạt"
        open={isReturnVisible}
        onOk={handleConfirmReturn}
        onCancel={() => {
          setIsReturnVisible(false);
          returnForm.resetFields();
          setSelectedRecord(null);
        }}
        okText="Xác nhận trở lại"
        cancelText="Hủy"
        confirmLoading={loading}
      >
        <Form form={returnForm} layout="vertical">
          {selectedRecord && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#e6fffb', border: '1px solid #b5f5ec', borderRadius: '6px' }}>
              Đang xác nhận trở lại cho đồng chí: <strong>{selectedRecord.ho_ten}</strong> (MSSV: {selectedRecord.mssv}) <br />
              Nơi đi tạm thời: <strong>{selectedRecord.noi_chuyen_den_tam_thoi}</strong> (Ngày đi: {formatDate(selectedRecord.ngay_chuyen_tam_thoi)})
            </div>
          )}
          <Form.Item name="ngay_chuyen_ve" label="Ngày chuyển về thực tế" rules={[{ required: true, message: 'Vui lòng chọn ngày trở về thực tế' }]}>
            <DatePicker format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <ProfileDrawer
        open={isProfileVisible}
        onClose={() => setIsProfileVisible(false)}
        data={selectedProfile}
        onUpdate={fetchHistory}
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
                <Col span={12}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Tìm kiếm từ khóa:</div>
                  <Input 
                    placeholder="MSSV, Họ tên, Nơi đến..." 
                    value={searchText} 
                    onChange={e => setSearchText(e.target.value)} 
                    style={{ borderRadius: '6px' }}
                    allowClear
                  />
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Trạng thái:</div>
                  <Select 
                    placeholder="Chọn Trạng thái" 
                    value={filterStatus} 
                    onChange={setFilterStatus} 
                    style={{ width: '100%' }}
                    dropdownStyle={{ borderRadius: '6px' }}
                  >
                    <Option value="all">Tất cả lịch sử</Option>
                    <Option value="dang_di">Đang đi sinh hoạt tạm thời</Option>
                    <Option value="da_ve">Đã chuyển về</Option>
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

export default ChuyenTamThoi;
