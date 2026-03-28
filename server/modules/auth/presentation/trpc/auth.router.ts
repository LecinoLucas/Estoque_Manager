import { AUTH_RATE_LIMIT_SCOPE } from "@shared/auth-governance";
import type { TrpcContext } from "../../../../_core/context";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
  withRateLimit,
} from "../../../../_core/trpc";
import { DrizzleUserRepository } from "../../../users/infrastructure/repositories/drizzle-user.repository";
import { FileAuditGateway } from "../../../audit/infrastructure/services/file-audit.gateway";
import { LocalAuthService } from "../../application/services/local-auth.service";
import { UserApprovalService } from "../../../approvals/application/services/user-approval.service";
import { AuditGovernanceService } from "../../../audit/application/services/audit-governance.service";
import {
  auditExportSchema,
  auditFilterSchema,
  loginInputSchema,
  rateLimitClearSchema,
  rateLimitStatsSchema,
  stockAnomaliesSchema,
  userIdSchema,
} from "./auth.schemas";
import { toTrpcError } from "../../../shared/utils/trpc-error";

const userRepository = new DrizzleUserRepository();
const auditGateway = new FileAuditGateway();
const authService = new LocalAuthService(userRepository, auditGateway);
const approvalsService = new UserApprovalService(userRepository, auditGateway);
const auditService = new AuditGovernanceService(auditGateway);

function adminActorFromCtx(ctx: Pick<TrpcContext, "req"> & {
  user: { id: number; email: string | null; role: string; openId: string };
}) {
  return {
    id: ctx.user.id,
    email: ctx.user.email,
    role: ctx.user.role,
    openId: ctx.user.openId,
    ip: ctx.req.ip,
  };
}

/**
 * Controller TRPC fino:
 * - valida input
 * - delega para use-cases/services
 * - traduz erros de domínio para camada HTTP/TRPC
 */
export const authRouter = router({
  login: publicProcedure
    .use(
      withRateLimit({
        scope: AUTH_RATE_LIMIT_SCOPE.LOGIN,
        by: "ip",
        max: 15,
        windowMs: 10 * 60 * 1000,
        message: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
      })
    )
    .input(loginInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await authService.login(ctx, input);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),

  me: publicProcedure.query(({ ctx }) => ctx.user),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    try {
      return await authService.logout(ctx);
    } catch (error) {
      throw toTrpcError(error);
    }
  }),

  logoutAll: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      return await authService.logoutAll(ctx);
    } catch (error) {
      throw toTrpcError(error);
    }
  }),

  pendingUsers: adminProcedure.query(async () => {
    try {
      return await approvalsService.listPendingUsers();
    } catch (error) {
      throw toTrpcError(error);
    }
  }),

  usersAdminList: adminProcedure.query(async () => {
    try {
      return await approvalsService.listUsersForAdmin();
    } catch (error) {
      throw toTrpcError(error);
    }
  }),

  approveUser: adminProcedure
    .use(withRateLimit({ scope: AUTH_RATE_LIMIT_SCOPE.APPROVE_USER, max: 60, windowMs: 60 * 1000 }))
    .input(userIdSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await approvalsService.approveUser(adminActorFromCtx(ctx), input.userId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),

  promoteUserToAdmin: adminProcedure
    .use(withRateLimit({ scope: AUTH_RATE_LIMIT_SCOPE.PROMOTE_USER_ADMIN, max: 30, windowMs: 60 * 1000 }))
    .input(userIdSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await approvalsService.promoteUserToAdmin(adminActorFromCtx(ctx), input.userId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),

  inactivateUserToPending: adminProcedure
    .use(withRateLimit({ scope: AUTH_RATE_LIMIT_SCOPE.INACTIVATE_USER_PENDING, max: 30, windowMs: 60 * 1000 }))
    .input(userIdSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await approvalsService.inactivateUserToPending(adminActorFromCtx(ctx), input.userId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),

  rejectUser: adminProcedure
    .use(withRateLimit({ scope: AUTH_RATE_LIMIT_SCOPE.REJECT_USER, max: 60, windowMs: 60 * 1000 }))
    .input(userIdSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await approvalsService.rejectUser(adminActorFromCtx(ctx), input.userId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),

  auditEvents: adminProcedure.input(auditFilterSchema).query(async ({ input }) => {
    try {
      return await auditService.listEvents(input);
    } catch (error) {
      throw toTrpcError(error);
    }
  }),

  auditExportCsv: adminProcedure
    .use(withRateLimit({ scope: AUTH_RATE_LIMIT_SCOPE.AUDIT_EXPORT_CSV, max: 10, windowMs: 60 * 1000 }))
    .input(auditExportSchema)
    .mutation(async ({ input }) => {
      try {
        return await auditService.exportCsv(input);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),

  rateLimitStats: adminProcedure.input(rateLimitStatsSchema).query(({ input }) => {
    try {
      return auditService.getRateLimitStats(input);
    } catch (error) {
      throw toTrpcError(error);
    }
  }),

  rateLimitClear: adminProcedure
    .use(withRateLimit({ scope: AUTH_RATE_LIMIT_SCOPE.RATE_LIMIT_CLEAR, max: 20, windowMs: 60 * 1000 }))
    .input(rateLimitClearSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await auditService.clearRateLimits(adminActorFromCtx(ctx), input);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),

  stockAnomalies: adminProcedure.input(stockAnomaliesSchema).query(async ({ input }) => {
    try {
      return await auditService.stockAnomalies(input);
    } catch (error) {
      throw toTrpcError(error);
    }
  }),

  auditStorageStats: adminProcedure.query(async () => {
    try {
      return await auditService.storageStats();
    } catch (error) {
      throw toTrpcError(error);
    }
  }),
});
