import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Space, Typography, message, Select, Tag, Popconfirm, Modal, DatePicker, Form, Input, Steps, Empty, Checkbox, Radio, Row, Col, Card, Divider, Tooltip, Upload, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, CalendarOutlined, EnvironmentOutlined, TagOutlined, ExclamationCircleOutlined, DeleteOutlined, InfoCircleOutlined, MailOutlined, ArrowRightOutlined, SendOutlined, UploadOutlined } from '@ant-design/icons';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../services/permissionService';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Real-time Meeting Notification Email Template Generator
const generateDefaultMeetingEmailTemplate = (values, imageUrl) => {
  if (!values) return { subject: '', html: '' };
  
  const parsedMonth = values.date ? dayjs(values.date).format('M') : dayjs().format('M');
  const parsedYear = values.date ? dayjs(values.date).format('YYYY') : dayjs().format('YYYY');
  const formattedTime = values.date ? dayjs(values.date).format('HH:mm - DD/MM/YYYY') : dayjs().format('HH:mm - DD/MM/YYYY');
  
  const subject = `[THÔNG BÁO] V/v HỌP CHI BỘ THÁNG ${parsedMonth}/${parsedYear}`;
  
  const html = `<div style="font-family: 'SVN-Gilroy', 'SVN Gilroy', 'Gilroy', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #333; line-height: 1.6;">
  <div style="background: linear-gradient(135deg, #c62828, #b71c1c); padding: 24px; text-align: center; border-radius: 10px 10px 0 0; font-family: inherit;">
    <h2 style="color: white; margin: 0 0 4px 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; font-family: inherit;">CHI BỘ SINH VIÊN</h2>
    <p style="color: #ffcdd2; margin: 0; font-size: 13px; font-family: inherit;">Trường Đại học Kinh tế - Đại học Đà Nẵng</p>
  </div>
  <div style="padding: 24px; border: 1px solid #e8e8e8; border-top: none; border-radius: 0 0 10px 10px; background: #fff; font-family: inherit;">
    <p style="font-size: 15px; margin-bottom: 6px; font-family: inherit;">Kính gửi các Đồng chí Đảng viên,</p>
    <p style="font-size: 14px; color: #555; text-align: justify; font-family: inherit;">Thay mặt Chi ủy Chi bộ Sinh viên, mình xin thông báo về việc họp Chi bộ định kỳ <strong>Tháng ${parsedMonth}/${parsedYear}</strong> với thông tin chi tiết như sau:</p>
    
    <div style="background: #fff1f0; border: 1px solid #ffa39e; border-radius: 8px; padding: 14px 18px; margin: 16px 0; font-family: inherit;">
      <p style="margin: 0 0 10px 0; font-weight: 700; color: #c62828; font-size: 14px; font-family: inherit;">📅 Lịch họp định kỳ chi tiết</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; font-family: inherit;">
        <tr><td style="padding: 4px 0; color: #8c8c8c; width: 100px; font-weight: 600; font-family: inherit;">Thời gian:</td><td style="font-weight: 600; color: #333; font-family: inherit;">${formattedTime}</td></tr>
        <tr><td style="padding: 4px 0; color: #8c8c8c; font-weight: 600; font-family: inherit;">Địa điểm:</td><td style="font-weight: 600; color: #333; font-family: inherit;">${values.location || '[Địa điểm]'}</td></tr>
        <tr><td style="padding: 4px 0; color: #8c8c8c; font-weight: 600; font-family: inherit;">Trang phục:</td><td style="font-weight: 600; color: #333; font-family: inherit;">${values.dress_code || 'Tự do'}</td></tr>
        ${values.note ? `<tr><td style="padding: 4px 0; color: #8c8c8c; font-weight: 600; font-family: inherit;">Lưu ý:</td><td style="color: #cf1322; font-weight: 600; font-family: inherit;">${values.note}</td></tr>` : ''}
      </table>
    </div>

    <div style="background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 14px 18px; margin: 16px 0; font-family: inherit;">
      <p style="margin: 0 0 8px 0; font-weight: 700; color: #555; font-size: 14px; font-family: inherit;">📝 Nội dung chương trình sinh hoạt chi tiết:</p>
      <p style="margin: 0; font-size: 13px; color: #555; white-space: pre-line; font-family: inherit;">${values.content || 'Xem chi tiết chương trình trong hệ thống.'}</p>
    </div>

    ${imageUrl ? `<div style="text-align: center; margin: 20px 0; font-family: inherit;"><img src="${imageUrl}" alt="Meeting Flyer" style="max-width: 100%; border-radius: 6px; border: 1px solid #e8e8e8; max-height: 250px; object-fit: contain;" /></div>` : ''}

    <p style="font-size: 13px; color: #64748b; margin-top: 16px; text-align: justify; line-height: 1.5; font-family: inherit;">
      * <em>Lưu ý:</em> Đồng chí nào có lý do bất khả kháng không thể tham gia họp, vui lòng truy cập hệ thống và gửi **Đơn xin vắng họp** trước giờ họp để ban chi ủy xem xét phê duyệt.
    </p>
    <p style="font-size: 14px; margin-top: 20px; font-weight: 600; color: #555; font-family: inherit;">Thân ái chúc các đồng chí sức khỏe và công tác tốt./.</p>
    <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 20px 0 12px 0; font-family: inherit;" />
    <p style="color: #999; font-size: 11px; margin: 0; text-align: center; font-family: inherit;">Email tự động gửi từ hệ thống quản lý Chi bộ Sinh viên - Đại học Kinh tế ĐHĐN.</p>
  </div>
</div>`;

  return { subject, html };
};

