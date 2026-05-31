/**
 * Role-Based Access Control (RBAC) Permission Service
 * Unified permissions directory for the Student Party Branch Management System
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  BITHU: 'BITHU',
  PHOBIHU: 'PHOBIHU',
  CAPUY: 'CAPUY',
  DANGVIEN: 'DANGVIEN',
  OFFICIAL_MANAGER: 'OFFICIAL_MANAGER',
  ADMISSION_MANAGER: 'ADMISSION_MANAGER',
  KIEMTRA: 'KIEMTRA',
  TRUYENTHONG: 'TRUYENTHONG',
  TOCHUC: 'TOCHUC'
};

// Route Access Mapping for Sidebar & Route Protection
const ROUTE_PERMISSIONS = {
  [ROLES.ADMIN]: ['/dashboard', '/dang-vien', '/chuyen-tam-thoi', '/chuyen-sinh-hoat', '/ho-so-chuyen-ra', '/ho-so-ket-nap', '/ho-so-da-ket-nap', '/thong-ke-ho-so', '/ho-so-chinh-thuc', '/ho-so-da-chinh-thuc', '/thong-ke-chinh-thuc', '/thong-bao', '/users', '/profile', '/weekly-plan', '/attendance', '/voting', '/dang-ky-213', '/lich-hop', '/xin-vang', '/document-generator'],
  [ROLES.BITHU]: ['/dashboard', '/dang-vien', '/chuyen-tam-thoi', '/chuyen-sinh-hoat', '/ho-so-chuyen-ra', '/ho-so-ket-nap', '/ho-so-da-ket-nap', '/thong-ke-ho-so', '/ho-so-chinh-thuc', '/ho-so-da-chinh-thuc', '/thong-ke-chinh-thuc', '/thong-bao', '/users', '/profile', '/weekly-plan', '/attendance', '/voting', '/dang-ky-213', '/lich-hop', '/xin-vang', '/document-generator'],
  [ROLES.PHOBIHU]: ['/dashboard', '/dang-vien', '/chuyen-tam-thoi', '/chuyen-sinh-hoat', '/ho-so-chuyen-ra', '/ho-so-ket-nap', '/ho-so-da-ket-nap', '/thong-ke-ho-so', '/ho-so-chinh-thuc', '/ho-so-da-chinh-thuc', '/thong-ke-chinh-thuc', '/thong-bao', '/users', '/profile', '/weekly-plan', '/attendance', '/voting', '/dang-ky-213', '/lich-hop', '/xin-vang', '/document-generator'],
  [ROLES.CAPUY]: ['/dashboard', '/dang-vien', '/chuyen-tam-thoi', '/chuyen-sinh-hoat', '/ho-so-chuyen-ra', '/ho-so-ket-nap', '/ho-so-da-ket-nap', '/thong-ke-ho-so', '/ho-so-chinh-thuc', '/ho-so-da-chinh-thuc', '/thong-ke-chinh-thuc', '/thong-bao', '/users', '/profile', '/weekly-plan', '/attendance', '/voting', '/dang-ky-213', '/lich-hop', '/xin-vang', '/document-generator'],
  [ROLES.DANGVIEN]: ['/dashboard', '/dang-vien', '/profile', '/thong-bao', '/weekly-plan', '/voting', '/dang-ky-213', '/lich-hop', '/xin-vang', '/attendance', '/document-generator'],
  [ROLES.OFFICIAL_MANAGER]: ['/dashboard', '/dang-vien', '/chuyen-tam-thoi', '/chuyen-sinh-hoat', '/ho-so-chuyen-ra', '/ho-so-chinh-thuc', '/ho-so-da-chinh-thuc', '/thong-ke-chinh-thuc', '/thong-bao', '/profile', '/weekly-plan', '/attendance', '/voting', '/dang-ky-213', '/lich-hop', '/xin-vang', '/document-generator'],
  [ROLES.ADMISSION_MANAGER]: ['/dashboard', '/dang-vien', '/chuyen-tam-thoi', '/chuyen-sinh-hoat', '/ho-so-chuyen-ra', '/ho-so-ket-nap', '/ho-so-da-ket-nap', '/thong-ke-ho-so', '/thong-bao', '/profile', '/weekly-plan', '/attendance', '/voting', '/lich-hop', '/xin-vang', '/document-generator'],
  [ROLES.KIEMTRA]: ['/dashboard', '/dang-vien', '/chuyen-tam-thoi', '/chuyen-sinh-hoat', '/ho-so-chuyen-ra', '/ho-so-ket-nap', '/ho-so-da-ket-nap', '/thong-ke-ho-so', '/ho-so-chinh-thuc', '/ho-so-da-chinh-thuc', '/thong-ke-chinh-thuc', '/thong-bao', '/users', '/profile', '/weekly-plan', '/attendance', '/voting', '/dang-ky-213', '/lich-hop', '/xin-vang', '/document-generator'],
  [ROLES.TRUYENTHONG]: ['/dang-vien', '/profile', '/thong-bao', '/weekly-plan', '/voting', '/lich-hop', '/xin-vang', '/attendance', '/document-generator'],
  [ROLES.TOCHUC]: ['/dang-vien', '/profile', '/thong-bao', '/weekly-plan', '/voting', '/lich-hop', '/xin-vang', '/attendance', '/document-generator']
};

// Button-level & Fine-grained Action Permissions
const ACTION_PERMISSIONS = {
  members: {
    create: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.KIEMTRA],
    edit: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.KIEMTRA],
    delete: [ROLES.ADMIN, ROLES.KIEMTRA],
    transfer: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.OFFICIAL_MANAGER, ROLES.ADMISSION_MANAGER, ROLES.KIEMTRA],
    view: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.OFFICIAL_MANAGER, ROLES.ADMISSION_MANAGER, ROLES.KIEMTRA]
  },
  official: {
    create: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.KIEMTRA],
    edit: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.OFFICIAL_MANAGER, ROLES.KIEMTRA],
    delete: [ROLES.ADMIN, ROLES.KIEMTRA],
    view: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.OFFICIAL_MANAGER, ROLES.KIEMTRA]
  },
  admission: {
    create: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.KIEMTRA],
    edit: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.ADMISSION_MANAGER, ROLES.KIEMTRA],
    delete: [ROLES.ADMIN, ROLES.KIEMTRA],
    view: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.ADMISSION_MANAGER, ROLES.KIEMTRA]
  },
  transferred: {
    create: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.OFFICIAL_MANAGER, ROLES.ADMISSION_MANAGER, ROLES.KIEMTRA],
    edit: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.OFFICIAL_MANAGER, ROLES.ADMISSION_MANAGER, ROLES.KIEMTRA],
    delete: [ROLES.ADMIN, ROLES.KIEMTRA],
    view: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.OFFICIAL_MANAGER, ROLES.ADMISSION_MANAGER, ROLES.KIEMTRA]
  },
  notifications: {
    create: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.KIEMTRA, ROLES.TRUYENTHONG, ROLES.TOCHUC],
    delete: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.KIEMTRA],
    view: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.OFFICIAL_MANAGER, ROLES.ADMISSION_MANAGER, ROLES.KIEMTRA, ROLES.TRUYENTHONG, ROLES.TOCHUC, ROLES.DANGVIEN]
  },
  users: {
    manage: [ROLES.ADMIN]
  },
  dangky213: {
    create: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.KIEMTRA, ROLES.OFFICIAL_MANAGER, ROLES.DANGVIEN],
    manage: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.KIEMTRA, ROLES.OFFICIAL_MANAGER],
    export: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.KIEMTRA, ROLES.OFFICIAL_MANAGER]
  },
  voting: {
    manage: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY],
    view: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.KIEMTRA, ROLES.OFFICIAL_MANAGER, ROLES.ADMISSION_MANAGER, ROLES.TRUYENTHONG, ROLES.TOCHUC, ROLES.DANGVIEN]
  },
  meetings: {
    manage: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY],
    view: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.KIEMTRA, ROLES.OFFICIAL_MANAGER, ROLES.ADMISSION_MANAGER, ROLES.TRUYENTHONG, ROLES.TOCHUC, ROLES.DANGVIEN]
  },
  weekly_plan: {
    manage: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY],
    view: [ROLES.ADMIN, ROLES.BITHU, ROLES.PHOBIHU, ROLES.CAPUY, ROLES.KIEMTRA, ROLES.OFFICIAL_MANAGER, ROLES.ADMISSION_MANAGER, ROLES.TRUYENTHONG, ROLES.TOCHUC, ROLES.DANGVIEN]
  }
};

// Helper: Safe read of custom permissions from localStorage
const getCustomPermissions = () => {
  try {
    const val = localStorage.getItem('role_permissions');
    return val ? JSON.parse(val) : null;
  } catch (e) {
    console.error('Lỗi khi đọc role_permissions từ localStorage:', e);
    return null;
  }
};

// Helper: Check module action permission dynamically
const checkAccess = (role, module, action) => {
  if (!role) return false;
  
  // System administrators (ADMIN) and Party Secretary (BITHU) have absolute, unmodifiable rights
  if (role === ROLES.ADMIN || role === ROLES.BITHU) {
    return true;
  }

  const custom = getCustomPermissions();
  if (custom && custom[module] && custom[module][action]) {
    return custom[module][action].includes(role);
  }

  // Fallback to hardcoded default matrix
  const fallback = ACTION_PERMISSIONS[module];
  if (fallback && fallback[action]) {
    return fallback[action].includes(role);
  }
  return false;
};

export const permissionService = {
  /**
   * Check if a role can access a specific route path
   * @param {string} role - The current user's role
   * @param {string} path - The react router path (e.g. '/dang-vien')
   * @returns {boolean}
   */
  hasRouteAccess(role, path) {
    if (!role) return false;
    
    // System administrators (ADMIN) and Party Secretary (BITHU) have absolute access
    if (role === ROLES.ADMIN || role === ROLES.BITHU) {
      return true;
    }

    // Common routes accessible to all authenticated party members
    const commonRoutes = ['/', '/dashboard', '/profile'];
    if (commonRoutes.includes(path)) {
      return true;
    }

    // Map paths directly to action permissions
    if (path === '/dang-vien') {
      return checkAccess(role, 'members', 'view');
    }
    if (path === '/chuyen-tam-thoi' || path === '/chuyen-sinh-hoat') {
      return checkAccess(role, 'members', 'transfer');
    }
    if (path === '/ho-so-chuyen-ra') {
      return checkAccess(role, 'transferred', 'view');
    }
    if (path === '/ho-so-ket-nap' || path === '/ho-so-da-ket-nap' || path === '/thong-ke-ho-so') {
      return checkAccess(role, 'admission', 'view');
    }
    if (path === '/ho-so-chinh-thuc' || path === '/ho-so-da-chinh-thuc' || path === '/thong-ke-chinh-thuc') {
      return checkAccess(role, 'official', 'view');
    }
    if (path === '/document-generator') {
      return checkAccess(role, 'official', 'view');
    }
    if (path === '/thong-bao') {
      return checkAccess(role, 'notifications', 'view');
    }
    if (path === '/dang-ky-213') {
      return checkAccess(role, 'dangky213', 'create') || checkAccess(role, 'dangky213', 'manage');
    }
    if (path === '/users') {
      return checkAccess(role, 'users', 'manage');
    }
    if (path === '/voting') {
      return checkAccess(role, 'voting', 'view') || checkAccess(role, 'voting', 'manage');
    }
    if (path === '/lich-hop' || path === '/xin-vang' || path === '/attendance') {
      return checkAccess(role, 'meetings', 'view') || checkAccess(role, 'meetings', 'manage');
    }
    if (path === '/weekly-plan') {
      return checkAccess(role, 'weekly_plan', 'view') || checkAccess(role, 'weekly_plan', 'manage');
    }

    // Ultimate fallback if no custom config is stored yet
    const custom = getCustomPermissions();
    if (!custom) {
      const allowedRoutes = ROUTE_PERMISSIONS[role] || [];
      return allowedRoutes.includes(path);
    }

    return false;
  },

  /**
   * Check if a role can perform an action on a module
   * @param {string} role - Current user's role
   * @param {string} module - Module key (e.g. 'members', 'official')
   * @param {string} action - Action key (e.g. 'create', 'edit', 'delete')
   * @returns {boolean}
   */
  hasActionAccess(role, module, action) {
    return checkAccess(role, module, action);
  },

  /**
   * Get accessible sidebar paths for a role dynamically
   * @param {string} role 
   * @returns {string[]}
   */
  getAccessibleRoutes(role) {
    if (!role) return [];
    const allRoutes = [
      '/dashboard', '/dang-vien', '/chuyen-tam-thoi', '/chuyen-sinh-hoat', 
      '/ho-so-chuyen-ra', '/ho-so-ket-nap', '/ho-so-da-ket-nap', '/thong-ke-ho-so', 
      '/ho-so-chinh-thuc', '/ho-so-da-chinh-thuc', '/thong-ke-chinh-thuc', 
      '/thong-bao', '/users', '/profile', '/weekly-plan', '/attendance', 
      '/voting', '/dang-ky-213', '/lich-hop', '/xin-vang', '/document-generator'
    ];
    return allRoutes.filter(path => this.hasRouteAccess(role, path));
  },
  
  /**
   * Exposed default ACTION_PERMISSIONS for seeding or default restoration
   */
  getDefaultActionPermissions() {
    return ACTION_PERMISSIONS;
  }
};

export const DEFAULT_KHOA = ["P.CTSV", "Quản trị Kinh doanh", "Trung tâm Đào tạo Quốc tế", "Du lịch", "Marketing", "Tài chính", "Ngân hàng", "Kinh tế", "Kế toán", "Luật", "Thống kê - Tin học", "Thương mại điện tử", "Kinh doanh quốc tế", "Lý luận chính trị", "Khác"];
export const DEFAULT_NHOM = ["Phát triển Đảng", "Hồ sơ sinh hoạt Đảng", "Kiểm tra - Giám sát", "Truyền thông", "Tổ chức"];

