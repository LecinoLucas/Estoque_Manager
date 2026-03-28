import type { UserRole } from "../../../shared/types/user-role";

/**
 * Entidade de domínio de usuário desacoplada do ORM.
 */
export type UserEntity = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};
