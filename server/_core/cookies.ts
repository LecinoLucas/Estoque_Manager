import type { CookieOptions, Request } from "express";
import { ENV } from "./env";
import { SESSION_TTL_MS } from "./session";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure" | "maxAge"> {
  const isSecure = isSecureRequest(req);
  const requestedSameSite = ENV.sessionCookieSameSite;
  let sameSite: "lax" | "none" | "strict" = "lax";

  if (requestedSameSite === "none" && isSecure) {
    sameSite = "none";
  } else if (requestedSameSite === "strict") {
    sameSite = "strict";
  }

  const domain = ENV.sessionCookieDomain || undefined;

  return {
    domain,
    httpOnly: true,
    maxAge: SESSION_TTL_MS,
    path: "/",
    sameSite,
    secure: isSecure,
  };
}
