/**
 * Shared Constants — Valores compartilhados entre API e Frontend
 * 
 * REGRA: Nunca importe módulos específicos de ambiente aqui.
 */

// ── Role IDs padrão ─────────────────────────────────────────────────────────────

export const ROLE_IDS = {
  ADMIN: 'ROLE_ADMIN',
  GERENTE: 'ROLE_GERENTE',
  SDR: 'ROLE_SDR',
  SUPPORT: 'ROLE_SUPPORT',
  FINANCE: 'ROLE_FINANCE',
  PEOPLE: 'ROLE_PEOPLE',
  READONLY: 'ROLE_READONLY',
} as const;

/** Roles que têm acesso administrativo completo */
export const ADMIN_ROLE_IDS = [ROLE_IDS.ADMIN] as const;

/** Roles que têm acesso de gestão (admin + gerente) */
export const MANAGEMENT_ROLE_IDS = [
  ROLE_IDS.ADMIN,
  ROLE_IDS.GERENTE,
] as const;

/** Roles que têm acesso a funcionalidades de People & Culture */
export const PEOPLE_MANAGEMENT_ROLE_IDS = [
  ROLE_IDS.ADMIN,
  ROLE_IDS.GERENTE,
  ROLE_IDS.PEOPLE,
] as const;

/** Nomes de roles que indicam acesso administrativo (compatibilidade com string legado) */
export const ADMIN_ROLE_NAMES = ['Administrador'] as const;

/** Nomes de roles que indicam gestão */
export const MANAGEMENT_ROLE_NAMES = ['Administrador', 'Gerente'] as const;

/** Nomes de roles de People Management */
export const PEOPLE_MANAGEMENT_ROLE_NAMES = ['Administrador', 'Gerente', 'People & Culture'] as const;

// ── Super Admin ─────────────────────────────────────────────────────────────────

/** E-mail do super-admin do sistema (bypass de permissões) */
export const SUPER_ADMIN_EMAIL = 'jfs102019@hotmail.com';
