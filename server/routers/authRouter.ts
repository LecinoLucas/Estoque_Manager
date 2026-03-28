import { TRPCError } from "@trpc/server";
import { AUTH_AUDIT_ACTION, AUTH_RATE_LIMIT_SCOPE } from "@shared/auth-governance";
import { STOCK_ACTION_PREFIX } from "@shared/stock-governance";
import { z } from "zod";
import * as db from "../db";
import { getSessionCookieOptions } from "../_core/cookies";
import { SESSION_COOKIE_NAME } from "../_core/session";
import { issueSessionForUser } from "../_core/authUsers";
import { getAuditStorageStats, logAuditEvent, readAuditEvents, toAuditCsv } from "../_core/audit";
import {
  getUserAccessStatus,
  isPendingLoginMethod,
  isRejectedLoginMethod,
  LOGIN_METHOD_GOOGLE,
  LOGIN_METHOD_GOOGLE_PENDING,
  LOGIN_METHOD_GOOGLE_REJECTED,
  LOGIN_METHOD_LOCAL,
} from "../_core/userGovernance";
import {
  adminProcedure,
  clearRateLimitBuckets,
  getRateLimitSnapshot,
  protectedProcedure,
  publicProcedure,
  router,
  withRateLimit,
} from "../_core/trpc";

const LOGIN_ATTEMPT_WINDOW_MS = 1000 * 60 * 10; // 10 min
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_BLOCK_MS = 1000 * 60 * 15; // 15 min
const loginAttempts = new Map<string, { count: number; firstAttemptAt: number; blockedUntil?: number }>();

const DEMO_USERS = [
  {
    id: 1,
    openId: "admin-local",
    name: "Administrador",
    email: "admin@pioneira.local",
    role: "admin" as const,
    password: "admin123",
  },
  {
    id: 2,
    openId: "gerente-local",
    name: "Gerente",
    email: "gerente@pioneira.local",
    role: "gerente" as const,
    password: "gerente123",
  },
  {
    id: 3,
    openId: "user-local",
    name: "Usuário",
    email: "usuario@pioneira.local",
    role: "user" as const,
    password: "user123",
  },
];

async function bumpSessionVersionSafe(user: {
  openId: string;
  name: string | null;
  email: string | null;
  role: "admin" | "gerente" | "user";
}) {
  try {
    await db.upsertUser({
      openId: user.openId,
      name: user.name,
      email: user.email,
      loginMethod: LOGIN_METHOD_LOCAL,
      role: user.role,
      lastSignedIn: new Date(),
    });
  } catch (error) {
    console.warn("[Auth] Não foi possível atualizar versão global de sessão:", error);
  }
}

