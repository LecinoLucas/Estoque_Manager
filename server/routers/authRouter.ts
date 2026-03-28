/**
 * Compat layer:
 * Mantém o ponto de entrada legado enquanto a arquitetura nova
 * vive em modules/auth (presentation/application/domain/infrastructure).
 */
export { authRouter } from "../modules/auth/presentation/trpc/auth.router";
