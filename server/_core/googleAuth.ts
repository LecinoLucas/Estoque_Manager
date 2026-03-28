import { createRemoteJWKSet, jwtVerify } from "jose";
import { ENV } from "./env";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

export type GoogleIdentity = {
  sub: string;
  email: string;
  name: string;
  emailVerified: boolean;
};

function assertGoogleConfigured() {
  if (!ENV.googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID não configurado.");
  }
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  assertGoogleConfigured();
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: ENV.googleClientId,
  });

  const sub = String(payload.sub ?? "");
  const email = String(payload.email ?? "");
  const name = String(payload.name ?? "");
  const emailVerified = Boolean(payload.email_verified);

  if (!sub || !email) {
    throw new Error("Token Google inválido: sem identificação obrigatória.");
  }

  return {
    sub,
    email,
    name: name || email.split("@")[0] || "Usuário Google",
    emailVerified,
  };
}

export async function exchangeGoogleAuthCode(code: string) {
  assertGoogleConfigured();
  if (!ENV.googleClientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET não configurado.");
  }

  const body = new URLSearchParams({
    code,
    client_id: ENV.googleClientId,
    client_secret: ENV.googleClientSecret,
    redirect_uri: ENV.googleRedirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Falha no OAuth Google (${response.status}): ${details}`);
  }

  return (await response.json()) as { id_token?: string };
}

