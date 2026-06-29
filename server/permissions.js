const VIEW_PERMISSIONS = {
  dashboard: 'view:dashboard',
  clients: 'view:clients',
  products: 'view:products',
  stock: 'view:stock',
  sales: 'view:sales',
  quotes: 'view:sales',
  production: 'view:production',
  cash: 'view:cash',
  payables: 'view:payables',
  receivables: 'view:receivables',
  sellers: 'view:sellers',
  reports: 'view:reports',
  aiCfo: 'view:aiCfo',
  settings: 'view:settings'
};

const COLLECTION_PERMISSIONS = {
  clients: { create: 'create:clients', edit: 'edit:clients', delete: 'delete:clients' },
  products: { create: 'create:products', edit: 'edit:products', delete: 'delete:products' },
  sales: { create: 'create:sales', edit: 'edit:sales', delete: 'delete:sales' },
  quotes: { create: 'create:quotes', edit: 'create:quotes', delete: 'delete:sales' },
  production: { create: 'create:production', edit: 'edit:production', delete: 'delete:sales' },
  stock: { create: 'edit:stock', edit: 'edit:stock', delete: 'edit:stock' },
  cash: { create: 'edit:finance', edit: 'edit:finance', delete: 'edit:finance' },
  payables: { create: 'create:payables', edit: 'edit:finance', delete: 'delete:accounts' },
  receivables: { create: 'create:receivables', edit: 'edit:finance', delete: 'delete:accounts' },
  sellers: { create: 'create:sellers', edit: 'edit:commission', delete: 'delete:sellers' },
  commissions: { create: 'edit:commission', edit: 'edit:commission', delete: 'edit:commission' },
  equipment: { create: 'edit:production', edit: 'edit:production', delete: 'edit:production' },
  inventoryItems: { create: 'edit:stock', edit: 'edit:stock', delete: 'edit:stock' }
};

const ALL_PERMISSIONS = [
  ...Object.values(VIEW_PERMISSIONS),
  'view:finance',
  'view:commissions',
  'create:clients',
  'create:products',
  'create:sales',
  'create:quotes',
  'create:production',
  'create:payables',
  'create:receivables',
  'create:sellers',
  'edit:clients',
  'edit:products',
  'edit:sales',
  'edit:stock',
  'edit:production',
  'edit:finance',
  'edit:commission',
  'edit:users',
  'delete:clients',
  'delete:products',
  'delete:sales',
  'delete:accounts',
  'delete:sellers',
  'delete:users',
  'special:payCommission',
  'special:changeOtherPassword',
  'special:changePermissions',
  'special:exportPdf',
  'special:viewProfit',
  'special:viewCash',
  'special:viewOtherCommissions',
  'special:viewAiCfo'
];

const PROFILE_PERMISSIONS = {
  admin: ALL_PERMISSIONS,
  manager: ALL_PERMISSIONS.filter(permission => !permission.startsWith('delete:users')),
  financeiro: [
    'view:dashboard', 'view:clients', 'view:products', 'view:sales', 'view:finance', 'view:cash',
    'view:payables', 'view:receivables', 'view:reports', 'view:sellers', 'view:commissions',
    'create:payables', 'create:receivables', 'edit:finance', 'edit:commission',
    'special:payCommission', 'special:exportPdf', 'special:viewProfit', 'special:viewCash',
    'special:viewOtherCommissions'
  ],
  vendedor: [
    'view:dashboard', 'view:clients', 'view:products', 'view:stock', 'view:sales', 'view:production',
    'view:sellers', 'view:commissions', 'create:clients', 'create:sales', 'create:quotes',
    'edit:clients', 'edit:sales'
  ],
  producao: [
    'view:dashboard', 'view:clients', 'view:products', 'view:stock', 'view:sales', 'view:production',
    'edit:production', 'edit:stock'
  ],
  custom: []
};

const BIANCA_PERMISSIONS = [
  'view:dashboard',
  'view:clients',
  'create:clients',
  'view:products',
  'view:stock',
  'view:sales',
  'create:sales',
  'view:production',
  'edit:production',
  'view:sellers',
  'view:commissions'
];

function normalizePermissions(profile, permissions) {
  if (profile === 'admin') return [...ALL_PERMISSIONS];
  const base = PROFILE_PERMISSIONS[profile] || [];
  const explicit = Array.isArray(permissions) ? permissions : [];
  return [...new Set([...base, ...explicit])].filter(permission => ALL_PERMISSIONS.includes(permission));
}

function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === 'admin' || user.profile === 'admin') return true;
  return normalizePermissions(user.profile, user.permissions).includes(permission);
}

module.exports = {
  ALL_PERMISSIONS,
  BIANCA_PERMISSIONS,
  COLLECTION_PERMISSIONS,
  PROFILE_PERMISSIONS,
  VIEW_PERMISSIONS,
  hasPermission,
  normalizePermissions
};
