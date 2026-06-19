import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Space, Alert, message } from 'antd';
import { UserOutlined, LockOutlined, FlagOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../services/permissionService';
import { collection, query, where, getDocs, addDoc, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { dbMain } from '../firebase';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login, getRoleBadgeName } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();



  const onFinish = async (values) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const mssvInput = values.username.trim();
      const cccdInput = values.password.trim();

      const q = query(collection(db, "dang_vien"), where("mssv", "==", mssvInput));
      let snapshot = await getDocs(q);

      // Fallback query if no docs found (in case stored under 'MSSV')
      if (snapshot.empty) {
        const qUpper = query(collection(db, "dang_vien"), where("MSSV", "==", mssvInput));
        snapshot = await getDocs(qUpper);
      }

      // Fallback for numeric search if stored as Number in Firestore
      if (snapshot.empty && !isNaN(Number(mssvInput))) {
        const qNum = query(collection(db, "dang_vien"), where("mssv", "==", Number(mssvInput)));
        snapshot = await getDocs(qNum);
      }

      if (snapshot.empty) {
        throw new Error('Mã số sinh viên (MSSV) không tồn tại trong danh sách Đảng viên!');
      }

      const memberDoc = snapshot.docs[0];
      const memberData = { id: memberDoc.id, ...memberDoc.data() };

      // Strictly check that they must be "Đang sinh hoạt" (Active), except for admins and chi_uy
      const memberRole = memberData.role || ROLES.DANGVIEN;
      const isAdminOrChiUy = memberRole === ROLES.ADMIN || memberRole === ROLES.CHIUY;
      const isActive = !memberData.trang_thai || memberData.trang_thai === 'dang_sinh_hoat';
      if (!isActive && !isAdminOrChiUy) {
        throw new Error('Đồng chí đã chuyển sinh hoạt Đảng ra khỏi Chi bộ Sinh viên nên không thể sử dụng các chức năng hệ thống.');
      }

      // Verify CCCD (password)
      const correctCccd = String(memberData.cccd || memberData.CCCD || '').trim();
      if (!correctCccd) {
        throw new Error('Tài khoản này chưa cập nhật CCCD trên hệ thống. Vui lòng liên hệ ban chỉ ủy!');
      }

      if (cccdInput !== correctCccd) {
        throw new Error('Số Căn cước công dân (CCCD) không chính xác!');
      }

      // Check if probationary and within 2 months of the 12-month deadline
      const safeDayjs = (val) => {
        if (!val) return dayjs(null);
        if (val.toDate && typeof val.toDate === 'function') return dayjs(val.toDate());
        if (val.seconds) return dayjs(val.seconds * 1000);
        return dayjs(val);
      };
      
      const checkIsDuBi = (member) => {
        if (!member) return true;
        const getOfficialDate = () => {
          const date = member.ngay_cong_nhan_dvct || member.ngay_chinh_thuc;
          if (!date) return null;
          return safeDayjs(date);
        };
        const officialDate = getOfficialDate();
        if (officialDate && officialDate.isValid()) {
          return officialDate.isAfter(dayjs(), 'day');
        }
        if (member.so_quyet_dinh_dvct || member.so_qd) {
          return false;
        }
        if (member.dang_vien_du_bi === true) return true;
        if (member.dang_vien_du_bi === false) return false;
        if (member.loai_dang_vien === "Dự bị" || member.loai_dang_vien === "dubi") return true;
        if (member.loai_dang_vien === "Chính thức") return false;
        return true;
      };
      
      const isDuBi = checkIsDuBi(memberData);
      let yeuCauLamHoSo = false;
      if (isDuBi) {
        if (memberData.ngay_vao_dang) {
          const ngayVao = safeDayjs(memberData.ngay_vao_dang);
          if (ngayVao && ngayVao.isValid()) {
            const deadline = ngayVao.add(12, 'month');
            const daysLeft = deadline.diff(dayjs(), 'day');
            yeuCauLamHoSo = daysLeft <= 60;
          }
        }
      } else {
        // Admin or official members always bypass this limit
        yeuCauLamHoSo = true;
      }

      const customUser = {
        id: memberDoc.id,
        username: memberData.mssv,
        name: `Đ/c ${memberData.ho_ten}`,
        mssv: memberData.mssv,
        role: memberRole,
        dang_vien_du_bi: isDuBi,
        yeu_cau_lam_ho_so: yeuCauLamHoSo,
        status: 'active'
      };

      await login(memberRole, customUser);
      try {
        await addDoc(collection(db, "nhat_ky_dang_nhap"), {
          username: memberData.mssv,
          ho_ten: memberData.ho_ten,
          email: memberData.email || '',
          role: memberRole,
          timestamp: new Date().toISOString(),
          client_info: navigator.userAgent
        });
      } catch (e) {
        console.error("Lỗi ghi nhật ký đăng nhập:", e);
      }
      message.success(`Kính chào đồng chí ${memberData.ho_ten}! Đăng nhập thành công.`);
      // Navigate everyone to /dashboard — DANGVIEN has a custom home portal there
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi đăng nhập hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 10% 20%, rgba(198, 40, 40, 0.95) 0%, rgba(142, 0, 0, 1) 90%)',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'SVN-Gilroy', 'Inter', sans-serif"
    }}>
      {/* Background decorations */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-10%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'rgba(251, 192, 45, 0.1)',
        filter: 'blur(80px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'rgba(198, 40, 40, 0.2)',
        filter: 'blur(100px)',
        pointerEvents: 'none'
      }} />

      <Card 
        bordered={false}
        style={{
          width: '100%',
          maxWidth: '460px',
          borderRadius: '16px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
          background: 'rgba(255, 255, 255, 0.97)',
          backdropFilter: 'blur(10px)',
          border: '1.5px solid rgba(255, 255, 255, 0.25)',
          overflow: 'hidden'
        }}
        bodyStyle={{ padding: '40px 32px 32px 32px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              objectFit: 'cover',
              boxShadow: '0 4px 15px rgba(198, 40, 40, 0.2)',
              marginBottom: '16px',
              border: '2px solid #ffffff'
            }} 
          />
          <Title level={3} style={{ margin: '0 0 4px 0', color: '#c62828', fontWeight: 900, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Chi bộ Sinh viên
          </Title>
          <Text style={{ color: '#555555', fontWeight: 700, fontSize: '13px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
            Đảng bộ Trường Đại học Kinh tế
          </Text>
          <div style={{ width: '60px', height: '3px', backgroundColor: '#fbc02d', margin: '12px auto 0 auto', borderRadius: '2px' }} />
        </div>

        {errorMsg && (
          <Alert 
            message={errorMsg} 
            type="error" 
            showIcon 
            style={{ marginBottom: '20px', borderRadius: '8px' }} 
          />
        )}

        <Form
          form={form}
          name="login_form"
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Đồng chí chưa nhập Tên đăng nhập!' }]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: '#c62828' }} />} 
              placeholder="Tên đăng nhập (Mã số sinh viên)" 
              size="large"
              style={{ borderRadius: '8px', height: '45px' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Đồng chí chưa nhập Mật khẩu!' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#c62828' }} />}
              placeholder="Mật khẩu"
              size="large"
              style={{ borderRadius: '8px', height: '45px' }}
            />
          </Form.Item>



          <Form.Item style={{ marginBottom: '16px' }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              style={{ 
                width: '100%', 
                height: '45px', 
                backgroundColor: '#c62828', 
                borderColor: '#c62828',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '15px',
                boxShadow: '0 4px 12px rgba(198, 40, 40, 0.3)'
              }}
            >
              ĐĂNG NHẬP HỆ THỐNG
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '11px', color: '#8c8c8c' }}>
          <Space direction="vertical" size={2}>
            <span>Bản quyền © 2026 Đảng bộ Trường Đại học Kinh tế</span>
            <span style={{ fontWeight: 700, color: '#c62828' }}><FlagOutlined /> Chi bộ Sinh viên vững mạnh</span>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default Login;
