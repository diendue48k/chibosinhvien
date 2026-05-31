import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Input, Space, Typography, message, Select, Tag, Popconfirm, Modal, Radio, Row, Col, Card, Divider, Steps, DatePicker, Form, Tabs } from 'antd';
import { SearchOutlined, DownloadOutlined, FilterOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, ArrowRightOutlined, CheckOutlined, MailOutlined, SendOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { collection, getDocs, doc, deleteDoc, query, where, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ProfileDrawer from '../components/ProfileDrawer';
import * as XLSX from 'xlsx';
import debounce from 'lodash/debounce';
import dayjs from 'dayjs';

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
  { key: 'so_the_dang', label: 'Số thẻ Đảng', group: 'party' },
  { key: 'dang_vien_du_bi', label: 'Loại Đảng viên', group: 'party', isSpecial: 'type' },
  { key: 'trang_thai', label: 'Trạng thái sinh hoạt', group: 'party', isSpecial: 'status' },
  { key: 'dvhd', label: 'Đảng viên hướng dẫn', group: 'party' },
  
  { key: 'ngay_chuyen_ra', label: 'Ngày chuyển đi', group: 'transfer_out', isDate: true },
  { key: 'noi_chuyen_ra', label: 'Nơi chuyển đến', group: 'transfer_out' },
  { key: 'ghi_chu_chuyen', label: 'Ghi chú chuyển', group: 'transfer_out' },

  { key: 'ho_ten_nguoi_than', label: 'Họ tên người thân', group: 'family' },
  { key: 'sdt_nguoi_than', label: 'SĐT người thân', group: 'family' }
];

const FIELD_GROUPS = {
  basic: { label: "Thông tin cơ bản", color: "blue" },
  org: { label: "Học tập & Tổ chức", color: "geekblue" },
  contact: { label: "Liên hệ & Tạm trú", color: "cyan" },
  address: { label: "Thường trú & Quê quán", color: "purple" },
  party: { label: "Thông tin Đảng tịch", color: "red" },
  transfer_out: { label: "Chuyển đi chính thức", color: "green" },
  family: { label: "Gia đình", color: "orange" }
};

const KHOA_LIST = [
  "P.CTSV", "Quản trị Kinh doanh", "Trung tâm Đào tạo Quốc tế", "Du lịch", "Marketing", 
  "Tài chính", "Ngân hàng", "Kinh tế", "Kế toán", "Luật", "Thống kê - Tin học", 
  "Thương mại điện tử", "Kinh doanh quốc tế", "Lý luận chính trị", "Khác"
];

const ChuyenSinhHoat = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals/Drawers visibility
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  
  // Custom Export States
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [exportRange, setExportRange] = useState('filtered'); // 'filtered', 'all', 'selected'
  const [selectedExportFields, setSelectedExportFields] = useState(EXPORT_FIELDS.map(f => f.key));
  
  // Filters
  const [searchText, setSearchText] = useState("");
  const [filterKhoa, setFilterKhoa] = useState(null);
  const [filterLop, setFilterLop] = useState(null);
  const [filterNhom, setFilterNhom] = useState(null);
  
  const fetchTransferred = async () => {
    setLoading(true);
    try {
      // 1. Fetch all members with status 'da_chuyen'
      const dvSnapshot = await getDocs(collection(db, "dang_vien"));
      const allMembers = dvSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(dv => dv.trang_thai === 'da_chuyen');

      // 2. Fetch all chuyen_sinh_hoat records
      const csSnapshot = await getDocs(collection(db, "chuyen_sinh_hoat"));
      const transferRecords = csSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 3. Merge them
      const merged = allMembers.map(member => {
        const transfer = transferRecords.find(t => t.dang_vien_id === member.id) || {};
        return {
          ...member,
          ngay_chuyen_ra: member.ngay_chuyen_ra || transfer.ngay_chuyen || null,
          noi_chuyen_ra: member.noi_chuyen_ra || transfer.noi_chuyen || '',
          ghi_chu_chuyen: member.ghi_chu_chuyen || transfer.ghi_chu || ''
        };
      });

      setData(merged);
    } catch (error) {
      message.error("Lỗi khi tải dữ liệu chuyển sinh hoạt");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransferred();
  }, []);

  // Filtered Data
  const filteredData = useMemo(() => {
    const result = data.filter(item => {
      const matchSearch = item.mssv?.toLowerCase().includes(searchText.toLowerCase()) || 
                          item.ho_ten?.toLowerCase().includes(searchText.toLowerCase());
      const matchKhoa = filterKhoa ? item.khoa === filterKhoa : true;
      const matchLop = filterLop ? item.lop === filterLop : true;
      const matchNhom = filterNhom ? item.nhom === filterNhom : true;
      return matchSearch && matchKhoa && matchLop && matchNhom;
    });

    result.sort((a, b) => {
       const dateA = a.ngay_chuyen_ra ? dayjs(a.ngay_chuyen_ra).valueOf() : 0;
       const dateB = b.ngay_chuyen_ra ? dayjs(b.ngay_chuyen_ra).valueOf() : 0;
       if (dateA !== dateB) return dateB - dateA; // Show latest transfers first
       
       const nameA = a.ho_ten || '';
       const nameB = b.ho_ten || '';
       return nameA.localeCompare(nameB);
    });

    return result;
  }, [data, searchText, filterKhoa, filterLop, filterNhom]);

  const uniqueKhoa = useMemo(() => {
    return [...new Set(data.map(d => d.khoa).filter(Boolean))].sort();
  }, [data]);

  const uniqueLop = useMemo(() => {
    const sourceData = filterKhoa 
      ? data.filter(d => d.khoa === filterKhoa) 
      : data;
    return [...new Set(sourceData.map(d => d.lop).filter(Boolean))].sort();
  }, [data, filterKhoa]);

  const uniqueNhom = useMemo(() => {
    return [...new Set(data.map(d => d.nhom).filter(Boolean))].sort();
  }, [data]);


  useEffect(() => {
    if (filterKhoa && filterLop) {
      const hasLop = data.some(d => d.khoa === filterKhoa && d.lop === filterLop);
      if (!hasLop) {
        setFilterLop(null);
      }
    }
  }, [filterKhoa, filterLop, data]);

  const handleSearch = debounce((e) => {
    setSearchText(e.target.value);
  }, 300);

  const resetFilters = () => {
    setSearchText("");
    setFilterKhoa(null);
    setFilterLop(null);
    setFilterNhom(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return dayjs(dateString).format('DD/MM/YYYY');
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
      const row = {};
      EXPORT_FIELDS.forEach(field => {
        if (selectedExportFields.includes(field.key)) {
          if (field.isDate) {
            row[field.label] = item[field.key] ? dayjs(item[field.key]).format('DD/MM/YYYY') : '';
          } else if (field.isSpecial === 'type') {
            row[field.label] = item.dang_vien_du_bi ? "Dự bị" : "Chính thức";
          } else if (field.isSpecial === 'status') {
            row[field.label] = item.trang_thai === 'dang_sinh_hoat' ? 'Đang sinh hoạt' :
                               item.trang_thai === 'da_chuyen' ? 'Đã chuyển ra' :
                               item.trang_thai === 'cho_ket_nap' ? 'Chờ kết nạp' :
                               item.trang_thai === 'dang_xet_chinh_thuc' ? 'Đang xét chính thức' : 'Đang sinh hoạt';
          } else {
            row[field.label] = item[field.key] || "";
          }
        }
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(mappedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ChuyenSinhHoat");
    XLSX.writeFile(wb, "DanhSachDangVienChuyenSinhHoat_TuyChinh.xlsx");
    
    setIsExportModalVisible(false);
    message.success(`Xuất Excel thành công ${dataToExport.length} dòng!`);
  };

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setIsDrawerVisible(true);
  };

  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      await Promise.all(selectedRowKeys.map(async (id) => {
        await deleteDoc(doc(db, "dang_vien", id));
        // Delete corresponding transfer records to keep clean
        try {
          const q = query(collection(db, "chuyen_sinh_hoat"), where("dang_vien_id", "==", id));
          const snapshot = await getDocs(q);
          await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, "chuyen_sinh_hoat", d.id))));
        } catch (err) {}
      }));
      message.success(`Đã xóa ${selectedRowKeys.length} Đảng viên chuyển sinh hoạt.`);
      setSelectedRowKeys([]);
      fetchTransferred();
    } catch (error) {
      message.error("Lỗi khi xóa Đảng viên");
      setLoading(false);
    }
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
      title: 'MSSV', 
      dataIndex: 'mssv', 
      key: 'mssv',
      sorter: (a, b) => (a.mssv || '').localeCompare(b.mssv || '')
    },
    { 
      title: 'Họ tên', 
      dataIndex: 'ho_ten', 
      key: 'ho_ten',
      sorter: (a, b) => (a.ho_ten || '').localeCompare(b.ho_ten || ''),
      render: (text) => <Text style={{ color: '#1890ff', cursor: 'pointer', fontWeight: 500 }}>{text}</Text>
    },
    { 
      title: 'Lớp', 
      dataIndex: 'lop', 
      key: 'lop',
      sorter: (a, b) => (a.lop || '').localeCompare(b.lop || '')
    },
    { 
      title: 'Khoa', 
      dataIndex: 'khoa', 
      key: 'khoa',
      sorter: (a, b) => (a.khoa || '').localeCompare(b.khoa || '')
    },
    { 
      title: 'Nhóm sinh hoạt', 
      dataIndex: 'nhom', 
      key: 'nhom',
      sorter: (a, b) => (a.nhom || '').localeCompare(b.nhom || '')
    },
    { 
      title: 'Ngày chuyển ra', 
      dataIndex: 'ngay_chuyen_ra', 
      key: 'ngay_chuyen_ra',
      sorter: (a, b) => (a.ngay_chuyen_ra || '').localeCompare(b.ngay_chuyen_ra || ''),
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '--'
    },
    { 
      title: 'Nơi chuyển ra', 
      dataIndex: 'noi_chuyen_ra', 
      key: 'noi_chuyen_ra',
      sorter: (a, b) => (a.noi_chuyen_ra || '').localeCompare(b.noi_chuyen_ra || '')
    },
    { 
      title: 'Loại', 
      dataIndex: 'dang_vien_du_bi', 
      key: 'dang_vien_du_bi',
      sorter: (a, b) => (a.dang_vien_du_bi ? 1 : 0) - (b.dang_vien_du_bi ? 1 : 0),
      render: (isDuBi) => (
        <Tag color={isDuBi ? 'orange' : 'green'} style={{ borderRadius: '4px', fontWeight: 500 }}>
          {isDuBi ? 'Dự bị' : 'Chính thức'}
        </Tag>
      )
    }
  ];

  return (
    <div style={{ padding: '4px' }}>
      
      {/* Row 1: Page Header & Primary Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
          <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.3px' }}>
            Quản lý Đảng viên chuyển sinh hoạt
          </Title>
        </div>
        
        <Space size="middle">
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`Xóa vĩnh viễn ${selectedRowKeys.length} hồ sơ đã chọn?`}
              onConfirm={handleBulkDelete}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button danger type="primary" icon={<DeleteOutlined />} style={{ borderRadius: '6px' }}>
                Xóa ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
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

      {/* Row 2: Fluid Search & Dynamic Filters Strip (Perfectly spread to fill available space) */}
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
            {uniqueKhoa.map(k => <Option key={k} value={k}>{k}</Option>)}
          </Select>
        </div>
        
        <div style={{ flex: 1, minWidth: '130px' }}>
          <Select 
            showSearch
            placeholder="Chọn Lớp" 
            style={{ width: '100%' }} 
            allowClear 
            value={filterLop} 
            onChange={setFilterLop}
            optionFilterProp="children"
            filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            {uniqueLop.map(l => <Option key={l} value={l}>{l}</Option>)}
          </Select>
        </div>
        
        <div style={{ flex: 1, minWidth: '150px' }}>
          <Select 
            showSearch
            placeholder="Chọn Nhóm" 
            style={{ width: '100%' }} 
            allowClear 
            value={filterNhom} 
            onChange={setFilterNhom}
            optionFilterProp="children"
            filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
            dropdownStyle={{ borderRadius: '6px' }}
          >
            {uniqueNhom.map(n => <Option key={n} value={n}>{n}</Option>)}
          </Select>
        </div>

        {(filterKhoa || filterLop || filterNhom || searchText) && (
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
        rowSelection={rowSelection}
        columns={columns} 
        dataSource={filteredData} 
        loading={loading}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => handleRowClick(record)
        })}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20', '50'],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đảng viên chuyển`
        }}
        style={{ cursor: 'pointer' }}
      />

      <ProfileDrawer 
        open={isDrawerVisible} 
        onClose={() => setIsDrawerVisible(false)} 
        data={selectedRecord} 
        onUpdate={fetchTransferred} 
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
                <Col span={6}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Tìm kiếm từ khóa:</div>
                  <Input 
                    placeholder="MSSV, Họ tên..." 
                    value={searchText} 
                    onChange={e => setSearchText(e.target.value)} 
                    style={{ borderRadius: '6px' }}
                    allowClear
                  />
                </Col>
                <Col span={6}>
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
                <Col span={6}>
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
                <Col span={6}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Nhóm sinh hoạt:</div>
                  <Select 
                    placeholder="Chọn Nhóm" 
                    value={filterNhom} 
                    onChange={setFilterNhom} 
                    style={{ width: '100%' }}
                    allowClear
                    dropdownStyle={{ borderRadius: '6px' }}
                  >
                    {uniqueNhom.map(nhom => (
                      <Option key={nhom} value={nhom}>{nhom}</Option>
                    ))}
                  </Select>
                </Col>
              </Row>
            </div>
          )}

          <Divider style={{ margin: '16px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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

export default ChuyenSinhHoat;
