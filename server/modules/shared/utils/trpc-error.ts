import { TRPCError } from "@trpc/server";
import { DomainError } from "../errors/domain-error";

export function toTrpcError(error: unknown): TRPCError {
  if (error instanceof TRPCError) return error;
  if (error instanceof DomainError) {
    return new TRPCError({ code: error.code, message: error.message });
  }
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro interno do servidor." });
}
