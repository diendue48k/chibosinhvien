import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { message } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import { permissionService, ROLES } from '../services/permissionService';

/**
 * Route protection component
 */
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    if (location.pathname === '/attendance') {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      return <Navigate to={`/quick-attendance${code ? `?code=${code}` : ''}`} replace />;
    }
    message.warning("Vui lòng đăng nhập hệ thống!");
    return <Navigate to="/login" replace />;
  }

  // Check if role is allowed to view the current path
  const path = location.pathname;
  let isAllowed = permissionService.hasRouteAccess(currentUser.role, path);

  // Dynamic override: DANGVIEN can only access /document-generator if admin has requested them to complete official profile
  if (isAllowed && path === '/document-generator' && currentUser.role === ROLES.DANGVIEN) {
    if (!currentUser.yeu_cau_lam_ho_so) {
      isAllowed = false;
    }
  }

  if (!isAllowed) {
    message.error(`Đồng chí không có quyền truy cập vào đường dẫn: ${path}`);
    
    // Everyone redirects to /dashboard now as Party members have their own custom portal
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
