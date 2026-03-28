import * as db from "../../../../db";
import type { IUserRepository, UpsertUserInput } from "../../domain/contracts/user.repository";
import type { UserEntity } from "../../domain/entities/user.entity";

function mapUser(user: Awaited<ReturnType<typeof db.getUserById>>): UserEntity | null {
  if (!user) return null;
  return {
    id: user.id,
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastSignedIn: user.lastSignedIn,
  };
}

export class DrizzleUserRepository implements IUserRepository {
  async upsert(input: UpsertUserInput): Promise<void> {
    await db.upsertUser({
      openId: input.openId,
      name: input.name,
      email: input.email,
      loginMethod: input.loginMethod,
      role: input.role,
      lastSignedIn: input.lastSignedIn,
    });
  }

  async findById(userId: number): Promise<UserEntity | null> {
    const user = await db.getUserById(userId);
    return mapUser(user);
  }

  async findByOpenId(openId: string): Promise<UserEntity | null> {
    const user = await db.getUserByOpenId(openId);
    return mapUser(user as Awaited<ReturnType<typeof db.getUserById>>);
  }

  async listByLoginMethod(loginMethod: string): Promise<UserEntity[]> {
    const users = await db.listUsersByLoginMethod(loginMethod);
    return users
      .map((item) => mapUser(item as Awaited<ReturnType<typeof db.getUserById>>))
      .filter((item): item is UserEntity => item !== null);
  }

  async listForAdmin(): Promise<UserEntity[]> {
    const users = await db.listUsersForAdmin();
    return users
      .map((item) => mapUser(item as Awaited<ReturnType<typeof db.getUserById>>))
      .filter((item): item is UserEntity => item !== null);
  }

  async setLoginMethod(userId: number, loginMethod: string): Promise<void> {
    await db.setUserLoginMethodById(userId, loginMethod);
  }

  async updateRoleAndLoginMethod(
    userId: number,
    payload: { role?: "admin" | "gerente" | "user"; loginMethod?: string }
  ): Promise<void> {
    await db.updateUserRoleAndLoginMethodById(userId, payload);
  }
}
