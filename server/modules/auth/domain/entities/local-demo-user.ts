import type { UserRole } from "../../../shared/types/user-role";

export type LocalDemoUser = {
  id: number;
  openId: string;
  name: string;
  email: string;
  role: UserRole;
  password: string;
};

export const DEMO_USERS: readonly LocalDemoUser[] = [
  {
    id: 1,
    openId: "admin-local",
    name: "Administrador",
    email: "admin@pioneira.local",
    role: "admin",
    password: "admin123",
  },
  {
    id: 2,
    openId: "gerente-local",
    name: "Gerente",
    email: "gerente@pioneira.local",
    role: "gerente",
    password: "gerente123",
  },
  {
    id: 3,
    openId: "user-local",
    name: "Usuário",
    email: "usuario@pioneira.local",
    role: "user",
    password: "user123",
  },
] as const;