// Real-time Meeting Board Announcement Generator
const generateDefaultNotificationTemplate = (values) => {
  if (!values) return { title: '', content: '' };
  
  const parsedMonth = values.date ? dayjs(values.date).format('M') : dayjs().format('M');
  const parsedYear = values.date ? dayjs(values.date).format('YYYY') : dayjs().format('YYYY');
  const formattedTime = values.date ? dayjs(values.date).format('HH:mm - DD/MM/YYYY') : dayjs().format('HH:mm - DD/MM/YYYY');
  
  const title = `[THÔNG BÁO] V/v HỌP CHI BỘ THÁNG ${parsedMonth}/${parsedYear}`;
  
  const content = `Xin chào các đồng chí,

Thay mặt Chi ủy Chi bộ Sinh viên, mình xin thông báo về việc họp Chi bộ định kỳ tháng 0${parsedMonth}/${parsedYear} như sau:
- Thời gian: ${formattedTime}
- Địa điểm: ${values.location || '[Địa điểm]'}
- Trang phục: ${values.dress_code || 'Tự do'}
- Lưu ý: ${values.note || 'Không có'}

Nội dung cuộc họp:
${values.content || 'Xem chi tiết trong lịch họp.'}`;

  return { title, content };
};

const LichHop = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState([]);
  const [activeMembers, setActiveMembers] = useState([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Email Notification preview states
  const [meetingImageBase64, setMeetingImageBase64] = useState("");
  const [sendEmailChecked, setSendEmailChecked] = useState(true);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailHtml, setEmailHtml] = useState("");
  const [isEmailEditedManually, setIsEmailEditedManually] = useState(false);

  // Board Notification preview states
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationContent, setNotificationContent] = useState("");
  const [isNotificationEditedManually, setIsNotificationEditedManually] = useState(false);

  // Editing state
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [notificationId, setNotificationId] = useState(null);

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

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "lich_hop"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by date descending
      list.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
      setMeetings(list);
    } catch (e) {
      console.error("Lỗi tải lịch họp:", e);
      message.error("Không thể tải danh sách lịch họp.");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveMembers = async () => {
    try {
      const dvSnapshot = await getDocs(collection(db, "dang_vien"));
      const list = dvSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(m => m.trang_thai !== 'da_chuyen');
      setActiveMembers(list);
    } catch (e) {
      console.error("Lỗi tải danh sách đảng viên:", e);
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchActiveMembers();
  }, []);

  const sendEmailsBackground = () => {
    if (activeMembers.length > 0) {
      let successEmails = 0;
      let failEmails = 0;

      const emailPromises = activeMembers.map(async (m) => {
        const toEmail = m.email || m.email_sv || '';
        if (!toEmail) return;
        try {
          await fetch('http://localhost:5000/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: toEmail,
              subject: emailSubject,
              html: emailHtml
            })
          });
          successEmails++;
        } catch (err) {
          console.warn(`Gửi mail thất bại cho ${m.ho_ten}:`, err);
          failEmails++;
        }
      });

      Promise.all(emailPromises).then(() => {
        console.log(`Đã gửi email: ${successEmails} thành công, ${failEmails} thất bại.`);
      });
    }
  };

  const handleEditClick = async (meeting) => {
    setEditingMeeting(meeting);
    
    // Allow previews to dynamically synchronize in real-time when form fields are edited
    setIsEmailEditedManually(false);
    setIsNotificationEditedManually(false);

    form.setFieldsValue({
      title: meeting.title,
      date: dayjs(meeting.date),
      location: meeting.location,
      dress_code: meeting.dress_code || 'Tự do',
      note: meeting.note || '',
      content: meeting.content || '',
      image_url: meeting.image_url || '',
      send_email: false
    });

    setMeetingImageBase64(meeting.image_url && meeting.image_url.startsWith('data:image') ? meeting.image_url : '');
    setSendEmailChecked(false);

    // Fetch related notification
    try {
      const q = query(collection(db, "notifications"), where("meeting_id", "==", meeting.id));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const notifDoc = querySnapshot.docs[0];
        setNotificationId(notifDoc.id);
        setNotificationTitle(notifDoc.data().title || '');
        setNotificationContent(notifDoc.data().content || '');
      } else {
        setNotificationId(null);
        const defaultNotif = generateDefaultNotificationTemplate(meeting);
        setNotificationTitle(defaultNotif.title);
        setNotificationContent(defaultNotif.content);
      }
    } catch (e) {
      console.error("Lỗi tải thông báo:", e);
      setNotificationId(null);
    }

    const defaultEmail = generateDefaultMeetingEmailTemplate(meeting, meeting.image_url);
    setEmailSubject(defaultEmail.subject);
    setEmailHtml(defaultEmail.html);

    setIsAddModalVisible(true);
  };

  const handleAddMeeting = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const meetingDate = values.date.format('YYYY-MM-DD HH:mm');
      const finalImageUrl = meetingImageBase64 || values.image_url || '';

      const meetingData = {
        title: values.title,
        date: meetingDate,
        location: values.location,
        dress_code: values.dress_code || 'Tự do',
        note: values.note || '',
        content: values.content || '',
        image_url: finalImageUrl,
        updated_at: new Date().toISOString()
      };

      if (editingMeeting) {
        // --- EDIT MODE ---
        // 1. Update meeting
        await updateDoc(doc(db, "lich_hop", editingMeeting.id), meetingData);

        // 2. Update notification
        if (notificationId) {
          await updateDoc(doc(db, "notifications", notificationId), {
            title: notificationTitle,
            content: notificationContent,
            image_url: finalImageUrl,
            updated_at: new Date().toISOString()
          });
        } else {
          await addDoc(collection(db, "notifications"), {
            title: notificationTitle,
            content: notificationContent,
            meeting_id: editingMeeting.id,
            image_url: finalImageUrl,
            created_at: new Date().toISOString(),
            created_by: currentUser?.name || 'Chi ủy'
          });
        }

        // 3. Send email to active members if checked
        if (sendEmailChecked) {
          sendEmailsBackground();
        }

        message.success("Đã cập nhật lịch họp và thông báo chi bộ thành công.");
      } else {
        // --- ADD MODE ---
        const newMeeting = {
          ...meetingData,
          created_at: new Date().toISOString(),
          created_by: currentUser?.name || 'Chi ủy'
        };
        const docRef = await addDoc(collection(db, "lich_hop"), newMeeting);
        const meetingId = docRef.id;

        await addDoc(collection(db, "notifications"), {
          title: notificationTitle,
          content: notificationContent,
          meeting_id: meetingId,
          image_url: finalImageUrl,
          created_at: new Date().toISOString(),
          created_by: currentUser?.name || 'Chi ủy'
        });

        if (sendEmailChecked) {
          sendEmailsBackground();
        }

        message.success("Đã đăng ký lịch họp và đăng thông báo thành công định kỳ.");
      }

      setIsAddModalVisible(false);
      form.resetFields();
      setMeetingImageBase64("");
      setEditingMeeting(null);
      setNotificationId(null);
      await fetchMeetings();
    } catch (e) {
      console.error("Lỗi lưu lịch họp:", e);
      if (!e.errorFields) message.error("Lỗi hệ thống: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMeeting = async (id, title) => {
    try {
      await deleteDoc(doc(db, "lich_hop", id));
      message.success(`Đã xóa lịch họp "${title}" thành công.`);
      await fetchMeetings();
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi xóa lịch họp: " + e.message);
    }
  };

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
        .meeting-card {
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.25s ease;
          border: 1px solid #f0f0f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          height: 100%;
        }
        .meeting-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.08);
          border-color: #ffa39e;
        }
      `}</style>

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
          <Title level={4} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.3px' }}>
            Lịch họp & Thông báo sinh hoạt Chi bộ
          </Title>
        </div>

        {isAdminOrChiUy && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              const initialVals = {
                title: `Họp Chi bộ định kỳ tháng ${dayjs().format('MM/YYYY')}`,
                date: dayjs().add(1, 'day').set('hour', 19).set('minute', 0),
                dress_code: 'Áo thun Chi bộ (hoặc sơ mi trắng)',
                location: '',
                note: '',
                content: '',
                image_url: '',
                send_email: true
              };
              form.setFieldsValue(initialVals);
              
              setMeetingImageBase64("");
              setSendEmailChecked(true);
              setIsEmailEditedManually(false);
              setIsNotificationEditedManually(false);
              
              // Generate default preview values
              const defaultEmail = generateDefaultMeetingEmailTemplate(initialVals, "");
              setEmailSubject(defaultEmail.subject);
              setEmailHtml(defaultEmail.html);

              const defaultNotif = generateDefaultNotificationTemplate(initialVals);
              setNotificationTitle(defaultNotif.title);
              setNotificationContent(defaultNotif.content);
              
              setIsAddModalVisible(true);
            }}
            style={{ backgroundColor: '#c62828', borderColor: '#c62828', borderRadius: '6px', fontWeight: 600, height: 38 }}
          >
            Đăng ký lịch họp
          </Button>
        )}
      </div>

      <Divider style={{ margin: '16px 0 24px' }} />

      {loading ? (
        <Card style={{ borderRadius: '8px', border: '1px solid #f0f0f0' }}>
          <Empty description="Đang tải dữ liệu lịch họp..." />
        </Card>
      ) : meetings.length === 0 ? (
        <Empty
          description={
            <div style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
              Chưa có lịch họp chi bộ nào được đăng ký
            </div>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Row gutter={[20, 20]}>
          {meetings.map((meeting) => {
            const isUpcoming = dayjs(meeting.date).isAfter(dayjs());
            const formattedDate = dayjs(meeting.date).format('DD/MM/YYYY');
            const formattedTime = dayjs(meeting.date).format('HH:mm');

            return (
              <Col xs={24} sm={12} md={8} key={meeting.id}>
                <Card
                  className="meeting-card"
                  cover={
                    meeting.image_url ? (
                      <div style={{ height: 160, overflow: 'hidden', borderBottom: '1px solid #f0f0f0', position: 'relative' }}>
                        <img 
                          src={meeting.image_url} 
                          alt="Flyer" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                        <Tag 
                          color={isUpcoming ? 'green' : 'default'} 
                          style={{ position: 'absolute', top: 12, right: 12, fontWeight: 700, borderRadius: 4 }}
                        >
                          {isUpcoming ? 'SẮP DIỄN RA' : 'ĐÃ DIỄN RA'}
                        </Tag>
                      </div>
                    ) : (
                      <div style={{ 
                        height: 140, 
                        background: 'linear-gradient(135deg, #c62828 0%, #7f0000 100%)', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        color: 'white',
                        padding: 16,
                        textAlign: 'center',
                        position: 'relative'
                      }}>
                        <CalendarOutlined style={{ fontSize: 32, marginBottom: 8, opacity: 0.8 }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px' }}>ĐẠI HỌC KINH TẾ</span>
                        <span style={{ fontSize: '11px', opacity: 0.8 }}>CHI BỘ SINH VIÊN</span>
                        <Tag 
                          color={isUpcoming ? 'green' : 'orange'} 
                          style={{ position: 'absolute', top: 12, right: 12, fontWeight: 700, borderRadius: 4, border: 'none' }}
                        >
                          {isUpcoming ? 'SẮP DIỄN RA' : 'ĐÃ DIỄN RA'}
                        </Tag>
                      </div>
                    )
                  }
                   actions={[
                    <Button 
                      type="link" 
                      onClick={() => {
                        setSelectedMeeting(meeting);
                        setIsDetailModalVisible(true);
                      }}
                      style={{ fontWeight: 600 }}
                    >
                      Chi tiết lịch họp
                    </Button>,
                    isUpcoming && !isAdminOrChiUy && (
                      <Button 
                        type="link" 
                        danger
                        href="/xin-vang"
                        style={{ fontWeight: 700 }}
                      >
                        Đăng ký xin vắng
                      </Button>
                    ),
                    isAdminOrChiUy && (
                      <Button 
                        type="link" 
                        icon={<EditOutlined />}
                        onClick={() => handleEditClick(meeting)}
                        style={{ fontWeight: 600, color: '#722ed1' }}
                      />
                    ),
                    isAdminOrChiUy && (
                      <Popconfirm
                        title="Xóa lịch họp?"
                        description="Việc này sẽ xóa lịch họp vĩnh viễn trong CSDL. Bạn có chắc không?"
                        onConfirm={() => handleDeleteMeeting(meeting.id, meeting.title)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                      >
                        <Button 
                          type="link" 
                          danger 
                          icon={<DeleteOutlined />}
                          style={{ fontWeight: 600 }}
                        />
                      </Popconfirm>
                    )
                  ].filter(Boolean)}
                >
                  <Card.Meta
                    title={
                      <div style={{ whiteSpace: 'normal', height: '44px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontWeight: 800, fontSize: '15px', color: '#1e293b', lineHeight: 1.4 }}>
                        {meeting.title}
                      </div>
                    }
                    description={
                      <div style={{ marginTop: 12, fontSize: '13px', display: 'flex', flexDirection: 'column', gap: 6, color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CalendarOutlined style={{ color: '#c62828' }} />
                          <strong>{formattedTime} - {formattedDate}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <EnvironmentOutlined style={{ color: '#c62828' }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={meeting.location}>{meeting.location}</span>
                        </div>
                        {meeting.dress_code && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <TagOutlined style={{ color: '#c62828' }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meeting.dress_code}</span>
                          </div>
                        )}
                      </div>
                    }
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Add Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
            <span style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a1a' }}>
              {editingMeeting ? "Cập nhật & Chỉnh sửa lịch họp Chi bộ" : "Đăng ký lịch họp Chi bộ định kỳ"}
            </span>
          </div>
        }
        open={isAddModalVisible}
        onOk={handleAddMeeting}
        onCancel={() => {
          setIsAddModalVisible(false);
          setEditingMeeting(null);
          setNotificationId(null);
        }}
        confirmLoading={submitting}
        okText={editingMeeting ? "LƯU CẬP NHẬT" : "ĐĂNG KÝ HỌP CHI BỘ"}
        cancelText="HỦY BỎ"
        width={1180}
        style={{ top: 20 }}
        styles={{ body: { overflowY: 'auto', maxHeight: 'calc(100vh - 160px)', paddingRight: '4px', paddingTop: '10px' } }}
        okButtonProps={{ style: { backgroundColor: '#c62828', borderColor: '#c62828', height: 38, fontWeight: 700, borderRadius: '6px' } }}
        cancelButtonProps={{ style: { height: 38, borderRadius: '6px' } }}
      >
        <Row gutter={20}>
          {/* Left Column: Form and inputs */}
          <Col span={11}>
            <Form
              form={form}
              layout="vertical"
              onValuesChange={(changedValues, allValues) => {
                if (changedValues.send_email !== undefined) {
                  setSendEmailChecked(changedValues.send_email);
                }
                if (!isNotificationEditedManually) {
                  const generatedNotif = generateDefaultNotificationTemplate(allValues);
                  setNotificationTitle(generatedNotif.title);
                  setNotificationContent(generatedNotif.content);
                }
                if (!isEmailEditedManually) {
                  const generatedEmail = generateDefaultMeetingEmailTemplate(allValues, meetingImageBase64);
                  setEmailSubject(generatedEmail.subject);
                  setEmailHtml(generatedEmail.html);
                }
              }}
            >
              <Row gutter={12}>
                <Col span={14}>
                  <Form.Item
                    name="title"
                    label={<span style={{ fontWeight: 600, fontSize: '13px' }}>Tiêu đề lịch họp:</span>}
                    rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
                    style={{ marginBottom: '8px' }}
                  >
                    <Input 
                      placeholder="Họp Chi bộ tháng..." 
                      style={{ borderRadius: '6px', height: '34px' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item
                    name="date"
                    label={<span style={{ fontWeight: 600, fontSize: '13px' }}>Thời gian diễn ra:</span>}
                    rules={[{ required: true, message: 'Vui lòng chọn ngày và giờ!' }]}
                    style={{ marginBottom: '8px' }}
                  >
                    <DatePicker 
                      showTime
                      format="YYYY-MM-DD HH:mm"
                      style={{ width: '100%', borderRadius: '6px', height: '34px' }} 
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="location"
                    label={<span style={{ fontWeight: 600, fontSize: '13px' }}>Địa điểm họp:</span>}
                    rules={[{ required: true, message: 'Vui lòng nhập địa điểm!' }]}
                    style={{ marginBottom: '8px' }}
                  >
                    <Input 
                      placeholder="Phòng họp H208..." 
                      style={{ borderRadius: '6px', height: '34px' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="dress_code"
                    label={<span style={{ fontWeight: 600, fontSize: '13px' }}>Trang phục quy định:</span>}
                    style={{ marginBottom: '8px' }}
                  >
                    <Input 
                      placeholder="Áo thun Chi bộ..." 
                      style={{ borderRadius: '6px', height: '34px' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* TẢI LÊN BANNER VÀ LIÊN KẾT ẢNH TRÊN CÙNG MỘT DÒNG ĐỂ TIẾT KIỆM KHÔNG GIAN */}
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    label={<span style={{ fontWeight: 600, fontSize: '13px' }}>Banner cuộc họp (Tải lên):</span>}
                    style={{ marginBottom: '8px' }}
                  >
                    <Upload
                      accept="image/*"
                      beforeUpload={(file) => {
                        const isLt5M = file.size / 1024 / 1024 < 5;
                        if (!isLt5M) {
                          message.error("Kích thước hình ảnh phải nhỏ hơn 5MB.");
                          return Upload.LIST_IGNORE;
                        }
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          setMeetingImageBase64(e.target.result);
                          const currentVals = form.getFieldsValue();
                          if (!isEmailEditedManually) {
                            const generated = generateDefaultMeetingEmailTemplate(currentVals, e.target.result);
                            setEmailSubject(generated.subject);
                            setEmailHtml(generated.html);
                          }
                          message.success("Tải lên hình ảnh banner thành công.");
                        };
                        reader.readAsDataURL(file);
                        return false;
                      }}
                      showUploadList={false}
                      maxCount={1}
                    >
                      <Button icon={<UploadOutlined />} style={{ borderRadius: '6px', width: '100%', height: '34px', fontSize: '12px' }}>
                        Chọn ảnh từ máy tính
                      </Button>
                    </Upload>
                    {meetingImageBase64 && (
                      <div style={{ marginTop: 4, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                        <span style={{ fontSize: '11px', color: '#52c41a', fontWeight: 600 }}>✓ Đã đính kèm ảnh</span>
                        <Button 
                          type="text" 
                          danger 
                          size="small" 
                          onClick={() => {
                            setMeetingImageBase64("");
                            const currentVals = form.getFieldsValue();
                            if (!isEmailEditedManually) {
                              const generated = generateDefaultMeetingEmailTemplate(currentVals, "");
                              setEmailSubject(generated.subject);
                              setEmailHtml(generated.html);
                            }
                          }}
                          style={{ fontSize: '10px', fontWeight: 600, padding: 0, height: 'auto' }}
                        >
                          Xóa
                        </Button>
                      </div>
                    )}
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="image_url"
                    label={<span style={{ fontWeight: 600, fontSize: '13px' }}>Đường dẫn ảnh trực tiếp (URL):</span>}
                    style={{ marginBottom: '8px' }}
                  >
                    <Input 
                      placeholder="https://example.com/banner.jpg" 
                      style={{ borderRadius: '6px', height: '34px' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="note"
                label={<span style={{ fontWeight: 600, fontSize: '13px' }}>Lưu ý cuộc họp (mang theo sổ tay...):</span>}
                style={{ marginBottom: '8px' }}
              >
                <Input 
                  placeholder="Ví dụ: Mang theo sổ tay Đảng viên..." 
                  style={{ borderRadius: '6px', height: '34px' }}
                />
              </Form.Item>

              <Form.Item
                name="content"
                label={<span style={{ fontWeight: 600, fontSize: '13px' }}>Nội dung chi tiết chương trình họp:</span>}
                style={{ marginBottom: '8px' }}
              >
                <TextArea 
                  rows={2}
                  placeholder="1. Tuyên bố lý do... 2. Đánh giá công tác tháng... 3. Phương hướng hoạt động..." 
                  style={{ borderRadius: '6px', fontSize: '12px' }}
                />
              </Form.Item>

              <Divider style={{ margin: '10px 0' }} />

              <Form.Item
                name="send_email"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <Checkbox style={{ fontWeight: 600, color: '#c62828', fontSize: '13px' }}>
                  Đồng thời gửi email thông báo họp cho toàn thể Đảng viên
                </Checkbox>
              </Form.Item>
            </Form>
          </Col>

          {/* Right Column: Dual-Tab Visual Editor (Board Announcements + Email Notifications) */}
          <Col span={13}>
            <div style={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              background: '#f8fafc', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0',
              padding: '12px 14px',
              minHeight: '430px',
              height: '430px'
            }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#c62828' }} />
                <span>Xem trước & Điều chỉnh nội dung Thông báo / Email:</span>
              </div>

              <Tabs
                defaultActiveKey="1"
                size="small"
                style={{ margin: 0 }}
                items={[
                  {
                    key: '1',
                    label: <span style={{ fontWeight: 700, fontSize: '12px' }}><InfoCircleOutlined style={{ marginRight: 4 }} /> 1. Bảng tin</span>,
                    children: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                        <div>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Tiêu đề Thông báo:</span>
                          <Input 
                            value={notificationTitle} 
                            onChange={e => {
                              setNotificationTitle(e.target.value);
                              setIsNotificationEditedManually(true);
                            }}
                            style={{ borderRadius: '6px', marginTop: 2, height: '32px', fontSize: '12px' }} 
                          />
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Nội dung Thông báo (Hiển thị bảng tin):</span>
                          <Input.TextArea 
                            value={notificationContent} 
                            onChange={e => {
                              setNotificationContent(e.target.value);
                              setIsNotificationEditedManually(true);
                            }}
                            rows={8}
                            style={{ borderRadius: '6px', marginTop: 2, fontSize: '11px', lineHeight: '1.5' }} 
                          />
                          <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: 2 }}>
                            * Ban chi ủy có thể tự do điều chỉnh tiêu đề và nội dung để đăng lên bảng tin.
                          </div>
                        </div>
                      </div>
                    )
                  },
                  {
                    key: '2',
                    label: <span style={{ fontWeight: 700, fontSize: '12px' }}><EditOutlined style={{ marginRight: 4 }} /> 2. Soạn Email (HTML)</span>,
                    children: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                        {sendEmailChecked ? (
                          <>
                            <div>
                              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Tiêu đề email gửi đi:</span>
                              <Input 
                                value={emailSubject} 
                                onChange={e => {
                                  setEmailSubject(e.target.value);
                                  setIsEmailEditedManually(true);
                                }}
                                style={{ borderRadius: '6px', marginTop: 2, height: '32px', fontSize: '12px' }} 
                              />
                            </div>
                            <div>
                              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Nội dung email (Mã HTML):</span>
                              <Input.TextArea 
                                value={emailHtml} 
                                onChange={e => {
                                  setEmailHtml(e.target.value);
                                  setIsEmailEditedManually(true);
                                }}
                                rows={8}
                                style={{ borderRadius: '6px', marginTop: 2, fontFamily: 'monospace', fontSize: '10px' }} 
                              />
                            </div>
                            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: 2 }}>
                              * Bạn có thể bấm sang Tab 3 "Xem trước Email" ở trên để kiểm tra hiển thị thực tế của email này.
                            </div>
                          </>
                        ) : (
                          <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '6px', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '12px' }}>
                            <span>Tính năng gửi email thông báo họp sinh hoạt đang tắt</span>
                          </div>
                        )}
                      </div>
                    )
                  },
                  {
                    key: '3',
                    label: <span style={{ fontWeight: 700, fontSize: '12px' }}><MailOutlined style={{ marginRight: 4 }} /> 3. Xem trước Email</span>,
                    children: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                        {sendEmailChecked ? (
                          <div style={{ 
                            background: '#ffffff', 
                            border: '1px solid #cbd5e1', 
                            borderRadius: '6px', 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                            display: 'flex', 
                            flexDirection: 'column', 
                            overflow: 'hidden',
                            height: '315px',
                            maxHeight: '315px'
                          }}>
                            {/* Mock Email Header */}
                            <div style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', padding: '6px 10px', fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
                              <div><strong>Từ:</strong> Chi bộ Sinh viên &lt;cbsv.due@gmail.com&gt;</div>
                              <div><strong>Tới:</strong> Toàn thể Đảng viên &lt;dangvien.cbsv@gmail.com&gt;</div>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Tiêu đề:</strong> {emailSubject || '(Chưa có tiêu đề)'}</div>
                            </div>
                            
                            {/* HTML Content Render */}
                            <div 
                              style={{ flex: 1, padding: '12px', overflowY: 'auto', maxHeight: '255px' }}
                              dangerouslySetInnerHTML={{ __html: emailHtml }}
                            />
                          </div>
                        ) : (
                          <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '6px', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '12px' }}>
                            <span>Tính năng gửi email thông báo họp sinh hoạt đang tắt</span>
                          </div>
                        )}
                      </div>
                    )
                  }
                ]}
              />
            </div>
          </Col>
        </Row>
      </Modal>

      {/* Details Drawer / Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
            <span style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a1a' }}>
              Thông tin chi tiết chương trình Họp Chi bộ
            </span>
          </div>
        }
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          dayjs(selectedMeeting?.date).isAfter(dayjs()) && !isAdminOrChiUy && (
            <Button 
              key="vắng" 
              type="primary" 
              danger
              onClick={() => {
                setIsDetailModalVisible(false);
                window.location.href = '/xin-vang';
              }}
              style={{ height: 38, borderRadius: 6, fontWeight: 700 }}
            >
              Đăng ký xin vắng họp
            </Button>
          ),
          <Button key="close" onClick={() => setIsDetailModalVisible(false)} style={{ height: 38, borderRadius: 6 }}>
            Đóng cửa sổ
          </Button>
        ].filter(Boolean)}
        width={750}
      >
        {selectedMeeting && (
          <div style={{ marginTop: 20 }}>
            {selectedMeeting.image_url && (
              <div style={{ textAlign: 'center', marginBottom: 20, maxHeight: 300, overflow: 'hidden', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                <img 
                  src={selectedMeeting.image_url} 
                  alt="Meeting Banner" 
                  style={{ width: '100%', height: 'auto', objectFit: 'contain', maxHeight: 300 }} 
                />
              </div>
            )}

            <div style={{ background: '#fafafa', padding: '16px 20px', borderRadius: '8px', border: '1px solid #f0f0f0', marginBottom: 20 }}>
              <Title level={4} style={{ color: '#c62828', margin: '0 0 16px 0', fontWeight: 800 }}>
                {selectedMeeting.title}
              </Title>

              <Row gutter={[16, 12]}>
                <Col span={12}>
                  <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Thời gian diễn ra:</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#262626', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <CalendarOutlined style={{ color: '#c62828' }} />
                    <span>{dayjs(selectedMeeting.date).format('HH:mm - DD/MM/YYYY')}</span>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Địa điểm tổ chức:</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#262626', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <EnvironmentOutlined style={{ color: '#c62828' }} />
                    <span>{selectedMeeting.location}</span>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Trang phục quy định:</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#262626', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <TagOutlined style={{ color: '#c62828' }} />
                    <span>{selectedMeeting.dress_code || 'Tự do'}</span>
                  </div>
                </Col>
                {selectedMeeting.note && (
                  <Col span={12}>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Lưu ý từ Chi ủy:</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#cf1322', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <ExclamationCircleOutlined />
                      <span>{selectedMeeting.note}</span>
                    </div>
                  </Col>
                )}
              </Row>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#262626', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <InfoCircleOutlined style={{ color: '#c62828' }} />
                <span>Nội dung chương trình sinh hoạt chi tiết:</span>
              </div>
              <div style={{ 
                background: '#ffffff', 
                border: '1px solid #e8e8e8', 
                borderRadius: '8px', 
                padding: '16px 20px', 
                fontSize: '13px', 
                lineHeight: '1.7', 
                color: '#262626', 
                whiteSpace: 'pre-line',
                maxHeight: '250px',
                overflowY: 'auto'
              }}>
                {selectedMeeting.content || 'Không có chương trình chi tiết được thêm.'}
              </div>
              <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: 8, textAlign: 'right' }}>
                Đăng bởi: {selectedMeeting.created_by || 'Chi ủy'} | Tạo lúc: {selectedMeeting.created_at ? dayjs(selectedMeeting.created_at).format('HH:mm DD/MM/YYYY') : '--'}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LichHop;
