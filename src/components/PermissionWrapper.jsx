import React from 'react';
import { Tooltip } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import { permissionService } from '../services/permissionService';

/**
 * Declarative component-level permission wrapper
 * @param {string} module - The database module (e.g. 'members', 'official')
 * @param {string} action - The action type (e.g. 'create', 'edit', 'delete')
 * @param {string} fallback - 'hide' (default) or 'disabled' (render disabled children with a locked tooltip)
 */
const PermissionWrapper = ({ children, module, action, fallback = 'hide' }) => {
  const { currentUser, getRoleBadgeName } = useAuth();
  const role = currentUser?.role;

  const isAllowed = permissionService.hasActionAccess(role, module, action);

  if (isAllowed) {
    return <>{children}</>;
  }

  if (fallback === 'disabled') {
    // If the action is blocked, render the child but clone it with disabled=true 
    // and wrap it in an Ant Design Tooltip explanation
    return (
      <Tooltip title={`Chức năng bị khóa đối với vai trò: ${getRoleBadgeName(role)}`}>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { 
              disabled: true, 
              style: { ...(child.props.style || {}), pointerEvents: 'none', opacity: 0.5 }
            });
          }
          return child;
        })}
      </Tooltip>
    );
  }

  // Default: hide completely
  return null;
};

export default PermissionWrapper;
