import { AUTH_AUDIT_ACTION } from "@shared/auth-governance";
import {
  getUserAccessStatus,
  isPendingLoginMethod,
  isRejectedLoginMethod,
  LOGIN_METHOD_GOOGLE,
  LOGIN_METHOD_GOOGLE_PENDING,
  LOGIN_METHOD_GOOGLE_REJECTED,
} from "../../../../_core/userGovernance";
import type { IAuditGateway } from "../../../audit/domain/contracts/audit.gateway";
import type { IUserRepository } from "../../../users/domain/contracts/user.repository";
import { DomainError } from "../../../shared/errors/domain-error";

type AdminActor = {
  id: number;
  email: string | null;
  role: string;
  openId: string;
  ip?: string;
};

export class UserApprovalService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly auditGateway: IAuditGateway
  ) {}

  async listPendingUsers() {
    return await this.userRepository.listByLoginMethod(LOGIN_METHOD_GOOGLE_PENDING);
  }

  async listUsersForAdmin() {
    const users = await this.userRepository.listForAdmin();
    return users.map((user) => ({
      ...user,
      status: getUserAccessStatus(user.loginMethod),
    }));
  }

  async approveUser(actor: AdminActor, userId: number) {
    const target = await this.userRepository.findById(userId);
    if (!target) throw new DomainError("Usuário não encontrado.", "NOT_FOUND");

    await this.userRepository.setLoginMethod(userId, LOGIN_METHOD_GOOGLE);
    await this.auditGateway.write({
      action: AUTH_AUDIT_ACTION.APPROVE_USER,
      actor,
      target: {
        userId: target.id,
        targetEmail: target.email,
        targetOpenId: target.openId,
      },
    });

    return { success: true } as const;
  }

  async rejectUser(actor: AdminActor, userId: number) {
    const target = await this.userRepository.findById(userId);
    if (!target) throw new DomainError("Usuário não encontrado.", "NOT_FOUND");

    await this.userRepository.setLoginMethod(userId, LOGIN_METHOD_GOOGLE_REJECTED);
    await this.auditGateway.write({
      action: AUTH_AUDIT_ACTION.REJECT_USER,
      actor,
      target: {
        userId: target.id,
        targetEmail: target.email,
        targetOpenId: target.openId,
      },
    });

    return { success: true } as const;
  }

  async promoteUserToAdmin(actor: AdminActor, userId: number) {
    const target = await this.userRepository.findById(userId);
    if (!target) throw new DomainError("Usuário não encontrado.", "NOT_FOUND");

    if (target.role === "admin") {
      return { success: true, alreadyAdmin: true } as const;
    }

    if (isPendingLoginMethod(target.loginMethod) || isRejectedLoginMethod(target.loginMethod)) {
      throw new DomainError(
        "Não é possível promover usuário pendente/rejeitado. Aprove o acesso primeiro.",
        "BAD_REQUEST"
      );
    }

    await this.userRepository.updateRoleAndLoginMethod(userId, { role: "admin" });
    await this.auditGateway.write({
      action: AUTH_AUDIT_ACTION.PROMOTE_USER_ADMIN,
      actor,
      target: {
        userId: target.id,
        targetEmail: target.email,
        targetOpenId: target.openId,
      },
      metadata: {
        beforeRole: target.role,
        afterRole: "admin",
      },
    });

    return { success: true, alreadyAdmin: false } as const;
  }

  async inactivateUserToPending(actor: AdminActor, targetUserId: number) {
    if (actor.id === targetUserId) {
      throw new DomainError("Não é permitido inativar seu próprio usuário administrador.", "BAD_REQUEST");
    }

    const target = await this.userRepository.findById(targetUserId);
    if (!target) throw new DomainError("Usuário não encontrado.", "NOT_FOUND");

    await this.userRepository.updateRoleAndLoginMethod(targetUserId, {
      role: "user",
      loginMethod: LOGIN_METHOD_GOOGLE_PENDING,
    });

    await this.auditGateway.write({
      action: AUTH_AUDIT_ACTION.INACTIVATE_USER_TO_PENDING,
      actor,
      target: {
        userId: target.id,
        targetEmail: target.email,
        targetOpenId: target.openId,
      },
      metadata: {
        beforeRole: target.role,
        beforeLoginMethod: target.loginMethod ?? null,
        afterRole: "user",
        afterLoginMethod: LOGIN_METHOD_GOOGLE_PENDING,
      },
    });

    return { success: true } as const;
  }
}
