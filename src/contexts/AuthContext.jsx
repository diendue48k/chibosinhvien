import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';
import { ROLES, permissionService } from '../services/permissionService';

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
