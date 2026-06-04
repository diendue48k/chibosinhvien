import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';
import DangVien from './pages/DangVien';
import DangVienDuBi from './pages/DangVienDuBi';
import ChuyenSinhHoat from './pages/ChuyenSinhHoat';
import ChuyenTamThoi from './pages/ChuyenTamThoi';
import HoSoChuyenRa from './pages/HoSoChuyenRa';
import HoSoKetNap from './pages/HoSoKetNap';
import HoSoDaKetNap from './pages/HoSoDaKetNap';
import ThongKeHoSoKetNap from './pages/ThongKeHoSoKetNap';
import ThongKeHoSoChinhThuc from './pages/ThongKeHoSoChinhThuc';
import HoSoDaChinhThuc from './pages/HoSoDaChinhThuc';
import ThongBao from './pages/ThongBao';
import Users from './pages/Users';
import Profile from './pages/Profile';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import WeeklyPlan from './pages/WeeklyPlan';
import Attendance from './pages/Attendance';
import Voting from './pages/Voting';
import DangKy213 from './pages/DangKy213';
import LichHop from './pages/LichHop';
import XinVang from './pages/XinVang';
import DocumentGenerator from './pages/DocumentGenerator';
import DangKyChuyenSinhHoat from './pages/DangKyChuyenSinhHoat';
function App() {
  useEffect(() => {
    const loadRolePermissions = async () => {
      try {
        const docRef = doc(db, 'system_config', 'role_permissions');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          localStorage.setItem('role_permissions', JSON.stringify(docSnap.data()));
        }
      } catch (e) {
        console.error('Lỗi khi tải cấu hình phân quyền từ Firestore:', e);
      }
    };
    loadRolePermissions();
  }, []);

  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: "'SVN-Gilroy', 'svn-gilroy', 'SVN - Gilroy', 'Gilroy', 'SVN Gilroy', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        }
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="dang-vien" element={<ProtectedRoute><DangVien /></ProtectedRoute>} />
              <Route path="dang-vien-du-bi" element={<Navigate to="/ho-so-chinh-thuc" replace />} />
              <Route path="chuyen-tam-thoi" element={<ProtectedRoute><ChuyenTamThoi /></ProtectedRoute>} />
              <Route path="chuyen-sinh-hoat" element={<ProtectedRoute><ChuyenSinhHoat /></ProtectedRoute>} />
              <Route path="ho-so-chuyen-ra" element={<ProtectedRoute><HoSoChuyenRa forceTab="1" /></ProtectedRoute>} />
              <Route path="tao-bieu-mau-chuyen-ra" element={<ProtectedRoute><HoSoChuyenRa forceTab="2" /></ProtectedRoute>} />
              <Route path="ho-so-ket-nap" element={<ProtectedRoute><HoSoKetNap /></ProtectedRoute>} />
              <Route path="ho-so-da-ket-nap" element={<ProtectedRoute><HoSoDaKetNap /></ProtectedRoute>} />
              <Route path="thong-ke-ho-so" element={<ProtectedRoute><ThongKeHoSoKetNap /></ProtectedRoute>} />
              <Route path="ho-so-chinh-thuc" element={<ProtectedRoute><DangVienDuBi /></ProtectedRoute>} />
              <Route path="ho-so-da-chinh-thuc" element={<ProtectedRoute><HoSoDaChinhThuc /></ProtectedRoute>} />
              <Route path="thong-ke-chinh-thuc" element={<ProtectedRoute><ThongKeHoSoChinhThuc /></ProtectedRoute>} />
              <Route path="thong-bao" element={<ProtectedRoute><ThongBao /></ProtectedRoute>} />
              <Route path="users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
              <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="weekly-plan" element={<ProtectedRoute><WeeklyPlan /></ProtectedRoute>} />
              <Route path="attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
              <Route path="voting" element={<ProtectedRoute><Voting /></ProtectedRoute>} />
              <Route path="dang-ky-213" element={<ProtectedRoute><DangKy213 /></ProtectedRoute>} />
              <Route path="dang-ky-chuyen-sinh-hoat" element={<ProtectedRoute><DangKyChuyenSinhHoat /></ProtectedRoute>} />
              <Route path="lich-hop" element={<ProtectedRoute><LichHop /></ProtectedRoute>} />
              <Route path="xin-vang" element={<ProtectedRoute><XinVang /></ProtectedRoute>} />
              <Route path="document-generator" element={<ProtectedRoute><DocumentGenerator /></ProtectedRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
