import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
type RateLimitBy = "ip" | "user" | "user_or_ip";
type RateLimitConfig = {
  scope: string;
  max: number;
  windowMs: number;
  by?: RateLimitBy;
  message?: string;
};

export type RateLimitSnapshotItem = {
  scope: string;
  identity: string;
  count: number;
  resetInSeconds: number;
};

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function cleanupExpiredRateLimitEntries(now: number) {
  rateLimitBuckets.forEach((entry, key) => {
    if (entry.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  });
}

function resolveRateLimitIdentity(ctx: TrpcContext, by: RateLimitBy) {
  const userId = ctx.user?.id ? `user:${ctx.user.id}` : "";
  const ip = (ctx.req.ip || "unknown").trim();

  if (by === "user") return userId || "user:anonymous";
  if (by === "ip") return `ip:${ip}`;
  return userId || `ip:${ip}`;
}

function setRateLimitHeaders(
  ctx: TrpcContext,
  limit: number,
  remaining: number,
  resetAt: number
) {
  const resetSeconds = Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));
  ctx.res.setHeader("X-RateLimit-Limit", String(limit));
  ctx.res.setHeader("X-RateLimit-Remaining", String(Math.max(0, remaining)));
  ctx.res.setHeader("X-RateLimit-Reset", String(resetSeconds));
}
const errorGuardMiddleware = t.middleware(async opts => {
  const { path, type, ctx, next } = opts;
  try {
    return await next();
  } catch (error) {
    const actor = ctx.user
      ? {
          userId: ctx.user.id,
          email: ctx.user.email,
          role: ctx.user.role,
        }
      : { userId: null };
    console.error(`[tRPC] ${type} ${path} failed`, {
      actor,
      ip: ctx.req.ip,
      error,
    });
    throw error;
  }
});

export const publicProcedure = t.procedure.use(errorGuardMiddleware);

export function withRateLimit(config: RateLimitConfig) {
  return t.middleware(async opts => {
    const { ctx, next } = opts;
    const now = Date.now();
    cleanupExpiredRateLimitEntries(now);

    const identity = resolveRateLimitIdentity(ctx, config.by ?? "user_or_ip");
    const bucketKey = `${config.scope}:${identity}`;
    const current = rateLimitBuckets.get(bucketKey);

    if (!current || current.resetAt <= now) {
      const created = {
        count: 1,
        resetAt: now + config.windowMs,
      };
      rateLimitBuckets.set(bucketKey, {
        count: created.count,
        resetAt: created.resetAt,
      });
      setRateLimitHeaders(ctx, config.max, config.max - created.count, created.resetAt);
      return next();
    }

    if (current.count >= config.max) {
      setRateLimitHeaders(ctx, config.max, 0, current.resetAt);
      ctx.res.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil((current.resetAt - now) / 1000)))
      );
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: config.message ?? "Muitas requisições. Tente novamente em instantes.",
      });
    }

    current.count += 1;
    rateLimitBuckets.set(bucketKey, current);
    setRateLimitHeaders(ctx, config.max, config.max - current.count, current.resetAt);
    return next();
  });
}

export function getRateLimitSnapshot(options?: {
  scopePrefix?: string;
  limit?: number;
}): RateLimitSnapshotItem[] {
  const now = Date.now();
  cleanupExpiredRateLimitEntries(now);

  const limit = Math.max(1, Math.min(options?.limit ?? 100, 500));
  const prefix = options?.scopePrefix?.trim();

  const snapshot: RateLimitSnapshotItem[] = [];
  rateLimitBuckets.forEach((entry, key) => {
    const separatorIndex = key.indexOf(":");
    if (separatorIndex <= 0) return;

    const scope = key.slice(0, separatorIndex);
    const identity = key.slice(separatorIndex + 1);
    if (prefix && !scope.startsWith(prefix)) return;

    snapshot.push({
      scope,
      identity,
      count: entry.count,
      resetInSeconds: Math.max(0, Math.ceil((entry.resetAt - now) / 1000)),
    });
  });

  snapshot.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.resetInSeconds - b.resetInSeconds;
  });

  return snapshot.slice(0, limit);
}

export function clearRateLimitBuckets(options?: {
  scopePrefix?: string;
  identityContains?: string;
  maxDelete?: number;
}) {
  const now = Date.now();
  cleanupExpiredRateLimitEntries(now);

  const prefix = options?.scopePrefix?.trim();
  const identityTerm = options?.identityContains?.trim().toLowerCase();
  const maxDelete = Math.max(1, Math.min(options?.maxDelete ?? 500, 5000));

  let deleted = 0;
  rateLimitBuckets.forEach((_entry, key) => {
    if (deleted >= maxDelete) return;

    const separatorIndex = key.indexOf(":");
    if (separatorIndex <= 0) return;

    const scope = key.slice(0, separatorIndex);
    const identity = key.slice(separatorIndex + 1);

    if (prefix && !scope.startsWith(prefix)) return;
    if (identityTerm && !identity.toLowerCase().includes(identityTerm)) return;

    rateLimitBuckets.delete(key);
    deleted += 1;
  });

  return deleted;
}

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user as NonNullable<TrpcContext["user"]>,
    },
  });
});

export const protectedProcedure = t.procedure
  .use(errorGuardMiddleware)
  .use(requireUser);

type UserRole = "admin" | "gerente" | "user";

function withRoles(roles: readonly UserRole[], message = "Acesso negado.") {
  return protectedProcedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;

      if (!ctx.user || !roles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message });
      }

      return next({
        ctx: {
          ...ctx,
          user: ctx.user as NonNullable<TrpcContext["user"]>,
        },
      });
    })
  );
}

export const adminProcedure = withRoles(["admin"], NOT_ADMIN_ERR_MSG);

export const managerOrAdminProcedure = withRoles(
  ["admin", "gerente"],
  "Acesso negado: apenas administradores e gerentes."
);
