import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  readSessionToken,
  SESSION_ABSOLUTE_TTL_MS,
  SESSION_TTL_MS,
  shouldRotateSession,
} from "./_core/session";

describe("session token", () => {
  it("creates and validates a signed token", () => {
    const token = createSessionToken({
      id: 1,
      openId: "admin-local",
      name: "Administrador",
      email: "admin@pioneira.local",
      role: "admin",
    });

    const payload = readSessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.id).toBe(1);
    expect(payload?.openId).toBe("admin-local");
  });

  it("rejects tampered token", () => {
    const token = createSessionToken({
      id: 1,
      openId: "admin-local",
      name: "Administrador",
      email: "admin@pioneira.local",
      role: "admin",
    });
    const tampered = `${token}x`;
    expect(readSessionToken(tampered)).toBeNull();
  });

  it("rotates only when session is close to expiry", () => {
    const token = createSessionToken({
      id: 3,
      openId: "user-local",
      name: "Usuário",
      email: "usuario@pioneira.local",
      role: "user",
    });
    const payload = readSessionToken(token);
    expect(payload).not.toBeNull();
    if (!payload) return;

    expect(shouldRotateSession(payload, payload.iat + 1000)).toBe(false);
    expect(shouldRotateSession(payload, payload.exp - 1000)).toBe(true);
    expect(payload.exp - payload.iat).toBe(SESSION_TTL_MS);
    expect(payload.maxExp - payload.iat).toBe(SESSION_ABSOLUTE_TTL_MS);
  });

  it("keeps absolute expiration during rotation", () => {
    const token = createSessionToken({
      id: 2,
      openId: "gerente-local",
      name: "Gerente",
      email: "gerente@pioneira.local",
      role: "gerente",
    });
    const payload = readSessionToken(token);
    expect(payload).not.toBeNull();
    if (!payload) return;

    const rotated = createSessionToken(
      {
        id: payload.id,
        openId: payload.openId,
        name: payload.name,
        email: payload.email,
        role: payload.role,
      },
      { maxExp: payload.maxExp }
    );
    const rotatedPayload = readSessionToken(rotated);
    expect(rotatedPayload).not.toBeNull();
    if (!rotatedPayload) return;

    expect(rotatedPayload.maxExp).toBe(payload.maxExp);
    expect(rotatedPayload.exp).toBeLessThanOrEqual(rotatedPayload.maxExp);
  });
});
