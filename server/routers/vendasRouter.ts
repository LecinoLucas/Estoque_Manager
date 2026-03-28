import { z } from "zod";
import { STOCK_AUDIT_ACTION } from "@shared/stock-governance";
import * as db from "../db";
import { logAuditEvent } from "../_core/audit";
import { notifyOwner } from "../_core/notification";
import { generateEncomendasRelatorioPDF, generateVendasRelatorioPDF } from "../pdfExportReports";
import {
  managerOrAdminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
  withRateLimit,
} from "../_core/trpc";

export const vendasRouter = router({
  registerPublic: publicProcedure
    .use(withRateLimit({ scope: "vendas.register_public", by: "ip", max: 30, windowMs: 60 * 1000 }))
    .input(
      z.object({
        items: z.array(
          z.object({
            productId: z.number(),
            quantidade: z.number().int().min(1),
          }),
        ),
        nomeCliente: z.string().optional(),
        observacoes: z.string().optional(),
        tipoTransacao: z.enum(["venda", "troca", "brinde", "emprestimo", "permuta"]).default("venda"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const dataVenda = new Date();
      const beforeProducts = await db.getProductsByIds(input.items.map(item => item.productId));
      const beforeMap = new Map(beforeProducts.map(product => [product.id, product]));

      try {
        const lowStockAlerts = await db.registrarVendasAtomico({
          items: input.items,
          dataVenda,
          nomeCliente: input.nomeCliente,
          observacoes: input.observacoes,
          tipoTransacao: input.tipoTransacao,
          userId: null,
          observacaoMovimentacao: "Venda registrada (pública)",
        });

        for (const alert of lowStockAlerts) {
          await notifyOwner({
            title: "Alerta de Estoque Baixo",
            content: `O produto "${alert.name}" (${alert.medida}) está com apenas ${alert.novaQuantidade} unidade(s) em estoque.`,
          });
        }

        const afterProducts = await db.getProductsByIds(input.items.map(item => item.productId));
        const afterMap = new Map(afterProducts.map(product => [product.id, product]));
        await logAuditEvent({
          action: STOCK_AUDIT_ACTION.SALE_REGISTERED_PUBLIC,
          actor: {
            ip: ctx.req.ip,
          },
          metadata: {
            tipoTransacao: input.tipoTransacao,
            nomeCliente: input.nomeCliente ?? null,
            itens: input.items.map(item => {
              const before = beforeMap.get(item.productId);
              const after = afterMap.get(item.productId);
              return {
                productId: item.productId,
                quantidadeVendida: item.quantidade,
                estoqueAntes: before?.quantidade ?? null,
                estoqueDepois: after?.quantidade ?? null,
              };
            }),
          },
        });

        return { success: true };
      } catch (error) {
        await logAuditEvent({
          action: STOCK_AUDIT_ACTION.SALE_REGISTERED_PUBLIC,
          status: "failed",
          actor: { ip: ctx.req.ip },
          metadata: {
            error: error instanceof Error ? error.message : "unknown_error",
            tipoTransacao: input.tipoTransacao,
            nomeCliente: input.nomeCliente ?? null,
            itens: input.items,
          },
        });
        throw error;
      }
    }),

  registrar: protectedProcedure
    .use(withRateLimit({ scope: "vendas.registrar", max: 60, windowMs: 60 * 1000 }))
    .input(
      z.object({
        items: z.array(
          z.object({
            productId: z.number(),
            quantidade: z.number().int().min(1),
          }),
        ),
        vendedor: z.string().optional(),
        nomeCliente: z.string().optional(),
        dataVenda: z.date().optional(),
        observacoes: z.string().optional(),
        tipoTransacao: z.enum(["venda", "troca", "brinde", "emprestimo", "permuta"]).default("venda"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const dataVenda = input.dataVenda || new Date();
      const beforeProducts = await db.getProductsByIds(input.items.map(item => item.productId));
      const beforeMap = new Map(beforeProducts.map(product => [product.id, product]));

      try {
        const lowStockAlerts = await db.registrarVendasAtomico({
          items: input.items,
          dataVenda,
          vendedor: input.vendedor,
          nomeCliente: input.nomeCliente,
          observacoes: input.observacoes,
          tipoTransacao: input.tipoTransacao,
          userId: ctx.user.id,
          observacaoMovimentacao: "Venda registrada",
        });

        for (const alert of lowStockAlerts) {
          await notifyOwner({
            title: "⚠️ Estoque Baixo Após Venda",
            content: `O produto "${alert.name}" (${alert.medida}) está com apenas ${alert.novaQuantidade} unidade(s) em estoque após a venda.`,
          });
        }

        const afterProducts = await db.getProductsByIds(input.items.map(item => item.productId));
        const afterMap = new Map(afterProducts.map(product => [product.id, product]));
        await logAuditEvent({
          action: STOCK_AUDIT_ACTION.SALE_REGISTERED,
          actor: {
            id: ctx.user.id,
            email: ctx.user.email,
            role: ctx.user.role,
            openId: ctx.user.openId,
            ip: ctx.req.ip,
          },
          metadata: {
            tipoTransacao: input.tipoTransacao,
            nomeCliente: input.nomeCliente ?? null,
            vendedor: input.vendedor ?? null,
            itens: input.items.map(item => {
              const before = beforeMap.get(item.productId);
              const after = afterMap.get(item.productId);
              return {
                productId: item.productId,
                quantidadeVendida: item.quantidade,
                estoqueAntes: before?.quantidade ?? null,
                estoqueDepois: after?.quantidade ?? null,
              };
            }),
          },
        });

        return { success: true };
      } catch (error) {
        await logAuditEvent({
          action: STOCK_AUDIT_ACTION.SALE_REGISTERED,
          status: "failed",
          actor: {
            id: ctx.user.id,
            email: ctx.user.email,
            role: ctx.user.role,
            openId: ctx.user.openId,
            ip: ctx.req.ip,
          },
          metadata: {
            error: error instanceof Error ? error.message : "unknown_error",
            tipoTransacao: input.tipoTransacao,
            nomeCliente: input.nomeCliente ?? null,
            vendedor: input.vendedor ?? null,
            itens: input.items,
          },
        });
        throw error;
      }
    }),

  getByDateRange: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getVendasByDate(input.startDate, input.endDate);
    }),

  list: protectedProcedure
    .use(withRateLimit({ scope: "vendas.list", max: 120, windowMs: 60 * 1000 }))
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        tipoTransacao: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getVendasPaginated(input.page, input.limit, input.tipoTransacao);
    }),

  cancelar: managerOrAdminProcedure
    .input(
      z.object({
        vendaId: z.number(),
        motivo: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const vendaAntes = await db.getVendaById(input.vendaId);
      const produtoAntes = vendaAntes ? await db.getProductById(vendaAntes.productId) : undefined;
      try {
        const result = await db.cancelarVenda(input.vendaId, input.motivo, ctx.user.id);
        const vendaDepois = await db.getVendaById(input.vendaId);
        const produtoDepois = vendaAntes ? await db.getProductById(vendaAntes.productId) : undefined;
        await logAuditEvent({
          action: STOCK_AUDIT_ACTION.SALE_CANCELLED,
          actor: {
            id: ctx.user.id,
            email: ctx.user.email,
            role: ctx.user.role,
            openId: ctx.user.openId,
            ip: ctx.req.ip,
          },
          target: { vendaId: input.vendaId, productId: vendaAntes?.productId ?? null },
          metadata: {
            motivo: input.motivo,
            estoqueAntes: produtoAntes?.quantidade ?? null,
            estoqueDepois: produtoDepois?.quantidade ?? null,
            statusAntes: vendaAntes?.status ?? null,
            statusDepois: vendaDepois?.status ?? null,
            quantidadeVenda: vendaAntes?.quantidade ?? null,
          },
        });
        return result;
      } catch (error) {
        await logAuditEvent({
          action: STOCK_AUDIT_ACTION.SALE_CANCELLED,
          status: "failed",
          actor: {
            id: ctx.user.id,
            email: ctx.user.email,
            role: ctx.user.role,
            openId: ctx.user.openId,
            ip: ctx.req.ip,
          },
          target: { vendaId: input.vendaId },
          metadata: { motivo: input.motivo, error: error instanceof Error ? error.message : "unknown_error" },
        });
        throw error;
      }
    }),

  editar: managerOrAdminProcedure
    .input(
      z.object({
        vendaId: z.number(),
        vendedor: z.string().optional(),
        observacoes: z.string().optional(),
        quantidade: z.number().int().min(1).optional(),
        tipoTransacao: z.enum(["venda", "troca", "brinde", "emprestimo", "permuta"]).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const vendaAntes = await db.getVendaById(input.vendaId);
      const produtoAntes = vendaAntes ? await db.getProductById(vendaAntes.productId) : undefined;
      try {
        const result = await db.editarVenda(input.vendaId, input, ctx.user.id);
        const vendaDepois = await db.getVendaById(input.vendaId);
        const produtoDepois = vendaAntes ? await db.getProductById(vendaAntes.productId) : undefined;
        await logAuditEvent({
          action: STOCK_AUDIT_ACTION.SALE_EDITED,
          actor: {
            id: ctx.user.id,
            email: ctx.user.email,
            role: ctx.user.role,
            openId: ctx.user.openId,
            ip: ctx.req.ip,
          },
          target: { vendaId: input.vendaId, productId: vendaAntes?.productId ?? null },
          metadata: {
            updates: input,
            estoqueAntes: produtoAntes?.quantidade ?? null,
            estoqueDepois: produtoDepois?.quantidade ?? null,
            quantidadeVendaAntes: vendaAntes?.quantidade ?? null,
            quantidadeVendaDepois: vendaDepois?.quantidade ?? null,
          },
        });
        return result;
      } catch (error) {
        await logAuditEvent({
          action: STOCK_AUDIT_ACTION.SALE_EDITED,
          status: "failed",
          actor: {
            id: ctx.user.id,
            email: ctx.user.email,
            role: ctx.user.role,
            openId: ctx.user.openId,
            ip: ctx.req.ip,
          },
          target: { vendaId: input.vendaId },
          metadata: { updates: input, error: error instanceof Error ? error.message : "unknown_error" },
        });
        throw error;
      }
    }),

  byVendedor: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getVendasByVendedor(input.startDate, input.endDate);
    }),

  relatorio: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        vendedor: z.string().optional(),
        nomeCliente: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getVendasRelatorio(input);
    }),

  exportarRelatorioPdf: protectedProcedure
    .use(withRateLimit({ scope: "vendas.export_relatorio_pdf", max: 10, windowMs: 60 * 1000 }))
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        vendedor: z.string().optional(),
        nomeCliente: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const vendas = await db.getVendasRelatorio(input);
      return await generateVendasRelatorioPDF(vendas);
    }),

  exportarRelatorioExcel: protectedProcedure
    .use(withRateLimit({ scope: "vendas.export_relatorio_excel", max: 10, windowMs: 60 * 1000 }))
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        vendedor: z.string().optional(),
        nomeCliente: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { generateVendasExcel } = await import("../excelExport");
      const vendas = await db.getVendasRelatorio(input);
      return await generateVendasExcel(vendas);
    }),

  relatorioEncomendas: protectedProcedure
    .input(
      z.object({
        nomeCliente: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getEncomendasRelatorio(input);
    }),

  exportarEncomendasPdf: protectedProcedure
    .use(withRateLimit({ scope: "vendas.export_encomendas_pdf", max: 10, windowMs: 60 * 1000 }))
    .input(
      z.object({
        nomeCliente: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const encomendas = await db.getEncomendasRelatorio(input);
      return await generateEncomendasRelatorioPDF(encomendas);
    }),

  exportarEncomendasExcel: protectedProcedure
    .use(withRateLimit({ scope: "vendas.export_encomendas_excel", max: 10, windowMs: 60 * 1000 }))
    .input(
      z.object({
        nomeCliente: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { generateEncomendasExcel } = await import("../excelExport");
      const encomendas = await db.getEncomendasRelatorio(input);
      return await generateEncomendasExcel(encomendas);
    }),

  excluir: managerOrAdminProcedure
    .input(
      z.object({
        vendaId: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const vendaAntes = await db.getVendaById(input.vendaId);
      const produtoAntes = vendaAntes ? await db.getProductById(vendaAntes.productId) : undefined;
      try {
        await db.excluirVenda(input.vendaId, ctx.user.id);
        const produtoDepois = vendaAntes ? await db.getProductById(vendaAntes.productId) : undefined;
        await logAuditEvent({
          action: STOCK_AUDIT_ACTION.SALE_DELETED,
          actor: {
            id: ctx.user.id,
            email: ctx.user.email,
            role: ctx.user.role,
            openId: ctx.user.openId,
            ip: ctx.req.ip,
          },
          target: { vendaId: input.vendaId, productId: vendaAntes?.productId ?? null },
          metadata: {
            quantidadeVenda: vendaAntes?.quantidade ?? null,
            estoqueAntes: produtoAntes?.quantidade ?? null,
            estoqueDepois: produtoDepois?.quantidade ?? null,
          },
        });
        return { success: true };
      } catch (error) {
        await logAuditEvent({
          action: STOCK_AUDIT_ACTION.SALE_DELETED,
          status: "failed",
          actor: {
            id: ctx.user.id,
            email: ctx.user.email,
            role: ctx.user.role,
            openId: ctx.user.openId,
            ip: ctx.req.ip,
          },
          target: { vendaId: input.vendaId },
          metadata: { error: error instanceof Error ? error.message : "unknown_error" },
        });
        throw error;
      }
    }),

  rankingVendedores: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getRankingVendedores(input);
    }),

  rankingProdutos: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getRankingProdutos(input);
    }),
});
