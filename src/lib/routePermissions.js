// Mapa rota → permissão exigida (defesa-em-profundidade no nível de rota).
// A autorização real dos DADOS é server-side (RLS + functions); este guard evita
// que um papel sem permissão sequer abra a tela (UX + camada extra).
// Rotas ausentes deste mapa são acessíveis a qualquer membro autenticado
// (ex.: /Notifications). A checagem primária dos dados continua no servidor.
export const ROUTE_PERMISSIONS = {
  '/Dashboard': 'view_dashboard',
  '/Assets': 'view_assets',
  '/AssetDetail': 'view_assets',
  '/AssetForm': 'create_asset',
  '/Inventory': 'view_inventory',
  '/Transfers': 'view_transfers',
  '/Maintenance': 'view_maintenance',
  '/Contracts': 'view_contracts',
  '/CiapCredits': 'view_fiscal_credits',
  '/Depreciation': 'view_depreciation',
  '/Reports': 'view_reports',
  '/AccountingExport': 'view_accounting_export',
  '/ImportExport': 'view_reports',
  '/AssetMap': 'view_map',
  '/AssetLabel': 'view_labels',
  '/Suppliers': 'view_suppliers',
  '/Collaborators': 'view_users',
  '/UsersManagement': 'view_users',
  '/AuditTrail': 'view_audit',
  '/Settings': 'view_settings',
  '/CompanyProfile': 'view_company',
  '/Branches': 'view_branches',
  '/Billing': 'view_billing',
};

// Rotas que exigem platform-admin (dono da plataforma), não papel de workspace.
export const PLATFORM_ADMIN_ROUTES = ['/SuperAdmin'];
