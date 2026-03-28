/**
 * Erro de domínio para falhas de regra de negócio.
 * Pode ser convertido para TRPCError no controller.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "BAD_REQUEST"
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "TOO_MANY_REQUESTS" = "BAD_REQUEST"
  ) {
    super(message);
    this.name = "DomainError";
  }
}
