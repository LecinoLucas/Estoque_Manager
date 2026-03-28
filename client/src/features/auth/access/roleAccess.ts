export type UserRole = "admin" | "gerente" | "user";

const ALL_ROLES: readonly UserRole[] = ["admin", "gerente", "user"];
const ADMIN_AND_MANAGER: readonly UserRole[] = ["admin", "gerente"];
const ADMIN_ONLY: readonly UserRole[] = ["admin"];

/**
 * Matriz RBAC por rota de apresentação.
 */
export const ROUTE_ACCESS: Record<string, readonly UserRole[]> = {
  "/": ALL_ROLES,
  "/vendas": ALL_ROLES,
  "/historico": ALL_ROLES,

  "/produtos": ADMIN_AND_MANAGER,
  "/precos": ADMIN_AND_MANAGER,
  "/relatorio-vendas": ADMIN_AND_MANAGER,
  "/relatorio-encomendas": ADMIN_AND_MANAGER,
  "/rankings": ADMIN_AND_MANAGER,

  "/precos-margens": ADMIN_ONLY,
  "/marcas": ADMIN_ONLY,
  "/usuarios-pendentes": ADMIN_ONLY,
  "/auditoria": ADMIN_ONLY,
  "/componentes": ADMIN_ONLY,
};

export function getAllowedRoles(path: string): readonly UserRole[] {
  return ROUTE_ACCESS[path] ?? ADMIN_ONLY;
}

export function canAccessPath(role: string | undefined, path: string) {
  if (!role) return false;
  return getAllowedRoles(path).includes(role as UserRole);
}
