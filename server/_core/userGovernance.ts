export const LOGIN_METHOD_LOCAL = "local";
export const LOGIN_METHOD_GOOGLE = "google";
export const LOGIN_METHOD_GOOGLE_PENDING = "google_pending";
export const LOGIN_METHOD_GOOGLE_REJECTED = "google_rejected";

export type UserAccessStatus = "active" | "pending" | "rejected";

export function isPendingLoginMethod(loginMethod: string | null | undefined) {
  return loginMethod === LOGIN_METHOD_GOOGLE_PENDING;
}

export function isRejectedLoginMethod(loginMethod: string | null | undefined) {
  return loginMethod === LOGIN_METHOD_GOOGLE_REJECTED;
}

export function isApprovedLoginMethod(loginMethod: string | null | undefined) {
  return !isPendingLoginMethod(loginMethod) && !isRejectedLoginMethod(loginMethod);
}

export function getUserAccessStatus(loginMethod: string | null | undefined): UserAccessStatus {
  if (isPendingLoginMethod(loginMethod)) return "pending";
  if (isRejectedLoginMethod(loginMethod)) return "rejected";
  return "active";
}