function getStockUnitsImpact(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return 0;

  let impact = 0;

  const itens = metadata.itens;
  if (Array.isArray(itens)) {
    for (const item of itens) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const before = Number(record.estoqueAntes ?? 0);
      const after = Number(record.estoqueDepois ?? 0);
      if (!Number.isNaN(before) && !Number.isNaN(after)) {
        impact += Math.abs(before - after);
      }
    }
  }

  if (metadata.before && metadata.after && typeof metadata.before === "object" && typeof metadata.after === "object") {
    const before = Number((metadata.before as Record<string, unknown>).quantidade ?? 0);
    const after = Number((metadata.after as Record<string, unknown>).quantidade ?? 0);
    if (!Number.isNaN(before) && !Number.isNaN(after)) {
      impact += Math.abs(before - after);
    }
  }

  const beforeSingle = Number(metadata.estoqueAntes ?? 0);
  const afterSingle = Number(metadata.estoqueDepois ?? 0);
  if (!Number.isNaN(beforeSingle) && !Number.isNaN(afterSingle)) {
    impact += Math.abs(beforeSingle - afterSingle);
  }

  return impact;
}

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
    .input(
      z.object({
        email: z.string().email().max(320),
        password: z.string().min(1).max(128),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clientKey =
        (ctx.req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
        ctx.req.ip ||
        "unknown";
      const now = Date.now();
      const attempts = loginAttempts.get(clientKey);
      if (attempts?.blockedUntil && attempts.blockedUntil > now) {
        await logAuditEvent({
          action: AUTH_AUDIT_ACTION.LOGIN_BLOCKED,
          status: "blocked",
          actor: { ip: clientKey },
          metadata: { reason: "too_many_attempts" },
        });
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Muitas tentativas de login. Tente novamente em alguns minutos.",
        });
      }

      const account = DEMO_USERS.find(
        entry => entry.email.toLowerCase() === input.email.trim().toLowerCase()
      );
      if (!account || account.password !== input.password) {
        if (!attempts || now - attempts.firstAttemptAt > LOGIN_ATTEMPT_WINDOW_MS) {
          loginAttempts.set(clientKey, { count: 1, firstAttemptAt: now });
        } else {
          const nextCount = attempts.count + 1;
          loginAttempts.set(clientKey, {
            count: nextCount,
            firstAttemptAt: attempts.firstAttemptAt,
            blockedUntil: nextCount >= LOGIN_MAX_ATTEMPTS ? now + LOGIN_BLOCK_MS : undefined,
          });
        }
        await logAuditEvent({
          action: AUTH_AUDIT_ACTION.LOGIN_FAILED,
          status: "failed",
          actor: { ip: clientKey, email: input.email },
        });

        throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas." });
      }

      loginAttempts.delete(clientKey);

      await bumpSessionVersionSafe({
        openId: account.openId,
        name: account.name,
        email: account.email,
        role: account.role,
      });
      await issueSessionForUser(
        ctx.req,
        ctx.res,
        {
          id: account.id,
          openId: account.openId,
          name: account.name,
          email: account.email,
          role: account.role,
        },
        { loginMethod: LOGIN_METHOD_LOCAL }
      );
      await logAuditEvent({
        action: AUTH_AUDIT_ACTION.LOGIN_SUCCESS,
        actor: {
          id: account.id,
          email: account.email,
          role: account.role,
          openId: account.openId,
          ip: clientKey,
        },
      });

      return {
        success: true,
        user: {
          id: account.id,
          openId: account.openId,
          name: account.name,
          email: account.email,
          role: account.role,
        },
      } as const;
    }),
  me: publicProcedure.query(opts => opts.ctx.user),
  logout: publicProcedure.mutation(async ({ ctx }) => {
    if (ctx.user?.openId) {
      await bumpSessionVersionSafe({
        openId: ctx.user.openId,
        name: ctx.user.name,
        email: ctx.user.email,
        role: ctx.user.role,
      });
    }
    ctx.res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions(ctx.req));
    await logAuditEvent({
      action: AUTH_AUDIT_ACTION.LOGOUT,
      actor: {
        id: ctx.user?.id,
        email: ctx.user?.email,
        role: ctx.user?.role,
        openId: ctx.user?.openId,
        ip: ctx.req.ip,
      },
    });
    return {
      success: true,
    } as const;
  }),
  logoutAll: protectedProcedure.mutation(async ({ ctx }) => {
    await bumpSessionVersionSafe({
      openId: ctx.user.openId,
      name: ctx.user.name,
      email: ctx.user.email,
      role: ctx.user.role,
    });
    ctx.res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions(ctx.req));
    await logAuditEvent({
      action: AUTH_AUDIT_ACTION.LOGOUT_ALL,
      actor: {
        id: ctx.user.id,
        email: ctx.user.email,
        role: ctx.user.role,
        openId: ctx.user.openId,
        ip: ctx.req.ip,
      },
    });
    return { success: true } as const;
  }),
  pendingUsers: adminProcedure.query(async () => {
    return await db.listUsersByLoginMethod(LOGIN_METHOD_GOOGLE_PENDING);
  }),
  usersAdminList: adminProcedure.query(async () => {
    const users = await db.listUsersForAdmin();
    return users.map(user => {
      return {
        ...user,
        status: getUserAccessStatus(user.loginMethod),
      } as const;
    });
  }),
  approveUser: adminProcedure
    .use(withRateLimit({ scope: AUTH_RATE_LIMIT_SCOPE.APPROVE_USER, max: 60, windowMs: 60 * 1000 }))
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const target = await db.getUserById(input.userId);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
      }
      await db.setUserLoginMethodById(input.userId, LOGIN_METHOD_GOOGLE);
      await logAuditEvent({
        action: AUTH_AUDIT_ACTION.APPROVE_USER,
        actor: {
          id: ctx.user.id,
          email: ctx.user.email,
          role: ctx.user.role,
          openId: ctx.user.openId,
          ip: ctx.req.ip,
        },
        target: {
          userId: target.id,
          targetEmail: target.email,
          targetOpenId: target.openId,
        },
      });
      return { success: true } as const;
    }),
  promoteUserToAdmin: adminProcedure
    .use(withRateLimit({ scope: AUTH_RATE_LIMIT_SCOPE.PROMOTE_USER_ADMIN, max: 30, windowMs: 60 * 1000 }))
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const target = await db.getUserById(input.userId);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
      }

      if (target.role === "admin") {
        return { success: true, alreadyAdmin: true } as const;
      }

      if (isPendingLoginMethod(target.loginMethod) || isRejectedLoginMethod(target.loginMethod)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível promover usuário pendente/rejeitado. Aprove o acesso primeiro.",
        });
      }

      await db.updateUserRoleAndLoginMethodById(input.userId, { role: "admin" });
      await logAuditEvent({
        action: AUTH_AUDIT_ACTION.PROMOTE_USER_ADMIN,
        actor: {
          id: ctx.user.id,
          email: ctx.user.email,
          role: ctx.user.role,
          openId: ctx.user.openId,
          ip: ctx.req.ip,
        },
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
    }),
  inactivateUserToPending: adminProcedure
    .use(withRateLimit({ scope: AUTH_RATE_LIMIT_SCOPE.INACTIVATE_USER_PENDING, max: 30, windowMs: 60 * 1000 }))
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é permitido inativar seu próprio usuário administrador.",
        });
      }

      const target = await db.getUserById(input.userId);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
      }

      await db.updateUserRoleAndLoginMethodById(input.userId, {
        role: "user",
        loginMethod: LOGIN_METHOD_GOOGLE_PENDING,
      });
      await logAuditEvent({
        action: AUTH_AUDIT_ACTION.INACTIVATE_USER_TO_PENDING,
        actor: {
          id: ctx.user.id,
          email: ctx.user.email,
          role: ctx.user.role,
          openId: ctx.user.openId,
          ip: ctx.req.ip,
        },
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
    }),
  rejectUser: adminProcedure
    .use(withRateLimit({ scope: AUTH_RATE_LIMIT_SCOPE.REJECT_USER, max: 60, windowMs: 60 * 1000 }))
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const target = await db.getUserById(input.userId);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
      }
      await db.setUserLoginMethodById(input.userId, LOGIN_METHOD_GOOGLE_REJECTED);
      await logAuditEvent({
        action: AUTH_AUDIT_ACTION.REJECT_USER,
        actor: {
          id: ctx.user.id,
          email: ctx.user.email,
          role: ctx.user.role,
          openId: ctx.user.openId,
          ip: ctx.req.ip,
        },
        target: {
          userId: target.id,
          targetEmail: target.email,
          targetOpenId: target.openId,
        },
      });
      return { success: true } as const;
    }),
  auditEvents: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(500).default(100),
          action: z.string().optional(),
          status: z.enum(["success", "failed", "blocked"]).optional(),
          actorContains: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await readAuditEvents({
        limit: input?.limit ?? 100,
        action: input?.action,
        status: input?.status,
        actorContains: input?.actorContains,
      });
    }),
  auditExportCsv: adminProcedure
    .use(
      withRateLimit({
        scope: AUTH_RATE_LIMIT_SCOPE.AUDIT_EXPORT_CSV,
        max: 10,
        windowMs: 60 * 1000,
      })
    )
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(1000).default(500),
          action: z.string().optional(),
          status: z.enum(["success", "failed", "blocked"]).optional(),
          actorContains: z.string().optional(),
        })
        .optional()
    )
    .mutation(async ({ input }) => {
      const events = await readAuditEvents({
        limit: input?.limit ?? 500,
        action: input?.action,
        status: input?.status,
        actorContains: input?.actorContains,
      });
      const csv = toAuditCsv(events);
      return {
        filename: `auditoria-${new Date().toISOString().slice(0, 10)}.csv`,
        csv,
      } as const;
    }),
  rateLimitStats: adminProcedure
    .input(
      z
        .object({
          scopePrefix: z.string().optional(),
          limit: z.number().int().min(1).max(500).default(100),
        })
        .optional()
    )
    .query(({ input }) => {
      return getRateLimitSnapshot({
        scopePrefix: input?.scopePrefix,
        limit: input?.limit ?? 100,
      });
    }),
  rateLimitClear: adminProcedure
    .use(withRateLimit({ scope: AUTH_RATE_LIMIT_SCOPE.RATE_LIMIT_CLEAR, max: 20, windowMs: 60 * 1000 }))
    .input(
      z.object({
        scopePrefix: z.string().optional(),
        identityContains: z.string().optional(),
        maxDelete: z.number().int().min(1).max(5000).default(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const removed = clearRateLimitBuckets({
        scopePrefix: input.scopePrefix,
        identityContains: input.identityContains,
        maxDelete: input.maxDelete,
      });

      await logAuditEvent({
        action: AUTH_AUDIT_ACTION.RATE_LIMIT_CLEAR,
        actor: {
          id: ctx.user.id,
          email: ctx.user.email,
          role: ctx.user.role,
          openId: ctx.user.openId,
          ip: ctx.req.ip,
        },
        metadata: {
          removed,
          scopePrefix: input.scopePrefix ?? null,
          identityContains: input.identityContains ?? null,
          maxDelete: input.maxDelete,
        },
      });

      return { success: true, removed } as const;
    }),
  stockAnomalies: adminProcedure
    .input(
      z
        .object({
          windowMinutes: z.number().int().min(1).max(240).default(30),
          thresholdEvents: z.number().int().min(2).max(200).default(10),
          limit: z.number().int().min(1).max(50).default(10),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const windowMinutes = input?.windowMinutes ?? 30;
      const thresholdEvents = input?.thresholdEvents ?? 10;
      const limit = input?.limit ?? 10;
      const cutoff = Date.now() - windowMinutes * 60 * 1000;

      const events = await readAuditEvents({ limit: 500 });
      const stockEvents = events.filter((event) => {
        if (!event.action.startsWith(STOCK_ACTION_PREFIX)) return false;
        const timestampMs = new Date(event.timestamp).getTime();
        return !Number.isNaN(timestampMs) && timestampMs >= cutoff;
      });

      const grouped = new Map<
        string,
        {
          actor: string;
          ip: string | null;
          totalEvents: number;
          failedEvents: number;
          impactedUnits: number;
          actions: Set<string>;
          firstAt: string;
          lastAt: string;
        }
      >();

      for (const event of stockEvents) {
        const actorLabel =
          event.actor?.email ||
          event.actor?.openId ||
          (event.actor?.id ? `id:${event.actor.id}` : null) ||
          (event.actor?.ip ? `ip:${event.actor.ip}` : null) ||
          "desconhecido";
        const key = `${actorLabel}|${event.actor?.ip ?? "-"}`;
        const current = grouped.get(key) ?? {
          actor: actorLabel,
          ip: event.actor?.ip ?? null,
          totalEvents: 0,
          failedEvents: 0,
          impactedUnits: 0,
          actions: new Set<string>(),
          firstAt: event.timestamp,
          lastAt: event.timestamp,
        };

        current.totalEvents += 1;
        if (event.status === "failed") {
          current.failedEvents += 1;
        }
        current.impactedUnits += getStockUnitsImpact(event.metadata ?? null);
        current.actions.add(event.action);
        if (new Date(event.timestamp).getTime() < new Date(current.firstAt).getTime()) {
          current.firstAt = event.timestamp;
        }
        if (new Date(event.timestamp).getTime() > new Date(current.lastAt).getTime()) {
          current.lastAt = event.timestamp;
        }

        grouped.set(key, current);
      }

      return Array.from(grouped.values())
        .filter((item) => item.totalEvents >= thresholdEvents || item.failedEvents >= 2)
        .map((item) => {
          const highRisk =
            item.totalEvents >= thresholdEvents * 2 ||
            item.failedEvents >= 5 ||
            item.impactedUnits >= 120;
          const mediumRisk =
            !highRisk &&
            (item.totalEvents >= thresholdEvents || item.failedEvents >= 2 || item.impactedUnits >= 60);
          return {
            ...item,
            actions: Array.from(item.actions).sort(),
            riskLevel: highRisk ? "high" : mediumRisk ? "medium" : "low",
          } as const;
        })
        .sort((a, b) => {
          if (a.riskLevel !== b.riskLevel) {
            return a.riskLevel === "high" ? -1 : b.riskLevel === "high" ? 1 : 0;
          }
          if (b.totalEvents !== a.totalEvents) return b.totalEvents - a.totalEvents;
          if (b.failedEvents !== a.failedEvents) return b.failedEvents - a.failedEvents;
          return b.impactedUnits - a.impactedUnits;
        })
        .slice(0, limit);
    }),
  auditStorageStats: adminProcedure.query(async () => {
    return await getAuditStorageStats();
  }),
});
