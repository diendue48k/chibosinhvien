import React, { useState, useEffect } from 'react';
import { 
  Row, Col, Form, Input, DatePicker, Select, Switch, Button, 
  Card, Tabs, Typography, Badge, Space, message, Timeline, Table, Tag 
} from 'antd';
import { 
  RobotOutlined, SendOutlined, MailOutlined, NotificationOutlined, 
  CalendarOutlined, EnvironmentOutlined, UserOutlined, ClockOutlined, 
  HistoryOutlined, FileTextOutlined, EyeOutlined, CheckCircleOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const AINotifications = () => {
  const [form] = Form.useForm();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Generated state
  const [generatedData, setGeneratedData] = useState(null);
  const [typingNotification, setTypingNotification] = useState("");
  const [typingEmailSubject, setTypingEmailSubject] = useState("");
  const [typingEmailBody, setTypingEmailBody] = useState("");
  const [activePreviewTab, setActivePreviewTab] = useState("notification");
  
  // History state
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("ai_notifications_history");
    return saved ? JSON.parse(saved) : [];
  });

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    localStorage.setItem("ai_notifications_history", JSON.stringify(newHistory));
  };

  // Pre-fill default values
  useEffect(() => {
    form.setFieldsValue({
      title: "Họp Chi bộ thường kỳ tháng 05/2026",
      content: "Họp đánh giá kết quả công tác Đảng tháng 5, triển khai phương hướng nhiệm vụ hoạt động tháng 6 và tổ chức xét chuyển Đảng chính thức cho Đảng viên dự bị.",
      time: dayjs("2026-05-22T14:00:00"),
      location: "Phòng họp số 2 - Nhà A",
      deadline: dayjs("2026-05-21T17:00:00"),
      created_by: "Đ/c Bí thư Chi bộ",
      recipient_type: "Đảng viên đang sinh hoạt",
      recipients: ["chibosinhvien@due.edu.vn"],
      send_email: true
    });
  }, [form]);

  // Simulated AI Backend Logic adhering to strict BUSINESS LOGIC & CONTENT RULES
  const generateAIContent = async () => {
    try {
      const values = await form.validateFields();
      setIsGenerating(true);
      setGeneratedData(null);
      setTypingNotification("");
      setTypingEmailSubject("");
      setTypingEmailBody("");

      // Simulate network delay for AI thinking
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { title, content, time, location, deadline, created_by, recipient_type, send_email } = values;

      const formattedTime = time ? time.format("HH:mm [ngày] DD/MM/YYYY") : "chưa xác định";
      const formattedDeadline = deadline ? deadline.format("HH:mm [ngày] DD/MM/YYYY") : "chưa xác định";

      // 1. Always generate Notification (2-4 sentences, concise, including main details)
      const notificationTitle = `🔔 Thông báo: ${title}`;
      const notificationContent = `Kính gửi các đồng chí thuộc đối tượng ${recipient_type}. Chi bộ Sinh viên thông báo về việc: ${content} Buổi làm việc diễn ra vào lúc ${formattedTime} tại ${location}. Kính mong các đồng chí sắp xếp thời gian có mặt đầy đủ, đúng giờ. Hạn chót phản hồi thông tin tham gia trước ${formattedDeadline}.`;

      // 2. Generate Email only if send_email = true
      let emailSubject = null;
      let emailBody = null;

      if (send_email) {
        emailSubject = `[Chi bộ Sinh viên] THƯ TRIỆU TẬP: ${title.toUpperCase()}`;
        emailBody = `Kính gửi: Các đồng chí thuộc đối tượng ${recipient_type} - Chi bộ Sinh viên,\n\n` +
          `Thực hiện kế hoạch hoạt động của Chi bộ Sinh viên Trường Đại học Kinh tế, Ban Chấp hành Chi bộ trân trọng thông báo triệu tập các đồng chí tham gia nội dung: ${title}.\n\n` +
          `Nội dung chi tiết:\n` +
          `- Công việc chính: ${content}\n` +
          `- Thời gian tổ chức: ${formattedTime}\n` +
          `- Địa điểm tiến hành: ${location}\n` +
          `- Người chủ trì/tạo: ${created_by}\n\n` +
          `Để công tác chuẩn bị được chu đáo và buổi sinh hoạt/lễ diễn ra thành công tốt đẹp, Ban Chấp hành Chi bộ yêu cầu các đồng chí nghiêm túc phản hồi thông tin tham dự ${deadline ? `trước ${formattedDeadline}` : 'đúng hạn'}.\n\n` +
          `Sự hiện diện đầy đủ, đúng giờ và trang phục chỉnh tề của các đồng chí thể hiện tính kỷ luật và tinh thần trách nhiệm cao của người Đảng viên.\n\n` +
          `Trân trọng cảm ơn sự phối hợp của các đồng chí.\n\n` +
          `THAY MẶT BAN CHẤP HÀNH CHI BỘ SINH VIÊN\n` +
          `${created_by}`;
      }

      const result = {
        notification: {
          title: notificationTitle,
          content: notificationContent
        },
        email: send_email ? {
          subject: emailSubject,
          body: emailBody
        } : null
      };

      setGeneratedData(result);
      setIsGenerating(false);
      setActivePreviewTab(send_email ? "email" : "notification");

      // Visual typing effect to feel extremely premium
      simulateTyping(result.notification.content, setTypingNotification);
      if (send_email) {
        simulateTyping(result.email.subject, setTypingEmailSubject);
        simulateTyping(result.email.body, setTypingEmailBody);
      }

    } catch (err) {
      console.error(err);
      message.error("Vui lòng nhập đầy đủ các thông tin bắt buộc!");
    }
  };

  const simulateTyping = (text, setter) => {
    let index = 0;
    const interval = setInterval(() => {
      setter(prev => prev + text.charAt(index));
      index++;
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, 5); // Fast typing speed
  };

  const handleSend = async () => {
    if (!generatedData) return;
    const values = form.getFieldsValue();
    
    setIsSending(true);
    try {
      let emailSentStatus = "N/A";
      
      // If send_email is active and recipients are configured, trigger the real API
      if (values.send_email && values.recipients && values.recipients.length > 0) {
        const formattedBodyText = generatedData.email.body.replace(/\n/g, '<br />');
        const htmlBody = `
          <div style="font-family: 'SVN-Gilroy', 'Inter', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <div style="background-color: #c62828; padding: 24px; text-align: center; border-bottom: 4px solid #fbc02d;">
              <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase;">CHI BỘ SINH VIÊN - THÔNG BÁO AI</h2>
            </div>
            <div style="padding: 24px; line-height: 1.8; color: #333333; font-size: 14px; background-color: #ffffff; text-align: justify;">
              ${formattedBodyText}
            </div>
            <div style="background-color: #f5f5f5; padding: 16px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #777777;">
              Hệ thống Quản lý Chi bộ Sinh viên &copy; 2026
            </div>
          </div>
        `;

        const response = await fetch('http://localhost:5000/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: values.recipients.join(', '),
            subject: generatedData.email.subject,
            html: htmlBody
          })
        });

        if (response.ok) {
          emailSentStatus = "Thành công";
        } else {
          emailSentStatus = "Thất bại";
          throw new Error("Lỗi khi kết nối với máy chủ gửi email.");
        }
      }

      // Add to local history list
      const newHistoryItem = {
        key: Date.now().toString(),
        title: values.title,
        recipient_type: values.recipient_type,
        created_at: new Date().toISOString(),
        send_email: values.send_email ? "Có" : "Không",
        email_status: emailSentStatus,
        data: generatedData
      };

      saveHistory([newHistoryItem, ...history]);
      message.success("Đã ghi nhận thông báo lên hệ thống" + (values.send_email ? " và gửi email thành công!" : "!"));
      
    } catch (err) {
      console.error(err);
      message.error("Gửi thông báo/email thất bại: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const columns = [
    { 
      title: 'Tiêu đề', 
      dataIndex: 'title', 
      key: 'title',
      render: (t) => <Text style={{ fontWeight: 700 }}>{t}</Text>
    },
    { 
      title: 'Đối tượng nhận', 
      dataIndex: 'recipient_type', 
      key: 'recipient_type',
      render: (rt) => <Tag color="blue">{rt}</Tag>
    },
    { 
      title: 'Thời gian tạo', 
      dataIndex: 'created_at', 
      key: 'created_at',
      render: (date) => dayjs(date).format('HH:mm DD/MM/YYYY')
    },
    { 
      title: 'Gửi Email', 
      dataIndex: 'send_email', 
      key: 'send_email',
      render: (se) => <Tag color={se === "Có" ? "green" : "default"}>{se}</Tag>
    },
    { 
      title: 'Trạng thái Email', 
      dataIndex: 'email_status', 
      key: 'email_status',
      render: (status) => {
        let color = "default";
        if (status === "Thành công") color = "success";
        if (status === "Thất bại") color = "error";
        return <Tag color={color}>{status}</Tag>;
      }
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />} 
          onClick={() => {
            setGeneratedData(record.data);
            setTypingNotification(record.data.notification.content);
            if (record.data.email) {
              setTypingEmailSubject(record.data.email.subject);
              setTypingEmailBody(record.data.email.body);
            }
            setActivePreviewTab(record.data.email ? "email" : "notification");
            message.success("Đã tải lại thông báo từ lịch sử!");
          }}
        >
          Xem lại
        </Button>
      )
    }
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <RobotOutlined style={{ color: '#c62828' }} />
        Trợ lý Soạn thảo Văn bản AI
      </Title>

      <Row gutter={[24, 24]}>
        {/* Left Side Configurator */}
        <Col xs={24} lg={10}>
          <Card 
            title={<span style={{ fontWeight: 800 }}><FileTextOutlined style={{ color: '#c62828' }} /> Cấu hình thông tin thông báo</span>} 
            bordered={false}
            style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
          >
            <Form form={form} layout="vertical" onFinish={generateAIContent}>
              <Form.Item name="title" label={<span style={{ fontWeight: 700 }}>Tiêu đề công việc/Lễ</span>} rules={[{ required: true, message: 'Nhập tiêu đề!' }]}>
                <Input placeholder="Ví dụ: Lễ kết nạp Đảng viên mới chi bộ" />
              </Form.Item>

              <Form.Item name="content" label={<span style={{ fontWeight: 700 }}>Nội dung chính</span>} rules={[{ required: true, message: 'Nhập nội dung chính!' }]}>
                <TextArea rows={3} placeholder="Mô tả tóm tắt nội dung chính cần phổ biến..." />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="time" label={<span style={{ fontWeight: 700 }}>Thời gian diễn ra</span>} rules={[{ required: true, message: 'Chọn thời gian!' }]}>
                    <DatePicker showTime format="HH:mm DD/MM/YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="deadline" label={<span style={{ fontWeight: 700 }}>Hạn chót phản hồi</span>}>
                    <DatePicker showTime format="HH:mm DD/MM/YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="location" label={<span style={{ fontWeight: 700 }}>Địa điểm</span>} rules={[{ required: true, message: 'Nhập địa điểm!' }]}>
                    <Input placeholder="Ví dụ: Hội trường A" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="created_by" label={<span style={{ fontWeight: 700 }}>Người tạo</span>} rules={[{ required: true, message: 'Nhập người tạo!' }]}>
                    <Input placeholder="Ví dụ: Ban Chấp hành Chi bộ" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="recipient_type" label={<span style={{ fontWeight: 700 }}>Đối tượng nhận</span>} rules={[{ required: true, message: 'Chọn nhóm!' }]}>
                    <Select>
                      <Option value="Tất cả Đảng viên">Tất cả Đảng viên</Option>
                      <Option value="Đảng viên đang sinh hoạt">Đang sinh hoạt</Option>
                      <Option value="Đảng viên dự bị">Đảng viên dự bị</Option>
                      <Option value="Ban chấp hành Liên Chi đoàn">BCH Liên Chi đoàn</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="send_email" label={<span style={{ fontWeight: 700 }}>Đồng thời gửi Email</span>} valuePropName="checked">
                    <Switch checkedChildren="Có" unCheckedChildren="Không" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.send_email !== currentValues.send_email}>
                {({ getFieldValue }) => 
                  getFieldValue('send_email') && (
                    <Form.Item name="recipients" label={<span style={{ fontWeight: 700 }}>Danh sách Email nhận</span>} rules={[{ required: true, message: 'Nhập ít nhất 1 email!' }]}>
                      <Select mode="tags" placeholder="Nhập email và nhấn Enter" style={{ width: '100%' }} />
                    </Form.Item>
                  )
                }
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={isGenerating}
                  icon={<RobotOutlined />}
                  style={{ 
                    width: '100%', 
                    height: '45px', 
                    fontWeight: 800, 
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)',
                    border: 'none',
                    boxShadow: '0 4px 10px rgba(198, 40, 40, 0.2)'
                  }}
                >
                  ⚡ SOẠN THẢO BẰNG AI BACKEND
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Right Side Live Preview Screen */}
        <Col xs={24} lg={14}>
          <Card 
            title={<span style={{ fontWeight: 800 }}><EyeOutlined style={{ color: '#c62828' }} /> Bản xem trước nội dung từ AI Backend</span>}
            bordered={false}
            style={{ height: '100%', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 24px 24px 24px' }}
          >
            {!generatedData && !isGenerating ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
                <RobotOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '16px' }} />
                <Title level={4} style={{ color: '#8c8c8c', margin: 0, fontWeight: 700 }}>Trợ lý AI sẵn sàng!</Title>
                <Text style={{ color: '#bfbfbf', marginTop: '8px', textAlign: 'center' }}>
                  Nhập cấu hình thông tin bên trái và nhấn nút <strong>"Soạn thảo bằng AI Backend"</strong><br />
                  để tự động sinh mẫu thông báo và email chuẩn hành chính Đảng.
                </Text>
              </div>
            ) : isGenerating ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
                <div className="ai-pulse-loader" style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%', 
                  background: 'rgba(198, 40, 40, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <RobotOutlined style={{ fontSize: '36px', color: '#c62828' }} />
                </div>
                <Title level={4} style={{ color: '#c62828', fontWeight: 800, margin: 0 }}>AI đang phân tích và soạn thảo...</Title>
                <Text style={{ color: '#8c8c8c', marginTop: '8px' }}>Áp dụng thể thức văn bản hành chính Đảng bộ ĐH Kinh tế</Text>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                <Tabs activeKey={activePreviewTab} onChange={setActivePreviewTab} style={{ marginBottom: '16px' }}>
                  <Tabs.TabPane 
                    tab={<span><NotificationOutlined /> 🔔 Thông báo Hệ thống</span>} 
                    key="notification"
                  >
                    <div style={{ padding: '16px', background: '#fff1f0', border: '1.5px solid #ffa39e', borderRadius: '8px', marginBottom: '16px' }}>
                      <Title level={5} style={{ margin: '0 0 10px 0', color: '#c62828', fontWeight: 800 }}>
                        {generatedData.notification.title}
                      </Title>
                      <Paragraph style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', textAlign: 'justify', whiteSpace: 'pre-wrap', fontWeight: 700 }}>
                        {typingNotification || generatedData.notification.content}
                      </Paragraph>
                    </div>
                  </Tabs.TabPane>
                  
                  {generatedData.email && (
                    <Tabs.TabPane 
                      tab={<span><MailOutlined /> 📧 Email gửi Đảng viên</span>} 
                      key="email"
                    >
                      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                        {/* Email Client Header */}
                        <div style={{ background: '#f5f5f5', padding: '12px 16px', borderBottom: '1px solid #d9d9d9', fontSize: '13px' }}>
                          <div><strong>Người gửi:</strong> Chi bộ Sinh viên &lt;chibosinhvien@due.edu.vn&gt;</div>
                          <div style={{ marginTop: '4px' }}><strong>Tiêu đề:</strong> <span style={{ fontWeight: 700, color: '#c62828' }}>{typingEmailSubject || generatedData.email.subject}</span></div>
                        </div>
                        {/* Email Body content */}
                        <div style={{ padding: '24px 20px', minHeight: '280px', maxHeight: '400px', overflowY: 'auto' }}>
                          {/* Inner email frame */}
                          <div style={{ border: '1px solid #f0f0f0', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                            <div style={{ background: 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)', padding: '16px', borderBottom: '4px solid #fbc02d', textAlign: 'center' }}>
                              <Text style={{ color: '#ffffff', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', fontSize: '13px' }}>
                                CHI BỘ SINH VIÊN - BAN CHẤP HÀNH
                              </Text>
                            </div>
                            <div style={{ padding: '20px', whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.8', textAlign: 'justify', color: '#262626', fontFamily: 'inherit' }}>
                              {typingEmailBody || generatedData.email.body}
                            </div>
                            <div style={{ background: '#fafafa', padding: '12px', borderTop: '1px solid #f0f0f0', textAlign: 'center', fontSize: '11px', color: '#8c8c8c' }}>
                              Website: chibosinhvien.vn | Email: chibosinhvien@due.edu.vn
                            </div>
                          </div>
                        </div>
                      </div>
                    </Tabs.TabPane>
                  )}
                </Tabs>

                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    type="primary" 
                    icon={<SendOutlined />} 
                    loading={isSending}
                    onClick={handleSend}
                    style={{ 
                      height: '42px', 
                      fontWeight: 800, 
                      borderRadius: '6px',
                      backgroundColor: '#52c41a',
                      borderColor: '#52c41a',
                      boxShadow: '0 4px 10px rgba(82, 196, 26, 0.2)'
                    }}
                  >
                    PHÁT HÀNH THÔNG BÁO & EMAIL
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* History Log Section */}
      <Card 
        title={<span style={{ fontWeight: 800 }}><HistoryOutlined style={{ color: '#c62828' }} /> Lịch sử phát hành thông báo AI</span>}
        bordered={false}
        style={{ marginTop: '24px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
      >
        {history.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#8c8c8c' }}>
            Chưa có thông báo nào được phát hành.
          </div>
        ) : (
          <Table 
            columns={columns} 
            dataSource={history} 
            pagination={{ pageSize: 5 }} 
            size="middle"
          />
        )}
      </Card>
    </div>
  );
};

export default AINotifications;
