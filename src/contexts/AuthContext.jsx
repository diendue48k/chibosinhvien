import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';
import { ROLES, permissionService } from '../services/permissionService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // State initialization for active session
  const [currentUser, setCurrentUser] = useState(() => {
    const savedCustomUser = localStorage.getItem('logged_in_custom_user');
    if (savedCustomUser) {
      try {
        return JSON.parse(savedCustomUser);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  useEffect(() => {
    const refreshUserSession = async () => {
      if (!currentUser || currentUser.role !== 'DANGVIEN') return;
      try {
        const q = query(collection(db, "dang_vien"), where("mssv", "==", currentUser.mssv || currentUser.username));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const memberData = snap.docs[0].data();
          const safeDayjs = (val) => {
            if (!val) return dayjs(null);
            if (val.toDate && typeof val.toDate === 'function') return dayjs(val.toDate());
            if (val.seconds) return dayjs(val.seconds * 1000);
            return dayjs(val);
          };
          
          const checkIsDuBi = (member) => {
            if (!member) return true;
            if (member.dang_vien_du_bi === true) return true;
            if (member.dang_vien_du_bi === false) return false;
            if (member.loai_dang_vien === "Dự bị" || member.loai_dang_vien === "dubi") return true;
            if (member.loai_dang_vien === "Chính thức") return false;
            const getOfficialDate = () => {
              const date = member.ngay_cong_nhan_dvct || member.ngay_chinh_thuc;
              if (!date) return null;
              return safeDayjs(date);
            };
            const officialDate = getOfficialDate();
            if (officialDate && officialDate.isValid()) {
              return officialDate.isAfter(dayjs(), 'day');
            }
            if (member.so_quyet_dinh_dvct) {
              return false;
            }
            return true;
          };
          
          let isDuBi = checkIsDuBi(memberData);
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
            yeuCauLamHoSo = true;
          }

          if (yeuCauLamHoSo !== currentUser.yeu_cau_lam_ho_so || isDuBi !== currentUser.dang_vien_du_bi) {
            const updatedUser = {
              ...currentUser,
              dang_vien_du_bi: isDuBi,
              yeu_cau_lam_ho_so: yeuCauLamHoSo
            };
            setCurrentUser(updatedUser);
            localStorage.setItem('logged_in_custom_user', JSON.stringify(updatedUser));
          }
        }
      } catch (e) {
        console.error("Lỗi đồng bộ dữ liệu phiên đăng nhập:", e);
      }
    };

    refreshUserSession();
  }, [currentUser]);

  const login = async (roleName, customUserData) => {
    if (!customUserData) {
      throw new Error('Tài khoản không hợp lệ');
    }
    setCurrentUser(customUserData);
    localStorage.setItem('logged_in_user_role', roleName);
    localStorage.setItem('logged_in_custom_user', JSON.stringify(customUserData));
    return customUserData;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('logged_in_user_role');
    localStorage.removeItem('logged_in_custom_user');
    message.success('Đã đăng xuất khỏi hệ thống thành công.');
  };

  const getRoleBadgeName = (role) => {
    switch (role) {
      case ROLES.ADMIN: return 'Hệ thống Admin';
      case ROLES.BITHU: return 'Bí thư Chi bộ';
      case ROLES.CAPUY: return 'Cấp ủy / Phó Bí thư';
      case ROLES.OFFICIAL_MANAGER: return 'Trưởng ban Đảng viên chính thức';
      case ROLES.ADMISSION_MANAGER: return 'Trưởng ban Hồ sơ kết nạp';
      case ROLES.DANGVIEN: return 'Đảng viên sinh viên';
      default: return role;
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, getRoleBadgeName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
