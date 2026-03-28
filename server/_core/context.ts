import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse as parseCookie } from "cookie";
import type { User } from "../../drizzle/schema";
import { getUserByOpenId } from "../db";
import { getSessionCookieOptions } from "./cookies";
import {
  createSessionToken,
  readSessionToken,
  SESSION_COOKIE_NAME,
  sessionPayloadToUser,
  shouldRotateSession,
} from "./session";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const cookieHeader = opts.req.header("cookie");
  if (!cookieHeader) {
    return {
      req: opts.req,
      res: opts.res,
      user: null,
    };
  }

  const cookies = parseCookie(cookieHeader);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return {
      req: opts.req,
      res: opts.res,
      user: null,
    };
  }

  const payload = readSessionToken(token);
  if (!payload) {
    return {
      req: opts.req,
      res: opts.res,
      user: null,
    };
  }

  let persistedUser: Awaited<ReturnType<typeof getUserByOpenId>>;
  try {
    persistedUser = await getUserByOpenId(payload.openId);
  } catch (error) {
    console.warn("[Auth] Falha ao validar versão de sessão no banco:", error);
    persistedUser = undefined;
  }
  if (persistedUser?.lastSignedIn) {
    const persistedVersion = Math.floor(new Date(persistedUser.lastSignedIn).getTime() / 1000);
    if (persistedVersion !== payload.sessionVersion) {
      opts.res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions(opts.req));
      return {
        req: opts.req,
        res: opts.res,
        user: null,
      };
    }
  }

  if (shouldRotateSession(payload)) {
    const rotatedToken = createSessionToken(sessionPayloadToUser(payload), {
      maxExp: payload.maxExp,
      sessionVersion: payload.sessionVersion,
    });
    opts.res.cookie(SESSION_COOKIE_NAME, rotatedToken, getSessionCookieOptions(opts.req));
  }

  const user: User = {
    id: payload.id,
    openId: payload.openId,
    name: payload.name,
    email: payload.email,
    loginMethod: "local",
    role: payload.role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
