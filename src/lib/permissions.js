/**
 * Permission levels:
 * admin   - full access
 * manager - can manage assets, see financials, generate reports
 * user    - can view assets assigned to them, scan QR codes
 */

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
};

export function can(user, action) {
  const role = user?.role || 'user';

  const permissions = {
    admin: [
      'view_dashboard', 'view_assets', 'create_asset', 'edit_asset', 'delete_asset',
      'view_financials', 'view_depreciation', 'view_reports', 'export_reports',
      'view_suppliers', 'manage_suppliers',
      'view_users', 'manage_users',
      'view_map', 'view_assignments', 'manage_assignments',
      'view_labels', 'manage_labels',
    ],
    manager: [
      'view_dashboard', 'view_assets', 'create_asset', 'edit_asset',
      'view_financials', 'view_depreciation', 'view_reports', 'export_reports',
      'view_suppliers',
      'view_map', 'view_assignments', 'manage_assignments',
      'view_labels',
    ],
    user: [
      'view_assets', 'view_assignments', 'view_map',
    ],
  };

  return (permissions[role] || permissions.user).includes(action);
}

export function usePermissions(user) {
  return {
    can: (action) => can(user, action),
    role: user?.role || 'user',
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager' || user?.role === 'admin',
  };
}