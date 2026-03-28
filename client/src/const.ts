export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:3001";
