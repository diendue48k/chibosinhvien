import { useState, useEffect } from 'react';
import {
  Card, Row, Col, Typography, Tag, Form,
  Input, Button, message, Space, Radio, Table, Badge,
  Divider, Alert
} from 'antd';
import {
  FormOutlined, ClockCircleOutlined, SendOutlined, ReloadOutlined,
  CheckCircleOutlined, FileDoneOutlined, DownloadOutlined
} from '@ant-design/icons';
import { collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { docGeneratorService } from '../services/docGeneratorService';
import dayjs from 'dayjs';

const { Title } = Typography;

const TRANG_THAI_CONFIG = {
  cho_duyet: { label: 'Chờ duyệt', color: '#faad14', bgColor: '#fffbe6', borderColor: '#ffe58f', Icon: ClockCircleOutlined },
  da_duyet: { label: 'Đã duyệt', color: '#1890ff', bgColor: '#e6f7ff', borderColor: '#91d5ff', Icon: CheckCircleOutlined },
  hoan_thanh: { label: 'Hoàn thành', color: '#52c41a', bgColor: '#f6ffed', borderColor: '#b7eb8f', Icon: FileDoneOutlined }
};

export default function DangKyChuyenSinhHoat() {
  const { currentUser } = useAuth();
  const [memberData, setMemberData] = useState({});
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchMemberData = async () => {
    if (!currentUser?.mssv) return;
    try {
      setLoading(true);
      let q = query(collection(db, "dang_vien"), where("mssv", "==", currentUser.mssv));
      let snapshot = await getDocs(q);
      
      if (snapshot.empty && currentUser.name) {
        const cleanName = currentUser.name.split('-')[0].trim();
        q = query(collection(db, "dang_vien"), where("ho_ten", "==", cleanName));
        snapshot = await getDocs(q);
      }

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setMemberData({ id: doc.id, ...doc.data() });
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải thông tin Đảng viên');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    if (!currentUser?.uid) return;
    try {
      const q = query(
        collection(db, "dangky_chuyen_sinh_hoat"),
        where("user_id", "==", currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRegistrations(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchMemberData();
      fetchRegistrations();
    }
  }, [currentUser]);

  const onFinish = async (values) => {
    if (!memberData.id) {
      message.error('Không tìm thấy hồ sơ Đảng viên của bạn!');
      return;
    }
    setSubmitting(true);
    try {
      const newRecord = {
        user_id: currentUser.uid || '',
        dang_vien_id: memberData.id || '',
        ho_ten: memberData.ho_ten || '',
        mssv: memberData.mssv || '',
        loai_chuyen: values.loai_chuyen || '',
        noi_chuyen_den: values.noi_chuyen_den || '',
        ly_do: values.ly_do || '',
        uu_diem: values.uu_diem || '',
        khuyet_diem: values.khuyet_diem || '',
        trang_thai: 'cho_duyet',
        created_at: new Date().toISOString()
      };
      await addDoc(collection(db, "dangky_chuyen_sinh_hoat"), newRecord);
      message.success('Đăng ký chuyển sinh hoạt thành công!');
      form.resetFields();
      fetchRegistrations();
    } catch (err) {
      console.error(err);
      message.error('Có lỗi xảy ra khi đăng ký!');
    } finally {
      setSubmitting(false);
    }
  };

  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownloadDoc = async (record, type) => {
    try {
      setDownloadingId(`${record.id}_${type}`);
      
      // Safe date parser for Firestore Timestamps
      const safeFmt = (val) => {
        if (!val) return '';
        try {
          if (typeof val === 'object' && val.seconds !== undefined) return dayjs(new Date(val.seconds * 1000)).format('YYYY-MM-DD');
          if (typeof val === 'object' && typeof val.toDate === 'function') return dayjs(val.toDate()).format('YYYY-MM-DD');
          const d = dayjs(val);
          return d.isValid() ? d.format('YYYY-MM-DD') : '';
        } catch { return ''; }
      };

      const dataToExport = {
        ...memberData,
        ho_ten: memberData.ho_ten || currentUser?.name?.split('-')[0]?.trim() || '',
        gioi_tinh: memberData.gioi_tinh || 'Nam',
        ngay_sinh: safeFmt(memberData.ngay_sinh),
        ngay_vao_dang: safeFmt(memberData.ngay_vao_dang),
        ngay_chinh_thuc: safeFmt(memberData.ngay_chinh_thuc),
        lop: memberData.lop || '',
        khoa: memberData.khoa || '',
        que_quan: memberData.que_quan || memberData.tinh_tp_qq || '',
        dia_chi: memberData.chi_tiet_dc || memberData.tinh_tp_tt || memberData.dia_chi_thuong_tru || '',
        so_the_dang: memberData.so_the_dang || memberData.so_quyet_dinh_dvct || memberData.so_qd || '',
        so_dien_thoai: memberData.so_dien_thoai || memberData.sdt || '',
        nhiem_vu_dang: memberData.nhiem_vu_dang || 'Đảng viên',

        loai_chuyen_sh: record.loai_chuyen === 'chinh_thuc' ? 'chuyen_ra' : 'chuyen_tam_thoi',
        noi_chuyen_den: record.noi_chuyen_den || '',
        ly_do_chuyen: record.ly_do || '',
        uu_diem: memberData.uu_diem || record.uu_diem || '',
        khuyet_diem: memberData.khuyet_diem || record.khuyet_diem || '',
        ngay_ky: dayjs().format('YYYY-MM-DD'),
        tinh_tp: 'Đà Nẵng'
      };

      if (type === 'mau1') {
        if (record.loai_chuyen === 'tam_thoi') {
           await docGeneratorService.generateDonXinChuyenDangTamThoi(dataToExport);
        } else {
           await docGeneratorService.generateDonXinChuyenDang(dataToExport);
        }
      } else if (type === 'mau4') {
        await docGeneratorService.generateKiemDiemChuyenDang(dataToExport);
      }
      message.success('Tải biểu mẫu thành công!');
    } catch (e) {
      console.error(e);
      message.error('Lỗi khi tạo biểu mẫu: ' + e.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const columns = [
    {
      title: 'Ngày ĐK',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val) => dayjs(val).format('DD/MM/YYYY HH:mm'),
      width: 150
    },
    {
      title: 'Loại chuyển',
      dataIndex: 'loai_chuyen',
      key: 'loai_chuyen',
      render: (val) => val === 'chinh_thuc' ? 'Chuyển chính thức' : 'Chuyển tạm thời',
      width: 160
    },
    {
      title: 'Nơi chuyển đến',
      dataIndex: 'noi_chuyen_den',
      key: 'noi_chuyen_den',
      ellipsis: true
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trang_thai',
      key: 'trang_thai',
      width: 140,
      render: (val) => {
        const conf = TRANG_THAI_CONFIG[val] || TRANG_THAI_CONFIG.cho_duyet;
        const Icon = conf.Icon;
        return (
          <Badge
            count={
              <div style={{
                backgroundColor: conf.bgColor, color: conf.color, border: `1px solid ${conf.borderColor}`,
                padding: '0 8px', borderRadius: 12, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4
              }}>
                <Icon /> {conf.label}
              </div>
            }
          />
        );
      }
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 250,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            loading={downloadingId === `${record.id}_mau1`}
            onClick={() => handleDownloadDoc(record, 'mau1')}
            title="Tải Đơn xin chuyển"
          >
            Mẫu 1
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            loading={downloadingId === `${record.id}_mau4`}
            onClick={() => handleDownloadDoc(record, 'mau4')}
            title="Tải Bản kiểm điểm"
          >
            Mẫu 4
          </Button>
        </Space>
      )
    }
  ];

  // Styling
  const cardStyle = { borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 24 };
  const headStyle = { borderBottom: '1px solid #f0f0f0', backgroundColor: '#fafafa', borderRadius: '12px 12px 0 0', fontWeight: 700 };
  const readOnlyFieldStyle = {
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    border: '1px solid #e9ecef',
    height: '100%'
  };
  const readOnlyLabelStyle = { fontSize: 12, color: '#8c8c8c', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' };
  const readOnlyValueStyle = { fontSize: 15, fontWeight: 600, color: '#262626', wordBreak: 'break-word' };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px' }}>
      <Title level={2} style={{ marginBottom: 24, fontWeight: 800, color: '#c62828' }}>Đăng Ký Chuyển Sinh Hoạt Đảng</Title>
      
      <Row gutter={[24, 24]}>
        <Col xs={24}>
          <Card title="1. Thông tin Đảng viên" bordered={false} style={cardStyle} styles={{ header: headStyle }}>
            <Alert
              message="Thông tin bên dưới được lấy tự động. Vui lòng kiểm tra kỹ trước khi đăng ký."
              type="info" showIcon style={{ marginBottom: 16, borderRadius: 6 }}
            />
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <div style={readOnlyFieldStyle}>
                  <div style={readOnlyLabelStyle}>Họ và tên</div>
                  <div style={{ ...readOnlyValueStyle, color: '#c62828', fontWeight: 800 }}>{memberData.ho_ten || '--'}</div>
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
                  <div style={readOnlyLabelStyle}>SĐT</div>
                  <div style={readOnlyValueStyle}>{memberData.so_dien_thoai || '--'}</div>
                </div>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <div style={readOnlyFieldStyle}>
                  <div style={readOnlyLabelStyle}>Ngày vào Đảng</div>
                  <div style={readOnlyValueStyle}>{(() => { try { if (!memberData.ngay_vao_dang) return '--'; if (typeof memberData.ngay_vao_dang === 'object' && memberData.ngay_vao_dang.seconds) return dayjs(new Date(memberData.ngay_vao_dang.seconds * 1000)).format('DD/MM/YYYY'); const d = dayjs(memberData.ngay_vao_dang); return d.isValid() ? d.format('DD/MM/YYYY') : '--'; } catch { return '--'; } })()}</div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24}>
          <Card title={<><FormOutlined /> 2. Form Đăng ký</>} bordered={false} style={cardStyle} styles={{ header: headStyle }}>
            <Form form={form} layout="vertical" onFinish={onFinish} size="large">
              <Form.Item
                name="loai_chuyen"
                label={<span style={{ fontWeight: 600 }}>Loại chuyển sinh hoạt <span style={{ color: '#ff4d4f' }}>*</span></span>}
                rules={[{ required: true, message: 'Vui lòng chọn loại chuyển sinh hoạt!' }]}
              >
                <Radio.Group buttonStyle="solid">
                  <Radio.Button value="chinh_thuc">Chuyển chính thức</Radio.Button>
                  <Radio.Button value="tam_thoi">Chuyển tạm thời</Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="noi_chuyen_den"
                label={<span style={{ fontWeight: 600 }}>Nơi chuyển đến (Chi bộ / Đảng bộ trực thuộc) <span style={{ color: '#ff4d4f' }}>*</span></span>}
                rules={[{ required: true, message: 'Vui lòng nhập nơi chuyển đến!' }]}
              >
                <Input placeholder="VD: Chi bộ thôn Đức Xá, Đảng bộ Xã Vĩnh Thủy, Huyện Vĩnh Linh, Tỉnh Quảng Trị" />
              </Form.Item>

              <Form.Item
                name="ly_do"
                label={<span style={{ fontWeight: 600 }}>Lý do chuyển <span style={{ color: '#ff4d4f' }}>*</span></span>}
                rules={[{ required: true, message: 'Vui lòng nhập lý do!' }]}
              >
                <Input.TextArea rows={3} placeholder="VD: Đã hoàn thành chương trình học và tốt nghiệp ra trường..." />
              </Form.Item>

              <Divider orientation="left" plain style={{ color: '#8c8c8c' }}>Tự kiểm điểm Đảng viên (Dành cho bản kiểm điểm)</Divider>
              
              <Form.Item name="uu_diem" label={<span style={{ fontWeight: 600 }}>Ưu điểm</span>}>
                <Input.TextArea rows={3} placeholder="Về tư tưởng chính trị, đạo đức lối sống, thực hiện nhiệm vụ..." />
              </Form.Item>
              
              <Form.Item name="khuyet_diem" label={<span style={{ fontWeight: 600 }}>Khuyết điểm</span>}>
                <Input.TextArea rows={2} placeholder="Những hạn chế, khuyết điểm trong quá trình sinh hoạt..." />
              </Form.Item>

              <Form.Item style={{ marginTop: 24, marginBottom: 0, textAlign: 'right' }}>
                <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={submitting} disabled={!memberData.id}
                  style={{ height: 48, padding: '0 32px', borderRadius: 8, fontWeight: 600, background: 'linear-gradient(90deg, #c62828 0%, #b71c1c 100%)', border: 'none', boxShadow: '0 4px 14px rgba(198, 40, 40, 0.4)' }}
                >
                  GỬI YÊU CẦU ĐĂNG KÝ
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24}>
          <Card
            title={<><ClockCircleOutlined /> 3. Lịch sử đăng ký</>}
            extra={<Button type="text" icon={<ReloadOutlined />} onClick={fetchRegistrations}>Làm mới</Button>}
            bordered={false} style={cardStyle} styles={{ header: headStyle }}
          >
            <Table
              columns={columns}
              dataSource={registrations}
              rowKey="id"
              pagination={false}
              loading={loading && registrations.length === 0}
              locale={{ emptyText: 'Chưa có lịch sử đăng ký nào.' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
