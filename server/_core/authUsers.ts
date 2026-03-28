import type { Request, Response } from "express";
import * as db from "../db";
import type { User } from "../../drizzle/schema";
import { getSessionCookieOptions } from "./cookies";
import { createSessionToken, SESSION_COOKIE_NAME } from "./session";
import {
  isApprovedLoginMethod,
  isRejectedLoginMethod,
  LOGIN_METHOD_GOOGLE_PENDING,
  LOGIN_METHOD_LOCAL,
} from "./userGovernance";

export type AccessStatus = "approved" | "pending" | "rejected";

type AuthUser = Pick<User, "id" | "openId" | "name" | "email" | "role">;

export async function resolveGoogleAccess(identity: {
  sub: string;
  email: string;
  name: string;
}): Promise<{ status: AccessStatus; user?: AuthUser }> {
  let user = await db.getUserByOpenId(identity.sub);

  if (!user) {
    await db.upsertUser({
      openId: identity.sub,
      name: identity.name,
      email: identity.email,
      loginMethod: LOGIN_METHOD_GOOGLE_PENDING,
      role: "user",
      lastSignedIn: new Date(),
    });
    return { status: "pending" };
  }

  if (isRejectedLoginMethod(user.loginMethod)) {
    return { status: "rejected" };
  }

  if (!isApprovedLoginMethod(user.loginMethod ?? null)) {
    return { status: "pending" };
  }

  return {
    status: "approved",
    user: {
      id: user.id,
      openId: user.openId,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function issueSessionForUser(
  req: Request,
  res: Response,
  user: AuthUser,
  options?: { loginMethod?: string }
) {
  const now = new Date();
  await db.upsertUser({
    openId: user.openId,
    name: user.name,
    email: user.email,
    role: user.role,
    loginMethod: options?.loginMethod ?? LOGIN_METHOD_LOCAL,
    lastSignedIn: now,
  });

  let sessionVersion = Math.floor(now.getTime() / 1000);
  try {
    const persisted = await db.getUserByOpenId(user.openId);
    sessionVersion = Math.floor(
      new Date(persisted?.lastSignedIn ?? now).getTime() / 1000
    );
  } catch {
    // Fail-soft fallback to current timestamp version.
  }

  const token = createSessionToken(
    {
      id: user.id,
      openId: user.openId,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    { sessionVersion }
  );
  res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions(req));
}
