import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Input, Form, message, Badge, Result, Space, Alert, Tag } from 'antd';
import { 
  ScanOutlined, 
  SafetyCertificateOutlined, 
  UserOutlined, 
  CheckCircleOutlined, 
  ArrowLeftOutlined, 
  LockOutlined, 
  FlagOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const QuickAttendance = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // Form states
  const [mssv, setMssv] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [isUrlCode, setIsUrlCode] = useState(false);

  // Verification states
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [memberProfile, setMemberProfile] = useState(null);
  const [verifyingMember, setVerifyingMember] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkInResult, setCheckInResult] = useState(null); // { status: 'PRESENT'|'LATE', checkInTime: string, ho_ten: string, mssv: string }

  // 1. Fetch active meeting in real-time
  useEffect(() => {
    const q = query(collection(db, "lich_hop"), where("status", "==", "ACTIVE"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // Get the first active meeting
        const docSnap = snapshot.docs[0];
        setActiveMeeting({ id: docSnap.id, ...docSnap.data() });
      } else {
        setActiveMeeting(null);
      }
      setLoadingMeeting(false);
    }, (error) => {
      console.error("Lỗi khi tải thông tin cuộc họp:", error);
      setLoadingMeeting(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Read session code from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      setSessionCode(codeParam.trim());
      setIsUrlCode(true);
    }
  }, [location.search]);

  // 3. Pre-fill MSSV if user is already logged in
  useEffect(() => {
    if (currentUser && currentUser.mssv) {
      setMssv(currentUser.mssv);
      verifyMssv(currentUser.mssv);
    }
  }, [currentUser]);

  // 4. Verify MSSV in database
  const verifyMssv = async (inputMssv) => {
    const val = (inputMssv || mssv).trim();
    if (!val || val.length < 5) return;

    setVerifyingMember(true);
    setVerificationError('');
    setMemberProfile(null);

    try {
      // Find member by mssv (with fallbacks just like Login.jsx)
      let snap = await getDocs(query(collection(db, "dang_vien"), where("mssv", "==", val)));
      
      if (snap.empty) {
        snap = await getDocs(query(collection(db, "dang_vien"), where("MSSV", "==", val)));
      }
      
      if (snap.empty && !isNaN(Number(val))) {
        snap = await getDocs(query(collection(db, "dang_vien"), where("mssv", "==", Number(val))));
      }

      if (snap.empty) {
        setVerificationError("Không tìm thấy thông tin Đảng viên với MSSV này trên hệ thống!");
        setVerifyingMember(false);
        return;
      }

      const docData = snap.docs[0].data();
      const isActive = !docData.trang_thai || docData.trang_thai === 'dang_sinh_hoat';
      
      if (!isActive) {
        setVerificationError("Đồng chí đã chuyển sinh hoạt Đảng ra khỏi Chi bộ nên không thể điểm danh.");
        setVerifyingMember(false);
        return;
      }

      setMemberProfile({ id: snap.docs[0].id, ...docData });
    } catch (e) {
      console.error(e);
      setVerificationError("Lỗi kết nối khi xác thực thông tin Đảng viên.");
    } finally {
      setVerifyingMember(false);
    }
  };

  // Trigger verify on change
  const handleMssvChange = (e) => {
    const val = e.target.value.replace(/\s/g, '');
    setMssv(val);
    if (val.length >= 7) {
      // Auto verify when typing looks complete
      setTimeout(() => verifyMssv(val), 300);
    }
  };

  // 5. Submit attendance
  const handleSubmitCheckIn = async () => {
    if (!activeMeeting) {
      message.error("Không có buổi sinh hoạt nào đang mở điểm danh!");
      return;
    }

    if (activeMeeting.selfCheckInOpen === false) {
      message.error("Ban chi ủy đã đóng cổng tự điểm danh cho buổi sinh hoạt này.");
      return;
    }

    const cleanCode = sessionCode.trim();
    if (!cleanCode) {
      message.warning("Vui lòng nhập Mã số điểm danh gồm 6 chữ số!");
      return;
    }

    if (activeMeeting.sessionCode !== cleanCode) {
      message.error("Mã số điểm danh không chính xác!");
      return;
    }

    // Check expiration (3 minutes validity)
    if (activeMeeting.sessionCodeCreatedAt) {
      const createdAt = dayjs(activeMeeting.sessionCodeCreatedAt);
      const diffMinutes = dayjs().diff(createdAt, 'minute');
      if (diffMinutes > 3) {
        message.error("Mã số điểm danh đã hết hạn! Vui lòng quét mã mới trên màn chiếu.");
        return;
      }
    }

    if (!memberProfile) {
      message.error("Vui lòng nhập đúng MSSV và xác thực thông tin trước!");
      return;
    }

    setSubmitting(true);

    try {
      // Check if already checked in
      const qCheck = query(
        collection(db, "attendances"),
        where("meetingId", "==", activeMeeting.id),
        where("mssv", "==", memberProfile.mssv)
      );
      const snapCheck = await getDocs(qCheck);
      if (!snapCheck.empty) {
        const checkedData = snapCheck.docs[0].data();
        setCheckInResult({
          status: checkedData.status || 'PRESENT',
          checkInTime: checkedData.checkInTime,
          ho_ten: memberProfile.ho_ten,
          mssv: memberProfile.mssv,
          lop: memberProfile.lop || 'N/A',
          alreadyChecked: true
        });
        setSubmitting(false);
        return;
      }

      // Determine attendance status (Late after 15 minutes)
      const today = dayjs();
      const meetingStart = dayjs(`${activeMeeting.date} ${activeMeeting.time}`);
      const minutesDiff = today.diff(meetingStart, 'minute');
      
      let checkInStatus = 'PRESENT';
      if (minutesDiff > 15) {
        checkInStatus = 'LATE';
      }

      const deviceInfo = `Quick-CheckIn (MobileWeb | Browser: ${navigator.userAgent.split(') ')[1] || 'WebClient'} | OS: ${navigator.platform})`;
      const mockIp = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;

      const newAttendance = {
        meetingId: activeMeeting.id,
        userId: memberProfile.id,
        ho_ten: memberProfile.ho_ten,
        mssv: memberProfile.mssv,
        lop: memberProfile.lop || 'N/A',
        checkInTime: new Date().toISOString(),
        method: 'SELF_CODE',
        status: checkInStatus,
        deviceInfo: deviceInfo,
        ip: mockIp
      };

      await addDoc(collection(db, "attendances"), newAttendance);

      setCheckInResult({
        status: checkInStatus,
        checkInTime: newAttendance.checkInTime,
        ho_ten: memberProfile.ho_ten,
        mssv: memberProfile.mssv,
        lop: memberProfile.lop || 'N/A',
        minutesDiff: minutesDiff,
        alreadyChecked: false
      });

    } catch (e) {
      console.error(e);
      message.error("Lỗi khi ghi nhận điểm danh. Vui lòng thử lại!");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset page for another check-in
  const handleReset = () => {
    setCheckInResult(null);
    if (!currentUser) {
      setMssv('');
      setMemberProfile(null);
    }
    // Keep URL code if it was pre-filled
    if (!isUrlCode) {
      setSessionCode('');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #a30000 0%, #4a0000 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px',
      fontFamily: "'SVN-Gilroy', 'Inter', sans-serif"
    }}>
      {/* 1. Header Banner */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: 20, 
        marginTop: 10,
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        gap: 8
      }}>
        <div style={{ 
          background: 'rgba(255,255,255,0.15)', 
          padding: '12px', 
          borderRadius: '50%',
          border: '1.5px solid rgba(255,215,0,0.5)',
          boxShadow: '0 0 15px rgba(255,215,0,0.2)'
        }}>
          <FlagOutlined style={{ fontSize: 32, color: '#ffd700' }} />
        </div>
        <Title level={4} style={{ color: '#ffffff', margin: 0, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 16 }}>
          Chi bộ Sinh viên
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>
          HỆ THỐNG ĐIỂM DANH NHANH DI ĐỘNG
        </Text>
      </div>

      {/* 2. Main Box Container */}
      <Card
        bordered={false}
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 20,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          background: 'rgba(255, 255, 255, 0.98)',
          overflow: 'hidden',
          padding: '8px 0'
        }}
      >
        {loadingMeeting ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Badge status="processing" color="#c62828" />
            <div style={{ marginTop: 12, fontWeight: 700, color: '#555' }}>Đang kết nối hệ thống cuộc họp...</div>
          </div>
        ) : checkInResult ? (
          /* Check-In Success Result View */
          <div style={{ padding: '16px 20px' }}>
            <Result
              status={checkInResult.status === 'LATE' ? 'warning' : 'success'}
              title={
                <div style={{ fontWeight: 900, fontSize: 18, color: '#1a1a1a' }}>
                  {checkInResult.alreadyChecked ? 'ĐÃ ĐIỂM DANH TRƯỚC ĐÓ' : 'ĐIỂM DANH THÀNH CÔNG'}
                </div>
              }
              subTitle={
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', background: '#f5f5f5', padding: 14, borderRadius: 12, marginTop: 12 }}>
                  <div>Đồng chí: <strong style={{ color: '#c62828', fontSize: 14 }}>{checkInResult.ho_ten}</strong></div>
                  <div>MSSV: <strong>{checkInResult.mssv}</strong></div>
                  <div>Lớp: <strong>{checkInResult.lop}</strong></div>
                  <div style={{ borderTop: '1px dashed #d9d9d9', paddingTop: 6, marginTop: 4 }}>
                    Thời gian: <strong>{dayjs(checkInResult.checkInTime).format('HH:mm:ss DD/MM/YYYY')}</strong>
                  </div>
                  <div>
                    Trạng thái: 
                    <Tag color={checkInResult.status === 'LATE' ? 'warning' : 'success'} style={{ marginLeft: 6, fontWeight: 'bold' }}>
                      {checkInResult.status === 'LATE' ? `ĐI MUỘN (${checkInResult.minutesDiff}p)` : 'CÓ MẶT'}
                    </Tag>
                  </div>
                </div>
              }
            />
            <Button 
              type="primary" 
              onClick={handleReset} 
              style={{ width: '100%', height: 44, borderRadius: 8, fontWeight: 700, backgroundColor: '#c62828', borderColor: '#c62828', fontSize: 14 }}
            >
              Tiếp tục điểm danh lượt mới
            </Button>
          </div>
        ) : !activeMeeting ? (
          /* No Active Meeting View */
          <div style={{ textAlign: 'center', padding: '30px 20px' }}>
            <Result
              icon={<ExclamationCircleOutlined style={{ fontSize: 50, color: '#fa8c16' }} />}
              title={<span style={{ fontWeight: 800, fontSize: 16 }}>Hiện không có buổi sinh hoạt nào</span>}
              subTitle="Ban chi ủy chưa mở cổng điểm danh cho bất kỳ buổi họp nào tại thời điểm này. Vui lòng thử lại khi buổi họp bắt đầu."
            />
            <Button onClick={() => navigate('/login')} style={{ width: '100%', height: 42, borderRadius: 8, fontWeight: 600 }}>
              Đăng nhập hệ thống
            </Button>
          </div>
        ) : (
          /* Normal Attendance Form View */
          <div style={{ padding: '12px 20px' }}>
            {/* Active meeting banner */}
            <div style={{ 
              background: 'linear-gradient(135deg, #fff2f0 0%, #fff1f0 100%)', 
              border: '1px solid #ffccc7', 
              borderRadius: 12, 
              padding: 12, 
              marginBottom: 20
            }}>
              <Badge status="processing" color="#c62828" style={{ marginBottom: 4 }} />
              <div style={{ fontSize: 11, fontWeight: 800, color: '#c62828', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Đang tiến hành họp
              </div>
              <div style={{ fontWeight: 800, color: '#222', fontSize: 14, margin: '2px 0' }}>
                {activeMeeting.title}
              </div>
              <div style={{ fontSize: 11, color: '#666' }}>
                📍 {activeMeeting.location} | ⏰ Bắt đầu: {activeMeeting.time}
              </div>
            </div>

            {activeMeeting.selfCheckInOpen === false ? (
              <Alert
                message="Cổng tự điểm danh đã khóa"
                description="Ban chi ủy đã đóng cổng tự quét mã QR và nhập mã số cho buổi họp này. Đồng chí vui lòng báo lại Ban chi ủy tại bàn tiếp đón để được điểm danh thủ công."
                type="error"
                showIcon
                icon={<LockOutlined />}
                style={{ borderRadius: 10, marginBottom: 12 }}
              />
            ) : (
              <Form layout="vertical" onFinish={handleSubmitCheckIn}>
                {/* Field 1: Meeting Session Code (6 digits) */}
                <Form.Item 
                  label={<span style={{ fontWeight: 700, color: '#444' }}>Mã số điểm danh (6 chữ số)</span>}
                  style={{ marginBottom: 16 }}
                >
                  <Input
                    placeholder="Nhập 6 chữ số hiển thị trên máy chiếu"
                    maxLength={6}
                    value={sessionCode}
                    disabled={isUrlCode}
                    onChange={(e) => setSessionCode(e.target.value.replace(/\D/g, ''))}
                    prefix={<ScanOutlined style={{ color: isUrlCode ? '#52c41a' : '#bfbfbf' }} />}
                    style={{ 
                      height: 44, 
                      borderRadius: 8, 
                      fontSize: 16, 
                      fontWeight: 800, 
                      textAlign: 'center', 
                      letterSpacing: 4 
                    }}
                  />
                  {isUrlCode && (
                    <div style={{ color: '#52c41a', fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>
                      ✓ Đã tự động điền từ mã QR quét được
                    </div>
                  )}
                </Form.Item>

                {/* Field 2: Student ID (MSSV) */}
                <Form.Item 
                  label={<span style={{ fontWeight: 700, color: '#444' }}>Mã số sinh viên (MSSV)</span>}
                  style={{ marginBottom: 16 }}
                >
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Input
                      placeholder="Ví dụ: 2021600123"
                      value={mssv}
                      onChange={handleMssvChange}
                      onBlur={() => verifyMssv()}
                      prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                      style={{ 
                        height: 44, 
                        borderRadius: 8, 
                        fontSize: 15,
                        fontWeight: 700
                      }}
                    />
                    <Button 
                      type="dashed" 
                      onClick={() => verifyMssv()}
                      loading={verifyingMember}
                      style={{ height: 44, borderRadius: 8, fontWeight: 600, color: '#c62828', borderColor: '#c62828' }}
                    >
                      Kiểm tra
                    </Button>
                  </div>

                  {/* Verification Results Panel */}
                  {memberProfile && (
                    <div style={{ 
                      marginTop: 8, 
                      background: '#f6ffed', 
                      border: '1px solid #b7eb8f', 
                      borderRadius: 8, 
                      padding: '8px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      animation: 'successSlideIn 0.2s ease-out'
                    }}>
                      <div style={{ fontSize: 11, color: '#52c41a', fontWeight: 'bold' }}>✓ Xác nhận thông tin Đảng viên:</div>
                      <div style={{ fontWeight: 800, color: '#237804', fontSize: 13 }}>
                        {memberProfile.ho_ten}
                      </div>
                      <div style={{ fontSize: 11, color: '#555' }}>
                        Lớp: <strong>{memberProfile.lop || 'N/A'}</strong> | Nhóm: <strong>{memberProfile.nhom || 'N/A'}</strong>
                      </div>
                    </div>
                  )}

                  {verificationError && (
                    <div style={{ 
                      marginTop: 8, 
                      background: '#fff2f0', 
                      border: '1px solid #ffccc7', 
                      borderRadius: 8, 
                      padding: '8px 12px',
                      color: '#ff4d4f',
                      fontSize: 12,
                      fontWeight: 500,
                      animation: 'successSlideIn 0.2s ease-out'
                    }}>
                      ⚠️ {verificationError}
                    </div>
                  )}
                </Form.Item>

                {/* Submit Action */}
                <Form.Item style={{ marginTop: 24, marginBottom: 8 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submitting}
                    disabled={!memberProfile || !sessionCode}
                    style={{
                      width: '100%',
                      height: 48,
                      borderRadius: 8,
                      fontWeight: 800,
                      fontSize: 15,
                      backgroundColor: '#c62828',
                      borderColor: '#c62828',
                      boxShadow: '0 4px 12px rgba(198, 40, 40, 0.2)'
                    }}
                  >
                    XÁC NHẬN ĐIỂM DANH
                  </Button>
                </Form.Item>
              </Form>
            )}
          </div>
        )}
      </Card>

      {/* 3. Bottom Links */}
      <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', gap: 16 }}>
        {currentUser ? (
          <Button 
            type="link" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/dashboard')} 
            style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}
          >
            Quay lại trang chủ hệ thống
          </Button>
        ) : (
          <Button 
            type="link" 
            onClick={() => navigate('/login')} 
            style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, textDecoration: 'underline' }}
          >
            Đăng nhập tài khoản hệ thống (CBSV)
          </Button>
        )}
      </div>
      
      {/* 4. Mini Footer */}
      <div style={{ marginTop: 'auto', paddingTop: 30, opacity: 0.6, fontSize: 10, color: '#fff', textAlign: 'center' }}>
        © Chi bộ Sinh viên - Đại học Bách Khoa Hà Nội
      </div>
    </div>
  );
};

export default QuickAttendance;
