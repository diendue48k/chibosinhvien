import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Space, Typography, message, Select, Tag, Popconfirm, Modal, Form, Input, Steps, Empty, Upload, Radio, Row, Col, Card, Divider } from 'antd';
import { PlusOutlined, UploadOutlined, CalendarOutlined, FileImageOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, UserOutlined, BookOutlined, TeamOutlined, IdcardOutlined, HistoryOutlined, SolutionOutlined } from '@ant-design/icons';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../services/permissionService';
import dayjs from 'dayjs';

const safeDayjs = (val) => {
  if (!val) return dayjs(null);
  if (val.toDate && typeof val.toDate === 'function') return dayjs(val.toDate());
  if (val.seconds) return dayjs(val.seconds * 1000);
  return dayjs(val);
};

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const XinVang = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  const [meetings, setMeetings] = useState([]);
  const [memberData, setMemberData] = useState(null);
  const [absenceRequests, setAbsenceRequests] = useState([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [base64File, setBase64File] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  
  const [form] = Form.useForm();

  const isAdminOrChiUy = useMemo(() => {
    if (!currentUser) return false;
    const privilegedRoles = [
      ROLES.ADMIN, 
      ROLES.BITHU, 
      ROLES.PHOBIHU, 
      ROLES.CAPUY, 
      ROLES.KIEMTRA, 
      ROLES.OFFICIAL_MANAGER, 
      ROLES.ADMISSION_MANAGER
    ];
    return privilegedRoles.includes(currentUser.role);
  }, [currentUser]);

  const getCleanName = (fullName) => {
    if (!fullName) return '';
    let name = fullName.replace(/^(Đ\/c\s+|TS\.\s+)/, '');
    name = name.replace(/\s*\(.*\)$/, '');
    return name.trim();
  };

  const fetchProfileAndMeetings = async () => {
    setLoadingProfile(true);
    try {
      // 1. Fetch current student's profile for ANY user (Admins/Chi ủy are also active members in dang_vien)
      if (currentUser) {
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
      }

      // 2. Fetch upcoming meetings
      const mSnapshot = await getDocs(collection(db, "lich_hop"));
      const mList = mSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      mList.sort((a, b) => safeDayjs(b.date).valueOf() - safeDayjs(a.date).valueOf());
      setMeetings(mList);

    } catch (e) {
      console.error("Lỗi khi tải thông tin cơ bản:", e);
      message.error("Lỗi khi tải hồ sơ hoặc lịch họp.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "vang_hop"));
      let list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // If regular member, filter to only their own requests for history
      if (!isAdminOrChiUy && memberData) {
        list = list.filter(r => r.dang_vien_id === memberData.id);
      } else if (!isAdminOrChiUy && currentUser && !memberData) {
        list = list.filter(r => r.mssv === currentUser.mssv || r.ho_ten === getCleanName(currentUser.name));
      }

      list.sort((a, b) => safeDayjs(b.created_at).valueOf() - safeDayjs(a.created_at).valueOf());
      setAbsenceRequests(list);
    } catch (e) {
      console.error("Lỗi tải đơn vắng:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndMeetings();
  }, [currentUser]);

  useEffect(() => {
    fetchRequests();
  }, [memberData, meetings]);

  const handleUploadFile = (file) => {
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error("Kích thước tệp minh chứng phải nhỏ hơn 5MB.");
      return Upload.LIST_IGNORE;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setBase64File(e.target.result);
      message.success("Đã giải nén và tải lên tệp minh chứng.");
    };
    reader.readAsDataURL(file);
    return false; // prevent upload trigger
  };

  const handleSubmitAbsence = async () => {
    if (!memberData) {
      message.error("Hồ sơ của bạn chưa được liên kết trong hệ thống để thực hiện gửi đơn.");
      return;
    }

    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const targetMeeting = meetings.find(m => m.id === values.cuoc_hop_id);
      if (!targetMeeting) {
        message.error("Lịch họp được chọn không tồn tại.");
        return;
      }

      const requestObj = {
        dang_vien_id: memberData.id,
        mssv: memberData.mssv || '',
        ho_ten: memberData.ho_ten || '',
        cccd: memberData.cccd || '',
        lop: memberData.lop || '',
        nhom: memberData.nhom || '',
        khoa: memberData.khoa || '',
        cuoc_hop_id: targetMeeting.id,
        cuoc_hop_title: targetMeeting.title,
        cuoc_hop_date: targetMeeting.date,
        ly_do: values.ly_do,
        minh_chung: base64File || '',
        trang_thai: 'pending',
        created_at: new Date().toISOString()
      };

      await addDoc(collection(db, "vang_hop"), requestObj);
      message.success("Gửi đơn đăng ký xin vắng họp thành công.");
      
      form.resetFields();
      setBase64File("");
      await fetchRequests();
    } catch (e) {
      console.error(e);
      if (!e.errorFields) message.error("Lỗi gửi đơn: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (requestId, status) => {
    try {
      await updateDoc(doc(db, "vang_hop", requestId), {
        trang_thai: status,
        updated_at: new Date().toISOString()
      });
      message.success(`Đã cập nhật trạng thái đơn vắng thành công.`);
      await fetchRequests();
    } catch (e) {
      console.error(e);
      message.error("Lỗi cập nhật trạng thái đơn: " + e.message);
    }
  };

  const upcomingMeetings = useMemo(() => {
    return meetings.filter(m => safeDayjs(m.date).isAfter(dayjs()));
  }, [meetings]);

  // Separate personal requests vs master requests in memory for Admin/Chi ủy
  const personalAbsenceRequests = useMemo(() => {
    if (!memberData) return [];
    return absenceRequests.filter(r => r.dang_vien_id === memberData.id);
  }, [absenceRequests, memberData]);

  const masterAbsenceRequests = useMemo(() => {
    return absenceRequests; // Contains all requests for Admin review
  }, [absenceRequests]);

  // Columns for personal history table
  const personalColumns = useMemo(() => [
    {
      title: 'STT',
      key: 'stt',
      width: 50,
      align: 'center',
      render: (_, __, index) => index + 1
    },
    {
      title: 'Cuộc họp xin vắng',
      key: 'meeting_info',
      width: 250,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>{record.cuoc_hop_title}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>
            <CalendarOutlined style={{ marginRight: 4 }} />
            {record.cuoc_hop_date ? safeDayjs(record.cuoc_hop_date).format('HH:mm - DD/MM/YYYY') : '--'}
          </div>
        </div>
      )
    },
    {
      title: 'Lý do vắng',
      dataIndex: 'ly_do',
      key: 'ly_do',
      width: 280,
      render: (text) => <Paragraph style={{ margin: 0, fontSize: '12px' }} ellipsis={{ rows: 2, expandable: true, symbol: 'Xem thêm' }}>{text}</Paragraph>
    },
    {
      title: 'Minh chứng',
      dataIndex: 'minh_chung',
      key: 'minh_chung',
      width: 120,
      align: 'center',
      render: (img) => {
        if (!img) return <span style={{ color: '#cbd5e1', fontSize: '11px' }}>Không cung cấp</span>;
        return (
          <Button
            type="dashed"
            size="small"
            icon={<FileImageOutlined />}
            onClick={() => {
              setPreviewImage(img);
              setIsPreviewVisible(true);
            }}
            style={{ borderColor: '#722ed1', color: '#722ed1', fontSize: '11px', fontWeight: 600 }}
          >
            Xem ảnh
          </Button>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trang_thai',
      key: 'trang_thai',
      width: 130,
      align: 'center',
      render: (status) => {
        let color = 'blue';
        let text = 'Chờ duyệt';
        if (status === 'approved') {
          color = 'green';
          text = 'Đồng ý vắng';
        } else if (status === 'rejected') {
          color = 'red';
          text = 'Từ chối';
        }
        return <Tag color={color} style={{ fontWeight: 700, borderRadius: '4px' }}>{text.toUpperCase()}</Tag>;
      }
    }
  ], []);

  // Columns for admin approval board
  const masterColumns = useMemo(() => [
    {
      title: 'STT',
      key: 'stt',
      width: 50,
      align: 'center',
      render: (_, __, index) => index + 1
    },
    {
      title: 'Đảng viên',
      key: 'member_info',
      width: 180,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 700, color: '#c62828' }}>{record.ho_ten}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>MSSV: {record.mssv}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>CCCD: {record.cccd || '--'}</div>
        </div>
      )
    },
    {
      title: 'Học tập & Nhóm',
      key: 'org_info',
      width: 160,
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          <div>Lớp: <Text strong>{record.lop || '--'}</Text></div>
          <div>Khoa: <Text strong>{record.khoa || '--'}</Text></div>
          <div style={{ color: '#0284c7', fontSize: '11px', fontWeight: 600 }}>Nhóm: {record.nhom || '--'}</div>
        </div>
      )
    },
    {
      title: 'Cuộc họp xin vắng',
      key: 'meeting_info',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>{record.cuoc_hop_title}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>
            <CalendarOutlined style={{ marginRight: 4 }} />
            {record.cuoc_hop_date ? safeDayjs(record.cuoc_hop_date).format('HH:mm - DD/MM/YYYY') : '--'}
          </div>
        </div>
      )
    },
    {
      title: 'Lý do vắng',
      dataIndex: 'ly_do',
      key: 'ly_do',
      width: 200,
      render: (text) => <Paragraph style={{ margin: 0, fontSize: '12px' }} ellipsis={{ rows: 2, expandable: true, symbol: 'Xem thêm' }}>{text}</Paragraph>
    },
    {
      title: 'Minh chứng',
      dataIndex: 'minh_chung',
      key: 'minh_chung',
      width: 110,
      align: 'center',
      render: (img) => {
        if (!img) return <span style={{ color: '#cbd5e1', fontSize: '11px' }}>Không cung cấp</span>;
        return (
          <Button
            type="dashed"
            size="small"
            icon={<FileImageOutlined />}
            onClick={() => {
              setPreviewImage(img);
              setIsPreviewVisible(true);
            }}
            style={{ borderColor: '#722ed1', color: '#722ed1', fontSize: '11px', fontWeight: 600 }}
          >
            Xem ảnh
          </Button>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trang_thai',
      key: 'trang_thai',
      width: 110,
      align: 'center',
      render: (status) => {
        let color = 'blue';
        let text = 'Chờ duyệt';
        if (status === 'approved') {
          color = 'green';
          text = 'Đồng ý vắng';
        } else if (status === 'rejected') {
          color = 'red';
          text = 'Từ chối';
        }
        return <Tag color={color} style={{ fontWeight: 700, borderRadius: '4px' }}>{text.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 170,
      align: 'center',
      render: (_, record) => {
        const isPending = record.trang_thai === 'pending';
        return (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              disabled={!isPending}
              onClick={() => handleUpdateStatus(record.id, 'approved')}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}
            >
              Đồng ý
            </Button>
            <Button
              danger
              type="primary"
              size="small"
              icon={<CloseCircleOutlined />}
              disabled={!isPending}
              onClick={() => handleUpdateStatus(record.id, 'rejected')}
              style={{ borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}
            >
              Từ chối
            </Button>
          </Space>
        );
      }
    }
  ], [meetings]);

  return (
    <div className="premium-page-container">
      <style>{`
        .premium-page-container {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .profile-card {
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          background: #ffffff;
        }
        .form-card {
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          background: #ffffff;
        }
      `}</style>

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
          <Title level={4} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.3px' }}>
            Đăng ký xin vắng & Phê duyệt sinh hoạt Chi bộ
          </Title>
        </div>
      </div>

      <Divider style={{ margin: '16px 0 24px' }} />

      {/* Row containing profile overview and registration form - visible to EVERY user linked to a profile */}
      <Row gutter={[24, 24]}>
        {/* Member profile overview card */}
        <Col xs={24} md={9}>
          <Card
            className="profile-card"
            title={
              <Space>
                <UserOutlined style={{ color: '#c62828' }} />
                <span style={{ fontWeight: 800 }}>Thông tin Đảng viên đăng ký</span>
              </Space>
            }
            loading={loadingProfile}
          >
            {memberData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    backgroundColor: '#fff1f0', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '32px', border: '2px solid #ffa39e',
                    boxShadow: '0 4px 10px rgba(198, 40, 40, 0.1)'
                  }}>
                    ⭐
                  </div>
                </div>
                
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <Title level={5} style={{ margin: 0, color: '#c62828', fontWeight: 800 }}>{memberData.ho_ten}</Title>
                  <Text type="secondary" style={{ fontSize: '12px' }}>{isAdminOrChiUy ? 'Đảng viên - Ban Chi ủy' : 'Đảng viên đang sinh hoạt'}</Text>
                </div>

                <Divider style={{ margin: '4px 0' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '13px', color: '#475569' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#8c8c8c' }}><IdcardOutlined style={{ marginRight: 6 }} /> MSSV:</span>
                    <strong style={{ color: '#1e293b' }}>{memberData.mssv}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#8c8c8c' }}><IdcardOutlined style={{ marginRight: 6 }} /> Số CCCD:</span>
                    <strong style={{ color: '#1e293b' }}>{memberData.cccd || '--'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#8c8c8c' }}><BookOutlined style={{ marginRight: 6 }} /> Lớp sinh hoạt:</span>
                    <strong style={{ color: '#1e293b' }}>{memberData.lop}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#8c8c8c' }}><BookOutlined style={{ marginRight: 6 }} /> Khoa đào tạo:</span>
                    <strong style={{ color: '#1e293b' }}>{memberData.khoa}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#8c8c8c' }}><TeamOutlined style={{ marginRight: 6 }} /> Nhóm sinh hoạt:</span>
                    <strong style={{ color: '#0284c7' }}>{memberData.nhom || '--'}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <Empty description="Tài khoản đăng nhập chưa được liên kết với hồ sơ Đảng viên nào" />
            )}
          </Card>
        </Col>

        {/* Form submission card */}
        <Col xs={24} md={15}>
          <Card
            className="form-card"
            title={
              <Space>
                <PlusOutlined style={{ color: '#c62828' }} />
                <span style={{ fontWeight: 800 }}>Biểu mẫu Đăng ký vắng họp</span>
              </Space>
            }
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmitAbsence}
            >
              <Form.Item
                name="cuoc_hop_id"
                label={<span style={{ fontWeight: 600 }}>Chọn cuộc họp xin vắng:</span>}
                rules={[{ required: true, message: 'Vui lòng chọn cuộc họp!' }]}
              >
                <Select
                  placeholder="Lựa chọn cuộc họp sắp diễn ra..."
                  dropdownStyle={{ borderRadius: '6px' }}
                >
                  {upcomingMeetings.map(m => (
                    <Option key={m.id} value={m.id}>
                      {m.title} ({safeDayjs(m.date).format('HH:mm - DD/MM/YYYY')})
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="ly_do"
                label={<span style={{ fontWeight: 600 }}>Lý do xin vắng (Trình bày chi tiết):</span>}
                rules={[{ required: true, message: 'Vui lòng nhập lý do vắng!' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="Ví dụ: Trùng lịch thi cuối kỳ môn học vào đúng khung giờ họp chi bộ, trùng lịch học quân sự tập trung..."
                  style={{ borderRadius: '6px' }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600 }}>Minh chứng đính kèm (Ảnh chụp lịch thi, lịch học, giấy tờ chứng minh...):</span>}
              >
                <Upload
                  accept="image/*"
                  beforeUpload={handleUploadFile}
                  showUploadList={true}
                  maxCount={1}
                >
                  <Button icon={<UploadOutlined />} style={{ borderRadius: '6px' }}>
                    Chọn ảnh minh chứng tải lên
                  </Button>
                </Upload>
                {base64File && (
                  <div style={{ marginTop: 12, border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, maxWidth: 140, position: 'relative' }}>
                    <img src={base64File} alt="Preview" style={{ width: '100%', borderRadius: 6, maxHeight: 120, objectFit: 'cover' }} />
                  </div>
                )}
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  disabled={!memberData}
                  style={{ backgroundColor: '#c62828', borderColor: '#c62828', fontWeight: 700, borderRadius: '6px', height: 40, width: '100%' }}
                >
                  NỘP ĐƠN XIN VẮNG HỌP
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>

      {/* 1. Personal requests history table - visible to everyone who has a profile */}
      {memberData && (
        <Card
          style={{ marginTop: 24, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
          title={
            <Space>
              <HistoryOutlined style={{ color: '#c62828' }} />
              <span style={{ fontWeight: 800, color: '#1e293b' }}>
                Lịch sử đăng ký xin vắng của cá nhân đồng chí
              </span>
            </Space>
          }
        >
          <Table
            columns={personalColumns}
            dataSource={personalAbsenceRequests}
            loading={loading}
            rowKey="id"
            locale={{
              emptyText: (
                <Empty
                  description={
                    <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px' }}>
                      Đồng chí chưa đăng ký đơn xin vắng họp sinh hoạt nào
                    </div>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )
            }}
            pagination={{
              defaultPageSize: 5,
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '25', '1000'],
              showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đơn xin vắng của bạn`
            }}
          />
        </Card>
      )}

      {/* 2. Master approval dashboard table - visible to ADMIN/CHI ỦY ONLY */}
      {isAdminOrChiUy && (
        <Card
          style={{ marginTop: 32, borderRadius: 12, border: '1px solid #ffa39e', boxShadow: '0 4px 16px rgba(198, 40, 40, 0.05)', backgroundColor: '#fffbfb' }}
          title={
            <Space>
              <SolutionOutlined style={{ color: '#c62828' }} />
              <span style={{ fontWeight: 800, color: '#c62828' }}>
                BAN CHI ỦY: Duyệt & Quản lý đơn vắng họp sinh hoạt toàn Chi bộ
              </span>
            </Space>
          }
        >
          <Table
            columns={masterColumns}
            dataSource={masterAbsenceRequests}
            loading={loading}
            rowKey="id"
            locale={{
              emptyText: (
                <Empty
                  description={
                    <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px' }}>
                      Không có đơn xin vắng họp sinh hoạt nào cần xử lý
                    </div>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )
            }}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '25', '50', '1000'],
              showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đơn xin vắng toàn chi bộ`
            }}
          />
        </Card>
      )}

      {/* Lightbox Preview Modal */}
      <Modal
        open={isPreviewVisible}
        title={<span style={{ fontWeight: 800 }}>Xem hình ảnh Minh chứng xin vắng</span>}
        footer={null}
        onCancel={() => setIsPreviewVisible(false)}
        width={680}
      >
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <img src={previewImage} alt="Minh chứng" style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 500, objectFit: 'contain' }} />
        </div>
      </Modal>
    </div>
  );
};

export default XinVang;
