import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { adminProcedure, protectedProcedure, router, withRateLimit } from "../_core/trpc";

export const encomendasRouter = router({
  create: protectedProcedure
    .use(withRateLimit({ scope: "encomendas.create", max: 60, windowMs: 60 * 1000 }))
    .input(
      z.object({
        productId: z.number().optional(),
        nomeProduto: z.string().optional(),
        medidaProduto: z.string().optional(),
        quantidade: z.number().min(1),
        nomeCliente: z.string().min(1),
        telefoneCliente: z.string().optional(),
        dataCompra: z.date().optional(),
        prazoEntregaDias: z.number().int().min(1).optional(),
        dataEntrega: z.date().optional(),
        observacoes: z.string().optional(),
        vendedor: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!input.productId && (!input.nomeProduto || !input.medidaProduto)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Deve fornecer productId ou produto personalizado (nome e medida)",
        });
      }
      return await db.createEncomenda({
        ...input,
        userId: ctx.user.id,
      });
    }),

  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pendente", "em_producao", "pronto", "entregue", "cancelado", "todos"]).optional(),
        cliente: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getEncomendas(input.status, input.cliente);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pendente", "em_producao", "pronto", "entregue", "cancelado"]).optional(),
        dataEntrega: z.date().optional(),
        observacoes: z.string().optional(),
        pedidoFeito: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return await db.updateEncomenda(input.id, input);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.deleteEncomenda(input.id);
    }),

  exportPdf: protectedProcedure
    .use(withRateLimit({ scope: "encomendas.export_pdf", max: 10, windowMs: 60 * 1000 }))
    .input(
      z.object({
        status: z.string().optional(),
        cliente: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { generateEncomendasPDF } = await import("../pdfExportEncomendas");
      const encomendas = await db.getEncomendas(input.status, input.cliente);
      return await generateEncomendasPDF(encomendas);
    }),
});
