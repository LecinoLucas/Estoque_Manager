import type { UserRole } from "../../../shared/types/user-role";
import type { UserEntity } from "../entities/user.entity";

export type UpsertUserInput = {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: UserRole;
  lastSignedIn?: Date;
};

export interface IUserRepository {
  upsert(input: UpsertUserInput): Promise<void>;
  findById(userId: number): Promise<UserEntity | null>;
  findByOpenId(openId: string): Promise<UserEntity | null>;
  listByLoginMethod(loginMethod: string): Promise<UserEntity[]>;
  listForAdmin(): Promise<UserEntity[]>;
  setLoginMethod(userId: number, loginMethod: string): Promise<void>;
  updateRoleAndLoginMethod(
    userId: number,
    payload: { role?: UserRole; loginMethod?: string }
  ): Promise<void>;
}
