export type AppPermission = 
  | 'VIEW_DASHBOARD'
  | 'MANAGE_LEADS'
  | 'MANAGE_CLIENTS'
  | 'MANAGE_FINANCE'
  | 'MANAGE_TEAM'
  | 'MANAGE_SETTINGS'
  | 'MANAGE_WIKI'
  | 'MANAGE_SUPPORT'
  | 'VIEW_REPORTS';

export interface CustomRole {
  id: string; // Ex: admin, sdr, manager
  name: string; // Nome limpo: "Visualizador de Dash", "Administrador"
  level: number; // Hierarquia de bloqueio interno (quanto menor, mais cargo admin)
  permissions: AppPermission[];
  isDefault: boolean; // Se não pode ser excluído
  createdAt: number;
}

export const defaultRoles: CustomRole[] = [
  {
    id: 'ROLE_ADMIN',
    name: 'Administrador',
    level: 0,
    permissions: [
      'VIEW_DASHBOARD', 'MANAGE_LEADS', 'MANAGE_CLIENTS', 'MANAGE_FINANCE', 
      'MANAGE_TEAM', 'MANAGE_SETTINGS', 'MANAGE_WIKI', 'MANAGE_SUPPORT', 'VIEW_REPORTS'
    ],
    isDefault: true,
    createdAt: Date.now()
  },
  {
    id: 'ROLE_GERENTE',
    name: 'Gerente',
    level: 1,
    permissions: [
      'VIEW_DASHBOARD', 'MANAGE_LEADS', 'MANAGE_CLIENTS', 'MANAGE_FINANCE', 
      'MANAGE_TEAM', 'MANAGE_WIKI', 'MANAGE_SUPPORT', 'VIEW_REPORTS'
    ],
    isDefault: true,
    createdAt: Date.now()
  },
  {
    id: 'ROLE_SDR',
    name: 'SDR / Vendas',
    level: 5,
    permissions: ['VIEW_DASHBOARD', 'MANAGE_LEADS'],
    isDefault: true,
    createdAt: Date.now()
  },
  {
    id: 'ROLE_SUPPORT',
    name: 'Suporte Técnico',
    level: 5,
    permissions: ['VIEW_DASHBOARD', 'MANAGE_SUPPORT', 'MANAGE_WIKI'],
    isDefault: true,
    createdAt: Date.now()
  },
  {
    id: 'ROLE_FINANCE',
    name: 'Financeiro',
    level: 3,
    permissions: ['VIEW_DASHBOARD', 'MANAGE_FINANCE', 'VIEW_REPORTS'],
    isDefault: true,
    createdAt: Date.now()
  },
  {
    id: 'ROLE_PEOPLE',
    name: 'People & Culture',
    level: 4,
    permissions: ['VIEW_DASHBOARD', 'MANAGE_TEAM', 'MANAGE_WIKI'],
    isDefault: true,
    createdAt: Date.now()
  },
  {
    id: 'ROLE_READONLY',
    name: 'Só Leitura',
    level: 10,
    permissions: ['VIEW_DASHBOARD'],
    isDefault: true,
    createdAt: Date.now()
  }
];
