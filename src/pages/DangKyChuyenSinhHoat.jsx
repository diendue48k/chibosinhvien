import { useState, useEffect } from 'react';
import {
  Card, Row, Col, Typography, Tag, Form,
  Input, Button, message, Space, Radio, Table, Badge,
  Divider, Alert, Modal, Tabs, Empty, Result
} from 'antd';
import {
  FormOutlined, ClockCircleOutlined, SendOutlined, ReloadOutlined,
  CheckCircleOutlined, FileDoneOutlined, DownloadOutlined
} from '@ant-design/icons';
import { collection, getDocs, addDoc, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { docGeneratorService } from '../services/docGeneratorService';
import dayjs from 'dayjs';

const getFullAddress = (record) => {
  if (!record) return '';
  if (record.dia_chi_thuong_tru) return record.dia_chi_thuong_tru;
  const parts = [];
  if (record.chi_tiet_dc) parts.push(record.chi_tiet_dc);
  if (record.xa_phuong_tt) parts.push(record.xa_phuong_tt);
  if (record.quan_huyen_tt) parts.push(record.quan_huyen_tt);
  if (record.tinh_tp_tt) parts.push(record.tinh_tp_tt);
  return parts.join(', ');
};

const getFullHometown = (record) => {
  if (!record) return '';
  if (record.que_quan) return record.que_quan;
  const parts = [];
  if (record.xa_phuong_qq) parts.push(record.xa_phuong_qq);
  if (record.quan_huyen_qq) parts.push(record.quan_huyen_qq);
  if (record.tinh_tp_qq) parts.push(record.tinh_tp_qq);
  return parts.join(', ');
};

const getFullTamTru = (record) => {
  if (!record) return '';
  if (record.dia_chi_tam_tru) return record.dia_chi_tam_tru;
  const parts = [];
  if (record.chi_tiet_tam_tru) parts.push(record.chi_tiet_tam_tru);
  if (record.xa_phuong_tam_tru) parts.push(record.xa_phuong_tam_tru);
  if (record.quan_huyen_tam_tru) parts.push(record.quan_huyen_tam_tru);
  if (record.tinh_tp_tam_tru) parts.push(record.tinh_tp_tam_tru);
  return parts.join(', ');
};

const { Title, Text } = Typography;

const TRANG_THAI_CONFIG = {
  cho_duyet: { label: 'Chờ duyệt', color: '#faad14', bgColor: '#fffbe6', borderColor: '#ffe58f', Icon: ClockCircleOutlined },
  da_duyet: { label: 'Đã duyệt', color: '#1890ff', bgColor: '#e6f7ff', borderColor: '#91d5ff', Icon: CheckCircleOutlined },
  hoan_thanh: { label: 'Hoàn thành', color: '#52c41a', bgColor: '#f6ffed', borderColor: '#b7eb8f', Icon: FileDoneOutlined },
  tu_choi: { label: 'Bị từ chối', color: '#ff4d4f', bgColor: '#fff2f0', borderColor: '#ffccc7', Icon: FormOutlined },
  dieu_chinh: { label: 'Cần điều chỉnh', color: '#faad14', bgColor: '#fffbe6', borderColor: '#ffe58f', Icon: FormOutlined }
};

export default function DangKyChuyenSinhHoat() {
  const { currentUser } = useAuth();
  const [memberData, setMemberData] = useState({});
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [justRegisteredRecord, setJustRegisteredRecord] = useState(null);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('form');
  const [editingId, setEditingId] = useState(null);

  const activeRegistration = registrations.find(r => ['cho_duyet', 'da_duyet', 'hoan_thanh'].includes(r.trang_thai));
  
  const handleEditRecord = (record) => {
    setEditingId(record.id);
    let chiBo = '', dangBoCoSo = '', dangBoCapTren = '';
    if (record.noi_chuyen_den) {
      const parts = record.noi_chuyen_den.split(',').map(s => s.trim());
      chiBo = parts[0] || '';
      dangBoCoSo = parts[1] || '';
      dangBoCapTren = parts[2] || '';
    }
    form.setFieldsValue({
      loai_chuyen: record.loai_chuyen,
      noi_chuyen_den_chi_bo: chiBo,
      noi_chuyen_den_dang_bo_co_so: dangBoCoSo,
      noi_chuyen_den_dang_bo_cap_tren: dangBoCapTren,
      ly_do: record.ly_do,
      uu_diem: record.uu_diem,
      khuyet_diem: record.khuyet_diem
    });
    setActiveTab('form');
  };

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
    if (!memberData?.id) return;
    try {
      const q = query(
        collection(db, "dangky_chuyen_sinh_hoat"),
        where("dang_vien_id", "==", memberData.id)
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
    }
  }, [currentUser]);

  useEffect(() => {
    if (memberData?.id) {
      fetchRegistrations();
    }
  }, [memberData?.id]);

  const onFinish = async (values) => {
    if (!memberData.id) {
      message.error('Không tìm thấy hồ sơ Đảng viên của bạn!');
      return;
    }
    setSubmitting(true);
    try {
      const combinedNoiChuyenDen = [
        values.noi_chuyen_den_chi_bo ? values.noi_chuyen_den_chi_bo.trim() : '',
        values.noi_chuyen_den_dang_bo_co_so ? values.noi_chuyen_den_dang_bo_co_so.trim() : '',
        values.noi_chuyen_den_dang_bo_cap_tren ? values.noi_chuyen_den_dang_bo_cap_tren.trim() : ''
      ].filter(Boolean).join(', ');

      const newRecord = {
        user_id: currentUser.uid || '',
        dang_vien_id: memberData.id || '',
        ho_ten: memberData.ho_ten || '',
        mssv: memberData.mssv || '',
        loai_chuyen: values.loai_chuyen || '',
        noi_chuyen_den: combinedNoiChuyenDen,
        ly_do: values.ly_do || '',
        uu_diem: values.uu_diem || "- Có phẩm chất chính trị tốt...\n- Có lối sống đạo đức trong sáng...",
        khuyet_diem: values.khuyet_diem || "- Không có khuyết điểm gì lớn",
        trang_thai: 'cho_duyet',
        updated_at: new Date().toISOString()
      };
      
      let docRefId;
      if (editingId) {
        await updateDoc(doc(db, "dangky_chuyen_sinh_hoat", editingId), newRecord);
        docRefId = editingId;
      } else {
        newRecord.created_at = new Date().toISOString();
        const docRef = await addDoc(collection(db, "dangky_chuyen_sinh_hoat"), newRecord);
        docRefId = docRef.id;
      }
      
      setJustRegisteredRecord({ id: docRefId, ...newRecord });
      setIsSuccessModalVisible(true);
      message.success(editingId ? 'Cập nhật đăng ký thành công!' : 'Đăng ký chuyển sinh hoạt thành công!');
      form.resetFields();
      setEditingId(null);
      fetchRegistrations();
      setActiveTab('history');
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
        que_quan: memberData.que_quan || getFullHometown(memberData) || memberData.tinh_tp_qq || '',
        dia_chi: memberData.dia_chi_thuong_tru || getFullAddress(memberData) || memberData.chi_tiet_dc || '',
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
      } else if (type === 'mau3') {
        await docGeneratorService.generateNhanXetDangVienDuBiDTN(dataToExport);
      } else if (type === 'mau4') {
        await docGeneratorService.generateKiemDiemChuyenDang(dataToExport);
      } else if (type === 'mau5') {
        await docGeneratorService.generateNhanXetDangVienDuBiDVHD(dataToExport);
      }
      message.success('Tải biểu mẫu thành công!');
    } catch (e) {
      console.error(e);
      message.error('Lỗi khi tạo biểu mẫu: ' + e.message);
    } finally {
      setDownloadingId(null);
    }
  };

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
    <div className="premium-page-container">
      <style>{`
        .premium-page-container {
          padding: 4px;
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        type="card" 
        size="large"
      >
        <Tabs.TabPane tab={<span><FormOutlined /> Tạo mới hồ sơ</span>} key="form">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16 }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
            <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.3px' }}>
              {editingId ? 'Cập nhật đăng ký chuyển sinh hoạt' : 'Đăng ký chuyển sinh hoạt Đảng mới'}
            </Title>
          </div>
          {activeRegistration && !editingId ? (
            <Result
              status="info"
              title="Bạn đã có hồ sơ đăng ký đang được xử lý"
              subTitle={`Hồ sơ đăng ký vào ngày ${dayjs(activeRegistration.created_at).format('DD/MM/YYYY HH:mm')} hiện đang ở trạng thái: ${TRANG_THAI_CONFIG[activeRegistration.trang_thai]?.label || 'Đang xử lý'}.`}
              extra={
                <Button type="primary" onClick={() => setActiveTab('history')}>
                  Xem lịch sử đăng ký
                </Button>
              }
            />
          ) : (
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Row gutter={[24, 24]}>
              <Col xs={24}>
              <Card 
                size="small" 
                title={<span style={{ fontWeight: 700, color: '#c62828', fontSize: '16px' }}>Thông tin Đảng viên (Từ hồ sơ gốc)</span>} 
                style={{ marginBottom: 20, borderRadius: '8px', backgroundColor: '#fafafa', border: '1px solid #f0f0f0' }}
              >
                <Row gutter={[16, 24]}>
                  <Col xs={24} sm={8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Họ và tên:</Text>
                    <Text strong style={{ display: 'block', color: '#c62828', fontSize: '16px' }}>{memberData.ho_ten}</Text>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>MSSV:</Text>
                    <Text strong style={{ display: 'block', fontFamily: 'monospace', fontSize: '15px' }}>{memberData.mssv || 'N/A'}</Text>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Giới tính:</Text>
                    <Text strong style={{ display: 'block', fontSize: '15px' }}>{memberData.gioi_tinh || 'N/A'}</Text>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Ngày sinh:</Text>
                    <Text strong style={{ display: 'block', fontSize: '15px' }}>{(() => { try { if (!memberData.ngay_sinh) return 'N/A'; if (typeof memberData.ngay_sinh === 'object' && memberData.ngay_sinh.seconds) return dayjs(new Date(memberData.ngay_sinh.seconds * 1000)).format('DD/MM/YYYY'); const d = dayjs(memberData.ngay_sinh); return d.isValid() ? d.format('DD/MM/YYYY') : 'N/A'; } catch { return 'N/A'; } })()}</Text>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Ngày vào Đảng:</Text>
                    <Text strong style={{ display: 'block', fontSize: '15px' }}>{(() => { try { if (!memberData.ngay_vao_dang) return 'N/A'; if (typeof memberData.ngay_vao_dang === 'object' && memberData.ngay_vao_dang.seconds) return dayjs(new Date(memberData.ngay_vao_dang.seconds * 1000)).format('DD/MM/YYYY'); const d = dayjs(memberData.ngay_vao_dang); return d.isValid() ? d.format('DD/MM/YYYY') : 'N/A'; } catch { return 'N/A'; } })()}</Text>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Ngày chính thức:</Text>
                    <Text strong style={{ display: 'block', fontSize: '15px' }}>{(() => { try { if (!memberData.ngay_chinh_thuc) return 'Chưa có'; if (typeof memberData.ngay_chinh_thuc === 'object' && memberData.ngay_chinh_thuc.seconds) return dayjs(new Date(memberData.ngay_chinh_thuc.seconds * 1000)).format('DD/MM/YYYY'); const d = dayjs(memberData.ngay_chinh_thuc); return d.isValid() ? d.format('DD/MM/YYYY') : 'Chưa có'; } catch { return 'Chưa có'; } })()}</Text>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Loại Đảng viên:</Text>
                    <div style={{ display: 'block' }}>
                      {(memberData.loai_dang_vien === 'Dự bị' || memberData.dang_vien_du_bi === true || memberData.loai_dang_vien === 'dubi') ? (
                        <Tag color="orange" style={{ fontWeight: 600, margin: 0, fontSize: '14px', padding: '2px 8px' }}>Dự bị</Tag>
                      ) : (
                        <Tag color="green" style={{ fontWeight: 600, margin: 0, fontSize: '14px', padding: '2px 8px' }}>Chính thức</Tag>
                      )}
                    </div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Số thẻ Đảng:</Text>
                    <Text strong style={{ display: 'block', fontSize: '15px' }}>{memberData.so_the_dang || 'Chưa phát thẻ'}</Text>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Lớp, Khoa:</Text>
                    <Text strong style={{ display: 'block', fontSize: '15px' }}>{memberData.lop || '--'} - {memberData.khoa || '--'}</Text>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Số điện thoại:</Text>
                    <Text strong style={{ display: 'block', fontSize: '15px' }}>{memberData.so_dien_thoai || memberData.sdt || 'N/A'}</Text>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Email:</Text>
                    <Text strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '15px' }} title={memberData.email || memberData.email_sv || 'N/A'}>
                      {memberData.email || memberData.email_sv || 'N/A'}
                    </Text>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Quê quán:</Text>
                    <Text strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '15px' }} title={memberData.que_quan || memberData.tinh_tp_qq || 'N/A'}>
                      {memberData.que_quan || memberData.tinh_tp_qq || 'N/A'}
                    </Text>
                  </Col>
                </Row>
              </Card>
              </Col>
        <Col xs={24}>
          <Card title={<><FormOutlined /> 2. Form Đăng ký</>} bordered={false} style={cardStyle} styles={{ header: headStyle }}>
            <Form form={form} layout="vertical" onFinish={onFinish} size="large">
              <Form.Item
                name="loai_chuyen"
                label={<span style={{ fontWeight: 600 }}>Loại chuyển sinh hoạt</span>}
                rules={[{ required: true, message: 'Vui lòng chọn loại chuyển sinh hoạt!' }]}
              >
                <Radio.Group buttonStyle="solid">
                  <Radio.Button value="chinh_thuc">Chuyển ra chính thức</Radio.Button>
                  <Radio.Button value="tam_thoi">Chuyển tạm thời</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  Nơi chuyển sinh hoạt Đảng đến <span style={{ color: '#ff4d4f' }}>*</span>
                </span>
                <Row gutter={8}>
                  <Col span={8}>
                    <Form.Item name="noi_chuyen_den_chi_bo" rules={[{ required: true, message: 'Chi bộ!' }]} style={{ marginBottom: 0 }}>
                      <Input placeholder="Chi bộ..." />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="noi_chuyen_den_dang_bo_co_so" rules={[{ required: true, message: 'Đảng bộ cơ sở!' }]} style={{ marginBottom: 0 }}>
                      <Input placeholder="Đảng bộ cơ sở..." />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="noi_chuyen_den_dang_bo_cap_tren" rules={[{ required: true, message: 'Đảng bộ cấp trên!' }]} style={{ marginBottom: 0 }}>
                      <Input placeholder="Đảng bộ cấp trên..." />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
              <Form.Item name="ly_do" label={<span style={{ fontWeight: 600 }}>Lý do chuyển</span>} rules={[{ required: true, message: 'Vui lòng nhập lý do!' }]}>
                <Input.TextArea rows={3} placeholder="VD: Đã hoàn thành chương trình học..." />
              </Form.Item>

              <Form.Item style={{ marginTop: 24, marginBottom: 0, textAlign: 'right' }}>
                <Button type="primary" htmlType="submit" size="large" loading={submitting} 
                  style={{ padding: '0 40px', borderRadius: 8, height: 44, fontWeight: 600, background: 'linear-gradient(90deg, #c62828 0%, #b71c1c 100%)', border: 'none' }}
                >
                  {editingId ? 'Lưu cập nhật' : 'Gửi Đăng Ký'}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
            </Row>
          </div>
          )}
        </Tabs.TabPane>
        <Tabs.TabPane tab={<span><FileDoneOutlined /> Hồ sơ & Biểu mẫu cần làm</span>} key="history">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16 }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
            <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.3px' }}>
              Danh sách hồ sơ đăng ký & Biểu mẫu
            </Title>
          </div>
          <Row gutter={[24, 24]}>
        <Col xs={24}>
          <Card
            title={<><ClockCircleOutlined /> Trạng thái hồ sơ của bạn</>}
            extra={<Button type="text" icon={<ReloadOutlined />} onClick={fetchRegistrations}>Làm mới</Button>}
            bordered={false} style={cardStyle} styles={{ header: headStyle }}
          >
            {registrations.length === 0 ? (
              <Empty description="Bạn chưa có hồ sơ đăng ký chuyển sinh hoạt nào." />
            ) : (
              registrations.map((record) => {
                const conf = TRANG_THAI_CONFIG[record.trang_thai] || TRANG_THAI_CONFIG.cho_duyet;
                const StatusIcon = conf.Icon;
                const isReserve = memberData.loai_dang_vien === 'Dự bị' || memberData.dang_vien_du_bi === true || memberData.loai_dang_vien === 'dubi';
                const isTamThoi = record.loai_chuyen === 'tam_thoi';

                return (
                  <Card 
                    key={record.id} 
                    type="inner" 
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: '#c62828' }}>
                          {isTamThoi ? 'Đăng ký Chuyển sinh hoạt tạm thời' : 'Đăng ký Chuyển ra chính thức'}
                        </span>
                        <div style={{
                          backgroundColor: conf.bgColor, color: conf.color, border: `1px solid ${conf.borderColor}`,
                          padding: '4px 12px', borderRadius: 12, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'normal'
                        }}>
                          <StatusIcon /> {conf.label}
                        </div>
                      </div>
                    }
                    style={{ marginBottom: 16, border: '1px solid #f0f0f0', borderRadius: 8 }}
                  >
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', marginBottom: '16px' }}>
                          <div style={{ color: '#595959', fontWeight: 500 }}>Ngày đăng ký:</div>
                          <div style={{ fontWeight: 500, color: '#1f1f1f' }}>{dayjs(record.created_at).format('DD/MM/YYYY HH:mm')}</div>
                          <div style={{ color: '#595959', fontWeight: 500 }}>Nơi chuyển đến:</div>
                          <div style={{ fontWeight: 500, color: '#1f1f1f' }}>{record.noi_chuyen_den}</div>
                          <div style={{ color: '#595959', fontWeight: 500 }}>Lý do:</div>
                          <div style={{ fontWeight: 500, color: '#1f1f1f' }}>{record.ly_do}</div>
                        </div>
                        {(record.trang_thai === 'tu_choi' || record.trang_thai === 'dieu_chinh') && (
                          <div style={{ backgroundColor: '#fff2f0', padding: '12px', borderRadius: '6px', border: '1px solid #ffccc7', marginTop: '16px' }}>
                            <div style={{ color: '#cf1322', fontWeight: 600, marginBottom: '4px' }}>Lý do phản hồi từ tổ chức Đảng:</div>
                            <div style={{ color: '#cf1322' }}>{record.ghi_chu_duyet || 'Không có ghi chú'}</div>
                            <Button type="primary" danger size="small" style={{ marginTop: '12px' }} onClick={() => handleEditRecord(record)}>
                              Sửa lại hồ sơ
                            </Button>
                          </div>
                        )}
                      </div>
                      <div style={{ width: '300px', paddingLeft: 16, borderLeft: '1px solid #f0f0f0' }}>
                        <div style={{ fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileDoneOutlined style={{ color: '#1890ff' }} /> Tải biểu mẫu:
                        </div>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Button block icon={<DownloadOutlined />} loading={downloadingId === `${record.id}_mau1`} onClick={() => handleDownloadDoc(record, 'mau1')}>
                            {isTamThoi ? 'Đơn chuyển tạm thời (Mẫu 2)' : 'Đơn chuyển chính thức (Mẫu 1)'}
                          </Button>
                          <Button block icon={<DownloadOutlined />} loading={downloadingId === `${record.id}_mau4`} onClick={() => handleDownloadDoc(record, 'mau4')}>
                            Bản tự kiểm điểm (Mẫu 4)
                          </Button>
                          {isReserve && !isTamThoi && (
                            <>
                              <Button block icon={<DownloadOutlined />} loading={downloadingId === `${record.id}_mau3`} onClick={() => handleDownloadDoc(record, 'mau3')}>
                                Nhận xét ĐVDB (Đoàn - Mẫu 3)
                              </Button>
                              <Button block icon={<DownloadOutlined />} loading={downloadingId === `${record.id}_mau5`} onClick={() => handleDownloadDoc(record, 'mau5')}>
                                Nhận xét ĐVDB (ĐVHD - Mẫu 5)
                              </Button>
                            </>
                          )}
                        </Space>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </Card>
        </Col>
      </Row>
    </Tabs.TabPane>
  </Tabs>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '22px' }} />
            <span style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a1a' }}>
              Đăng ký chuyển sinh hoạt Đảng thành công!
            </span>
          </div>
        }
        open={isSuccessModalVisible}
        onOk={() => {
          setIsSuccessModalVisible(false);
          setJustRegisteredRecord(null);
        }}
        onCancel={() => {
          setIsSuccessModalVisible(false);
          setJustRegisteredRecord(null);
        }}
        okText="ĐỒNG Ý"
        cancelText="ĐÓNG"
        width={650}
        okButtonProps={{ style: { backgroundColor: '#52c41a', borderColor: '#52c41a', height: 40, fontWeight: 700, borderRadius: '6px' } }}
        cancelButtonProps={{ style: { height: 40, borderRadius: '6px' } }}
      >
        <div style={{ marginTop: 15, marginBottom: 20 }}>
          <Alert
            message="Yêu cầu đăng ký chuyển sinh hoạt Đảng của đồng chí đã được gửi thành công và đang chờ duyệt từ Ban Chi ủy."
            type="success"
            showIcon
            style={{ marginBottom: 20, borderRadius: '8px' }}
          />

          <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b', marginBottom: 12 }}>
            Vui lòng tải xuống các biểu mẫu hồ sơ dưới đây, in ra và nộp lại cho Chi bộ:
          </div>

          {justRegisteredRecord && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              {/* Document 1: Don xin chuyen */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  {justRegisteredRecord.loai_chuyen === 'tam_thoi' ? '1. Mẫu 2. Đơn xin chuyển sinh hoạt Đảng tạm thời' : '1. Mẫu 1. Đơn xin chuyển sinh hoạt Đảng (chính thức)'}
                </span>
                <Button
                  size="small"
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={downloadingId === `${justRegisteredRecord.id}_mau1`}
                  onClick={() => handleDownloadDoc(justRegisteredRecord, 'mau1')}
                >
                  Tải Mẫu {justRegisteredRecord.loai_chuyen === 'tam_thoi' ? '2' : '1'}
                </Button>
              </div>

              {/* Document 2: Ban tu kiem diem */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  2. Mẫu 4. Bản tự kiểm điểm chuyển sinh hoạt Đảng
                </span>
                <Button
                  size="small"
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={downloadingId === `${justRegisteredRecord.id}_mau4`}
                  onClick={() => handleDownloadDoc(justRegisteredRecord, 'mau4')}
                >
                  Tải Mẫu 4
                </Button>
              </div>

              {/* For Reserve Party members (Chính thức transfer out) */}
              {(memberData.loai_dang_vien === 'Dự bị' || memberData.dang_vien_du_bi === true || memberData.loai_dang_vien === 'dubi') && justRegisteredRecord.loai_chuyen !== 'tam_thoi' && (
                <>
                  {/* Document 3: Nhan xet DTN */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      3. Mẫu 3. Bản nhận xét Đảng viên dự bị của Đoàn Thanh niên
                    </span>
                    <Button
                      size="small"
                      type="primary"
                      icon={<DownloadOutlined />}
                      loading={downloadingId === `${justRegisteredRecord.id}_mau3`}
                      onClick={() => handleDownloadDoc(justRegisteredRecord, 'mau3')}
                    >
                      Tải Mẫu 3
                    </Button>
                  </div>

                  {/* Document 4: Nhan xet DVHD */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      4. Mẫu 5. Bản nhận xét Đảng viên dự bị của ĐVHD
                    </span>
                    <Button
                      size="small"
                      type="primary"
                      icon={<DownloadOutlined />}
                      loading={downloadingId === `${justRegisteredRecord.id}_mau5`}
                      onClick={() => handleDownloadDoc(justRegisteredRecord, 'mau5')}
                    >
                      Tải Mẫu 5
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
