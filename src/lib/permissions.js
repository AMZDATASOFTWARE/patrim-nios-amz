/**
 * Sistema de permissões baseado em roles por workspace.
 *
 * Roles:
 *  admin   - acesso total ao workspace (dono ou administrador designado)
 *  manager - gerencia ativos, relatórios, fornecedores. Não gerencia usuários nem cobrança
 *  viewer  - visualização somente leitura de ativos e dashboard
 *  user    - acesso mínimo: vê ativos atribuídos a si, escaneia QR
 *
 * Super-admin (role='admin' no sistema base44 + sem workspace próprio):
 *  Acessa o painel de Administração (/SuperAdmin) e vê todos os workspaces.
 */

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  VIEWER: 'viewer',
  USER: 'user',
};

export const ROLE_LABELS = {
  admin: 'Administrador',
  manager: 'Gerente',
  viewer: 'Visualizador',
  user: 'Usuário',
};

export const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  viewer: 'bg-purple-100 text-purple-700 border-purple-200',
  user: 'bg-gray-100 text-gray-600 border-gray-200',
};

const PERMISSIONS = {
  admin: [
    'view_dashboard', 'view_assets', 'create_asset', 'edit_asset', 'delete_asset',
    'view_financials', 'view_depreciation', 'view_reports', 'export_reports',
    'view_suppliers', 'manage_suppliers',
    'view_users', 'manage_users', 'invite_users',
    'view_map', 'view_assignments', 'manage_assignments',
    'view_labels', 'manage_labels',
    'view_inventory', 'manage_inventory',
    'view_transfers', 'manage_transfers',
    'view_maintenance', 'manage_maintenance',
    'view_contracts', 'manage_contracts',
    'view_fiscal_credits', 'manage_fiscal_credits',
    'view_accounting_export', 'manage_accounting_export',
    'view_branches', 'manage_branches',
    'view_audit',
    'view_settings', 'manage_settings',
    'view_billing', 'manage_billing',
    'view_company', 'manage_company',
  ],
  manager: [
    'view_dashboard', 'view_assets', 'create_asset', 'edit_asset',
    'view_financials', 'view_depreciation', 'view_reports', 'export_reports',
    'view_suppliers', 'manage_suppliers',
    'view_users',
    'view_map', 'view_assignments', 'manage_assignments',
    'view_labels', 'manage_labels',
    'view_inventory', 'manage_inventory',
    'view_transfers', 'manage_transfers',
    'view_maintenance', 'manage_maintenance',
    'view_contracts', 'manage_contracts',
    'view_fiscal_credits',
    'view_accounting_export', 'manage_accounting_export',
    'view_branches',
    'view_settings',
    'view_company',
  ],
  viewer: [
    'view_dashboard', 'view_assets',
    'view_financials', 'view_depreciation', 'view_reports',
    'view_suppliers',
    'view_map', 'view_assignments',
    'view_labels',
    'view_inventory',
    'view_transfers',
    'view_maintenance',
    'view_contracts',
    'view_fiscal_credits',
  ],
  user: [
    'view_assets', 'view_assignments', 'view_map', 'view_transfers',
  ],
};

export const ROLE_PERMISSIONS_LABELS = {
  admin: [
    'Dashboard completo', 'Gestão de ativos (criar/editar/excluir)',
    'Relatórios e exportação', 'Gestão de fornecedores',
    'Gestão de usuários e convites', 'Mapa de ativos',
    'Termos de responsabilidade', 'Configurações do sistema',
    'Plano & Cobrança', 'Perfil da empresa',
  ],
  manager: [
    'Dashboard completo', 'Gestão de ativos (criar/editar)',
    'Relatórios e exportação', 'Gestão de fornecedores',
    'Visualizar usuários', 'Mapa de ativos',
    'Termos de responsabilidade',
  ],
  viewer: [
    'Dashboard (leitura)', 'Visualizar ativos', 'Visualizar relatórios',
    'Mapa de ativos (leitura)', 'Visualizar fornecedores',
  ],
  user: [
    'Visualizar ativos atribuídos', 'Mapa de ativos (leitura)', 'Escanear QR codes',
  ],
};

export function can(user, action) {
  const role = user?.role || 'user';
  return (PERMISSIONS[role] || PERMISSIONS.user).includes(action);
}

// O proprietário da conta (owner_email do workspace) responde pelo pagamento e,
// por isso, sempre pode ver/gerenciar a cobrança — mesmo que seu papel tenha
// sido alterado para um sem 'view_billing'. Evita que uma conta fique sem
// ninguém capaz de regularizar o pagamento (ex.: único usuário não-admin).
export function isWorkspaceOwner(user, workspace) {
  return !!(user?.email && workspace?.owner_email && user.email === workspace.owner_email);
}

export function canManageBilling(user, workspace) {
  return can(user, 'view_billing') || isWorkspaceOwner(user, workspace);
}

export function usePermissions(user) {
  const role = user?.role || 'user';
  return {
    can: (action) => can(user, action),
    role,
    isAdmin: role === 'admin',
    isManager: role === 'manager' || role === 'admin',
    isViewer: role === 'viewer',
    isUser: role === 'user',
  };
}